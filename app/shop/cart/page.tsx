"use client";

import Image from "next/image";
import Link from "next/link";
import SiteHeader from "../../components/SiteHeader";
import { useShopCart } from "../../components/shop/ShopCartContext";
import styles from "./cart.module.css";

export default function ShopCartPage() {
  const { items, totalLabel, isLoading, error, updateQuantity, removeItem, clearCart } = useShopCart();

  return (
    <div className="site-shell">
      <SiteHeader />
      <main className={styles.page}>
        <section className={styles.shell}>
          <header className={styles.header}>
            <p className={styles.kicker}>Celtic Worship</p>
            <h1 className={styles.title}>Cart</h1>
            <div className={styles.nav}>
              <Link className={styles.navLink} href="/shop">
                Continue Shopping
              </Link>
            </div>
          </header>

          {error ? <p className={styles.empty}>{error}</p> : null}

          {isLoading ? (
            <p className={styles.empty}>Loading cart...</p>
          ) : items.length === 0 ? (
            <p className={styles.empty}>Your cart is empty.</p>
          ) : (
            <>
              <ul className={styles.list}>
                {items.map((item) => (
                  <li key={item.key} className={styles.item}>
                    {item.imageSrc ? (
                      <Image
                        className={styles.itemImage}
                        src={item.imageSrc}
                        alt={item.imageAlt || item.name}
                        width={360}
                        height={360}
                      />
                    ) : (
                      <div className={`${styles.itemImage} ${styles.itemImagePlaceholder}`} />
                    )}

                    <div className={styles.itemMeta}>
                      <Link href={item.href} className={styles.itemTitle}>
                        {item.name}
                      </Link>
                      {item.variationLabel ? <p className={styles.itemOptions}>{item.variationLabel}</p> : null}
                      <p className={styles.itemPrice}>{item.price}</p>
                    </div>

                    <div className={styles.itemControls}>
                      <button
                        type="button"
                        className={styles.qtyButton}
                        onClick={() => {
                          void updateQuantity(item.key, item.quantity - 1);
                        }}
                        aria-label={`Decrease quantity for ${item.name}`}
                      >
                        -
                      </button>
                      <span className={styles.qtyText}>{item.quantity}</span>
                      <button
                        type="button"
                        className={styles.qtyButton}
                        onClick={() => {
                          void updateQuantity(item.key, item.quantity + 1);
                        }}
                        aria-label={`Increase quantity for ${item.name}`}
                      >
                        +
                      </button>
                      <button
                        type="button"
                        className={styles.removeButton}
                        onClick={() => {
                          void removeItem(item.key);
                        }}
                      >
                        Remove
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              <div className={styles.footer}>
                <p className={styles.total}>Total: {totalLabel}</p>
                <div className={styles.footerActions}>
                  <Link href="/shop/checkout" className={styles.checkoutLink}>
                    Checkout
                  </Link>
                  <button
                    type="button"
                    className={styles.clearButton}
                    onClick={() => {
                      void clearCart();
                    }}
                  >
                    Clear Cart
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
