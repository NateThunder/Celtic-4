"use client";

import { useEffect } from "react";

export default function HomeReveal() {
  useEffect(() => {
    document.documentElement.classList.add("has-home-reveal");
    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-home-reveal]"));

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
    return () => {
      observer.disconnect();
      document.documentElement.classList.remove("has-home-reveal");
    };
  }, []);

  return null;
}
