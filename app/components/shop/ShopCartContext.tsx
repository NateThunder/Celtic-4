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

type WooCurrencyInfo = {
  currency_code?: string;
  currency_symbol?: string;
  currency_minor_unit?: number;
  currency_prefix?: string;
  currency_suffix?: string;
};

type WooCartItemTotals = WooCurrencyInfo & {
  line_total?: string;
};

type WooCartItemImage = {
  src?: string;
  alt?: string;
  thumbnail?: string;
};

type WooCartItemPayload = {
  key?: string;
  id?: number;
  name?: string;
  quantity?: number;
  permalink?: string;
  images?: WooCartItemImage[];
  prices?: WooCurrencyInfo & {
    price?: string;
  };
  totals?: WooCartItemTotals;
};

type WooCartTotalsPayload = WooCurrencyInfo & {
  total_items?: string;
  total_fees?: string;
  total_discount?: string;
  total_shipping?: string;
  total_tax?: string;
  total_price?: string;
};

type WooCartPayload = {
  items?: WooCartItemPayload[];
  totals?: WooCartTotalsPayload;
};

export type ShopCartItem = {
  key: string;
  id: number;
  name: string;
  price: string;
  href: string;
  imageSrc?: string;
  imageAlt?: string;
  quantity: number;
};

export type ShopCartItemInput = Omit<ShopCartItem, "key" | "quantity"> & {
  quantity?: number;
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

const DEFAULT_TOTAL_LABEL = "£0.00";
const DEFAULT_TOTALS: ShopCartTotals = {
  subtotalLabel: DEFAULT_TOTAL_LABEL,
  shippingLabel: DEFAULT_TOTAL_LABEL,
  feesLabel: DEFAULT_TOTAL_LABEL,
  discountLabel: DEFAULT_TOTAL_LABEL,
  taxLabel: DEFAULT_TOTAL_LABEL,
  totalLabel: DEFAULT_TOTAL_LABEL,
  hasShipping: false,
  hasFees: false,
  hasDiscount: false,
  hasTax: false,
};

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

function toMoneyLabel(rawValue: unknown, currency: WooCurrencyInfo): string {
  const minorRaw = typeof rawValue === "string" || typeof rawValue === "number"
    ? Number(rawValue)
    : Number.NaN;
  if (!Number.isFinite(minorRaw)) return "Price unavailable";

  const minorUnit = Number(currency.currency_minor_unit ?? 2);
  const divisor = 10 ** minorUnit;
  const numericValue = minorRaw / divisor;

  const currencyCode = currency.currency_code || "";
  if (currencyCode) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: currencyCode,
      }).format(numericValue);
    } catch {
      // Fall through to symbol-based formatting.
    }
  }

  const symbol = currency.currency_symbol || currency.currency_prefix || "";
  const suffix = currency.currency_suffix || "";
  return `${symbol}${numericValue.toFixed(minorUnit)}${suffix}`.trim();
}

function toMoneyLabelWithFallback(rawValue: unknown, currency: WooCurrencyInfo): string {
  const label = toMoneyLabel(rawValue, currency);
  return label === "Price unavailable" ? DEFAULT_TOTAL_LABEL : label;
}

function toMinorAmount(rawValue: unknown): number | null {
  const amount = typeof rawValue === "string" || typeof rawValue === "number"
    ? Number(rawValue)
    : Number.NaN;
  return Number.isFinite(amount) ? amount : null;
}

function hasNonZeroAmount(rawValue: unknown): boolean {
  const amount = toMinorAmount(rawValue);
  return amount !== null && Math.abs(amount) > 0;
}

function toShopCartItems(payload: WooCartPayload): ShopCartItem[] {
  if (!Array.isArray(payload.items)) return [];

  return payload.items
    .filter(
      (item): item is WooCartItemPayload & { key: string; id: number; name: string; quantity: number } =>
        typeof item.key === "string" &&
        item.key.length > 0 &&
        Number.isFinite(item.id) &&
        typeof item.name === "string" &&
        Number.isFinite(item.quantity),
    )
    .map((item) => {
      const image = Array.isArray(item.images) ? item.images[0] : undefined;
      const unitPriceRaw = item.prices?.price ?? item.totals?.line_total;
      const price = toMoneyLabel(
        unitPriceRaw,
        item.prices ?? item.totals ?? payload.totals ?? {},
      );

      return {
        key: item.key,
        id: item.id,
        name: item.name,
        price,
        href: `/shop/${item.id}`,
        imageSrc: image?.src || image?.thumbnail,
        imageAlt: image?.alt || item.name,
        quantity: Math.max(1, Math.round(item.quantity)),
      };
    });
}

