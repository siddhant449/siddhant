"use client";

import { frame, m, useScroll, useTransform, type MotionValue } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { design, type LiveProject } from "@/lib/content";
import { Board } from "./board";
import { onScrollFrame } from "./ui/theme";
import { Fade, Opener, Rise } from "./ui/reveal";

/* ------------------------------------------------------------------ */
/* Boards                                                               */
/* ------------------------------------------------------------------ */

function Project({ project }: { project: LiveProject }) {
  // Every design project has a case study (lib/content.ts caseStudies). Linking by slug keeps
  // the case-study text out of the home page's JavaScript.
  const href = `/work/${project.slug}`;
  return (
    <article data-tone={project.tone} aria-labelledby={`site-${project.slug}`} className="board-row grid gap-x-6 gap-y-5 lg:grid-cols-12">
      {/* Below lg the details sit above the board; a 3-of-12 column there wraps every label. */}
      <Fade className="md:flex md:items-end md:justify-between md:gap-6 lg:col-span-3 lg:block lg:pt-1 lg:text-right">
        <div>
          <h3 id={`site-${project.slug}`} className="t-h3">
            {project.name}
          </h3>
          <p className="t-h3 mute">{project.sector}</p>
        </div>
        <div className="md:text-right">
          <p className="t-label mute mt-4">{project.place}</p>
          <p className="t-label mt-4 flex gap-5 md:justify-end">
            <Link href={href} className="link">
              Case study
            </Link>
            <a href={project.url} target="_blank" rel="noreferrer" className="link">
              Live site
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </p>
        </div>
      </Fade>
      <Link href={href} aria-label={`${project.name}: case study`} className="block lg:col-span-9">
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
    // The tint layer sits over the page background (see GLRoot): the row's colour at 22% over
    // ink, which is the same colour as mixing it into --bg, but changes only one layer.
    const tint = document.querySelector<HTMLElement>("[data-page-tint]");
    let current = "";
    let near = false;
    const rows = section.current ? [...section.current.querySelectorAll<HTMLElement>(".board-row")] : [];
    const read = () => {
      const el = section.current;
      if (!el || !tint) return;
      let tone = "";
      // Only while the section is on screen (an observer says so) are its rows measured.
      if (near) {
        const mid = window.innerHeight / 2;
        const box = el.getBoundingClientRect();
        if (box.top < mid && box.bottom > mid) {
          for (const row of rows) {
            const r = row.getBoundingClientRect();
            if (r.top < mid + 120 && r.bottom > mid - 120) tone = row.dataset.tone ?? "";
          }
        }
      }
      if (tone === current) return;
      const from = current;
      current = tone;
      frame.render(() => {
        if (tone && !from) {
          // From no tint: take the new colour at once (only the opacity eases), then fade in.
          tint.style.transition = "opacity .35s ease-in-out";
          requestAnimationFrame(() => (tint.style.transition = ""));
        }
        if (tone) tint.style.backgroundColor = tone;
        tint.style.opacity = tone ? "0.22" : "0";
      });
    };
    const io = new IntersectionObserver(([e]) => {
      near = e.isIntersecting;
      read();
    });
    if (section.current) io.observe(section.current);
    const off = onScrollFrame(read);
    return () => {
      off();
      io.disconnect();
      if (tint) tint.style.opacity = "0";
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

const PHONE = "(max-width: 767px)";
const isPhone = () => window.matchMedia(PHONE).matches;
const subscribePhone = (cb: () => void) => {
  const mq = window.matchMedia(PHONE);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

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

  // Phones show two columns: deal the screens into two so none are left out.
  const count = useSyncExternalStore(subscribePhone, isPhone, () => false) ? 2 : 3;
  const byCol = [0, 1, 2].map((c) => tiles.filter((_, i) => i % count === c));

  return (
    <div className="mt-[var(--section)]">
      <div className="grid gap-x-6 gap-y-4 md:grid-cols-12 md:items-end">
        <Rise as="h3" lines={[design.gallery.title]} className="t-h2 md:col-span-6" />
        <Fade as="p" className="t-small mute max-w-[44ch] md:col-span-5 md:col-start-8 md:justify-self-end md:text-right">
          {design.gallery.note}
        </Fade>
      </div>
      <div
        ref={box}
        className="relative mt-10 h-[150svh] overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,#000_8%,#000_92%,transparent)]"
      >
        <div ref={cols} className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
          <Column items={byCol[0]} y={up} />
          <Column items={byCol[1]} y={down} />
          {count === 3 ? (
            <div className="hidden md:block">
              <Column items={byCol[2]} y={upSlow} />
            </div>
          ) : null}
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
      <Opener label={design.label} meta={design.meta} />
      <div className="mt-12 grid gap-x-6 gap-y-6 md:grid-cols-12 md:items-end">
        <Rise id="design-title" lines={[design.title]} className="t-h1 md:col-span-6" />
        <Fade as="p" className="t-lead mute max-w-[46ch] md:col-span-5 md:col-start-8">
          {design.intro}
        </Fade>
      </div>
      <div className="mt-[clamp(56px,7vw,104px)] space-y-[clamp(56px,7vw,96px)]">
        {design.projects.map((p) => (
          <Project key={p.slug} project={p} />
        ))}
      </div>
      <Gallery />
    </section>
  );
}
