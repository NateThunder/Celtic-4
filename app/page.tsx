import AlbumStack from "./components/AlbumStack";
import FeaturedVideo from "./components/FeaturedVideo";
import SiteHeader from "./components/SiteHeader";
import Link from "next/link";

const FEATURED_VIDEO_ID = "3zGhq1ZKbjg";
const SPOTIFY_PROFILE_URL = "https://open.spotify.com/artist/0h2AQKpVBEEXQQ03KGf7ep?si=9eAa0Ik8Rmm2Nip-K8Y-Kg";
const APPLE_MUSIC_PROFILE_URL = "https://music.apple.com/us/artist/celtic-worship/1456387920";
const YOUTUBE_PROFILE_URL = "https://www.youtube.com/CelticWorshipMusic";

function SpotifyWordmark() {
  return (
    <span className="platform-brand platform-brand-spotify" aria-hidden="true">
      <svg
        className="platform-brand-icon platform-brand-icon-spotify"
        viewBox="0 0 48 48"
        focusable="false"
      >
        <circle cx="24" cy="24" r="24" fill="#fff" />
        <path
          d="M13 18.1c7.9-2.4 15.4-1.5 22.2 2.1"
          fill="none"
          stroke="#1db954"
          strokeWidth="3.2"
          strokeLinecap="round"
        />
        <path
          d="M14.9 24.6c6.5-1.8 12.1-1.2 17.7 1.5"
          fill="none"
          stroke="#1db954"
          strokeWidth="2.8"
          strokeLinecap="round"
        />
        <path
          d="M16.8 30.6c4.8-1.3 9-0.9 13.1 1.1"
          fill="none"
          stroke="#1db954"
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      </svg>
      <span className="platform-brand-label platform-brand-label-spotify">Spotify</span>
    </span>
  );
}

function AppleMusicWordmark() {
  return (
    <span className="platform-brand platform-brand-apple" aria-hidden="true">
      <svg
        className="platform-brand-icon platform-brand-icon-apple"
        viewBox="0 0 24 24"
        focusable="false"
      >
        <path
          d="M15.7 6.3c.8-1 1.2-2.3 1.2-3.3-1.1.1-2.4.8-3.1 1.7-.7.8-1.3 2.1-1.2 3.3 1.3.1 2.4-.6 3.1-1.7Zm3.4 10.4c-.4 1-1 2.1-1.8 3-.9 1-1.9 2-3.3 2-1.3 0-1.8-.7-3.4-.7-1.6 0-2.1.7-3.5.7-1.4 0-2.4-.9-3.3-2C2 17.2 1 14.3 2.7 11.6c1.2-1.9 3.1-3.1 5.2-3.1 1.4 0 2.6.8 3.4.8.8 0 2.3-1 3.9-.9.7 0 2.7.3 4 2.2-3.5 1.8-2.9 5.9 0 6.1Z"
          fill="currentColor"
        />
      </svg>
      <span className="platform-brand-label platform-brand-label-apple">MUSIC</span>
    </span>
  );
}

function YouTubeWordmark() {
  return (
    <span className="platform-brand platform-brand-youtube" aria-hidden="true">
      <svg
        className="platform-brand-icon platform-brand-icon-youtube"
        viewBox="0 0 96 68"
        focusable="false"
      >
        <rect x="0" y="10" width="96" height="48" rx="12" fill="#ff0000" />
        <path d="M40 24.2 62 34 40 43.8V24.2Z" fill="#fff" />
      </svg>
      <span className="platform-brand-label platform-brand-label-youtube">YouTube</span>
    </span>
  );
}

export default function Home() {
  const bandsintownAppId = process.env.NEXT_PUBLIC_BANDSINTOWN_APP_ID?.trim() || "js_localhost";

  return (
    <div className="site-shell">
      <SiteHeader />

      <main>
        <section id="home" className="hero-banner">
          <video
            className="hero-video"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          >
            <source src="/Sequence%2001_1.mp4" type="video/mp4" />
          </video>
          <div className="hero-overlay" />
          <div className="hero-content">
            <h1>
              PSALMS, HYMNS & SPIRITUAL SONGS.
            </h1>
            <p className="hero-copy">
              <strong>Celtic Worship</strong> is a Christ-centred worship collective 
              writing and leading songs for the church through the sounds of Scotland. 
            </p>
          </div>
        </section>

        <section id="live-events" className="live-events-section" aria-label="Live events">
          <div className="live-events-inner">
            <h2 className="live-events-title">Upcoming Events</h2>
            <div
              id="bandsintown-events"
              data-artist-id="849462"
              data-app-id={bandsintownAppId}
              aria-live="polite"
            >
              <p className="events-status">Loading upcoming events...</p>
            </div>
          </div>
        </section>

        <section id="about" className="release-section">
          <div className="release-grid">
            <div className="release-left">
              <p className="release-kicker">Latest Release</p>
              <h2 className="release-title">CELTIC WORSHIP - HARVEST</h2>

              <AlbumStack />
            </div>

            <div className="release-platforms" aria-label="Streaming services">
              <a
                className="platform-button platform-spotify"
                href={SPOTIFY_PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Spotify"
              >
                <SpotifyWordmark />
              </a>
              <a
                className="platform-button platform-apple"
                href={APPLE_MUSIC_PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Apple Music"
              >
                <AppleMusicWordmark />
              </a>
              <a
                className="platform-button platform-youtube"
                href={YOUTUBE_PROFILE_URL}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
              >
                <YouTubeWordmark />
              </a>
            </div>
          </div>
        </section>

        <FeaturedVideo videoId={FEATURED_VIDEO_ID} />

        <section id="shop" className="merch-section section-gold shop-cta-section" aria-label="Shop">
          <div className="merch-inner">
            <h2 className="merch-title">Take Celtic Worship Home</h2>
            <p className="merch-copy">
              Browse apparel, music, and more from the official Celtic Worship store.
            </p>
            <div className="merch-actions">
              <Link className="merch-link" href="/shop">
                Shop now
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
