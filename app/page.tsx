import AlbumStack from "./components/AlbumStack";
import BandsintownWidget from "./components/BandsintownWidget";
import FeaturedVideo from "./components/FeaturedVideo";
import SiteHeader from "./components/SiteHeader";
import Image from "next/image";
import Link from "next/link";

const FEATURED_VIDEO_ID = "3zGhq1ZKbjg";

const HARVEST_SPOTIFY_URL = "https://open.spotify.com/album/1wHT87ZTsVzWlHBPl068YZ";
const HARVEST_APPLE_MUSIC_URL = "https://music.apple.com/us/album/harvest/1843396548";
const HARVEST_YOUTUBE_URL =
  "https://www.youtube.com/playlist?list=OLAK5uy_l8_ItN9BtXWp2pnL6sTJjHMxzSsPbk3Nc";

function SpotifyIcon() {
  return (
    <svg className="editorial-platform-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="M12 2.1a9.9 9.9 0 1 0 0 19.8 9.9 9.9 0 0 0 0-19.8Zm4.54 14.28a.73.73 0 0 1-1 .24c-2.75-1.68-6.2-2.06-10.27-1.13a.73.73 0 0 1-.33-1.43c4.45-1.01 8.27-.57 11.36 1.32.34.21.45.65.24 1Zm1.21-2.69a.91.91 0 0 1-1.25.3c-3.15-1.94-7.96-2.5-11.68-1.37a.91.91 0 0 1-.53-1.74c4.25-1.29 9.55-.67 13.16 1.55.43.26.56.83.3 1.26Zm.1-2.8C14.07 8.65 7.84 8.44 4.23 9.54a1.09 1.09 0 1 1-.63-2.08c4.15-1.26 11.03-1.01 15.36 1.55a1.09 1.09 0 0 1-1.11 1.88Z"
        fill="currentColor"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg className="editorial-platform-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="M15.7 6.3c.8-1 1.2-2.3 1.2-3.3-1.1.1-2.4.8-3.1 1.7-.7.8-1.3 2.1-1.2 3.3 1.3.1 2.4-.6 3.1-1.7Zm3.4 10.4c-.4 1-1 2.1-1.8 3-.9 1-1.9 2-3.3 2-1.3 0-1.8-.7-3.4-.7-1.6 0-2.1.7-3.5.7-1.4 0-2.4-.9-3.3-2C2 17.2 1 14.3 2.7 11.6c1.2-1.9 3.1-3.1 5.2-3.1 1.4 0 2.6.8 3.4.8.8 0 2.3-1 3.9-.9.7 0 2.7.3 4 2.2-3.5 1.8-2.9 5.9 0 6.1Z"
        fill="currentColor"
      />
    </svg>
  );
}

