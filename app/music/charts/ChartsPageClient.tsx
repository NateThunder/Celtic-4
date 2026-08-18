"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { FakeBundlePreview, FakeChordChart } from "./ChartPreviewMocks";
import {
  ALBUM_RESOURCE_PACKS,
  MORNINGTIDE_ALBUM,
  RESOURCE_FILTERS,
  SONG_RESOURCES,
  type AlbumResourcePack,
  type ResourceFilter,
  type ResourceProductLink,
  type ResourceType,
  type SongResource,
} from "./chartsData";
import {
  DEFAULT_SONG_RESOURCE,
  getAlbumProduct,
  getChartResourceHref,
  getSongProduct,
} from "./chartResources";
import styles from "./charts.module.css";

type Selection =
  | {
      kind: "song";
      id: string;
      resourceType: Exclude<ResourceType, "Full Pack">;
    }
  | {
      kind: "albumPack";
      id: string;
      resourceType: ResourceType;
    };

type SelectedPreview =
  | {
      kind: "song";
      song: SongResource;
      product: ResourceProductLink;
      resourceType: Exclude<ResourceType, "Full Pack">;
    }
  | {
      kind: "albumPack";
      album: AlbumResourcePack;
      product: ResourceProductLink;
      resourceType: ResourceType;
    };

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function hasSearchMatch(values: string[], searchTerm: string): boolean {
  const query = normalize(searchTerm);
  if (!query) return true;

  return values.some((value) => normalize(value).includes(query));
}

function songMatchesFilter(song: SongResource, activeFilter: ResourceFilter): boolean {
  return activeFilter === "All" || song.resourceTypes.includes(activeFilter as Exclude<ResourceType, "Full Pack">);
}

function albumMatchesFilter(album: AlbumResourcePack, activeFilter: ResourceFilter): boolean {
  return activeFilter === "All" || album.resourceTypes.includes(activeFilter as ResourceType);
}

function songMatchesSearch(song: SongResource, searchTerm: string): boolean {
  return hasSearchMatch(
    [
      song.songTitle,
      song.artist,
      song.album,
      song.year,
      song.albumDescription,
      ...song.keys,
      ...song.resourceTypes,
    ],
    searchTerm,
  );
}

function albumMatchesSearch(album: AlbumResourcePack, searchTerm: string): boolean {
  return hasSearchMatch(
    [
      album.title,
      album.artist,
      album.year,
      album.description,
      `${album.songCount} songs`,
      ...album.keys,
      ...album.resourceTypes,
      ...album.songTitles,
    ],
    searchTerm,
  );
}

function getInitialSelection(): Selection {
  return {
    kind: "song",
    id: SONG_RESOURCES[0].id,
    resourceType: DEFAULT_SONG_RESOURCE,
  };
}

function getPreview(selection: Selection): SelectedPreview {
  if (selection.kind === "song") {
    const song = SONG_RESOURCES.find((item) => item.id === selection.id) ?? SONG_RESOURCES[0];
    return {
      kind: "song",
      song,
      product: getSongProduct(song, selection.resourceType),
      resourceType: selection.resourceType,
    };
  }

  const album = ALBUM_RESOURCE_PACKS.find((item) => item.id === selection.id) ?? ALBUM_RESOURCE_PACKS[0];
  const product = getAlbumProduct(album, selection.resourceType) ?? getAlbumProduct(album, "Full Pack");

  return {
    kind: "albumPack",
    album,
    product: product as ResourceProductLink,
    resourceType: selection.resourceType,
  };
}

