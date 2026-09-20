"use client";

import Link from "next/link";
import ShopCheckoutHandoff from "../../components/shop/ShopCheckoutHandoff";
import { useShopCart } from "../../components/shop/ShopCartContext";
import styles from "./checkout.module.css";

export default function ShopCheckoutPage() {
  const { items, isLoading, error } = useShopCart();

  return (
    <div className="site-shell">
      <main className={styles.page}>
        <section className={styles.shell}>
          <header className={styles.header}>
            <h1 className={styles.title}>Checkout</h1>
            <div className={styles.nav}>
              <Link className={styles.navLink} href="/shop/cart">Back to Cart</Link>
            </div>
          </header>

          {error ? <p className={styles.error} role="alert">{error}</p> : null}
          <div className={styles.form}>
            <p>
              Continue to our secure WooCommerce checkout to choose Apple Pay, Google Pay,
              card, or PayPal. Your basket will be transferred and checked before payment.
            </p>
            <ShopCheckoutHandoff className={styles.submitButton}>
              {isLoading ? "Loading basket..." : items.length ? "Continue to secure checkout" : "Your basket is empty"}
            </ShopCheckoutHandoff>
          </div>
        </section>
      </main>
    </div>
  );
}
