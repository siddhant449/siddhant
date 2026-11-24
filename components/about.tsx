"use client";

import { m, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";
import { about, design, engineering, site } from "@/lib/content";
import { LocalTime } from "./ui/local-time";
import { Opener } from "./ui/reveal";

/**
 * A cell that starts as a small square somewhere off its mark and settles into
 * the grid as the section scrolls in, like a picture resolving pixel by pixel.
 */
function Cell({
  children,
  className,
  progress,
  from,
  order,
}: {
  children: React.ReactNode;
  className: string;
  progress: MotionValue<number>;
  from: [number, number];
  order: number;
}) {
  const reduce = useReducedMotion();
  const a = 0.05 + order * 0.07;
  const b = Math.min(1, a + 0.45);
  const x = useTransform(progress, [a, b], [from[0], 0]);
  const y = useTransform(progress, [a, b], [from[1], 0]);
  const scale = useTransform(progress, [a, b], [0.16, 1]);
  const opacity = useTransform(progress, [a, a + 0.12], [0, 1]);
  const radius = useTransform(progress, [a, b], [2, 16]);
  return (
    <m.div
      style={reduce ? undefined : { x, y, scale, opacity, borderRadius: radius }}
      className={`relative overflow-hidden rounded-2xl p-[clamp(16px,1.8vw,28px)] ${className}`}
    >
      {children}
    </m.div>
  );
}

export function About() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.25"] });

  return (
    <section id="about" data-nav="about" data-theme="paper" aria-labelledby="about-title" className="px-gutter py-[var(--section)]">
      <Opener index={about.index} label={about.label} meta={site.location} />
      <h2 id="about-title" className="sr-only">
        {about.title}
      </h2>

      <div ref={ref} className="mt-12 grid auto-rows-[minmax(132px,auto)] grid-cols-2 gap-2 md:grid-cols-12 md:gap-3">
        <Cell progress={scrollYProgress} from={[-120, 60]} order={0} className="col-span-2 row-span-2 flex flex-col justify-between bg-ink text-paper md:col-span-6">
          <p className="t-label mute">Designer &amp; fullstack AI engineer</p>
          <p className="mt-10 text-[clamp(3.4rem,8vw,8.6rem)] font-light leading-[0.9] tracking-[-0.05em]">
            Siddhant
            <span className="t-it block">Kotak</span>
          </p>
        </Cell>

        <Cell progress={scrollYProgress} from={[140, -40]} order={1} className="col-span-2 bg-[#fbf8f6] ring-1 ring-ink/12 md:col-span-6">
          <div className="space-y-4 t-lead">
            {about.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </Cell>

        <Cell progress={scrollYProgress} from={[60, 120]} order={2} className="bg-ink text-paper md:col-span-3">
          <p className="t-label mute">Design</p>
          <p className="mt-6 text-[clamp(3rem,5vw,5.5rem)] font-light leading-none tracking-[-0.05em] tabular-nums">{String(design.projects.length).padStart(2, "0")}</p>
          <p className="t-small mute mt-1">live websites</p>
        </Cell>

        <Cell progress={scrollYProgress} from={[180, 80]} order={3} className="bg-[#fbf8f6] ring-1 ring-ink/12 md:col-span-3">
          <p className="t-label mute">Engineering</p>
          <p className="mt-6 text-[clamp(3rem,5vw,5.5rem)] font-light leading-none tracking-[-0.05em] tabular-nums">{String(engineering.projects.length).padStart(2, "0")}</p>
          <p className="t-small mute mt-1">production systems</p>
        </Cell>

        <Cell progress={scrollYProgress} from={[-80, 140]} order={4} className="col-span-2 flex flex-col justify-between bg-[#fbf8f6] ring-1 ring-ink/12 md:col-span-4 md:row-span-2">
          <p className="t-label mute">Experience</p>
          <ol className="mt-6">
            {about.experience.map((e) => (
              <li key={e.org} className="grid grid-cols-[64px_1fr] gap-x-4 border-t border-ink/12 py-3">
                <span className="t-label mute pt-1 tabular-nums">{e.when}</span>
                <span>
                  <span className="block text-[15px] font-medium leading-snug">{e.org}</span>
                  <span className="t-small mute block">{e.role}</span>
                </span>
              </li>
            ))}
          </ol>
        </Cell>

        <Cell progress={scrollYProgress} from={[100, -100]} order={5} className="col-span-2 flex flex-col justify-between bg-signal text-paper md:col-span-4">
          <p className="t-label">Based in</p>
          <div className="mt-8">
            <p className="t-h2">{site.location}</p>
            <p className="t-label mt-3">
              <LocalTime /> IST · UTC+5:30
            </p>
          </div>
        </Cell>

        <Cell progress={scrollYProgress} from={[-160, -60]} order={6} className="col-span-2 flex flex-col justify-between bg-ink text-paper md:col-span-4">
          <p className="t-label mute">Résumé</p>
          <div className="mt-8">
            <p className="t-h3">The full story, on one page.</p>
            <a href={site.links.resume} target="_blank" rel="noreferrer" className="btn mt-5 bg-paper text-ink">
              {about.resume} <span className="nudge nudge-up">↗</span>
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </div>
        </Cell>
      </div>
    </section>
  );
}
