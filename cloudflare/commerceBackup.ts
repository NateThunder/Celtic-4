import { env } from "cloudflare:workers";

const MAX_AGE_SECONDS = 300;
const MAX_JSON_BYTES = 8 * 1024 * 1024;
const encoder = new TextEncoder();
const decoder = new TextDecoder();

type StartPayload = {
  action: "start";
  eventId: string;
  runId: string;
  startedAt: string;
  sourceHighWatermark?: string;
  tables: Array<{ name: string; rows: number; createSql: string }>;
};

type ChunkPayload = {
  action: "table_chunk";
  eventId: string;
  runId: string;
  table: string;
  chunk: number;
  offset: number;
  rows: Array<Record<string, string | null>>;
  checksumSha256: string;
};

type CompletePayload = {
  action: "complete";
  eventId: string;
  runId: string;
  completedAt: string;
  sourceHighWatermark?: string;
  recordCounts: Record<string, number>;
};

type BackupPayload = StartPayload | ChunkPayload | CompletePayload;

function jsonError(status: number, error: string) {
  return Response.json({ error }, { status });
}

function hex(bytes: ArrayBuffer) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return difference === 0;
}

async function expectedSignature(timestamp: string, body: Uint8Array) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(env.PRODUCT_SYNC_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const prefix = encoder.encode(`${timestamp}.`);
  const signed = new Uint8Array(prefix.length + body.length);
  signed.set(prefix);
  signed.set(body, prefix.length);
  return hex(await crypto.subtle.sign("HMAC", key, signed));
}

async function authenticate(request: Request, body: Uint8Array) {
  const timestamp = request.headers.get("x-cw-timestamp") || "";
  const signature = (request.headers.get("x-cw-signature") || "").replace(/^sha256=/, "").toLowerCase();
  const seconds = Number(timestamp);
  if (!/^\d+$/.test(timestamp) || Math.abs(Math.floor(Date.now() / 1000) - seconds) > MAX_AGE_SECONDS) return false;
  if (!/^[a-f0-9]{64}$/.test(signature)) return false;
  return constantTimeEqual(await expectedSignature(timestamp, body), signature);
}

function validIdentifier(value: unknown, max = 128): value is string {
  return typeof value === "string" && value.length >= 8 && value.length <= max && /^[A-Za-z0-9._:-]+$/.test(value);
}

function validTable(value: unknown): value is string {
  return typeof value === "string" && value.length <= 128 && /^[A-Za-z0-9_]+$/.test(value);
}

function validIsoDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function rowsChecksumInput(rows: Array<Record<string, string | null>>) {
  let canonical = "";
  for (const row of rows) {
    for (const key of Object.keys(row).sort()) {
      const value = row[key];
      canonical += `${key.length}:${key}:`;
      canonical += value === null ? "-1:" : `${value.length}:${value}`;
      canonical += ";";
    }
    canonical += "\n";
  }
  return canonical;
}

function parsePayload(body: Uint8Array): BackupPayload | null {
  try {
    const payload = JSON.parse(decoder.decode(body)) as BackupPayload;
    if (!payload || typeof payload !== "object" || !validIdentifier(payload.eventId) || !validIdentifier(payload.runId)) return null;
    return payload;
  } catch {
    return null;
  }
}

async function start(payload: StartPayload) {
  if (!validIsoDate(payload.startedAt) || !Array.isArray(payload.tables) || payload.tables.some((table) =>
    !validTable(table?.name) || !Number.isSafeInteger(table?.rows) || table.rows < 0 || typeof table.createSql !== "string"
  )) throw new Error("Invalid snapshot manifest.");
  const manifestKey = `wordpress/${payload.runId}/manifest-start.json`;
  await env.COMMERCE_BACKUPS.put(manifestKey, JSON.stringify(payload), {
    httpMetadata: { contentType: "application/json" },
  });
  await env.COMMERCE_DB.prepare(
    `INSERT INTO migration_runs (id, mode, status, started_at, source_high_watermark, manifest_key)
     VALUES (?, 'snapshot', 'running', ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET source_high_watermark = excluded.source_high_watermark, manifest_key = excluded.manifest_key`,
  ).bind(payload.runId, payload.startedAt, payload.sourceHighWatermark || null, manifestKey).run();
}

