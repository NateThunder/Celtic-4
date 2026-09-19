export async function handleProductSync(_request: Request): Promise<Response> {
  return Response.json({ error: "Product sync is available in the Cloudflare Worker runtime." }, { status: 501 });
}
