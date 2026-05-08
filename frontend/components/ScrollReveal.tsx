"use client";

import { useEffect, useRef } from "react";

interface Props {
  children: React.ReactNode;
  stagger?: number; // ms
}

export default function ScrollReveal({ children, stagger = 40 }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const reveals = Array.from(root.querySelectorAll<HTMLElement>(".reveal"));
    if (!reveals.length) return;

    // Respect user's reduced motion preference
    const prefersReduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) {
      reveals.forEach((el) => {
        el.classList.remove("opacity-0", "translate-y-6");
        el.classList.add("opacity-100", "translate-y-0");
        el.style.willChange = "auto";
      });
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const target = entry.target as HTMLElement;
          const idx = reveals.indexOf(target);
          const delay = Math.min(160, idx * stagger);
          window.setTimeout(() => {
            target.classList.remove("opacity-0", "translate-y-6");
            target.classList.add("opacity-100", "translate-y-0");
            target.style.willChange = "auto";
          }, delay);
          io.unobserve(target);
        });
      },
      { root: null, rootMargin: "0px 0px -4% 0px", threshold: 0.08 }
    );

    reveals.forEach((el) => {
      // ensure initial state is present so Tailwind classes are emitted
      el.classList.add("opacity-0", "translate-y-6");
      el.style.willChange = "transform, opacity";
      io.observe(el);
    });

    return () => io.disconnect();
  }, [stagger]);

  return <div ref={rootRef}>{children}</div>;
}
