import { createHmac, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

const origin = process.argv[2] || "https://celtic-worship.celtic-website-3.workers.dev";
const fixture = JSON.parse(await readFile("data/woo-products.json", "utf8"));
const envFile = await readFile(".dev.vars", "utf8");
const secret = envFile.match(/^PRODUCT_SYNC_SECRET=(.+)$/m)?.[1]?.trim();
if (!secret) throw new Error("PRODUCT_SYNC_SECRET is missing.");

const payload = JSON.stringify({
  eventId: `verification:${Date.now()}:${randomUUID()}`,
  mode: "full",
  products: fixture.products,
  categories: fixture.categories,
  variationsByProduct: fixture.variations,
});
const timestamp = String(Math.floor(Date.now() / 1000));
const signature = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
const endpoint = new URL("/api/internal/product-sync", origin);
const request = (headers, body = payload) => fetch(endpoint, { method: "POST", headers: { "content-type": "application/json", ...headers }, body });

const valid = await request({ "x-cw-timestamp": timestamp, "x-cw-signature": `sha256=${signature}` });
if (valid.status !== 200) throw new Error(`Valid signature returned ${valid.status}.`);
const replay = await request({ "x-cw-timestamp": timestamp, "x-cw-signature": `sha256=${signature}` });
if (replay.status !== 409) throw new Error(`Replay returned ${replay.status}, expected 409.`);
const missing = await request({});
if (missing.status !== 401) throw new Error(`Missing signature returned ${missing.status}, expected 401.`);
const oldTimestamp = String(Number(timestamp) - 600);
const oldSignature = createHmac("sha256", secret).update(`${oldTimestamp}.${payload}`).digest("hex");
const expired = await request({ "x-cw-timestamp": oldTimestamp, "x-cw-signature": `sha256=${oldSignature}` });
if (expired.status !== 401) throw new Error(`Expired signature returned ${expired.status}, expected 401.`);
const invalid = await request({ "x-cw-timestamp": timestamp, "x-cw-signature": `sha256=${"0".repeat(64)}` });
if (invalid.status !== 401) throw new Error(`Invalid signature returned ${invalid.status}, expected 401.`);
console.log("OK valid sync accepted; replay, missing, expired, and invalid signatures rejected.");
