import type { ReactNode } from "react";
import FloatingCartButton from "../components/shop/FloatingCartButton";
import { ShopCartProvider } from "../components/shop/ShopCartContext";

export default function ShopLayout({ children }: { children: ReactNode }) {
  return (
    <ShopCartProvider>
      {children}
      <FloatingCartButton />
    </ShopCartProvider>
  );
}
