import { NextResponse, type NextRequest } from "next/server";
import { applyWooSessionCookies, badRequest, requestWooStore, toProxyJsonResponse } from "../../_lib/wooStoreProxy";
import { getShopWalletQuote, SHOP_STRIPE_METHOD } from "../../../../lib/shopPayments";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { billing_address?: unknown; shipping_address?: unknown } | null;
  if (!body?.billing_address || !body?.shipping_address) return badRequest("Please complete your billing and delivery details.");
  // Calculate shipping and tax before showing a total in the wallet sheet.
  const result = await requestWooStore(request, "/cart/update-customer", {
    method: "POST", includeNonce: true,
    body: { billing_address: body.billing_address, shipping_address: body.shipping_address },
  });
  if (result.status < 200 || result.status >= 300) return toProxyJsonResponse(result);
  const cart = result.payload as { payment_methods?: string[] };
  if (!cart.payment_methods?.includes(SHOP_STRIPE_METHOD)) return badRequest("Wallet payments are currently unavailable. Please use PayPal.");
  try {
    const response = NextResponse.json(getShopWalletQuote(cart));
    response.headers.set("Cache-Control", "no-store");
    applyWooSessionCookies(response, result);
    return response;
  } catch (error) {
    return badRequest(error instanceof Error ? error.message : "Unable to calculate the wallet total.");
  }
}
