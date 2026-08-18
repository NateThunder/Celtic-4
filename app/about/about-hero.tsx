"use client";

import { useEffect, useRef, useState } from "react";
import { MEMBERS } from "./about-data";
import styles from "./about.module.css";

/* Motion constants, carried over from the reference. */
const STRIP_COUNT = MEMBERS.length;
const ASSEMBLE_AMPLITUDE = 72; // px each strip travels in on load
const EXIT_AMPLITUDE = 150; // px each strip travels out on scroll
const STAGGER_SECONDS = 0.26;
const ASSEMBLE_SECONDS = 1.7;
const SEAM_HOLD_SECONDS = 3.1;
const SEAM_FADE_SECONDS = 0.9;
const CYCLE_SECONDS = 7;

/** Alternating: odd strips come from below, even from above, and leave the same way. */
const ASSEMBLE_FROM = Array.from({ length: STRIP_COUNT }, (_, i) =>
  i % 2 === 0 ? -ASSEMBLE_AMPLITUDE : ASSEMBLE_AMPLITUDE,
);
const EXIT_TO = Array.from({ length: STRIP_COUNT }, (_, i) =>
  i % 2 === 0 ? -EXIT_AMPLITUDE : EXIT_AMPLITUDE,
);

const SEAM_OFFSETS = Array.from(
  { length: STRIP_COUNT - 1 },
  (_, i) => `${(((i + 1) * 100) / STRIP_COUNT).toFixed(4)}%`,
);

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

/** A different frame from the one showing, when the member has more than one. */
function pickNextFrame(memberIndex: number, current: number) {
  const total = MEMBERS[memberIndex].frames.length;
  if (total < 2) return current;
  let next = current;
  while (next === current) next = Math.floor(Math.random() * total);
  return next;
}

export default function AboutHero() {
  const [frameIndexes, setFrameIndexes] = useState<number[]>(() =>
    MEMBERS.map(() => 0),
  );
  // The frame on screen at load is the LCP candidate and asks for high fetch
  // priority; once the rack has cycled, the preloader below has already warmed
  // everything, so there is nothing left to prioritise.
  const [hasCycled, setHasCycled] = useState(false);

  const stripRefs = useRef<(HTMLDivElement | null)[]>([]);
  const seamRef = useRef<HTMLDivElement | null>(null);

  // Fetch *and* decode every frame of every cycle up front, so a swap is a src
  // change against a warm cache rather than a network hop mid-transition. A
  // cached-but-undecoded frame still hitches, hence the decode().
  useEffect(() => {
    const warmed = MEMBERS.flatMap((member) =>
      member.frames.map((frame) => {
        const image = new window.Image();
        image.decoding = "async";
        image.src = frame.src;
        void image.decode().catch(() => {});
        return image;
      }),
    );

    return () => {
      // Drop the references; anything still in flight is abandoned with them.
      warmed.length = 0;
    };
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let stopMotion: (() => void) | null = null;

    const startMotion = () => {
      let startedAt = performance.now();
      let scrollProgress = 0;
      let rafId = 0;

      const readScroll = () => {
        scrollProgress = clamp(
          window.scrollY / Math.max(1, window.innerHeight),
          0,
          1,
        );
      };
      readScroll();
      window.addEventListener("scroll", readScroll, { passive: true });

      const tick = (now: number) => {
        const elapsed = (now - startedAt) / 1000;
        const pullApart = scrollProgress * scrollProgress;

        stripRefs.current.forEach((strip, i) => {
          if (!strip) return;
          const assembled = easeInOutCubic(
            clamp((elapsed - i * STAGGER_SECONDS) / ASSEMBLE_SECONDS, 0, 1),
          );
          const offset =
            (1 - assembled) * ASSEMBLE_FROM[i] + pullApart * EXIT_TO[i];
          strip.style.transform = `translate3d(0,${offset.toFixed(2)}px,0) scale(${(
            1 +
            pullApart * 0.05
          ).toFixed(4)})`;
          strip.style.opacity = (assembled * (1 - pullApart * 0.4)).toFixed(3);
        });

        if (seamRef.current) {
          const seamIn = clamp(
            1 - (elapsed - SEAM_HOLD_SECONDS) / SEAM_FADE_SECONDS,
            0,
            1,
          );
          seamRef.current.style.opacity = Math.max(
            seamIn,
            pullApart * 0.9,
          ).toFixed(3);
        }

        // New photographs arrive on the beat, and the strips re-assemble with them.
        if (elapsed >= CYCLE_SECONDS) {
          startedAt = now;
          setHasCycled(true);
          setFrameIndexes((previous) =>
            previous.map((current, i) => pickNextFrame(i, current)),
          );
        }

        rafId = window.requestAnimationFrame(tick);
      };

      rafId = window.requestAnimationFrame(tick);

      stopMotion = () => {
        window.removeEventListener("scroll", readScroll);
        window.cancelAnimationFrame(rafId);
        // Hand the elements back to the stylesheet.
        stripRefs.current.forEach((strip) => {
          if (!strip) return;
          strip.style.transform = "";
          strip.style.opacity = "";
        });
        if (seamRef.current) seamRef.current.style.opacity = "";
      };
    };

    if (!reducedMotion.matches) startMotion();

    const onPreferenceChange = () => {
      stopMotion?.();
      stopMotion = null;
      if (!reducedMotion.matches) startMotion();
    };
    reducedMotion.addEventListener("change", onPreferenceChange);

    return () => {
      reducedMotion.removeEventListener("change", onPreferenceChange);
      stopMotion?.();
    };
  }, []);

  return (
    <div className={styles.heroWrap}>
      <header className={styles.stage}>
        <div className={styles.rack}>
          {MEMBERS.map((member, i) => {
            const frame = member.frames[frameIndexes[i]];
            return (
              <div
                key={member.name}
                className={styles.st}
                ref={(node) => {
                  stripRefs.current[i] = node;
                }}
              >
                {/* Raw file, not next/image: these are pre-cropped 90–150 KB
                    strips, and the optimiser was serving a 216px-wide variant
                    that then had to scale 6.75x to fill a 972px-tall panel. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={frame.src}
                  alt={`${member.name} — ${member.instrument}`}
                  draggable={false}
                  decoding="async"
                  fetchPriority={hasCycled ? "auto" : "high"}
                  style={{ objectPosition: frame.position }}
                />
                <div className={styles.who}>
                  <b>{member.name.toUpperCase()}</b>
                  <span>{member.instrument.toUpperCase()}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.seam} ref={seamRef} aria-hidden="true">
          {SEAM_OFFSETS.map((left) => (
            <i key={left} className={styles.seamLine} style={{ left }} />
          ))}
        </div>

        <div className={styles.over}>
          <div className={styles.overIn}>
            <span className={`${styles.tag} ${styles.tagAmber}`}>
              About the collective
            </span>
            <h1 className={styles.title}>
              Seven players, one <em>sound</em> — psalms, hymns and new songs.
            </h1>
            <div className={styles.hint}>HOVER A PANEL TO MEET THE PLAYER</div>
          </div>
        </div>
      </header>
    </div>
  );
}
