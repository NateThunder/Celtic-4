import SiteHeader from "../components/SiteHeader";
import MusicAlbumTimeline from "../components/MusicAlbumTimeline";
import styles from "./music.module.css";

export default function MusicPage() {
  return (
    <div className="site-shell">
      <SiteHeader />
      <main className={styles.page}>
        <section className={styles.section}>
          <header className={styles.heading}>
            <p className={styles.kicker}>Discography</p>
            <h1 className={styles.title}>Celtic Worship Albums</h1>
          </header>

          <MusicAlbumTimeline />
        </section>
      </main>
    </div>
  );
}
