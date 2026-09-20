export async function handleCommerceBackup(_request: Request): Promise<Response> {
  return Response.json(
    { error: "Commerce backups are available only in the Cloudflare Worker runtime." },
    { status: 501 },
  );
}
