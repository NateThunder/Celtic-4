"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const NAV_ITEMS = [
  { label: "Home", href: "#home" },
  { label: "Music", href: "/music" },
  { label: "Stems", href: "/stem-player" },
  { label: "Events", href: "/live-events" },
  { label: "Videos", href: "/videos" },
  { label: "Shop", href: "/shop" },
  { label: "About", href: "/about" },
];

const EDITORIAL_HOME_SOCIALS = [
  {
    label: "Spotify",
    href: "https://open.spotify.com/artist/0h2AQKpVBEEXQQ03KGf7ep?si=9eAa0Ik8Rmm2Nip-K8Y-Kg",
    platform: "spotify",
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/CelticWorshipMusic",
    platform: "youtube",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/celtic_worship",
    platform: "instagram",
  },
] as const;

type NavScrollState = {
  lastScrollY: number;
  isHidden: boolean;
  ticking: boolean;
};

type BodyScrollLockSnapshot = {
  scrollY: number;
  position: string;
  top: string;
  width: string;
  overflow: string;
};

const ALWAYS_SHOW_TOP_Y = 20;
const MOBILE_DRAWER_MAX_WIDTH = 1024;

function HeaderSocialIcon({ platform }: { platform: (typeof EDITORIAL_HOME_SOCIALS)[number]["platform"] }) {
  if (platform === "spotify") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path
          d="M12 2.1a9.9 9.9 0 1 0 0 19.8 9.9 9.9 0 0 0 0-19.8Zm4.54 14.28a.73.73 0 0 1-1 .24c-2.75-1.68-6.2-2.06-10.27-1.13a.73.73 0 0 1-.33-1.43c4.45-1.01 8.27-.57 11.36 1.32.34.21.45.65.24 1Zm1.21-2.69a.91.91 0 0 1-1.25.3c-3.15-1.94-7.96-2.5-11.68-1.37a.91.91 0 0 1-.53-1.74c4.25-1.29 9.55-.67 13.16 1.55.43.26.56.83.3 1.26Zm.1-2.8C14.07 8.65 7.84 8.44 4.23 9.54a1.09 1.09 0 1 1-.63-2.08c4.15-1.26 11.03-1.01 15.36 1.55a1.09 1.09 0 0 1-1.11 1.88Z"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (platform === "youtube") {
    return (
      <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
        <path
          d="M22.1 7.65a3.02 3.02 0 0 0-2.12-2.13C18.1 5 10.56 5 10.56 5s-7.54 0-9.42.52A3.02 3.02 0 0 0-.98 7.65 31.64 31.64 0 0 0-1.5 12a31.64 31.64 0 0 0 .52 4.35 3.02 3.02 0 0 0 2.12 2.13c1.88.52 9.42.52 9.42.52s7.54 0 9.42-.52a3.02 3.02 0 0 0 2.12-2.13A31.64 31.64 0 0 0 22.62 12a31.64 31.64 0 0 0-.52-4.35ZM8.14 15.64V8.36L14.42 12l-6.28 3.64Z"
          fill="currentColor"
          transform="translate(1.44)"
        />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" focusable="false" aria-hidden="true">
      <path
        d="M7.9 2h8.2A5.9 5.9 0 0 1 22 7.9v8.2a5.9 5.9 0 0 1-5.9 5.9H7.9A5.9 5.9 0 0 1 2 16.1V7.9A5.9 5.9 0 0 1 7.9 2Zm0 2A3.9 3.9 0 0 0 4 7.9v8.2A3.9 3.9 0 0 0 7.9 20h8.2a3.9 3.9 0 0 0 3.9-3.9V7.9A3.9 3.9 0 0 0 16.1 4H7.9ZM12 7.1a4.9 4.9 0 1 1 0 9.8 4.9 4.9 0 0 1 0-9.8Zm0 2a2.9 2.9 0 1 0 0 5.8 2.9 2.9 0 0 0 0-5.8Zm5.08-2.43a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Z"
        fill="currentColor"
      />
    </svg>
  );
}

/*
Manual test plan (no test framework configured):
1) Load any page at top: navbar is visible.
2) Scroll down beyond top 20px: navbar hides immediately.
3) Scroll up anywhere below top 20px: navbar stays hidden.
4) Return to top 20px zone: navbar shows again.
5) On mobile, opening drawer prevents page scroll.
*/
export default function SiteHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [activeHash, setActiveHash] = useState("#home");
  const pathname = usePathname() || "/";
  const navScrollRef = useRef<NavScrollState>({
    lastScrollY: 0,
    isHidden: false,
    ticking: false,
  });
  const isScrolledRef = useRef(false);
  const isDrawerOpenRef = useRef(false);
  const bodyScrollLockRef = useRef<BodyScrollLockSnapshot | null>(null);

  useEffect(() => {
    isDrawerOpenRef.current = isDrawerOpen;

    if (typeof document === "undefined") return;
    const { documentElement, body } = document;
    const restoreScrollPosition = (scrollY: number) => {
      if (typeof window === "undefined") return;

      const attachCatchIfPromise = (value: unknown) => {
        if (
          value &&
          typeof value === "object" &&
          "catch" in value &&
          typeof (value as { catch: (handler: (error: unknown) => void) => void }).catch ===
            "function"
        ) {
          (value as { catch: (handler: (error: unknown) => void) => void }).catch(() => {});
        }
      };

      try {
        const maybePromise = window.scrollTo({ top: scrollY, left: 0, behavior: "auto" });
        attachCatchIfPromise(maybePromise);
        return;
      } catch {}

      try {
        const maybePromise = window.scrollTo(0, scrollY);
        attachCatchIfPromise(maybePromise);
      } catch {}
    };

    const unlockBodyScroll = () => {
      const lockSnapshot = bodyScrollLockRef.current;
      if (!lockSnapshot) return;

      body.style.position = lockSnapshot.position;
      body.style.top = lockSnapshot.top;
      body.style.width = lockSnapshot.width;
      body.style.overflow = lockSnapshot.overflow;
      bodyScrollLockRef.current = null;
      window.requestAnimationFrame(() => {
        restoreScrollPosition(lockSnapshot.scrollY);
      });
    };

    if (isDrawerOpen) {
      documentElement.classList.add("has-open-nav-drawer");
      body.classList.add("has-open-nav-drawer");

      if (!bodyScrollLockRef.current) {
        const scrollY = Math.max(0, window.scrollY || window.pageYOffset || 0);
        bodyScrollLockRef.current = {
          scrollY,
          position: body.style.position,
          top: body.style.top,
          width: body.style.width,
          overflow: body.style.overflow,
        };

        body.style.position = "fixed";
        body.style.top = `-${scrollY}px`;
        body.style.width = "100%";
        body.style.overflow = "hidden";
      }
    } else {
      documentElement.classList.remove("has-open-nav-drawer");
      body.classList.remove("has-open-nav-drawer");
      unlockBodyScroll();
    }

    return () => {
      documentElement.classList.remove("has-open-nav-drawer");
      body.classList.remove("has-open-nav-drawer");
      unlockBodyScroll();
    };
  }, [isDrawerOpen]);

  useEffect(() => {
    const rafId = window.requestAnimationFrame(() => {
      setIsDrawerOpen(false);
    });

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, [pathname]);

  useEffect(() => {
    if (!isDrawerOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsDrawerOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isDrawerOpen]);

  useEffect(() => {
    const getScrollY = () => Math.max(0, window.scrollY || window.pageYOffset || 0);
    const navScrollState = navScrollRef.current;
    let rafId: number | null = null;

    const setHeaderHidden = (nextHidden: boolean) => {
      if (navScrollState.isHidden === nextHidden) return;
      navScrollState.isHidden = nextHidden;
      setIsHidden(nextHidden);
    };

    const setHeaderScrolled = (nextIsScrolled: boolean) => {
      if (isScrolledRef.current === nextIsScrolled) return;
      isScrolledRef.current = nextIsScrolled;
      setIsScrolled(nextIsScrolled);
    };

    const updateNavbarVisibility = () => {
      const currentScrollY = getScrollY();
      setHeaderScrolled(currentScrollY > 0);
      const isMobileViewport = window.innerWidth <= MOBILE_DRAWER_MAX_WIDTH;

      if (!isMobileViewport && isDrawerOpenRef.current) {
        setIsDrawerOpen(false);
      }

      // Keep header accessible on mobile/tablet so drawer toggle is always usable.
      if (isMobileViewport) {
        setHeaderHidden(false);
        navScrollState.lastScrollY = currentScrollY;
        return;
      }

      if (currentScrollY <= ALWAYS_SHOW_TOP_Y) {
        setHeaderHidden(false);
        navScrollState.lastScrollY = currentScrollY;
        return;
      }

      setHeaderHidden(true);
      if (isDrawerOpenRef.current) {
        setIsDrawerOpen(false);
      }

      navScrollState.lastScrollY = currentScrollY;
    };

    const scheduleVisibilityUpdate = () => {
      if (navScrollState.ticking) return;
      navScrollState.ticking = true;
      rafId = window.requestAnimationFrame(() => {
        updateNavbarVisibility();
        navScrollState.ticking = false;
      });
    };

    const initialScrollY = getScrollY();
    navScrollState.lastScrollY = initialScrollY;
    navScrollState.isHidden = false;
    navScrollState.ticking = false;
    isScrolledRef.current = false;
    scheduleVisibilityUpdate();

    window.addEventListener("scroll", scheduleVisibilityUpdate, { passive: true });
    window.addEventListener("resize", scheduleVisibilityUpdate);

    return () => {
      window.removeEventListener("scroll", scheduleVisibilityUpdate);
      window.removeEventListener("resize", scheduleVisibilityUpdate);
      if (rafId !== null) window.cancelAnimationFrame(rafId);
      navScrollState.ticking = false;
    };
  }, []);

  useEffect(() => {
    if (pathname !== "/") return;

    const syncHash = () => {
      setActiveHash(window.location.hash || "#home");
    };

    window.addEventListener("hashchange", syncHash);
    return () => {
      window.removeEventListener("hashchange", syncHash);
    };
  }, [pathname]);

  const isHomePath = pathname === "/";

  return (
    <header
      className={`site-header ${isHidden ? "nav--hidden" : "nav--shown"}${
        isScrolled ? " is-scrolled" : ""
      } site-header--dark-links site-header--editorial-home`}
    >
      <a
        className="brand editorial-brand"
        href={isHomePath ? "#home" : "/#home"}
        aria-label="Celtic Worship"
        onClick={() => {
          setIsDrawerOpen(false);
        }}
      >
        <span className="editorial-brand-lockup">Celtic Worship</span>
      </a>

      <button
        className={`nav-toggle${isDrawerOpen ? " is-open" : ""}`}
        type="button"
        aria-label="Toggle navigation menu"
        aria-controls="site-main-nav"
        aria-expanded={isDrawerOpen ? "true" : "false"}
        onClick={() => {
          setIsDrawerOpen((previous) => !previous);
        }}
      >
        <span />
        <span />
        <span />
      </button>

      <div className="header-socials editorial-header-socials" aria-label="Social links">
        {EDITORIAL_HOME_SOCIALS.map((social) => (
          <a
            key={social.label}
            className="social-link editorial-social-link"
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={social.label}
          >
            <HeaderSocialIcon platform={social.platform} />
          </a>
        ))}
      </div>

      <button
        className={`nav-drawer-backdrop${isDrawerOpen ? " is-open" : ""}`}
        type="button"
        aria-label="Close navigation menu"
        tabIndex={isDrawerOpen ? 0 : -1}
        onClick={() => {
          setIsDrawerOpen(false);
        }}
      />

      <nav
        id="site-main-nav"
        className={`main-nav${isDrawerOpen ? " is-open" : ""}`}
        aria-label="Main"
      >
        {NAV_ITEMS.map((item) => {
          const isHashLink = item.href.startsWith("#");
          const resolvedHref = isHashLink && !isHomePath ? `/${item.href}` : item.href;
          const isActive = isHashLink
            ? isHomePath && activeHash === item.href
            : pathname === item.href;

          return (
            <a
              key={item.href}
              className={isActive ? "is-active" : undefined}
              href={resolvedHref}
              aria-current={isActive ? "page" : undefined}
              onClick={() => {
                setIsDrawerOpen(false);
                if (isHashLink && isHomePath) setActiveHash(item.href);
              }}
            >
              {item.label}
            </a>
          );
        })}
      </nav>
    </header>
  );
}
