"use client";

import { m, useScroll, useTransform, type MotionValue } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { caseStudyOf, design, type LiveProject } from "@/lib/content";
import { Board } from "./board";
import { Fade, Opener, Rise } from "./ui/reveal";

/* ------------------------------------------------------------------ */
/* Boards                                                               */
/* ------------------------------------------------------------------ */

function Project({ project, index }: { project: LiveProject; index: number }) {
  const study = caseStudyOf(project.slug);
  const href = study ? `/work/${project.slug}` : project.url;
  return (
    <article data-tone={project.tone} aria-labelledby={`site-${project.slug}`} className="board-row grid gap-x-6 gap-y-5 md:grid-cols-12">
      <Fade className="md:col-span-3 md:pt-1 md:text-right">
        <h3 id={`site-${project.slug}`} className="t-h3">
          {project.name}
        </h3>
        <p className="t-h3 mute">{project.sector}</p>
        <p className="t-label mute mt-4">
          {String(index + 1).padStart(2, "0")} · {project.place}
        </p>
        <p className="t-label mt-4 flex gap-5 md:justify-end">
          {study ? (
            <Link href={href} className="link">
              Case study <span className="nudge">→</span>
            </Link>
          ) : null}
          <a href={project.url} target="_blank" rel="noreferrer" className="link">
            Live <span className="nudge nudge-up">↗</span>
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </p>
      </Fade>
      <Link href={href} aria-label={`${project.name}: ${study ? "case study" : "live site"}`} className="block md:col-span-9">
        <Board project={project} />
      </Link>
    </article>
  );
}

/**
 * As a board reaches the middle of the screen the page takes on a little of
 * its colour, and lets go when the Design chapter ends.
 */
function useBoardTint(section: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = document.documentElement;
    const ink = [15, 11, 10];
    const mix = (hex: string, k: number) => {
      const n = parseInt(hex.slice(1), 16);
      const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255];
      return `rgb(${c.map((v, i) => Math.round(ink[i] * (1 - k) + v * k)).join(" ")})`;
    };
    let raf = 0;
    let current = "";
    const compute = () => {
      raf = 0;
      const el = section.current;
      if (!el) return;
      const mid = window.innerHeight / 2;
      const box = el.getBoundingClientRect();
      let tone = "";
      if (box.top < mid && box.bottom > mid) {
        for (const row of el.querySelectorAll<HTMLElement>(".board-row")) {
          const r = row.getBoundingClientRect();
          if (r.top < mid + 120 && r.bottom > mid - 120) tone = row.dataset.tone ?? "";
        }
      }
      if (tone === current) return;
      current = tone;
      if (tone) root.style.setProperty("--bg", mix(tone, 0.22));
      else root.style.removeProperty("--bg");
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(compute);
    };
    compute();
    window.addEventListener("scroll", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", schedule);
      root.style.removeProperty("--bg");
    };
  }, [section]);
}

/* ------------------------------------------------------------------ */
/* Every screen: three columns that move against each other             */
/* ------------------------------------------------------------------ */

type Tile = { src: string; label: string; phone?: boolean; alt: string };

const tiles: Tile[] = design.projects.flatMap((p) =>
  p.screens.map((s) => ({ src: s.src, phone: "phone" in s ? s.phone : false, label: `${p.name} · ${s.caption}`, alt: `${p.name}, ${s.caption.toLowerCase()}` })),
);

function Column({ items, y }: { items: Tile[]; y: MotionValue<string> }) {
  return (
    <m.ul style={{ y }} className="flex flex-col gap-6 will-change-transform">
      {items.map((t) => (
        <li key={t.src}>
          <div className={`relative overflow-hidden rounded-xl bg-surface ring-1 ring-fg/12 ${t.phone ? "mx-auto aspect-[390/844] w-[58%]" : "aspect-[16/10]"}`}>
            <Image src={t.src} alt={t.alt} fill sizes="(min-width: 768px) 30vw, 46vw" className="object-cover object-top" />
          </div>
          <p className={`t-label mute mt-2.5 text-[11px] ${t.phone ? "text-center" : ""}`}>{t.label}</p>
        </li>
      ))}
    </m.ul>
  );
}

function Gallery() {
  const box = useRef<HTMLDivElement>(null);
  const cols = useRef<HTMLDivElement>(null);
  const [travel, setTravel] = useState(1200);
  const { scrollYProgress } = useScroll({ target: box, offset: ["start end", "end start"] });
  // Outer columns rise, the middle one sinks; each covers its full length.
  const up = useTransform(scrollYProgress, (p) => `${-p * travel}px`);
  const down = useTransform(scrollYProgress, (p) => `${-(1 - p) * travel}px`);
  const upSlow = useTransform(scrollYProgress, (p) => `${-p * travel * 0.82}px`);

  useLayoutEffect(() => {
    const measure = () => {
      const c = cols.current;
      const b = box.current;
      if (!c || !b) return;
      const heights = [...c.querySelectorAll("ul")].map((el) => el.scrollHeight);
      setTravel(Math.max(0, Math.max(...heights) - b.clientHeight));
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (cols.current) ro.observe(cols.current);
    return () => ro.disconnect();
  }, []);

  const byCol = [0, 1, 2].map((c) => tiles.filter((_, i) => i % 3 === c));

  return (
    <div className="mt-[var(--section)]">
      <div className="grid gap-x-6 gap-y-4 md:grid-cols-12 md:items-end">
        <Rise as="h3" lines={[design.gallery.title]} className="t-h2 md:col-span-6" />
        <Fade as="p" className="t-small mute max-w-[44ch] md:col-span-5 md:col-start-8 md:justify-self-end md:text-right">
          {design.gallery.note} <span className="t-label">({tiles.length} screens)</span>
        </Fade>
      </div>
      <div
        ref={box}
        className="relative mt-10 h-[150svh] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,#000_8%,#000_92%,transparent)]"
      >
        <div ref={cols} className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
          <Column items={byCol[0]} y={up} />
          <Column items={byCol[1]} y={down} />
          <div className="hidden md:block">
            <Column items={byCol[2]} y={upSlow} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function DesignWork() {
  const section = useRef<HTMLElement>(null);
  useBoardTint(section);
  return (
    <section ref={section} id="design" data-nav="design" data-theme="ink" aria-labelledby="design-title" className="px-gutter pb-[var(--section)] pt-[var(--section)]">
      <Opener index={design.index} label={design.label} meta={design.meta} />
      <div className="mt-12 grid gap-x-6 gap-y-6 md:grid-cols-12 md:items-end">
        <Rise id="design-title" lines={[design.title]} className="t-h1 md:col-span-6" />
        <Fade as="p" className="t-lead mute max-w-[46ch] md:col-span-5 md:col-start-8">
          {design.intro}
        </Fade>
      </div>
      <div className="mt-[clamp(56px,7vw,104px)] space-y-[clamp(56px,7vw,96px)]">
        {design.projects.map((p, i) => (
          <Project key={p.slug} project={p} index={i} />
        ))}
      </div>
      <Gallery />
    </section>
  );
}
