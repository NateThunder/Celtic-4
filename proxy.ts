import { NextResponse, type NextRequest } from "next/server";
import { createHash, timingSafeEqual } from "node:crypto";

export async function proxy(request: NextRequest) {
  // Drain small rejected requests so the local Worker proxy can reuse its connection.
  async function reject(response: NextResponse) {
    if (request.body) {
      const reader = request.body.getReader();
      let bytes = 0;
      try {
        while (true) {
          const chunk = await reader.read();
          if (chunk.done) break;
          bytes += chunk.value.byteLength;
          if (bytes > 1024 * 1024) { await reader.cancel(); break; }
        }
      } finally { reader.releaseLock(); }
    }
    return response;
  }
  const pathname = request.nextUrl.pathname;
  if (pathname === "/store" || pathname === "/store/") {
    return NextResponse.redirect(new URL(`/shop${request.nextUrl.search}`, request.url), 308);
  }
  if (
    pathname === "/cart" || pathname === "/cart/" ||
    pathname === "/checkout" || pathname === "/checkout/" ||
    pathname.startsWith("/product/") || pathname.startsWith("/product-category/")
  ) {
    const cmsUrl = new URL(`${pathname}${request.nextUrl.search}`, "https://cms.celticworship.co.uk");
    return NextResponse.redirect(cmsUrl, 308);
  }
  if (process.env.ADMIN_AUTH_REQUIRED === "true" &&
      (pathname === "/admin" || pathname.startsWith("/admin/") || pathname.startsWith("/api/admin/"))) {
    const expected = process.env.ADMIN_PASSWORD;
    let credentials = "";
    try {
      const authorization = request.headers.get("authorization") || "";
      if (authorization.startsWith("Basic ")) credentials = atob(authorization.slice(6));
    } catch { /* Invalid authorization is rejected below. */ }
    const digest = (value: string) => createHash("sha256").update(value).digest();
    if (!expected || !timingSafeEqual(digest(credentials), digest(`admin:${expected}`))) {
      return reject(new NextResponse("Admin login required.", {
        status: 401,
        headers: { "WWW-Authenticate": 'Basic realm="Celtic Worship Admin", charset="UTF-8"', "Cache-Control": "no-store" },
      }));
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      if (request.headers.get("origin") !== request.nextUrl.origin) {
        return reject(NextResponse.json({ error: "Invalid request origin." }, { status: 403 }));
      }
      const length = Number(request.headers.get("content-length"));
      if (!length || length > 32 * 1024 * 1024) {
        return reject(NextResponse.json({ error: "Upload at most 32 MB per request." }, { status: 413 }));
      }
    }
  }
  if (process.env.CHECKOUT_DISABLED === "true" &&
      (pathname.startsWith("/api/shop/checkout") || pathname.startsWith("/api/shop/cart") || pathname === "/api/stems/checkout")) {
    return reject(NextResponse.json(
      { message: "Cart and checkout are disabled on this preview site." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    ));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/store/:path*",
    "/product/:path*",
    "/product-category/:path*",
    "/cart/:path*",
    "/checkout/:path*",
    "/api/shop/checkout/:path*",
    "/api/shop/cart/:path*",
    "/api/stems/checkout",
    "/shop/cart",
    "/shop/checkout",
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
