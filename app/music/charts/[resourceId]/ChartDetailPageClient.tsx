"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { FakeBundlePreview, FakeChordChart } from "../ChartPreviewMocks";
import type { ResourceType } from "../chartsData";
import {
  getAlbumProduct,
  getChartResourceDetail,
  getSongProduct,
  type ChartResourceDetail,
} from "../chartResources";
import styles from "../charts.module.css";

type ChartDetailPageClientProps = {
  resourceId: string;
  initialResourceType?: ResourceType;
};

function Icon({ name }: { name: "cart" | "arrow" }) {
  if (name === "cart") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M3.5 4h2l2.1 10.5c.1.5.5.8 1 .8h8.7c.5 0 .9-.3 1-.8l1.1-6.2H6.5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path d="M9 20h.1M17 20h.1" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 6 9 12l6 6" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
    </svg>
  );
}

function getUpdatedDetail(detail: ChartResourceDetail, resourceType: ResourceType): ChartResourceDetail {
  if (detail.kind === "song") {
    if (resourceType === "Full Pack" || !detail.song.resourceTypes.includes(resourceType)) return detail;

    return {
      ...detail,
      resourceType,
      product: getSongProduct(detail.song, resourceType),
    };
  }

  const product = getAlbumProduct(detail.album, resourceType);
  if (!product) return detail;

  return {
    ...detail,
    resourceType,
    product,
  };
}

export default function ChartDetailPageClient({ resourceId, initialResourceType }: ChartDetailPageClientProps) {
  const initialDetail = useMemo(
    () => getChartResourceDetail(resourceId, initialResourceType),
    [resourceId, initialResourceType],
  );
  const [detail, setDetail] = useState(initialDetail);
  const [selectedKey, setSelectedKey] = useState(() => {
    if (!initialDetail) return "";

    const keys = initialDetail.kind === "song" ? initialDetail.song.keys : initialDetail.album.keys;
    return keys[1] ?? keys[0] ?? "";
  });

  if (!detail) {
    return null;
  }

  const isSong = detail.kind === "song";
  const title = isSong ? detail.song.songTitle : detail.album.title;
  const albumTitle = isSong ? detail.song.album : detail.album.title;
  const subtitle = isSong ? `${detail.resourceType} PDF` : `${detail.resourceType} Bundle`;
  const artist = isSong ? detail.song.artist : detail.album.artist;
  const artwork = isSong ? detail.song.imageUrl : detail.album.imageUrl;
  const keyOptions = isSong ? detail.song.keys : detail.album.keys;
  const resourceOptions = isSong ? detail.song.resourceTypes : detail.album.resourceTypes;

  const effectiveSelectedKey = keyOptions.includes(selectedKey) ? selectedKey : keyOptions[0] ?? "";

  return (
    <section className={styles.detailShell} aria-label={`${title} chart details`}>
      <Link className={styles.detailBackLink} href="/music/charts">
        <Icon name="arrow" />
        All Charts
      </Link>

      <article className={styles.detailPanel}>
        <div className={styles.detailTop}>
          <Image className={styles.detailArtwork} src={artwork} alt={`${albumTitle} artwork`} width={360} height={360} />

          <div className={styles.detailCopy}>
            <p className={styles.detailBreadcrumb}>Celtic Worship / {albumTitle}</p>
            <h1>
              {title}
              <span>{subtitle}</span>
            </h1>
            <p className={styles.detailArtist}>{artist}</p>

            <div className={styles.detailControls}>
              <label>
                Key
                <select value={effectiveSelectedKey} onChange={(event) => setSelectedKey(event.target.value)}>
                  {keyOptions.map((key) => (
                    <option key={key} value={key}>
                      {key}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Resource
                <select
                  value={detail.resourceType}
                  onChange={(event) => setDetail(getUpdatedDetail(detail, event.target.value as ResourceType))}
                >
                  {resourceOptions.map((resourceType) => (
                    <option key={resourceType} value={resourceType}>
                      {resourceType}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <div className={styles.detailPurchase}>
            <strong>{detail.product.price}</strong>
            <a href={detail.product.addToCartUrl}>
              <Icon name="cart" />
              Add to Cart
            </a>
            <span>Secure Checkout</span>
            <span>Instant Download</span>
            <span>{detail.product.downloadType}</span>
          </div>
        </div>

        {isSong ? (
          <FakeChordChart title={detail.song.songTitle} selectedKey={effectiveSelectedKey} />
        ) : (
          <FakeBundlePreview album={detail.album} />
        )}
      </article>
    </section>
  );
}
