"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

const NAV_ITEMS = [
  { label: "Home", href: "#home" },
  { label: "About", href: "/about" },
  { label: "Live Events", href: "/live-events" },
  { label: "Music", href: "/music" },
  { label: "Videos", href: "#videos" },
  { label: "Shop", href: "/shop" },
];

type NavScrollState = {
  lastScrollY: number;
  isHidden: boolean;
  ticking: boolean;
};

const ALWAYS_SHOW_TOP_Y = 20;

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

  useEffect(() => {
    isDrawerOpenRef.current = isDrawerOpen;

    if (typeof document === "undefined") return;
    document.body.classList.toggle("has-open-nav-drawer", isDrawerOpen);

    return () => {
      document.body.classList.remove("has-open-nav-drawer");
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

    const onScroll = () => {
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
    navScrollState.ticking = true;
    rafId = window.requestAnimationFrame(() => {
      updateNavbarVisibility();
      navScrollState.ticking = false;
    });

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
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
      <a className="brand" href={isHomePath ? "#home" : "/#home"} aria-label="Celtic Worship">
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
          if (isHidden) return;
          setIsDrawerOpen((previous) => !previous);
        }}
      >
        <span />
        <span />
        <span />
      </button>

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
