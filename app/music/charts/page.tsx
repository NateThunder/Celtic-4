import type { Metadata } from "next";
import SiteHeader from "../../components/SiteHeader";
import MusicSectionTabs from "../MusicSectionTabs";
import ChartsPageClient from "./ChartsPageClient";
import styles from "./charts.module.css";

export const metadata: Metadata = {
  title: "Music Charts | Celtic Worship",
  description: "Download chord charts, lyrics, lead sheets, piano sheets, and resource packs from Celtic Worship.",
};

export default function MusicChartsPage() {
  return (
    <div className="site-shell">
      <SiteHeader hideMobileSocials />
      <main className={styles.page}>
        <section className={styles.shell}>
          <MusicSectionTabs active="charts" />

          <header className={styles.hero}>
            <div className={styles.heroCopy}>
              <h1 className={styles.title}>
                <span>Charts</span>
              </h1>
              <div className={styles.titleRule} aria-hidden="true" />
              <p className={styles.desktopIntro}>
                Browse chords, lyrics, lead sheets, and piano resources from the Celtic Worship catalog.
                Instant downloads to help equip you and your team in leading worship.
              </p>
              <p className={styles.mobileIntro}>
                Charts, sheet music and resources for worship teams, musicians and the church.
              </p>
            </div>
          </header>

          <ChartsPageClient />
        </section>
      </main>
    </div>
  );
}
