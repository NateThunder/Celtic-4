import type { NextRequest } from "next/server";
import { badRequest, requestWooStore, toProxyJsonResponse } from "../_lib/wooStoreProxy";

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

  const result = await requestWooStore(request, "/checkout", {
    method: "POST",
    body: payload,
    includeNonce: true,
  });

  return toProxyJsonResponse(result);
}
