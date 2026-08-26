import type { Metadata } from "next";
import SiteHeader from "../components/SiteHeader";
import VideosGridSection from "../components/VideosGridSection";
import styles from "./media.module.css";

export const metadata: Metadata = {
  title: "Videos | Celtic Worship",
  description: "Watch the latest recorded videos from Celtic Worship.",
};

export default function MediaPage() {
  return (
    <div className="site-shell">
      <SiteHeader />
      <main className={styles.page}>
        <div className="home-events-noise" aria-hidden="true" />

        <section className={styles.hero} aria-label="Celtic Worship videos">
          <h1 className={styles.title}>
            Videos
          </h1>
          <div className={styles.rule} aria-hidden="true" />
        </section>

        <VideosGridSection />
      </main>
    </div>
  );
}
