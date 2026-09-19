import type { NextRequest } from "next/server";
import { badRequest, requestWooStore, toProxyJsonResponse } from "../../_lib/wooStoreProxy";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null) as { billing_address?: unknown; shipping_address?: unknown } | null;
  if (!body?.billing_address || !body?.shipping_address) return badRequest("Please complete your delivery address.");
  return toProxyJsonResponse(await requestWooStore(request, "/cart/update-customer", {
    method: "POST", includeNonce: true,
    body: { billing_address: body.billing_address, shipping_address: body.shipping_address },
  }));
}
