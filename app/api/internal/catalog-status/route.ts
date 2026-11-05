import { NextResponse } from "next/server";
import { readProductCatalog, readProductCatalogStatus } from "#product-catalog";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Shows whether the shop is reading live WooCommerce data, and the last error if not.
// It contains no customer data or keys, only counts, times and the error message.
export async function GET() {
  await readProductCatalog();
  return NextResponse.json(readProductCatalogStatus(), { headers: { "Cache-Control": "no-store" } });
}
