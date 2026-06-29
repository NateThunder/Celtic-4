"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import AddToCartButton from "../../components/shop/AddToCartButton";
import ProductImageGallery from "./ProductImageGallery";
import styles from "./product.module.css";

export type VariableProductImage = {
  src: string;
  alt?: string;
};

export type VariableProductPrices = {
  price?: string;
  currency_code?: string;
  currency_symbol?: string;
  currency_minor_unit?: number;
};

export type VariableProductTerm = {
  name?: string;
  slug?: string;
};

export type VariableProductAttribute = {
  name?: string;
  taxonomy?: string;
  has_variations?: boolean;
  terms?: VariableProductTerm[];
};

export type VariableProductVariationAttribute = {
  name?: string;
  value?: string;
};

export type VariableProduct = {
  id: number;
  name: string;
  images?: VariableProductImage[];
  prices?: VariableProductPrices;
  attributes?: VariableProductAttribute[];
};

export type VariableProductVariation = {
  id: number;
  name: string;
  images?: VariableProductImage[];
  prices?: VariableProductPrices;
  is_in_stock?: boolean;
  attributes: VariableProductVariationAttribute[];
};

type VariableProductSelectorProps = {
  product: VariableProduct;
  variations: VariableProductVariation[];
  description?: string;
  parentPriceLabel: string;
};

type SelectedOptions = Record<string, string>;

const SWATCH_COLORS: Record<string, string> = {
  black: "#111111",
  cream: "#e8dec8",
  white: "#ffffff",
};

function stripAttributePrefix(value: string): string {
  return value.trim().toLowerCase().replace(/^attribute_/, "").replace(/^pa_/, "");
}

function normalizeAttributeName(value?: string): string {
  if (!value) return "";
  return stripAttributePrefix(value).replace(/[\s_-]+/g, "");
}

function normalizeOptionValue(value?: string): string {
  if (!value) return "";
  return value.trim().toLowerCase().replace(/\s+/g, "-");
}

function toDisplayLabel(value?: string): string {
  if (!value) return "";
  return value
    .trim()
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function getAttributeKey(attribute: VariableProductAttribute): string {
  return attribute.taxonomy?.trim() || attribute.name?.trim() || "";
}

function getAttributeLabel(attribute: VariableProductAttribute): string {
  return attribute.name?.trim() || toDisplayLabel(attribute.taxonomy);
}

function isColourAttribute(attribute: VariableProductAttribute): boolean {
  const label = `${attribute.name ?? ""} ${attribute.taxonomy ?? ""}`.toLowerCase();
  return label.includes("colour") || label.includes("color");
}

function getOptionValue(term: VariableProductTerm): string {
  return normalizeOptionValue(term.slug || term.name);
}

function getOptionLabel(term: VariableProductTerm): string {
  return term.name?.trim() || toDisplayLabel(term.slug);
}

function getVariationValue(
  variation: VariableProductVariation,
  attribute: VariableProductAttribute,
): string {
  const targetNames = [attribute.name, attribute.taxonomy].map(normalizeAttributeName).filter(Boolean);
  const match = variation.attributes.find((variationAttribute) => {
    const variationName = normalizeAttributeName(variationAttribute.name);
    return targetNames.includes(variationName);
  });

  return normalizeOptionValue(match?.value);
}

function variationMatchesSelection(
  variation: VariableProductVariation,
  attributes: VariableProductAttribute[],
  selectedOptions: SelectedOptions,
): boolean {
  return attributes.every((attribute) => {
    const key = getAttributeKey(attribute);
    const selectedValue = selectedOptions[key];
    return !selectedValue || getVariationValue(variation, attribute) === selectedValue;
  });
}

function isVariationInStock(variation: VariableProductVariation): boolean {
  return variation.is_in_stock !== false;
}

function formatProductPrice(prices?: VariableProductPrices): string {
  if (!prices?.price) return "Price unavailable";

  const minorUnit = Number(prices.currency_minor_unit ?? 2);
  const numericValue = Number(prices.price) / 10 ** minorUnit;
  if (!Number.isFinite(numericValue)) return "Price unavailable";

  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: prices.currency_code || "GBP",
    }).format(numericValue);
  } catch {
    const symbol = prices.currency_symbol || "";
    return `${symbol}${numericValue.toFixed(minorUnit)}`;
  }
}

