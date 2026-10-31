"use client";

import Image from "next/image";
import type { CSSProperties, FocusEvent, PointerEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

const SLIDE_INTERVAL_MS = 5000;
const SWIPE_THRESHOLD_PX = 56;
const HORIZONTAL_INTENT_PX = 8;

const EVENT_POSTER_SLIDES = [
  {
    src: "/oh holy night poster.jpg",
    alt: "Tickets now live: O Holy Night presented by Celtic Worship and Zerua Music, O2 Academy Glasgow, 17th December 2026.",
    priority: true,
    // Words in the matching row of the events list, so hovering that show brings its poster up.
    match: ["o2 academy"],
  },
  {
    src: "/posters/2026-12-19-surhuisterveen-de-flambou-large.jpg",
    alt: "Strandheem Festival presents Kerst met Celtic Worship, Saturday 19 December 2026, De Flambou, Surhuisterveen. Doors 18:00, starts 19:30, tickets from 30 euros.",
    priority: false,
    match: ["flambou", "surhuisterveen"],
  },
  {
    src: "/posters/2026-12-20-dordrecht-jozua-large.jpg",
    alt: "Events for Christ presents Celtic Worship Christmas, Sunday 20 December 2026, Jozua, Dordrecht. Doors 19:30, starts 20:00, tickets from 35 euros.",
    priority: false,
    match: ["jozua", "joshua", "dordrecht"],
  },
  {
    src: "/posters/2026-12-21-veenendaal-de-regenboog-large.jpg",
    alt: "Events for Christ presents Celtic Worship Christmas, Monday 21 December 2026, De Regenboog, Veenendaal. Doors 19:30, starts 20:00, tickets from 35 euros.",
    priority: false,
    match: ["regenboog", "veenendaal"],
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
  // Which way the posters last moved, and whether the incoming one is being placed
  // (without animation) on the side it will slide in from.
  const [direction, setDirection] = useState<1 | -1>(1);
  const [priming, setPriming] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [listHover, setListHover] = useState(false);
  const activeRef = useRef(0);
  const stageRef = useRef<HTMLDivElement>(null);
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

  const goTo = useCallback((target: number) => {
    const count = EVENT_POSTER_SLIDES.length;
    const offset = getQueuedOffset(target, activeRef.current, count);
    if (offset === 0) return;
    const dir: 1 | -1 = offset > 0 ? 1 : -1;
    activeRef.current = target;
    // Park the incoming poster on the side it comes in from, then move everything.
    setDirection(dir);
    setPriming(true);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setPriming(false);
        setActiveIndex(target);
      }),
    );
  }, []);

  const step = useCallback(
    (by: 1 | -1) => goTo(getWrappedSlideIndex(activeRef.current, by, EVENT_POSTER_SLIDES.length)),
    [goTo],
  );

  useEffect(() => {
    if (isPaused || listHover || prefersReducedMotion || EVENT_POSTER_SLIDES.length <= 1) return;

    const intervalId = window.setInterval(() => step(1), SLIDE_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [isPaused, listHover, prefersReducedMotion, step]);

  // Hovering a show in the events list brings up its poster, like the homepage.
  useEffect(() => {
    const onOver = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      const list = target?.closest(".live-events-standalone .bandsintown-widget-shell");
      if (!list) {
        setListHover(false);
        return;
      }
      setListHover(true);
      const row = target?.closest(".bit-event");
      if (!row) return;
      const text = (row.textContent ?? "").toLowerCase();
      const index = EVENT_POSTER_SLIDES.findIndex((slide) => slide.match.some((word) => text.includes(word)));
      if (index >= 0) goTo(index);
    };
    document.addEventListener("mouseover", onOver);
    return () => document.removeEventListener("mouseover", onOver);
  }, [goTo]);

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
      step(dragOffsetRef.current < 0 ? 1 : -1);
    } else if (!drag.isHorizontal) {
      // A tap on the poster to the left or right moves to it.
      const active = stageRef.current?.querySelector(".live-events-poster-slide.is-active");
      const box = active?.getBoundingClientRect();
      if (box && event.clientX < box.left) step(-1);
      else if (box && event.clientX > box.right) step(1);
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
        ref={stageRef}
        className="live-events-poster-stage"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
      >
        {EVENT_POSTER_SLIDES.map((slide, index) => {
          const isActive = index === activeIndex;
          const queuedOffset = getQueuedOffset(index, activeIndex, EVENT_POSTER_SLIDES.length);
          // Hidden posters wait off to one side: the side they left by, or, just before
          // a move, the side the next one comes in from.
          const hiddenSide = (priming ? direction : -direction) > 0 ? " is-hidden-right" : " is-hidden-left";
          const queueClass =
            queuedOffset === 0
              ? " is-active"
              : queuedOffset === -1
                ? " is-prev"
                : queuedOffset === 1
                  ? " is-next"
                  : ` is-hidden${hiddenSide}${priming ? " is-snap" : ""}`;

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
            onClick={() => goTo(index)}
          />
        ))}
      </div>
    </div>
  );
}
