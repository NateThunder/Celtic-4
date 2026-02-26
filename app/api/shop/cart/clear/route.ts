import type { NextRequest } from "next/server";
import {
  requestWooStore,
  toProxyJsonResponse,
} from "../../_lib/wooStoreProxy";

type WooCartItem = {
  key?: string;
};

type WooCartPayload = {
  items?: WooCartItem[];
};

export async function POST(request: NextRequest) {
  const currentCartResult = await requestWooStore(request, "/cart");
  if (
    !currentCartResult.payload ||
    typeof currentCartResult.payload !== "object" ||
    !Array.isArray((currentCartResult.payload as WooCartPayload).items)
  ) {
    return toProxyJsonResponse(currentCartResult);
  }

  const items = (currentCartResult.payload as WooCartPayload).items ?? [];

  let latestResult = currentCartResult;
  let activeCartToken = currentCartResult.cartToken || undefined;
  let activeNonce = currentCartResult.nonce || undefined;

  for (const item of items) {
    const key = typeof item.key === "string" ? item.key : "";
    if (!key) continue;

    latestResult = await requestWooStore(request, "/cart/remove-item", {
      method: "POST",
      body: { key },
      includeNonce: true,
      cartTokenOverride: activeCartToken,
      nonceOverride: activeNonce,
    });

    activeCartToken = latestResult.cartToken || activeCartToken;
    activeNonce = latestResult.nonce || activeNonce;
  }

  if (items.length === 0) {
    return toProxyJsonResponse(latestResult);
  }

  const refreshedCartResult = await requestWooStore(request, "/cart", {
    cartTokenOverride: activeCartToken,
    nonceOverride: activeNonce,
  });
  return toProxyJsonResponse(refreshedCartResult);
}
