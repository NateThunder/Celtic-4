"use client";

import { useEffect, useRef, useState } from "react";
import { useShopCart, type ShopCartItemInput } from "./ShopCartContext";
import styles from "./shopCart.module.css";

type AddToCartButtonProps = {
  item: ShopCartItemInput;
  className?: string;
};

export default function AddToCartButton({ item, className }: AddToCartButtonProps) {
  const { addItem } = useShopCart();
  const [isAdded, setIsAdded] = useState(false);
  const [isBusy, setIsBusy] = useState(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleClick = async () => {
    if (isBusy) return;
    setIsBusy(true);

    try {
      await addItem(item);
      setIsAdded(true);

      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = window.setTimeout(() => {
        setIsAdded(false);
        timeoutRef.current = null;
      }, 1200);
    } catch {
      setIsAdded(false);
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <button
      type="button"
      className={`${styles.addButton}${className ? ` ${className}` : ""}`}
      onClick={() => {
        void handleClick();
      }}
      data-added={isAdded ? "true" : "false"}
      disabled={isBusy}
      aria-label={`Add ${item.name} to cart`}
    >
      <span className={styles.addButtonIcon} aria-hidden="true">
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
      {isAdded ? "Added" : "Add to Cart"}
    </button>
  );
}