function Icon({ name }: { name: "download" | "document" | "team" | "secure" | "search" | "filter" | "cart" | "music" | "heart" | "help" }) {
  if (name === "download") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3v11m0 0 4-4m-4 4-4-4M5 18.5h14" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "document") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M7 3.5h7l3 3V20H7V3.5Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M14 3.5v4h4M9.5 11h5M9.5 14h5M9.5 17h3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "team") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M8.5 10.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Zm7 0a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4ZM3.8 19.5v-1.2c0-2.6 2.1-4.7 4.7-4.7s4.7 2.1 4.7 4.7v1.2M10.8 14.4a5.3 5.3 0 0 1 4.7-2.9c2.8 0 5 2.2 5 5v1" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "secure") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 3.2 5.5 5.6v5.5c0 4.1 2.6 7.7 6.5 9.2 3.9-1.5 6.5-5.1 6.5-9.2V5.6L12 3.2Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
        <path d="M9.5 12.1h5v4h-5v-4Zm1-1.6a1.5 1.5 0 0 1 3 0v1.6h-3v-1.6Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      </svg>
    );
  }

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

  if (name === "cart") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3.5 4h2l2.1 10.5c.1.5.5.8 1 .8h8.7c.5 0 .9-.3 1-.8l1.1-6.2H6.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 20h.1M17 20h.1" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
      </svg>
    );
  }

  if (name === "music") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M9 18.5a2.7 2.7 0 1 1-1.6-2.5V5.2l10-1.7v11.8a2.7 2.7 0 1 1-1.6-2.5V8.1L9 9.2v9.3Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
    );
  }

  if (name === "heart") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M12 20s-7.5-4.4-8.7-9.5C2.6 7.3 4.6 5 7.3 5c1.6 0 3 .8 4.7 2.8C13.7 5.8 15.1 5 16.7 5c2.7 0 4.7 2.3 4 5.5C19.5 15.6 12 20 12 20Z" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-5v.1M9.9 9.5A2.2 2.2 0 0 1 12 8c1.3 0 2.3.8 2.3 2 0 1.7-2.3 1.8-2.3 3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CategoryPills({
  activeFilter,
  onChange,
}: {
  activeFilter: ResourceFilter;
  onChange: (filter: ResourceFilter) => void;
}) {
  return (
    <div className={styles.categoryPills} role="list" aria-label="Filter resource type">
      {RESOURCE_FILTERS.map((filter) => (
        <button
          key={filter}
          className={`${styles.categoryPill}${activeFilter === filter ? ` ${styles.categoryPillActive}` : ""}`}
          type="button"
          onClick={() => onChange(filter)}
          aria-pressed={activeFilter === filter}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}

function SearchAndFilters({
  searchTerm,
  activeFilter,
  onSearchChange,
  onFilterChange,
}: {
  searchTerm: string;
  activeFilter: ResourceFilter;
  onSearchChange: (value: string) => void;
  onFilterChange: (filter: ResourceFilter) => void;
}) {
  return (
    <section className={styles.controls} aria-label="Search and filter music resources">
      <label className={styles.searchLabel} htmlFor="charts-search">
        Search resources
      </label>
      <div className={styles.searchInputWrap}>
        <span className={styles.searchIcon} aria-hidden="true">
          <Icon name="search" />
        </span>
        <input
          id="charts-search"
          className={styles.searchInput}
          type="search"
          value={searchTerm}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search songs..."
          autoComplete="off"
        />
      </div>
      <div className={styles.filterButton} aria-hidden="true">
        <Icon name="filter" />
        <span>Filters</span>
      </div>
      <CategoryPills activeFilter={activeFilter} onChange={onFilterChange} />
    </section>
  );
}

function ResourceRow({
  song,
  selection,
  onSelect,
}: {
  song: SongResource;
  selection: Selection;
  onSelect: (song: SongResource, resourceType: Exclude<ResourceType, "Full Pack">) => void;
}) {
  const activeResource =
    selection.kind === "song" && selection.id === song.id ? selection.resourceType : DEFAULT_SONG_RESOURCE;
  const product = getSongProduct(song, activeResource);

  return (
    <article className={styles.resourceRow}>
      <Image
        className={styles.rowArtwork}
        src={song.imageUrl}
        alt={`${song.album} album artwork`}
        width={112}
        height={112}
      />
      <div className={styles.rowMeta}>
        <h3>{song.songTitle}</h3>
        <p>{song.artist}</p>
        <span>Keys: {song.keys.join(", ")}</span>
      </div>
      <div className={styles.rowActions}>
        {song.resourceTypes.map((resourceType) => (
          <button
            key={resourceType}
            className={`${styles.resourceTypeButton}${
              selection.kind === "song" && selection.id === song.id && selection.resourceType === resourceType
                ? ` ${styles.resourceTypeButtonActive}`
                : ""
            }`}
            type="button"
            onClick={() => onSelect(song, resourceType)}
          >
            {resourceType}
          </button>
        ))}
      </div>
      <a className={styles.priceButton} href={product.addToCartUrl} aria-label={`Add ${product.label} to cart`}>
        {product.price}
      </a>
    </article>
  );
}

function AlbumPackRow({
  album,
  selection,
  onSelect,
}: {
  album: AlbumResourcePack;
  selection: Selection;
  onSelect: (album: AlbumResourcePack, resourceType: ResourceType) => void;
}) {
  const activeResource =
    selection.kind === "albumPack" && selection.id === album.id ? selection.resourceType : "Full Pack";
  const product = getAlbumProduct(album, activeResource) ?? getAlbumProduct(album, "Full Pack");

  return (
    <article className={styles.albumPackRow}>
      <Image
        className={styles.rowArtwork}
        src={album.imageUrl}
        alt={`${album.title} album artwork`}
        width={112}
        height={112}
      />
      <div className={styles.rowMeta}>
        <h3>{album.title}</h3>
        <p>{album.artist}</p>
        <span>
          {album.songCount} songs · Keys: {album.keys.join(", ")}
        </span>
      </div>
      <div className={styles.rowActions}>
        {album.resourceTypes.map((resourceType) => (
          <button
            key={resourceType}
            className={`${styles.resourceTypeButton}${
              selection.kind === "albumPack" && selection.id === album.id && selection.resourceType === resourceType
                ? ` ${styles.resourceTypeButtonActive}`
                : ""
            }`}
            type="button"
            onClick={() => onSelect(album, resourceType)}
          >
            {resourceType}
          </button>
        ))}
      </div>
      {product ? (
        <a className={styles.priceButton} href={product.addToCartUrl} aria-label={`Add ${product.label} to cart`}>
          {product.price}
        </a>
      ) : null}
    </article>
  );
}

function ResourceList({
  songs,
  albums,
  selection,
  onSelectSong,
  onSelectAlbum,
}: {
  songs: SongResource[];
  albums: AlbumResourcePack[];
  selection: Selection;
  onSelectSong: (song: SongResource, resourceType: Exclude<ResourceType, "Full Pack">) => void;
  onSelectAlbum: (album: AlbumResourcePack, resourceType: ResourceType) => void;
}) {
  const hasResults = songs.length > 0 || albums.length > 0;

  return (
    <section className={styles.listPanel} aria-label="Available music resources">
      <div className={styles.albumHeader}>
        <Image
          className={styles.albumHeaderImage}
          src={MORNINGTIDE_ALBUM.imageUrl}
          alt={`${MORNINGTIDE_ALBUM.title} album artwork`}
          width={112}
          height={112}
        />
        <div>
          <h2>
            {MORNINGTIDE_ALBUM.title} <span>({MORNINGTIDE_ALBUM.year})</span>
          </h2>
          <p>{MORNINGTIDE_ALBUM.description}</p>
        </div>
        <a href="/music" className={styles.albumHeaderLink}>
          View Album <span aria-hidden="true">-&gt;</span>
        </a>
      </div>

      {!hasResults ? (
        <p className={styles.emptyState}>No resources match that search.</p>
      ) : null}

      {songs.length > 0 ? (
        <div className={styles.resourceRows}>
          {songs.map((song) => (
            <ResourceRow key={song.id} song={song} selection={selection} onSelect={onSelectSong} />
          ))}
        </div>
      ) : null}

      {albums.length > 0 ? (
        <div className={styles.albumPackSection}>
          <div className={styles.albumPackHeader}>
            <h2>Album Resource Packs</h2>
            <p>Bundles for churches and teams.</p>
          </div>
          <div className={styles.resourceRows}>
            {albums.map((album) => (
              <AlbumPackRow key={album.id} album={album} selection={selection} onSelect={onSelectAlbum} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function FeaturedProductPreview({
  preview,
  selectedKey,
  onKeyChange,
  onResourceChange,
}: {
  preview: SelectedPreview;
  selectedKey: string;
  onKeyChange: (key: string) => void;
  onResourceChange: (resourceType: ResourceType) => void;
}) {
  const isSong = preview.kind === "song";
  const title = isSong ? preview.song.songTitle : preview.album.title;
  const subtitle = isSong ? `${preview.resourceType} PDF` : `${preview.resourceType} Bundle`;
  const artist = isSong ? preview.song.artist : preview.album.artist;
  const artwork = isSong ? preview.song.imageUrl : preview.album.imageUrl;
  const albumTitle = isSong ? preview.song.album : preview.album.title;
  const resourceOptions = isSong ? preview.song.resourceTypes : preview.album.resourceTypes;
  const keyOptions = isSong ? preview.song.keys : preview.album.keys;

  return (
    <aside className={styles.previewPanel} aria-label="Selected resource preview">
      <div className={styles.breadcrumb}>
        Home / Music / {albumTitle} / {isSong ? `${title} / ` : ""}{preview.resourceType}
      </div>
      <div className={styles.previewTop}>
        <Image className={styles.previewArtwork} src={artwork} alt={`${albumTitle} artwork`} width={260} height={260} />
        <div className={styles.previewMeta}>
          <p className={styles.previewLabel}>{albumTitle}</p>
          <h2>
            {title}
            <span>{subtitle}</span>
          </h2>
          <p>{artist}</p>

          <div className={styles.previewControls}>
            <label>
              Key
              <select value={selectedKey} onChange={(event) => onKeyChange(event.target.value)}>
                {keyOptions.map((key) => (
                  <option key={key} value={key}>
                    {key}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Resource
              <select value={preview.resourceType} onChange={(event) => onResourceChange(event.target.value as ResourceType)}>
                {resourceOptions.map((resourceType) => (
                  <option key={resourceType} value={resourceType}>
                    {resourceType}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Parts
              <select defaultValue="All Parts">
                <option>All Parts</option>
                <option>Worship Leader</option>
                <option>Band</option>
              </select>
            </label>
          </div>
        </div>
        <div className={styles.previewPurchase}>
          <strong>{preview.product.price}</strong>
          <a href={preview.product.addToCartUrl}>
            <Icon name="cart" />
            Add to Cart
          </a>
          <span>Secure Checkout</span>
          <span>Instant Download</span>
          <span>{preview.product.downloadType}</span>
        </div>
      </div>

      {isSong ? (
        <FakeChordChart title={preview.song.songTitle} selectedKey={selectedKey} />
      ) : (
        <FakeBundlePreview album={preview.album} />
      )}
    </aside>
  );
}

export function MobileResourceCard({ album }: { album: AlbumResourcePack }) {
  const fullPack = getAlbumProduct(album, "Full Pack");

  return (
    <article className={styles.mobileCard}>
      <Image className={styles.mobileCardImage} src={album.imageUrl} alt={`${album.title} album artwork`} width={320} height={320} />
      <div className={styles.mobileCardMeta}>
        <p>{album.year}</p>
        <h2>{album.title}</h2>
        <span>{album.artist}</span>
        <p className={styles.mobileCardCopy}>{album.description}</p>
        <p className={styles.mobileCardDetails}>
          {album.songCount} songs · Keys: {album.keys.join(", ")}
        </p>
        <div className={styles.mobileCardActions}>
          {album.resourceTypes.map((resourceType) => {
            const product = getAlbumProduct(album, resourceType);
            if (!product) return null;

            return (
              <a
                key={resourceType}
                className={`${styles.mobileCardButton}${resourceType === "Full Pack" ? ` ${styles.mobileCardButtonPrimary}` : ""}`}
                href={resourceType === "Full Pack" && fullPack ? fullPack.addToCartUrl : product.addToCartUrl}
              >
                {resourceType}
              </a>
            );
          })}
        </div>
      </div>
    </article>
  );
}

function CompactSongCard({ song }: { song: SongResource }) {
  return (
    <article className={styles.compactResourceCard}>
      <Link className={styles.compactResourceImageLink} href={getChartResourceHref(song.id, DEFAULT_SONG_RESOURCE)}>
        <Image
          className={styles.compactResourceImage}
          src={song.imageUrl}
          alt={`${song.album} album artwork`}
          width={160}
          height={160}
        />
      </Link>
      <div className={styles.compactResourceMeta}>
        <p>{song.album}</p>
        <h2>
          <Link href={getChartResourceHref(song.id, DEFAULT_SONG_RESOURCE)}>{song.songTitle}</Link>
        </h2>
        <span>{song.artist}</span>
        <p className={styles.compactResourceDetails}>Keys: {song.keys.join(", ")}</p>
        <div className={styles.compactResourceActions}>
          {song.resourceTypes.map((resourceType) => (
            <Link
              key={resourceType}
              className={styles.compactResourceButton}
              href={getChartResourceHref(song.id, resourceType)}
            >
              {resourceType}
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
}

function CompactAlbumPackCard({ album }: { album: AlbumResourcePack }) {
  return (
    <article className={styles.compactResourceCard}>
      <Link className={styles.compactResourceImageLink} href={getChartResourceHref(album.id, "Full Pack")}>
        <Image
          className={styles.compactResourceImage}
          src={album.imageUrl}
          alt={`${album.title} album artwork`}
          width={160}
          height={160}
        />
      </Link>
      <div className={styles.compactResourceMeta}>
        <p>{album.year}</p>
        <h2>
          <Link href={getChartResourceHref(album.id, "Full Pack")}>{album.title}</Link>
        </h2>
        <span>{album.artist}</span>
        <p className={styles.compactResourceDetails}>
          {album.songCount} songs Â· Keys: {album.keys.join(", ")}
        </p>
        <div className={styles.compactResourceActions}>
          {album.resourceTypes.map((resourceType) => (
            <Link
              key={resourceType}
              className={styles.compactResourceButton}
              href={getChartResourceHref(album.id, resourceType)}
            >
              {resourceType}
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
}

function CompactResourceBrowser({
  songs,
  albums,
}: {
  songs: SongResource[];
  albums: AlbumResourcePack[];
}) {
  const hasResults = songs.length > 0 || albums.length > 0;

  return (
    <section className={styles.compactBrowser} aria-label="Sheet music resources">
      <div className={styles.compactResultStrip} aria-label="Available sheet music resources">
        {!hasResults ? <p className={styles.emptyState}>No resources match that search.</p> : null}
        {songs.map((song) => (
          <CompactSongCard key={song.id} song={song} />
        ))}
        {albums.map((album) => (
          <CompactAlbumPackCard key={album.id} album={album} />
        ))}
      </div>

    </section>
  );
}

export default function ChartsPageClient() {
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<ResourceFilter>("All");
  const [selection, setSelection] = useState<Selection>(getInitialSelection);
  const [selectedKey, setSelectedKey] = useState(SONG_RESOURCES[0].keys[1] ?? SONG_RESOURCES[0].keys[0]);
  const contentGridRef = useRef<HTMLDivElement>(null);

  const filteredSongs = useMemo(
    () =>
      SONG_RESOURCES.filter(
        (song) => activeFilter !== "Full Pack" && songMatchesFilter(song, activeFilter) && songMatchesSearch(song, searchTerm),
      ),
    [activeFilter, searchTerm],
  );

  const filteredAlbums = useMemo(
    () =>
      ALBUM_RESOURCE_PACKS.filter(
        (album) => albumMatchesFilter(album, activeFilter) && albumMatchesSearch(album, searchTerm),
      ),
    [activeFilter, searchTerm],
  );

  const preview = getPreview(selection);
  const selectedKeyOptions = preview.kind === "song" ? preview.song.keys : preview.album.keys;
  const effectiveSelectedKey = selectedKeyOptions.includes(selectedKey)
    ? selectedKey
    : selectedKeyOptions[0] ?? "";

  const handleFilterChange = (nextFilter: ResourceFilter) => {
    setActiveFilter(nextFilter);

    if (nextFilter === "Full Pack") {
      setSelection({ kind: "albumPack", id: ALBUM_RESOURCE_PACKS[0].id, resourceType: "Full Pack" });
      return;
    }

    if (nextFilter !== "All") {
      const nextSong = SONG_RESOURCES.find((song) =>
        song.resourceTypes.includes(nextFilter as Exclude<ResourceType, "Full Pack">),
      );
      if (nextSong) {
        setSelection({
          kind: "song",
          id: nextSong.id,
          resourceType: nextFilter as Exclude<ResourceType, "Full Pack">,
        });
      }
    }
  };

  const handlePreviewResourceChange = (resourceType: ResourceType) => {
    if (selection.kind === "song") {
      if (resourceType === "Full Pack") return;
      setSelection({ ...selection, resourceType });
      return;
    }

    setSelection({ ...selection, resourceType });
  };

  const scrollDesktopPreviewIntoView = () => {
    if (typeof window === "undefined" || !contentGridRef.current) return;
    if (!window.matchMedia("(min-width: 901px)").matches) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const targetY = contentGridRef.current.getBoundingClientRect().top + window.scrollY - 28;

    window.requestAnimationFrame(() => {
      window.scrollTo({
        top: Math.max(0, targetY),
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    });
  };

  const handleSongSelect = (song: SongResource, resourceType: Exclude<ResourceType, "Full Pack">) => {
    setSelection({ kind: "song", id: song.id, resourceType });
    scrollDesktopPreviewIntoView();
  };

  const handleAlbumSelect = (album: AlbumResourcePack, resourceType: ResourceType) => {
    setSelection({ kind: "albumPack", id: album.id, resourceType });
    scrollDesktopPreviewIntoView();
  };

  return (
    <>
      <SearchAndFilters
        searchTerm={searchTerm}
        activeFilter={activeFilter}
        onSearchChange={setSearchTerm}
        onFilterChange={handleFilterChange}
      />

      <div className={styles.contentGrid} ref={contentGridRef}>
        <ResourceList
          songs={filteredSongs}
          albums={filteredAlbums}
          selection={selection}
          onSelectSong={handleSongSelect}
          onSelectAlbum={handleAlbumSelect}
        />
        <FeaturedProductPreview
          preview={preview}
          selectedKey={effectiveSelectedKey}
          onKeyChange={setSelectedKey}
          onResourceChange={handlePreviewResourceChange}
        />
      </div>

      <CompactResourceBrowser songs={filteredSongs} albums={filteredAlbums} />
    </>
  );
}
