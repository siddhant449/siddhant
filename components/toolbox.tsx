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

/** Brand colours too dark to read on the dark lit cell fall back to the text colour. */
function brand(hex: string) {
  const n = parseInt(hex, 16);
  const l = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return l < 0.22 ? "var(--fg)" : `#${hex}`;
}

const BLOCK = 4;

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};


/**
 * Touch screens have no hover: a cell catches as it scrolls through the middle band of the
 * screen and burns out as it leaves, so a band of embers travels through the grid while you
 * scroll. One observer serves every cell.
 */
type BandCb = (e: IntersectionObserverEntry) => void;
let band: IntersectionObserver | null = null;
const bandCbs = new Map<Element, BandCb>();
function watchBand(el: Element, cb: BandCb) {
  band ??= new IntersectionObserver((es) => es.forEach((e) => bandCbs.get(e.target)?.(e)), { rootMargin: "-36% 0px -36% 0px" });
  bandCbs.set(el, cb);
  band.observe(el);
  return () => {
    band?.unobserve(el);
    bandCbs.delete(el);
  };
}

/**
 * A cell that catches fire where the pointer enters: a ragged ember front of
 * pixels sweeps across and leaves it lit, then burns back out on leave.
 * The cell's canvas exists only while it is lit or burning; a cold cell draws nothing.
 */
