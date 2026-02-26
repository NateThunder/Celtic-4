import Image from "next/image";
import Link from "next/link";
import { WOO_BASE_URL } from "../lib/woo";
import AddToCartButton from "../components/shop/AddToCartButton";
import EqualHeightCardGrid from "../components/shop/EqualHeightCardGrid";
import ExpandableDescription from "../components/shop/ExpandableDescription";
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

type WooStoreCategory = {
  id?: number;
  name?: string;
  slug?: string;
};

type WooStoreProduct = {
  id: number;
  name: string;
  type?: string;
  variation?: string;
  short_description?: string;
  images?: WooStoreImage[];
  prices?: WooStorePrices;
  categories?: WooStoreCategory[];
};

type ProductCardItem = {
  key: string;
  product: WooStoreProduct;
  priceLabel: string;
  cartItemId: number;
  cartItemName: string;
};

type ProductSection = {
  key: string;
  title: string;
  items: ProductCardItem[];
};

type CategoryFilter = {
  key: string;
  id?: number;
  slug: string;
  title: string;
};

const SECTION_ORDER_PRIORITY = ["vinyl", "cd"] as const;

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

function toTitleCaseFromSlug(slug: string): string {
  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1))
    .join(" ");
}

function normalizeCategorySlug(slug?: string): string {
  return slug?.trim().toLowerCase() ?? "";
}

function getCategoryTitle(category: WooStoreCategory): string {
  const name = category.name?.trim();
  if (name) return name;

  const slug = category.slug?.trim();
  if (slug) return toTitleCaseFromSlug(slug);

  return "Uncategorized";
}

function getCategoryKey(category: WooStoreCategory): string {
  if (typeof category.id === "number") return `category-${category.id}`;

  const slug = category.slug?.trim();
  if (slug) return `category-${slug.toLowerCase()}`;

  const normalizedName = category.name
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (normalizedName) return `category-${normalizedName}`;

  return "category-uncategorized";
}

