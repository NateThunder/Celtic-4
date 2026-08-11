"use client";

import { useEffect } from "react";

type ScrollToProductTopProps = {
  productId: number;
};

export default function ScrollToProductTop({ productId }: ScrollToProductTopProps) {
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [productId]);

  return null;
}
