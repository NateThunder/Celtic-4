import Image from "next/image";
import Link from "next/link";
import { WOO_BASE_URL } from "../lib/woo";
import AddToCartButton from "../components/shop/AddToCartButton";
import SiteHeader from "../components/SiteHeader";
import styles from "./shop.module.css";

type WooStoreImage = {
  src: string;
  alt?: string;
};

type WooStorePrices = {
  price?: string;
  currency_code?: string;
  currency_symbol?: string;
  currency_minor_unit?: number;
};

type WooStoreAttributeTerm = {
  name?: string;
  slug?: string;
};

type WooStoreAttribute = {
  name?: string;
  terms?: WooStoreAttributeTerm[];
};

type WooStoreVariationAttribute = {
  name?: string;
  value?: string;
};

type WooStoreVariationRef = {
  id: number;
  attributes?: WooStoreVariationAttribute[];
};

type WooStoreProduct = {
  id: number;
  name: string;
  type?: string;
  variation?: string;
  short_description?: string;
  images?: WooStoreImage[];
  prices?: WooStorePrices;
  sku?: string;
  attributes?: WooStoreAttribute[];
  variations?: WooStoreVariationRef[];
};

type ProductCardItem = {
  key: string;
  product: WooStoreProduct;
  priceLabel: string;
  cartItemId: number;
  cartItemName: string;
};

function stripHtml(input?: string): string {
  if (!input) return "";
  return input.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function formatProductPrice(prices?: WooStorePrices): string {
  if (!prices?.price) return "Price unavailable";

  const minorUnit = Number(prices.currency_minor_unit ?? 2);
  const numericValue = Number(prices.price) / 10 ** minorUnit;
  if (!Number.isFinite(numericValue)) return "Price unavailable";

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: prices.currency_code || "USD",
    }).format(numericValue);
  } catch {
    const symbol = prices.currency_symbol || "";
    return `${symbol}${numericValue.toFixed(minorUnit)}`;
  }
}

function normalize(input?: string): string {
  return (input || "").toLowerCase().trim();
}

function productHasFormat(product: WooStoreProduct, format: "vinyl" | "cd"): boolean {
  const target = normalize(format);
  const formatTerms =
    product.attributes
      ?.filter((attribute) => normalize(attribute.name).includes("format"))
      .flatMap((attribute) => attribute.terms ?? [])
      .map((term) => `${normalize(term.name)} ${normalize(term.slug)}`) ?? [];

  if (formatTerms.some((value) => value.includes(target))) return true;

  const searchable = normalize(`${product.name} ${product.short_description} ${product.sku}`);
  if (target === "vinyl") return /\b(vinyl|lp|record)\b/.test(searchable);
  return /\b(cd|compact disc|disc)\b/.test(searchable);
}

function getVariationForFormat(
  product: WooStoreProduct,
  format: "vinyl" | "cd",
  variationById: Map<number, WooStoreProduct>,
): WooStoreProduct | null {
  const target = normalize(format);
  const matchedVariationRef = product.variations?.find((variationRef) =>
    variationRef.attributes?.some((attribute) => normalize(attribute.value).includes(target)),
  );

  if (!matchedVariationRef) return null;
  return variationById.get(matchedVariationRef.id) ?? null;
}

function buildBaseCardItem(product: WooStoreProduct, keyPrefix: string): ProductCardItem {
  const priceLabel = formatProductPrice(product.prices);

  return {
    key: `${keyPrefix}-${product.id}`,
    product,
    priceLabel,
    cartItemId: product.id,
    cartItemName: product.name,
  };
}

function buildFormatCardItem(
  product: WooStoreProduct,
  format: "vinyl" | "cd",
  variationById: Map<number, WooStoreProduct>,
): ProductCardItem {
  const variationProduct = getVariationForFormat(product, format, variationById);
  const formatLabel = format === "cd" ? "CD" : "Vinyl";
  const priceLabel = formatProductPrice(variationProduct?.prices ?? product.prices);
  const cartItemId = variationProduct?.id ?? product.id;
  const cartItemName = variationProduct ? `${product.name} (${formatLabel})` : product.name;

  return {
    key: `${format}-${cartItemId}`,
    product,
    priceLabel,
    cartItemId,
    cartItemName,
  };
}

function renderProductCard(item: ProductCardItem) {
  const image = item.product.images?.[0];
  const description = stripHtml(item.product.short_description);

  return (
    <li key={item.key} className={styles.card}>
      <Link className={styles.cardImageLink} href={`/shop/${item.product.id}`}>
        {image?.src ? (
          <Image
            className={styles.cardImage}
            src={image.src}
            alt={image.alt || item.product.name}
            width={720}
            height={720}
          />
        ) : (
          <div className={`${styles.cardImage} ${styles.cardImagePlaceholder}`} />
        )}
      </Link>

      <div className={styles.cardBody}>
        <h2 className={styles.cardTitle}>{item.product.name}</h2>
        <p className={styles.cardPrice}>{item.priceLabel}</p>
        {description ? <p className={styles.cardCopy}>{description}</p> : null}
        <AddToCartButton
          className={styles.cardAddButton}
          item={{
            id: item.cartItemId,
            name: item.cartItemName,
            href: `/shop/${item.product.id}`,
            price: item.priceLabel,
            imageSrc: image?.src,
            imageAlt: image?.alt || item.product.name,
          }}
        />
        <Link className={styles.cardLink} href={`/shop/${item.product.id}`}>
          View Product
        </Link>
      </div>
    </li>
  );
}

