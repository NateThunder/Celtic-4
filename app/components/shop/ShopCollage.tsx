'use client';

import { useEffect, useRef } from 'react';
import styles from './ShopCollage.module.css';

/**
 * ShopCollage
 * A purely decorative, scroll-reactive photo layer that sits BEHIND page content.
 * It does not alter or wrap any existing markup — mount it once inside a
 * position:relative container and give the real content a higher z-index.
 *
 * Each plate fades in and sharpens as it passes the middle of the viewport,
 * then blurs and fades back out. Plates with gain 1.0 come almost fully clear.
 */

type Plate = {
  /** left edge, in vw */
  x: number;
  /** distance down the container, in % of container height */
  y: number;
  /** width, in vw */
  w: number;
  /** static rotation, in deg */
  r: number;
  /** parallax strength, 0 = pinned, 0.25 = lively */
  d: number;
  /** peak-opacity multiplier, 0–1. Use 1.0 sparingly — those are the "hero" plates */
  g: number;
  /** optional greige-tint override. Pale objects already shot on greige need less
      tint or they dissolve into the page. Omit to use the CSS default. */
  t?: number;
};

const LAYOUT: Plate[] = [
  { x: -6, y: 4, w: 26, r: -4, d: 0.16, g: 0.75 },
  { x: 76, y: 9, w: 29, r: 3, d: 0.10, g: 1.00 },
  { x: 36, y: 14, w: 22, r: -3, d: 0.15, g: 0.85 },
  { x: 65, y: 17, w: 25, r: 4, d: 0.11, g: 0.90 },
  { x: 8, y: 20, w: 21, r: 5, d: 0.22, g: 0.60 },
  { x: 60, y: 26, w: 25, r: -3, d: 0.14, g: 0.95 },
  { x: 84, y: 30, w: 21, r: -2, d: 0.20, g: 0.90 },
  { x: 27, y: 34, w: 27, r: 2, d: 0.08, g: 1.00 },
  { x: 58, y: 39, w: 23, r: 3, d: 0.13, g: 1.00, t: 0.18 },
  { x: -8, y: 43, w: 30, r: 4, d: 0.18, g: 0.70 },
  { x: 78, y: 49, w: 23, r: -5, d: 0.20, g: 0.85 },
  { x: -7, y: 53, w: 25, r: -4, d: 0.17, g: 0.95, t: 0.15 },
  { x: 20, y: 57, w: 22, r: -2, d: 0.12, g: 0.65 },
  { x: 42, y: 61, w: 22, r: 2, d: 0.09, g: 1.00, t: 0.14 },
  { x: 54, y: 65, w: 29, r: 4, d: 0.16, g: 1.00 },
  { x: 32, y: 69, w: 21, r: -3, d: 0.21, g: 0.85, t: 0.16 },
  { x: -2, y: 73, w: 25, r: -3, d: 0.10, g: 0.80 },
  { x: 69, y: 82, w: 26, r: 2, d: 0.19, g: 0.90 },
  { x: 24, y: 90, w: 23, r: -4, d: 0.13, g: 0.70 },
  { x: 66, y: 94, w: 23, r: 3, d: 0.12, g: 0.90, t: 0.15 },
];

const SOURCES = Array.from(
  { length: 20 },
  (_, i) => `/images/collage/cw-collage-${String(i + 1).padStart(2, '0')}.jpg`,
);

export type ShopCollageProps = {
  /** opacity when a plate is far from the viewport centre */
  baseOpacity?: number;
  /** opacity a gain-1.0 plate reaches at the viewport centre */
  peakOpacity?: number;
  /** blur applied at rest, in px. Falls to 0 at focus */
  maxBlur?: number;
  /** how wide the "in focus" band is. Lower = tighter, snappier transitions */
  focusWindow?: number;
  /** response curve. Below 1 the plate reaches full opacity sooner and harder */
  curve?: number;
};

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smoothstep = (t: number) => t * t * (3 - 2 * t);

export default function ShopCollage({
  baseOpacity = 0.03,
  peakOpacity = 0.62,
  maxBlur = 10,
  focusWindow = 0.36,
  curve = 0.62,
}: ShopCollageProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = rootRef.current;
    if (!host) return;

    const plates = Array.from(
      host.querySelectorAll<HTMLDivElement>(`.${styles.plate}`),
    );
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const narrow = window.matchMedia('(max-width: 700px)');

    const update = () => {
      const vh = window.innerHeight;
      // Every plate renders on mobile. Blur is fill-rate heavy on phone GPUs,
      // so soften the blur rather than dropping photos.
      const blurCap = narrow.matches ? maxBlur * 0.55 : maxBlur;

      for (const el of plates) {
        const rect = el.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        const dist = Math.abs(mid - vh / 2) / (vh / 2 + rect.height / 2);
        const t = Math.pow(smoothstep(clamp(1 - dist / focusWindow, 0, 1)), curve);

        const gain = Number(el.dataset.g);
        el.style.opacity = String(baseOpacity + (peakOpacity * gain - baseOpacity) * t);
        el.style.filter = `saturate(0.75) blur(${(blurCap * (1 - t)).toFixed(2)}px)`;

        const drift = reduced ? 0 : (mid - vh / 2) * Number(el.dataset.d) * -0.12;
        el.style.transform = `translate3d(0, ${drift.toFixed(1)}px, 0) rotate(${el.dataset.r}deg)`;
      }
    };

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        update();
        ticking = false;
      });
    };

    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [baseOpacity, peakOpacity, maxBlur, focusWindow, curve]);

  return (
    <>
      <div ref={rootRef} className={styles.collage} aria-hidden="true">
        {LAYOUT.map((p, i) => (
          <div
            key={i}
            className={styles.plate}
            data-r={p.r}
            data-d={p.d}
            data-g={p.g}
            style={{
              ...(p.t !== undefined
                ? ({ ['--plate-tint' as string]: String(p.t) } as React.CSSProperties)
                : {}),
              left: `${p.x}vw`,
              top: `${p.y}%`,
              width: `${p.w}vw`,
              height: `${p.w * 1.25}vw`,
              backgroundImage: `url(${SOURCES[i % SOURCES.length]})`,
              opacity: baseOpacity,
            }}
          />
        ))}
      </div>
      <div className={styles.veil} aria-hidden="true" />
    </>
  );
}
