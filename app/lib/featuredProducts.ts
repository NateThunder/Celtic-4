import { WOO_BASE_URL } from "./woo";

type WooStoreImage = {
  src?: string;
  alt?: string;
};

type WooStorePrices = {
  price?: string;
  currency_code?: string;
  currency_symbol?: string;
  currency_minor_unit?: number;
};

type WooStoreProduct = {
  id?: number;
  name?: string;
  images?: WooStoreImage[];
  prices?: WooStorePrices;
};

export type FeaturedProduct = {
  id: number;
  name: string;
  href: string;
  imageSrc: string;
  imageAlt: string;
  priceLabel: string;
};

function formatProductPrice(prices?: WooStorePrices): string {
  if (!prices?.price) return "";

  const minorUnit = Number(prices.currency_minor_unit ?? 2);
  const numericValue = Number(prices.price) / 10 ** minorUnit;
  if (!Number.isFinite(numericValue)) return "";

  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: prices.currency_code || "GBP",
    }).format(numericValue);
  } catch {
    return `${prices.currency_symbol || "£"}${numericValue.toFixed(minorUnit)}`;
  }
}

function normalizeProduct(product: WooStoreProduct): FeaturedProduct | null {
  const id = Number(product.id);
  const name = product.name?.trim();
  const image = product.images?.find((candidate) => candidate.src?.trim());

  if (!Number.isFinite(id) || !name || !image?.src) return null;

  return {
    id,
    name,
    href: `/shop/${id}`,
    imageSrc: image.src,
    imageAlt: image.alt?.trim() || name,
    priceLabel: formatProductPrice(product.prices),
  };
}

export async function getFeaturedProducts(limit = 3): Promise<FeaturedProduct[]> {
  try {
    const endpoint = new URL("/wp-json/wc/store/v1/products", WOO_BASE_URL);
    endpoint.searchParams.set("per_page", String(Math.max(limit * 2, 6)));
    endpoint.searchParams.set("orderby", "date");
    endpoint.searchParams.set("order", "desc");

    const response = await fetch(endpoint.toString(), {
      next: { revalidate: 3600 },
    });

    if (!response.ok) return [];

    const payload = (await response.json()) as unknown;
    if (!Array.isArray(payload)) return [];

    return (payload as WooStoreProduct[])
      .map(normalizeProduct)
      .filter((product): product is FeaturedProduct => product !== null)
      .slice(0, limit);
  } catch {
    return [];
  }
}
