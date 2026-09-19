import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StoredTrack } from "./stemTracks";

const tracksFile = path.join(process.cwd(), "data", "stem-tracks.json");
export const audioUrl = (key: string) => `/${key}`;

export async function readTracks(): Promise<StoredTrack[]> {
  try {
    const value = JSON.parse(await readFile(tracksFile, "utf8"));
    return Array.isArray(value) ? value : [];
  } catch { return []; }
}

export async function saveTrack(track: StoredTrack) {
  const tracks = await readTracks();
  const index = tracks.findIndex(item => item.id === track.id);
  if (index < 0) tracks.unshift(track);
  else tracks[index] = track;
  await mkdir(path.dirname(tracksFile), { recursive: true });
  await writeFile(tracksFile, `${JSON.stringify(tracks, null, 2)}\n`, "utf8");
}

export async function saveAudio(key: string, buffer: Buffer, _contentType?: string) {
  const file = path.join(process.cwd(), "public", key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, buffer);
}

export async function readAudio(key: string, request: Request): Promise<Response> {
  try {
    const bytes = await readFile(path.join(process.cwd(), "public", key));
    return new Response(request.method === "HEAD" ? null : new Uint8Array(bytes), {
      headers: { "Content-Type": "application/octet-stream", "Content-Length": String(bytes.length) },
    });
  } catch { return new Response("Not found", { status: 404 }); }
}
