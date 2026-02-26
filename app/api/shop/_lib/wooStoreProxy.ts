import { NextRequest, NextResponse } from "next/server";
import { WOO_BASE_URL } from "../../../lib/woo";

const CART_TOKEN_COOKIE = "celtic_woo_cart_token";
const NONCE_COOKIE = "celtic_woo_nonce";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const NONCE_MAX_AGE_SECONDS = 60 * 60 * 12;

type ProxyOptions = {
  method?: "GET" | "POST" | "OPTIONS";
  body?: unknown;
  includeNonce?: boolean;
  cartTokenOverride?: string;
  nonceOverride?: string;
};

type WooStoreResult = {
  status: number;
  payload: unknown;
  cartToken: string | null;
  nonce: string | null;
};

function getWooStoreEndpoint(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return new URL(`/wp-json/wc/store/v1${normalizedPath}`, WOO_BASE_URL).toString();
}

function getCookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

async function parsePayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

export async function requestWooStore(
  request: NextRequest,
  path: string,
  options?: ProxyOptions,
): Promise<WooStoreResult> {
  const cartToken = options?.cartTokenOverride ?? request.cookies.get(CART_TOKEN_COOKIE)?.value;
  const nonce = options?.nonceOverride ?? request.cookies.get(NONCE_COOKIE)?.value;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (cartToken) {
    headers["Cart-Token"] = cartToken;
  }

  if (options?.includeNonce && nonce) {
    headers.Nonce = nonce;
  }

  if (options?.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(getWooStoreEndpoint(path), {
    method: options?.method || "GET",
    headers,
    body: options?.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });

  const payload = await parsePayload(response);
  const nextCartToken = response.headers.get("cart-token");
  const nextNonce = response.headers.get("nonce");

  return {
    status: response.status,
    payload,
    cartToken: nextCartToken,
    nonce: nextNonce,
  };
}

export function applyWooSessionCookies(response: NextResponse, result: WooStoreResult) {
  if (result.cartToken) {
    response.cookies.set(
      CART_TOKEN_COOKIE,
      result.cartToken,
      getCookieOptions(SESSION_MAX_AGE_SECONDS),
    );
  }

  if (result.nonce) {
    response.cookies.set(NONCE_COOKIE, result.nonce, getCookieOptions(NONCE_MAX_AGE_SECONDS));
  }

  const code =
    result.payload &&
    typeof result.payload === "object" &&
    "code" in result.payload &&
    typeof (result.payload as { code?: unknown }).code === "string"
      ? String((result.payload as { code: string }).code)
      : "";

  if (code.includes("nonce")) {
    response.cookies.delete(NONCE_COOKIE);
  }

  if (code.includes("cart") && code.includes("token")) {
    response.cookies.delete(CART_TOKEN_COOKIE);
    response.cookies.delete(NONCE_COOKIE);
  }
}

export function toProxyJsonResponse(result: WooStoreResult): NextResponse {
  const response = NextResponse.json(result.payload, { status: result.status });
  response.headers.set("Cache-Control", "no-store");
  applyWooSessionCookies(response, result);
  return response;
}

export function badRequest(message: string): NextResponse {
  return NextResponse.json({ message }, { status: 400 });
}
