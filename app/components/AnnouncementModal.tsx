"use client";

import { usePathname } from "next/navigation";
import { CSSProperties, FormEvent, KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type Announcement, getActiveAnnouncement } from "../lib/announcements";
import styles from "./announcementModal.module.css";

const OPEN_DELAY_MS = 1200;
const HIDDEN_ON = ["/shop/checkout", "/admin", "/stem-player"];
const DUST_COUNT = 36;

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

function daysUntil(iso: string, now: Date): number {
  const target = new Date(iso);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.max(0, Math.round((startOfTarget.getTime() - startOfToday.getTime()) / 86_400_000));
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
  return (
    <h2 id={id} tabIndex={-1} className={styles.title}>
      <span className={styles.srOnly}>{lines.join(" ")}</span>
      <svg className={styles.titleSvg} viewBox="0 0 520 216" aria-hidden="true" focusable="false">
        <text x="0" y="102">{lines[0].toUpperCase()}</text>
        <text x="0" y="210">{lines[1].toUpperCase()}</text>
      </svg>
    </h2>
  );
}

export default function AnnouncementModal() {
  const pathname = usePathname() || "/";
  const hidden = HIDDEN_ON.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [open, setOpen] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [count, setCount] = useState(0);
  const [signup, setSignup] = useState<SignupState>("idle");
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);
  const dust = useMemo(makeDust, []);

  const dismissKey = announcement ? `cw-announcement-dismissed:${announcement.id}` : "";
  const barKey = announcement ? `cw-announcement-bar-closed:${announcement.id}` : "";

  useEffect(() => {
    if (hidden) return;
    const current = new Date();
    const active = getActiveAnnouncement(current);
    if (!active) return;
    setAnnouncement(active);
    setNow(current);

    if (storageGet(`cw-announcement-dismissed:${active.id}`)) {
      if (active.bar && !storageGet(`cw-announcement-bar-closed:${active.id}`)) setShowBar(true);
      return;
    }

    const timer = window.setTimeout(() => {
      lastFocus.current = document.activeElement as HTMLElement | null;
      setOpen(true);
    }, OPEN_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [hidden]);

  const close = useCallback(() => {
    if (dismissKey) storageSet(dismissKey, new Date().toISOString());
    setOpen(false);
    if (announcement?.bar && !storageGet(barKey)) setShowBar(true);
    lastFocus.current?.focus?.();
  }, [announcement, barKey, dismissKey]);

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

  const closeBar = () => {
    if (barKey) storageSet(barKey, "1");
    setShowBar(false);
  };

  const reopen = () => {
    lastFocus.current = document.activeElement as HTMLElement | null;
    setStep(1);
    setShowBar(false);
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
            onKeyDown={onKeyDown}
          >
            <button type="button" className={styles.close} aria-label="Close" onClick={close}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>

            <div className={styles.art} data-step={step}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img key={`art-${step}`} src={image.src} alt={step === 1 ? image.alt : ""} className={styles.artImage} />
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
                <>
                  <div className={`${styles.beam} ${styles.beamA}`} aria-hidden="true" />
                  <div className={`${styles.beam} ${styles.beamB}`} aria-hidden="true" />
                  {event && (
                    <div className={styles.countdown}>
                      <span className={styles.count}>{count}</span>
                      <span className={styles.countLabel}>Days to go</span>
                    </div>
                  )}
                </>
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
                    <ul className={styles.list} aria-label={release.listHeading}>
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
                  )}
                  <div className={`${styles.actions} ${styles.rise}`} style={{ animationDelay: "2.2s" }}>
                    <a className={styles.button} href={primary.href} target="_blank" rel="noopener noreferrer">
                      {primary.label} <span aria-hidden="true">→</span>
                    </a>
                    {event && (
                      <button type="button" className={styles.textLink} onClick={() => setStep(2)}>
                        {release.nextLabel ?? "Next"} <span aria-hidden="true">→</span>
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
                    className={`${styles.button} ${styles.rise}`}
                    style={{ animationDelay: "1.6s" }}
                    href={event.tickets.href}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {event.tickets.label} <span aria-hidden="true">→</span>
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
                <div className={styles.dots}>
                  <button type="button" aria-label="The release" aria-current={step === 1} className={step === 1 ? styles.dotOn : styles.dot} onClick={() => setStep(1)} />
                  <button type="button" aria-label="The concert" aria-current={step === 2} className={step === 2 ? styles.dotOn : styles.dot} onClick={() => setStep(2)} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!open && showBar && bar && (
        <div className={styles.bar} role="region" aria-label="Announcement">
          <button type="button" className={styles.barText} onClick={reopen}>
            {bar.text}
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
    </>
  );
}
