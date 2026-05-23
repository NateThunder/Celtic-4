import Link from "next/link";
import SiteHeader from "../../../components/SiteHeader";
import styles from "../checkoutResult.module.css";

export default function StemCheckoutCancelledPage() {
  return (
    <div className="site-shell">
      <SiteHeader />
      <main className={styles.page}>
        <section className={styles.shell}>
          <p className={styles.kicker}>Celtic Worship Stems</p>
          <h1 className={styles.title}>Checkout Cancelled</h1>
          <p className={styles.copy}>No payment was taken. You can return to the stem player whenever you are ready.</p>
          <Link className={styles.backLink} href="/stem-player">
            Back To Stems
          </Link>
        </section>
      </main>
    </div>
  );
}
