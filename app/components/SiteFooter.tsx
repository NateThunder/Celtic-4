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
  { label: "Contact", href: "/contact" },
];

const SOCIAL_LINKS = [
  {
    label: "Spotify",
    href: "https://open.spotify.com/artist/0h2AQKpVBEEXQQ03KGf7ep?si=9eAa0Ik8Rmm2Nip-K8Y-Kg",
    platform: "spotify",
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/CelticWorshipMusic",
    platform: "youtube",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/celtic_worship",
    platform: "instagram",
  },
] as const;

function SocialIcon({ platform }: { platform: (typeof SOCIAL_LINKS)[number]["platform"] }) {
  if (platform === "spotify") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M12 2.1a9.9 9.9 0 1 0 0 19.8 9.9 9.9 0 0 0 0-19.8Zm4.54 14.28a.73.73 0 0 1-1 .24c-2.75-1.68-6.2-2.06-10.27-1.13a.73.73 0 0 1-.33-1.43c4.45-1.01 8.27-.57 11.36 1.32.34.21.45.65.24 1Zm1.21-2.69a.91.91 0 0 1-1.25.3c-3.15-1.94-7.96-2.5-11.68-1.37a.91.91 0 0 1-.53-1.74c4.25-1.29 9.55-.67 13.16 1.55.43.26.56.83.3 1.26Zm.1-2.8C14.07 8.65 7.84 8.44 4.23 9.54a1.09 1.09 0 1 1-.63-2.08c4.15-1.26 11.03-1.01 15.36 1.55a1.09 1.09 0 0 1-1.11 1.88Z" />
      </svg>
    );
  }

  if (platform === "youtube") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path d="M21.58 6.19a2.99 2.99 0 0 0-2.1-2.12C17.63 3.57 12 3.57 12 3.57s-5.63 0-7.48.5a2.99 2.99 0 0 0-2.1 2.12C1.92 8.06 1.92 12 1.92 12s0 3.94.5 5.81a2.99 2.99 0 0 0 2.1 2.12c1.85.5 7.48.5 7.48.5s5.63 0 7.48-.5a2.99 2.99 0 0 0 2.1-2.12c.5-1.87.5-5.81.5-5.81s0-3.94-.5-5.81ZM9.75 15.72V8.28L15.98 12l-6.23 3.72Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path d="M7.9 2h8.2A5.9 5.9 0 0 1 22 7.9v8.2a5.9 5.9 0 0 1-5.9 5.9H7.9A5.9 5.9 0 0 1 2 16.1V7.9A5.9 5.9 0 0 1 7.9 2Zm0 2A3.9 3.9 0 0 0 4 7.9v8.2A3.9 3.9 0 0 0 7.9 20h8.2a3.9 3.9 0 0 0 3.9-3.9V7.9A3.9 3.9 0 0 0 16.1 4H7.9ZM12 7.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8Zm0 2a2.9 2.9 0 1 0 0 5.8 2.9 2.9 0 0 0 0-5.8Zm5.08-2.43a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Z" />
    </svg>
  );
}

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
            aria-label={item.label}
          >
            <SocialIcon platform={item.platform} />
          </a>
        ))}
      </div>
      <p className={styles.legal}>
        © {new Date().getFullYear()} Celtic Worship. All rights reserved.
      </p>
    </footer>
  );
}
