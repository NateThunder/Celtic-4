import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import SiteHeader from "../../components/SiteHeader";
import AddToCartButton from "../../components/shop/AddToCartButton";
import EqualHeightCardGrid from "../../components/shop/EqualHeightCardGrid";
import ExpandableDescription from "../../components/shop/ExpandableDescription";
import { WOO_BASE_URL } from "../../lib/woo";
import ProductImageGallery from "./ProductImageGallery";
import ScrollToProductTop from "./ScrollToProductTop";
import VariableProductSelector, {
  type VariableProductVariation,
  type VariableProductVariationAttribute,
} from "./VariableProductSelector";
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

type WooStoreCategory = {
  id?: number;
  name?: string;
  slug?: string;
};

type WooStoreAttributeTerm = {
  name?: string;
  slug?: string;
};

type WooStoreProductAttribute = {
  name?: string;
  taxonomy?: string;
  has_variations?: boolean;
  terms?: WooStoreAttributeTerm[];
};

type WooStoreProductVariationSummary = {
  id?: number;
  attributes?: VariableProductVariationAttribute[];
};

type WooStoreProduct = {
  id: number;
  name: string;
  type?: string;
  parent?: number;
  has_options?: boolean;
  short_description?: string;
  description?: string;
  images?: WooStoreImage[];
  prices?: WooStorePrices;
  categories?: WooStoreCategory[];
  attributes?: WooStoreProductAttribute[];
  variations?: WooStoreProductVariationSummary[];
  is_in_stock?: boolean;
};

const RECOMMENDED_PRODUCTS_LIMIT = 6;
const RECOMMENDED_PRODUCTS_POOL_SIZE = 100;

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

