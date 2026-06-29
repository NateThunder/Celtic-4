import type { AlbumResourcePack } from "./chartsData";
import styles from "./charts.module.css";

export function FakeChordChart({ title, selectedKey }: { title: string; selectedKey: string }) {
  return (
    <div className={styles.pdfMock}>
      <div className={styles.pdfToolbar} aria-hidden="true">
        <span />
        <span>1 / 2</span>
        <span>100%</span>
        <span />
      </div>
      <div className={styles.pdfPaper}>
        <h3>{title}</h3>
        <p>
          Key: {selectedKey} | Tempo: 72 | Time: 4/4
        </p>
        <div className={styles.chartColumns}>
          <div>
            <strong>Intro</strong>
            <span>{selectedKey} F/A Gm Eb</span>
            <strong>Verse 1</strong>
            <span>{selectedKey} F/A Gm Eb</span>
            <span>Come Thou fount of every blessing</span>
            <span>{selectedKey} F/A Eb</span>
            <span>Tune my heart to sing Thy grace</span>
          </div>
          <div>
            <strong>Chorus</strong>
            <span>{selectedKey} F/A Gm Eb</span>
            <span>Prone to wander, Lord, I feel it</span>
            <span>{selectedKey} Eb F</span>
            <span>Here&apos;s my heart, Lord, take and seal it</span>
            <span>{selectedKey} Eb F</span>
          </div>
        </div>
        <p className={styles.previewNote}>Preview only. Full PDF available after purchase.</p>
      </div>
    </div>
  );
}

export function FakeBundlePreview({ album }: { album: AlbumResourcePack }) {
  return (
    <div className={styles.bundleMock}>
      <div className={styles.bundleStack} aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className={styles.bundleList}>
        <h3>{album.title} Resource Pack</h3>
        <p>{album.songCount} songs prepared for worship teams.</p>
        <ul>
          <li>Chord chart PDFs</li>
          <li>Lead and piano sheets</li>
          <li>Team-ready key options</li>
        </ul>
        <p className={styles.previewNote}>Preview only. Full pack available after purchase.</p>
      </div>
    </div>
  );
}
