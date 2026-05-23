import { NextResponse } from "next/server";
import { fetchChannelVideos, YouTubeApiError } from "../../../lib/youtube";

function parseMaxResults(raw: string | null): number {
  if (!raw) return 12;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed)) {
    throw new Error("maxResults must be an integer");
  }

  if (parsed < 1 || parsed > 24) {
    throw new Error("maxResults must be between 1 and 24");
  }

  return parsed;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const pageToken = searchParams.get("pageToken") || undefined;

  let maxResults = 12;
  try {
    maxResults = parseMaxResults(searchParams.get("maxResults"));
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message, code: "BAD_REQUEST" },
      { status: 400 },
    );
  }

  try {
    const data = await fetchChannelVideos({ pageToken, maxResults });
    return NextResponse.json(
      { data },
      {
        status: 200,
        headers: {
          "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    if (error instanceof YouTubeApiError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }

    return NextResponse.json(
      { error: "Unexpected server error", code: "INTERNAL_SERVER_ERROR" },
      { status: 500 },
    );
  }
}
