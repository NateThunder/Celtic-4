import type { MetadataRoute } from "next";
import { readProductCatalog } from "#product-catalog";

// Tells Google which pages make up the site, including every shop product,
// so search results point here and not at the WordPress back end.
const SITE = "https://celticworship.co.uk";
const PAGES = ["", "/music", "/music/charts", "/live-events", "/videos", "/shop", "/about", "/contact"];

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const catalog = await readProductCatalog();
  return [
    ...PAGES.map((path) => ({ url: `${SITE}${path}`, changeFrequency: "weekly" as const, priority: path === "" ? 1 : 0.7 })),
    ...catalog.products.map((product) => ({ url: `${SITE}/shop/${product.id}`, changeFrequency: "weekly" as const, priority: 0.6 })),
  ];
}
