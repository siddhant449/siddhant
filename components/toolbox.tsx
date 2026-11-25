"use client";

import { useEffect, useRef } from "react";
import {
  siApachekafka,
  siCelery,
  siClaude,
  siDocker,
  siDrizzle,
  siElasticsearch,
  siExpress,
  siFastapi,
  siFigma,
  siGithubactions,
  siGooglegemini,
  siGrafana,
  siLangchain,
  siMlflow,
  siMongodb,
  siNextdotjs,
  siNodedotjs,
  siPostgresql,
  siPython,
  siPytorch,
  siReact,
  siRedis,
  siScikitlearn,
  siSentry,
  siSocketdotio,
  siTailwindcss,
  siThreedotjs,
  siTurborepo,
  siTypescript,
  siVercel,
  siVite,
  siVitest,
  siWebgl,
} from "simple-icons";
import { toolbox } from "@/lib/content";
import { Fade, Opener, Rise } from "./ui/reveal";

type Icon = { path: string; hex: string; title: string };
// Named imports only, so the bundle carries just these marks.
const ICONS: Record<string, Icon> = { siApachekafka, siCelery, siClaude, siDocker, siDrizzle, siElasticsearch, siExpress, siFastapi, siFigma, siGithubactions, siGooglegemini, siGrafana, siLangchain, siMlflow, siMongodb, siNextdotjs, siNodedotjs, siPostgresql, siPython, siPytorch, siReact, siRedis, siScikitlearn, siSentry, siSocketdotio, siTailwindcss, siThreedotjs, siTurborepo, siTypescript, siVercel, siVite, siVitest, siWebgl };
const iconOf = (name: string | null) => (name ? (ICONS[name] ?? null) : null);

/** Brand colours too dark to read on white fall back to ink. */
function brand(hex: string) {
  const n = parseInt(hex, 16);
  const l = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return l < 0.12 ? "#0d0302" : `#${hex}`;
}

const BLOCK = 5;

/**
 * A cell that catches fire where the pointer enters: a ragged ember front of
 * pixels sweeps across and leaves it lit, then burns back out on leave.
 */
function Cell({ tool }: { tool: (typeof toolbox.tools)[number] }) {
  const cell = useRef<HTMLLIElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const icon = iconOf(tool.icon);

  useEffect(() => {
    const el = cell.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    const ctx = cv.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cols = 0;
    let rows = 0;
    let noise: Float32Array = new Float32Array(0);
    let p = 0;
    let target = 0;
    let origin = { x: 0, y: 0 };
    let raf = 0;
    let last = 0;

    const size = () => {
      const r = el.getBoundingClientRect();
      cols = Math.ceil(r.width / BLOCK);
      rows = Math.ceil(r.height / BLOCK);
      cv.width = cols;
      cv.height = rows;
      noise = new Float32Array(cols * rows);
      for (let i = 0; i < noise.length; i++) noise[i] = Math.random();
    };

    const draw = () => {
      const img = ctx.createImageData(cols, rows);
      const d = img.data;
      const dmax = Math.hypot(cols, rows);
      const front = p * 1.45;
      const edge = 0.16;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          const v = Math.hypot(x - origin.x, y - origin.y) / dmax + noise[i] * 0.38;
          const o = i * 4;
          if (v < front - edge) {
            d[o] = 250; d[o + 1] = 246; d[o + 2] = 243; d[o + 3] = 255;
          } else if (v < front) {
            // Ember: yellow at the inside of the front, red at the outside.
            const t = (front - v) / edge;
            d[o] = 255;
            d[o + 1] = Math.round(36 + t * 200);
            d[o + 2] = Math.round(16 + t * t * 160);
            d[o + 3] = Math.round(140 + t * 115);
          }
        }
      }
      ctx.putImageData(img, 0, 0);
      el.dataset.lit = p > 0.55 ? "on" : "";
    };

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
      last = now;
      const speed = target > p ? 2.6 : 2.1;
      p = target > p ? Math.min(target, p + dt * speed) : Math.max(target, p - dt * speed);
      draw();
      if (p !== target) raf = requestAnimationFrame(tick);
      else raf = 0;
    };
    const run = () => {
      if (reduce) {
        p = target;
        draw();
        return;
      }
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    const enter = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      origin = { x: (e.clientX - r.left) / BLOCK, y: (e.clientY - r.top) / BLOCK };
      target = 1;
      run();
    };
    const leave = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      // Burn out from the far side, so it chases the pointer away.
      origin = { x: cols - (e.clientX - r.left) / BLOCK, y: rows - (e.clientY - r.top) / BLOCK };
      target = 0;
      run();
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(el);

    // Touch screens have no hover: a cell catches as it scrolls through the middle band of the
    // screen and burns out as it leaves, so a band of embers
    // travels through the grid while you scroll.
    let band: IntersectionObserver | null = null;
    if (window.matchMedia("(hover: none)").matches) {
      band = new IntersectionObserver(
        ([e]) => {
          const r = e.boundingClientRect;
          const above = r.top + r.height / 2 < (e.rootBounds?.top ?? 0) + (e.rootBounds?.height ?? 0) / 2;
          // Lit from the edge nearest the band, and burnt out from the edge that leaves it first.
          origin = { x: cols / 2, y: above ? rows : 0 };
          target = e.isIntersecting ? 1 : 0;
          run();
        },
        { rootMargin: "-36% 0px -36% 0px" },
      );
      band.observe(el);
    } else {
      el.addEventListener("pointerenter", enter);
      el.addEventListener("pointerleave", leave);
    }
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      band?.disconnect();
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <li ref={cell} className="toolbox-cell group relative aspect-[6/5] border-b border-r border-fg/12">
      <canvas ref={canvas} aria-hidden className="pointer-events-none absolute inset-0 h-full w-full [image-rendering:pixelated]" />
      <div className="relative flex h-full flex-col justify-between p-4">
        <span className="flex flex-1 items-center justify-center">
          {icon ? (
            <svg role="img" aria-label={tool.name} viewBox="0 0 24 24" className="toolbox-mark h-[clamp(26px,2.4vw,36px)] w-auto" style={{ "--brand": brand(icon.hex) } as React.CSSProperties}>
              <path d={icon.path} fill="currentColor" />
            </svg>
          ) : (
            <span className="toolbox-mark text-[clamp(20px,1.8vw,26px)] font-semibold tracking-[-0.03em]">{tool.name}</span>
          )}
        </span>
        <span className="toolbox-text">
          <span className="block text-[14px] leading-tight">{tool.name}</span>
          <span className="t-label block text-[11px] opacity-60">{tool.layer}</span>
        </span>
      </div>
    </li>
  );
}

export function Toolbox() {
  return (
    <section id="toolbox" data-nav="toolbox" data-theme="ink" aria-labelledby="toolbox-title" className="px-gutter py-[var(--section)]">
      <Opener label={toolbox.label} />
      <div className="mt-12 grid gap-x-6 gap-y-6 md:grid-cols-12 md:items-end">
        <Rise id="toolbox-title" lines={[toolbox.title]} className="t-h1 md:col-span-6" />
        <Fade as="p" className="t-lead mute max-w-[46ch] md:col-span-5 md:col-start-8">
          {toolbox.note}
        </Fade>
      </div>
      <ul className="mt-[clamp(48px,6vw,88px)] grid grid-cols-3 border-l border-t border-fg/12 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7">
        {toolbox.tools.map((t) => (
          <Cell key={t.name} tool={t} />
        ))}
      </ul>
    </section>
  );
}
