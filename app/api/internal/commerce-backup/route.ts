import { handleCommerceBackup } from "#commerce-backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleCommerceBackup(request);
}
