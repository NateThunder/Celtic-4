import { handleProductSync } from "#product-catalog-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleProductSync(request);
}
