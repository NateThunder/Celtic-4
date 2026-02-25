import CelticWorshipBio from "../components/Bio";
import SiteHeader from "../components/SiteHeader";
import styles from "./about.module.css";

export default function AboutPage() {
  return (
    <div className="site-shell">
      <SiteHeader />
      <main className={styles.page}>
        <CelticWorshipBio />
      </main>
    </div>
  );
}
