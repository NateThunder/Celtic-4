"use client";

import type { ReactNode } from "react";
import { handoffItems } from "../../lib/browserCart";
import { WOO_BASE_URL } from "../../lib/woo";
import { useShopCart } from "./ShopCartContext";

const HANDOFF_URL = new URL("/?wc-api=cw_cart_handoff", WOO_BASE_URL).toString();

export default function ShopCheckoutHandoff({
  className,
  children = "Checkout",
  onSubmit,
}: {
  className?: string;
  children?: ReactNode;
  onSubmit?: () => void;
}) {
  const { items, isLoading } = useShopCart();

  return (
    <form action={HANDOFF_URL} method="post" style={{ display: "contents" }} onSubmit={onSubmit}>
      <input type="hidden" name="items" value={JSON.stringify(handoffItems(items))} />
      <button className={className} type="submit" disabled={isLoading || items.length === 0}>
        {children}
      </button>
    </form>
  );
}
