"use client";

import { useEffect } from "react";

type ScrollToProductTopProps = {
  productId: number;
};

export default function ScrollToProductTop({ productId }: ScrollToProductTopProps) {
  useEffect(() => {
    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    };

    scrollToTop();
    const frameId = window.requestAnimationFrame(scrollToTop);

    return () => window.cancelAnimationFrame(frameId);
  }, [productId]);

  return null;
}
