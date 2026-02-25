"use client";

import Link from "next/link";
import { useShopCart } from "./ShopCartContext";
import styles from "./shopCart.module.css";

export default function FloatingCartButton() {
  const { itemCount } = useShopCart();

  return (
    <Link className={styles.floatingCart} href="/shop/cart" aria-label={`Open cart (${itemCount} items)`}>
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
    </Link>
  );
}
