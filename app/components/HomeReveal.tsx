"use client";

import { useEffect } from "react";

export default function HomeReveal() {
  useEffect(() => {
    document.documentElement.classList.add("has-home-reveal");
    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-home-reveal]"));
    const community = document.querySelector<HTMLElement>("[data-community-reveal]");
    const communityPhotos = community
      ? Array.from(community.querySelectorAll<HTMLElement>(".home-community-photo"))
      : [];

    if (!("IntersectionObserver" in window)) {
      targets.forEach((target) => target.classList.add("is-home-visible"));
      return () => {
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

    let animationFrame = 0;

    const updateCommunityPhotos = () => {
      animationFrame = 0;
      if (!community) return;

      const bounds = community.getBoundingClientRect();
      const revealStart = window.innerHeight * 0.82;
      const revealDistance = Math.max(
        window.innerHeight,
        bounds.height - window.innerHeight * 0.45,
      );
      const sectionProgress = Math.min(
        1,
        Math.max(0, (revealStart - bounds.top) / revealDistance),
      );

      communityPhotos.forEach((photo, index) => {
        const staggerStart = index * 0.2;
        const photoProgress = Math.min(
          1,
          Math.max(0, (sectionProgress - staggerStart) / 0.55),
        );
        photo.style.setProperty(
          "--community-photo-opacity",
          (0.06 + photoProgress * 0.82).toFixed(3),
        );
        photo.style.setProperty(
          "--community-photo-scale",
          (0.72 + photoProgress * 0.28).toFixed(3),
        );
        photo.style.setProperty(
          "--community-photo-translate",
          `${((1 - photoProgress) * 7).toFixed(3)}rem`,
        );
      });
    };

    const requestCommunityUpdate = () => {
      if (animationFrame) return;
      animationFrame = window.requestAnimationFrame(updateCommunityPhotos);
    };

    updateCommunityPhotos();
    window.addEventListener("scroll", requestCommunityUpdate, { passive: true });
    window.addEventListener("resize", requestCommunityUpdate);

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", requestCommunityUpdate);
      window.removeEventListener("resize", requestCommunityUpdate);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
      document.documentElement.classList.remove("has-home-reveal");
    };
  }, []);

  return null;
}
