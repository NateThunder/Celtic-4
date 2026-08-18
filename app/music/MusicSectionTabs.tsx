import Link from "next/link";
import styles from "./music.module.css";

type MusicSectionTabsProps = {
  active: "discography" | "charts";
};

const TABS = [
  { key: "discography", label: "Discography", href: "/music" },
  { key: "charts", label: "Sheet Music", href: "/music/charts" },
] as const;

export default function MusicSectionTabs({ active }: MusicSectionTabsProps) {
  return (
    <nav className={styles.musicTabs} aria-label="Music section">
      {TABS.map((tab) => {
        const isActive = active === tab.key;

        return (
          <Link
            key={tab.key}
            className={`${styles.musicTab}${isActive ? ` ${styles.musicTabActive}` : ""}`}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
