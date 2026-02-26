import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { applyWooSessionCookies, requestWooStore } from "../../_lib/wooStoreProxy";

type WooEndpointSchema = {
  methods?: string[];
  args?: {
    payment_method?: {
      enum?: unknown;
    };
  };
};

type WooOptionsPayload = {
  endpoints?: WooEndpointSchema[];
};

type WooCheckoutPayload = {
  payment_method?: unknown;
};

type WooCartPayload = {
  payment_methods?: unknown;
};

const ALWAYS_EXPOSE_METHODS = [
  "ppcp-gateway",
] as const;

const PREFERRED_METHOD_ORDER = [
  "ppcp-gateway",
] as const;

function isDisabledMethod(method: string): boolean {
  const normalizedMethod = method.toLowerCase();
  return (
    normalizedMethod.includes("applepay") ||
    normalizedMethod.includes("stripe") ||
    normalizedMethod.includes("googlepay") ||
    normalizedMethod.includes("google_pay") ||
    normalizedMethod.includes("gpay")
  );
}

function isPayPalMethod(method: string): boolean {
  return /(^ppcp-gateway$)|paypal/i.test(method);
}

function sortMethods(methods: string[]): string[] {
  const rankByMethod = new Map<string, number>();
  PREFERRED_METHOD_ORDER.forEach((method, index) => rankByMethod.set(method, index));

  return [...methods].sort((left, right) => {
    const leftRank = rankByMethod.get(left) ?? Number.MAX_SAFE_INTEGER;
    const rightRank = rankByMethod.get(right) ?? Number.MAX_SAFE_INTEGER;
    if (leftRank !== rightRank) return leftRank - rightRank;
    return left.localeCompare(right);
  });
}

function getMethodEnum(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];
  const endpoints = (payload as WooOptionsPayload).endpoints;
  if (!Array.isArray(endpoints)) return [];

  const postEndpoint = endpoints.find((endpoint) => endpoint.methods?.includes("POST"));
  if (!postEndpoint?.args?.payment_method?.enum) return [];

  const rawEnum = postEndpoint.args.payment_method.enum;
  if (!Array.isArray(rawEnum)) return [];

  const methods = rawEnum.filter(
    (value): value is string =>
      typeof value === "string" && value.trim().length > 0 && !isDisabledMethod(value) && isPayPalMethod(value),
  );
  return sortMethods(Array.from(new Set(methods)));
}

function getDefaultMethod(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;

  const method = (payload as WooCheckoutPayload).payment_method;
  return typeof method === "string" && method.trim().length > 0 ? method : null;
}

function getCartPaymentMethods(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") return [];

  const methods = (payload as WooCartPayload).payment_methods;
  if (!Array.isArray(methods)) return [];

  return sortMethods(
    methods.filter(
      (method): method is string =>
        typeof method === "string" &&
        method.trim().length > 0 &&
        !isDisabledMethod(method) &&
        isPayPalMethod(method),
    ),
  );
}

export async function GET(request: NextRequest) {
  const optionsResult = await requestWooStore(request, "/checkout", { method: "OPTIONS" });
  const allMethods = getMethodEnum(optionsResult.payload);

  const cartResult = await requestWooStore(request, "/cart", {
    cartTokenOverride: optionsResult.cartToken || undefined,
    nonceOverride: optionsResult.nonce || undefined,
  });
  const cartMethods = getCartPaymentMethods(cartResult.payload);
  const fallbackMethods = allMethods.filter((method) =>
    ALWAYS_EXPOSE_METHODS.includes(method as (typeof ALWAYS_EXPOSE_METHODS)[number])
  );
  const methods = cartMethods.length > 0
    ? sortMethods(Array.from(new Set([...cartMethods, ...fallbackMethods])))
    : allMethods;

  const defaultResult = await requestWooStore(request, "/checkout", {
    cartTokenOverride: cartResult.cartToken || optionsResult.cartToken || undefined,
    nonceOverride: cartResult.nonce || optionsResult.nonce || undefined,
  });
  const rawDefaultMethod =
    defaultResult.status >= 200 && defaultResult.status < 300 ? getDefaultMethod(defaultResult.payload) : null;
  const defaultMethod = rawDefaultMethod && methods.includes(rawDefaultMethod)
    ? rawDefaultMethod
    : methods[0] || null;

  const responseStatus = optionsResult.status >= 200 && optionsResult.status < 300 ? 200 : optionsResult.status;
  const response = NextResponse.json(
    {
      methods,
      defaultMethod,
    },
    { status: responseStatus },
  );

  response.headers.set("Cache-Control", "no-store");
  applyWooSessionCookies(response, optionsResult);
  applyWooSessionCookies(response, cartResult);
  applyWooSessionCookies(response, defaultResult);
  return response;
}
