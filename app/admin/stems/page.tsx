import type { Metadata } from "next";
import SiteHeader from "../../components/SiteHeader";
import StemAdminApp from "../../components/stem-player/StemAdminApp";
import { getStemTracks } from "../../lib/stemTracks";
import styles from "../admin.module.css";

export const metadata: Metadata = {
  title: "Stem Uploads | Celtic Worship Admin",
  description: "Upload and manage Celtic Worship stem sessions.",
};

export const dynamic = "force-dynamic";

export default async function AdminStemsPage() {
  const tracks = await getStemTracks();

  return (
    <div className="site-shell">
      <SiteHeader />
      <main className={styles.page}>
        <section className={styles.shell}>
          <header className={styles.header}>
            <div>
              <p className={styles.kicker}>Admin</p>
              <h1 className={styles.title}>Stem Uploads</h1>
              <p className={styles.lede}>
                Save stem sessions here so the public stem player only shows available tracks.
              </p>
            </div>
            <aside className={styles.notice} aria-label="Admin access status">
              <span>Access</span>
              <strong>No auth enabled</strong>
              <p>Uploads are kept on this admin route for now.</p>
            </aside>
          </header>

          <StemAdminApp initialTracks={tracks} />
        </section>
      </main>
    </div>
  );
}
