import SiteHeader from "../components/SiteHeader";
import StemPlayerApp from "../components/stem-player/StemPlayerApp";
import { getStemTracks } from "../lib/stemTracks";
import styles from "./stem-player.module.css";

export const dynamic = "force-dynamic";

export default async function StemPlayerPage() {
  const tracks = await getStemTracks();

  return (
    <div className="site-shell">
      <SiteHeader />
      <main className={styles.page}>
        <section className={styles.hero} aria-label="Celtic Worship stem player">
          <p className="editorial-kicker">Celtic Worship</p>
          <h1 className={styles.title}>Stems</h1>
          <div className={styles.rule} aria-hidden="true" />
          <p className={styles.intro}>
            Choose an available stem session and shape each part in real time.
          </p>
        </section>

        <StemPlayerApp tracks={tracks} />
      </main>
    </div>
  );
}
