export function sanitizePriceInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [whole, ...fractionParts] = cleaned.split(".");
  return fractionParts.length ? `${whole}.${fractionParts.join("")}` : whole;
}

export function formatPriceLabel(value?: string) {
  const price = sanitizePriceInput(value || "");
  return price ? `£${price}` : "";
}

export const formatPoundPrice = formatPriceLabel;
