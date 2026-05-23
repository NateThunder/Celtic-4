import type { Metadata } from "next";
import Link from "next/link";
import SiteHeader from "../components/SiteHeader";
import { WOO_BASE_URL } from "../lib/woo";
import styles from "./admin.module.css";

export const metadata: Metadata = {
  title: "Admin | Celtic Worship",
  description: "Celtic Worship admin dashboard.",
};

type AdminLink = {
  title: string;
  eyebrow: string;
  description: string;
  href: string;
  action: string;
  external?: boolean;
};

const siteSections: AdminLink[] = [
  {
    title: "Homepage",
    eyebrow: "Website",
    description: "Hero, latest release, featured events, video, and newsletter entry points.",
    href: "/",
    action: "View page",
  },
  {
    title: "Music",
    eyebrow: "Catalogue",
    description: "Albums, platform links, release artwork, and listening paths.",
    href: "/music",
    action: "Review music",
  },
  {
    title: "Live Events",
    eyebrow: "Shows",
    description: "Bandsintown-powered event listings and live page presentation.",
    href: "/live-events",
    action: "Check events",
  },
  {
    title: "Videos",
    eyebrow: "Video",
    description: "YouTube videos, public media assets, and watch links.",
    href: "/videos",
    action: "Open videos",
  },
  {
    title: "Shop",
    eyebrow: "Commerce",
    description: "Storefront categories, product pages, cart, and checkout flow.",
    href: "/shop",
    action: "View shop",
  },
  {
    title: "About",
    eyebrow: "Profile",
    description: "Band story, biography copy, and public about page.",
    href: "/about",
    action: "Read page",
  },
];

function getUrl(path: string, baseUrl: string): string {
  try {
    return new URL(path, baseUrl).toString();
  } catch {
    return path;
  }
}

function getHostLabel(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "Not configured";
  }
}

const wooAdminUrl = getUrl("/wp-admin/", WOO_BASE_URL);
const wooProductsUrl = getUrl("/wp-admin/edit.php?post_type=product", WOO_BASE_URL);
const wooOrdersUrl = getUrl("/wp-admin/admin.php?page=wc-orders", WOO_BASE_URL);
const bandsintownArtistUrl = "https://manager.bandsintown.com/artists/849462";

const managementLinks: AdminLink[] = [
  {
    title: "Stem Uploads",
    eyebrow: "Audio",
    description: "Upload saved stem sessions for the public stem player.",
    href: "/admin/stems",
    action: "Manage stems",
  },
  {
    title: "WordPress Admin",
    eyebrow: "Store CMS",
    description: "Open the connected WordPress admin area for shop and content operations.",
    href: wooAdminUrl,
    action: "Open admin",
    external: true,
  },
  {
    title: "Products",
    eyebrow: "WooCommerce",
    description: "Manage product titles, pricing, stock, images, and descriptions.",
    href: wooProductsUrl,
    action: "Manage products",
    external: true,
  },
  {
    title: "Orders",
    eyebrow: "WooCommerce",
    description: "Review orders, fulfilment, customer details, and payment status.",
    href: wooOrdersUrl,
    action: "Review orders",
    external: true,
  },
  {
    title: "Events",
    eyebrow: "Bandsintown",
    description: "Update tour dates that feed the homepage and live events page.",
    href: bandsintownArtistUrl,
    action: "Open events",
    external: true,
  },
];

const bandsintownAppId = process.env.NEXT_PUBLIC_BANDSINTOWN_APP_ID?.trim();

function AdminCard({ item }: { item: AdminLink }) {
  const className = styles.cardLink;

  if (item.external) {
    return (
      <li className={styles.card}>
        <a className={className} href={item.href} target="_blank" rel="noopener noreferrer">
          <span className={styles.eyebrow}>{item.eyebrow}</span>
          <strong>{item.title}</strong>
          <span>{item.description}</span>
          <em>{item.action}</em>
        </a>
      </li>
    );
  }

  return (
    <li className={styles.card}>
      <Link className={className} href={item.href}>
        <span className={styles.eyebrow}>{item.eyebrow}</span>
        <strong>{item.title}</strong>
        <span>{item.description}</span>
        <em>{item.action}</em>
      </Link>
    </li>
  );
}

export default function AdminPage() {
  const integrationStatus = [
    {
      label: "WooCommerce",
      value: getHostLabel(WOO_BASE_URL),
    },
    {
      label: "Bandsintown",
      value: bandsintownAppId ? "App ID configured" : "Using local fallback",
    },
    {
      label: "Access",
      value: "Open route",
    },
  ];

  return (
    <div className="site-shell">
      <SiteHeader />
      <main className={styles.page}>
        <section className={styles.shell}>
          <header className={styles.header}>
            <div>
              <p className={styles.kicker}>Admin</p>
              <h1 className={styles.title}>Site Admin</h1>
              <p className={styles.lede}>
                A lightweight command centre for the public site while authentication is still pending.
              </p>
            </div>
            <aside className={styles.notice} aria-label="Admin access status">
              <span>Access</span>
              <strong>No auth enabled</strong>
              <p>This page is intentionally open for now.</p>
            </aside>
          </header>

          <section className={styles.statusGrid} aria-label="Integration status">
            {integrationStatus.map((item) => (
              <div key={item.label} className={styles.statusItem}>
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </div>
            ))}
          </section>

          <section className={styles.section} aria-labelledby="management-heading">
            <div className={styles.sectionHeader}>
              <p className={styles.kicker}>Manage</p>
              <h2 id="management-heading">Operations</h2>
            </div>
            <ul className={styles.cardGrid}>
              {managementLinks.map((item) => (
                <AdminCard key={item.title} item={item} />
              ))}
            </ul>
          </section>

          <section className={styles.section} aria-labelledby="site-sections-heading">
            <div className={styles.sectionHeader}>
              <p className={styles.kicker}>Review</p>
              <h2 id="site-sections-heading">Site Sections</h2>
            </div>
            <ul className={styles.cardGrid}>
              {siteSections.map((item) => (
                <AdminCard key={item.title} item={item} />
              ))}
            </ul>
          </section>
        </section>
      </main>
    </div>
  );
}
