import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { StoredTrack } from "./stemTracks";

const tracksFile = path.join(process.cwd(), "data", "stem-tracks.json");
const stemUploadsDirectory = path.join(process.cwd(), "public", "stems", "uploads");
const stemUploadsUrlPrefix = "stems/uploads/";

function getStemAudioPath(key: string): string {
  const relativeKey = key.startsWith(stemUploadsUrlPrefix)
    ? key.slice(stemUploadsUrlPrefix.length)
    : key;
  const parts = relativeKey.split("/");

  if (
    parts.length !== 2 ||
    parts.some((part) => !/^[a-zA-Z0-9._-]+$/.test(part) || part === "." || part === "..")
  ) {
    throw new Error("Invalid stem audio key");
  }

  return path.join(stemUploadsDirectory, ...parts);
}

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
  const file = getStemAudioPath(key);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, buffer);
}

export async function readAudio(key: string, request: Request): Promise<Response> {
  try {
    const bytes = await readFile(getStemAudioPath(key));
    return new Response(request.method === "HEAD" ? null : new Uint8Array(bytes), {
      headers: { "Content-Type": "application/octet-stream", "Content-Length": String(bytes.length) },
    });
  } catch { return new Response("Not found", { status: 404 }); }
}
