
"use client";

import { useEffect } from "react";

const SELECTOR = [
  ".masthead",
  ".hero-stats > *",
  ".section-grid > *",
  ".split > *",
  ".panel",
  ".ops-event-card",
  ".ops-mobile-feed tbody tr",
  ".subscribe-card",
  ".mission-strip",
  ".weather-strip",
  ".hero-signal-row",
  ".snapshot-tile",
  ".story-stage-card",
  ".feature-item"
].join(",");

export default function SoftRevealController() {
  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const root = document.documentElement;

    if (prefersReduced) {
      root.classList.remove("soft-reveal-ready");
      return undefined;
    }

    const nodes = Array.from(document.querySelectorAll(SELECTOR));
    nodes.forEach((node) => node.setAttribute("data-soft-reveal", ""));
    root.classList.add("soft-reveal-ready");

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );

    nodes.forEach((node) => observer.observe(node));
    return () => {
      observer.disconnect();
      nodes.forEach((node) => {
        node.removeAttribute("data-soft-reveal");
        node.classList.remove("is-visible");
      });
      root.classList.remove("soft-reveal-ready");
    };
  }, []);

  return null;
}
