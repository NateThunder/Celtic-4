"use client";

import { Cormorant_Garamond } from "next/font/google";
import { usePathname } from "next/navigation";
import { FormEvent, KeyboardEvent, useCallback, useEffect, useRef, useState } from "react";
import { type Announcement, getActiveAnnouncement } from "../lib/announcements";
import styles from "./announcementModal.module.css";

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600"],
  style: ["normal", "italic"],
});

const OPEN_DELAY_MS = 1200;
const HIDDEN_ON = ["/shop/checkout", "/admin", "/stem-player"];

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

export default function AnnouncementModal() {
  const pathname = usePathname() || "/";
  const hidden = HIDDEN_ON.some((path) => pathname === path || pathname.startsWith(`${path}/`));

  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [open, setOpen] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [signup, setSignup] = useState<SignupState>("idle");
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastFocus = useRef<HTMLElement | null>(null);

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

  // Escape closes from anywhere, even after a step change has moved focus out of the dialog.
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

  // Keep keyboard focus inside the dialog when a step changes.
  useEffect(() => {
    if (open) dialogRef.current?.querySelector<HTMLElement>("h2")?.focus();
  }, [open, step]);

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
            <button ref={closeRef} type="button" className={styles.close} aria-label="Close" onClick={close}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>

            <div className={styles.art} data-step={step}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.src} alt={image.alt} className={styles.artImage} />
              {step === 2 && event && (
                <div className={`${styles.artCaption} ${styles.fadeIn}`}>
                  <span className={styles.eyebrow}>{event.artLabel}</span>
                  <span className={`${display.className} ${styles.artTitle}`}>{event.artTitle}</span>
                </div>
              )}
            </div>

            <div className={styles.body}>
              {step === 1 && (
                <div className={`${styles.step} ${styles.fadeIn}`}>
                  <span className={styles.eyebrow}>{isOut ? release.eyebrowAfter : release.eyebrowBefore}</span>
                  <div className={styles.titleBlock}>
                    <h2 id="cw-announcement-title" tabIndex={-1} className={`${display.className} ${styles.title}`}>
                      {release.title}
                    </h2>
                    <p className={`${display.className} ${styles.subtitle}`}>{release.subtitle}</p>
                  </div>
                  {release.list && (
                    <div className={styles.list}>
                      {release.listHeading && <span className={styles.listHeading}>{release.listHeading}</span>}
                      <ul>
                        {release.list.map((item) => (
                          <li key={item.title}>
                            {item.title} {item.detail && <span className={styles.muted}>{item.detail}</span>}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className={styles.actions}>
                    <a className={styles.primary} href={primary.href} target="_blank" rel="noopener noreferrer">
                      {primary.label}
                    </a>
                    {event && (
                      <button type="button" className={styles.secondary} onClick={() => setStep(2)}>
                        {release.nextLabel ?? "Next"}
                      </button>
                    )}
                  </div>
                </div>
              )}

              {step === 2 && event && (
                <div className={`${styles.step} ${styles.fadeIn}`}>
                  <span className={styles.eyebrow}>{event.eyebrow}</span>
                  <h2 id="cw-announcement-title" tabIndex={-1} className={`${display.className} ${styles.eventTitle}`}>
                    {event.title}
                  </h2>
                  <div className={styles.countdown}>
                    <span className={`${display.className} ${styles.days}`}>{daysUntil(event.date, now)}</span>
                    <span className={styles.details}>
                      days to go
                      {event.details.map((line) => (
                        <span key={line}>{line}</span>
                      ))}
                    </span>
                  </div>
                  <a className={styles.primary} href={event.tickets.href} target="_blank" rel="noopener noreferrer">
                    {event.tickets.label}
                  </a>

                  <div className={styles.signup}>
                    {signup === "success" ? (
                      <p className={styles.signupDone} role="status">
                        You&apos;re on the list. Thank you.
                      </p>
                    ) : (
                      <form onSubmit={submitSignup} className={styles.signupForm}>
                        <span className={styles.signupHeading}>{event.signupHeading ?? "Get updates first"}</span>
                        <div className={styles.nameRow}>
                          <label className={styles.srOnly} htmlFor="cw-ann-first">First name</label>
                          <input id="cw-ann-first" name="firstName" type="text" placeholder="First name" autoComplete="given-name" maxLength={60} required />
                          <label className={styles.srOnly} htmlFor="cw-ann-last">Last name</label>
                          <input id="cw-ann-last" name="lastName" type="text" placeholder="Last name" autoComplete="family-name" maxLength={60} required />
                        </div>
                        <div className={styles.emailRow}>
                          <label className={styles.srOnly} htmlFor="cw-ann-email">Email address</label>
                          <input id="cw-ann-email" name="email" type="email" placeholder="Email" autoComplete="email" inputMode="email" maxLength={254} required />
                          <button type="submit" className={styles.join} disabled={signup === "submitting"}>
                            {signup === "submitting" ? "Joining…" : "Join"}
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
            {bar.link.label} →
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
