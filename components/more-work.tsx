"use client";

import { m, useMotionValue, useSpring } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { caseStudyOf, design, engineering } from "@/lib/content";
import { EASE_OUT, Opener } from "./ui/reveal";

type Row = {
  key: string;
  name: string;
  sector: string;
  kind: string;
  href: string;
  external: boolean;
  image?: string;
  fact?: { value: string; label: string };
};

const rows: Row[] = [
  ...design.projects.map((p) => {
    const study = caseStudyOf(p.slug);
    return { key: p.slug, name: p.name, sector: p.sector, kind: "Design", href: study ? `/work/${p.slug}` : p.url, external: !study, image: p.images.hero };
  }),
  ...engineering.projects.map((p) => ({
    key: p.slug ?? p.title,
    name: p.title,
    sector: p.domain,
    kind: "Engineering",
    href: p.slug ? `/work/${p.slug}` : "/#engineering",
    external: false,
    fact: p.facts[0],
  })),
];

const BOX_W = 340;
const BOX_H = 212;

/**
 * Every project as one table. Hovering a row brings up a small window that
 * trails the pointer; inside it, a strip of all the previews slides to the
 * row you are on. On touch it is a plain list.
 */
export function MoreWork({ current }: { current: string }) {
  const list = rows.filter((r) => r.key !== current);
  const [active, setActive] = useState<number | null>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 260, damping: 32, mass: 0.6 });
  const sy = useSpring(y, { stiffness: 260, damping: 32, mass: 0.6 });

  return (
    <section data-theme="ink" aria-labelledby="more-title" className="px-gutter py-[var(--section)]">
      <Opener index="→" label="More work" meta={`${list.length} projects`} />
      <h2 id="more-title" className="sr-only">
        More work
      </h2>
      <ul
        className="mt-10"
        onPointerMove={(e) => {
          if (e.pointerType !== "mouse") return;
          x.set(e.clientX + 24);
          y.set(e.clientY - BOX_H / 2);
        }}
        onPointerLeave={() => setActive(null)}
      >
        {list.map((r, i) => {
          const inner = (
            <>
              <span className="t-label mute tabular-nums">{String(i + 1).padStart(2, "0")}</span>
              <span className="t-h3 transition-transform duration-500 ease-out-expo group-hover:translate-x-2">{r.name}</span>
              <span className="t-small mute hidden md:block">{r.sector}</span>
              <span className="t-label mute hidden md:block">{r.kind}</span>
              <span className="nudge justify-self-end">{r.external ? "↗" : "→"}</span>
            </>
          );
          const cls = `group grid grid-cols-[40px_1fr_auto] items-baseline gap-x-6 border-t border-fg/12 py-5 transition-opacity duration-300 md:grid-cols-[56px_1.4fr_1fr_140px_32px] ${
            active !== null && active !== i ? "opacity-45" : ""
          }`;
          return (
            <li key={r.key} onPointerEnter={() => setActive(i)}>
              {r.external ? (
                <a href={r.href} target="_blank" rel="noreferrer" className={cls}>
                  {inner}
                </a>
              ) : (
                <Link href={r.href} className={cls}>
                  {inner}
                </Link>
              )}
            </li>
          );
        })}
      </ul>

      {/* The trailing window: a strip of previews, slid to the active row. */}
      <m.div
        aria-hidden
        style={{ x: sx, y: sy, width: BOX_W, height: BOX_H }}
        initial={false}
        animate={{ scale: active === null ? 0 : 1, opacity: active === null ? 0 : 1 }}
        transition={{ duration: 0.42, ease: EASE_OUT }}
        className="pointer-events-none fixed left-0 top-0 z-40 hidden overflow-hidden rounded-2xl bg-ink-2 shadow-[0_30px_60px_-20px_rgb(0_0_0/0.6)] ring-1 ring-paper/12 md:block"
      >
        <m.div animate={{ y: -(active ?? 0) * BOX_H }} transition={{ duration: 0.55, ease: EASE_OUT }}>
          {list.map((r) => (
            <div key={r.key} className="relative" style={{ height: BOX_H }}>
              {r.image ? (
                <Image src={r.image} alt="" fill sizes={`${BOX_W}px`} className="object-cover object-top" />
              ) : (
                <div className="flex h-full flex-col justify-between p-5 text-paper">
                  <p className="t-label mute">
                    {r.sector} · {r.kind}
                  </p>
                  <div>
                    <p className="text-[56px] font-light leading-none tracking-[-0.05em]">{r.fact?.value}</p>
                    <p className="t-label mute mt-2">{r.fact?.label}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </m.div>
      </m.div>
    </section>
  );
}