function Cell({ tool }: { tool: (typeof toolbox.tools)[number] }) {
  const cell = useRef<HTMLLIElement>(null);
  const icon = iconOf(tool.icon);

  useEffect(() => {
    const el = cell.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cv: HTMLCanvasElement | null = null;
    let ctx: CanvasRenderingContext2D | null = null;
    let img: ImageData | null = null;
    let cols = 0;
    let rows = 0;
    let noise: Float32Array = new Float32Array(0);
    let p = 0;
    let target = 0;
    let origin = { x: 0, y: 0 };
    let raf = 0;
    let last = 0;
    /** The lit colour, from --tool-lit on the grid ("r g b"), so it follows the palette. */
    let lit: [number, number, number] = [34, 29, 48];

    /** Creates the canvas (first catch) and sizes it to the cell. */
    const wake = (r: DOMRect) => {
      if (!cv) {
        const css = getComputedStyle(el).getPropertyValue("--tool-lit").trim().split(/[\s,]+/).map(Number);
        if (css.length === 3 && css.every((n) => Number.isFinite(n))) lit = css as [number, number, number];
        cv = document.createElement("canvas");
        cv.setAttribute("aria-hidden", "true");
        // Drawn small and scaled up smoothly: the browser's filtering softens the front into a glow.
        cv.className = "pointer-events-none absolute inset-0 h-full w-full";
        el.prepend(cv);
        ctx = cv.getContext("2d");
      }
      const c = Math.ceil(r.width / BLOCK);
      const rw = Math.ceil(r.height / BLOCK);
      if (c !== cols || rw !== rows || !img) {
        cols = c;
        rows = rw;
        cv.width = cols;
        cv.height = rows;
        img = ctx ? ctx.createImageData(cols, rows) : null;
        // Soft noise: random values blurred twice, so the front is ragged in waves, not in pixels.
        const raw = new Float32Array(cols * rows);
        for (let i = 0; i < raw.length; i++) raw[i] = Math.random();
        noise = raw;
        for (let pass = 0; pass < 2; pass++) {
          const out = new Float32Array(cols * rows);
          for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
              let sum = 0;
              let n = 0;
              for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -2; dx <= 2; dx++) {
                  const xx = x + dx;
                  const yy = y + dy;
                  if (xx < 0 || yy < 0 || xx >= cols || yy >= rows) continue;
                  sum += noise[yy * cols + xx];
                  n++;
                }
              }
              out[y * cols + x] = sum / n;
            }
          }
          noise = out;
        }
        // Stretch back to 0..1 after the blur flattened it.
        let lo = 1;
        let hi = 0;
        for (const v of noise) {
          lo = Math.min(lo, v);
          hi = Math.max(hi, v);
        }
        for (let i = 0; i < noise.length; i++) noise[i] = (noise[i] - lo) / Math.max(1e-3, hi - lo);
      }
    };
    /** Burnt out: the canvas goes, so a cold grid holds no canvases at all. */
    const sleep = () => {
      cv?.remove();
      cv = null;
      ctx = null;
      img = null;
      cols = rows = 0;
    };

    const draw = () => {
      el.dataset.lit = p > 0.55 ? "on" : "";
      if (p <= 0 && target === 0) return sleep();
      if (!ctx || !img) return;
      const d = img.data;
      d.fill(0);
      const dmax = Math.hypot(cols, rows);
      const front = p * 1.62; // reaches past the far corner (distance 1 + noise + edge) at p = 1
      const edge = 0.34;
      const [lr, lg, lb] = lit;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          const v = Math.hypot(x - origin.x, y - origin.y) / dmax + noise[i] * 0.32;
          const a = (front - v) / edge; // 0 at the leading edge, 1 where the cell is fully lit
          if (a <= 0) continue;
          const o = i * 4;
          // A soft violet glow at the edge (never full strength), lavender behind it, settling
          // into the lit colour: a slightly lifted violet dark, so nothing flashes bright.
          const hot = smooth(0, 0.6, a);
          const cool = smooth(0.35, 1, a);
          const er = 140 + hot * 46;
          const eg = 104 + hot * 58;
          const eb = 236 + hot * 19;
          const ea = 0.42 * smooth(0, 0.4, a);
          d[o] = Math.round(er + (lr - er) * cool);
          d[o + 1] = Math.round(eg + (lg - eg) * cool);
          d[o + 2] = Math.round(eb + (lb - eb) * cool);
          d[o + 3] = Math.round(255 * (ea + (1 - ea) * cool));
        }
      }
      ctx.putImageData(img, 0, 0);
    };

    const tick = (now: number) => {
      // (a frame's timestamp can precede the performance.now() taken when it was requested)
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000) || 0.016);
      last = now;
      // Eases out in both directions: it glides toward the target and settles softly, and a
      // change of direction mid-burn just turns around, with no jump.
      p += (target - p) * (1 - Math.exp(-dt * (target > p ? 2.2 : 2.6)));
      if (Math.abs(target - p) < 0.003) p = target;
      draw();
      if (p !== target) raf = requestAnimationFrame(tick);
      else raf = 0;
    };
    const run = (r: DOMRect) => {
      if (target > 0 || cv) wake(r);
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
      run(r);
    };
    const leave = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      // Burn out from the far side, so it chases the pointer away.
      origin = { x: Math.ceil(r.width / BLOCK) - (e.clientX - r.left) / BLOCK, y: Math.ceil(r.height / BLOCK) - (e.clientY - r.top) / BLOCK };
      target = 0;
      run(r);
    };

    let unwatch = () => {};
    if (window.matchMedia("(hover: none)").matches) {
      unwatch = watchBand(el, (e) => {
        const r = e.boundingClientRect;
        const above = r.top + r.height / 2 < (e.rootBounds?.top ?? 0) + (e.rootBounds?.height ?? 0) / 2;
        // Lit from the edge nearest the band, and burnt out from the edge that leaves it first.
        origin = { x: Math.ceil(r.width / BLOCK) / 2, y: above ? Math.ceil(r.height / BLOCK) : 0 };
        target = e.isIntersecting ? 1 : 0;
        if (target || p) run(r);
      });
    } else {
      el.addEventListener("pointerenter", enter);
      el.addEventListener("pointerleave", leave);
    }
    return () => {
      cancelAnimationFrame(raf);
      unwatch();
      sleep();
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointerleave", leave);
    };
  }, []);

  return (
    <li ref={cell} className="toolbox-cell group relative aspect-[6/5] border-b border-r border-fg/12">
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
