"use client";

import Image from "next/image";
import type { FocusEvent } from "react";
import { useEffect, useState } from "react";

const SLIDE_INTERVAL_MS = 5000;

const EVENT_POSTER_SLIDES = [
  {
    src: "/oh holy night poster.jpg",
    alt: "Tickets now live: O Holy Night presented by Celtic Worship and Zerua Music, O2 Academy Glasgow, 17th December 2026.",
    priority: true,
  },
  {
    src: "/then sings poster.png",
    alt: "Celtic Worship: Then Sings My Soul, psalms, hymns and spiritual songs, 7 August 2026 at St Luke's Glasgow and 8 August 2026 at Charlotte Chapel Edinburgh.",
    priority: false,
  },
] as const;

function getQueuedOffset(index: number, activeIndex: number, slideCount: number) {
  const rawOffset = index - activeIndex;
  const halfSlideCount = slideCount / 2;

  if (rawOffset > halfSlideCount) return rawOffset - slideCount;
  if (rawOffset < -halfSlideCount) return rawOffset + slideCount;

  return rawOffset;
}

export default function EventPosterSlider() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const syncReducedMotion = () => {
      setPrefersReducedMotion(mediaQuery.matches);
    };

    syncReducedMotion();
    mediaQuery.addEventListener("change", syncReducedMotion);

    return () => {
      mediaQuery.removeEventListener("change", syncReducedMotion);
    };
  }, []);

  useEffect(() => {
    if (isPaused || prefersReducedMotion || EVENT_POSTER_SLIDES.length <= 1) return;

    const intervalId = window.setInterval(() => {
      setActiveIndex((currentIndex) => (currentIndex + 1) % EVENT_POSTER_SLIDES.length);
    }, SLIDE_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isPaused, prefersReducedMotion]);

  const handleBlur = (event: FocusEvent<HTMLDivElement>) => {
    const nextFocusTarget = event.relatedTarget;

    if (nextFocusTarget instanceof Node && event.currentTarget.contains(nextFocusTarget)) return;

    setIsPaused(false);
  };

  return (
    <div
      className="live-events-poster-banner live-events-poster-slider"
      role="region"
      aria-label="Event poster slider"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={handleBlur}
    >
      <div className="live-events-poster-backdrop-wrap" aria-hidden="true">
        <Image
          className="live-events-poster-backdrop"
          src={EVENT_POSTER_SLIDES[activeIndex].src}
          alt=""
          fill
          sizes="100vw"
          priority={EVENT_POSTER_SLIDES[activeIndex].priority}
        />
      </div>

      <div className="live-events-poster-stage">
        {EVENT_POSTER_SLIDES.map((slide, index) => {
          const isActive = index === activeIndex;
          const queuedOffset = getQueuedOffset(index, activeIndex, EVENT_POSTER_SLIDES.length);
          const queueClass =
            queuedOffset === 0
              ? " is-active"
              : queuedOffset === -1
                ? " is-prev"
                : queuedOffset === 1
                  ? " is-next"
                  : " is-hidden";

          return (
            <div
              key={slide.src}
              className={`live-events-poster-slide${queueClass}`}
              aria-hidden={isActive ? undefined : "true"}
            >
              <Image
                className="live-events-poster-image"
                src={slide.src}
                alt={slide.alt}
                fill
                sizes="(max-width: 700px) 74vw, 32vw"
                priority={slide.priority}
              />
            </div>
          );
        })}
      </div>

      <div className="live-events-poster-dots" aria-label="Choose event poster">
        {EVENT_POSTER_SLIDES.map((slide, index) => (
          <button
            key={slide.src}
            className={`live-events-poster-dot${index === activeIndex ? " is-active" : ""}`}
            type="button"
            aria-label={`Show poster ${index + 1} of ${EVENT_POSTER_SLIDES.length}`}
            aria-current={index === activeIndex ? "true" : undefined}
            onClick={() => setActiveIndex(index)}
          />
        ))}
      </div>
    </div>
  );
}
