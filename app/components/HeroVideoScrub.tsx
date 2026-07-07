"use client";

import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "motion/react";

/**
 * try-scrub: the hero video is scrubbed by scroll position. As the user
 * scrolls from the hero down into the events section, the video subtly
 * scales up and fades out — revealing the dark hero background (which
 * matches the events colour) for a smooth, scroll-linked reveal.
 *
 * The video element fills the hero (position:absolute, inset:0), so its
 * bounding box tracks the hero's scroll progress directly.
 */
export default function HeroVideoScrub() {
  const ref = useRef<HTMLVideoElement>(null);
  const reduceMotion = useReducedMotion();

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  // Base CSS crops the pillarboxed source at scale(1.34); scrub upward from there.
  const scale = useTransform(
    scrollYProgress,
    [0, 1],
    reduceMotion ? [1.34, 1.34] : [1.34, 1.52]
  );
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.85],
    reduceMotion ? [1, 1] : [1, 0.1]
  );

  return (
    <motion.video
      ref={ref}
      className="editorial-hero-video"
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      style={{ scale, opacity, transformOrigin: "center" }}
    >
      <source src="/Sequence%2001_1.mp4" type="video/mp4" />
    </motion.video>
  );
}
