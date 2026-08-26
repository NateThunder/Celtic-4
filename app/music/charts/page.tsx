import type { Metadata } from "next";
import SiteHeader from "../../components/SiteHeader";
import { WOO_BASE_URL } from "../../lib/woo";
import MusicSectionTabs from "../MusicSectionTabs";
import ChartsPageClient, { type SheetMusicProduct } from "./ChartsPageClient";
import styles from "./charts.module.css";

export const metadata: Metadata = {
  title: "Sheet Music | Celtic Worship",
  description: "Shop the sheet music currently available from Celtic Worship, with album resource packs coming soon.",
};

type WooStoreProduct = {
  id: number;
  name: string;
  type?: string;
  is_in_stock?: boolean;
  images?: { src: string; alt?: string }[];
  prices?: {
    price?: string;
    currency_code?: string;
    currency_symbol?: string;
    currency_minor_unit?: number;
  };
  categories?: { name?: string; slug?: string }[];
  attributes?: {
    name?: string;
    taxonomy?: string;
    has_variations?: boolean;
    terms?: { name?: string; slug?: string }[];
  }[];
  variations?: {
    id?: number;
    attributes?: { name?: string; value?: string }[];
  }[];
};

function isSheetMusicProduct(product: WooStoreProduct): boolean {
  return (product.categories ?? []).some((category) =>
    category.slug?.trim().toLowerCase() === "sheet-music" ||
    category.name?.trim().toLowerCase() === "sheet music",
  );
}

function formatProductPrice(product: WooStoreProduct): string {
  const prices = product.prices;
  if (!prices?.price) return "View price";

  const minorUnit = Number(prices.currency_minor_unit ?? 2);
  const numericValue = Number(prices.price) / 10 ** minorUnit;
  if (!Number.isFinite(numericValue)) return "View price";

  try {
    const price = new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: prices.currency_code || "GBP",
    }).format(numericValue);
    return product.type === "variable" ? `From ${price}` : price;
  } catch {
    const price = `${prices.currency_symbol || "£"}${numericValue.toFixed(minorUnit)}`;
    return product.type === "variable" ? `From ${price}` : price;
  }
}

async function getAvailableSheetMusic(): Promise<SheetMusicProduct[]> {
  const endpoint = new URL("/wp-json/wc/store/v1/products", WOO_BASE_URL);
  endpoint.searchParams.set("per_page", "100");
  endpoint.searchParams.set("orderby", "menu_order");
  endpoint.searchParams.set("order", "asc");

  const response = await fetch(endpoint.toString(), { next: { revalidate: 300 } });
  if (!response.ok) throw new Error(`Sheet music request failed with ${response.status}.`);

  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload)) return [];

  const sheetMusicProducts = (payload as WooStoreProduct[])
    .filter((product) => product.is_in_stock !== false && isSheetMusicProduct(product));

  return Promise.all(sheetMusicProducts.map(async (product) => {
    const packageAttribute = product.attributes?.find(
      (attribute) => attribute.has_variations && attribute.name?.trim().toLowerCase() === "package",
    );
    const variationSummaries = new Map(
      (product.variations ?? []).flatMap((variation) =>
        typeof variation.id === "number" ? [[variation.id, variation.attributes ?? []] as const] : [],
      ),
    );
    let packageOptions: SheetMusicProduct["packageOptions"] = [];

    if (product.type === "variable" && packageAttribute) {
      const variationsEndpoint = new URL("/wp-json/wc/store/v1/products", WOO_BASE_URL);
      variationsEndpoint.searchParams.set("type", "variation");
      variationsEndpoint.searchParams.set("parent", String(product.id));
      variationsEndpoint.searchParams.set("per_page", "100");

      const variationsResponse = await fetch(variationsEndpoint.toString(), { next: { revalidate: 300 } });
      if (variationsResponse.ok) {
        const variationsPayload = (await variationsResponse.json()) as unknown;
        if (Array.isArray(variationsPayload)) {
          packageOptions = (variationsPayload as WooStoreProduct[]).flatMap((variation) => {
            const summaryAttribute = variationSummaries.get(variation.id)?.find(
              (attribute) => attribute.name?.trim().toLowerCase() === "package",
            );
            const matchingTerm = packageAttribute.terms?.find((term) =>
              term.name?.trim().toLowerCase() === summaryAttribute?.value?.trim().toLowerCase() ||
              term.slug?.trim().toLowerCase() === summaryAttribute?.value?.trim().toLowerCase(),
            );
            const value = matchingTerm?.slug || summaryAttribute?.value;
            const label = matchingTerm?.name || summaryAttribute?.value;
            if (!value || !label || variation.is_in_stock === false) return [];

            return [{
              label,
              value,
              variationId: variation.id,
              price: formatProductPrice(variation),
              attribute: packageAttribute.taxonomy || packageAttribute.name || "Package",
            }];
          }).sort((left, right) => {
            const packageOrder = { standard: 0, complete: 1 } as Record<string, number>;
            return (packageOrder[left.label.toLowerCase()] ?? 2) - (packageOrder[right.label.toLowerCase()] ?? 2);
          });
        }
      }
    }

    return {
      id: product.id,
      name: product.name,
      price: formatProductPrice(product),
      imageUrl: product.images?.[0]?.src ?? "",
      imageAlt: product.images?.[0]?.alt || product.name,
      packageOptions,
      productUrl: `/shop/${product.id}`,
    };
  }));
}

export default async function MusicChartsPage() {
  const products = await getAvailableSheetMusic().catch(() => null);

  return (
    <div className="site-shell">
      <SiteHeader hideMobileSocials />
      <main className={styles.page}>
        <section className={styles.shell}>
          <MusicSectionTabs active="charts" />

          <header className={styles.hero}>
            <div className={styles.heroCopy}>
              <h1 className={styles.title}><span>Sheet Music</span></h1>
              <div className={styles.titleRule} aria-hidden="true" />
              <p className={styles.desktopIntro}>
                Browse the sheet music currently available from the Celtic Worship shop.
                Album Resource Packs are coming soon.
              </p>
              <p className={styles.mobileIntro}>
                Available sheet music, with Album Resource Packs coming soon.
              </p>
            </div>
          </header>

          <ChartsPageClient products={products ?? []} loadError={products === null} />
        </section>
      </main>
    </div>
  );
}
