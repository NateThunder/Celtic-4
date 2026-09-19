"use client";
import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import { useShopCart } from "../../components/shop/ShopCartContext";
import { handoffItems } from "../../lib/browserCart";
import { COMMERCE_DISABLED } from "../../lib/shopConfig";
import styles from "../cart/cart.module.css";
export default function ShopCheckoutPage() {
  const { items, totalLabel, isLoading, error } = useShopCart();
  const cms = process.env.NEXT_PUBLIC_WOO_URL || "https://cms.celticworship.co.uk";
  return <div className="site-shell"><SiteHeader /><main className={styles.page}><section className={styles.shell}>
    <header className={styles.header}><p className={styles.kicker}>Celtic Worship</p><h1 className={styles.title}>Checkout</h1></header>
    {error && <p role="alert">{error}</p>}
    {isLoading ? <p>Loading cart...</p> : !items.length ? <p>Your cart is empty.</p> : <>
      <p>Estimated subtotal: {totalLabel}</p>
      <p>Continue to our secure shop to review current prices, delivery and payment. Your cart stays saved here if you return.</p>
      <form action={`${cms.replace(/\/$/, "")}/?wc-api=cw_cart_handoff`} method="post">
        <input type="hidden" name="items" value={JSON.stringify(handoffItems(items))} />
        <button className={styles.checkoutLink} type="submit" disabled={COMMERCE_DISABLED}>Continue to secure checkout</button>
      </form>
    </>}
    <p><Link href="/shop/cart">Return to cart</Link></p>
  </section></main></div>;
}
