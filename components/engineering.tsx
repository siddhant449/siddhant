"use client";

import { m, useScroll, useTransform, type MotionValue } from "motion/react";
import Link from "next/link";
import { useRef } from "react";
import { engineering, type SystemProject } from "@/lib/content";
import { Diagram } from "./diagram";
import { Fade, Opener, Rise } from "./ui/reveal";

/* Folder tabs: the first carries the accent, the personal project is lighter. */
const tabTone = (p: SystemProject, i: number) =>
  !p.nda ? "bg-stone text-ink" : i === 0 ? "bg-signal text-paper" : "bg-ink text-paper";

/**
 * One system as a spec sheet in a folder: domain, problem, role and stack on
 * the left, the architecture and its numbers on the right. Sheets pin one
 * after another and each sinks back a little as the next slides over it.
 */
function Sheet({ project, index, total, progress }: { project: SystemProject; index: number; total: number; progress: MotionValue<number> }) {
  // Once the next sheet starts to slide over, this one sinks back and dims.
  const start = (index + 0.55) / total;
  const end = Math.min(1, (index + 1) / total);
  const scale = useTransform(progress, [start, end], [1, 0.95]);
  const dim = useTransform(progress, [start, end], [0, index === total - 1 ? 0 : 0.18]);

  return (
    <div
      className="mb-14 [@media(min-width:768px)_and_(min-height:820px)]:sticky [@media(min-width:768px)_and_(min-height:820px)]:mb-[52vh] [@media(min-width:768px)_and_(min-height:820px)]:top-[var(--top)]"
      style={{ "--top": `calc(96px + ${index * 16}px)` } as React.CSSProperties}
    >
      <m.article style={{ scale }} aria-labelledby={`system-${index}`} className="relative origin-top pt-[30px]">
        <p
          className={`t-label absolute top-0 flex h-[34px] items-center gap-2 rounded-t-xl px-4 ${tabTone(project, index)}`}
          style={{ left: `calc(${index} * clamp(132px, 15vw, 230px))` }}
        >
          <span className="tabular-nums">{project.index}</span>
          {project.domain}
        </p>
        <div className="grid gap-x-6 gap-y-10 rounded-2xl rounded-tl-none bg-[#fbf8f6] p-[clamp(20px,2.6vw,40px)] text-ink shadow-[0_40px_80px_-50px_rgb(15_11_10/0.55)] ring-1 ring-ink/12 md:grid-cols-12">
          <div className="flex flex-col gap-5 md:col-span-4">
            <h3 id={`system-${index}`} className="t-h2">
              {project.title}
            </h3>
            <p className="t-small mute max-w-[38ch]">{project.line}</p>
            <dl className="grid grid-cols-[88px_1fr] gap-x-4 gap-y-2.5 border-t border-ink/12 pt-5 t-small">
              <dt className="t-label mute pt-0.5">Role</dt>
              <dd>{project.role}</dd>
              <dt className="t-label mute pt-0.5">Problem</dt>
              <dd>{project.problem}</dd>
              <dt className="t-label mute pt-0.5">Stack</dt>
              <dd>{project.stack.join(", ")}</dd>
            </dl>
            <div className="mt-auto flex flex-wrap items-center gap-3 pt-2">
              {project.nda ? (
                <p className="t-label rounded-md border border-dashed border-ink/38 px-2.5 py-2">{engineering.stamp}</p>
              ) : (
                <p className="t-label mute">Personal project · details on request</p>
              )}
              {project.slug ? (
                <Link href={`/work/${project.slug}`} className="btn bg-ink text-paper">
                  Read the case study <span className="nudge">→</span>
                </Link>
              ) : null}
            </div>
          </div>
          <div className="md:col-span-8">
            <Diagram data={project.diagram} label={`${project.title}: architecture`} />
            <dl className="mt-8 grid grid-cols-3 gap-x-6 border-t border-ink/12 pt-6">
              {project.facts.map((f) => (
                <div key={f.label}>
                  <dt className="sr-only">{f.label}</dt>
                  <dd>
                    <span className="block text-[clamp(2rem,3.6vw,3.75rem)] font-light leading-none tracking-[-0.045em]">{f.value}</span>
                    <span className="t-label mute mt-3 block max-w-[24ch]">{f.label}</span>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
        <m.span aria-hidden style={{ opacity: dim }} className="pointer-events-none absolute inset-0 top-[30px] rounded-2xl rounded-tl-none bg-ink" />
      </m.article>
    </div>
  );
}

export function Engineering() {
  const stack = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: stack, offset: ["start start", "end end"] });
  return (
    <section id="engineering" data-nav="engineering" data-theme="paper" aria-labelledby="engineering-title" className="px-gutter pb-[var(--section)] pt-[var(--section)]">
      <Opener index={engineering.index} label={engineering.label} meta={engineering.meta} />
      <div className="mt-12 grid gap-x-6 gap-y-6 md:grid-cols-12 md:items-end">
        <Rise id="engineering-title" lines={[engineering.title]} className="t-h1 md:col-span-6" />
        <Fade as="p" className="t-lead mute max-w-[46ch] md:col-span-5 md:col-start-8">
          {engineering.intro}
        </Fade>
      </div>
      <div ref={stack} className="mt-[clamp(56px,7vw,104px)]">
        {engineering.projects.map((p, i) => (
          <Sheet key={p.title} project={p} index={i} total={engineering.projects.length} progress={scrollYProgress} />
        ))}
      </div>
    </section>
  );
}