async function storeChunk(payload: ChunkPayload, body: Uint8Array) {
  if (!validTable(payload.table) || !Number.isSafeInteger(payload.chunk) || payload.chunk < 0
    || !Number.isSafeInteger(payload.offset) || payload.offset < 0 || !Array.isArray(payload.rows)
    || !/^[a-f0-9]{64}$/.test(payload.checksumSha256)) throw new Error("Invalid table chunk.");
  const run = await env.COMMERCE_DB.prepare("SELECT status FROM migration_runs WHERE id = ?").bind(payload.runId).first<{ status: string }>();
  if (!run || run.status !== "running") throw new Error("Snapshot run is not active.");
  if (payload.rows.some((row) => !row || typeof row !== "object" || Array.isArray(row)
    || Object.values(row).some((value) => value !== null && typeof value !== "string"))) {
    throw new Error("Invalid table rows.");
  }
  const actualChecksum = hex(await crypto.subtle.digest("SHA-256", encoder.encode(rowsChecksumInput(payload.rows))));
  if (!constantTimeEqual(actualChecksum, payload.checksumSha256)) throw new Error("Chunk checksum mismatch.");
  const key = `wordpress/${payload.runId}/tables/${payload.table}/${String(payload.chunk).padStart(8, "0")}.json`;
  await env.COMMERCE_BACKUPS.put(key, body, {
    httpMetadata: { contentType: "application/json" },
    customMetadata: {
      table: payload.table,
      offset: String(payload.offset),
      rows: String(payload.rows.length),
      checksumSha256: payload.checksumSha256,
    },
  });
}

async function complete(payload: CompletePayload) {
  if (!validIsoDate(payload.completedAt) || !payload.recordCounts || typeof payload.recordCounts !== "object"
    || Object.entries(payload.recordCounts).some(([table, count]) => !validTable(table) || !Number.isSafeInteger(count) || count < 0)) {
    throw new Error("Invalid completion manifest.");
  }
  const manifestKey = `wordpress/${payload.runId}/manifest-complete.json`;
  await env.COMMERCE_BACKUPS.put(manifestKey, JSON.stringify(payload), {
    httpMetadata: { contentType: "application/json" },
  });
  const result = await env.COMMERCE_DB.prepare(
    `UPDATE migration_runs SET status = 'complete', completed_at = ?, source_high_watermark = ?,
       manifest_key = ?, record_counts_json = ? WHERE id = ? AND status = 'running'`,
  ).bind(payload.completedAt, payload.sourceHighWatermark || null, manifestKey, JSON.stringify(payload.recordCounts), payload.runId).run();
  if (!result.meta.changes) throw new Error("Snapshot run is not active.");
}

export async function handleCommerceBackup(request: Request): Promise<Response> {
  const raw = new Uint8Array(await request.arrayBuffer());
  if (raw.byteLength === 0 || raw.byteLength > MAX_JSON_BYTES) return jsonError(413, "Invalid backup payload size.");
  if (!(await authenticate(request, raw))) return jsonError(401, "Invalid or expired signature.");
  const payload = parsePayload(raw);
  if (!payload) return jsonError(400, "Invalid backup payload.");
  if (payload.action !== "start" && payload.action !== "table_chunk" && payload.action !== "complete") {
    return jsonError(400, "Unsupported backup action.");
  }
  try {
    // migration_events references migration_runs, so create the run before
    // recording its first event. Subsequent events remain replay-protected.
    if (payload.action === "start") await start(payload);
    const replay = await env.COMMERCE_DB.prepare(
      "INSERT OR IGNORE INTO migration_events (event_id, run_id, action, received_at) VALUES (?, ?, ?, ?)",
    ).bind(payload.eventId, payload.runId, payload.action, Date.now()).run();
    if (!replay.meta.changes) return jsonError(409, "Replay rejected.");
    if (payload.action === "table_chunk") await storeChunk(payload, raw);
    else if (payload.action === "complete") await complete(payload);
    await env.COMMERCE_DB.prepare("DELETE FROM migration_events WHERE received_at < ?").bind(Date.now() - 7 * 86400000).run();
    return Response.json({ ok: true, runId: payload.runId, action: payload.action });
  } catch (error) {
    await env.COMMERCE_DB.prepare("DELETE FROM migration_events WHERE event_id = ?").bind(payload.eventId).run().catch(() => undefined);
    console.error(JSON.stringify({ event: "commerce_backup_failed", runId: payload.runId, action: payload.action, reason: error instanceof Error ? error.message : "unknown" }));
    return jsonError(500, "Backup step failed and can be retried.");
  }
}
