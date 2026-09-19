import type { NextRequest } from "next/server";
import { badRequest, requestWooStore, toProxyJsonResponse } from "../_lib/wooStoreProxy";
import { getShopStripeAction, getShopWalletQuote, SHOP_STRIPE_METHOD } from "../../../lib/shopPayments";
import { WOO_BASE_URL } from "../../../lib/woo";

export async function GET(request: NextRequest) {
  const result = await requestWooStore(request, "/checkout");
  return toProxyJsonResponse(result);
}

export async function POST(request: NextRequest) {
  let payload: unknown;

  try {
    payload = (await request.json()) as unknown;
  } catch {
    return badRequest("Invalid request body.");
  }

  if (!payload || typeof payload !== "object") {
    return badRequest("Checkout payload must be an object.");
  }

  const checkout = payload as {
    payment_method?: string; payment_data?: { key: string; value: unknown }[];
    wallet_currency?: string; expected_total?: string; billing_address?: unknown; shipping_address?: unknown;
  };
  if (!/^\d+$/.test(checkout.expected_total || "")) {
    return badRequest("Please review delivery and your order total before paying.");
  }
  if (checkout.payment_method === SHOP_STRIPE_METHOD) {
    const source = Array.isArray(checkout.payment_data)
      ? checkout.payment_data.find((item) => item?.key === "fkwcs_source")?.value
      : null;
    if (typeof source !== "string" || !/^pm_[A-Za-z0-9]+$/.test(source)) {
      return badRequest("Please enter your card details before paying.");
    }
  }

  let preparedCart;
  if (checkout.expected_total !== undefined || checkout.wallet_currency !== undefined) {
    if ((checkout.wallet_currency !== undefined && checkout.payment_method !== SHOP_STRIPE_METHOD) || !/^\d+$/.test(checkout.expected_total || "")) {
      return badRequest("Invalid wallet payment total.");
    }
    preparedCart = await requestWooStore(request, "/cart/update-customer", {
      method: "POST", includeNonce: true,
      body: { billing_address: checkout.billing_address, shipping_address: checkout.shipping_address },
    });
    if (preparedCart.status < 200 || preparedCart.status >= 300) return toProxyJsonResponse(preparedCart);
    const cart = preparedCart.payload as { needs_shipping?: boolean; shipping_rates?: { shipping_rates?: { selected?: boolean }[] }[] };
    if (cart.needs_shipping && (!cart.shipping_rates?.length || cart.shipping_rates.some(group => !group.shipping_rates?.some(rate => rate.selected)))) {
      return badRequest("No delivery service is available for this address.");
    }
    let quote;
    try { quote = getShopWalletQuote(preparedCart.payload); }
    catch { return badRequest("Your cart has changed. Please refresh before paying."); }
    if (String(quote.amount) !== checkout.expected_total || (checkout.wallet_currency !== undefined && quote.currency !== checkout.wallet_currency)) {
      return toProxyJsonResponse({ ...preparedCart, status: 409, payload: { message: "Your order total has changed. Please review delivery and the total again before paying." } });
    }
  }

  const { wallet_currency: walletCurrency, ...wooPayload } = checkout;
  void walletCurrency;

  const result = await requestWooStore(request, "/checkout", {
    method: "POST",
    body: wooPayload,
    includeNonce: true,
    cartTokenOverride: preparedCart?.cartToken || undefined,
    nonceOverride: preparedCart?.nonce || undefined,
  });

  if (checkout.payment_method === SHOP_STRIPE_METHOD && result.status >= 200 && result.status < 300
    && result.payload && typeof result.payload === "object") {
    const paymentPayload = result.payload;
    try {
      result.payload = { ...paymentPayload, stripeAction: getShopStripeAction(paymentPayload, WOO_BASE_URL) };
    } catch {
      // Payment may already have been attempted. Do not report malformed confirmation data as success.
      result.payload = { ...paymentPayload, stripeError: "We could not verify the card payment. Please contact the shop before trying again." };
    }
  }

  return toProxyJsonResponse(result);
}
