import type { NextRequest } from "next/server";
import {
  badRequest,
  requestWooStore,
  toProxyJsonResponse,
} from "../../_lib/wooStoreProxy";

type UpdateItemPayload = {
  key?: unknown;
  quantity?: unknown;
};

export async function POST(request: NextRequest) {
  let payload: UpdateItemPayload;

  try {
    payload = (await request.json()) as UpdateItemPayload;
  } catch {
    return badRequest("Invalid request body.");
  }

  const key = typeof payload.key === "string" ? payload.key.trim() : "";
  if (!key) {
    return badRequest("A valid cart item key is required.");
  }

  const quantity = Number(payload.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return badRequest("A valid quantity greater than 0 is required.");
  }

  const result = await requestWooStore(request, "/cart/update-item", {
    method: "POST",
    body: { key, quantity: Math.round(quantity) },
    includeNonce: true,
  });

  return toProxyJsonResponse(result);
}
