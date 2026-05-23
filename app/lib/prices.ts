export function sanitizePriceInput(value: string) {
  const cleaned = value.replace(/[^\d.]/g, "");
  const [whole, ...fractionParts] = cleaned.split(".");
  return fractionParts.length ? `${whole}.${fractionParts.join("")}` : whole;
}

export function formatPriceLabel(value?: string) {
  const price = sanitizePriceInput(value || "");
  return price ? `£${price}` : "";
}

export function toPenceAmount(value?: string): number | null {
  const price = sanitizePriceInput(value || "");
  if (!price) return null;

  const [wholeRaw, fractionRaw = ""] = price.split(".");
  const whole = Number(wholeRaw || "0");
  if (!Number.isFinite(whole)) return null;

  const paddedFraction = `${fractionRaw}00`.slice(0, 2);
  const wholePence = whole * 100;
  const fractionPence = Number(paddedFraction || "0");
  if (!Number.isFinite(fractionPence)) return null;

  const roundedExtra = Number(fractionRaw.charAt(2) || "0") >= 5 ? 1 : 0;
  const amount = wholePence + fractionPence + roundedExtra;
  return Number.isSafeInteger(amount) && amount > 0 ? amount : null;
}

export const formatPoundPrice = formatPriceLabel;