async function getStoreProducts(): Promise<WooStoreProduct[]> {
  const endpoint = new URL("/wp-json/wc/store/v1/products", WOO_BASE_URL);
  endpoint.searchParams.set("per_page", "24");
  endpoint.searchParams.set("orderby", "date");
  endpoint.searchParams.set("order", "desc");

  const response = await fetch(endpoint.toString(), {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`Store request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as unknown;
  return Array.isArray(payload) ? (payload as WooStoreProduct[]) : [];
}

async function getStoreProductById(productId: number): Promise<WooStoreProduct | null> {
  const endpoint = new URL(`/wp-json/wc/store/v1/products/${productId}`, WOO_BASE_URL);
  const response = await fetch(endpoint.toString(), {
    next: { revalidate: 300 },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Store product ${productId} request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as unknown;
  return payload && typeof payload === "object" ? (payload as WooStoreProduct) : null;
}

export default async function ShopPage() {
  let products: WooStoreProduct[] = [];
  let variationById = new Map<number, WooStoreProduct>();
  let loadError = "";

  try {
    products = await getStoreProducts();

    const variationIds = Array.from(
      new Set(
        products.flatMap((product) =>
          (product.variations ?? []).map((variationRef) => variationRef.id),
        ),
      ),
    );

    const variationEntries = await Promise.all(
      variationIds.map(async (variationId) => {
        try {
          const variationProduct = await getStoreProductById(variationId);
          return variationProduct ? ([variationId, variationProduct] as const) : null;
        } catch {
          return null;
        }
      }),
    );

    variationById = new Map(
      variationEntries
        .filter((entry): entry is readonly [number, WooStoreProduct] => entry !== null)
        .map(([variationId, variationProduct]) => [variationId, variationProduct]),
    );
  } catch {
    loadError = "Unable to load products right now. Please try again in a moment.";
  }

  const vinylItems = products
    .filter((product) => productHasFormat(product, "vinyl"))
    .map((product) => buildFormatCardItem(product, "vinyl", variationById));
  const cdItems = products
    .filter((product) => productHasFormat(product, "cd"))
    .map((product) => buildFormatCardItem(product, "cd", variationById));
  const otherItems = products
    .filter(
      (product) =>
        !productHasFormat(product, "vinyl") &&
        !productHasFormat(product, "cd"),
    )
    .map((product) => buildBaseCardItem(product, "other"));

  return (
    <div className="site-shell">
      <SiteHeader />
      <main className={styles.page}>
        <section className={styles.shell}>
          <header className={styles.header}>
            <p className={styles.kicker}>Celtic Worship</p>
            <h1 className={styles.title}>Shop</h1>
            <div className={styles.nav}>
              <Link className={styles.navLink} href="/">
                Back Home
              </Link>
            </div>
          </header>

          {loadError ? <p className={styles.status}>{loadError}</p> : null}
          {!loadError && products.length === 0 ? (
            <p className={styles.status}>No products available at the moment.</p>
          ) : null}

          {!loadError && products.length > 0 ? (
            <div className={styles.sections}>
              <section className={styles.productSection} aria-labelledby="vinyl-heading">
                <div className={styles.sectionHeader}>
                  <h2 id="vinyl-heading" className={styles.sectionTitle}>
                    Vinyl
                  </h2>
                  <p className={styles.sectionCount}>{vinylItems.length}</p>
                </div>
                {vinylItems.length > 0 ? (
                  <ul className={styles.grid}>{vinylItems.map((item) => renderProductCard(item))}</ul>
                ) : (
                  <p className={styles.status}>No vinyl products available right now.</p>
                )}
              </section>

              <section className={styles.productSection} aria-labelledby="cd-heading">
                <div className={styles.sectionHeader}>
                  <h2 id="cd-heading" className={styles.sectionTitle}>
                    CDs
                  </h2>
                  <p className={styles.sectionCount}>{cdItems.length}</p>
                </div>
                {cdItems.length > 0 ? (
                  <ul className={styles.grid}>{cdItems.map((item) => renderProductCard(item))}</ul>
                ) : (
                  <p className={styles.status}>No CD products available right now.</p>
                )}
              </section>

              {otherItems.length > 0 ? (
                <section className={styles.productSection} aria-labelledby="other-heading">
                  <div className={styles.sectionHeader}>
                    <h2 id="other-heading" className={styles.sectionTitle}>
                      Other Merch
                    </h2>
                    <p className={styles.sectionCount}>{otherItems.length}</p>
                  </div>
                  <ul className={styles.grid}>{otherItems.map((item) => renderProductCard(item))}</ul>
                </section>
              ) : null}
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
