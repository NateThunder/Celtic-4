import Link from "next/link";
import SiteHeader from "../../../components/SiteHeader";
import { getStemPurchaseDetails, type StemPurchaseKind } from "../../../lib/stemCheckout";
import { getStripeClient } from "../../../lib/stripe";
import styles from "../checkoutResult.module.css";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type StemCheckoutSuccessPageProps = {
  searchParams?: Promise<{
    session_id?: string | string[];
  }>;
};

function getSingleParam(value?: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function StemCheckoutSuccessPage({
  searchParams,
}: StemCheckoutSuccessPageProps) {
  const resolvedSearchParams = await searchParams;
  const sessionId = getSingleParam(resolvedSearchParams?.session_id)?.trim();

  let title = "Payment Complete";
  let copy = "Thanks. Your stem purchase is ready below.";
  let downloads: Array<{ id: string; name: string; fileUrl: string }> = [];

  if (!sessionId) {
    title = "Missing Checkout Session";
    copy = "We could not find the checkout session for this purchase.";
  } else {
    try {
      const stripe = getStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const metadata = session.metadata || {};
      const purchaseKind: StemPurchaseKind = metadata.purchaseKind === "all" ? "all" : "stem";

      if (session.payment_status !== "paid") {
        title = "Payment Not Confirmed";
        copy = "Stripe has not confirmed this payment yet. Refresh this page after payment completes.";
      } else {
        const lookup = await getStemPurchaseDetails({
          trackId: metadata.trackId || "",
          stemId: metadata.stemId || "",
          kind: purchaseKind,
        });

        if (lookup.ok) {
          title = purchaseKind === "all" ? "Stem Pack Ready" : "Stem Ready";
          copy = `Thanks for buying ${lookup.purchase.title}.`;
          downloads = lookup.purchase.downloadItems;
        } else {
          title = "Purchase Found";
          copy = lookup.message;
        }
      }
    } catch (error) {
      title = "Checkout Needs Attention";
      copy = error instanceof Error ? error.message : "Unable to verify this checkout session.";
    }
  }

  return (
    <div className="site-shell">
      <SiteHeader />
      <main className={styles.page}>
        <section className={styles.shell}>
          <p className={styles.kicker}>Celtic Worship Stems</p>
          <h1 className={styles.title}>{title}</h1>
          <p className={styles.copy}>{copy}</p>

          {downloads.length > 0 ? (
            <ul className={styles.downloadList} aria-label="Purchased stem downloads">
              {downloads.map((download) => (
                <li className={styles.downloadItem} key={download.id}>
                  <span>{download.name}</span>
                  <a className={styles.downloadLink} href={download.fileUrl} download>
                    Download
                  </a>
                </li>
              ))}
            </ul>
          ) : null}

          <Link className={styles.backLink} href="/stem-player">
            Back To Stems
          </Link>
        </section>
      </main>
    </div>
  );
}
