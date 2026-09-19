import fixture from "../../data/woo-products.json";
import type { ProductCatalog } from "./productCatalogTypes";

export async function readProductCatalog(): Promise<ProductCatalog> {
  return { version: 1, updatedAt: fixture.generatedAt, products: fixture.products, categories: fixture.categories, variations: fixture.variations } as ProductCatalog;
}