function getSectionHeadingId(sectionKey: string): string {
  const slug = sectionKey
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug || "category"}-heading`;
}

function buildProductSections(products: WooStoreProduct[], storeCategories: WooStoreCategory[]): ProductSection[] {
  const sections: ProductSection[] = [];
  const sectionByKey = new Map<string, ProductSection>();
  const sectionKeyByCategoryId = new Map<number, string>();
  const sectionKeyByCategorySlug = new Map<string, string>();

  for (const category of storeCategories) {
    const sectionKey = getCategoryKey(category);
    if (sectionByKey.has(sectionKey)) continue;

    const section = {
      key: sectionKey,
      title: getCategoryTitle(category),
      items: [],
    };
    sections.push(section);
    sectionByKey.set(sectionKey, section);

    if (typeof category.id === "number") {
      sectionKeyByCategoryId.set(category.id, sectionKey);
    }

    const categorySlug = normalizeCategorySlug(category.slug);
    if (categorySlug) {
      sectionKeyByCategorySlug.set(categorySlug, sectionKey);
    }
  }

  for (const product of products) {
    const categories = product.categories ?? [];
    const seenCategoryKeys = new Set<string>();

    if (categories.length === 0) {
      const uncategorizedKey = "category-uncategorized";
      let uncategorizedSection = sectionByKey.get(uncategorizedKey);

      if (!uncategorizedSection) {
        uncategorizedSection = {
          key: uncategorizedKey,
          title: "Uncategorized",
          items: [],
        };
        sections.push(uncategorizedSection);
        sectionByKey.set(uncategorizedKey, uncategorizedSection);
      }

      uncategorizedSection.items.push(buildBaseCardItem(product, uncategorizedKey));
      continue;
    }

    for (const category of categories) {
      const normalizedCategorySlug = normalizeCategorySlug(category.slug);
      const sectionKey =
        (typeof category.id === "number" ? sectionKeyByCategoryId.get(category.id) : undefined) ||
        (normalizedCategorySlug ? sectionKeyByCategorySlug.get(normalizedCategorySlug) : undefined) ||
        getCategoryKey(category);
      if (seenCategoryKeys.has(sectionKey)) continue;
      seenCategoryKeys.add(sectionKey);

      let section = sectionByKey.get(sectionKey);
      if (!section) {
        section = {
          key: sectionKey,
          title: getCategoryTitle(category),
          items: [],
        };
        sections.push(section);
        sectionByKey.set(sectionKey, section);
      }

      section.items.push(buildBaseCardItem(product, sectionKey));
    }
  }

  return sections.filter((section) => section.items.length > 0);
}

function buildCategoryFilters(
  storeCategories: WooStoreCategory[],
  products: WooStoreProduct[],
): CategoryFilter[] {
  const sourceCategories =
    storeCategories.length > 0 ? storeCategories : products.flatMap((product) => product.categories ?? []);

  const seenSlugs = new Set<string>();
  const filters: CategoryFilter[] = [];

  for (const category of sourceCategories) {
    const slug = normalizeCategorySlug(category.slug);
    if (!slug || seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);

    filters.push({
      key: getCategoryKey(category),
      id: typeof category.id === "number" ? category.id : undefined,
      slug,
      title: getCategoryTitle(category),
    });
  }

  return filters;
}

function sortProductSections(sections: ProductSection[]): ProductSection[] {
  const rankByKeyword = new Map<string, number>();
  SECTION_ORDER_PRIORITY.forEach((keyword, index) => {
    rankByKeyword.set(keyword, index);
  });

  return sections
    .map((section, index) => {
      const normalizedTitle = section.title.trim().toLowerCase();
      const matchedKeyword = SECTION_ORDER_PRIORITY.find((keyword) =>
        normalizedTitle.includes(keyword),
      );
      const rank = matchedKeyword ? (rankByKeyword.get(matchedKeyword) ?? Number.MAX_SAFE_INTEGER) : Number.MAX_SAFE_INTEGER;
      return { section, index, rank };
    })
    .sort((left, right) => {
      if (left.rank !== right.rank) return left.rank - right.rank;
      return left.index - right.index;
    })
    .map(({ section }) => section);
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
        <div className={styles.cardContent}>
          <h2 className={styles.cardTitle}>{item.product.name}</h2>
          <p className={styles.cardPrice}>{item.priceLabel}</p>
          {description ? <ExpandableDescription text={description} /> : null}
        </div>
        <div className={styles.cardActions}>
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

async function getStoreCategories(): Promise<WooStoreCategory[]> {
  const endpoint = new URL("/wp-json/wc/store/v1/products/categories", WOO_BASE_URL);
  endpoint.searchParams.set("per_page", "100");

  const response = await fetch(endpoint.toString(), {
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    throw new Error(`Category request failed with ${response.status}.`);
  }

  const payload = (await response.json()) as unknown;
  return Array.isArray(payload) ? (payload as WooStoreCategory[]) : [];
}

type ShopPageProps = {
  searchParams?: Promise<ShopSearchParams>;
};

type ShopSearchParams = {
  category?: string | string[];
};

export default async function ShopPage({ searchParams }: ShopPageProps) {
  let products: WooStoreProduct[] = [];
  let storeCategories: WooStoreCategory[] = [];
  let loadError = "";

  const [productsResult, categoriesResult, resolvedSearchParams] = await Promise.all([
    getStoreProducts().catch(() => null),
    getStoreCategories().catch(() => null),
    searchParams ?? Promise.resolve<ShopSearchParams>({}),
  ]);

  if (!productsResult) {
    loadError = "Unable to load products right now. Please try again in a moment.";
  } else {
    products = productsResult;
  }

  if (categoriesResult) {
    storeCategories = categoriesResult;
  }

  const requestedCategory = resolvedSearchParams.category;
  const requestedCategorySlug = normalizeCategorySlug(
    Array.isArray(requestedCategory) ? requestedCategory[0] : requestedCategory,
  );
  const categoryFilters = buildCategoryFilters(storeCategories, products);
  const activeCategoryFilter =
    categoryFilters.find((filter) => filter.slug === requestedCategorySlug) ?? null;

  const filteredProducts = activeCategoryFilter
    ? products.filter((product) =>
        (product.categories ?? []).some((category) => {
          if (typeof activeCategoryFilter.id === "number" && category.id === activeCategoryFilter.id) {
            return true;
          }
          return normalizeCategorySlug(category.slug) === activeCategoryFilter.slug;
        }),
      )
    : products;

  const productSections = activeCategoryFilter
    ? filteredProducts.length > 0
      ? [
          {
            key: activeCategoryFilter.key,
            title: activeCategoryFilter.title,
            items: filteredProducts.map((product) => buildBaseCardItem(product, activeCategoryFilter.key)),
          },
        ]
      : []
    : sortProductSections(buildProductSections(filteredProducts, storeCategories));

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
            {categoryFilters.length > 0 ? (
              <div className={styles.filters} aria-label="Filter products by category">
                <Link
                  className={`${styles.filterLink}${activeCategoryFilter ? "" : ` ${styles.filterLinkActive}`}`}
                  href="/shop"
                >
                  All
                </Link>
                {categoryFilters.map((filter) => (
                  <Link
                    key={filter.key}
                    className={`${styles.filterLink}${
                      activeCategoryFilter?.slug === filter.slug ? ` ${styles.filterLinkActive}` : ""
                    }`}
                    href={`/shop?category=${encodeURIComponent(filter.slug)}`}
                  >
                    {filter.title}
                  </Link>
                ))}
              </div>
            ) : null}
          </header>

          {loadError ? <p className={styles.status}>{loadError}</p> : null}
          {!loadError && products.length === 0 ? (
            <p className={styles.status}>No products available at the moment.</p>
          ) : null}
          {!loadError && products.length > 0 && filteredProducts.length === 0 ? (
            <p className={styles.status}>
              No products found in {activeCategoryFilter ? `${activeCategoryFilter.title}.` : "this category."}
            </p>
          ) : null}

          {!loadError && filteredProducts.length > 0 ? (
            <div className={styles.sections}>
              {productSections.map((section) => {
                const headingId = getSectionHeadingId(section.key);
                return (
                  <section key={section.key} className={styles.productSection} aria-labelledby={headingId}>
                    <div className={styles.sectionHeader}>
                      <h2 id={headingId} className={styles.sectionTitle}>
                        {section.title}
                      </h2>
                      <p className={styles.sectionCount}>{section.items.length}</p>
                    </div>
                    <EqualHeightCardGrid className={styles.grid}>
                      {section.items.map((item) => renderProductCard(item))}
                    </EqualHeightCardGrid>
                  </section>
                );
              })}
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
