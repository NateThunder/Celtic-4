import { env } from "cloudflare:workers";
import type { CatalogRecord, ProductCatalog, ProductSyncPayload } from "../app/lib/productCatalogTypes";

const INDEX_KEY = "catalog:index";
const MAX_AGE_SECONDS = 300;
const encoder = new TextEncoder();

function jsonError(status: number, error: string) {
  return Response.json({ error }, { status });
}

function validRecord(value: unknown): value is CatalogRecord {
  return Boolean(value) && typeof value === "object" && Number.isInteger((value as CatalogRecord).id);
}

function validRecords(value: unknown): value is CatalogRecord[] {
  return Array.isArray(value) && value.every(validRecord);
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

async function expectedSignature(timestamp: string, body: string) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(env.PRODUCT_SYNC_SECRET), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return hex(await crypto.subtle.sign("HMAC", key, encoder.encode(`${timestamp}.${body}`)));
}

async function authenticate(request: Request, body: string) {
  const timestamp = request.headers.get("x-cw-timestamp") || "";
  const signature = (request.headers.get("x-cw-signature") || "").replace(/^sha256=/, "").toLowerCase();
  const seconds = Number(timestamp);
  if (!/^\d+$/.test(timestamp) || Math.abs(Math.floor(Date.now() / 1000) - seconds) > MAX_AGE_SECONDS) return false;
  if (!/^[a-f0-9]{64}$/.test(signature)) return false;
  return constantTimeEqual(await expectedSignature(timestamp, body), signature);
}

async function putProduct(product: CatalogRecord, variations: CatalogRecord[] = []) {
  const value = JSON.stringify({ product, variations });
  const writes = [env.PRODUCT_CATALOG.put(`product:id:${product.id}`, value)];
  if (product.slug) writes.push(env.PRODUCT_CATALOG.put(`product:slug:${product.slug}`, value));
  await Promise.all(writes);
}

async function applySync(payload: ProductSyncPayload): Promise<ProductCatalog> {
  const current = await env.PRODUCT_CATALOG.get<ProductCatalog>(INDEX_KEY, "json");
  if (payload.mode === "full") {
    if (!validRecords(payload.products) || !validRecords(payload.categories) || !payload.variationsByProduct || typeof payload.variationsByProduct !== "object") {
      throw new Error("A full sync requires products, categories, and variationsByProduct.");
    }
    const variations = payload.variationsByProduct;
    await Promise.all(payload.products.map((product) => putProduct(product, validRecords(variations[String(product.id)]) ? variations[String(product.id)] : [])));
    const catalogue: ProductCatalog = { version: 1, updatedAt: new Date().toISOString(), products: payload.products, categories: payload.categories, variations };
    await env.PRODUCT_CATALOG.put(INDEX_KEY, JSON.stringify(catalogue));
    return catalogue;
  }
  if (!current) throw new Error("Run a full sync before incremental updates.");
  if (payload.mode === "upsert") {
    if (!validRecord(payload.product) || !validRecords(payload.variations) || !validRecords(payload.categories)) throw new Error("An upsert requires product, variations, and categories.");
    const products = current.products.filter((item) => item.id !== payload.product!.id);
    products.unshift(payload.product);
    const variations = { ...current.variations, [String(payload.product.id)]: payload.variations };
    await putProduct(payload.product, payload.variations);
    const catalogue: ProductCatalog = { version: 1, updatedAt: new Date().toISOString(), products, categories: payload.categories, variations };
    await env.PRODUCT_CATALOG.put(INDEX_KEY, JSON.stringify(catalogue));
    return catalogue;
  }
  if (!Number.isInteger(payload.productId)) throw new Error("A delete requires productId.");
  const removed = current.products.find((item) => item.id === payload.productId);
  const products = current.products.filter((item) => item.id !== payload.productId);
  const variations = { ...current.variations };
  delete variations[String(payload.productId)];
  const catalogue: ProductCatalog = { version: 1, updatedAt: new Date().toISOString(), products, categories: validRecords(payload.categories) ? payload.categories : current.categories, variations };
  await env.PRODUCT_CATALOG.put(INDEX_KEY, JSON.stringify(catalogue));
  await Promise.all([
    env.PRODUCT_CATALOG.delete(`product:id:${payload.productId}`),
    ...(removed?.slug ? [env.PRODUCT_CATALOG.delete(`product:slug:${removed.slug}`)] : []),
  ]);
  return catalogue;
}

export async function handleProductSync(request: Request): Promise<Response> {
  const body = await request.text();
  if (!(await authenticate(request, body))) {
    console.warn(JSON.stringify({ event: "product_sync_rejected", reason: "authentication" }));
    return jsonError(401, "Invalid or expired signature.");
  }
  let payload: ProductSyncPayload;
  try { payload = JSON.parse(body) as ProductSyncPayload; } catch { return jsonError(400, "Invalid JSON."); }
  if (!payload.eventId || !/^[A-Za-z0-9._:-]{8,128}$/.test(payload.eventId)) return jsonError(400, "Invalid eventId.");
  try {
    const result = await env.STEMS_DB.prepare("INSERT OR IGNORE INTO product_sync_events (event_id, received_at) VALUES (?, ?)")
      .bind(payload.eventId, Date.now()).run();
    if (!result.meta.changes) return jsonError(409, "Replay rejected.");
    const catalogue = await applySync(payload);
    await env.STEMS_DB.prepare("DELETE FROM product_sync_events WHERE received_at < ?").bind(Date.now() - 86400000).run();
    console.log(JSON.stringify({ event: "product_sync_applied", mode: payload.mode, eventId: payload.eventId, products: catalogue.products.length }));
    return Response.json({ ok: true, products: catalogue.products.length, updatedAt: catalogue.updatedAt });
  } catch (error) {
    await env.STEMS_DB.prepare("DELETE FROM product_sync_events WHERE event_id = ?").bind(payload.eventId).run().catch(() => undefined);
    console.error(JSON.stringify({ event: "product_sync_failed", eventId: payload.eventId, reason: error instanceof Error ? error.message : "unknown" }));
    return jsonError(500, "Sync failed; the previous catalogue remains active.");
  }
}
