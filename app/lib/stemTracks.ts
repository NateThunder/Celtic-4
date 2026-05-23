import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { Stem, Track } from "../components/stem-player/types";
import { sanitizePriceInput } from "./prices";

const STEM_COLORS = [
  "#c97b12",
  "#7f9a63",
  "#8b3f31",
  "#4c7a86",
  "#9d7d31",
  "#735c8f",
  "#b85d2a",
  "#3f6f55",
];

const DATA_DIR = path.join(process.cwd(), "data");
const TRACKS_FILE = path.join(DATA_DIR, "stem-tracks.json");
const PUBLIC_UPLOAD_ROOT = path.join(process.cwd(), "public", "stems", "uploads");
const PUBLIC_UPLOAD_PATH = "/stems/uploads";

export type StemUploadFile = {
  name: string;
  fileName: string;
  type?: string;
  buffer: Buffer;
  price?: string;
};

export type StoredTrack = Track & {
  createdAt: string;
};

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getSafeTrackId(title: string): string {
  const slug = slugify(title) || "stem-session";
  return `${slug}-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
}

function getSafeFileName(fileName: string, index: number): string {
  const extension = path.extname(fileName).toLowerCase().replace(/[^.a-z0-9]/g, "");
  const basename = slugify(path.basename(fileName, extension)) || `stem-${index + 1}`;
  return `${String(index + 1).padStart(2, "0")}-${basename}${extension}`;
}

function isStoredTrack(value: unknown): value is StoredTrack {
  if (!value || typeof value !== "object") return false;
  const track = value as Partial<StoredTrack>;
  return (
    typeof track.id === "string" &&
    typeof track.title === "string" &&
    Array.isArray(track.stems)
  );
}

export function isSupportedAudioFile(fileName: string, type?: string): boolean {
  return (
    Boolean(type?.startsWith("audio/")) ||
    /\.(aac|aiff?|flac|m4a|mp3|ogg|opus|wav|webm)$/i.test(fileName)
  );
}

export async function getStemTracks(): Promise<StoredTrack[]> {
  try {
    const file = await readFile(TRACKS_FILE, "utf8");
    const parsed = JSON.parse(file) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isStoredTrack) : [];
  } catch {
    return [];
  }
}

async function writeStemTracks(tracks: StoredTrack[]) {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(TRACKS_FILE, `${JSON.stringify(tracks, null, 2)}\n`, "utf8");
}

export async function createStemTrack(input: {
  title: string;
  artistName?: string;
  fullStemsPrice?: string;
  stems: StemUploadFile[];
}): Promise<StoredTrack> {
  const title = input.title.trim() || "Untitled Stem Session";
  const trackId = getSafeTrackId(title);
  const trackUploadDir = path.join(PUBLIC_UPLOAD_ROOT, trackId);

  await mkdir(trackUploadDir, { recursive: true });

  const stems: Stem[] = await Promise.all(
    input.stems.map(async (stemFile, index) => {
      const safeFileName = getSafeFileName(stemFile.fileName, index);
      await writeFile(path.join(trackUploadDir, safeFileName), stemFile.buffer);

      return {
        id: `${trackId}-${index + 1}`,
        name: stemFile.name.trim() || `Stem ${index + 1}`,
        fileUrl: `${PUBLIC_UPLOAD_PATH}/${trackId}/${safeFileName}`,
        color: STEM_COLORS[index % STEM_COLORS.length],
        fileName: stemFile.fileName,
        price: sanitizePriceInput(stemFile.price || "") || undefined,
      };
    }),
  );

  const track: StoredTrack = {
    id: trackId,
    title,
    artistName: input.artistName?.trim() || undefined,
    fullStemsPrice: sanitizePriceInput(input.fullStemsPrice || "") || undefined,
    stems,
    createdAt: new Date().toISOString(),
  };

  const existingTracks = await getStemTracks();
  await writeStemTracks([track, ...existingTracks]);

  return track;
}

export async function updateStemTrack(input: {
  trackId: string;
  title: string;
  artistName?: string;
  fullStemsPrice?: string;
  existingStems: Array<{
    id: string;
    name: string;
    price?: string;
  }>;
  newStems: StemUploadFile[];
}): Promise<StoredTrack | null> {
  const existingTracks = await getStemTracks();
  const trackIndex = existingTracks.findIndex((track) => track.id === input.trackId);
  if (trackIndex < 0) return null;

  const currentTrack = existingTracks[trackIndex];
  const nameByStemId = new Map(input.existingStems.map((stem) => [stem.id, stem.name]));
  const priceByStemId = new Map(input.existingStems.map((stem) => [stem.id, stem.price]));
  const updatedExistingStems = currentTrack.stems.map((stem) => ({
    ...stem,
    name: nameByStemId.get(stem.id)?.trim() || stem.name,
    price: sanitizePriceInput(priceByStemId.get(stem.id) || "") || undefined,
  }));

  const trackUploadDir = path.join(PUBLIC_UPLOAD_ROOT, currentTrack.id);
  await mkdir(trackUploadDir, { recursive: true });

  const newStems: Stem[] = await Promise.all(
    input.newStems.map(async (stemFile, index) => {
      const stemIndex = updatedExistingStems.length + index;
      const safeFileName = getSafeFileName(stemFile.fileName, stemIndex);
      await writeFile(path.join(trackUploadDir, safeFileName), stemFile.buffer);

      return {
        id: `${currentTrack.id}-${stemIndex + 1}`,
        name: stemFile.name.trim() || `Stem ${stemIndex + 1}`,
        fileUrl: `${PUBLIC_UPLOAD_PATH}/${currentTrack.id}/${safeFileName}`,
        color: STEM_COLORS[stemIndex % STEM_COLORS.length],
        fileName: stemFile.fileName,
        price: sanitizePriceInput(stemFile.price || "") || undefined,
      };
    }),
  );

  const updatedTrack: StoredTrack = {
    ...currentTrack,
    title: input.title.trim() || currentTrack.title,
    artistName: input.artistName?.trim() || undefined,
    fullStemsPrice: sanitizePriceInput(input.fullStemsPrice || "") || undefined,
    stems: [...updatedExistingStems, ...newStems],
  };

  const nextTracks = [...existingTracks];
  nextTracks[trackIndex] = updatedTrack;
  await writeStemTracks(nextTracks);

  return updatedTrack;
}
