import type { NextRequest } from "next/server";
import {
  badRequest,
  requestWooStore,
  toProxyJsonResponse,
} from "../../_lib/wooStoreProxy";

type AddItemPayload = {
  id?: unknown;
  quantity?: unknown;
};

export async function POST(request: NextRequest) {
  let payload: AddItemPayload;

  try {
    payload = (await request.json()) as AddItemPayload;
  } catch {
    return badRequest("Invalid request body.");
  }

  const id = Number(payload.id);
  if (!Number.isFinite(id) || id <= 0) {
    return badRequest("A valid product id is required.");
  }

  const requestedQuantity = payload.quantity === undefined ? 1 : Number(payload.quantity);
  const quantity = Number.isFinite(requestedQuantity) ? Math.max(1, Math.round(requestedQuantity)) : 1;

  const result = await requestWooStore(request, "/cart/add-item", {
    method: "POST",
    body: { id, quantity },
    includeNonce: true,
  });

  return toProxyJsonResponse(result);
}