function getSwatchColor(term: VariableProductTerm): string {
  const value = getOptionValue(term);
  return SWATCH_COLORS[value] || value || "#d9d9d9";
}

function collectGalleryImages(images?: VariableProductImage[]): VariableProductImage[] {
  const galleryImages: VariableProductImage[] = [];
  const seenSources = new Set<string>();

  for (const image of images ?? []) {
    const src = image.src?.trim();
    if (!src || seenSources.has(src)) continue;
    seenSources.add(src);

    const alt = image.alt?.trim();
    galleryImages.push(alt ? { src, alt } : { src });
  }

  return galleryImages;
}

function collectVariationImagesByAttribute(
  variations: VariableProductVariation[],
  attribute: VariableProductAttribute | undefined,
  selectedValue: string,
): VariableProductImage[] {
  if (!attribute || !selectedValue) return [];

  const galleryImages: VariableProductImage[] = [];
  const seenSources = new Set<string>();

  for (const variation of variations) {
    if (!isVariationInStock(variation)) continue;
    if (getVariationValue(variation, attribute) !== selectedValue) continue;

    for (const image of collectGalleryImages(variation.images)) {
      if (seenSources.has(image.src)) continue;
      seenSources.add(image.src);
      galleryImages.push(image);
    }
  }

  return galleryImages;
}

function imageMatchesOptionValue(image: VariableProductImage, selectedValue: string): boolean {
  const tokens = normalizeOptionValue(selectedValue).split("-").filter(Boolean);
  if (tokens.length === 0) return false;

  const sourceText = `${image.src} ${image.alt ?? ""}`;
  const normalizedSource = sourceText
    .toLowerCase()
    .replace(/%20/g, "-")
    .replace(/[^a-z0-9]+/g, "-");

  return tokens.every((token) => normalizedSource.includes(token));
}

function collectProductImagesByOptionValue(
  images: VariableProductImage[] | undefined,
  selectedValue: string,
): VariableProductImage[] {
  return collectGalleryImages(images).filter((image) => imageMatchesOptionValue(image, selectedValue));
}

