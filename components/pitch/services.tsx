"use client";

import { useEffect, useRef } from "react";
import { onReady } from "@/components/loader";
import { whyCopy } from "@/lib/copy/pitch";
import s from "./services.module.css";

const tones = { signal: s.signal, stone: s.stone, deep: s.deep, ink: s.ink } as const;

/**
 * Why hire me, after area17.com/culture (the values): a grey title over a black
 * statement, then each reason as a word in a pill, a black title and a grey line.
 * As a reason enters the viewport its title and line rise 10px and fade in
 * (0.3s cubic-bezier(.61,1,.88,1), +0.2s and +0.3s); the pill is already there.
 * The reference stacks its values beside sticky media; here they sit two by two
 * so the section stays about one screen tall.
 */
export function Services() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    el.setAttribute("data-armed", "");
    const io = new IntersectionObserver(
      (es) =>
        es.forEach((e) => {
          if (!e.isIntersecting) return;
          e.target.setAttribute("data-in", "");
          io.unobserve(e.target);
        }),
      { rootMargin: "0px 0px -10% 0px" },
    );
    const off = onReady(() => el.querySelectorAll("[data-reveal]").forEach((n) => io.observe(n)));
    return () => {
      off();
      io.disconnect();
    };
  }, []);

  return (
    <section ref={root} id="why" data-nav="why" data-theme="paper" aria-labelledby="why-title" className={s.section}>
      <header>
        <h2 id="why-title" className={`${s.h1} ${s.tertiary}`}>
          {whyCopy.title}
        </h2>
        <p className={s.h1}>{whyCopy.statement}</p>
      </header>

      <ul className={s.reasons}>
        {whyCopy.reasons.map((r) => (
          <li key={r.title} data-reveal className={s.reason}>
            <span className={`${s.pill} ${tones[r.tone]}`}>{r.tag}</span>
            <h3 className={`${s.h2} ${s.title} ${s.anim}`}>{r.title}</h3>
            <p className={`${s.h2} ${s.secondary} ${s.anim}`}>{r.body}</p>
          </li>
        ))}
      </ul>

      <div data-reveal className={s.close}>
        <a href={whyCopy.cta.href} className={`btn ${s.cta} ${s.anim}`}>
          {whyCopy.cta.label}
        </a>
      </div>
    </section>
  );
}
