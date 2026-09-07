import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { applyWooSessionCookies, requestWooStore, toProxyJsonResponse } from "../../_lib/wooStoreProxy";
import { getShopPaymentMethods, SHOP_STRIPE_METHOD } from "../../../../lib/shopPayments";

export async function GET(request: NextRequest) {
  // OPTIONS also lists disabled gateways; the cart reports actual availability.
  const cartResult = await requestWooStore(request, "/cart");
  if (cartResult.status < 200 || cartResult.status >= 300) return toProxyJsonResponse(cartResult);

  const cart = cartResult.payload as { payment_methods?: unknown } | null;
  const methods = getShopPaymentMethods(cart?.payment_methods);
  const publishableKey = process.env.SHOP_STRIPE_PUBLISHABLE_KEY?.trim() || "";
  const stripeAvailable = methods.includes(SHOP_STRIPE_METHOD);
  const stripeConfigured = /^pk_(test|live)_[A-Za-z0-9]+$/.test(publishableKey);
  const usableMethods = methods.filter((method) => method !== SHOP_STRIPE_METHOD || stripeConfigured);
  const response = NextResponse.json({
    methods,
    defaultMethod: usableMethods[0] || null,
    stripe: stripeAvailable && stripeConfigured ? { publishableKey } : null,
    stripeError: stripeAvailable && !stripeConfigured ? "Card payments are temporarily unavailable. Please use PayPal." : null,
  });
  response.headers.set("Cache-Control", "no-store");
  applyWooSessionCookies(response, cartResult);
  return response;
}
