export const WOO_BASE_URL = process.env.NEXT_PUBLIC_WOO_URL || "http://localhost:10003";

export function toWooUrl(path: string): string {
  const base = WOO_BASE_URL.endsWith("/") ? WOO_BASE_URL : `${WOO_BASE_URL}/`;
  return new URL(path, base).toString();
}
