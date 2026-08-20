import Image from "next/image";
import styles from "../music/music.module.css";

type Platform = "cd" | "spotify" | "apple" | "youtube";

type AlbumLink = {
  label: string;
  href: string;
  platform: Platform;
  newTab?: boolean;
};

type Album = {
  id: string;
  title: string;
  year: string;
  coverSrc: string;
  coverAlt: string;
  links: AlbumLink[];
};

const ALBUMS: Album[] = [
  {
    id: "harvest",
    title: "Harvest",
    year: "2025",
    coverSrc: "/Harvest.webp",
    coverAlt: "Harvest album artwork",
    links: [
      {
        label: "Buy CD",
        href: "/shop/565",
        platform: "cd",
        newTab: false,
      },
      {
        label: "Listen on Spotify",
        href: "https://open.spotify.com/album/1wHT87ZTsVzWlHBPl068YZ",
        platform: "spotify",
      },
      {
        label: "Listen on Apple Music",
        href: "https://music.apple.com/us/album/harvest/1843396548",
        platform: "apple",
      },
      {
        label: "Watch on YouTube",
        href: "https://www.youtube.com/playlist?list=OLAK5uy_l8_ItN9BtXWp2pnL6sTJjHMxzSsPbk3Nc",
        platform: "youtube",
      },
    ],
  },
  {
    id: "come-behold",
    title: "Come Behold: Christmas Collaborations",
    year: "2022",
    coverSrc: "/COME%20BEHOLD.webp",
    coverAlt: "Come Behold: Christmas Collaborations album artwork",
    links: [
      {
        label: "Buy CD",
        href: "/shop/392",
        platform: "cd",
        newTab: false,
      },
      {
        label: "Listen on Spotify",
        href: "https://open.spotify.com/album/3LgIkLu8FiXrIdGoGi0wzC",
        platform: "spotify",
      },
      {
        label: "Listen on Apple Music",
        href: "https://music.apple.com/us/album/come-behold-christmas-collaborations/1855892561",
        platform: "apple",
      },
      {
        label: "Watch on YouTube",
        href: "https://www.youtube.com/playlist?list=OLAK5uy_lSsRcOeye-R3aj2aTvNj6ZgV8mpzUxSnw",
        platform: "youtube",
      },
    ],
  },
  {
    id: "morningtide",
    title: "Morningtide",
    year: "2021",
    coverSrc: "/MORNINGTIDE.webp",
    coverAlt: "Morningtide album artwork",
    links: [
      {
        label: "Buy CD",
        href: "/shop/396",
        platform: "cd",
        newTab: false,
      },
      {
        label: "Listen on Spotify",
        href: "https://open.spotify.com/album/2eVE06iQg6hXInZ3T4Tl3U",
        platform: "spotify",
      },
      {
        label: "Listen on Apple Music",
        href: "https://music.apple.com/us/album/morningtide/1813246088",
        platform: "apple",
      },
      {
        label: "Watch on YouTube",
        href: "https://www.youtube.com/playlist?list=OLAK5uy_lXKSwIEyECDMQsZ_gI3nj2VPE5lQSGVrc",
        platform: "youtube",
      },
    ],
  },
  {
    id: "homeward",
    title: "Homeward",
    year: "2019",
    coverSrc: "/HOMEWARD.jpeg",
    coverAlt: "Homeward album artwork",
    links: [
      {
        label: "Buy CD",
        href: "/shop/511",
        platform: "cd",
        newTab: false,
      },
      {
        label: "Listen on Spotify",
        href: "https://open.spotify.com/album/4v6piy6UMrtHFPVWFwNWAh",
        platform: "spotify",
      },
      {
        label: "Listen on Apple Music",
        href: "https://music.apple.com/us/album/homeward/1755005048",
        platform: "apple",
      },
      {
        label: "Watch on YouTube",
        href: "https://www.youtube.com/playlist?list=OLAK5uy_mVje3QdFtaFd-u-5SmJEoBG_J-9iYUSR8",
        platform: "youtube",
      },
    ],
  },
];

function PlatformIcon({ platform }: { platform: Platform }) {
  if (platform === "cd") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <circle cx="12" cy="12" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path d="M14 4.2 12.7 9.7M19.8 10.2l-5.5 1.2M16.9 18.4l-3.3-4.7M7.1 18.4l3.3-4.7" fill="none" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" />
      </svg>
    );
  }

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

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3.8 6.2h16.4c1.2 0 2.2 1 2.2 2.2v7.2c0 1.2-1 2.2-2.2 2.2H3.8c-1.2 0-2.2-1-2.2-2.2V8.4c0-1.2 1-2.2 2.2-2.2Z" fill="none" stroke="currentColor" strokeWidth="1.7" />
      <path d="m10.3 9.4 5 2.6-5 2.6V9.4Z" fill="currentColor" />
    </svg>
  );
}

export default function MusicAlbumTimeline() {
  return (
    <div className={styles.timeline} aria-label="Celtic Worship albums in reverse chronological order">
      {ALBUMS.map((album, index) => (
        <article
          id={album.id}
          key={`${album.title}-${album.year}`}
          className={styles.albumSection}
        >
          <div className={styles.albumLayout}>
            <div className={styles.coverShell}>
              <Image
                className={styles.coverImage}
                src={album.coverSrc}
                alt={album.coverAlt}
                width={520}
                height={520}
                sizes="(max-width: 620px) 30vw, (max-width: 1080px) 180px, 220px"
                priority={index < 2}
              />
            </div>

            <div className={styles.albumMeta}>
              <p className={styles.albumYear}>{album.year}</p>
              <h2 className={styles.albumTitle}>{album.title}</h2>

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
          </div>

          {index < ALBUMS.length - 1 ? <div className={styles.divider} aria-hidden="true" /> : null}
        </article>
      ))}
    </div>
  );
}
