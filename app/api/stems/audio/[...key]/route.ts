import { readAudio } from "#stem-storage";
// Stream audio through a dynamic API route so it bypasses static asset routing.

export async function GET(request: Request, context: { params: Promise<{ key: string[] }> }) {
  const { key } = await context.params;
  if (key.length !== 2 || key.some(part => !/^[a-zA-Z0-9._-]+$/.test(part) || part === "..")) {
    return new Response("Not found", { status: 404 });
  }
  return readAudio(`stems/uploads/${key.join("/")}`, request);
}

export const HEAD = GET;
