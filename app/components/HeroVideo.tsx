"use client";

import { useEffect, useRef, useState } from "react";
import SiriWave from "siriwave";

const HERO_VIDEO_SRC =
  "/Your%20Kindness%20(Official%20Music%20Video)%20%EF%BD%9C%20Celtic%20Worship_converted_1.mp4";

export default function HeroVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const waveContainerRef = useRef<HTMLSpanElement>(null);
  const waveRef = useRef<SiriWave | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);

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

  return (
    <>
      <video
        ref={videoRef}
        className="editorial-hero-video"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
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
    </>
  );
}
