"use client";

import { m, useScroll, useTransform, type MotionValue } from "motion/react";
import { useRef } from "react";
import { about, site } from "@/lib/content";
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
  const a = 0.05 + order * 0.07;
  const b = Math.min(1, a + 0.45);
  const x = useTransform(progress, [a, b], [from[0], 0]);
  const y = useTransform(progress, [a, b], [from[1], 0]);
  const scale = useTransform(progress, [a, b], [0.16, 1]);
  const opacity = useTransform(progress, [a, a + 0.12], [0, 1]);
  const radius = useTransform(progress, [a, b], [2, 16]);
  return (
    <m.div
      // Same markup on server and client; reduced motion is handled in CSS so hydration matches.
      style={{ x, y, scale, opacity, borderRadius: radius }}
      className={`relative overflow-hidden rounded-2xl p-[clamp(16px,1.8vw,28px)] motion-reduce:!translate-none motion-reduce:!transform-none motion-reduce:!rounded-2xl motion-reduce:!opacity-100 ${className}`}
    >
      {children}
    </m.div>
  );
}

export function About() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "start 0.25"] });

  return (
    <section id="about" data-nav="about" data-theme="ink" aria-labelledby="about-title" className="px-gutter py-[var(--section)]">
      <Opener label={about.label} meta={site.location} />
      <h2 id="about-title" className="sr-only">
        {about.title}
      </h2>

      {/* Tablets (md) use a 6-column bento so the experience list gets a full row; lg is the 12-column desktop. */}
      <div ref={ref} className="mt-12 grid auto-rows-[minmax(132px,auto)] grid-cols-2 gap-2 md:grid-cols-6 md:gap-3 lg:grid-cols-12">
        <Cell progress={scrollYProgress} from={[-120, 60]} order={0} className="col-span-2 row-span-2 flex flex-col justify-between bg-ink-3 text-paper ring-1 ring-paper/8 md:col-span-6 md:row-span-1 lg:row-span-2">
          <p className="t-label mute">Designer &amp; fullstack AI engineer</p>
          <p className="mt-10 text-[clamp(3.4rem,8vw,8.6rem)] font-light leading-[0.9] tracking-[-0.05em]">
            Siddhant
            <span className="t-it block">Kotak</span>
          </p>
        </Cell>

        <Cell progress={scrollYProgress} from={[140, -40]} order={1} className="col-span-2 bg-ink-2 ring-1 ring-paper/10 md:col-span-6">
          <div className="space-y-4 t-lead">
            {about.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </Cell>

        <Cell progress={scrollYProgress} from={[60, 120]} order={2} className="bg-ink-3 text-paper ring-1 ring-paper/8 md:col-span-3">
          <p className="t-label mute">Design</p>
          <p className="mt-6 text-[clamp(3rem,5vw,5.5rem)] font-light leading-none tracking-[-0.05em]">Five</p>
          <p className="t-small mute mt-1">live websites</p>
        </Cell>

        <Cell progress={scrollYProgress} from={[180, 80]} order={3} className="bg-ink-2 ring-1 ring-paper/10 md:col-span-3">
          <p className="t-label mute">Engineering</p>
          <p className="mt-6 text-[clamp(3rem,5vw,5.5rem)] font-light leading-none tracking-[-0.05em]">Four</p>
          <p className="t-small mute mt-1">production systems</p>
        </Cell>

        <Cell progress={scrollYProgress} from={[-80, 140]} order={4} className="col-span-2 flex flex-col justify-between bg-ink-2 ring-1 ring-paper/10 md:col-span-6 lg:col-span-4 lg:row-span-2">
          <p className="t-label mute">Experience</p>
          <ol className="mt-6">
            {about.experience.map((e) => (
              <li key={e.org} className="grid grid-cols-[64px_1fr] gap-x-4 border-t border-paper/10 py-3">
                <span className="t-label mute pt-1 tabular-nums">{e.when}</span>
                <span>
                  <span className="block text-[15px] font-medium leading-snug">{e.org}</span>
                  <span className="t-small mute block">{e.role}</span>
                </span>
              </li>
            ))}
          </ol>
        </Cell>

        <Cell progress={scrollYProgress} from={[100, -100]} order={5} className="col-span-2 flex flex-col justify-between bg-signal text-ink md:col-span-3 lg:col-span-4">
          <p className="t-label">Based in</p>
          <div className="mt-8">
            <p className="t-h2">{site.location}</p>
          </div>
        </Cell>

        <Cell progress={scrollYProgress} from={[-160, -60]} order={6} className="col-span-2 flex flex-col justify-between bg-ink-3 text-paper ring-1 ring-paper/8 md:col-span-3 lg:col-span-4">
          <p className="t-label mute">Résumé</p>
          <div className="mt-8">
            <p className="t-h3">The full story, on one page.</p>
            <a href={site.links.resume} target="_blank" rel="noreferrer" className="btn mt-5 bg-paper text-ink">
              {about.resume}
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </div>
        </Cell>
      </div>
    </section>
  );
}
