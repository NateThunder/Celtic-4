"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatPoundPrice, sanitizePriceInput } from "./price";
import StemChannel from "./StemChannel";
import TransportControls from "./TransportControls";
import type { Track } from "./types";
import styles from "./stemPlayer.module.css";

type StemPlayerProps = {
  track: Track;
  variant?: "public" | "admin";
  adminStemEdits?: Array<{
    id: string;
    name: string;
    price: string;
  }>;
  onAdminStemPriceChange?: (stemId: string, price: string) => void;
};

type PurchaseModalState = {
  title: string;
  kind: "stem" | "all";
  price?: string;
  stemId?: string;
  externalHref?: string;
} | null;

const SECTION_COUNT = 8;

function getMessageFromPayload(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") return fallback;
  if ("message" in payload && typeof (payload as { message?: unknown }).message === "string") {
    return String((payload as { message: string }).message);
  }
  return fallback;
}

export default function StemPlayer({
  track,
  variant = "public",
  adminStemEdits = [],
  onAdminStemPriceChange,
}: StemPlayerProps) {
  const stems = useMemo(() => track.stems || [], [track.stems]);
  const stemIdentity = useMemo(() => stems.map((stem) => stem.id).join("|"), [stems]);
  const isAdminPreview = variant === "admin";
  const showPurchaseControls = variant !== "admin";
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingError, setLoadingError] = useState<string | null>(null);
  const [decodedCount, setDecodedCount] = useState(0);
  const [masterVolume, setMasterVolume] = useState(1);
  const [volumes, setVolumes] = useState<Record<number, number>>({});
  const [mutedStems, setMutedStems] = useState<Record<number, boolean>>({});
  const [soloedStems, setSoloedStems] = useState<Record<number, boolean>>({});
  const [purchaseModal, setPurchaseModal] = useState<PurchaseModalState>(null);
  const [purchaseError, setPurchaseError] = useState("");
  const [isCreatingCheckout, setIsCreatingCheckout] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodesRef = useRef<Array<AudioBufferSourceNode | null>>([]);
  const gainNodesRef = useRef<Array<GainNode | null>>([]);
  const buffersRef = useRef<Array<AudioBuffer | null>>([]);
  const startTimeRef = useRef(0);
  const offsetRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  const canPlay = isLoaded && decodedCount > 0 && duration > 0;
  const fullStemsPriceLabel = formatPoundPrice(track.fullStemsPrice);
  const hasFullPackCheckout = Boolean(track.fullStemsPrice || track.fullStemsPurchaseUrl || track.purchaseUrl);

  const closePurchaseModal = useCallback(() => {
    setPurchaseModal(null);
    setPurchaseError("");
    setIsCreatingCheckout(false);
  }, []);

  const createCheckoutSession = useCallback(async () => {
    if (!purchaseModal || isCreatingCheckout) return;

    if (purchaseModal.externalHref) {
      window.location.assign(purchaseModal.externalHref);
      return;
    }

    setIsCreatingCheckout(true);
    setPurchaseError("");

    try {
      const response = await fetch("/api/stems/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackId: track.id,
          stemId: purchaseModal.stemId,
          purchaseKind: purchaseModal.kind,
        }),
      });

      const payload = (await response.json().catch(() => null)) as { url?: string } | null;
      if (!response.ok || !payload?.url) {
        throw new Error(getMessageFromPayload(payload, `Unable to start checkout (${response.status}).`));
      }

      window.location.assign(payload.url);
    } catch (error) {
      setPurchaseError(error instanceof Error ? error.message : "Unable to start checkout.");
      setIsCreatingCheckout(false);
    }
  }, [isCreatingCheckout, purchaseModal, track.id]);

  const stopAll = useCallback(() => {
    sourceNodesRef.current.forEach((node) => {
      if (!node) return;
      try {
        node.stop();
      } catch {
        // Nodes can already be stopped after seek, restart, or cleanup.
      }
    });
    sourceNodesRef.current = [];
    gainNodesRef.current = [];
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    const initialVolumes: Record<number, number> = {};
    stems.forEach((_, index) => {
      initialVolumes[index] = 1;
    });
    setVolumes(initialVolumes);
    setMutedStems({});
    setSoloedStems({});
  }, [stemIdentity, stems]);

  useEffect(() => {
    if (!purchaseModal) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePurchaseModal();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closePurchaseModal, purchaseModal]);

  useEffect(() => {
    if (!stems.length) {
      stopAll();
      buffersRef.current = [];
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      setIsLoaded(false);
      setLoadingProgress(0);
      setLoadingError(null);
      setDecodedCount(0);
      return;
    }

    const AudioContextConstructor =
      window.AudioContext ||
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextConstructor) {
      setIsLoaded(true);
      setLoadingProgress(100);
      setLoadingError("This browser does not support Web Audio playback.");
      setDecodedCount(0);
      return;
    }

    let disposed = false;
    const abortController = new AbortController();
    const context = new AudioContextConstructor();
    audioContextRef.current = context;
    buffersRef.current = [];
    offsetRef.current = 0;
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setIsLoaded(false);
    setLoadingProgress(0);
    setLoadingError(null);
    setDecodedCount(0);
    stopAll();

    const loadAudio = async () => {
      const loadedBuffers: Array<AudioBuffer | null> = Array(stems.length).fill(null);
      const failedStemNames: string[] = [];
      let loaded = 0;

      for (const [index, stem] of stems.entries()) {
        if (disposed) return;

        try {
          const response = await fetch(stem.fileUrl, {
            cache: "no-store",
            signal: abortController.signal,
          });
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await context.decodeAudioData(arrayBuffer);
          loadedBuffers[index] = audioBuffer;
        } catch {
          if (disposed) return;
          loadedBuffers[index] = null;
          failedStemNames.push(stem.name || stem.fileName);
        }

        loaded += 1;
        if (!disposed) {
          setLoadingProgress(Math.round((loaded / stems.length) * 100));
        }
      }

      if (disposed) return;

      buffersRef.current = loadedBuffers;
      const decodedBuffers = loadedBuffers.filter(
        (buffer): buffer is AudioBuffer => buffer !== null,
      );
      const maxDuration = Math.max(...decodedBuffers.map((buffer) => buffer.duration), 0);

      setDuration(maxDuration);
      setDecodedCount(decodedBuffers.length);
      setIsLoaded(true);

      if (!decodedBuffers.length) {
        setLoadingError("None of the stem files could be decoded. Try another audio export.");
      } else if (failedStemNames.length) {
        setLoadingError(`Could not decode: ${failedStemNames.join(", ")}.`);
      }
    };

    void loadAudio();

    return () => {
      disposed = true;
      abortController.abort();
      stopAll();
      buffersRef.current = [];
      if (audioContextRef.current === context) {
        audioContextRef.current = null;
      }
      void context.close().catch(() => {});
    };
  }, [stems, stopAll]);

  useEffect(() => {
    const hasSolo = Object.values(soloedStems).some(Boolean);
    const now = audioContextRef.current?.currentTime ?? 0;

    gainNodesRef.current.forEach((gainNode, index) => {
      if (!gainNode) return;
      let volume = (volumes[index] ?? 1) * masterVolume;
      if (hasSolo) {
        volume = soloedStems[index] ? volume : 0;
      } else if (mutedStems[index]) {
        volume = 0;
      }
      gainNode.gain.setValueAtTime(volume, now);
    });
  }, [volumes, mutedStems, soloedStems, masterVolume]);

  const startPlayback = useCallback(
    (offset = 0) => {
      const context = audioContextRef.current;
      if (!context || !buffersRef.current.length || !canPlay) return;

      if (context.state === "suspended") {
        void context.resume();
      }

      stopAll();

      const hasSolo = Object.values(soloedStems).some(Boolean);
      const sources: Array<AudioBufferSourceNode | null> = [];
      const gains: Array<GainNode | null> = [];

      buffersRef.current.forEach((buffer, index) => {
        if (!buffer || offset >= buffer.duration) {
          sources.push(null);
          gains.push(null);
          return;
        }

        const source = context.createBufferSource();
        const gainNode = context.createGain();
        source.buffer = buffer;
        source.connect(gainNode);
        gainNode.connect(context.destination);

        let volume = (volumes[index] ?? 1) * masterVolume;
        if (hasSolo) {
          volume = soloedStems[index] ? volume : 0;
        } else if (mutedStems[index]) {
          volume = 0;
        }
        gainNode.gain.setValueAtTime(volume, context.currentTime);

        source.start(0, offset);
        sources.push(source);
        gains.push(gainNode);
      });

      sourceNodesRef.current = sources;
      gainNodesRef.current = gains;
      startTimeRef.current = context.currentTime;
      offsetRef.current = offset;

      const tick = () => {
        const elapsed = context.currentTime - startTimeRef.current + offset;
        setCurrentTime(elapsed);
        if (elapsed >= duration) {
          setIsPlaying(false);
          setCurrentTime(0);
          offsetRef.current = 0;
          stopAll();
          return;
        }
        animationFrameRef.current = requestAnimationFrame(tick);
      };
      tick();
    },
    [canPlay, duration, mutedStems, soloedStems, stopAll, volumes, masterVolume],
  );

  const handlePlayPause = useCallback(() => {
    const context = audioContextRef.current;
    if (!context || !canPlay) return;

    if (isPlaying) {
      const elapsed = context.currentTime - startTimeRef.current + offsetRef.current;
      offsetRef.current = Math.min(Math.max(elapsed, 0), duration);
      stopAll();
      setIsPlaying(false);
    } else {
      startPlayback(offsetRef.current);
      setIsPlaying(true);
    }
  }, [canPlay, duration, isPlaying, startPlayback, stopAll]);

  const handleSeek = useCallback(
    (time: number) => {
      const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
      const clampedTime = Math.min(Math.max(time, 0), safeDuration);
      offsetRef.current = clampedTime;
      setCurrentTime(clampedTime);
      if (isPlaying) {
        startPlayback(clampedTime);
      }
    },
    [duration, isPlaying, startPlayback],
  );

  const handleRestart = useCallback(() => {
    offsetRef.current = 0;
    setCurrentTime(0);
    if (isPlaying) {
      startPlayback(0);
    }
  }, [isPlaying, startPlayback]);

  const handleVolumeChange = useCallback((index: number, value: number) => {
    setVolumes((previous) => ({ ...previous, [index]: value }));
  }, []);

  const handleToggleMute = useCallback((index: number) => {
    setMutedStems((previous) => ({ ...previous, [index]: !previous[index] }));
  }, []);

  const handleToggleSolo = useCallback((index: number) => {
    setSoloedStems((previous) => ({ ...previous, [index]: !previous[index] }));
  }, []);

  return (
    <section
      className={styles.playerPanel}
      aria-label={isAdminPreview ? "Admin stem player" : "Stem mixer"}
    >
      <div className={styles.visualizer} data-playing={isPlaying ? "true" : "false"} aria-hidden="true">
        {Array.from({ length: 12 }).map((_, index) => (
          <span key={index} style={{ animationDelay: `${index * 60}ms` }} />
        ))}
      </div>

      <header className={styles.playerHeader}>
        <div>
          <p className={styles.playerKicker}>
            {decodedCount} of {stems.length} stems ready
          </p>
          <h2>{track.title}</h2>
          {track.artistName ? <p>{track.artistName}</p> : null}
        </div>

        <div className={styles.masterPanel}>
          <label className={styles.masterVolume}>
            <span>Master</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={masterVolume}
              onChange={(event) => setMasterVolume(Number(event.target.value))}
            />
            <strong>{Math.round(masterVolume * 100)}%</strong>
          </label>
          {showPurchaseControls && hasFullPackCheckout ? (
            <button
              className={styles.purchaseAllButton}
              type="button"
              onClick={() => {
                setPurchaseError("");
                setPurchaseModal({
                  title: track.title,
                  kind: "all",
                  price: fullStemsPriceLabel,
                  externalHref: track.fullStemsPurchaseUrl || track.purchaseUrl,
                });
              }}
            >
              <span>Buy All</span>
              {fullStemsPriceLabel ? (
                <span className={styles.buttonPrice}>{fullStemsPriceLabel}</span>
              ) : null}
            </button>
          ) : null}
        </div>
      </header>

      {!isLoaded ? (
        <div className={styles.loadingPanel} role="status" aria-live="polite">
          <div className={styles.loadBar} aria-hidden="true">
            <span style={{ width: `${loadingProgress}%` }} />
          </div>
          <p>Loading stems... {loadingProgress}%</p>
        </div>
      ) : null}

      {loadingError ? (
        <div className={decodedCount ? styles.noticePanel : styles.errorPanel} role="status">
          {loadingError}
        </div>
      ) : null}

      <div className={styles.channels}>
        {stems.map((stem, index) => {
          const adminStem = adminStemEdits[index];
          const adminStemId = adminStem?.id || stem.id;
          const stemPrice = adminStem?.price ?? stem.price ?? "";
          const stemPriceLabel = isAdminPreview ? sanitizePriceInput(stemPrice) : formatPoundPrice(stemPrice);
          const hasStemCheckout = Boolean(stemPrice || stem.purchaseUrl || track.purchaseUrl);

          return (
            <StemChannel
              key={stem.id}
              stem={stem}
              index={index}
              volume={volumes[index] ?? 1}
              isMuted={Boolean(mutedStems[index])}
              isSoloed={Boolean(soloedStems[index])}
              isPlaying={isPlaying}
              buffer={buffersRef.current[index] ?? null}
              currentTime={currentTime}
              duration={duration}
              sectionCount={SECTION_COUNT}
              sectionModeEnabled={false}
              showPurchaseControl={showPurchaseControls && hasStemCheckout}
              price={stemPriceLabel}
              onPriceChange={
                isAdminPreview && onAdminStemPriceChange
                  ? (price) => onAdminStemPriceChange(adminStemId, price)
                  : undefined
              }
              onPurchase={
                showPurchaseControls && hasStemCheckout
                  ? () => {
                      setPurchaseError("");
                      setPurchaseModal({
                        title: stem.name || `Stem ${index + 1}`,
                        kind: "stem",
                        stemId: stem.id,
                        price: formatPoundPrice(stem.price),
                        externalHref: stem.purchaseUrl || track.purchaseUrl,
                      });
                    }
                  : undefined
              }
              onVolumeChange={(value) => handleVolumeChange(index, value)}
              onToggleMute={() => handleToggleMute(index)}
              onToggleSolo={() => handleToggleSolo(index)}
              onSeek={handleSeek}
            />
          );
        })}
      </div>

      <TransportControls
        isPlaying={isPlaying}
        canPlay={canPlay}
        currentTime={currentTime}
        duration={duration}
        onPlayPause={handlePlayPause}
        onRestart={handleRestart}
        onSeek={handleSeek}
      />

      {showPurchaseControls && purchaseModal ? (
        <div className={styles.purchaseModalLayer} role="presentation">
          <button
            className={styles.purchaseModalBackdrop}
            type="button"
            aria-label="Close payment window"
            onClick={closePurchaseModal}
          />
          <section
            className={styles.purchaseModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="stem-purchase-modal-title"
          >
            <header className={styles.purchaseModalHeader}>
              <div>
                <p className={styles.purchaseModalKicker}>
                  {purchaseModal.kind === "all" ? "Full Stem Pack" : "Single Stem"}
                </p>
                <h3 id="stem-purchase-modal-title">{purchaseModal.title}</h3>
              </div>
              <button
                className={styles.purchaseModalClose}
                type="button"
                onClick={closePurchaseModal}
                aria-label="Close payment window"
              >
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            </header>

            <p className={styles.purchaseModalCopy}>
              Continue to checkout to complete this purchase.
            </p>

            {purchaseModal.price ? (
              <p className={styles.purchaseModalPrice}>{purchaseModal.price}</p>
            ) : null}

            {purchaseError ? (
              <p className={styles.purchaseModalError} role="status">
                {purchaseError}
              </p>
            ) : null}

            <div className={styles.purchaseModalActions}>
              <button
                className={styles.purchaseModalPayButton}
                type="button"
                disabled={isCreatingCheckout}
                onClick={() => {
                  void createCheckoutSession();
                }}
              >
                {isCreatingCheckout ? "Opening..." : "Go To Checkout"}
              </button>
              <button
                className={styles.purchaseModalSecondaryButton}
                type="button"
                disabled={isCreatingCheckout}
                onClick={closePurchaseModal}
              >
                Cancel
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
