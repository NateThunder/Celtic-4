export const SHOP_STRIPE_METHOD = "fkwcs_stripe";

export type ShopBillingAddress = {
  first_name: string; last_name: string; company: string; email: string; phone: string;
  address_1: string; address_2: string; city: string; state: string; postcode: string; country: string;
};

export type ShopWalletCheckout = {
  billing_address: ShopBillingAddress;
  shipping_address: Omit<ShopBillingAddress, "email">;
  customer_note: string;
};

export type ShopWalletQuote = { amount: number; currency: string };

export function getShopWalletQuote(cart: unknown): ShopWalletQuote {
  const totals = (cart as { totals?: { total_price?: unknown; currency_code?: unknown } } | null)?.totals;
  const raw = totals?.total_price;
  const amount = typeof raw === "string" && /^\d+$/.test(raw) ? Number(raw) : NaN;
  const currency = typeof totals?.currency_code === "string" ? totals.currency_code.toLowerCase() : "";
  if (!Number.isSafeInteger(amount) || amount <= 0 || !/^[a-z]{3}$/.test(currency)) {
    throw new Error("Add an item to your cart before using a wallet.");
  }
  return { amount, currency };
}

export function isPayPalMethod(method: string): boolean {
  return /(^ppcp-gateway$)|paypal/i.test(method);
}

export function getShopPaymentMethods(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.filter((method): method is string =>
    typeof method === "string" && (method === SHOP_STRIPE_METHOD || isPayPalMethod(method)),
  ))).sort((a, b) => Number(b === SHOP_STRIPE_METHOD) - Number(a === SHOP_STRIPE_METHOD));
}

export type ShopStripeAction = {
  kind: "payment" | "setup";
  clientSecret: string;
  verificationUrl: string;
};

type WooPaymentResponse = {
  order_id?: number;
  order_key?: string;
  payment_result?: {
    redirect_url?: string;
    payment_details?: { key: string; value: unknown }[];
  };
};

function trustedWooUrl(value: string, wooBaseUrl: string): URL {
  const url = new URL(value, wooBaseUrl);
  if (url.origin !== new URL(wooBaseUrl).origin || !["https:", "http:"].includes(url.protocol)
    || url.username || url.password) {
    throw new Error("Invalid Stripe order verification URL.");
  }
  return url;
}

// The Store API returns FunnelKit's raw intent details. Classic checkout uses a fragment.
export function getShopStripeAction(payload: WooPaymentResponse, wooBaseUrl: string): ShopStripeAction | null {
  const payment = payload.payment_result;
  const details = Object.fromEntries((payment?.payment_details || []).map(({ key, value }) => [key, value]));
  const secret = details.fkwcs_intent_secret || details.fkwcs_setup_intent_secret;
  if (typeof secret === "string" && secret) {
    if (!payload.order_id || !payload.order_key || typeof details.fkwcs_redirect !== "string") {
      throw new Error("Stripe returned incomplete order verification details.");
    }
    const receipt = trustedWooUrl(details.fkwcs_redirect, wooBaseUrl);
    const verification = new URL("/", wooBaseUrl);
    verification.searchParams.set("wc-ajax", "fkwcs_stripe_verify_payment_intent");
    verification.searchParams.set("gateway", SHOP_STRIPE_METHOD);
    verification.searchParams.set("order", String(payload.order_id));
    verification.searchParams.set("order_key", payload.order_key);
    verification.searchParams.set("fkwcs_redirect_to", receipt.toString());
    return {
      kind: details.fkwcs_intent_secret ? "payment" : "setup",
      clientSecret: secret,
      verificationUrl: verification.toString(),
    };
  }

  const redirect = payment?.redirect_url || "";
  if (!redirect.startsWith("#fkwcs-confirm-")) return null;
  const match = redirect.match(/^#fkwcs-confirm-(pi|si)-([^:]+):([^:]+)(?::\d+:[^:]+:[^:]+)?$/);
  if (!match) throw new Error("Stripe returned an invalid confirmation response.");
  const verification = trustedWooUrl(decodeURIComponent(match[3]), wooBaseUrl);
  if (verification.searchParams.get("wc-ajax") !== "fkwcs_stripe_verify_payment_intent"
    || verification.searchParams.get("gateway") !== SHOP_STRIPE_METHOD) {
    throw new Error("Invalid Stripe order verification endpoint.");
  }
  return {
    kind: match[1] === "pi" ? "payment" : "setup",
    clientSecret: match[2],
    verificationUrl: verification.toString(),
  };
}
