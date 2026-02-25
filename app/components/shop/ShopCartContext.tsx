"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "celtic-shop-cart-v1";

export type ShopCartItem = {
  id: number;
  name: string;
  price: string;
  href: string;
  imageSrc?: string;
  imageAlt?: string;
  quantity: number;
};

export type ShopCartItemInput = Omit<ShopCartItem, "quantity"> & {
  quantity?: number;
};

type ShopCartContextValue = {
  items: ShopCartItem[];
  itemCount: number;
  addItem: (item: ShopCartItemInput) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
};

const ShopCartContext = createContext<ShopCartContextValue | null>(null);

function isValidItemRecord(value: unknown): value is ShopCartItem {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<ShopCartItem>;
  return (
    Number.isFinite(candidate.id) &&
    typeof candidate.name === "string" &&
    typeof candidate.price === "string" &&
    typeof candidate.href === "string" &&
    Number.isFinite(candidate.quantity) &&
    Number(candidate.quantity) > 0
  );
}

function readStoredItems(): ShopCartItem[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(isValidItemRecord)
      .map((item) => ({
        ...item,
        quantity: Math.max(1, Math.round(item.quantity)),
      }));
  } catch {
    return [];
  }
}

export function ShopCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ShopCartItem[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Load persisted cart after hydration to avoid SSR/client mismatches.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(readStoredItems());
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore localStorage write errors in private mode/quota limits.
    }
  }, [isHydrated, items]);

  const addItem = useCallback((input: ShopCartItemInput) => {
    const qtyToAdd = Math.max(1, Math.round(input.quantity ?? 1));

    setItems((previous) => {
      const existing = previous.find((item) => item.id === input.id);
      if (!existing) {
        return [...previous, { ...input, quantity: qtyToAdd }];
      }

      return previous.map((item) =>
        item.id === input.id ? { ...item, quantity: item.quantity + qtyToAdd } : item,
      );
    });
  }, []);

  const removeItem = useCallback((productId: number) => {
    setItems((previous) => previous.filter((item) => item.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId: number, quantity: number) => {
    const nextQuantity = Math.max(0, Math.round(quantity));

    setItems((previous) =>
      previous
        .map((item) => (item.id === productId ? { ...item, quantity: nextQuantity } : item))
        .filter((item) => item.quantity > 0),
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const itemCount = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items],
  );

  const contextValue = useMemo<ShopCartContextValue>(
    () => ({
      items,
      itemCount,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    }),
    [addItem, clearCart, itemCount, items, removeItem, updateQuantity],
  );

  return <ShopCartContext.Provider value={contextValue}>{children}</ShopCartContext.Provider>;
}

export function useShopCart(): ShopCartContextValue {
  const context = useContext(ShopCartContext);
  if (!context) {
    throw new Error("useShopCart must be used within a ShopCartProvider.");
  }

  return context;
}
