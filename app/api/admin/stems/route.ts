import { NextResponse } from "next/server";
import {
  createStemTrack,
  getStemTracks,
  isSupportedAudioFile,
  updateStemTrack,
  type StemUploadFile,
} from "../../../lib/stemTracks";
import { sanitizePriceInput } from "../../../lib/prices";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const tracks = await getStemTracks();
  return NextResponse.json({ tracks });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const title = String(formData.get("title") || "").trim();
  const artistName = String(formData.get("artistName") || "").trim();
  const fullStemsPrice = sanitizePriceInput(String(formData.get("fullStemsPrice") || "").trim());
  const stemNames = formData.getAll("stemNames").map((value) => String(value || "").trim());
  const stemPrices = formData
    .getAll("stemPrices")
    .map((value) => sanitizePriceInput(String(value || "").trim()));
  const files = formData
    .getAll("stems")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (!files.length) {
    return NextResponse.json({ error: "Upload at least one stem file." }, { status: 400 });
  }

  const unsupportedFile = files.find((file) => !isSupportedAudioFile(file.name, file.type));
  if (unsupportedFile) {
    return NextResponse.json(
      { error: `${unsupportedFile.name} is not a supported audio file.` },
      { status: 400 },
    );
  }

  const stems: StemUploadFile[] = await Promise.all(
    files.map(async (file, index) => ({
      name: stemNames[index] || file.name.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " "),
      fileName: file.name,
      type: file.type,
      buffer: Buffer.from(await file.arrayBuffer()),
      price: stemPrices[index] || undefined,
    })),
  );

  const track = await createStemTrack({
    title,
    artistName,
    fullStemsPrice,
    stems,
  });

  return NextResponse.json({ track }, { status: 201 });
}

export async function PUT(request: Request) {
  const formData = await request.formData();
  const trackId = String(formData.get("trackId") || "").trim();
  const title = String(formData.get("title") || "").trim();
  const artistName = String(formData.get("artistName") || "").trim();
  const fullStemsPrice = sanitizePriceInput(String(formData.get("fullStemsPrice") || "").trim());
  const existingStemIds = formData.getAll("existingStemIds").map((value) => String(value || "").trim());
  const existingStemNames = formData.getAll("existingStemNames").map((value) => String(value || "").trim());
  const existingStemPrices = formData
    .getAll("existingStemPrices")
    .map((value) => sanitizePriceInput(String(value || "").trim()));
  const newStemNames = formData.getAll("newStemNames").map((value) => String(value || "").trim());
  const newStemPrices = formData
    .getAll("newStemPrices")
    .map((value) => sanitizePriceInput(String(value || "").trim()));
  const files = formData
    .getAll("newStems")
    .filter((value): value is File => value instanceof File && value.size > 0);

  if (!trackId) {
    return NextResponse.json({ error: "A saved stem session is required." }, { status: 400 });
  }

  const unsupportedFile = files.find((file) => !isSupportedAudioFile(file.name, file.type));
  if (unsupportedFile) {
    return NextResponse.json(
      { error: `${unsupportedFile.name} is not a supported audio file.` },
      { status: 400 },
    );
  }

  const newStems: StemUploadFile[] = await Promise.all(
    files.map(async (file, index) => ({
      name: newStemNames[index] || file.name.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " "),
      fileName: file.name,
      type: file.type,
      buffer: Buffer.from(await file.arrayBuffer()),
      price: newStemPrices[index] || undefined,
    })),
  );

  const track = await updateStemTrack({
    trackId,
    title,
    artistName,
    fullStemsPrice,
    existingStems: existingStemIds.map((id, index) => ({
      id,
      name: existingStemNames[index] || "",
      price: existingStemPrices[index] || undefined,
    })),
    newStems,
  });

  if (!track) {
    return NextResponse.json({ error: "Stem session was not found." }, { status: 404 });
  }

  return NextResponse.json({ track });
}
