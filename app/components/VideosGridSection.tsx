"use client";

import { useEffect, useState } from "react";
import styles from "./videosGrid.module.css";
import type { YouTubeVideoItem } from "../lib/youtube";

type ApiResponse = {
  data?: {
    videos: YouTubeVideoItem[];
    nextPageToken: string | null;
  };
  error?: string;
  code?: string;
};

type VideoTab = "videos" | "shorts";

function formatDate(value: string): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1)}...`;
}

function VideoCard({
  video,
  isShort,
  onSelect,
}: {
  video: YouTubeVideoItem;
  isShort: boolean;
  onSelect: (video: YouTubeVideoItem) => void;
}) {
  const cardClassName = `${styles.card}${isShort ? ` ${styles.shortCard}` : ""}`;

  return (
    <button
      type="button"
      onClick={() => onSelect(video)}
      className={cardClassName}
      aria-label={`Play ${video.title}`}
    >
      <span
        className={styles.thumbnail}
        style={{ backgroundImage: `url(${video.thumbnailUrl})` }}
        aria-hidden="true"
      >
        <span className={styles.playMark} aria-hidden="true">
          <svg viewBox="0 0 64 64" focusable="false">
            <path d="M24 18v28l22-14-22-14Z" />
          </svg>
        </span>
      </span>
      <span className={styles.cardCopy}>
        {formatDate(video.publishedAt) ? (
          <span className={styles.date}>{formatDate(video.publishedAt)}</span>
        ) : null}
        <span className={styles.cardTitle}>{video.title}</span>
        {video.description ? (
          <span className={styles.description}>
            {truncate(video.description, isShort ? 86 : 120)}
          </span>
        ) : null}
      </span>
    </button>
  );
}

export default function VideosGridSection() {
  const [videos, setVideos] = useState<YouTubeVideoItem[]>([]);
  const [status, setStatus] = useState<"loading" | "idle" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<YouTubeVideoItem | null>(null);
  const [activeTab, setActiveTab] = useState<VideoTab>("videos");

  async function loadVideos({
    pageToken,
    append = false,
  }: {
    pageToken?: string;
    append?: boolean;
  }) {
    if (append) {
      setIsLoadingMore(true);
    } else {
      setStatus("loading");
      setErrorMessage("");
    }

    const params = new URLSearchParams({ maxResults: "24" });
    if (pageToken) params.set("pageToken", pageToken);

    try {
      const res = await fetch(`/api/youtube/videos?${params.toString()}`);
      const json = (await res.json()) as ApiResponse;

      if (!res.ok || !json.data) {
        const message =
          json.code === "MISSING_YOUTUBE_CONFIG"
            ? "Add YOUTUBE_API_KEY to load more videos from YouTube."
            : json.error || "Could not load videos right now.";
        throw new Error(message);
      }

      setVideos((prev) => (append ? [...prev, ...json.data!.videos] : json.data!.videos));
      setNextPageToken(json.data.nextPageToken ?? null);
      setStatus("idle");
    } catch (error) {
      setErrorMessage((error as Error).message);
      setStatus("error");
    } finally {
      setIsLoadingMore(false);
    }
  }

  useEffect(() => {
    void loadVideos({});
  }, []);

  useEffect(() => {
    if (!selectedVideo) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedVideo(null);
    };
    const previousOverflow = document.body.style.overflow;

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [selectedVideo]);

  const regularVideos = videos.filter((video) => video.format !== "short");
  const shorts = videos.filter((video) => video.format === "short");
  const activeVideos = activeTab === "videos" ? regularVideos : shorts;
  const isShortsTab = activeTab === "shorts";
  const gridClassName = `${styles.grid}${isShortsTab ? ` ${styles.shortsGrid}` : ""}`;
  const emptyMessage =
    activeTab === "videos"
      ? "No videos found in the latest uploads."
      : "No Shorts found in the latest uploads.";

  return (
    <section className={styles.section} aria-label="Celtic Worship videos">
      <div className={styles.inner}>
        {status === "loading" ? <div className={styles.status}>Loading videos...</div> : null}

        {status === "error" ? (
          <div className={`${styles.status} ${styles.error}`}>{errorMessage}</div>
        ) : null}

        {status === "idle" && videos.length === 0 ? (
          <div className={styles.status}>No videos found.</div>
        ) : null}

        {status === "idle" && videos.length > 0 ? (
          <>
            <div className={styles.tabShell}>
              <div className={styles.tabList} role="tablist" aria-label="Video categories">
                <button
                  type="button"
                  className={`${styles.tabButton}${activeTab === "videos" ? ` ${styles.activeTab}` : ""}`}
                  role="tab"
                  aria-selected={activeTab === "videos"}
                  aria-controls="videos-panel"
                  id="videos-tab"
                  onClick={() => setActiveTab("videos")}
                >
                  Videos
                  <span>{regularVideos.length}</span>
                </button>
                <button
                  type="button"
                  className={`${styles.tabButton}${activeTab === "shorts" ? ` ${styles.activeTab}` : ""}`}
                  role="tab"
                  aria-selected={activeTab === "shorts"}
                  aria-controls="shorts-panel"
                  id="shorts-tab"
                  onClick={() => setActiveTab("shorts")}
                >
                  Shorts
                  <span>{shorts.length}</span>
                </button>
              </div>

              <div
                id={activeTab === "videos" ? "videos-panel" : "shorts-panel"}
                className={styles.tabPanel}
                role="tabpanel"
                aria-labelledby={activeTab === "videos" ? "videos-tab" : "shorts-tab"}
              >
                {activeVideos.length > 0 ? (
                  <div className={gridClassName}>
                    {activeVideos.map((video) => (
                      <VideoCard
                        key={video.id}
                        video={video}
                        isShort={isShortsTab}
                        onSelect={setSelectedVideo}
                      />
                    ))}
                  </div>
                ) : (
                  <div className={styles.status}>{emptyMessage}</div>
                )}
              </div>
            </div>

            {nextPageToken ? (
              <div className={styles.actions}>
                <button
                  type="button"
                  onClick={() => void loadVideos({ pageToken: nextPageToken, append: true })}
                  disabled={isLoadingMore}
                  className={styles.moreButton}
                >
                  {isLoadingMore ? "Loading..." : "Show More"}
                </button>
              </div>
            ) : null}
          </>
        ) : null}
      </div>

      {selectedVideo ? (
        <div className={styles.modal} role="dialog" aria-modal="true" aria-label={selectedVideo.title}>
          <button
            type="button"
            onClick={() => setSelectedVideo(null)}
            aria-label="Close video player"
            className={styles.modalBackdrop}
          />
          <div className={styles.modalPanel}>
            <div className={styles.modalHeader}>
              <h2>{selectedVideo.title}</h2>
              <button
                type="button"
                onClick={() => setSelectedVideo(null)}
                className={styles.closeButton}
              >
                Close
              </button>
            </div>
            <div className={styles.player}>
              <iframe
                src={`${selectedVideo.embedUrl}&autoplay=1`}
                title={selectedVideo.title}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
              />
            </div>
            <div className={styles.modalFooter}>
              <p>{formatDate(selectedVideo.publishedAt)}</p>
              <a href={selectedVideo.videoUrl} target="_blank" rel="noreferrer">
                Watch on YouTube
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
