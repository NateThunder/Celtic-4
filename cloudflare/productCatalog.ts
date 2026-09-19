import { env } from "cloudflare:workers";
import type { ProductCatalog } from "../app/lib/productCatalogTypes";

const INDEX_KEY = "catalog:index";

export async function readProductCatalog(): Promise<ProductCatalog> {
  const catalog = await env.PRODUCT_CATALOG.get<ProductCatalog>(INDEX_KEY, "json");
  if (!catalog || catalog.version !== 1 || !Array.isArray(catalog.products)) {
    throw new Error("The product catalogue has not been synced to KV.");
  }
  return catalog;
}
