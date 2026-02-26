"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";

type FeaturedVideoProps = {
  videoId: string;
  fallbackTitle?: string;
};

export default function FeaturedVideo({ videoId, fallbackTitle = "Featured video" }: FeaturedVideoProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [fetchedTitle, setFetchedTitle] = useState<{ videoId: string; title: string } | null>(null);
  const thumbnailSources = useMemo(
    () => [
      `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
      `https://i.ytimg.com/vi/${videoId}/sddefault.jpg`,
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    ],
    [videoId],
  );
  const [thumbnailState, setThumbnailState] = useState<{ videoId: string; index: number }>({
    videoId,
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

    return `https://www.youtube.com/embed/${videoId}?${params.toString()}`;
  }, [videoId]);

  useEffect(() => {
    const controller = new AbortController();
    const watchUrl = encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`);

    async function loadTitle() {
      try {
        const response = await fetch(
          `https://www.youtube.com/oembed?url=${watchUrl}&format=json`,
          { signal: controller.signal },
        );

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { title?: string };
        const nextTitle = data.title?.trim();

        if (nextTitle) {
          setFetchedTitle({ videoId, title: nextTitle });
        }
      } catch {
        // Keep fallback title when fetching fails.
      }
    }

    loadTitle();

    return () => controller.abort();
  }, [videoId]);

  const resolvedTitle = fetchedTitle?.videoId === videoId ? fetchedTitle.title : fallbackTitle;
  const thumbnailIndex = thumbnailState.videoId === videoId ? thumbnailState.index : 0;
  const thumbnailSrc = thumbnailSources[Math.min(thumbnailIndex, thumbnailSources.length - 1)];

  function handleThumbnailError() {
    setThumbnailState((current) => {
      const currentIndex = current.videoId === videoId ? current.index : 0;

      if (currentIndex >= thumbnailSources.length - 1) {
        return { videoId, index: currentIndex };
      }

      return { videoId, index: currentIndex + 1 };
    });
  }

  return (
    <section className="featured-video-section" aria-label="Featured video">
      <div className="featured-video-inner">
        <h2 className="featured-video-title">{resolvedTitle}</h2>
        <div className="featured-video-frame-wrap">
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
                className="featured-video-poster-image"
                src={thumbnailSrc}
                alt=""
                fill
                sizes="(max-width: 1600px) 96vw, 1600px"
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
      </div>
    </section>
  );
}
