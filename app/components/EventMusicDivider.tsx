"use client";

import { useEffect, useRef } from "react";

export default function EventMusicDivider() {
  const dividerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const divider = dividerRef.current;
    if (!divider) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;

    const update = () => {
      animationFrame = 0;

      if (reducedMotion.matches) {
        divider.style.setProperty("--event-music-line-progress", "1");
        return;
      }

      const bounds = divider.getBoundingClientRect();
      const start = window.innerHeight * 0.88;
      const finish = window.innerHeight * 0.38;
      const progress = Math.min(1, Math.max(0, (start - bounds.top) / (start - finish)));

      divider.style.setProperty("--event-music-line-progress", progress.toFixed(4));
    };

    const requestUpdate = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    reducedMotion.addEventListener("change", requestUpdate);

    return () => {
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      reducedMotion.removeEventListener("change", requestUpdate);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div ref={dividerRef} className="event-music-divider" aria-hidden="true">
      <span className="event-music-divider-line" />
    </div>
  );
}
