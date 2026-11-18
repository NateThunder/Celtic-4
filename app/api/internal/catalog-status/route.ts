import { NextResponse } from "next/server";
import { readProductCatalog, readProductCatalogStatus } from "#product-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Shows whether the shop is reading live WooCommerce data, and the last error if not.
// It contains no customer data or keys, only counts, times, the error message
// and the commit the running build was made from.
export async function GET() {
  await readProductCatalog();
  return NextResponse.json(
    { ...readProductCatalogStatus(), commit: process.env.BUILD_COMMIT ?? "unknown" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