async function getStoreProductVariations(productId: number): Promise<WooStoreProduct[]> {
  const endpoint = new URL("/wp-json/wc/store/v1/products", WOO_BASE_URL);
  endpoint.searchParams.set("type", "variation");
  endpoint.searchParams.set("parent", String(productId));
  endpoint.searchParams.set("per_page", "100");

  const response = await fetch(endpoint.toString(), {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`Variation request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as unknown;
  return Array.isArray(payload) ? (payload as WooStoreProduct[]) : [];
}

function getCategoryKeys(category: WooStoreCategory): string[] {
  const keys: string[] = [];

  if (typeof category.id === "number") keys.push(`id:${category.id}`);

  const slug = category.slug?.trim().toLowerCase();
  if (slug) keys.push(`slug:${slug}`);

  const name = category.name?.trim().toLowerCase();
  if (name) keys.push(`name:${name}`);

  return keys;
}

function getProductCategoryKeys(product: WooStoreProduct): Set<string> {
  return new Set((product.categories ?? []).flatMap(getCategoryKeys));
}

function countSharedCategories(product: WooStoreProduct, currentCategoryKeys: Set<string>): number {
  if (currentCategoryKeys.size === 0) return 0;

  return (product.categories ?? []).reduce((count, category) => {
    const hasSharedCategory = getCategoryKeys(category).some((key) => currentCategoryKeys.has(key));
    return hasSharedCategory ? count + 1 : count;
  }, 0);
}

function isRecommendedProductCandidate(currentProduct: WooStoreProduct, product: WooStoreProduct): boolean {
  return product.id !== currentProduct.id && product.type !== "variation" && product.is_in_stock !== false;
}

async function getRecommendedProducts(currentProduct: WooStoreProduct): Promise<WooStoreProduct[]> {
  const endpoint = new URL("/wp-json/wc/store/v1/products", WOO_BASE_URL);
  endpoint.searchParams.set("per_page", String(RECOMMENDED_PRODUCTS_POOL_SIZE));
  endpoint.searchParams.set("orderby", "date");
  endpoint.searchParams.set("order", "desc");

  const response = await fetch(endpoint.toString(), {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`Recommended products request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as unknown;
  if (!Array.isArray(payload)) return [];

  const currentCategoryKeys = getProductCategoryKeys(currentProduct);

  return (payload as WooStoreProduct[])
    .map((product, index) => ({
      product,
      index,
      sharedCategoryCount: countSharedCategories(product, currentCategoryKeys),
    }))
    .filter(({ product }) => isRecommendedProductCandidate(currentProduct, product))
    .sort((left, right) => {
      if (left.sharedCategoryCount !== right.sharedCategoryCount) {
        return right.sharedCategoryCount - left.sharedCategoryCount;
      }

      return left.index - right.index;
    })
    .slice(0, RECOMMENDED_PRODUCTS_LIMIT)
    .map(({ product }) => product);
}

function mergeVariationProducts(
  product: WooStoreProduct,
  variationProducts: WooStoreProduct[],
): VariableProductVariation[] {
  const attributesByVariationId = new Map<number, VariableProductVariationAttribute[]>();
  const orderByVariationId = new Map<number, number>();

  (product.variations ?? []).forEach((variation, index) => {
    if (typeof variation.id !== "number") return;
    attributesByVariationId.set(variation.id, variation.attributes ?? []);
    orderByVariationId.set(variation.id, index);
  });

  return variationProducts
    .filter((variationProduct) => typeof variationProduct.id === "number")
    .sort((left, right) => {
      const leftOrder = orderByVariationId.get(left.id) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = orderByVariationId.get(right.id) ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder;
    })
    .map((variationProduct) => ({
      id: variationProduct.id,
      name: variationProduct.name,
      images: variationProduct.images,
      prices: variationProduct.prices,
      is_in_stock: variationProduct.is_in_stock,
      attributes: attributesByVariationId.get(variationProduct.id) ?? [],
    }))
    .filter((variation) => variation.attributes.length > 0);
}

function renderRecommendedProductCard(product: WooStoreProduct) {
  const image = product.images?.find((candidate) => candidate.src) ?? product.images?.[0];
  const price = formatProductPrice(product.prices);
  const description = stripHtml(product.short_description);
  const hasVariableOptions = product.type === "variable" || product.has_options === true;

  return (
    <li key={product.id} className={styles.recommendationCard}>
      <Link className={styles.recommendationImageLink} href={`/shop/${product.id}`} scroll>
        {image?.src ? (
          <Image
            className={styles.recommendationImage}
            src={image.src}
            alt={image.alt || product.name}
            width={720}
            height={720}
            loading="eager"
          />
        ) : (
          <div className={`${styles.recommendationImage} ${styles.imagePlaceholder}`} />
        )}
      </Link>

      <div className={styles.recommendationBody}>
        <div className={styles.recommendationContent}>
          <h3 className={styles.recommendationProductTitle}>{product.name}</h3>
          <p className={styles.recommendationPrice}>{price}</p>
          {description ? <ExpandableDescription text={description} /> : null}
        </div>

        <div className={styles.recommendationActions}>
          {hasVariableOptions ? (
            <Link className={styles.recommendationOptionsLink} href={`/shop/${product.id}`} scroll>
              View Options
            </Link>
          ) : (
            <AddToCartButton
              className={styles.recommendationAddButton}
              item={{
                id: product.id,
                name: product.name,
                href: `/shop/${product.id}`,
                price,
                imageSrc: image?.src,
                imageAlt: image?.alt || product.name,
              }}
            />
          )}
          <Link className={styles.recommendationLink} href={`/shop/${product.id}`} scroll>
            View Product
          </Link>
        </div>
      </div>
    </li>
  );
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

  const isVariableProduct = product.type === "variable" || product.has_options === true;
  const [variationProducts, recommendedProducts] = await Promise.all([
    isVariableProduct ? getStoreProductVariations(product.id) : Promise.resolve<WooStoreProduct[]>([]),
    getRecommendedProducts(product).catch(() => []),
  ]);
  const variations = isVariableProduct ? mergeVariationProducts(product, variationProducts) : [];
  const image = product.images?.[0];
  const shortDescription = stripHtml(product.short_description);
  const longDescription = stripHtml(product.description);
  const description = longDescription || shortDescription;
  const price = formatProductPrice(product.prices);

  return (
    <div className="site-shell">
      <ScrollToProductTop productId={product.id} />
      <SiteHeader />
      <main className={styles.page}>
        <section className={styles.shell}>
          <div className={styles.backRow}>
            <Link href="/shop" className={styles.backLink}>
              Back to Shop
            </Link>
          </div>

          {isVariableProduct ? (
            <VariableProductSelector
              product={product}
              variations={variations}
              description={description}
              parentPriceLabel={price}
            />
          ) : (
            <article className={styles.card}>
              <div className={styles.imageWrap}>
                <ProductImageGallery
                  images={product.images}
                  fallbackAlt={product.name}
                  priority
                  resetKey={`product-${product.id}`}
                />
              </div>

              <div className={styles.meta}>
                <h1 className={styles.title}>{product.name}</h1>
                <p className={styles.price}>{price}</p>
                {description ? <ExpandableDescription text={description} variant="product" /> : null}

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
          )}

          {recommendedProducts.length > 0 ? (
            <section className={styles.recommendations} aria-labelledby="recommended-products-heading">
              <div className={styles.recommendationsHeader}>
                <h2 id="recommended-products-heading" className={styles.recommendationsTitle}>
                  Recommended Products
                </h2>
              </div>
              <EqualHeightCardGrid className={styles.recommendationsGrid}>
                {recommendedProducts.map((recommendedProduct) => renderRecommendedProductCard(recommendedProduct))}
              </EqualHeightCardGrid>
            </section>
          ) : null}
        </section>
      </main>
    </div>
  );
}
