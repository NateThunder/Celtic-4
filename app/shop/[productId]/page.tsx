import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import AddToCartButton from "../../components/shop/AddToCartButton";
import { WOO_BASE_URL } from "../../lib/woo";
import styles from "./product.module.css";

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

type WooStoreProduct = {
  id: number;
  name: string;
  short_description?: string;
  description?: string;
  images?: WooStoreImage[];
  prices?: WooStorePrices;
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

async function getStoreProduct(productId: number): Promise<WooStoreProduct | null> {
  const endpoint = new URL(`/wp-json/wc/store/v1/products/${productId}`, WOO_BASE_URL);
  const response = await fetch(endpoint.toString(), {
    next: { revalidate: 300 },
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Store request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as unknown;
  return payload && typeof payload === "object" ? (payload as WooStoreProduct) : null;
}

type ShopProductPageProps = {
  params: Promise<{ productId: string }>;
};

export default async function ShopProductPage({ params }: ShopProductPageProps) {
  const { productId } = await params;
  const numericId = Number(productId);
  if (!Number.isFinite(numericId)) notFound();

  const product = await getStoreProduct(numericId);
  if (!product) notFound();

  const image = product.images?.[0];
  const shortDescription = stripHtml(product.short_description);
  const longDescription = stripHtml(product.description);
  const description = longDescription || shortDescription;
  const price = formatProductPrice(product.prices);

  return (
    <div className="site-shell">
      <SiteHeader />
      <main className={styles.page}>
        <section className={styles.shell}>
          <div className={styles.backRow}>
            <Link href="/shop" className={styles.backLink}>
              Back to Shop
            </Link>
          </div>

          <article className={styles.card}>
            <div className={styles.imageWrap}>
              {image?.src ? (
                <Image
                  className={styles.image}
                  src={image.src}
                  alt={image.alt || product.name}
                  width={1080}
                  height={1080}
                />
              ) : (
                <div className={`${styles.image} ${styles.imagePlaceholder}`} />
              )}
            </div>

            <div className={styles.meta}>
              <h1 className={styles.title}>{product.name}</h1>
              <p className={styles.price}>{price}</p>
              {description ? <p className={styles.description}>{description}</p> : null}

              <div className={styles.actions}>
                <AddToCartButton
                  className={styles.actionAdd}
                  item={{
                    id: product.id,
                    name: product.name,
                    href: `/shop/${product.id}`,
                    price,
                    imageSrc: image?.src,
                    imageAlt: image?.alt || product.name,
                  }}
                />
                <Link className={styles.actionGhost} href="/shop">
                  Continue Shopping
                </Link>
                <Link className={styles.actionPrimary} href="/">
                  Back Home
                </Link>
              </div>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}
