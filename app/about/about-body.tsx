"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Fragment,
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { ABOUT_PHOTOS, MEMBERS } from "./about-data";
import styles from "./about.module.css";

const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(max, value));

type AboutBodyProps = {
  /** Passed in from the server page so the footer stays a server component. */
  footer?: ReactNode;
};

export default function AboutBody({ footer }: AboutBodyProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Reveals. Harmless under reduced motion: the `on` rules simply don't apply.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add(styles.on);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12 },
    );

    root.querySelectorAll("[data-reveal]").forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Scroll-position driven motion: reversible, because nothing here transitions.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let stopMotion: (() => void) | null = null;

    const startMotion = () => {
      const plates = Array.from(
        root.querySelectorAll<HTMLElement>('[data-parallax="plate"]'),
      );
      const exitFigures = Array.from(
        root.querySelectorAll<HTMLElement>("[data-exit-figure]"),
      );
      const disc = root.querySelector<HTMLElement>("[data-vinyl-disc]");
      let rafId = 0;

      // How far the record slides, in percent of its own width. The stylesheet
      // owns the number so narrow screens can shorten the travel; re-read on
      // resize rather than per frame, which would force a style recalc.
      let discTravel = 50;
      const readDiscTravel = () => {
        if (!disc) return;
        const parsed = Number.parseFloat(
          getComputedStyle(disc).getPropertyValue("--disc-travel"),
        );
        if (Number.isFinite(parsed)) discTravel = parsed;
      };
      readDiscTravel();
      window.addEventListener("resize", readDiscTravel);

      const frame = () => {
        const viewportHeight = window.innerHeight;

        plates.forEach((el) => {
          const rect = el.getBoundingClientRect();
          if (rect.bottom > -200 && rect.top < viewportHeight + 200) {
            const centred =
              (rect.top + rect.height / 2 - viewportHeight / 2) / viewportHeight;
            el.style.transform = `translate3d(0,${(centred * -22).toFixed(1)}px,0)`;
          }
        });

        // The three players at the exit fade in and back out with the scroll.
        if (exitFigures.length) {
          const rect = exitFigures[0].parentElement?.getBoundingClientRect();
          if (rect) {
            const centred = (rect.top + rect.height / 2) / viewportHeight;
            const presence = clamp(1 - Math.abs(centred - 0.5) / 0.62, 0, 1);
            exitFigures.forEach((el, i) => {
              el.style.opacity = clamp(presence * 1.25 - i * 0.06, 0, 1).toFixed(3);
            });
          }
        }

        // The record slides out of its sleeve, and back in on the way up.
        if (disc) {
          const rect = disc.parentElement?.getBoundingClientRect();
          if (rect) {
            const centreY = rect.top + rect.height * 0.5;
            const out = clamp(
              (viewportHeight * 1.02 - centreY) / (viewportHeight * 0.44),
              0,
              1,
            );
            disc.style.opacity = out.toFixed(3);
            disc.style.transform = `translate(${(6 + discTravel * out).toFixed(
              1,
            )}%,6%) rotate(${(150 * out).toFixed(0)}deg)`;
          }
        }

        rafId = window.requestAnimationFrame(frame);
      };

      rafId = window.requestAnimationFrame(frame);

      stopMotion = () => {
        window.cancelAnimationFrame(rafId);
        window.removeEventListener("resize", readDiscTravel);
        // Hand the elements back to the stylesheet.
        [...plates, ...exitFigures].forEach((el) => {
          el.style.transform = "";
          el.style.opacity = "";
        });
        if (disc) {
          disc.style.transform = "";
          disc.style.opacity = "";
        }
      };
    };

    if (!reducedMotion.matches) startMotion();

    const onPreferenceChange = () => {
      stopMotion?.();
      stopMotion = null;
      if (!reducedMotion.matches) startMotion();
    };
    reducedMotion.addEventListener("change", onPreferenceChange);

    return () => {
      reducedMotion.removeEventListener("change", onPreferenceChange);
      stopMotion?.();
    };
  }, []);

  return (
    <div className={styles.up} ref={rootRef}>
      <div className={styles.light}>
        <div className={styles.w}>
          <div className={styles.roster}>
            <span className={`${styles.tag} ${styles.rv}`} data-reveal>
              The collective
            </span>
            <div className={styles.names} data-reveal>
              {MEMBERS.map((member, i) => (
                <Fragment key={member.name}>
                  <span
                    className={styles.nm}
                    style={{ transitionDelay: `${(i * 2 * 0.05).toFixed(2)}s` }}
                  >
                    {member.name.toUpperCase()}
                  </span>
                  <span
                    className={styles.instr}
                    style={{
                      transitionDelay: `${((i * 2 + 1) * 0.05).toFixed(2)}s`,
                    }}
                  >
                    {member.instrument.toUpperCase()}
                  </span>
                </Fragment>
              ))}
            </div>
          </div>
        </div>

        {/* Each section below is its own full-width panel so it can ride up
            over the one before it and cover it opaquely, edge to edge. */}
        <section className={styles.lift}>
          <div className={styles.w}>
            <hr className={`${styles.rule} ${styles.rv}`} data-reveal />

            <div
              className={`${styles.ed} ${styles.rv} ${styles.gh}`}
              data-reveal
            style={
              {
                "--gh": `url("${ABOUT_PHOTOS}/ghosts/ghost-ayr-balcony.jpg")`,
              } as CSSProperties
            }
          >
            <div className={styles.col}>
              <span className={styles.tag}>Where it starts</span>
              <h2 className={styles.big}>Scotland, 2016.</h2>
              <p>
                A collective of some of Scotland&rsquo;s finest contemporary
                musicians, sharing one desire — to use their skills and giftings
                to praise and make known Jesus Christ.
              </p>
              <p>
                The sound is rooted in the traditions of Scottish music, and it
                carries the full range and depth of the Gospel.
              </p>
            </div>
            <figure className={styles.cut}>
              <Image
                className={styles.partner}
                src={`${ABOUT_PHOTOS}/cutouts/chris-amer-partner.webp`}
                alt="Chris Amer"
                width={540}
                height={1213}
                sizes="(max-width: 900px) 45vw, 22vw"
              />
              <Image
                className={styles.lead}
                src={`${ABOUT_PHOTOS}/cutouts/naomi-stirrat-lead.webp`}
                alt="Naomi Stirrat"
                width={800}
                height={1634}
                sizes="(max-width: 900px) 60vw, 30vw"
              />
              </figure>
            </div>
          </div>
        </section>

        <section className={styles.lift}>
          <div className={styles.w}>
            <hr className={`${styles.rule} ${styles.rv}`} data-reveal />

            <div
              className={`${styles.ed} ${styles.rt} ${styles.rv} ${styles.gh}`}
              data-reveal
              style={
                {
                  "--gh": `url("${ABOUT_PHOTOS}/ghosts/ghost-new-irish-hall.jpg")`,
                } as CSSProperties
              }
            >
            <figure className={styles.cut}>
              <Image
                className={styles.partner}
                src={`${ABOUT_PHOTOS}/cutouts/mhairi-marwick-partner.webp`}
                alt="Mhairi Marwick"
                width={520}
                height={768}
                sizes="(max-width: 900px) 40vw, 20vw"
              />
              <Image
                className={styles.lead}
                src={`${ABOUT_PHOTOS}/cutouts/david-hogg-lead.webp`}
                alt="David Hogg"
                width={760}
                height={1791}
                sizes="(max-width: 900px) 60vw, 30vw"
              />
            </figure>
            <div className={styles.col}>
              <span className={styles.tag}>What&rsquo;s happened since</span>
              <h2>Four albums.</h2>
              <p>
                Released since 2016, alongside shows across Scotland, the UK and
                Europe, and numerous television and radio appearances.
              </p>
            </div>
            </div>
          </div>
        </section>

        <section className={styles.lift}>
          <div className={styles.w}>
            <hr className={`${styles.rule} ${styles.rv}`} data-reveal />

            <div className={`${styles.ed} ${styles.rv}`} data-reveal>
            <div className={styles.col}>
              <span className={styles.tag}>The fourth record</span>
              <h2>Harvest.</h2>
              <p>
                Written and arranged at a family farm in Morayshire, drawing on
                the biblical vein of harvest imagery — God&rsquo;s faithfulness,
                His promises, and new life in Christ.
              </p>
            </div>
            <figure className={`${styles.plate} ${styles.vinyl}`}>
              <div className={styles.disc} data-vinyl-disc aria-hidden="true" />
              <Image
                src="/Harvest.webp"
                alt="Harvest album artwork"
                width={1080}
                height={1080}
                sizes="(max-width: 900px) 90vw, 460px"
                data-parallax="plate"
              />
              <figcaption>HARVEST &middot; OUT NOW</figcaption>
            </figure>
            </div>

            <hr className={`${styles.rule} ${styles.rv}`} data-reveal />
          </div>
        </section>
      </div>

      <section className={styles.band} data-reveal>
        <figure className={`${styles.sc} ${styles.l}`}>
          <Image
            src={`${ABOUT_PHOTOS}/scenes/cowfords-barn.jpg`}
            alt="The barn at Cowfords Farm"
            fill
            sizes="(max-width: 900px) 100vw, 430px"
          />
        </figure>
        <div className={styles.bandIn}>
          <span className={styles.ln}>Fields ripe for harvest,</span>
          <span className={styles.ln}>
            and long summer days at Cowfords Farm.
          </span>
          <cite>MORAYSHIRE &middot; 2025</cite>
        </div>
        <figure className={`${styles.sc} ${styles.r}`}>
          <Image
            src={`${ABOUT_PHOTOS}/scenes/ayr-town-hall-audience.jpg`}
            alt="Audience at Ayr Town Hall"
            fill
            sizes="(max-width: 900px) 100vw, 430px"
          />
        </figure>
      </section>

      <div className={styles.dark}>
        <section className={`${styles.w} ${styles.exit} ${styles.rv}`} data-reveal>
          <div className={styles.exitGrid}>
            <div>
              <span className={`${styles.tag} ${styles.tagAmber}`}>
                Take it home
              </span>
              <h2>The music, the merch, the record.</h2>
              <p>
                Albums on CD and vinyl, sheet music, and official Celtic Worship
                goods — shipped from Scotland.
              </p>
              <Link className={`${styles.btn} ${styles.fill}`} href="/shop">
                Shop all
              </Link>
              <Link className={styles.btn} href="/live-events">
                Upcoming events
              </Link>
            </div>
            <div className={styles.exitPeople}>
              <Image
                className={styles.q1}
                src={`${ABOUT_PHOTOS}/cutouts/chris-amer-exit.webp`}
                alt="Chris Amer"
                width={600}
                height={826}
                sizes="(max-width: 900px) 40vw, 22vw"
                data-exit-figure
              />
              <Image
                className={styles.q2}
                src={`${ABOUT_PHOTOS}/cutouts/gus-stirrat-exit.webp`}
                alt="Gus Stirrat"
                width={780}
                height={671}
                sizes="(max-width: 900px) 45vw, 24vw"
                data-exit-figure
              />
              <Image
                className={styles.q3}
                src={`${ABOUT_PHOTOS}/cutouts/calum-macaskill-exit.webp`}
                alt="Calum MacAskill"
                width={820}
                height={739}
                sizes="(max-width: 900px) 45vw, 24vw"
                data-exit-figure
              />
            </div>
          </div>
        </section>

        {footer}
      </div>
    </div>
  );
}
