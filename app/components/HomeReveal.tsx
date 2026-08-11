"use client";

import { useEffect } from "react";

export default function HomeReveal() {
  useEffect(() => {
    document.documentElement.classList.add("has-home-reveal");
    const targets = Array.from(
      document.querySelectorAll<HTMLElement>("[data-home-reveal], [data-home-collage]"),
    );
    const merchReveal = document.querySelector<HTMLElement>("[data-merch-reveal]");
    if (merchReveal) targets.push(merchReveal);
    const community = document.querySelector<HTMLElement>("[data-community-reveal]");
    const communityPhotos = community
      ? Array.from(community.querySelectorAll<HTMLElement>(".home-community-photo"))
      : [];
    const merch = document.querySelector<HTMLElement>(".home-merch");
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let scrollFrame = 0;

    const updateMerchScroll = () => {
      scrollFrame = 0;
      if (!merch) return;

      const bounds = merch.getBoundingClientRect();
      const animationStart = window.innerHeight * 0.92;
      const animationDistance = window.innerHeight * 0.44;
      const progress = Math.min(
        1,
        Math.max(0, (animationStart - bounds.top) / animationDistance),
      );
      const inverse = 1 - progress;
      merch.style.setProperty("--merch-scroll-progress", progress.toFixed(3));
      merch.style.setProperty("--merch-stack-offset-left", `${(inverse * 112).toFixed(2)}%`);
      merch.style.setProperty("--merch-stack-offset-right", `${(inverse * -112).toFixed(2)}%`);
      merch.style.setProperty("--merch-rotate-left", `${(inverse * -11).toFixed(2)}deg`);
      merch.style.setProperty("--merch-rotate-middle", `${(inverse * 4).toFixed(2)}deg`);
      merch.style.setProperty("--merch-rotate-right", `${(inverse * 11).toFixed(2)}deg`);
      merch.style.setProperty("--merch-stack-rise", `${(inverse * 6).toFixed(3)}rem`);
      merch.style.setProperty("--merch-stack-scale", (0.8 + progress * 0.2).toFixed(3));
      merch.style.setProperty("--merch-stack-opacity", (0.42 + progress * 0.58).toFixed(3));
      merch.style.setProperty("--merch-heading-clip", `${(inverse * 100).toFixed(2)}%`);
      merch.style.setProperty("--merch-heading-rise", `${(inverse * 3.5).toFixed(3)}rem`);
      merch.style.setProperty("--merch-heading-opacity", (0.08 + progress * 0.92).toFixed(3));
      merch.style.setProperty("--merch-image-shift", `${((0.5 - progress) * 2).toFixed(3)}rem`);
      merch.style.setProperty("--merch-image-scale", (1.06 + progress * 0.025).toFixed(3));
    };

    const requestMerchScrollUpdate = () => {
      if (scrollFrame) return;
      scrollFrame = window.requestAnimationFrame(updateMerchScroll);
    };

    community?.classList.remove("is-home-visible");
    communityPhotos.forEach((photo) => {
      photo.style.removeProperty("--community-photo-opacity");
      photo.style.removeProperty("--community-photo-scale");
      photo.style.removeProperty("--community-photo-translate");
    });

    if (merch && !prefersReducedMotion) {
      updateMerchScroll();
      window.addEventListener("scroll", requestMerchScrollUpdate, { passive: true });
      window.addEventListener("resize", requestMerchScrollUpdate);
    }

    if (!("IntersectionObserver" in window)) {
      targets.forEach((target) => target.classList.add("is-home-visible"));
      community?.classList.add("is-home-visible");
      return () => {
        window.removeEventListener("scroll", requestMerchScrollUpdate);
        window.removeEventListener("resize", requestMerchScrollUpdate);
        if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
        merch?.removeAttribute("style");
        document.documentElement.classList.remove("has-home-reveal");
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-home-visible");
          observer.unobserve(entry.target);
        });
      },
      {
        rootMargin: "0px 0px -10% 0px",
        threshold: 0.12,
      },
    );

    targets.forEach((target) => observer.observe(target));
    if (community) observer.observe(community);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", requestMerchScrollUpdate);
      window.removeEventListener("resize", requestMerchScrollUpdate);
      if (scrollFrame) window.cancelAnimationFrame(scrollFrame);
      merch?.removeAttribute("style");
      document.documentElement.classList.remove("has-home-reveal");
    };
  }, []);

  return null;
}
