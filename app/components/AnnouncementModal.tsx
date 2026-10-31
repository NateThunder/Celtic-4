"use client";

import { usePathname } from "next/navigation";
import { CSSProperties, FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Announcement, getActiveAnnouncement } from "../lib/announcements";
import { TITLE_PATHS } from "../lib/announcementTitlePaths";
import styles from "./announcementModal.module.css";

const OPEN_DELAY_MS = 1200;
const HIDDEN_ON = ["/shop/checkout", "/admin", "/stem-player"];
const DUST_COUNT = 36;
const MONTAGE_MS = 2600;
const GLITCH_MS = 420;
/** How long each slide stays up before the popup moves to the other one by itself. */
const AUTO_ADVANCE_MS = 7000;

type SignupState = "idle" | "submitting" | "success" | "error";

function storageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode); the popup then simply shows again next visit.
  }
}

function sessionGet(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function sessionSet(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Without session storage the popup shows on each page, as before.
  }
}

function daysUntil(iso: string, now: Date): number {
  const target = new Date(iso);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.max(0, Math.round((startOfTarget.getTime() - startOfToday.getTime()) / 86_400_000));
}

function ticketDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}·${p(d.getUTCMonth() + 1)}·${String(d.getUTCFullYear()).slice(2)}`;
}

/** Deterministic "random" light dust so server and client agree and it looks the same each visit. */
function makeDust() {
  let seed = 7;
  const rnd = () => {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  };
  return Array.from({ length: DUST_COUNT }, () => ({
    left: `${(rnd() * 100).toFixed(1)}%`,
    size: `${(1 + rnd() * 2.6).toFixed(1)}px`,
    opacity: Number((0.35 + rnd() * 0.55).toFixed(2)),
    duration: `${(9 + rnd() * 10).toFixed(1)}s`,
    delay: `${(-rnd() * 18).toFixed(1)}s`,
  }));
}

function OutlineTitle({ id, lines }: { id: string; lines: [string, string] }) {
  const baselines = [102, 210];
  return (
    <h2 id={id} tabIndex={-1} className={styles.title}>
      <span className={styles.srOnly}>{lines.join(" ")}</span>
      <svg className={styles.titleSvg} viewBox="0 0 520 216" aria-hidden="true" focusable="false">
        {lines.map((line, i) => {
          const text = line.toUpperCase();
          const paths = TITLE_PATHS[text];
          // Letters drawn as paths look identical in every browser; anything not
          // pre-drawn falls back to outlined text.
          return paths ? (
            <g key={i} transform={`translate(0 ${baselines[i]})`}>
              {paths.glyphs.map((d, j) => (
                <path key={j} d={d} pathLength={1} className={styles.titlePath} />
              ))}
            </g>
          ) : (
            <text key={i} x="0" y={baselines[i]} className={styles.titleText}>
              {text}
            </text>
          );
        })}
      </svg>
    </h2>
  );
}

type ConcertArtProps = {
  event?: Announcement["event"];
  fallback: string;
  shot: number;
  glitch: boolean;
  count: number;
};

/** Concert step artwork: the gig montage, framed by the O2 front as an archway when supplied. */
function ConcertArt({ event, fallback, shot, glitch, count }: ConcertArtProps) {
  const shots = event?.montage?.length ? event.montage : [{ src: fallback }];
  const stage = (
    <>
      <div className={`${styles.montage} ${glitch ? styles.glitching : ""}`} aria-hidden="true">
        {shots.map((item, i) =>
          "kind" in item && item.kind === "video" ? (
            <video
              key={i}
              className={`${styles.shot} ${i === shot ? styles.shotOn : ""}`}
              src={item.src}
              style={{ objectPosition: item.position }}
              muted
              loop
              autoPlay
              playsInline
              preload="metadata"
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={i}
              className={`${styles.shot} ${i === shot ? styles.shotOn : ""}`}
              src={item.src}
              alt=""
              style={"position" in item ? { objectPosition: item.position, transform: item.zoom ? `scale(${item.zoom})` : undefined, transformOrigin: item.position } : undefined}
            />
          ),
        )}
      </div>
      <div className={styles.film} aria-hidden="true" />
      <div className={`${styles.beam} ${styles.beamA}`} aria-hidden="true" />
      <div className={`${styles.beam} ${styles.beamB}`} aria-hidden="true" />
      {event && (
        <div className={styles.countdown}>
          <span className={styles.count}>{count}</span>
          <span className={styles.countLabel}>Days to go</span>
        </div>
      )}
    </>
  );

  if (event?.venue) {
    const v = event.venue;
    return (
      <div
        className={`${styles.venue} ${styles[`layout_${v.layout ?? "classic"}`] ?? ""}`}
        style={
          {
            backgroundImage: `url(${v.wall})`,
            "--tint-color": v.tint?.color,
            "--tint-mode": v.tint?.mode,
            "--tint-opacity": v.tint ? v.tint.opacity ?? 0.6 : 0,
          } as CSSProperties
        }
      >
        <div className={styles.venueSign}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className={styles.signFull} src={v.board} alt={v.alt} />
          {v.boardTight && (
            // eslint-disable-next-line @next/next/no-img-element
            <img className={styles.signTight} src={v.boardTight} alt="" />
          )}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={`${styles.venueBanner} ${styles.venueBannerLeft}`}
          src={v.layout === "wideDoor" && v.bannerLeftSlim ? v.bannerLeftSlim : v.bannerLeft}
          alt=""
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          className={`${styles.venueBanner} ${styles.venueBannerRight}`}
          src={v.layout === "wideDoor" && v.bannerRightSlim ? v.bannerRightSlim : v.bannerRight}
          alt=""
        />
        <div className={styles.doorway}>{stage}</div>
        <div className={styles.venueGrain} aria-hidden="true" />
      </div>
    );
  }

  return (
    <>
      {stage}
      {event && (
        <div className={styles.marquee}>
          <span>{event.artTitle}</span>
          <strong>Celtic Worship · Zerua Music</strong>
          <span>{event.eyebrow.replace(/^Live · /, "")}</span>
        </div>
      )}
    </>
  );
}

export default function AnnouncementModal() {
  const pathname = usePathname() || "/";
  const hidden = HIDDEN_ON.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [open, setOpen] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const [showFloat, setShowFloat] = useState(false);
  const [auto, setAuto] = useState(true);
  const [floatFly, setFloatFly] = useState(false);
  const [floatTop, setFloatTop] = useState<number | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [count, setCount] = useState(0);
  const [shot, setShot] = useState(0);
  const [glitch, setGlitch] = useState(false);
  const [signup, setSignup] = useState<SignupState>("idle");
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const dust = useMemo(makeDust, []);

  const barKey = announcement ? `cw-announcement-bar-closed:${announcement.id}` : "";
  const floatKey = announcement ? `cw-announcement-float-closed:${announcement.id}` : "";

  useEffect(() => {
    if (hidden) return;
    const current = new Date();
    const active = getActiveAnnouncement(current);
    if (!active) return;
    setAnnouncement(active);
    setNow(current);

    const seenKey = `cw-announcement-seen:${active.id}`;
    const floatLive = active.float && current.getTime() < Date.parse(active.float.endsAt);

    // Once per visit: later pages in the same visit go straight to the reminders.
    if (sessionGet(seenKey)) {
      if (active.bar && !storageGet(`cw-announcement-bar-closed:${active.id}`)) setShowBar(true);
      if (floatLive && !sessionGet(`cw-announcement-float-closed:${active.id}`)) setShowFloat(true);
      return;
    }

    const timer = window.setTimeout(() => {
      sessionSet(seenKey, "1");
      lastFocus.current = document.activeElement as HTMLElement | null;
      setOpen(true);
    }, OPEN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [hidden]);

  const floatLive = Boolean(announcement?.float && now && now.getTime() < Date.parse(announcement.float.endsAt));

  const close = useCallback(() => {
    setOpen(false);
    if (announcement?.bar && !storageGet(barKey)) setShowBar(true);
    if (floatLive && !sessionGet(floatKey)) {
      setFloatFly(true);
      setShowFloat(true);
    }
    lastFocus.current?.focus?.();
  }, [announcement, barKey, floatLive, floatKey]);

  // Moves between the album and the concert by itself until the visitor takes over.
  useEffect(() => {
    if (!open || !auto || !announcement?.event) return;
    const timer = window.setTimeout(() => setStep((s) => (s === 1 ? 2 : 1)), AUTO_ADVANCE_MS);
    return () => window.clearTimeout(timer);
  }, [open, auto, step, announcement]);

  // Escape closes from anywhere, even after a step change has moved focus.
  useEffect(() => {
    if (!open) return;
    const onDocumentKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };
    document.addEventListener("keydown", onDocumentKey);
    return () => document.removeEventListener("keydown", onDocumentKey);
  }, [open, close]);

  // Keep keyboard focus inside the dialog when it opens or the step changes.
  useEffect(() => {
    if (open) dialogRef.current?.querySelector<HTMLElement>("h2")?.focus({ preventScroll: true });
  }, [open, step]);

  // Count the "days to go" up from zero when the concert step appears.
  useEffect(() => {
    if (!open || step !== 2 || !announcement?.event || !now) return;
    const target = daysUntil(announcement.event.date, now);
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setCount(target);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (time: number) => {
      const t = Math.min(1, (time - start) / 1600);
      setCount(Math.round((1 - Math.pow(1 - t, 3)) * target));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    setCount(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [open, step, announcement, now]);

  // Cycle the concert montage, with a short glitch on every cut (and on arrival).
  useEffect(() => {
    if (!open || step !== 2) return;
    const shots = announcement?.event?.montage?.length ?? 0;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    setShot(0);
    if (reduce) return;
    const timers: number[] = [];
    const cut = () => {
      setGlitch(true);
      timers.push(window.setTimeout(() => setGlitch(false), GLITCH_MS));
    };
    cut();
    const interval = shots > 1
      ? window.setInterval(() => {
          cut();
          timers.push(window.setTimeout(() => setShot((n) => (n + 1) % shots), GLITCH_MS / 2));
        }, MONTAGE_MS)
      : 0;
    return () => {
      window.clearInterval(interval);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [open, step, announcement]);

  const closeBar = () => {
    if (barKey) storageSet(barKey, "1");
    setShowBar(false);
  };

  // Sit just under the site header, whatever its height on this page.
  useEffect(() => {
    if (!showFloat) return;
    const place = () => {
      const header = document.querySelector(".site-header");
      const bottom = header?.getBoundingClientRect().bottom ?? 0;
      setFloatTop(bottom > 0 ? Math.round(bottom + 12) : null);
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [showFloat]);

  const closeFloat = () => {
    if (floatKey) sessionSet(floatKey, "1");
    setShowFloat(false);
  };

  const reopen = () => {
    lastFocus.current = document.activeElement as HTMLElement | null;
    setStep(1);
    setAuto(true);
    setShowBar(false);
    setShowFloat(false);
    setOpen(true);
  };

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Tab" || !dialogRef.current) return;
    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]):not([tabindex="-1"])',
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function submitSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (signup === "submitting") return;
    const form = event.currentTarget;
    const data = new FormData(form);
    setSignup("submitting");
    try {
      // Same endpoint and payload as the homepage community form.
      const response = await fetch("/api/community", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: data.get("firstName"),
          lastName: data.get("lastName"),
          email: data.get("email"),
          consent: data.get("consent") === "on",
          website: data.get("website"),
        }),
      });
      if (!response.ok) throw new Error("Signup request failed");
      form.reset();
      setSignup("success");
    } catch {
      setSignup("error");
    }
  }

  if (hidden || !announcement || !now) return null;

  const { release, event, image, bar } = announcement;
  const isOut = now.getTime() >= Date.parse(release.releaseDate);
  const primary = isOut ? release.after : release.before;

  return (
    <>
      {open && (
        <div
          className={styles.overlay}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
          data-lenis-prevent
        >
          <div
            ref={dialogRef}
            className={styles.dialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="cw-announcement-title"
            onKeyDown={(e) => {
              if (e.key !== "Escape") setAuto(false);
              onKeyDown(e);
            }}
            onPointerDown={() => setAuto(false)}
          >
            <button type="button" className={styles.close} aria-label="Close" onClick={close}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>

            <div className={styles.art} data-step={step}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {step === 1 && <img src={image.src} alt={image.alt} className={styles.artImage} />}
              {step === 1 ? (
                <>
                  <div className={styles.bloom} aria-hidden="true" />
                  <div className={styles.dust} aria-hidden="true">
                    {dust.map((d, i) => (
                      <span
                        key={i}
                        style={{
                          left: d.left,
                          width: d.size,
                          height: d.size,
                          opacity: d.opacity,
                          animationDuration: d.duration,
                          animationDelay: d.delay,
                        }}
                      />
                    ))}
                  </div>
                </>
              ) : (
                <ConcertArt
                  event={event}
                  fallback={image.src}
                  shot={shot}
                  glitch={glitch}
                  count={count}
                />
              )}
            </div>

            <div className={styles.body}>
              {step === 1 && (
                <div key="release" className={styles.step}>
                  <span className={styles.eyebrow} style={{ animationDelay: "0.3s" }}>
                    {isOut ? release.eyebrowAfter : release.eyebrowBefore}
                  </span>
                  <OutlineTitle id="cw-announcement-title" lines={release.titleLines} />
                  {release.list && (
                    <div className={styles.newSongs}>
                      <p className={`${styles.newLine} ${styles.rise}`} style={{ animationDelay: "1.35s" }}>
                        <span className={styles.newCount} aria-hidden="true">
                          <span className={styles.newPlus}>+</span>
                          <span className={styles.newDigits}>
                            {release.list.map((_, i, all) => (
                              <span
                                key={i}
                                className={i === all.length - 1 ? styles.digitLast : styles.digitMid}
                                style={{ "--i": i } as CSSProperties}
                              >
                                {i + 1}
                              </span>
                            ))}
                          </span>
                        </span>
                        <span className={styles.srOnly}>{release.list.length} </span>
                        <span className={styles.newLabel}>{release.listHeading ?? "New songs"}</span>
                      </p>
                    <ul className={styles.list} aria-label={`${release.list.length} ${release.listHeading ?? "new songs"}`}>
                      {release.list.map((item, i) => (
                        <li
                          key={item.title}
                          className={`${styles.rise} ${styles.track}`}
                          style={{ animationDelay: `${1.6 + i * 0.15}s`, "--i": i } as CSSProperties}
                        >
                          <span className={styles.trackName}>{item.title}</span> {item.detail && <span className={styles.muted}>{item.detail}</span>}
                        </li>
                      ))}
                    </ul>
                    </div>
                  )}
                  <div className={`${styles.actions} ${styles.rise}`} style={{ animationDelay: "2.2s" }}>
                    <a
                      className={`${styles.button} ${styles.saveButton}`}
                      href={primary.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => {
                        // They pre-save in a new tab; the concert is waiting when they come back.
                        if (event) window.setTimeout(() => setStep(2), 600);
                      }}
                    >
                      <span>{primary.label}</span>
                      {release.platforms && release.platforms.length > 0 ? (
                        <span className={styles.platforms} aria-label={`on ${release.platforms.map((pl) => pl.name).join(", ")}`}>
                          {release.platforms.map((pl, i) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={pl.name}
                              src={pl.icon}
                              alt=""
                              className={styles.platform}
                              style={{ "--i": i, "--n": release.platforms!.length, zIndex: release.platforms!.length - i } as CSSProperties}
                            />
                          ))}
                        </span>
                      ) : (
                        <span aria-hidden="true">→</span>
                      )}
                    </a>
                    {event && (
                      <button type="button" className={styles.nextLink} onClick={() => setStep(2)}>
                        <span className={styles.nextKicker}>{release.nextKicker ?? "Next"}</span>
                        <span className={styles.nextRow}>
                          <span className={styles.nextLabel}>{release.nextLabel ?? "Next"}</span>
                          <span className={styles.nextArrow} aria-hidden="true">
                            <svg width="34" height="16" viewBox="0 0 34 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M1 8h31M25 1l7 7-7 7" />
                            </svg>
                          </span>
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              )}

              {step === 2 && event && (
                <div key="event" className={styles.step}>
                  <span className={styles.eyebrow} style={{ animationDelay: "0.2s" }}>
                    {event.eyebrow}
                  </span>
                  <OutlineTitle id="cw-announcement-title" lines={event.titleLines} />
                  <p className={`${styles.details} ${styles.rise}`} style={{ animationDelay: "1.4s" }}>
                    {event.details.map((line, i) => (
                      <span key={line} className={i > 0 ? styles.muted : undefined}>
                        {line}
                      </span>
                    ))}
                  </p>
                  <a
                    className={`${styles.ticket} ${styles.rise}`}
                    style={{ animationDelay: "1.6s" }}
                    href={event.tickets.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <span className={styles.ticketStub} aria-hidden="true">
                      <span>Admit one</span>
                      <strong>{ticketDate(event.date)}</strong>
                    </span>
                    <span className={styles.ticketMain}>
                      {event.tickets.label} <span aria-hidden="true">→</span>
                    </span>
                  </a>

                  <div className={`${styles.signup} ${styles.rise}`} style={{ animationDelay: "1.9s" }}>
                    {signup === "success" ? (
                      <p className={styles.signupDone} role="status">
                        You&apos;re on the list. Thank you.
                      </p>
                    ) : (
                      <form onSubmit={submitSignup} className={styles.signupForm}>
                        <span className={styles.signupHeading}>{event.signupHeading ?? "Join the list"}</span>
                        <div className={styles.fieldRow}>
                          <label className={styles.srOnly} htmlFor="cw-ann-first">First name</label>
                          <input id="cw-ann-first" name="firstName" type="text" placeholder="First name" autoComplete="given-name" maxLength={60} required />
                          <label className={styles.srOnly} htmlFor="cw-ann-last">Last name</label>
                          <input id="cw-ann-last" name="lastName" type="text" placeholder="Last name" autoComplete="family-name" maxLength={60} required />
                        </div>
                        <div className={styles.fieldRow}>
                          <label className={styles.srOnly} htmlFor="cw-ann-email">Email address</label>
                          <input id="cw-ann-email" name="email" type="email" placeholder="Email address" autoComplete="email" inputMode="email" maxLength={254} required />
                          <button type="submit" className={styles.textLink} disabled={signup === "submitting"}>
                            {signup === "submitting" ? "Joining…" : "Sign up"} <span aria-hidden="true">→</span>
                          </button>
                        </div>
                        <label className={styles.honeypot} aria-hidden="true">
                          Website
                          <input type="text" name="website" tabIndex={-1} autoComplete="off" />
                        </label>
                        <label className={styles.consent}>
                          <input type="checkbox" name="consent" required />
                          <span>I agree to receive email updates from Celtic Worship.</span>
                        </label>
                        {signup === "error" && (
                          <p className={styles.signupError} role="status">
                            That didn&apos;t go through. Please try again.
                          </p>
                        )}
                      </form>
                    )}
                  </div>
                </div>
              )}

              {event && (
                <div className={styles.dots} style={{ "--ann-auto": `${AUTO_ADVANCE_MS}ms` } as CSSProperties}>
                  {([1, 2] as const).map((n) => (
                    <button
                      key={n === step && auto ? `run-${step}` : n}
                      type="button"
                      aria-label={n === 1 ? "The release" : "The concert"}
                      aria-current={step === n}
                      className={step === n ? `${styles.dotOn} ${auto ? styles.dotRun : ""}` : styles.dot}
                      onClick={() => setStep(n)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!open && showBar && bar && (
        <div className={styles.bar} role="region" aria-label="Announcement">
          <button type="button" className={styles.barText} onClick={reopen}>
            {bar.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img className={styles.barArt} src={bar.image} alt="" />
            )}
            <span className={styles.barWords}>
              <span className={styles.barTitle}>{bar.text.split(" · ")[0]}</span>
              <span className={styles.barKicker}>{bar.text.split(" · ").slice(1).join(" · ")}</span>
            </span>
          </button>
          <a className={styles.barLink} href={bar.link.href} target="_blank" rel="noopener noreferrer">
            {bar.link.label} <span aria-hidden="true">→</span>
          </a>
          <button type="button" className={styles.barClose} aria-label="Hide announcement" onClick={closeBar}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      )}

      {!open && showFloat && announcement.float && (
        <div className={`${styles.float} ${floatFly ? styles.floatFly : ""}`} role="region" aria-label="New album" style={floatTop !== null ? { top: floatTop } : undefined}>
          <a className={styles.floatLink} href={primary.href} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.floatArt} src={image.src} alt="" />
            <span className={styles.floatText}>
              <span className={styles.floatKicker}>{announcement.float.kicker}</span>
              <span className={styles.floatLabel}>
                {primary.label} <span aria-hidden="true">→</span>
              </span>
            </span>
          </a>
          <button type="button" className={styles.floatClose} aria-label="Hide album reminder" onClick={closeFloat}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
}
