"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef } from "react";

export default function AlbumStack() {
  const stackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stack = stackRef.current;
    if (!stack) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let animationFrame = 0;

    const updateFan = () => {
      animationFrame = 0;

      if (reduceMotion.matches) {
        stack.style.setProperty("--album-fan", "1");
        return;
      }

      const bounds = stack.getBoundingClientRect();
      const revealStart = window.innerHeight * 0.88;
      const revealEnd = window.innerHeight * 0.3;
      const progress = Math.min(
        1,
        Math.max(0, (revealStart - bounds.top) / (revealStart - revealEnd)),
      );

      stack.style.setProperty("--album-fan", progress.toFixed(3));
    };

    const requestFanUpdate = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updateFan);
    };

    updateFan();
    window.addEventListener("scroll", requestFanUpdate, { passive: true });
    window.addEventListener("resize", requestFanUpdate);
    reduceMotion.addEventListener("change", requestFanUpdate);

    return () => {
      window.removeEventListener("scroll", requestFanUpdate);
      window.removeEventListener("resize", requestFanUpdate);
      reduceMotion.removeEventListener("change", requestFanUpdate);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div
      ref={stackRef}
      className="album-stack"
      aria-label="Celtic Worship albums"
      role="group"
    >
      <Link
        href="/music#homeward"
        className="album-card album-homeward"
        aria-label="Homeward album"
      >
        <Image
          src="/HOMEWARD.jpeg"
          alt="Celtic Worship Homeward album art"
          width={320}
          height={320}
        />
      </Link>
      <Link
        href="/music#morningtide"
        className="album-card album-morningtide"
        aria-label="Morningtide album"
      >
        <Image
          src="/MORNINGTIDE.webp"
          alt="Celtic Worship Morningtide album art"
          width={320}
          height={320}
        />
      </Link>
      <Link
        href="/music#come-behold"
        className="album-card album-come-behold"
        aria-label="Come Behold album"
      >
        <Image
          src="/COME%20BEHOLD.webp"
          alt="Celtic Worship Come Behold album art"
          width={320}
          height={320}
        />
      </Link>
      <Link
        href="/music#harvest"
        className="album-card album-harvest"
        aria-label="Harvest album"
      >
        <Image
          src="/Harvest.webp"
          alt="Celtic Worship Harvest album art"
          width={320}
          height={320}
        />
      </Link>
    </div>
  );
}
