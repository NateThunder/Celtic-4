"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { useShopCart } from "./ShopCartContext";
import styles from "./shopCart.module.css";

export default function FloatingCartButton() {
  const { items, totalLabel, isLoading, error, updateQuantity, removeItem, clearCart, itemCount } = useShopCart();
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const drawerId = useId();
  const drawerTitleId = useId();

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      setIsDrawerOpen(false);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [pathname]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const { documentElement, body } = document;

    if (isDrawerOpen) {
      documentElement.classList.add("has-open-shop-cart-drawer");
      body.classList.add("has-open-shop-cart-drawer");
    } else {
      documentElement.classList.remove("has-open-shop-cart-drawer");
      body.classList.remove("has-open-shop-cart-drawer");
    }

    return () => {
      documentElement.classList.remove("has-open-shop-cart-drawer");
      body.classList.remove("has-open-shop-cart-drawer");
    };
  }, [isDrawerOpen]);

  useEffect(() => {
    if (!isDrawerOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDrawerOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isDrawerOpen]);

  return (
    <>
      <button
        className={styles.floatingCart}
        type="button"
        aria-label={`Open cart (${itemCount} items)`}
        aria-controls={drawerId}
        aria-expanded={isDrawerOpen ? "true" : "false"}
        aria-haspopup="dialog"
        onClick={() => {
          setIsDrawerOpen(true);
        }}
      >
        <span className={styles.floatingCartIcon} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M3 3H5L7.4 15.2C7.5 15.7 7.9 16 8.4 16H18.8C19.3 16 19.7 15.7 19.8 15.2L21 8H6.3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="9" cy="20" r="1.5" fill="currentColor" />
            <circle cx="18" cy="20" r="1.5" fill="currentColor" />
          </svg>
        </span>
        <span className={styles.floatingCartLabel}>Cart</span>
        <span className={styles.floatingCartBadge} aria-hidden="true">
          {itemCount}
        </span>
      </button>

      <button
        className={`${styles.cartDrawerBackdrop}${isDrawerOpen ? ` ${styles.cartDrawerBackdropOpen}` : ""}`}
        type="button"
        tabIndex={isDrawerOpen ? 0 : -1}
        aria-label="Close cart drawer"
        onClick={() => {
          setIsDrawerOpen(false);
        }}
      />

      <aside
        id={drawerId}
        className={`${styles.cartDrawer}${isDrawerOpen ? ` ${styles.cartDrawerOpen}` : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={drawerTitleId}
        aria-hidden={!isDrawerOpen}
      >
        <header className={styles.cartDrawerHeader}>
          <div className={styles.cartDrawerHeading}>
            <p className={styles.cartDrawerKicker}>Celtic Worship</p>
            <h2 id={drawerTitleId} className={styles.cartDrawerTitle}>
              Cart
            </h2>
          </div>

          <button
            type="button"
            className={styles.cartDrawerClose}
            onClick={() => {
              setIsDrawerOpen(false);
            }}
            aria-label="Close cart drawer"
          >
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        <div className={styles.cartDrawerBody}>
          {error ? <p className={styles.cartDrawerStatus}>{error}</p> : null}

          {isLoading ? (
            <p className={styles.cartDrawerStatus}>Loading cart...</p>
          ) : items.length === 0 ? (
            <p className={styles.cartDrawerStatus}>Your cart is empty.</p>
          ) : (
            <ul className={styles.cartDrawerList}>
              {items.map((item) => (
                <li key={item.key} className={styles.cartDrawerItem}>
                  {item.imageSrc ? (
                    <Image
                      className={styles.cartDrawerItemImage}
                      src={item.imageSrc}
                      alt={item.imageAlt || item.name}
                      width={240}
                      height={240}
                    />
                  ) : (
                    <div className={`${styles.cartDrawerItemImage} ${styles.cartDrawerItemImagePlaceholder}`} />
                  )}

                  <div className={styles.cartDrawerItemMeta}>
                    <Link
                      href={item.href}
                      className={styles.cartDrawerItemTitle}
                      onClick={() => {
                        setIsDrawerOpen(false);
                      }}
                    >
                      {item.name}
                    </Link>
                    <p className={styles.cartDrawerItemPrice}>{item.price}</p>
                  </div>

                  <div className={styles.cartDrawerItemControls}>
                    <button
                      type="button"
                      className={styles.cartDrawerQtyButton}
                      onClick={() => {
                        void updateQuantity(item.key, item.quantity - 1);
                      }}
                      aria-label={`Decrease quantity for ${item.name}`}
                    >
                      -
                    </button>
                    <span className={styles.cartDrawerQtyText}>{item.quantity}</span>
                    <button
                      type="button"
                      className={styles.cartDrawerQtyButton}
                      onClick={() => {
                        void updateQuantity(item.key, item.quantity + 1);
                      }}
                      aria-label={`Increase quantity for ${item.name}`}
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className={styles.cartDrawerRemoveButton}
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
          )}
        </div>

        <footer className={styles.cartDrawerFooter}>
          <p className={styles.cartDrawerTotal}>Total: {totalLabel}</p>

          <div className={styles.cartDrawerFooterActions}>
            <Link
              href="/shop/checkout"
              className={styles.cartDrawerCheckoutLink}
              onClick={() => {
                setIsDrawerOpen(false);
              }}
            >
              Checkout
            </Link>
            <Link
              href="/shop/cart"
              className={styles.cartDrawerSecondaryLink}
              onClick={() => {
                setIsDrawerOpen(false);
              }}
            >
              View Cart
            </Link>
            <button
              type="button"
              className={styles.cartDrawerClearButton}
              onClick={() => {
                void clearCart();
              }}
            >
              Clear Cart
            </button>
          </div>
        </footer>
      </aside>
    </>
  );
}
