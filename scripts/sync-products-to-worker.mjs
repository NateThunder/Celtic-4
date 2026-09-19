import { createHmac, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";

const workerUrl = process.argv[2] || "https://celtic-worship.celtic-website-3.workers.dev";
const fixture = JSON.parse(await readFile("data/woo-products.json", "utf8"));
const envFile = await readFile(".dev.vars", "utf8");
const secretLine = envFile.split(/\r?\n/).find((line) => line.startsWith("PRODUCT_SYNC_SECRET="));
if (!secretLine) throw new Error("PRODUCT_SYNC_SECRET is missing from .dev.vars.");
const secret = secretLine.slice(secretLine.indexOf("=") + 1).trim();
const payload = {
  eventId: `manual-full:${Date.now()}:${randomUUID()}`,
  mode: "full",
  products: fixture.products,
  categories: fixture.categories,
  variationsByProduct: fixture.variations,
};
const body = JSON.stringify(payload);
const timestamp = String(Math.floor(Date.now() / 1000));
const signature = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
const response = await fetch(new URL("/api/internal/product-sync", workerUrl), {
  method: "POST",
  headers: { "content-type": "application/json", "x-cw-timestamp": timestamp, "x-cw-signature": `sha256=${signature}` },
  body,
});
const text = await response.text();
if (!response.ok) throw new Error(`Sync failed (${response.status}): ${text}`);
console.log(text);
