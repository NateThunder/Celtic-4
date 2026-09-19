import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = process.env.WOO_EXPORT_URL || "https://cms.celticworship.co.uk";
const curl = process.platform === "win32" ? "curl.exe" : "curl";

function fetchJson(path, params = {}) {
  const url = new URL(`/wp-json/wc/store/v1${path}`, baseUrl);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    const result = spawnSync(curl, [
      "--fail-with-body", "--silent", "--show-error", "--location",
      "--retry", "2", "--retry-all-errors",
      "--user-agent", "Mozilla/5.0 CelticWorshipFixtureExporter/1.0",
      "--header", "Accept: application/json",
      url.toString(),
    ], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });

    const body = result.stdout.trim();
    if (result.status === 0 && body && !body.startsWith("<") && !body.includes("sgcaptcha")) {
      try { return JSON.parse(body); } catch { /* Retry malformed JSON. */ }
    }
    if (attempt === 4) {
      throw new Error(`Could not export ${url}. SiteGround returned a challenge or invalid JSON.`);
    }
  }
}

const products = fetchJson("/products", { per_page: 100, orderby: "date", order: "desc" });
if (!Array.isArray(products) || products.length !== 16) {
  throw new Error(`Expected 16 WooCommerce products, received ${Array.isArray(products) ? products.length : "invalid data"}.`);
}

const categories = fetchJson("/products/categories", { per_page: 100 });
if (!Array.isArray(categories)) throw new Error("WooCommerce categories response was not an array.");

const variations = {};
for (const product of products) {
  if (product.type !== "variable") continue;
  const values = fetchJson("/products", { type: "variation", parent: product.id, per_page: 100 });
  if (!Array.isArray(values)) throw new Error(`Variations for product ${product.id} were not an array.`);
  variations[String(product.id)] = values;
}

const fixture = {
  generatedAt: new Date().toISOString(),
  source: baseUrl,
  products,
  categories,
  variations,
};

await mkdir("data", { recursive: true });
await writeFile("data/woo-products.json", `${JSON.stringify(fixture, null, 2)}\n`, "utf8");
console.log(`Exported ${products.length} products, ${categories.length} categories, and ${Object.values(variations).flat().length} variations.`);
