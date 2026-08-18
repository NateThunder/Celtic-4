import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import AlbumStack from "./components/AlbumStack";
import EventMusicDivider from "./components/EventMusicDivider";
import FeaturedVideo from "./components/FeaturedVideo";
import HomeEvents from "./components/HomeEvents";
import HomeReveal from "./components/HomeReveal";
import HeroVideo from "./components/HeroVideo";
import ScrollHomeToTop from "./components/ScrollHomeToTop";
import SiteHeader from "./components/SiteHeader";
import { getUpcomingEvents } from "./lib/events";
import { getFeaturedProducts } from "./lib/featuredProducts";

const FEATURED_VIDEO_ID = "3zGhq1ZKbjg";
const MERCH_TITLE = "Take the music home.";
const FEATURED_VIDEOS = [
  { videoId: FEATURED_VIDEO_ID, title: "I Need Thee" },
  { videoId: "cXFQuxZF61Q", title: "When I Survey" },
  { videoId: "VKeF820DlGU", title: "Hear Now Our Hearts" },
  { videoId: "haisvt45Kdc", title: "All Creatures Of Our God And King" },
  { videoId: "732dkRJZOLE", title: "We Find Our Joy In You" },
  { videoId: "-KnzDx8UV5M", title: "Where Can I Go" },
];

const FOOTER_LINKS = [
  { label: "Home", href: "#home" },
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

export default async function Home() {
  const [events, featuredProducts] = await Promise.all([
    getUpcomingEvents(),
    getFeaturedProducts(3),
  ]);

  return (
    <div className="site-shell editorial-home-shell">
      <ScrollHomeToTop />
      <HomeReveal />
      <SiteHeader variant="home" />

      <main className="editorial-home-page">
        <section id="home" className="editorial-hero" aria-label="Celtic Worship home">
          <HeroVideo />
          <div className="editorial-hero-lockup">
            <h1 className="editorial-hero-title">
              <span>Celtic</span>
              <span>Worship</span>
            </h1>
            <p className="editorial-hero-tagline">
              A live expression of worship
              <br />
              rooted in the sound of Scotland
            </p>
            <Link className="editorial-hero-cta" href="/music">
              <span>Listen now</span>
              <span className="editorial-hero-cta-arrow" aria-hidden="true">
                →
              </span>
            </Link>
          </div>
        </section>

        <HomeEvents events={events} />

        <section id="music" className="home-music-showcase" aria-labelledby="home-music-title">
          <EventMusicDivider />
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
            videos={FEATURED_VIDEOS}
            variant="editorial"
            fallbackTitle="I Need Thee"
            eyebrow="Featured performance"
            description="Hymns, sessions & live"
            ctaLabel="Watch on YouTube"
            preferFallbackTitle
          />
        </div>

        <section className="home-about-manifesto" aria-labelledby="home-about-title">
          <div className="home-about-background" aria-hidden="true">
            <div className="home-about-background-image home-about-background-image-left">
              <Image
                src="/photos/Church.png"
                alt=""
                fill
                sizes="(max-width: 700px) 55vw, 38vw"
              />
            </div>
            <div className="home-about-background-image home-about-background-image-right">
              <Image
                src="/photos/Church3.png"
                alt=""
                fill
                sizes="(max-width: 700px) 55vw, 38vw"
              />
            </div>
          </div>
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
        </section>

        <section className="home-merch" aria-labelledby="home-merch-title">
          <div className="home-merch-inner" data-merch-reveal>
            <div className="home-merch-heading">
              <p className="home-section-kicker">Celtic Worship store</p>
              <h2 id="home-merch-title" aria-label={MERCH_TITLE}>
                <span className="home-merch-title-letters" aria-hidden="true">
                  {MERCH_TITLE.split(" ").map((word, wordIndex, words) => {
                    const wordStart = words
                      .slice(0, wordIndex)
                      .reduce((length, previousWord) => length + previousWord.length + 1, 0);

                    return (
                      <span className="home-merch-title-word" key={word}>
                        {Array.from(word).map((character, characterIndex) => {
                          const index = wordStart + characterIndex;
                          const direction = index % 2 === 0 ? -1 : 1;
                          const letterStyle = {
                            "--merch-letter-x": `${direction * (34 + (index % 5) * 13)}px`,
                            "--merch-letter-y": `${((index % 3) - 1) * 42}px`,
                            "--merch-letter-rotate": `${direction * (5 + (index % 4) * 2.5)}deg`,
                            "--merch-letter-delay": `${index * 18}ms`,
                          } as CSSProperties;

                          return (
                            <span
                              className="home-merch-title-letter"
                              key={`${character}-${index}`}
                              style={letterStyle}
                            >
                              {character}
                            </span>
                          );
                        })}
                        {wordIndex < words.length - 1 ? "\u00a0" : null}
                      </span>
                    );
                  })}
                </span>
              </h2>
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
                <p>Music, sheet music, and official Celtic Worship goods.</p>
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
              <div className="home-community-photo home-community-photo--church-two">
                <Image src="/photos/Church2.png" alt="" fill sizes="(max-width: 760px) 31vw, 18vw" />
              </div>
              <div className="home-community-photo home-community-photo--church-three">
                <Image src="/photos/Church3.png" alt="" fill sizes="(max-width: 760px) 31vw, 20vw" />
              </div>
              <div className="home-community-photo home-community-photo--church-four">
                <Image src="/photos/church4.png" alt="" fill sizes="(max-width: 760px) 31vw, 17vw" />
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