function YouTubeIcon() {
  return (
    <svg className="editorial-platform-icon" viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="M21.58 7.19a2.75 2.75 0 0 0-1.94-1.94C17.93 4.8 12 4.8 12 4.8s-5.93 0-7.64.45a2.75 2.75 0 0 0-1.94 1.94A28.83 28.83 0 0 0 2 12a28.83 28.83 0 0 0 .42 4.81 2.75 2.75 0 0 0 1.94 1.94c1.71.45 7.64.45 7.64.45s5.93 0 7.64-.45a2.75 2.75 0 0 0 1.94-1.94A28.83 28.83 0 0 0 22 12a28.83 28.83 0 0 0-.42-4.81ZM10.02 15.15v-6.3L15.48 12l-5.46 3.15Z"
        fill="currentColor"
      />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="site-shell editorial-home-shell">
      <SiteHeader />

      <main className="editorial-home-page">
        <section id="home" className="editorial-hero" aria-label="Celtic Worship home">
          <video
            className="editorial-hero-video"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
          >
            <source src="/Sequence%2001_1.mp4" type="video/mp4" />
          </video>
          <div className="editorial-hero-scrim" aria-hidden="true" />

          <div className="editorial-hero-copy">
            <h1 className="editorial-hero-title">
              <span>Celtic Worship Is</span>
              <span className="is-gold">A Christ-Centred</span>
              <span className="is-gold">Worship Collective</span>
            </h1>
            <p className="editorial-hero-subtitle">
              Writing and leading songs for the church through the sounds of Scotland.
            </p>
            <Link className="editorial-button editorial-button--gold" href="/music">
              Listen Now
            </Link>
          </div>
        </section>

        <section id="live-events" className="live-events-section home-events-section" aria-label="Live events">
          <div className="live-events-inner">
            <div className="home-events-layout">
              <div className="home-events-copy">
                <h2 className="live-events-title">
                  Upcoming <span>Events</span>
                </h2>
                <Link className="home-events-link" href="/live-events">
                  View All Events
                </Link>
              </div>

              <div className="home-events-image" aria-label="Featured event posters">
                <figure className="home-events-image-poster home-events-image-poster--primary">
                  <Image
                    src="/oh holy night poster.jpg"
                    alt="O Holy Night presented by Celtic Worship and Zerua Music at O2 Academy Glasgow on 17 December 2026."
                    fill
                    sizes="(max-width: 900px) 42vw, 210px"
                    priority
                  />
                </figure>
                <figure className="home-events-image-poster home-events-image-poster--secondary">
                  <Image
                    src="/then sings poster.png"
                    alt="Celtic Worship Then Sings My Soul events at St Luke's Glasgow and Charlotte Chapel Edinburgh."
                    fill
                    sizes="(max-width: 900px) 38vw, 190px"
                  />
                </figure>
              </div>

              <div className="home-events-feed">
                <BandsintownWidget variant="home" />
              </div>
            </div>
          </div>
        </section>

        <section id="music" className="editorial-release-section" aria-label="Latest release">
          <div className="editorial-release-inner">
            <div className="editorial-release-art">
              <AlbumStack />
            </div>

            <div className="editorial-release-main">
              <p className="editorial-section-kicker">New Release</p>
              <h2>Celtic Worship - Harvest</h2>
              <div className="editorial-stream-stack" aria-label="Listen to Harvest">
                <a
                  className="editorial-stream-link editorial-stream-link--primary"
                  href={HARVEST_SPOTIFY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <SpotifyIcon />
                  <span>Spotify</span>
                </a>
                <a
                  className="editorial-stream-link"
                  href={HARVEST_APPLE_MUSIC_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <AppleIcon />
                  <span>Music</span>
                </a>
                <a
                  className="editorial-stream-link"
                  href={HARVEST_YOUTUBE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <YouTubeIcon />
                  <span>YouTube</span>
                </a>
              </div>
              <p className="editorial-platform-note">Available on all platforms</p>
            </div>
          </div>
        </section>

        <FeaturedVideo
          sectionId="media"
          videoId={FEATURED_VIDEO_ID}
          variant="editorial"
          fallbackTitle="I Need Thee"
        />

        <section id="about" className="editorial-bottom-section" aria-label="About and updates">
          <div className="editorial-bottom-image">
            <Image
              src="/Bio-Vertical-576x1024.webp"
              alt=""
              fill
              sizes="(max-width: 900px) 92vw, 280px"
              aria-hidden="true"
            />
          </div>

          <div className="editorial-newsletter" role="group" aria-labelledby="newsletter-title">
            <h2 id="newsletter-title">Stay in the Loop</h2>
            <p>Get updates on new music, events, and more.</p>
            <label className="editorial-newsletter-label" htmlFor="newsletter-email">
              Email address
            </label>
            <input id="newsletter-email" type="email" placeholder="Your email address" />
            <button type="button">Subscribe</button>
          </div>
        </section>
      </main>

      <footer className="editorial-shop-cta" aria-label="Shop Celtic Worship">
        <h2>Take Celtic Worship Home</h2>
        <p>Browse apparel, music, and more from the official Celtic Worship store.</p>
        <Link className="editorial-shop-link" href="/shop">
          Shop Now
        </Link>
      </footer>
    </div>
  );
}
