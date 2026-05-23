"use client";

import { useState } from "react";
import PixelIcon from "./PixelIcon";
import { formatPoundPrice } from "./price";
import StemPlayer from "./StemPlayer";
import type { Track } from "./types";
import styles from "./stemPlayer.module.css";

type StemPlayerAppProps = {
  tracks: Track[];
};

export default function StemPlayerApp({ tracks }: StemPlayerAppProps) {
  const [expandedTrackId, setExpandedTrackId] = useState("");

  if (!tracks.length) {
    return (
      <section className={styles.appShell}>
        <div className={styles.setupPanel}>
          <div className={styles.emptyState}>
            <PixelIcon type="note" size={42} />
            <h2>Stem Library Empty</h2>
            <p className={styles.emptyCopy}>Check back once a saved stem session has been added.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.appShell}>
      <div className={styles.libraryPanel}>
        <header className={styles.savedTracksHeader}>
          <div>
            <p className={styles.playerKicker}>Stem Library</p>
            <h2>Choose A Session</h2>
          </div>
          <strong>{tracks.length}</strong>
        </header>

        <div className={styles.expandableTrackList} aria-label="Stem library">
          {tracks.map((track) => {
            const isExpanded = track.id === expandedTrackId;
            const fullStemsPriceLabel = formatPoundPrice(track.fullStemsPrice);

            return (
              <article
                className={
                  isExpanded ? styles.expandableTrackCardActive : styles.expandableTrackCard
                }
                key={track.id}
              >
                <button
                  className={styles.expandableTrackSummary}
                  type="button"
                  aria-expanded={isExpanded}
                  onClick={() =>
                    setExpandedTrackId((currentTrackId) =>
                      currentTrackId === track.id ? "" : track.id,
                    )
                  }
                >
                  <span className={styles.libraryTrackCount}>{track.stems.length} stems</span>
                  <strong className={styles.libraryTrackTitle}>{track.title}</strong>
                  {track.artistName ? (
                    <span className={styles.libraryTrackArtist}>{track.artistName}</span>
                  ) : null}
                  {fullStemsPriceLabel ? (
                    <span className={styles.libraryTrackPrice}>
                      Full pack {fullStemsPriceLabel}
                    </span>
                  ) : null}
                  <span className={styles.expandAction}>
                    {isExpanded ? "Close Player" : "Open Player"}
                  </span>
                </button>

                {isExpanded ? (
                  <div className={styles.expandedTrackBody}>
                    <StemPlayer key={track.id} track={track} />
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
