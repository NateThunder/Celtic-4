"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type FeaturedVideoProps = {
  videoId: string;
  videos?: Array<{
    videoId: string;
    title: string;
    watchUrl?: string;
  }>;
  fallbackTitle?: string;
  sectionId?: string;
  variant?: "default" | "editorial";
  eyebrow?: string;
  description?: string;
  ctaLabel?: string;
  watchUrl?: string;
  preferFallbackTitle?: boolean;
};

export default function FeaturedVideo({
  videoId,
  videos,
  fallbackTitle = "Featured video",
  sectionId,
  variant = "default",
  eyebrow = "Featured video",
  description,
  ctaLabel = "Watch on YouTube",
  watchUrl,
  preferFallbackTitle = false,
}: FeaturedVideoProps) {
  const videoPlaylist = useMemo(
    () =>
      videos?.length
        ? videos
        : [{ videoId, title: fallbackTitle, watchUrl }],
    [fallbackTitle, videoId, videos, watchUrl],
  );
  const initialVideoIndex = Math.max(
    0,
    videoPlaylist.findIndex((video) => video.videoId === videoId),
  );
  const [activeVideoIndex, setActiveVideoIndex] = useState(initialVideoIndex);
  const [slideDirection, setSlideDirection] = useState<"previous" | "next">("next");
  const activeVideo = videoPlaylist[activeVideoIndex] ?? videoPlaylist[0];
  const activeVideoId = activeVideo.videoId;
  const [isPlaying, setIsPlaying] = useState(false);
  const [fetchedTitle, setFetchedTitle] = useState<{ videoId: string; title: string } | null>(null);
  const thumbnailSources = useMemo(
    () => [
      `https://i.ytimg.com/vi/${activeVideoId}/maxresdefault.jpg`,
      `https://i.ytimg.com/vi/${activeVideoId}/sddefault.jpg`,
      `https://i.ytimg.com/vi/${activeVideoId}/hqdefault.jpg`,
    ],
    [activeVideoId],
  );
  const [thumbnailState, setThumbnailState] = useState<{ videoId: string; index: number }>({
    videoId: activeVideoId,
    index: 0,
  });

  const embedSrc = useMemo(() => {
    const params = new URLSearchParams({
      autoplay: "1",
      rel: "0",
      modestbranding: "1",
      playsinline: "1",
      iv_load_policy: "3",
      cc_load_policy: "0",
      controls: "1",
    });

    return `https://www.youtube.com/embed/${activeVideoId}?${params.toString()}`;
  }, [activeVideoId]);

  useEffect(() => {
    if (videos?.length) {
      return;
    }

    const controller = new AbortController();
    const encodedWatchUrl = encodeURIComponent(
      `https://www.youtube.com/watch?v=${activeVideoId}`,
    );

    async function loadTitle() {
      try {
        const response = await fetch(
          `https://www.youtube.com/oembed?url=${encodedWatchUrl}&format=json`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { title?: string };
        const nextTitle = data.title?.trim();

        if (nextTitle) {
          setFetchedTitle({ videoId: activeVideoId, title: nextTitle });
        }
      } catch {
        // Keep fallback title when fetching fails.
      }
    }

    loadTitle();

    return () => controller.abort();
  }, [activeVideoId, videos]);

  const resolvedTitle =
    videos?.length
      ? activeVideo.title
      : !preferFallbackTitle && fetchedTitle?.videoId === activeVideoId
        ? fetchedTitle.title
        : fallbackTitle;
  const thumbnailIndex =
    thumbnailState.videoId === activeVideoId ? thumbnailState.index : 0;
  const thumbnailSrc = thumbnailSources[Math.min(thumbnailIndex, thumbnailSources.length - 1)];
  const resolvedWatchUrl =
    activeVideo.watchUrl || `https://www.youtube.com/watch?v=${activeVideoId}`;
  const titleSizeClass =
    resolvedTitle.length > 28
      ? "featured-video-title--long"
      : resolvedTitle.length > 17
        ? "featured-video-title--medium"
        : "featured-video-title--short";

  function selectVideo(direction: -1 | 1) {
    setSlideDirection(direction === 1 ? "next" : "previous");
    setActiveVideoIndex((current) => {
      const next = (current + direction + videoPlaylist.length) % videoPlaylist.length;
      return next;
    });
    setIsPlaying(false);
  }

  function handleThumbnailError() {
    setThumbnailState((current) => {
      const currentIndex = current.videoId === activeVideoId ? current.index : 0;

      if (currentIndex >= thumbnailSources.length - 1) {
        return { videoId: activeVideoId, index: currentIndex };
      }

      return { videoId: activeVideoId, index: currentIndex + 1 };
    });
  }

  const renderTitle = () => (
    <div className="featured-video-title-row">
      {videoPlaylist.length > 1 ? (
        <button
          type="button"
          className="featured-video-arrow featured-video-arrow--previous"
          onClick={() => selectVideo(-1)}
          aria-label="Show previous video"
        >
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <path d="m27.5 16-8 8 8 8" />
          </svg>
        </button>
      ) : null}
      <h2
        key={activeVideoId}
        className={`featured-video-title ${titleSizeClass} featured-video-slide featured-video-slide--${slideDirection}`}
        aria-live="polite"
      >
        {resolvedTitle}
      </h2>
      {videoPlaylist.length > 1 ? (
        <button
          type="button"
          className="featured-video-arrow featured-video-arrow--next"
          onClick={() => selectVideo(1)}
          aria-label="Show next video"
        >
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <path d="m20.5 16 8 8-8 8" />
          </svg>
        </button>
      ) : null}
    </div>
  );

  const renderVideoFrame = (sizes: string) => (
    <div
      key={activeVideoId}
      className={`featured-video-frame-wrap featured-video-slide featured-video-slide--${slideDirection}`}
    >
      {isPlaying ? (
        <iframe
          className="featured-video-frame"
          src={embedSrc}
          title={resolvedTitle}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          className="featured-video-poster"
          onClick={() => setIsPlaying(true)}
          aria-label={`Play video: ${resolvedTitle}`}
        >
          <Image
            key={activeVideoId}
            className="featured-video-poster-image"
            src={thumbnailSrc}
            alt=""
            fill
            sizes={sizes}
            unoptimized
            onError={handleThumbnailError}
            aria-hidden="true"
          />
          <span className="featured-video-poster-overlay" aria-hidden="true" />
          <span className="featured-video-play-button" aria-hidden="true">
            <svg viewBox="0 0 64 64" focusable="false">
              <path d="M24 18v28l22-14-22-14Z" />
            </svg>
          </span>
        </button>
      )}
    </div>
  );

  if (variant === "editorial") {
    return (
      <section
        id={sectionId}
        className="featured-video-section featured-video-section--editorial"
        aria-label="Featured video"
      >
        {videoPlaylist.map((video) => (
          <link
            key={video.videoId}
            rel="preload"
            as="image"
            href={`https://i.ytimg.com/vi/${video.videoId}/maxresdefault.jpg`}
          />
        ))}
        <div className="featured-video-editorial-inner">
          {renderVideoFrame("(max-width: 900px) 92vw, 700px")}
          <div className="featured-video-copy">
            <p className="featured-video-kicker">{eyebrow}</p>
            {renderTitle()}
            {description ? <p className="featured-video-description">{description}</p> : null}
            <a
              className="featured-video-link"
              href={resolvedWatchUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              {ctaLabel}
            </a>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id={sectionId} className="featured-video-section" aria-label="Featured video">
      <div className="featured-video-inner">
        {renderTitle()}
        {renderVideoFrame("(max-width: 1600px) 96vw, 1600px")}
      </div>
    </section>
  );
}
