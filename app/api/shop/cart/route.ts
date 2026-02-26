import type { NextRequest } from "next/server";
import { requestWooStore, toProxyJsonResponse } from "../_lib/wooStoreProxy";

export async function GET(request: NextRequest) {
  const result = await requestWooStore(request, "/cart");
  return toProxyJsonResponse(result);
}
