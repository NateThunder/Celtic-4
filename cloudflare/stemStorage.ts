import { env } from "cloudflare:workers";
import type { StoredTrack } from "../app/lib/stemTracks";
export const audioUrl = (key: string) => key.replace(/^stems\/uploads\//, "/api/stems/audio/");

export async function readTracks(): Promise<StoredTrack[]> {
  const result = await env.STEMS_DB.prepare(
    "SELECT payload FROM stem_tracks ORDER BY created_at DESC",
  ).all<{ payload: string }>();
  return result.results.map(row => {
    const track = JSON.parse(row.payload) as StoredTrack;
    return { ...track, stems: track.stems.map(stem => ({ ...stem, fileUrl: stem.fileUrl.replace(/^\/stems\/uploads\//, "/api/stems/audio/") })) };
  });
}

export async function saveTrack(track: StoredTrack) {
  await env.STEMS_DB.prepare(
    "INSERT INTO stem_tracks (id, created_at, payload) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET payload = excluded.payload",
  ).bind(track.id, track.createdAt, JSON.stringify(track)).run();
}

export async function saveAudio(key: string, buffer: Buffer, contentType?: string) {
  await env.STEMS_BUCKET.put(key, buffer, {
    httpMetadata: { contentType: contentType || "application/octet-stream" },
  });
}

export async function readAudio(key: string, request: Request): Promise<Response> {
  const metadata = await env.STEMS_BUCKET.head(key);
  if (!metadata) return new Response("Not found", { status: 404 });
  const headers = new Headers({ "Accept-Ranges": "bytes", "Cache-Control": "public, max-age=3600" });
  metadata.writeHttpMetadata(headers);
  headers.set("ETag", metadata.httpEtag);
  if (request.headers.get("if-none-match") === metadata.httpEtag) return new Response(null, { status: 304, headers });
  let offset = 0;
  let length = metadata.size;
  const range = request.headers.get("range");
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${metadata.size}` } });
    offset = match[1] ? Number(match[1]) : Math.max(0, metadata.size - Number(match[2]));
    const end = match[1] && match[2] ? Math.min(Number(match[2]), metadata.size - 1) : metadata.size - 1;
    length = end - offset + 1;
    if (offset >= metadata.size || length <= 0) return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${metadata.size}` } });
    headers.set("Content-Range", `bytes ${offset}-${end}/${metadata.size}`);
  }
  headers.set("Content-Length", String(length));
  if (request.method === "HEAD") return new Response(null, { status: range ? 206 : 200, headers });
  const object = await env.STEMS_BUCKET.get(key, { range: { offset, length } });
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, { status: range ? 206 : 200, headers });
}
