"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { onReady } from "@/components/loader";
import { practices as P } from "@/lib/copy/chapters";
import s from "./two-practices.module.css";

const useIso = typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * Two practices as two words, sethlukin.com style: DESIGN and ENGINEERING set full width in
 * heavy uppercase, each with its outcome and a link into its chapter. As a row enters view
 * the word rises 152px (10.56vw) and goes grey to paper in ~.45s; its line and link follow
 * (rise 30px, ~80ms apart). The second word trails the first by .4s when both enter together.
 * Paints its own ink background (it is the first sheet over the pinned hero).
 */
export function TwoPractices() {
  const root = useRef<HTMLElement>(null);
  const longest = useRef<HTMLSpanElement>(null);

  // Both words share one size: the longer one spans the full content width.
  useIso(() => {
    const el = root.current;
    const w = longest.current;
    if (!el || !w) return;
    const fit = () => {
      el.style.setProperty("--fs", "100px");
      const cs = getComputedStyle(el);
      const avail = el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const width = w.getBoundingClientRect().width;
      if (width > 0) el.style.setProperty("--fs", `${Math.floor((100 * avail * 0.995) / width)}px`);
    };
    fit();
    document.fonts?.ready.then(fit);
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.classList.add(s.armed);
    const rows = [...el.querySelectorAll<HTMLElement>(`.${s.row}`)];
    let lastIn = 0;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          io.unobserve(e.target);
          // Rows that arrive together keep the reference's .4s gap between words.
          const now = performance.now();
          const delay = Math.max(0, lastIn + 400 - now);
          lastIn = now + delay;
          window.setTimeout(() => e.target.setAttribute("data-in", ""), delay);
        }
      },
      { rootMargin: "0px 0px -18% 0px" },
    );
    const off = onReady(() => rows.forEach((r) => io.observe(r)));
    return () => {
      off();
      io.disconnect();
    };
  }, []);

  const longestIndex = P.rows.reduce((m, r, i) => (r.word.length > P.rows[m].word.length ? i : m), 0);

  return (
    <section ref={root} data-theme="ink" aria-labelledby="practices-title" className={s.section}>
      <h2 id="practices-title" className="sr-only">
        {P.heading}
      </h2>
      {P.rows.map((r, i) => (
        <div key={r.word} className={s.row}>
          <h3 className={s.word}>
            <span ref={i === longestIndex ? longest : undefined} className={s.wordInner}>
              {r.word}
            </span>
          </h3>
          <div className={s.meta}>
            <p className={s.outcome}>{r.outcome}</p>
            <a className={s.go} href={r.link.href}>
              {r.link.label}
            </a>
          </div>
        </div>
      ))}
    </section>
  );
}
