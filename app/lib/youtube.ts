export type YouTubeVideoFormat = "video" | "short";

export type YouTubeVideoItem = {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  publishedAt: string;
  videoUrl: string;
  embedUrl: string;
  format: YouTubeVideoFormat;
};

export type YouTubeVideosResponse = {
  videos: YouTubeVideoItem[];
  nextPageToken: string | null;
};

export type FetchChannelVideosOptions = {
  pageToken?: string;
  maxResults?: number;
};

export type YouTubeErrorCode =
  | "MISSING_YOUTUBE_CONFIG"
  | "YOUTUBE_REQUEST_FAILED"
  | "YOUTUBE_INVALID_RESPONSE";

export class YouTubeApiError extends Error {
  code: YouTubeErrorCode;
  status: number;

  constructor(code: YouTubeErrorCode, message: string, status = 500) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

type RawYouTubeSearchItem = {
  id?: {
    videoId?: string;
  };
  snippet?: {
    title?: string;
    description?: string;
    publishedAt?: string;
    thumbnails?: {
      maxres?: { url?: string };
      standard?: { url?: string };
      high?: { url?: string };
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
};

type RawYouTubeSearchResponse = {
  nextPageToken?: string;
  items?: RawYouTubeSearchItem[];
};

const DEFAULT_CHANNEL_ID = "UCpdiqrcXJZ_nMA4_Z_lR9KA";
const DEFAULT_CHANNEL_HANDLE = "@CelticWorshipMusic";
const YOUTUBE_WEB_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
};

function getChannelId() {
  return process.env.YOUTUBE_CHANNEL_ID?.trim() || DEFAULT_CHANNEL_ID;
}

function getChannelHandle() {
  const handle = process.env.YOUTUBE_CHANNEL_HANDLE?.trim() || DEFAULT_CHANNEL_HANDLE;
  return handle.startsWith("@") ? handle : `@${handle.replace(/^\/+|\/+$/g, "")}`;
}

function pickThumbnail(item: RawYouTubeSearchItem): string {
  const thumbs = item.snippet?.thumbnails;
  return (
    thumbs?.maxres?.url ||
    thumbs?.standard?.url ||
    thumbs?.high?.url ||
    thumbs?.medium?.url ||
    thumbs?.default?.url ||
    ""
  );
}

function decodeXml(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|amp|lt|gt|quot|apos);/g, (entity, code: string) => {
    if (code === "amp") return "&";
    if (code === "lt") return "<";
    if (code === "gt") return ">";
    if (code === "quot") return '"';
    if (code === "apos") return "'";

    const isHex = code.toLowerCase().startsWith("#x");
    const parsed = Number.parseInt(code.slice(isHex ? 2 : 1), isHex ? 16 : 10);
    return Number.isFinite(parsed) ? String.fromCodePoint(parsed) : entity;
  });
}

function decodeJsonText(value: string): string {
  try {
    return JSON.parse(`"${value}"`) as string;
  } catch {
    return value
      .replace(/\\u0026/g, "&")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\")
      .trim();
  }
}

function readTag(block: string, tagName: string): string {
  const match = block.match(new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`));
  return decodeXml(match?.[1] || "").trim();
}

function readAttribute(block: string, tagName: string, attributeName: string): string {
  const match = block.match(new RegExp(`<${tagName}\\b[^>]*\\b${attributeName}="([^"]+)"[^>]*>`));
  return decodeXml(match?.[1] || "").trim();
}

function readAlternateUrl(block: string): string {
  const match = block.match(/<link\b(?=[^>]*\brel="alternate")[^>]*\bhref="([^"]+)"[^>]*>/);
  return decodeXml(match?.[1] || "").trim();
}

function inferVideoFormat({
  videoUrl,
  title,
  description,
}: {
  videoUrl: string;
  title: string;
  description: string;
}): YouTubeVideoFormat {
  const searchableText = `${videoUrl} ${title} ${description}`.toLowerCase();

  if (videoUrl.includes("/shorts/") || /(^|\s)#(?:yt)?shorts?\b/.test(searchableText)) {
    return "short";
  }

  return "video";
}

