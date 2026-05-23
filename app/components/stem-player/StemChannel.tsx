"use client";

import type { CSSProperties, KeyboardEvent, PointerEvent } from "react";
import { useCallback, useEffect, useRef } from "react";
import { sanitizePriceInput } from "../../lib/prices";
import type { Stem } from "./types";
import styles from "./stemPlayer.module.css";

type StemChannelProps = {
  stem: Stem;
  index: number;
  volume: number;
  isMuted: boolean;
  isSoloed: boolean;
  isPlaying: boolean;
  buffer: AudioBuffer | null;
  currentTime: number;
  duration: number;
  sectionCount: number;
  sectionModeEnabled: boolean;
  showPurchaseControl?: boolean;
  price?: string;
  onPurchase?: () => void;
  onPriceChange?: (price: string) => void;
  onVolumeChange: (value: number) => void;
  onSeek: (time: number) => void;
  onToggleMute: () => void;
  onToggleSolo: () => void;
};

const clamp01 = (value: number) => Math.min(Math.max(value, 0), 1);

export default function StemChannel({
  stem,
  index,
  volume,
  isMuted,
  isSoloed,
  isPlaying,
  buffer,
  currentTime,
  duration,
  sectionCount,
  sectionModeEnabled,
  showPurchaseControl = true,
  price = "",
  onPurchase,
  onPriceChange,
  onVolumeChange,
  onSeek,
  onToggleMute,
  onToggleSolo,
}: StemChannelProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const showPriceLabel = showPurchaseControl && Boolean(price) && !onPriceChange;
  const waveformProgress =
    Number.isFinite(duration) && duration > 0 ? clamp01(currentTime / duration) : 0;
  const channelStyle = { "--stem-color": stem.color } as CSSProperties;
  const channelClassName = [
    styles.channel,
    isPlaying && !isMuted ? styles.channelPlaying : "",
    !buffer ? styles.channelUnavailable : "",
  ]
    .filter(Boolean)
    .join(" ");
  const channelButtonsClassName = [
    styles.channelButtons,
    !showPurchaseControl ? styles.channelButtonsCompact : "",
  ]
    .filter(Boolean)
    .join(" ");
  const channelControlsClassName = [
    styles.channelControls,
    onPriceChange ? styles.channelControlsWithPrice : "",
  ]
    .filter(Boolean)
    .join(" ");

  const snapProgress = useCallback(
    (progress: number) => {
      if (!sectionModeEnabled || sectionCount <= 0) return progress;
      const sectionIndex = Math.min(sectionCount - 1, Math.floor(clamp01(progress) * sectionCount));
      return sectionIndex / sectionCount;
    },
    [sectionCount, sectionModeEnabled],
  );

  const seekFromClientX = useCallback(
    (clientX: number, element: HTMLDivElement) => {
      if (!Number.isFinite(duration) || duration <= 0) return;
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0) return;
      const rawProgress = clamp01((clientX - rect.left) / rect.width);
      onSeek(snapProgress(rawProgress) * duration);
    },
    [duration, onSeek, snapProgress],
  );

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!buffer) return;
    activePointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    seekFromClientX(event.clientX, event.currentTarget);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) return;
    seekFromClientX(event.clientX, event.currentTarget);
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (activePointerIdRef.current !== event.pointerId) return;
    activePointerIdRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  const handleWaveformKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!buffer || !Number.isFinite(duration) || duration <= 0) return;

    const step = event.shiftKey ? 5 : 1;
    let nextTime = currentTime;

    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      nextTime -= step;
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      nextTime += step;
    } else if (event.key === "Home") {
      nextTime = 0;
    } else if (event.key === "End") {
      nextTime = duration;
    } else {
      return;
    }

    event.preventDefault();
    onSeek(Math.min(Math.max(nextTime, 0), duration));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      const dpr = window.devicePixelRatio || 1;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);

      if (!buffer) {
        context.fillStyle = "rgba(21, 19, 15, 0.16)";
        for (let x = 0; x < width; x += 8) {
          context.fillRect(x, height * 0.48, 4, 2);
        }
        return;
      }

      const channel = buffer.getChannelData(0);
      const step = Math.max(1, Math.floor(channel.length / width));
      const amp = height / 2;

      context.strokeStyle = stem.color;
      context.lineWidth = 1;
      context.beginPath();

      for (let x = 0; x < width; x += 1) {
        const start = x * step;
        const end = Math.min(start + step, channel.length);
        let min = 1;
        let max = -1;

        for (let i = start; i < end; i += 1) {
          const value = channel[i];
          if (value < min) min = value;
          if (value > max) max = value;
        }

        context.moveTo(x + 0.5, (1 + min) * amp);
        context.lineTo(x + 0.5, (1 + max) * amp);
      }

      context.stroke();
    };

    draw();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", draw);
      return () => window.removeEventListener("resize", draw);
    }

    const resizeObserver = new ResizeObserver(draw);
    resizeObserver.observe(canvas);
    return () => resizeObserver.disconnect();
  }, [buffer, stem.color]);

  return (
    <article className={channelClassName} style={channelStyle}>
      <div className={channelControlsClassName}>
        <span className={styles.channelNumber}>{String(index + 1).padStart(2, "0")}</span>
        <label className={styles.channelVolume}>
          <span>Volume</span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={Math.round((isMuted ? 0 : volume) * 100)}
            aria-label={`${stem.name || `Stem ${index + 1}`} volume`}
            onChange={(event) => onVolumeChange(Number(event.target.value) / 100)}
          />
        </label>
        <div className={channelButtonsClassName}>
          <button
            className={isMuted ? styles.channelButtonActive : styles.channelButton}
            type="button"
            aria-pressed={isMuted}
            onClick={onToggleMute}
          >
            Mute
          </button>
          <button
            className={isSoloed ? styles.channelButtonSolo : styles.channelButton}
            type="button"
            aria-pressed={isSoloed}
            onClick={onToggleSolo}
          >
            Solo
          </button>
          {showPurchaseControl ? (
            <button
              className={styles.channelButtonPurchase}
              type="button"
              onClick={onPurchase}
              aria-label={`Buy ${stem.name || `Stem ${index + 1}`}`}
            >
              <span>Buy</span>
              {showPriceLabel ? <span className={styles.buttonPrice}>{price}</span> : null}
            </button>
          ) : null}
        </div>
        {onPriceChange ? (
          <label className={styles.channelPriceField}>
            <span>Price</span>
            <span className={styles.currencyInput}>
              <span className={styles.currencySymbol} aria-hidden="true">
                £
              </span>
              <input
                value={sanitizePriceInput(price)}
                placeholder="5"
                inputMode="decimal"
                pattern="[0-9.]*"
                aria-label={`${stem.name || `Stem ${index + 1}`} price`}
                onChange={(event) => onPriceChange(sanitizePriceInput(event.target.value))}
              />
            </span>
          </label>
        ) : null}
      </div>

      <div className={styles.channelMain}>
        <div className={styles.channelTitleRow}>
          <h3>{stem.name || `Stem ${index + 1}`}</h3>
          <div className={styles.channelTitleMeta}>
            {showPriceLabel ? <span className={styles.channelTitlePrice}>{price}</span> : null}
            <span>{buffer ? `${Math.round((isMuted ? 0 : volume) * 100)}%` : "Unavailable"}</span>
          </div>
        </div>
        <div
          className={styles.waveform}
          role="slider"
          tabIndex={buffer ? 0 : -1}
          aria-label={`${stem.name || `Stem ${index + 1}`} waveform seek`}
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(currentTime)}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={handlePointerEnd}
          onKeyDown={handleWaveformKeyDown}
        >
          <canvas ref={canvasRef} className={styles.waveformCanvas} />
          <div
            className={styles.waveformPlayed}
            style={{ width: `${waveformProgress * 100}%` }}
            aria-hidden="true"
          />
        </div>
      </div>
    </article>
  );
}
