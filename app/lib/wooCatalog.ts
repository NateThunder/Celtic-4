import fixture from "../../data/woo-products.json";
import { readProductCatalog } from "#product-catalog";

type JsonObject = Record<string, unknown>;

async function catalogOrFallback() {
  try {
    return await readProductCatalog();
  } catch (error) {
    console.warn(JSON.stringify({ event: "product_catalog_unavailable", reason: error instanceof Error ? error.message : "unknown" }));
    return { version: 1 as const, updatedAt: fixture.generatedAt, products: fixture.products, categories: fixture.categories, variations: fixture.variations };
  }
}

export async function fetchCatalogArray<T>(endpoint: URL, fallback: readonly T[], _revalidate = 300): Promise<T[]> {
  const catalog = await catalogOrFallback();
  if (endpoint.pathname.endsWith("/products/categories")) return catalog.categories as T[];
  const variationMatch = endpoint.pathname.match(/\/products\/(\d+)\/variations$/);
  if (variationMatch) return ((catalog.variations as Record<string, unknown[]>)[variationMatch[1]] ?? []) as T[];
  if (endpoint.pathname.endsWith("/products")) {
    let products = catalog.products;
    if (endpoint.searchParams.get("type") === "variation") {
      const parents = endpoint.searchParams.get("parent")?.split(",").filter(Boolean);
      products = parents
        ? parents.flatMap((parent) => (catalog.variations as Record<string, typeof products>)[parent] ?? [])
        : Object.values(catalog.variations).flat();
    }
    const include = endpoint.searchParams.get("include");
    if (include) {
      const ids = new Set(include.split(",").map(Number));
      products = products.filter((product) => ids.has(product.id));
    }
    return products as T[];
  }
  return fallback as T[];
}

export async function fetchCatalogObject<T extends JsonObject>(endpoint: URL, fallback: T | null): Promise<T | null> {
  const match = endpoint.pathname.match(/\/products\/(\d+)$/);
  if (!match) return fallback;
  const catalog = await catalogOrFallback();
  return (catalog.products.find((product) => product.id === Number(match[1])) as T | undefined) ?? fallback;
}

export function fixtureProducts<T>(): T[] { return fixture.products as T[]; }
export function fixtureCategories<T>(): T[] { return fixture.categories as T[]; }
export function fixtureProduct<T>(productId: number): T | null { return (fixture.products.find((product) => product.id === productId) as T | undefined) ?? null; }
export function fixtureVariations<T>(productId: number): T[] {
  const variations = fixture.variations as Record<string, unknown[]>;
  return (variations[String(productId)] ?? []) as T[];
}
