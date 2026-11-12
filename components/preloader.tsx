"use client";

import { useLenis } from "lenis/react";
import { motion, useAnimate } from "motion/react";
import { useEffect, useState } from "react";
import { site } from "@/lib/content";
import { useIntro } from "@/lib/intro";

const SEEN_KEY = "sk-intro-seen";

/**
 * The one moment that plays on its own: the name arrives wide and light,
 * tightens into condensed heavy type, and the curtain lifts onto the hero.
 * Plays once per session and never for people who prefer reduced motion.
 */
export function Preloader() {
  const { finish } = useIntro();
  const lenis = useLenis();
  const [scope, animate] = useAnimate();
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let seen = false;
    try {
      seen = sessionStorage.getItem(SEEN_KEY) === "1";
    } catch {}

    if (seen || reduce || !scope.current) {
      root.dataset.intro = "seen";
      finish();
      setGone(true);
      return;
    }

    let cancelled = false;
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    window.scrollTo(0, 0);

    const fontsReady = Promise.race([
      document.fonts?.ready ?? Promise.resolve(),
      new Promise((r) => setTimeout(r, 1200)),
    ]);

    (async () => {
      await fontsReady;
      if (cancelled) return;
      await animate(
        "[data-word]",
        { y: ["105%", "0%"] },
        { duration: 0.8, ease: [0.22, 1, 0.36, 1] },
      );
      if (cancelled) return;
      await animate(
        "[data-word]",
        { "--wd": [125, 62], fontWeight: [200, 800], letterSpacing: ["0em", "-0.02em"] },
        { duration: 0.75, ease: [0.76, 0, 0.24, 1] },
      );
      if (cancelled) return;
      animate("[data-meta]", { opacity: 0 }, { duration: 0.25 });
      finish();
      await animate(
        scope.current,
        { clipPath: ["inset(0% 0% 0% 0%)", "inset(0% 0% 100% 0%)"] },
        { duration: 0.9, ease: [0.76, 0, 0.24, 1] },
      );
      if (cancelled) return;
      try {
        sessionStorage.setItem(SEEN_KEY, "1");
      } catch {}
      root.dataset.intro = "seen";
      setGone(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [animate, finish, scope]);

  // Hold the page still while the curtain is down.
  useEffect(() => {
    if (!lenis) return;
    if (gone) lenis.start();
    else lenis.stop();
  }, [gone, lenis]);

  if (gone) return null;

  return (
    <div
      ref={scope}
      aria-hidden
      className="preloader fixed inset-0 z-[100] flex flex-col justify-between bg-ink px-gutter py-6 text-chalk"
    >
      <div data-meta className="flex justify-between text-sm text-ash">
        <span>{site.role}</span>
        <span>{site.location}</span>
      </div>
      <div className="overflow-hidden pb-[0.06em]">
        <motion.span
          data-word
          initial={{ y: "105%" }}
          style={{ "--wd": 125, fontWeight: 200 } as React.CSSProperties}
          className="block whitespace-nowrap text-[clamp(36px,10vw,200px)] leading-[0.86] [font-variation-settings:'wdth'_var(--wd)]"
        >
          {site.name}
        </motion.span>
      </div>
    </div>
  );
}
