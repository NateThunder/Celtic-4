import type { ShopCartItem, ShopCartItemInput } from "../components/shop/ShopCartContext";
export function parseStoredCart(raw: string | null): ShopCartItem[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length > 100) return [];
    return parsed.filter((item): item is ShopCartItem => !!item &&
      Number.isSafeInteger(item.id) && item.id > 0 &&
      Number.isInteger(item.quantity) && item.quantity > 0 && item.quantity <= 99 &&
      typeof item.key === "string" && typeof item.name === "string" &&
      typeof item.price === "string" && typeof item.href === "string" &&
      /^\/shop\/\d+$/.test(item.href) &&
      (item.variation === undefined || (Array.isArray(item.variation) && item.variation.every(
        (option: { attribute?: unknown; value?: unknown }) => option && typeof option.attribute === "string" && typeof option.value === "string"))));
  } catch { return []; }
}
export function addLocalItem(current: ShopCartItem[], input: ShopCartItemInput): ShopCartItem[] {
  if (!Number.isSafeInteger(input.id) || input.id <= 0) throw new Error("Please select a valid product.");
  const variation = [...(input.variation || [])].sort((a, b) => a.attribute.localeCompare(b.attribute));
  const key = JSON.stringify([input.id, variation]);
  const existing = current.find(item => item.key === key);
  const quantity = (existing?.quantity || 0) + (input.quantity ?? 1);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 99) throw new Error("Choose between 1 and 99 of each item.");
  if (!existing && current.length >= 100) throw new Error("Your cart can contain up to 100 different items.");
  const next = { ...input, key, quantity, variation };
  return existing ? current.map(item => item.key === key ? next : item) : [...current, next];
}
export function cartSubtotal(items: ShopCartItem[]): string {
  const currency = items[0]?.currency || "GBP";
  if (items.some(item => !Number.isFinite(item.unitAmount) || item.unitAmount! < 0 || item.currency !== currency)) return "Confirmed at checkout";
  try { return new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(items.reduce((sum, item) => sum + item.unitAmount! * item.quantity, 0)); }
  catch { return "Confirmed at checkout"; }
}
// Display prices are never sent to WooCommerce.
export function handoffItems(items: ShopCartItem[]) {
  return items.map(({ id, quantity, variation }) => ({ id, quantity, variation: variation || [] }));
}
