"use client";

import Image from "next/image";
import type { CSSProperties, FocusEvent, PointerEvent } from "react";
import { useEffect, useRef, useState } from "react";

const SLIDE_INTERVAL_MS = 5000;
const SWIPE_THRESHOLD_PX = 56;
const HORIZONTAL_INTENT_PX = 8;

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

function getWrappedSlideIndex(index: number, offset: number, slideCount: number) {
  return (index + offset + slideCount) % slideCount;
}

export default function EventPosterSlider() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef<{ pointerId: number; x: number; y: number; isHorizontal: boolean } | null>(null);
  const dragOffsetRef = useRef(0);

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
      setActiveIndex((currentIndex) =>
        getWrappedSlideIndex(currentIndex, 1, EVENT_POSTER_SLIDES.length),
      );
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

  const finishDrag = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragStart.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (drag.isHorizontal && Math.abs(dragOffsetRef.current) >= SWIPE_THRESHOLD_PX) {
      setActiveIndex((currentIndex) => {
        const direction = dragOffsetRef.current < 0 ? 1 : -1;
        return getWrappedSlideIndex(currentIndex, direction, EVENT_POSTER_SLIDES.length);
      });
    }

    dragStart.current = null;
    dragOffsetRef.current = 0;
    setDragOffset(0);
    setIsDragging(false);
    setIsPaused(false);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || event.target instanceof HTMLButtonElement) return;

    dragStart.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, isHorizontal: false };
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsPaused(true);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragStart.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - drag.x;
    const deltaY = event.clientY - drag.y;

    if (!drag.isHorizontal) {
      if (Math.abs(deltaX) < HORIZONTAL_INTENT_PX && Math.abs(deltaY) < HORIZONTAL_INTENT_PX) return;
      if (Math.abs(deltaY) >= Math.abs(deltaX)) {
        dragStart.current = null;
        setIsPaused(false);
        return;
      }

      drag.isHorizontal = true;
      setIsDragging(true);
    }

    event.preventDefault();
    dragOffsetRef.current = deltaX;
    setDragOffset(deltaX);
  };

  const dragStyle = { "--live-events-drag-x": `${dragOffset}px` } as CSSProperties;

  return (
    <div
      role="region"
      aria-label="Event poster slider"
      className={`live-events-poster-banner live-events-poster-slider${isDragging ? " is-dragging" : ""}`}
      style={dragStyle}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={handleBlur}
      onDragStart={(event) => event.preventDefault()}
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

      <div
        className="live-events-poster-stage"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
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
                draggable={false}
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
