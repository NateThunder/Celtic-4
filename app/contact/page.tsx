import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import SiteFooter from "../components/SiteFooter";
import SiteHeader from "../components/SiteHeader";
import { getShopSectionProducts, type ShopSectionProduct } from "../lib/featuredProducts";
import ContactForm from "./ContactForm";
import styles from "./contact.module.css";

export const metadata: Metadata = {
  title: "Contact | Celtic Worship",
  description: "Get in touch with Celtic Worship about bookings, orders, press, or sheet music.",
  alternates: { canonical: "/contact" },
};

const fallbackProducts: ShopSectionProduct[] = [
  { id: -1, name: "Harvest", categoryName: "CD", categorySlug: "cd", href: "/shop", imageSrc: "/Harvest.webp", imageAlt: "Harvest album", priceLabel: "" },
  { id: -2, name: "Celtic Worship Merch", categoryName: "Merch", categorySlug: "merch", href: "/shop", imageSrc: "/fabrick.png", imageAlt: "Celtic Worship merchandise", priceLabel: "" },
];

export default async function ContactPage() {
  const liveProducts = await getShopSectionProducts();
  const products = liveProducts.length > 0 ? liveProducts : fallbackProducts;
  return (
    <div className={`site-shell ${styles.shell}`}>
      <SiteHeader variant="home" />
      <main>
        <section className={styles.stage} aria-label="Contact">
          <div className={styles.backdrop} />
          <div className={styles.stageInner}>
            <ContactForm />
          </div>
        </section>
        <section className={styles.whileHere} aria-labelledby="while-here-heading">
          <div className={styles.whileHereHeader}>
            <h2 id="while-here-heading" className={styles.whileHereTitle}>While you&apos;re here</h2>
            <Link className={styles.shopLink} href="/shop">Visit the shop</Link>
          </div>
          <ul className={styles.destinationGrid}>
            {products.map((item) => (
              <li key={item.categorySlug}>
                <Link className={styles.destinationLink} href={item.href}>
                  <span className={styles.imageFrame}>
                    <Image className={styles.destinationImage} src={item.imageSrc} alt={item.imageAlt} width={900} height={900} sizes="(max-width: 600px) 90vw, (max-width: 900px) 44vw, 30vw" />
                  </span>
                  <span className={styles.destinationMeta}>
                    <span className={styles.destinationName}>{item.name}</span>
                    <span className={styles.destinationCategory}>{item.categoryName}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className={styles.eventsCallout} aria-labelledby="events-callout-heading">
          <Image
            className={styles.eventsImage}
            src="/photos/events-band_1.jpg"
            alt="Celtic Worship performing live"
            fill
            sizes="100vw"
          />
          <div className={styles.eventsShade} />
          <div className={styles.eventsContent}>
            <p className={styles.eventsEyebrow}>See us live</p>
            <h2 id="events-callout-heading" className={styles.eventsTitle}>Join us at an upcoming event</h2>
            <Link className={styles.eventsLink} href="/live-events">
              View all events <span aria-hidden="true">→</span>
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
