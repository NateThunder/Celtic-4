"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import styles from "./product.module.css";

export type ProductImageGalleryImage = {
  src: string;
  alt?: string;
};

type ProductImageGalleryProps = {
  images?: ProductImageGalleryImage[];
  fallbackAlt: string;
  priority?: boolean;
  resetKey?: string;
};

function getValidImages(images?: ProductImageGalleryImage[]): ProductImageGalleryImage[] {
  const validImages: ProductImageGalleryImage[] = [];
  const seenSources = new Set<string>();

  for (const image of images ?? []) {
    const src = image.src?.trim();
    if (!src || seenSources.has(src)) continue;
    seenSources.add(src);

    const alt = image.alt?.trim();
    validImages.push(alt ? { src, alt } : { src });
  }

  return validImages;
}

export default function ProductImageGallery({
  images,
  fallbackAlt,
  priority = false,
  resetKey,
}: ProductImageGalleryProps) {
  const validImages = useMemo(() => getValidImages(images), [images]);
  const imageSignature = validImages.map((image) => image.src).join("|");

  return (
    <ProductImageGalleryContent
      key={`${resetKey ?? "gallery"}:${imageSignature}`}
      validImages={validImages}
      fallbackAlt={fallbackAlt}
      priority={priority}
    />
  );
}

type ProductImageGalleryContentProps = {
  validImages: ProductImageGalleryImage[];
  fallbackAlt: string;
  priority: boolean;
};

function ProductImageGalleryContent({
  validImages,
  fallbackAlt,
  priority,
}: ProductImageGalleryContentProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const hasMultipleImages = validImages.length > 1;
  const activeImage = validImages[activeIndex] ?? validImages[0];

  function showPreviousImage() {
    setActiveIndex((currentIndex) =>
      validImages.length > 0
        ? (currentIndex - 1 + validImages.length) % validImages.length
        : 0,
    );
  }

  function showNextImage() {
    setActiveIndex((currentIndex) =>
      validImages.length > 0 ? (currentIndex + 1) % validImages.length : 0,
    );
  }

  if (!activeImage) {
    return <div className={`${styles.image} ${styles.imagePlaceholder}`} />;
  }

  return (
    <>
      <Image
        key={activeImage.src}
        className={styles.image}
        src={activeImage.src}
        alt={activeImage.alt || fallbackAlt}
        width={1080}
        height={1080}
        priority={priority}
      />

      <p className={styles.galleryStatus} aria-live="polite">
        Image {activeIndex + 1} of {validImages.length}
      </p>

      {hasMultipleImages ? (
        <div className={styles.galleryControls} role="group" aria-label="Product images">
          <button
            type="button"
            className={styles.galleryButton}
            onClick={showPreviousImage}
            aria-label="Show previous product image"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M15 5L8 12L15 19"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
          <button
            type="button"
            className={styles.galleryButton}
            onClick={showNextImage}
            aria-label="Show next product image"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
              <path
                d="M9 5L16 12L9 19"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      ) : null}
    </>
  );
}
