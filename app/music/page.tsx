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
            <h1 className={styles.title}>
              Disco<span>graphy</span>
            </h1>
            <div className={styles.titleRule} aria-hidden="true" />
          </header>

          <MusicAlbumTimeline />
        </section>
      </main>
    </div>
  );
}
