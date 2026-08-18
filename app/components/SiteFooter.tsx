import Link from "next/link";
import styles from "./siteFooter.module.css";

const FOOTER_LINKS = [
  { label: "Home", href: "/#home" },
  { label: "Music", href: "/music" },
  { label: "Sheet Music", href: "/music/charts" },
  { label: "Events", href: "/live-events" },
  { label: "Videos", href: "/videos" },
  { label: "Shop", href: "/shop" },
  { label: "About", href: "/about" },
];

const SOCIAL_LINKS = [
  {
    label: "Spotify",
    href: "https://open.spotify.com/artist/0h2AQKpVBEEXQQ03KGf7ep?si=9eAa0Ik8Rmm2Nip-K8Y-Kg",
  },
  { label: "YouTube", href: "https://www.youtube.com/CelticWorshipMusic" },
  { label: "Instagram", href: "https://www.instagram.com/celtic_worship" },
];

/**
 * Shared site footer. Mirrors the home page's footer so the two read as one
 * component, but self-contained: it carries no background of its own, so any
 * page can drop it at the foot of its own canvas.
 */
export default function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <Link className={styles.brand} href="/#home">
        Celtic Worship
      </Link>
      <nav className={styles.nav} aria-label="Footer">
        {FOOTER_LINKS.map((item) => (
          <Link key={item.label} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>
      <div className={styles.socials} aria-label="Social links">
        {SOCIAL_LINKS.map((item) => (
          <a
            key={item.label}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
          >
            {item.label}
          </a>
        ))}
      </div>
      <p className={styles.legal}>
        © {new Date().getFullYear()} Celtic Worship. All rights reserved.
      </p>
    </footer>
  );
}