function toShopCartTotals(payload: WooCartPayload): ShopCartTotals {
  const totals = payload.totals;
  if (!totals) return DEFAULT_TOTALS;

  const discountAmount = Math.abs(toMinorAmount(totals.total_discount) ?? 0);

  return {
    subtotalLabel: toMoneyLabelWithFallback(totals.total_items ?? 0, totals),
    shippingLabel: toMoneyLabelWithFallback(totals.total_shipping ?? 0, totals),
    feesLabel: toMoneyLabelWithFallback(totals.total_fees ?? 0, totals),
    discountLabel: toMoneyLabelWithFallback(-discountAmount, totals),
    taxLabel: toMoneyLabelWithFallback(totals.total_tax ?? 0, totals),
    totalLabel: toMoneyLabelWithFallback(totals.total_price ?? 0, totals),
    hasShipping: hasNonZeroAmount(totals.total_shipping),
    hasFees: hasNonZeroAmount(totals.total_fees),
    hasDiscount: hasNonZeroAmount(totals.total_discount),
    hasTax: hasNonZeroAmount(totals.total_tax),
  };
}

function getMessageFromPayload(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  if ("message" in payload && typeof (payload as { message?: unknown }).message === "string") {
    return String((payload as { message: string }).message);
  }
  return fallback;
}

async function requestCart(path: string, init?: RequestInit): Promise<WooCartPayload> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    cache: "no-store",
  });

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    throw new Error(getMessageFromPayload(payload, `Cart request failed (${response.status}).`));
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid cart response.");
  }

  return payload as WooCartPayload;
}

export function ShopCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ShopCartItem[]>([]);
  const [totals, setTotals] = useState<ShopCartTotals>(DEFAULT_TOTALS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const totalLabel = totals.totalLabel;

  const applyCartPayload = useCallback((payload: WooCartPayload) => {
    setItems(toShopCartItems(payload));
    setTotals(toShopCartTotals(payload));
  }, []);

  const refreshCart = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const payload = await requestCart("/api/shop/cart");
      applyCartPayload(payload);
    } catch (requestError) {
      setItems([]);
      setTotals(DEFAULT_TOTALS);
      setError(getErrorMessage(requestError, "Unable to load cart right now."));
    } finally {
      setIsLoading(false);
    }
  }, [applyCartPayload]);

  useEffect(() => {
    void refreshCart();
  }, [refreshCart]);

  const addItem = useCallback(
    async (input: ShopCartItemInput) => {
      setError("");

      try {
        const quantity = Math.max(1, Math.round(input.quantity ?? 1));
        const payload = await requestCart("/api/shop/cart/add-item", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: input.id,
            quantity,
          }),
        });
        applyCartPayload(payload);
      } catch (requestError) {
        const message = getErrorMessage(requestError, "Unable to add item to cart.");
        setError(message);
        throw new Error(message);
      }
    },
    [applyCartPayload],
  );

  const removeItem = useCallback(
    async (itemKey: string) => {
      if (!itemKey) return;
      setError("");

      try {
        const payload = await requestCart("/api/shop/cart/remove-item", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: itemKey }),
        });
        applyCartPayload(payload);
      } catch (requestError) {
        const message = getErrorMessage(requestError, "Unable to remove item from cart.");
        setError(message);
      }
    },
    [applyCartPayload],
  );

  const updateQuantity = useCallback(
    async (itemKey: string, quantity: number) => {
      if (!itemKey) return;
      if (quantity <= 0) {
        await removeItem(itemKey);
        return;
      }

      setError("");
      try {
        const payload = await requestCart("/api/shop/cart/update-item", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: itemKey, quantity: Math.round(quantity) }),
        });
        applyCartPayload(payload);
      } catch (requestError) {
        const message = getErrorMessage(requestError, "Unable to update cart quantity.");
        setError(message);
      }
    },
    [applyCartPayload, removeItem],
  );

  const clearCart = useCallback(async () => {
    setError("");

    try {
      const payload = await requestCart("/api/shop/cart/clear", {
        method: "POST",
      });
      applyCartPayload(payload);
    } catch (requestError) {
      const message = getErrorMessage(requestError, "Unable to clear cart right now.");
      setError(message);
    }
  }, [applyCartPayload]);

  const itemCount = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items],
  );

  const contextValue = useMemo<ShopCartContextValue>(
    () => ({
      items,
      itemCount,
      totalLabel,
      totals,
      isLoading,
      error,
      refreshCart,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    }),
    [addItem, clearCart, error, isLoading, itemCount, items, refreshCart, removeItem, totalLabel, totals, updateQuantity],
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
