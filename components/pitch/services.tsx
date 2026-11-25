"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import { servicesCopy } from "@/lib/copy/pitch";
import s from "./services.module.css";

/**
 * Services, after basement.studio/services: a grey label over a rule, then
 * a large statement. The statement fills word by word as it crosses the
 * viewport (between 88% and 40% of the height); the outcome words go brightest.
 */
export function Services() {
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const items = [...el.querySelectorAll<HTMLElement>("[data-item]")];
    const bodies = items.map((it) => ({
      p: it.querySelector<HTMLElement>("[data-fill]")!,
      w: [...it.querySelectorAll<HTMLElement>("[data-w]")],
      last: -1,
    }));
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const io = new IntersectionObserver(
      (es) => es.forEach((e) => e.isIntersecting && (e.target as HTMLElement).setAttribute("data-in", "")),
      { threshold: 0.15 },
    );
    items.forEach((it) => io.observe(it));

    let raf = 0;
    const update = () => {
      raf = 0;
      const H = window.innerHeight;
      for (const b of bodies) {
        const r = b.p.getBoundingClientRect();
        if (r.bottom < -H || r.top > H * 2) continue;
        const pr = reduced ? 1 : Math.max(0, Math.min(1, (H * 0.88 - r.top) / (H * 0.48)));
        const n = Math.round(pr * b.w.length);
        if (n === b.last) continue;
        b.last = n;
        b.w.forEach((w, i) => (i < n ? w.setAttribute("data-on", "") : w.removeAttribute("data-on")));
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, []);

  return (
    <section ref={root} id="services" data-nav="services" data-theme="ink" aria-labelledby="services-title" className={s.section}>
      <div className={s.top}>
        <h2 id="services-title" className={s.title}>
          {servicesCopy.title}
        </h2>
        <div className={s.image}>
          <Image src={servicesCopy.image.src} alt={servicesCopy.image.alt} fill sizes="(max-width: 767px) 100vw, 25vw" />
        </div>
        <p className={s.intro}>{servicesCopy.intro}</p>
      </div>

      <div className={s.grid}>
        {servicesCopy.items.map((item) => {
          const words = item.body.split(/\s+/);
          return (
            <article key={item.name} data-item className={s.item}>
              <h3 className={s.label}>
                <span className={s.group}>{item.group}</span>
                {item.name}
              </h3>
              <div aria-hidden className={s.rule} />
              <p data-fill className={s.body}>
                {words.map((w, i) => (
                  <span key={i}>
                    <span data-w className={`${s.w} ${i < item.lead ? s.hl : ""}`}>
                      {w}
                    </span>
                    {i < words.length - 1 ? " " : null}
                  </span>
                ))}
              </p>
              <ul className={s.list} aria-label={`${item.name}: typical deliverables`}>
                {item.deliverables.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </article>
          );
        })}
      </div>
    </section>
  );
}
