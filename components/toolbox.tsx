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
 * A cell that catches fire where the pointer enters: a flickering violet flame front sweeps out
 * from the pointer (a hot lavender-white edge, magenta-violet behind it, cooling to deep violet),
 * throwing sparks, and leaves the tile lit with a soft glow that follows the pointer. On leave it
 * burns back out from the far side. The flame is drawn small and scaled up smoothly (a soft edge,
 * no pixels); glow and sparks are drawn at full resolution on top. The cell's canvases exist only
 * while it is lit or burning; a cold cell draws nothing.
 */
type Spark = { x: number; y: number; vx: number; vy: number; life: number; max: number; r: number };

function Cell({ tool }: { tool: (typeof toolbox.tools)[number] }) {
  const cell = useRef<HTMLLIElement>(null);
  const icon = iconOf(tool.icon);

  useEffect(() => {
    const el = cell.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cv: HTMLCanvasElement | null = null; // visible, full resolution
    let ctx: CanvasRenderingContext2D | null = null;
    let buf: HTMLCanvasElement | null = null; // the flame, one pixel per BLOCK
    let bctx: CanvasRenderingContext2D | null = null;
    let img: ImageData | null = null;
    let W = 0;
    let H = 0;
    let dpr = 1;
    let cols = 0;
    let rows = 0;
    let noise = new Float32Array(0);
    let noise2 = new Float32Array(0);
    let p = 0;
    let target = 0;
    let origin = { x: 0, y: 0 }; // in flame pixels
    const glow = { x: 0, y: 0, tx: 0, ty: 0, on: false, k: 0 }; // in CSS px
    const sparks: Spark[] = [];
    let raf = 0;
    let last = 0;
    let t = 0;
    /** The lit colour, from --tool-lit on the grid ("r g b"), so it follows the palette. */
    let lit: [number, number, number] = [42, 34, 70];

    /** Random values blurred twice and stretched back to 0..1: ragged in waves, not in pixels. */
    const softNoise = (n: number) => {
      let a = new Float32Array(n);
      for (let i = 0; i < n; i++) a[i] = Math.random();
      for (let pass = 0; pass < 2; pass++) {
        const out = new Float32Array(n);
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            let sum = 0;
            let k = 0;
            for (let dy = -2; dy <= 2; dy++) {
              for (let dx = -2; dx <= 2; dx++) {
                const xx = x + dx;
                const yy = y + dy;
                if (xx < 0 || yy < 0 || xx >= cols || yy >= rows) continue;
                sum += a[yy * cols + xx];
                k++;
              }
            }
            out[y * cols + x] = sum / k;
          }
        }
        a = out;
      }
      let lo = 1;
      let hi = 0;
      for (const v of a) {
        lo = Math.min(lo, v);
        hi = Math.max(hi, v);
      }
      for (let i = 0; i < n; i++) a[i] = (a[i] - lo) / Math.max(1e-3, hi - lo);
      return a;
    };

    /** Creates the canvases (first catch) and sizes them to the cell. */
    const wake = (r: DOMRect) => {
      if (!cv) {
        const css = getComputedStyle(el).getPropertyValue("--tool-lit").trim().split(/[\s,]+/).map(Number);
        if (css.length === 3 && css.every((n) => Number.isFinite(n))) lit = css as [number, number, number];
        cv = document.createElement("canvas");
        cv.setAttribute("aria-hidden", "true");
        cv.className = "pointer-events-none absolute inset-0 h-full w-full";
        el.prepend(cv);
        ctx = cv.getContext("2d");
        buf = document.createElement("canvas");
        bctx = buf.getContext("2d");
      }
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const c = Math.ceil(r.width / BLOCK);
      const rw = Math.ceil(r.height / BLOCK);
      if (c !== cols || rw !== rows || !img) {
        W = r.width;
        H = r.height;
        cols = c;
        rows = rw;
        cv.width = Math.round(W * dpr);
        cv.height = Math.round(H * dpr);
        buf!.width = cols;
        buf!.height = rows;
        img = bctx ? bctx.createImageData(cols, rows) : null;
        noise = softNoise(cols * rows);
        noise2 = softNoise(cols * rows);
      }
    };
    /** Burnt out: the canvases go, so a cold grid holds no canvases at all. */
    const sleep = () => {
      cv?.remove();
      cv = null;
      ctx = null;
      buf = null;
      bctx = null;
      img = null;
      cols = rows = 0;
      sparks.length = 0;
    };

    // Flame colours, from the leading edge inward.
    const EDGE: [number, number, number] = [246, 238, 255];
    const HOT: [number, number, number] = [205, 130, 255];
    const MID: [number, number, number] = [128, 92, 245];
    const DEEP: [number, number, number] = [66, 44, 140];
    const ramp = (a: number, out: number[]) => {
      // a: 0 at the leading edge -> 1 fully lit
      const [c0, c1, k] =
        a < 0.1 ? [EDGE, HOT, a / 0.1] : a < 0.32 ? [HOT, MID, (a - 0.1) / 0.22] : a < 0.66 ? [MID, DEEP, (a - 0.32) / 0.34] : [DEEP, lit, (a - 0.66) / 0.34];
      out[0] = c0[0] + (c1[0] - c0[0]) * k;
      out[1] = c0[1] + (c1[1] - c0[1]) * k;
      out[2] = c0[2] + (c1[2] - c0[2]) * k;
    };
    const rgb = [0, 0, 0];

    const draw = () => {
      el.dataset.lit = p > 0.55 ? "on" : "";
      if (p <= 0 && target === 0 && !sparks.length) return sleep();
      if (!ctx || !bctx || !img || !buf) return;
      const d = img.data;
      d.fill(0);
      const dmax = Math.hypot(cols, rows);
      const front = p * 1.85; // reaches past the far corner (distance 1 + noise + edge) at p = 1
      const edge = 0.62; // a broad flame band, not a thin line
      const moving = p !== target;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          // The front's ragged edge flickers: two soft noise fields cross-fade over time.
          const w = 0.5 + 0.5 * Math.sin(t * 3.1 + noise2[i] * 6.283);
          const n = noise[i] * (1 - w) + noise2[i] * w;
          // Centred noise, so the flame catches the instant the pointer arrives.
          const v = Math.hypot(x - origin.x, y - origin.y) / dmax + (n - 0.5) * 0.34;
          const a = (front - v) / edge;
          if (a <= 0) continue;
          ramp(Math.min(1, a), rgb);
          // The edge burns bright while the front moves and calms once the tile is lit.
          const heat = moving ? 1 : 0.35;
          const k = a < 0.35 ? heat : 1;
          const o = i * 4;
          d[o] = lit[0] + (rgb[0] - lit[0]) * k;
          d[o + 1] = lit[1] + (rgb[1] - lit[1]) * k;
          d[o + 2] = lit[2] + (rgb[2] - lit[2]) * k;
          d[o + 3] = 255 * Math.min(1, a * 6);
        }
      }
      bctx.putImageData(img, 0, 0);

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(buf, 0, 0, cols * BLOCK, rows * BLOCK);

      ctx.globalCompositeOperation = "lighter";
      // A soft light that follows the pointer across a lit tile.
      if (glow.k > 0.01 && p > 0.3) {
        const R = Math.max(W, H) * 0.75;
        const g = ctx.createRadialGradient(glow.x, glow.y, 0, glow.x, glow.y, R);
        g.addColorStop(0, `rgba(157,124,255,${(0.28 * glow.k * p).toFixed(3)})`);
        g.addColorStop(0.5, `rgba(120,90,230,${(0.08 * glow.k * p).toFixed(3)})`);
        g.addColorStop(1, "rgba(120,90,230,0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
      }
      // Sparks.
      for (const sp of sparks) {
        const life = 1 - sp.life / sp.max;
        const a = Math.max(0, life) * 0.9;
        const g = ctx.createRadialGradient(sp.x, sp.y, 0, sp.x, sp.y, sp.r * 3);
        g.addColorStop(0, `rgba(246,238,255,${a.toFixed(3)})`);
        g.addColorStop(0.35, `rgba(190,150,255,${(a * 0.6).toFixed(3)})`);
        g.addColorStop(1, "rgba(157,124,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(sp.x - sp.r * 3, sp.y - sp.r * 3, sp.r * 6, sp.r * 6);
      }
      ctx.globalCompositeOperation = "source-over";
    };

    const tick = (now: number) => {
      // (a frame's timestamp can precede the performance.now() taken when it was requested)
      const dt = Math.min(0.05, Math.max(0, (now - last) / 1000) || 0.016);
      last = now;
      t += dt;
      const was = p;
      // Eases out in both directions: it glides toward the target and settles softly, and a
      // change of direction mid-burn just turns around, with no jump.
      p += (target - p) * (1 - Math.exp(-dt * (target > p ? 2.6 : 2.4)));
      if (Math.abs(target - p) < 0.003) p = target;
      // Sparks fly off the moving front.
      if (p !== was && sparks.length < 26) {
        const dmax = Math.hypot(W, H);
        const n = Math.random() < dt * 34 ? 1 : 0;
        for (let i = 0; i < n; i++) {
          const ang = Math.random() * Math.PI * 2;
          const rad = p * 1.85 * dmax * 0.5 * (0.55 + Math.random() * 0.3);
          const x = origin.x * BLOCK + Math.cos(ang) * rad;
          const y = origin.y * BLOCK + Math.sin(ang) * rad;
          if (x < 0 || y < 0 || x > W || y > H) continue;
          sparks.push({ x, y, vx: (Math.random() - 0.5) * 18, vy: -18 - Math.random() * 30, life: 0, max: 0.6 + Math.random() * 0.7, r: 1 + Math.random() * 1.2 });
        }
      }
      for (let i = sparks.length - 1; i >= 0; i--) {
        const sp = sparks[i];
        sp.life += dt;
        if (sp.life >= sp.max) {
          sparks.splice(i, 1);
          continue;
        }
        sp.x += sp.vx * dt;
        sp.y += sp.vy * dt;
        sp.vy -= 10 * dt;
      }
      glow.k += ((glow.on ? 1 : 0) - glow.k) * Math.min(1, dt * 5);
      glow.x += (glow.tx - glow.x) * Math.min(1, dt * 9);
      glow.y += (glow.ty - glow.y) * Math.min(1, dt * 9);
      draw();
      const busy = p !== target || sparks.length > 0 || glow.k > 0.01 || (glow.on && p > 0);
      raf = busy && cv ? requestAnimationFrame(tick) : 0;
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
      glow.x = glow.tx = e.clientX - r.left;
      glow.y = glow.ty = e.clientY - r.top;
      glow.on = true;
      target = 1;
      run(r);
    };
    const move = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      glow.tx = e.clientX - r.left;
      glow.ty = e.clientY - r.top;
      if (!raf && cv && !reduce) {
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }
    };
    const leave = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      // Burn out from the far side, so it chases the pointer away.
      origin = { x: Math.ceil(r.width / BLOCK) - (e.clientX - r.left) / BLOCK, y: Math.ceil(r.height / BLOCK) - (e.clientY - r.top) / BLOCK };
      glow.on = false;
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
      el.addEventListener("pointermove", move, { passive: true });
      el.addEventListener("pointerleave", leave);
    }
    return () => {
      cancelAnimationFrame(raf);
      unwatch();
      sleep();
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointermove", move);
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
