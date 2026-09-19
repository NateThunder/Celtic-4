"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { addLocalItem, parseStoredCart, cartSubtotal } from "../../lib/browserCart";
import { COMMERCE_DISABLED } from "../../lib/shopConfig";

export type ShopCartItem = {
  key: string;
  id: number;
  name: string;
  price: string;
  href: string;
  imageSrc?: string;
  imageAlt?: string;
  quantity: number;
  unitAmount?: number;
  currency?: string;
  variation?: ShopCartVariationInput[];
  variationLabel?: string;
};

export type ShopCartVariationInput = {
  attribute: string;
  value: string;
};

export type ShopCartItemInput = Omit<ShopCartItem, "key" | "quantity"> & {
  quantity?: number;
  variation?: ShopCartVariationInput[];
  permalink?: string;
};

export type ShopCartTotals = {
  subtotalLabel: string;
  shippingLabel: string;
  feesLabel: string;
  discountLabel: string;
  taxLabel: string;
  totalLabel: string;
  hasShipping: boolean;
  hasFees: boolean;
  hasDiscount: boolean;
  hasTax: boolean;
};

type ShopCartContextValue = {
  items: ShopCartItem[];
  itemCount: number;
  totalLabel: string;
  totals: ShopCartTotals;
  isLoading: boolean;
  error: string;
  refreshCart: () => Promise<void>;
  addItem: (item: ShopCartItemInput) => Promise<void>;
  removeItem: (itemKey: string) => Promise<void>;
  updateQuantity: (itemKey: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
};

const ShopCartContext = createContext<ShopCartContextValue | null>(null);

const STORAGE_KEY = "cw-shop-cart-v1";
const emptyTotals: ShopCartTotals = { subtotalLabel: "\u00a30.00", shippingLabel: "", feesLabel: "", discountLabel: "", taxLabel: "", totalLabel: "\u00a30.00", hasShipping: false, hasFees: false, hasDiscount: false, hasTax: false };

export function ShopCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ShopCartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const refreshCart = useCallback(async () => {
    try {
      setItems(parseStoredCart(localStorage.getItem(STORAGE_KEY)));
    } catch { setError("Your browser cannot save the cart. Please enable site storage."); }
    finally { setIsLoading(false); }
  }, []);
  useEffect(() => {
    void refreshCart();
    const sync = (event: StorageEvent) => { if (event.key === STORAGE_KEY || event.key === null) void refreshCart(); };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, [refreshCart]);
  const change = useCallback((update: (current: ShopCartItem[]) => ShopCartItem[]) => {
    try {
      const next = update(parseStoredCart(localStorage.getItem(STORAGE_KEY)));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setItems(next);
      setError("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save your cart.";
      setError(message);
      throw new Error(message);
    }
  }, []);
  const addItem = useCallback(async (input: ShopCartItemInput) => {
    if (COMMERCE_DISABLED) throw new Error("Purchasing is currently unavailable.");
    change(current => addLocalItem(current, input));
  }, [change]);
  const removeItem = useCallback(async (key: string) => {
    try { change(current => current.filter(item => item.key !== key)); } catch { /* Shown in cart. */ }
  }, [change]);
  const updateQuantity = useCallback(async (key: string, quantity: number) => {
    try { change(current => current.flatMap(item => item.key !== key ? [item] : quantity <= 0 ? [] : [{ ...item, quantity: Math.min(99, Math.max(1, Math.round(quantity))) }])); } catch { /* Shown in cart. */ }
  }, [change]);
  const clearCart = useCallback(async () => {
    try { change(() => []); } catch { /* Shown in cart. */ }
  }, [change]);
  const totalLabel = cartSubtotal(items);
  const totals = { ...emptyTotals, subtotalLabel: totalLabel, totalLabel };
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
  return <ShopCartContext.Provider value={{ items, itemCount, totalLabel, totals, isLoading, error, refreshCart, addItem, removeItem, updateQuantity, clearCart }}>{children}</ShopCartContext.Provider>;
}

export function useShopCart() {
  const context = useContext(ShopCartContext);
  if (!context) throw new Error("useShopCart must be used within a ShopCartProvider.");
  return context;
}
