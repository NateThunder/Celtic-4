"use client";

import PixelIcon from "./PixelIcon";
import styles from "./stemPlayer.module.css";

type TransportControlsProps = {
  isPlaying: boolean;
  canPlay: boolean;
  currentTime: number;
  duration: number;
  onPlayPause: () => void;
  onRestart: () => void;
  onSeek: (time: number) => void;
};

const formatTime = (time: number) => {
  if (!Number.isFinite(time) || time <= 0) return "0:00";
  const mins = Math.floor(time / 60);
  const secs = Math.floor(time % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

export default function TransportControls({
  isPlaying,
  canPlay,
  currentTime,
  duration,
  onPlayPause,
  onRestart,
  onSeek,
}: TransportControlsProps) {
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
  const safeCurrentTime = Math.min(Math.max(currentTime, 0), safeDuration);

  return (
    <div className={styles.transport} aria-label="Stem player transport">
      <div className={styles.transportInner}>
        <div className={styles.seekRow}>
          <span className={styles.timeCode}>{formatTime(safeCurrentTime)}</span>
          <input
            className={styles.seekInput}
            type="range"
            min={0}
            max={safeDuration}
            step={0.01}
            value={safeCurrentTime}
            disabled={!canPlay}
            aria-label="Seek track"
            onChange={(event) => onSeek(Number(event.target.value))}
          />
          <span className={styles.timeCode}>{formatTime(safeDuration)}</span>
        </div>

        <div className={styles.transportButtons}>
          <button
            className={styles.iconButton}
            type="button"
            disabled={!canPlay}
            aria-label="Restart"
            onClick={onRestart}
          >
            <PixelIcon type="restart" size={22} />
          </button>
          <button
            className={styles.playButton}
            type="button"
            disabled={!canPlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            onClick={onPlayPause}
          >
            <PixelIcon type={isPlaying ? "pause" : "play"} size={30} color="#11100d" />
          </button>
          <span className={styles.transportSpacer} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
