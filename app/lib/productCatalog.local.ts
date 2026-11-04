import fixture from "../../data/woo-products.json";
import type { CatalogRecord, ProductCatalog } from "./productCatalogTypes";
import { WOO_BASE_URL, WOO_REQUEST_HEADERS } from "./woo";

// Products, prices and stock come live from WooCommerce (cms.celticworship.co.uk),
// refreshed at most once a minute, so changes in WordPress show on the shop within
// about a minute. If WooCommerce can't be reached, the saved copy in
// data/woo-products.json keeps the shop working.
const REFRESH_SECONDS = 60;

async function storeGet(path: string, params: Record<string, string>): Promise<CatalogRecord[]> {
  const url = new URL(`/wp-json/wc/store/v1${path}`, WOO_BASE_URL);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const response = await fetch(url, { headers: WOO_REQUEST_HEADERS, next: { revalidate: REFRESH_SECONDS } });
  if (!response.ok) throw new Error(`WooCommerce ${path} returned ${response.status}`);
  const data: unknown = await response.json();
  if (!Array.isArray(data)) throw new Error(`WooCommerce ${path} did not return a list`);
  return data as CatalogRecord[];
}

export async function readLiveProductCatalog(): Promise<ProductCatalog> {
  const [products, categories] = await Promise.all([
    storeGet("/products", { per_page: "100", orderby: "date", order: "desc" }),
    storeGet("/products/categories", { per_page: "100" }),
  ]);
  if (products.length === 0) throw new Error("WooCommerce returned no products");

  const variable = products.filter((product) => product.type === "variable");
  const variationLists = await Promise.all(
    variable.map((product) => storeGet("/products", { type: "variation", parent: String(product.id), per_page: "100" })),
  );
  const variations: Record<string, CatalogRecord[]> = {};
  variable.forEach((product, i) => {
    variations[String(product.id)] = variationLists[i];
  });

  return { version: 1, updatedAt: new Date().toISOString(), products, categories, variations };
}

export async function readProductCatalog(): Promise<ProductCatalog> {
  try {
    return await readLiveProductCatalog();
  } catch (error) {
    console.warn(JSON.stringify({ event: "live_catalog_unavailable", reason: error instanceof Error ? error.message : "unknown" }));
    return { version: 1, updatedAt: fixture.generatedAt, products: fixture.products, categories: fixture.categories, variations: fixture.variations } as ProductCatalog;
  }
}
