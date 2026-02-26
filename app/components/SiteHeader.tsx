"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const NAV_ITEMS = [
  { label: "Home", href: "#home" },
  { label: "About", href: "/about" },
  { label: "Live Events", href: "/live-events" },
  { label: "Music", href: "/music" },
  { label: "Shop", href: "/shop" },
];

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
  const isShopProductPath = /^\/shop\/\d+$/.test(pathname);
  const useDarkLinks = pathname === "/shop" || pathname === "/shop/cart";
  const useBlackBar = isShopProductPath;
  const useSolidOpacity = pathname === "/live-events";

  return (
    <header
      className={`site-header ${isHidden ? "nav--hidden" : "nav--shown"}${
        isScrolled ? " is-scrolled" : ""
      }${useDarkLinks ? " site-header--dark-links" : ""}${
        useBlackBar ? " site-header--black-bar" : ""
      }${
        useSolidOpacity ? " site-header--no-opacity" : ""
      }`}
    >
      <a
        className="brand"
        href={isHomePath ? "#home" : "/#home"}
        aria-label="Celtic Worship"
        onClick={() => {
          setIsDrawerOpen(false);
        }}
      >
        <Image
          className="brand-logo"
          src="/CELTIC-WORSHIP-LOGO-smaller-1-600x35.png"
          alt="Celtic Worship"
          width={600}
          height={35}
          priority
        />
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
