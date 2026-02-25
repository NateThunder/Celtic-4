import Image from "next/image";
import AlbumStack from "./components/AlbumStack";
import SiteHeader from "./components/SiteHeader";

const FEATURED_VIDEO_ID = "3zGhq1ZKbjg";
const FEATURED_VIDEO_URL = `https://www.youtube.com/watch?v=${FEATURED_VIDEO_ID}`;
const FEATURED_VIDEO_EMBED_URL = `https://www.youtube.com/embed/${FEATURED_VIDEO_ID}`;

async function getFeaturedVideoTitle(): Promise<string> {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(
    FEATURED_VIDEO_URL
  )}&format=json`;

  try {
    const response = await fetch(oembedUrl, { next: { revalidate: 86400 } });
    if (!response.ok) throw new Error(`Failed to load oEmbed: ${response.status}`);

    const data = (await response.json()) as { title?: string };
    return data.title?.trim() || "Featured Video";
  } catch {
    return "Featured Video";
  }
}

export default async function Home() {
  const featuredVideoTitle = await getFeaturedVideoTitle();

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
              They also want to create a community for creatives who believe in Jesus 
              but have been pushed to the margins of the church music industry.
            </p>
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
                href="#"
                aria-label="Spotify"
              >
                <Image
                  className="platform-logo platform-logo-full platform-logo-spotify"
                  src="/2024-spotify-brand-assets-media-kit.jpg"
                  alt="Spotify"
                  width={2048}
                  height={1152}
                />
              </a>
              <a
                className="platform-button platform-apple"
                href="#"
                aria-label="Apple Music"
              >
                <Image
                  className="platform-logo"
                  src="/Apple%20Music.avif"
                  alt="Apple Music"
                  width={240}
                  height={52}
                />
              </a>
              <a
                className="platform-button platform-youtube"
                href="#"
                aria-label="YouTube"
              >
                <Image
                  className="platform-logo"
                  src="/youtube.avif"
                  alt="YouTube"
                  width={240}
                  height={52}
                />
              </a>
            </div>
          </div>
        </section>

        <section id="videos" className="featured-video-section">
          <div className="featured-video-inner">
            <div className="featured-video-frame-wrap">
              <iframe
                className="featured-video-frame"
                src={FEATURED_VIDEO_EMBED_URL}
                title={featuredVideoTitle}
                loading="lazy"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>

            <h2 className="featured-video-title">{featuredVideoTitle}</h2>
          </div>
        </section>
        <section id="music" className="section-placeholder section-light" />
        <section id="charts" className="section-placeholder section-light" />
      </main>
    </div>
  );
}
