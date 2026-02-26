import type { NextRequest } from "next/server";
import {
  badRequest,
  requestWooStore,
  toProxyJsonResponse,
} from "../../_lib/wooStoreProxy";

type RemoveItemPayload = {
  key?: unknown;
};

export async function POST(request: NextRequest) {
  let payload: RemoveItemPayload;

  try {
    payload = (await request.json()) as RemoveItemPayload;
  } catch {
    return badRequest("Invalid request body.");
  }

  const key = typeof payload.key === "string" ? payload.key.trim() : "";
  if (!key) {
    return badRequest("A valid cart item key is required.");
  }

  const result = await requestWooStore(request, "/cart/remove-item", {
    method: "POST",
    body: { key },
    includeNonce: true,
  });

  return toProxyJsonResponse(result);
}
