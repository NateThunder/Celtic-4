import type { Metadata } from "next";
import SiteHeader from "../components/SiteHeader";
import ContactBackdrop from "./ContactBackdrop";
import ContactForm from "./ContactForm";
import styles from "./contact.module.css";

export const metadata: Metadata = {
  title: "Contact | Celtic Worship",
  description: "Get in touch with Celtic Worship about bookings, orders, press, or sheet music.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return (
    <div className={`site-shell ${styles.shell}`}>
      <SiteHeader variant="home" />
      <main>
        <section className={styles.stage} aria-label="Contact">
          <ContactBackdrop />
          <div className={styles.stageInner}>
            <ContactForm />
          </div>
        </section>
      </main>
    </div>
  );
}