export default function VariableProductSelector({
  product,
  variations,
  description,
  parentPriceLabel,
}: VariableProductSelectorProps) {
  const variableAttributes = useMemo(
    () =>
      (product.attributes ?? []).filter(
        (attribute) =>
          attribute.has_variations &&
          getAttributeKey(attribute) &&
          Array.isArray(attribute.terms) &&
          attribute.terms.some((term) => getOptionValue(term)),
      ),
    [product.attributes],
  );
  const colourAttribute = useMemo(
    () => variableAttributes.find(isColourAttribute),
    [variableAttributes],
  );
  const [selectedOptions, setSelectedOptions] = useState<SelectedOptions>({});

  const exactSelectedVariation = useMemo(() => {
    const hasAllOptions = variableAttributes.every((attribute) => selectedOptions[getAttributeKey(attribute)]);
    if (!hasAllOptions) return undefined;
    return variations.find((variation) =>
      variableAttributes.every(
        (attribute) =>
          getVariationValue(variation, attribute) === selectedOptions[getAttributeKey(attribute)],
      ),
    );
  }, [selectedOptions, variableAttributes, variations]);

  const selectedVariation = exactSelectedVariation && isVariationInStock(exactSelectedVariation)
    ? exactSelectedVariation
    : undefined;

  const selectedColourValue = colourAttribute
    ? selectedOptions[getAttributeKey(colourAttribute)]
    : "";
  const selectedVariationImages = collectGalleryImages(selectedVariation?.images);
  const colourVariationImages = collectVariationImagesByAttribute(
    variations,
    colourAttribute,
    selectedColourValue,
  );
  const productImages = collectGalleryImages(product.images);
  const productColourImages = collectProductImagesByOptionValue(product.images, selectedColourValue);
  const galleryImages = selectedVariationImages.length > 1
    ? selectedVariationImages
    : colourVariationImages.length > 1
      ? colourVariationImages
      : productColourImages.length > 0
        ? productColourImages
        : colourVariationImages.length > 0
          ? colourVariationImages
          : selectedVariationImages.length > 0
            ? selectedVariationImages
            : productImages;
  const image =
    selectedVariationImages[0] || colourVariationImages[0] || productColourImages[0] || productImages[0];
  const priceLabel = selectedVariation ? formatProductPrice(selectedVariation.prices) : parentPriceLabel;
  const galleryResetKey = colourAttribute
    ? `${getAttributeKey(colourAttribute)}:${selectedColourValue}`
    : "product-gallery";
  const selectedOptionLabels = variableAttributes
    .map((attribute) => {
      const selectedValue = selectedOptions[getAttributeKey(attribute)];
      const term = attribute.terms?.find((candidate) => getOptionValue(candidate) === selectedValue);
      return getOptionLabel(term ?? { slug: selectedValue });
    })
    .filter(Boolean);

  function isSelectionPossible(candidateSelection: SelectedOptions): boolean {
    return variations.some(
      (variation) =>
        isVariationInStock(variation) &&
        variationMatchesSelection(variation, variableAttributes, candidateSelection),
    );
  }

  function isOptionAvailable(attribute: VariableProductAttribute, value: string): boolean {
    return isSelectionPossible({
      ...selectedOptions,
      [getAttributeKey(attribute)]: value,
    });
  }

  function handleSelect(attribute: VariableProductAttribute, value: string) {
    const changedKey = getAttributeKey(attribute);

    setSelectedOptions((previousOptions) => {
      const nextOptions: SelectedOptions = {
        ...previousOptions,
        [changedKey]: value,
      };

      for (const otherAttribute of variableAttributes) {
        const otherKey = getAttributeKey(otherAttribute);
        if (otherKey === changedKey || !nextOptions[otherKey]) continue;

        if (!isSelectionPossible(nextOptions)) {
          delete nextOptions[otherKey];
        }
      }

      return nextOptions;
    });
  }

  const cartItem = selectedVariation
    ? {
        id: selectedVariation.id,
        name: selectedOptionLabels.length > 0
          ? `${product.name} - ${selectedOptionLabels.join(", ")}`
          : product.name,
        href: `/shop/${product.id}`,
        price: priceLabel,
        imageSrc: image?.src,
        imageAlt: image?.alt || product.name,
        variation: variableAttributes.map((attribute) => ({
          attribute: attribute.taxonomy || attribute.name || getAttributeKey(attribute),
          value: selectedOptions[getAttributeKey(attribute)],
        })),
      }
    : undefined;

  const disabledLabel = exactSelectedVariation && !selectedVariation ? "Out of Stock" : "Select Options";

  return (
    <article className={styles.card}>
      <div className={styles.imageWrap}>
        <ProductImageGallery
          images={galleryImages}
          fallbackAlt={product.name}
          priority
          resetKey={galleryResetKey}
        />
      </div>

      <div className={styles.meta}>
        <h1 className={styles.title}>{product.name}</h1>
        <p className={styles.price}>{priceLabel}</p>
        {description ? <p className={styles.description}>{description}</p> : null}

        <div className={styles.optionGroups}>
          {variableAttributes.map((attribute) => {
            const key = getAttributeKey(attribute);
            const isColour = isColourAttribute(attribute);

            return (
              <fieldset key={key} className={styles.optionGroup}>
                <legend className={styles.optionLabel}>{getAttributeLabel(attribute)}</legend>
                <div className={styles.optionChoices}>
                  {(attribute.terms ?? []).map((term) => {
                    const value = getOptionValue(term);
                    if (!value) return null;

                    const label = getOptionLabel(term);
                    const selected = selectedOptions[key] === value;
                    const available = isOptionAvailable(attribute, value);

                    return (
                      <button
                        key={value}
                        type="button"
                        className={`${styles.optionButton}${selected ? ` ${styles.optionButtonSelected}` : ""}`}
                        onClick={() => {
                          handleSelect(attribute, value);
                        }}
                        disabled={!available}
                        aria-pressed={selected}
                        aria-label={available ? label : `${label} unavailable`}
                      >
                        {isColour ? (
                          <span
                            className={styles.optionSwatch}
                            style={{ backgroundColor: getSwatchColor(term) }}
                            aria-hidden="true"
                          />
                        ) : null}
                        <span>{label}</span>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}
        </div>

        <div className={styles.actions}>
          <AddToCartButton
            className={styles.actionAdd}
            item={cartItem}
            disabled={!selectedVariation}
            disabledLabel={disabledLabel}
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
  );
}