function getUniqueVideoIds(html: string, pattern: RegExp, maxResults: number): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const match of html.matchAll(pattern)) {
    const id = match[1];

    if (!id || seen.has(id)) {
      continue;
    }

    seen.add(id);
    ids.push(id);

    if (ids.length >= maxResults) {
      break;
    }
  }

  return ids;
}

function buildThumbnailUrl(id: string, format: YouTubeVideoFormat): string {
  if (format === "short") {
    return `https://i.ytimg.com/vi/${id}/frame0.jpg`;
  }

  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

function parseVideoTab(html: string, maxResults: number): YouTubeVideoItem[] {
  const ids = getUniqueVideoIds(html, /"videoId":"([^"]+)"/g, maxResults);

  return ids.map((id) => {
    const videoIndex = html.indexOf(`"videoId":"${id}"`);
    const block = html.slice(videoIndex, videoIndex + 12000);
    const title = decodeJsonText(
      block.match(/lockupMetadataViewModel":\{"title":\{"content":"((?:\\.|[^"\\])*)"/)?.[1] ||
        "Untitled",
    );
    const publishedAt = decodeJsonText(
      block.match(/metadataRows":\[\{"metadataParts":\[\{"text":\{"content":"(?:\\.|[^"\\])*"\}\},\{"text":\{"content":"((?:\\.|[^"\\])*)"/)?.[1] ||
        "",
    );

    return {
      id,
      title,
      description: "",
      thumbnailUrl: buildThumbnailUrl(id, "video"),
      publishedAt,
      videoUrl: `https://www.youtube.com/watch?v=${id}`,
      embedUrl: `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`,
      format: "video",
    };
  });
}

function parseShortsTitle(accessibilityText: string): string {
  return accessibilityText
    .replace(/, [^,]+ views?[\s\u2013-]+play Short$/i, "")
    .replace(/[\s\u2013-]+play Short$/i, "")
    .trim();
}

function parseShortsTab(html: string, maxResults: number): YouTubeVideoItem[] {
  const ids = getUniqueVideoIds(html, /"reelWatchEndpoint":\{"videoId":"([^"]+)"/g, maxResults);

  return ids.map((id) => {
    const videoIndex = html.indexOf(`"videoId":"${id}"`);
    const blockBeforeVideoId = html.slice(Math.max(0, videoIndex - 2600), videoIndex);
    const accessibilityMatches = Array.from(
      blockBeforeVideoId.matchAll(/"accessibilityText":"((?:\\.|[^"\\])*)"/g),
    );
    const accessibilityText = decodeJsonText(accessibilityMatches.at(-1)?.[1] || "");
    const title = parseShortsTitle(accessibilityText) || "Untitled Short";

    return {
      id,
      title,
      description: "",
      thumbnailUrl: buildThumbnailUrl(id, "short"),
      publishedAt: "",
      videoUrl: `https://www.youtube.com/shorts/${id}`,
      embedUrl: `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`,
      format: "short",
    };
  });
}

async function fetchYouTubeTab(tab: "videos" | "shorts"): Promise<string> {
  const handle = getChannelHandle();
  const res = await fetch(`https://www.youtube.com/${handle}/${tab}`, {
    headers: YOUTUBE_WEB_HEADERS,
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new YouTubeApiError(
      "YOUTUBE_REQUEST_FAILED",
      `Failed to fetch YouTube ${tab} tab`,
      502,
    );
  }

  return res.text();
}

async function fetchChannelVideosFromTabs(maxResults: number): Promise<YouTubeVideosResponse> {
  const [videosHtml, shortsHtml] = await Promise.all([
    fetchYouTubeTab("videos"),
    fetchYouTubeTab("shorts"),
  ]);
  const videos = [...parseVideoTab(videosHtml, maxResults), ...parseShortsTab(shortsHtml, maxResults)];

  if (!videos.length) {
    throw new YouTubeApiError(
      "YOUTUBE_INVALID_RESPONSE",
      "YouTube tabs did not include any videos",
      502,
    );
  }

  return {
    videos,
    nextPageToken: null,
  };
}

function parseYouTubeFeed(xml: string, maxResults: number): YouTubeVideosResponse {
  const entries = Array.from(xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g));

  const videos: YouTubeVideoItem[] = entries
    .map((entry) => {
      const block = entry[1];
      const id = readTag(block, "yt:videoId");
      if (!id) return null;
      const title = readTag(block, "media:title") || readTag(block, "title") || "Untitled";
      const description = readTag(block, "media:description");
      const videoUrl = readAlternateUrl(block) || `https://www.youtube.com/watch?v=${id}`;

      return {
        id,
        title,
        description,
        thumbnailUrl: readAttribute(block, "media:thumbnail", "url"),
        publishedAt: readTag(block, "published"),
        videoUrl,
        embedUrl: `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`,
        format: inferVideoFormat({ videoUrl, title, description }),
      };
    })
    .filter((video): video is YouTubeVideoItem => Boolean(video))
    .slice(0, maxResults);

  return {
    videos,
    nextPageToken: null,
  };
}

async function fetchChannelVideosFromFeed(maxResults: number): Promise<YouTubeVideosResponse> {
  const channelId = getChannelId();
  const params = new URLSearchParams({ channel_id: channelId });
  const res = await fetch(`https://www.youtube.com/feeds/videos.xml?${params.toString()}`, {
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    throw new YouTubeApiError("YOUTUBE_REQUEST_FAILED", "Failed to fetch YouTube feed", 502);
  }

  const xml = await res.text();
  const data = parseYouTubeFeed(xml, maxResults);

  if (!data.videos.length) {
    throw new YouTubeApiError(
      "YOUTUBE_INVALID_RESPONSE",
      "YouTube feed did not include any videos",
      502,
    );
  }

  return data;
}

async function fetchChannelVideosFromApi(
  options: FetchChannelVideosOptions,
  apiKey: string,
): Promise<YouTubeVideosResponse> {
  const channelId = getChannelId();
  const maxResults = options.maxResults ?? 12;
  const params = new URLSearchParams({
    part: "snippet",
    channelId,
    type: "video",
    order: "date",
    maxResults: String(maxResults),
    key: apiKey,
  });

  if (options.pageToken) {
    params.set("pageToken", options.pageToken);
  }

  const res = await fetch(`https://www.googleapis.com/youtube/v3/search?${params.toString()}`, {
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    let message = "Failed to fetch YouTube videos";

    try {
      const body = (await res.json()) as { error?: { message?: string } };
      message = body.error?.message || message;
    } catch {
      const text = await res.text();
      if (text) message = text;
    }

    throw new YouTubeApiError("YOUTUBE_REQUEST_FAILED", message, 502);
  }

  const payload = (await res.json()) as RawYouTubeSearchResponse;
  if (!payload || !Array.isArray(payload.items)) {
    throw new YouTubeApiError(
      "YOUTUBE_INVALID_RESPONSE",
      "YouTube response did not include a valid items array",
      502,
    );
  }

  const videos: YouTubeVideoItem[] = payload.items
    .map((item) => {
      const id = item.id?.videoId;
      if (!id) return null;
      const title = item.snippet?.title || "Untitled";
      const description = item.snippet?.description || "";
      const videoUrl = `https://www.youtube.com/watch?v=${id}`;

      return {
        id,
        title,
        description,
        thumbnailUrl: pickThumbnail(item),
        publishedAt: item.snippet?.publishedAt || "",
        videoUrl,
        embedUrl: `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`,
        format: inferVideoFormat({ videoUrl, title, description }),
      };
    })
    .filter((video): video is YouTubeVideoItem => Boolean(video));

  return {
    videos,
    nextPageToken: payload.nextPageToken || null,
  };
}

export async function fetchChannelVideos(
  options: FetchChannelVideosOptions = {},
): Promise<YouTubeVideosResponse> {
  const apiKey = process.env.YOUTUBE_API_KEY?.trim();

  if (options.pageToken) {
    throw new YouTubeApiError(
      "MISSING_YOUTUBE_CONFIG",
      "This YouTube feed does not support loading additional pages yet",
      500,
    );
  }

  try {
    return await fetchChannelVideosFromTabs(options.maxResults ?? 12);
  } catch (error) {
    if (apiKey) {
      return fetchChannelVideosFromApi(options, apiKey);
    }

    try {
      return await fetchChannelVideosFromFeed(options.maxResults ?? 12);
    } catch {
      throw error;
    }
  }
}
