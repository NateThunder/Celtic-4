import fixture from "../../data/woo-products.json";
import type { CatalogRecord, ProductCatalog } from "./productCatalogTypes";
import { WOO_BASE_URL, WOO_REQUEST_HEADERS } from "./woo";

// Products, prices and stock come live from WooCommerce (cms.celticworship.co.uk).
// The server keeps the last good copy in memory and refreshes it at most once a
// minute, so changes in WordPress show on the shop within about a minute.
// If a refresh fails, the last good live copy keeps serving; the saved snapshot in
// data/woo-products.json is only used if the server has never loaded live data.
const REFRESH_MS = 60_000;
const REQUEST_TIMEOUT_MS = 10_000;
const ATTEMPTS = 3;

type CatalogStatus = {
  source: "live" | "stale-live" | "snapshot";
  lastSuccessAt: string | null;
  lastAttemptAt: string | null;
  lastError: string | null;
  productCount: number;
};

let liveCatalog: ProductCatalog | null = null;
let lastSuccess = 0;
let lastAttempt = 0;
let lastError: string | null = null;
let inFlight: Promise<ProductCatalog> | null = null;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function storeGet(path: string, params: Record<string, string>): Promise<CatalogRecord[]> {
  const url = new URL(`/wp-json/wc/store/v1${path}`, WOO_BASE_URL);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  // SiteGround's server cache on cms.celticworship.co.uk keeps old copies of these
  // WooCommerce responses (stale sizes and stock). A fresh value on every request
  // means the cache can never answer with an old copy.
  url.searchParams.set("_fresh", String(Date.now()));

  let failure = "unknown error";
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { ...WOO_REQUEST_HEADERS, "Cache-Control": "no-cache" },
        cache: "no-store",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const body = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${body.slice(0, 120)}`);
      let data: unknown;
      try {
        data = JSON.parse(body);
      } catch {
        throw new Error(`not JSON: ${body.slice(0, 120)}`);
      }
      if (!Array.isArray(data)) throw new Error("did not return a list");
      return data as CatalogRecord[];
    } catch (error) {
      failure = error instanceof Error ? error.message : String(error);
      if (attempt < ATTEMPTS) await wait(400 * attempt);
    }
  }
  throw new Error(`WooCommerce ${path} failed: ${failure}`);
}

export async function readLiveProductCatalog(): Promise<ProductCatalog> {
  const products = await storeGet("/products", { per_page: "100", orderby: "date", order: "desc" });
  const categories = await storeGet("/products/categories", { per_page: "100" });
  if (products.length === 0) throw new Error("WooCommerce returned no products");

  // One request at a time keeps the load on the WordPress server gentle.
  const variations: Record<string, CatalogRecord[]> = {};
  for (const product of products.filter((candidate) => candidate.type === "variable")) {
    variations[String(product.id)] = await storeGet("/products", {
      type: "variation",
      parent: String(product.id),
      per_page: "100",
    });
  }

  return { version: 1, updatedAt: new Date().toISOString(), products, categories, variations };
}

function snapshot(): ProductCatalog {
  return {
    version: 1,
    updatedAt: fixture.generatedAt,
    products: fixture.products,
    categories: fixture.categories,
    variations: fixture.variations,
  } as ProductCatalog;
}

async function refresh(): Promise<ProductCatalog> {
  lastAttempt = Date.now();
  try {
    liveCatalog = await readLiveProductCatalog();
    lastSuccess = Date.now();
    lastError = null;
    return liveCatalog;
  } catch (error) {
    lastError = error instanceof Error ? error.message : "unknown";
    console.warn(JSON.stringify({ event: "live_catalog_unavailable", reason: lastError }));
    return liveCatalog ?? snapshot();
  } finally {
    inFlight = null;
  }
}

export async function readProductCatalog(): Promise<ProductCatalog> {
  const fresh = liveCatalog && Date.now() - lastSuccess < REFRESH_MS;
  if (fresh) return liveCatalog as ProductCatalog;
  // Don't hammer WordPress while it's failing: retry at most once a minute.
  if (!liveCatalog && lastError && Date.now() - lastAttempt < REFRESH_MS) return snapshot();
  if (liveCatalog && lastError && Date.now() - lastAttempt < REFRESH_MS) return liveCatalog;
  inFlight ??= refresh();
  return inFlight;
}

export function readProductCatalogStatus(): CatalogStatus {
  return {
    source: liveCatalog ? (lastError ? "stale-live" : "live") : "snapshot",
    lastSuccessAt: lastSuccess ? new Date(lastSuccess).toISOString() : null,
    lastAttemptAt: lastAttempt ? new Date(lastAttempt).toISOString() : null,
    lastError,
    productCount: liveCatalog?.products.length ?? 0,
  };
}
