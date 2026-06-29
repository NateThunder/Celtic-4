import type { NextRequest } from "next/server";
import {
  badRequest,
  requestWooStore,
  toProxyJsonResponse,
} from "../../_lib/wooStoreProxy";

type AddItemPayload = {
  id?: unknown;
  quantity?: unknown;
  variation?: unknown;
};

type AddItemVariation = {
  attribute: string;
  value: string;
};

function parseVariation(input: unknown): AddItemVariation[] | null {
  if (input === undefined) return [];
  if (!Array.isArray(input)) return null;

  const variation: AddItemVariation[] = [];
  for (const option of input) {
    if (!option || typeof option !== "object") return null;

    const attribute = "attribute" in option ? String((option as { attribute?: unknown }).attribute ?? "").trim() : "";
    const value = "value" in option ? String((option as { value?: unknown }).value ?? "").trim() : "";
    if (!attribute || !value) return null;

    variation.push({ attribute, value });
  }

  return variation;
}

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
  const variation = parseVariation(payload.variation);
  if (!variation) {
    return badRequest("Variation attributes must include an attribute and value.");
  }

  const body: { id: number; quantity: number; variation?: AddItemVariation[] } = { id, quantity };
  if (variation.length > 0) {
    body.variation = variation;
  }

  const result = await requestWooStore(request, "/cart/add-item", {
    method: "POST",
    body,
    includeNonce: true,
  });

  return toProxyJsonResponse(result);
}
