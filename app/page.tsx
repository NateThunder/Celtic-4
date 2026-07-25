import Image from "next/image";
import Link from "next/link";
import AlbumStack from "./components/AlbumStack";
import FeaturedVideo from "./components/FeaturedVideo";
import HomeEvents from "./components/HomeEvents";
import HomeReveal from "./components/HomeReveal";
import SiteHeader from "./components/SiteHeader";
import { getUpcomingEvents } from "./lib/events";
import { getFeaturedProducts } from "./lib/featuredProducts";

const FEATURED_VIDEO_ID = "3zGhq1ZKbjg";

const FOOTER_LINKS = [
  { label: "Home", href: "#home" },
  { label: "Music", href: "/music" },
  { label: "Charts", href: "/music/charts" },
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

export default async function Home() {
  const [events, featuredProducts] = await Promise.all([
    getUpcomingEvents(),
    getFeaturedProducts(3),
  ]);

  return (
    <div className="site-shell editorial-home-shell">
      <HomeReveal />
      <SiteHeader variant="home" />

      <main className="editorial-home-page">
        <section id="home" className="editorial-hero" aria-label="Celtic Worship home">
          <video
            className="editorial-hero-video"
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-hidden="true"
          >
            <source src="/Sequence%2001_1.mp4" type="video/mp4" />
          </video>
          <div className="editorial-hero-lockup">
            <h1 className="editorial-hero-title">
              <span>Celtic</span>
              <span>Worship</span>
            </h1>
            <p className="editorial-hero-tagline">Hymns · Sessions · Live</p>
          </div>
        </section>

        <HomeEvents events={events} />

        <section id="music" className="home-music-showcase" aria-labelledby="home-music-title">
          <div className="home-music-inner" data-home-reveal>
            <h2 id="home-music-title">The Music</h2>
            <div className="home-music-albums">
              <AlbumStack />
            </div>
            <Link className="home-outline-link home-outline-link--light" href="/music">
              Explore the music
            </Link>
          </div>
        </section>

        <div className="home-performance-wrap" data-home-reveal>
          <FeaturedVideo
            sectionId="media"
            videoId={FEATURED_VIDEO_ID}
            variant="editorial"
            fallbackTitle="I Need Thee"
            eyebrow="Featured performance"
            description="A live expression of worship, rooted in the sounds of Scotland."
            ctaLabel="Watch on YouTube"
            preferFallbackTitle
          />
        </div>

        <section className="home-about-manifesto" aria-labelledby="home-about-title">
          <div className="home-about-copy" data-home-reveal>
            <p className="home-section-kicker">Celtic Worship</p>
            <h2 id="home-about-title">Songs for the church, through the sounds of Scotland.</h2>
            <p>
              A Christ-centred collective writing and leading worship shaped by Scripture,
              tradition, and the music of our home.
            </p>
            <Link className="home-outline-link" href="/about">
              About the collective
            </Link>
          </div>
          <div className="home-about-photo-strip" aria-hidden="true">
            <Image
              src="/photos/events-band_1.jpg"
              alt=""
              fill
              sizes="100vw"
            />
          </div>
        </section>

        <section className="home-merch" aria-labelledby="home-merch-title">
          <div className="home-merch-inner" data-home-reveal>
            <div className="home-merch-heading">
              <p className="home-section-kicker">Celtic Worship store</p>
              <h2 id="home-merch-title">Take the music home.</h2>
              <Link className="home-outline-link home-outline-link--light" href="/shop">
                Shop all
              </Link>
            </div>

            {featuredProducts.length > 0 ? (
              <ul className="home-merch-grid">
                {featuredProducts.map((product) => (
                  <li key={product.id}>
                    <Link className="home-merch-product" href={product.href}>
                      <span className="home-merch-image">
                        <Image
                          src={product.imageSrc}
                          alt={product.imageAlt}
                          fill
                          sizes="(max-width: 760px) 86vw, 30vw"
                        />
                      </span>
                      <span className="home-merch-meta">
                        <strong>{product.name}</strong>
                        {product.priceLabel ? <span>{product.priceLabel}</span> : null}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="home-merch-fallback">
                <div className="home-merch-fallback-art" aria-hidden="true">
                  <Image src="/Harvest.webp" alt="" fill sizes="240px" />
                </div>
                <p>Music, charts, and official Celtic Worship goods.</p>
                <Link href="/shop">Visit the store</Link>
              </div>
            )}
          </div>
        </section>

        <section
          className="home-community"
          aria-labelledby="home-community-title"
          data-community-reveal
        >
          <div className="home-community-stage">
            <div className="home-community-photos" aria-hidden="true">
              <div className="home-community-photo home-community-photo--church">
                <Image src="/photos/Church.png" alt="" fill sizes="(max-width: 760px) 31vw, 24vw" />
              </div>
              <div className="home-community-photo home-community-photo--crowd-two">
                <Image src="/photos/crowd2.png" alt="" fill sizes="(max-width: 760px) 31vw, 20vw" />
              </div>
              <div className="home-community-photo home-community-photo--crowd-three">
                <Image src="/photos/Crowd3.png" alt="" fill sizes="(max-width: 760px) 31vw, 22vw" />
              </div>
            </div>
            <div className="home-community-inner" data-home-reveal>
              <h2 id="home-community-title">Join Our Community</h2>
              <p>Sign up for music, events, and stories from Celtic Worship.</p>
              <form className="home-community-form" aria-describedby="community-status">
                <div className="home-community-name-row">
                  <label>
                    <span>First name</span>
                    <input type="text" name="firstName" placeholder="First name*" disabled />
                  </label>
                  <label>
                    <span>Last name</span>
                    <input type="text" name="lastName" placeholder="Last name*" disabled />
                  </label>
                </div>
                <label>
                  <span>Email address</span>
                  <input type="email" name="email" placeholder="Email*" disabled />
                </label>
                <button type="button" disabled>
                  Sign-up coming soon
                </button>
                <label className="home-community-consent">
                  <input type="checkbox" disabled />
                  <span>I agree to receive email updates from Celtic Worship.</span>
                </label>
                <p id="community-status" className="home-community-status">
                  Mailing-list integration is coming soon.
                </p>
              </form>
            </div>
          </div>
        </section>
      </main>

      <footer className="home-footer">
        <Link className="home-footer-brand" href="#home">
          Celtic Worship
        </Link>
        <nav aria-label="Footer">
          {FOOTER_LINKS.map((item) => (
            <Link key={item.label} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="home-footer-socials" aria-label="Social links">
          {SOCIAL_LINKS.map((item) => (
            <a key={item.label} href={item.href} target="_blank" rel="noopener noreferrer">
              {item.label}
            </a>
          ))}
        </div>
        <p>© {new Date().getFullYear()} Celtic Worship. All rights reserved.</p>
      </footer>
    </div>
  );
}
