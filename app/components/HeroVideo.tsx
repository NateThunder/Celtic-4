"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import SiriWave from "siriwave";

const HERO_VIDEO_SRC =
  "/Your%20Kindness%20(Official%20Music%20Video)%20-%201m58s%20compressed.mp4";
const CURTAIN_HOLD_AFTER_VIDEO_MOVES_MS = 900;

export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const waveContainerRef = useRef<HTMLSpanElement>(null);
  const waveRef = useRef<SiriWave | null>(null);
  const revealFrameRef = useRef<number | null>(null);
  const videoFrameCallbackRef = useRef<number | null>(null);
  const firstPresentedMediaTimeRef = useRef<number | null>(null);
  const curtainHoldTimerRef = useRef<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [videoPlaying, setVideoPlaying] = useState(false);

  useEffect(() => {
    if (!waveContainerRef.current) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const wave = new SiriWave({
      container: waveContainerRef.current,
      width: 104,
      height: 32,
      speed: reduceMotion ? 0 : 0.1,
      amplitude: 0.4,
      color: "#efe6d7",
      autostart: !reduceMotion,
      curveDefinition: [{ attenuation: 3, lineWidth: 1, opacity: 1 }],
    });

    waveRef.current = wave;

    return () => {
      wave.dispose();
      waveRef.current = null;
    };
  }, []);

  useEffect(() => {
    const video = videoRef.current;

    return () => {
      if (revealFrameRef.current !== null) {
        window.cancelAnimationFrame(revealFrameRef.current);
      }
      if (videoFrameCallbackRef.current !== null && video) {
        video.cancelVideoFrameCallback(videoFrameCallbackRef.current);
      }
      if (curtainHoldTimerRef.current !== null) {
        window.clearTimeout(curtainHoldTimerRef.current);
      }
    };
  }, []);

  function openCurtains() {
    curtainHoldTimerRef.current = window.setTimeout(() => {
      curtainHoldTimerRef.current = null;
      setVideoPlaying(true);
    }, CURTAIN_HOLD_AFTER_VIDEO_MOVES_MS);
  }

  function revealVideo() {
    const video = videoRef.current;
    if (
      !video ||
      videoPlaying ||
      revealFrameRef.current !== null ||
      videoFrameCallbackRef.current !== null
    ) {
      return;
    }

    if ("requestVideoFrameCallback" in video) {
      const waitForMovingFrame: VideoFrameRequestCallback = (_now, metadata) => {
        const firstMediaTime = firstPresentedMediaTimeRef.current;

        if (firstMediaTime !== null && metadata.mediaTime > firstMediaTime) {
          videoFrameCallbackRef.current = null;
          firstPresentedMediaTimeRef.current = null;
          openCurtains();
          return;
        }

        firstPresentedMediaTimeRef.current = metadata.mediaTime;
        videoFrameCallbackRef.current = video.requestVideoFrameCallback(waitForMovingFrame);
      };

      videoFrameCallbackRef.current = video.requestVideoFrameCallback(waitForMovingFrame);
      return;
    }

    revealFrameRef.current = window.requestAnimationFrame(() => {
      revealFrameRef.current = window.requestAnimationFrame(() => {
        revealFrameRef.current = null;
        openCurtains();
      });
    });
  }

  async function toggleSound() {
    const video = videoRef.current;
    if (!video) return;

    const enableSound = video.muted;
    video.muted = !enableSound;

    if (enableSound) {
      try {
        await video.play();
      } catch {
        video.muted = true;
        return;
      }
    }

    waveRef.current?.setAmplitude(enableSound ? 3 : 0.4);
    setSoundEnabled(enableSound);
  }

  const curtainStyle: CSSProperties = {
    position: "absolute",
    top: 0,
    bottom: 0,
    zIndex: 5,
    width: "calc(50% + 1px)",
    backgroundColor: "#000",
    transition: "transform 1.5s cubic-bezier(0.77, 0, 0.18, 1)",
    willChange: "transform",
  };

  return (
    <div
      className={`editorial-hero-media${videoPlaying ? " is-video-playing" : ""}`}
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 0,
        overflow: "hidden",
        clipPath: "none",
        transition: "none",
      }}
    >
      <video
        ref={videoRef}
        className="editorial-hero-video"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        onPlaying={revealVideo}
        aria-hidden="true"
      >
        <source src={HERO_VIDEO_SRC} type="video/mp4" />
      </video>

      <button
        className="editorial-hero-sound"
        type="button"
        onClick={toggleSound}
        aria-label={soundEnabled ? "Mute banner video" : "Listen to banner video"}
        aria-pressed={soundEnabled}
      >
        <span className="editorial-hero-sound-label">
          {soundEnabled ? "Mute" : "Listen"}
        </span>
        <span ref={waveContainerRef} className="editorial-hero-sound-wave" aria-hidden="true" />
      </button>

      <span
        className="editorial-hero-curtain editorial-hero-curtain--left"
        aria-hidden="true"
        style={{
          ...curtainStyle,
          left: 0,
          transform: videoPlaying ? "translateX(-100%)" : "translateX(0)",
        }}
      />
      <span
        className="editorial-hero-curtain editorial-hero-curtain--right"
        aria-hidden="true"
        style={{
          ...curtainStyle,
          right: 0,
          transform: videoPlaying ? "translateX(100%)" : "translateX(0)",
        }}
      />
    </div>
  );
}
