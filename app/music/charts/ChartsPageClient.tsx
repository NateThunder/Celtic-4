"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import AddToCartButton from "../../components/shop/AddToCartButton";
import type { ShopCartItemInput } from "../../components/shop/ShopCartContext";
import { ALBUM_RESOURCE_PACKS, type AlbumResourcePack } from "./chartsData";
import styles from "./charts.module.css";

export type SheetMusicPackageOption = {
  label: string;
  value: string;
  variationId: number;
  price: string;
  attribute: string;
};

export type SheetMusicProduct = {
  id: number;
  name: string;
  price: string;
  imageUrl: string;
  imageAlt: string;
  packageOptions: SheetMusicPackageOption[];
  productUrl: string;
};

type CatalogFilter = "All" | "Sheet Music" | "Album Resource Packs";
type Selection =
  | { kind: "product"; id: number }
  | { kind: "album"; id: string };

const FILTERS: CatalogFilter[] = ["All", "Sheet Music", "Album Resource Packs"];

function Icon({ name }: { name: "search" | "filter" | "cart" }) {
  if (name === "search") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="m20 20-4.4-4.4M10.8 18a7.2 7.2 0 1 1 0-14.4 7.2 7.2 0 0 1 0 14.4Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "filter") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M4 7h10M18 7h2M4 17h2M10 17h10M7 14v6M15 4v6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.5 4h2l2.1 10.5c.1.5.5.8 1 .8h8.7c.5 0 .9-.3 1-.8l1.1-6.2H6.5M9 20h.1M17 20h.1" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ProductImage({ product, className }: { product: SheetMusicProduct; className: string }) {
  if (!product.imageUrl) return <span className={className} aria-hidden="true" />;
  return <Image className={className} src={product.imageUrl} alt={product.imageAlt} width={320} height={320} />;
}

function getDefaultPackageOption(product: SheetMusicProduct) {
  return product.packageOptions.find((option) => option.label.trim().toLowerCase() === "standard")
    ?? product.packageOptions[0];
}

function getCartItem(product: SheetMusicProduct, option?: SheetMusicPackageOption): ShopCartItemInput {
  if (!option) {
    return {
      id: product.id,
      name: product.name,
      href: product.productUrl,
      price: product.price,
      imageSrc: product.imageUrl || undefined,
      imageAlt: product.imageAlt,
    };
  }

  return {
    id: option.variationId,
    name: `${product.name} - ${option.label}`,
    href: product.productUrl,
    price: option.price,
    imageSrc: product.imageUrl || undefined,
    imageAlt: product.imageAlt,
    variation: [{ attribute: option.attribute, value: option.value }],
  };
}

function SearchAndFilters({
  searchTerm,
  activeFilter,
  onSearchChange,
  onFilterChange,
}: {
  searchTerm: string;
  activeFilter: CatalogFilter;
  onSearchChange: (value: string) => void;
  onFilterChange: (filter: CatalogFilter) => void;
}) {
  return (
    <section className={styles.controls} aria-label="Search and filter music resources">
      <label className={styles.searchLabel} htmlFor="charts-search">Search resources</label>
      <div className={styles.searchInputWrap}>
        <span className={styles.searchIcon} aria-hidden="true"><Icon name="search" /></span>
        <input
          id="charts-search"
          className={styles.searchInput}
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search sheet music..."
          autoComplete="off"
        />
      </div>
      <div className={styles.filterButton} aria-hidden="true">
        <Icon name="filter" />
        <span>Filters</span>
      </div>
      <div className={styles.categoryPills} role="list" aria-label="Filter resource type">
        {FILTERS.map((filter) => (
          <button
            key={filter}
            className={`${styles.categoryPill}${activeFilter === filter ? ` ${styles.categoryPillActive}` : ""}`}
            type="button"
            onClick={() => onFilterChange(filter)}
            aria-pressed={activeFilter === filter}
          >
            {filter}
          </button>
        ))}
      </div>
    </section>
  );
}

function ProductRow({ product, active, onSelect }: { product: SheetMusicProduct; active: boolean; onSelect: () => void }) {
  return (
    <article className={styles.resourceRow}>
      <ProductImage product={product} className={styles.rowArtwork} />
      <div className={styles.rowMeta}>
        <h3>{product.name}</h3>
        <p>Celtic Worship</p>
        <span>Digital sheet music</span>
      </div>
      <div className={styles.rowActions}>
        <button className={`${styles.resourceTypeButton}${active ? ` ${styles.resourceTypeButtonActive}` : ""}`} type="button" onClick={onSelect}>
          {product.packageOptions.length > 1 ? "Standard / Complete" : "Sheet music"}
        </button>
      </div>
      <Link className={styles.priceButton} href={product.productUrl}>{product.price}</Link>
    </article>
  );
}

function AlbumRow({ album, active, onSelect }: { album: AlbumResourcePack; active: boolean; onSelect: () => void }) {
  return (
    <article className={styles.albumPackRow}>
      <Image className={styles.rowArtwork} src={album.imageUrl} alt={`${album.title} album artwork`} width={112} height={112} />
      <div className={styles.rowMeta}>
        <h3>{album.title}</h3>
        <p>{album.artist}</p>
        <span>Album Resource Pack</span>
      </div>
      <div className={styles.rowActions}>
        <button className={`${styles.resourceTypeButton}${active ? ` ${styles.resourceTypeButtonActive}` : ""}`} type="button" onClick={onSelect}>
          Coming soon
        </button>
      </div>
    </article>
  );
}

function ProductPreview({ product }: { product: SheetMusicProduct }) {
  const defaultOption = getDefaultPackageOption(product);
  const [selectedPackage, setSelectedPackage] = useState(defaultOption?.value ?? "");
  const selectedOption = product.packageOptions.find((option) => option.value === selectedPackage) ?? defaultOption;
  const price = selectedOption?.price ?? product.price;

  return (
    <aside className={styles.previewPanel} aria-label="Selected sheet music preview">
      <div className={styles.breadcrumb}>Home / Music / Sheet Music / {product.name}</div>
      <div className={styles.previewTop}>
        <ProductImage product={product} className={styles.previewArtwork} />
        <div className={styles.previewMeta}>
          <p className={styles.previewLabel}>Available now</p>
          <h2>{product.name}<span>Digital Sheet Music</span></h2>
          <p>Celtic Worship</p>
          {product.packageOptions.length > 1 ? (
            <div className={styles.previewControls}>
              <label>
                Package
                <select value={selectedOption?.value ?? ""} onChange={(event) => setSelectedPackage(event.target.value)}>
                  {product.packageOptions.map((option) => (
                    <option key={option.variationId} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </div>
        <div className={styles.previewPurchase}>
          <strong>{price}</strong>
          <AddToCartButton className={styles.previewAddButton} item={getCartItem(product, selectedOption)} />
          <span>Secure checkout</span>
          <span>Instant download</span>
        </div>
      </div>
    </aside>
  );
}

function AlbumPreview({ album }: { album: AlbumResourcePack }) {
  return (
    <aside className={styles.previewPanel} aria-label="Album Resource Pack preview">
      <div className={styles.breadcrumb}>Home / Music / Album Resource Packs / {album.title}</div>
      <div className={styles.previewTop}>
        <Image className={styles.previewArtwork} src={album.imageUrl} alt={`${album.title} album artwork`} width={260} height={260} />
        <div className={styles.previewMeta}>
          <p className={styles.previewLabel}>Coming soon</p>
          <h2>{album.title}<span>Album Resource Pack</span></h2>
          <p>{album.artist}</p>
        </div>
        <div className={styles.previewPurchase}>
          <strong>Coming soon</strong>
          <span>Complete album resources</span>
          <span>For churches and teams</span>
        </div>
      </div>
    </aside>
  );
}

function CompactProductCard({ product }: { product: SheetMusicProduct }) {
  const defaultOption = getDefaultPackageOption(product);
  const [selectedPackage, setSelectedPackage] = useState(defaultOption?.value ?? "");
  const selectedOption = product.packageOptions.find((option) => option.value === selectedPackage) ?? defaultOption;
  const price = selectedOption?.price ?? product.price;

  return (
    <article className={styles.compactResourceCard}>
      <Link className={styles.compactResourceImageLink} href={product.productUrl}>
        <ProductImage product={product} className={styles.compactResourceImage} />
      </Link>
      <div className={styles.compactResourceMeta}>
        <p>{price}</p>
        <h2><Link href={product.productUrl}>{product.name}</Link></h2>
        <span>Celtic Worship</span>
        <p className={styles.compactResourceDetails}>Digital sheet music</p>
        {product.packageOptions.length > 1 ? (
          <label className={styles.compactPackageSelect}>
            Package
            <select value={selectedOption?.value ?? ""} onChange={(event) => setSelectedPackage(event.target.value)}>
              {product.packageOptions.map((option) => (
                <option key={option.variationId} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        ) : null}
        <div className={styles.compactResourceActions}>
          <AddToCartButton className={styles.compactAddButton} item={getCartItem(product, selectedOption)} />
        </div>
      </div>
    </article>
  );
}

function CompactAlbumCard({ album }: { album: AlbumResourcePack }) {
  return (
    <article className={styles.compactResourceCard}>
      <Image className={styles.compactResourceImage} src={album.imageUrl} alt={`${album.title} album artwork`} width={160} height={160} />
      <div className={styles.compactResourceMeta}>
        <p>Coming soon</p>
        <h2>{album.title}</h2>
        <span>{album.artist}</span>
        <p className={styles.compactResourceDetails}>Album Resource Pack</p>
      </div>
    </article>
  );
}

export default function ChartsPageClient({ products, loadError }: { products: SheetMusicProduct[]; loadError: boolean }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<CatalogFilter>("All");
  const [selection, setSelection] = useState<Selection>(() =>
    products[0] ? { kind: "product", id: products[0].id } : { kind: "album", id: ALBUM_RESOURCE_PACKS[0].id },
  );

  const query = searchTerm.trim().toLowerCase();
  const filteredProducts = useMemo(
    () => activeFilter === "Album Resource Packs" ? [] : products.filter((product) => product.name.toLowerCase().includes(query)),
    [activeFilter, products, query],
  );
  const filteredAlbums = useMemo(
    () => activeFilter === "Sheet Music" ? [] : ALBUM_RESOURCE_PACKS.filter((album) => album.title.toLowerCase().includes(query)),
    [activeFilter, query],
  );

  const selectedProduct = selection.kind === "product" ? products.find((product) => product.id === selection.id) : undefined;
  const selectedAlbum = selection.kind === "album" ? ALBUM_RESOURCE_PACKS.find((album) => album.id === selection.id) : undefined;

  return (
    <>
      <SearchAndFilters searchTerm={searchTerm} activeFilter={activeFilter} onSearchChange={setSearchTerm} onFilterChange={setActiveFilter} />

      {loadError ? <p className={styles.emptyState}>The shop is unavailable right now. Please try again shortly.</p> : null}

      <div className={styles.contentGrid}>
        <section className={styles.listPanel} aria-label="Available music resources">
          <div className={styles.albumHeader}>
            {products[0] ? <ProductImage product={products[0]} className={styles.albumHeaderImage} /> : <span className={styles.albumHeaderImage} />}
            <div>
              <h2>Available Sheet Music <span>({products.length})</span></h2>
              <p>Products currently available from the Celtic Worship WooCommerce shop.</p>
            </div>
            <Link href="/shop" className={styles.albumHeaderLink}>View Shop <span aria-hidden="true">-&gt;</span></Link>
          </div>

          {filteredProducts.length === 0 && filteredAlbums.length === 0 ? <p className={styles.emptyState}>No resources match that search.</p> : null}
          {filteredProducts.length > 0 ? (
            <div className={styles.resourceRows}>
              {filteredProducts.map((product) => (
                <ProductRow key={product.id} product={product} active={selection.kind === "product" && selection.id === product.id} onSelect={() => setSelection({ kind: "product", id: product.id })} />
              ))}
            </div>
          ) : null}

          {filteredAlbums.length > 0 ? (
            <div className={styles.albumPackSection}>
              <div className={styles.albumPackHeader}>
                <h2>Album Resource Packs</h2>
                <p>Coming soon</p>
              </div>
              <div className={styles.resourceRows}>
                {filteredAlbums.map((album) => (
                  <AlbumRow key={album.id} album={album} active={selection.kind === "album" && selection.id === album.id} onSelect={() => setSelection({ kind: "album", id: album.id })} />
                ))}
              </div>
            </div>
          ) : null}
        </section>

        {selectedProduct ? <ProductPreview key={selectedProduct.id} product={selectedProduct} /> : null}
        {selectedAlbum ? <AlbumPreview album={selectedAlbum} /> : null}
      </div>

      <section className={styles.compactBrowser} aria-label="Sheet music resources">
        <div className={styles.compactResultStrip}>
          {filteredProducts.map((product) => <CompactProductCard key={product.id} product={product} />)}
          {filteredAlbums.map((album) => <CompactAlbumCard key={album.id} album={album} />)}
        </div>
      </section>
    </>
  );
}
