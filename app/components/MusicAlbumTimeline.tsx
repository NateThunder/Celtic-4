"use client";

import Image from "next/image";
import { useEffect } from "react";
import styles from "../music/music.module.css";

type Platform = "spotify" | "apple" | "youtube" | "buy";

type AlbumLink = {
  label: string;
  href: string;
  platform: Platform;
  newTab?: boolean;
};

type Album = {
  title: string;
  year: string;
  coverSrc: string;
  coverAlt: string;
  links: AlbumLink[];
};

const ALBUMS: Album[] = [
  {
    title: "Harvest",
    year: "2025",
    coverSrc: "/Harvest.webp",
    coverAlt: "Harvest album artwork",
    links: [
      { label: "Spotify", href: "https://open.spotify.com/album/1wHT87ZTsVzWlHBPl068YZ", platform: "spotify" },
      { label: "Apple Music", href: "https://music.apple.com/us/album/harvest/1843396548", platform: "apple" },
      {
        label: "YouTube",
        href: "https://www.youtube.com/playlist?list=OLAK5uy_l8_ItN9BtXWp2pnL6sTJjHMxzSsPbk3Nc",
        platform: "youtube",
      },
      { label: "Buy", href: "/shop?album=harvest", platform: "buy", newTab: false },
    ],
  },
  {
    title: "Come Behold: Christmas Collaborations",
    year: "2022",
    coverSrc: "/COME%20BEHOLD.webp",
    coverAlt: "Come Behold: Christmas Collaborations album artwork",
    links: [
      { label: "Spotify", href: "https://open.spotify.com/album/3LgIkLu8FiXrIdGoGi0wzC", platform: "spotify" },
      {
        label: "Apple Music",
        href: "https://music.apple.com/us/album/come-behold-christmas-collaborations/1855892561",
        platform: "apple",
      },
      {
        label: "YouTube",
        href: "https://www.youtube.com/playlist?list=OLAK5uy_lSsRcOeye-R3aj2aTvNj6ZgV8mpzUxSnw",
        platform: "youtube",
      },
      { label: "Buy", href: "/shop?album=come-behold", platform: "buy", newTab: false },
    ],
  },
  {
    title: "Morningtide",
    year: "2021",
    coverSrc: "/MORNINGTIDE.webp",
    coverAlt: "Morningtide album artwork",
    links: [
      { label: "Spotify", href: "https://open.spotify.com/album/2eVE06iQg6hXInZ3T4Tl3U", platform: "spotify" },
      { label: "Apple Music", href: "https://music.apple.com/us/album/morningtide/1813246088", platform: "apple" },
      {
        label: "YouTube",
        href: "https://www.youtube.com/playlist?list=OLAK5uy_lXKSwIEyECDMQsZ_gI3nj2VPE5lQSGVrc",
        platform: "youtube",
      },
      { label: "Buy", href: "/shop?album=morningtide", platform: "buy", newTab: false },
    ],
  },
  {
    title: "Homeward",
    year: "2019",
    coverSrc: "/HOMEWARD.jpeg",
    coverAlt: "Homeward album artwork",
    links: [
      { label: "Spotify", href: "https://open.spotify.com/album/4v6piy6UMrtHFPVWFwNWAh", platform: "spotify" },
      { label: "Apple Music", href: "https://music.apple.com/us/album/homeward/1755005048", platform: "apple" },
      {
        label: "YouTube",
        href: "https://www.youtube.com/playlist?list=OLAK5uy_mVje3QdFtaFd-u-5SmJEoBG_J-9iYUSR8",
        platform: "youtube",
      },
      { label: "Buy", href: "/shop?album=homeward", platform: "buy", newTab: false },
    ],
  },
];

function PlatformIcon({ platform }: { platform: Platform }) {
  if (platform === "spotify") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path d="M7.2 10.1c3.6-1.1 6.6-.9 9.6.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M7.9 13c2.9-.8 5.3-.7 7.8.4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M8.7 15.8c2-.5 3.8-.4 5.5.3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  if (platform === "apple") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M15.7 6.3c.8-1 1.2-2.3 1.2-3.3-1.1.1-2.4.8-3.1 1.7-.7.8-1.3 2.1-1.2 3.3 1.3.1 2.4-.6 3.1-1.7Zm3.4 10.4c-.4 1-1 2.1-1.8 3-.9 1-1.9 2-3.3 2-1.3 0-1.8-.7-3.4-.7-1.6 0-2.1.7-3.5.7-1.4 0-2.4-.9-3.3-2C2 17.2 1 14.3 2.7 11.6c1.2-1.9 3.1-3.1 5.2-3.1 1.4 0 2.6.8 3.4.8.8 0 2.3-1 3.9-.9.7 0 2.7.3 4 2.2-3.5 1.8-2.9 5.9 0 6.1Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (platform === "buy") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M7.2 8.2h9.6l-.6 10.2a1.8 1.8 0 0 1-1.8 1.7H9.6a1.8 1.8 0 0 1-1.8-1.7L7.2 8.2Zm3-2.2a1.8 1.8 0 1 1 3.6 0v1.3h-3.6V6Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.8 6.2h16.4c1.2 0 2.2 1 2.2 2.2v7.2c0 1.2-1 2.2-2.2 2.2H3.8c-1.2 0-2.2-1-2.2-2.2V8.4c0-1.2 1-2.2 2.2-2.2Z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="m10.3 9.4 5 2.6-5 2.6V9.4Z" fill="currentColor" />
    </svg>
  );
}

export default function MusicAlbumTimeline() {
  useEffect(() => {
    const cards = Array.from(document.querySelectorAll<HTMLElement>("[data-album-card]"));
    if (cards.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add(styles.isVisible);
          observer.unobserve(entry.target);
        });
      },
      {
        threshold: 0.2,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    cards.forEach((card) => observer.observe(card));

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className={styles.timeline} aria-label="Celtic Worship albums in reverse chronological order">
      {ALBUMS.map((album, index) => (
        <article key={`${album.title}-${album.year}`} className={styles.albumSection}>
          <div className={styles.albumLayout} data-album-card>
            <div className={styles.coverShell}>
              <Image
                className={styles.coverImage}
                src={album.coverSrc}
                alt={album.coverAlt}
                width={1200}
                height={1200}
                sizes="(max-width: 900px) 82vw, (max-width: 1200px) 38vw, 360px"
                priority={index < 2}
              />
            </div>

            <div className={styles.albumMeta}>
              <h2 className={styles.albumTitle}>{album.title}</h2>
              <p className={styles.albumYear}>{album.year}</p>
            </div>

            <div className={styles.streamStack} aria-label={`${album.title} streaming links`}>
              {album.links.map((link) => (
                <a
                  key={`${album.title}-${link.platform}`}
                  className={`${styles.streamLink} ${styles[link.platform]}`}
                  href={link.href}
                  target={link.newTab === false ? undefined : "_blank"}
                  rel={link.newTab === false ? undefined : "noopener noreferrer"}
                >
                  <span className={styles.streamIcon} aria-hidden="true">
                    <PlatformIcon platform={link.platform} />
                  </span>
                  <span>{link.label}</span>
                </a>
              ))}
            </div>
          </div>

          {index < ALBUMS.length - 1 ? <div className={styles.divider} aria-hidden="true" /> : null}
        </article>
      ))}
    </div>
  );
}
