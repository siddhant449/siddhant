"use client";

import { useEffect, useRef, useState } from "react";

type Screen = { src: string; name: string };

/* Sprite grid: 26 × 50 sprite pixels, 2 sub-pixels each so the screen dither stays legible. */
const GW = 52;
const GH = 100;
const SX = 6;
const SY = 12;
const SW = GW - 12;
const SH = GH - 24;
const PAL: [number, number, number][] = [
  [15, 11, 10],
  [110, 13, 5],
  [255, 58, 26],
  [196, 183, 180],
  [246, 239, 237],
];
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** Ordered 4×4 dither of a real screen into the Ember palette (ink, deep, signal, stone, paper). */
function dither(img: HTMLImageElement) {
  const c = document.createElement("canvas");
  c.width = SW;
  c.height = SH;
  const x = c.getContext("2d")!;
  x.drawImage(img, 0, 0, img.width, (img.width * SH) / SW, 0, 0, SW, SH);
  const d = x.getImageData(0, 0, SW, SH);
  const a = d.data;
  for (let y = 0; y < SH; y++)
    for (let X = 0; X < SW; X++) {
      const k = (y * SW + X) * 4;
      const L = (a[k] * 0.3 + a[k + 1] * 0.59 + a[k + 2] * 0.11) / 255;
      const sat = (Math.max(a[k], a[k + 1], a[k + 2]) - Math.min(a[k], a[k + 1], a[k + 2])) / 255;
      const t = (BAYER[(y & 3) * 4 + (X & 3)] + 0.5) / 16;
      let idx = Math.max(0, Math.min(4, Math.round(L * 4 + (t - 0.5) * 1.1)));
      if (idx === 3 && sat > 0.35) idx = 2;
      const p = PAL[idx];
      a[k] = p[0];
      a[k + 1] = p[1];
      a[k + 2] = p[2];
      a[k + 3] = 255;
    }
  return d;
}

function frameArt(g: CanvasRenderingContext2D) {
  g.clearRect(0, 0, GW, GH);
  const P = (x: number, y: number, w: number, h: number, c: string) => {
    g.fillStyle = c;
    g.fillRect(x, y, w, h);
  };
  // ink outline, paper rim, ink-2 body, stepped corners like the reference sprite
  P(4, 0, GW - 8, GH, "#0f0b0a");
  P(2, 2, GW - 4, GH - 4, "#0f0b0a");
  P(0, 4, GW, GH - 8, "#0f0b0a");
  P(4, 2, GW - 8, GH - 4, "#f6efed");
  P(2, 4, GW - 4, GH - 8, "#f6efed");
  P(4, 4, GW - 8, GH - 8, "#1b1513");
  P(GW / 2 - 6, 7, 12, 2, "#3a2f2c");
  P(GW / 2 - 4, GH - 9, 8, 3, "#3a2f2c");
}

/**
 * A pixel-drawn phone that sits in the sprite slot and cycles through Siddhant's real mobile screens,
 * each dithered to the palette and revealed with a top-down pixel wipe. Pauses offscreen.
 */
export function PixelPhone({ screens, label, capClass, run }: { screens: Screen[]; label: string; capClass?: string; run: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [cur, setCur] = useState(0);
  const runRef = useRef(run);
  const kickRef = useRef<() => void>(() => {});
  useEffect(() => {
    runRef.current = run;
    kickRef.current();
  }, [run]);

  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const g = cv.getContext("2d");
    if (!g) return;
    const data: (ImageData | undefined)[] = [];
    let alive = true;
    let idx = 0;
    let wipe = 1;
    let t = 0;
    let raf = 0;
    let last = 0;
    let visible = true;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const draw = () => {
      frameArt(g);
      const a = data[idx];
      if (!a) return;
      const prev = data[(idx + screens.length - 1) % screens.length];
      if (wipe < 1 && prev) g.putImageData(prev, SX, SY);
      const rows = Math.round(SH * Math.min(1, wipe));
      g.putImageData(a, SX, SY, 0, 0, SW, rows);
      if (rows < SH) {
        g.fillStyle = "#ff3a1a";
        g.fillRect(SX, SY + rows, SW, 2);
      }
    };
    frameArt(g);
    screens.forEach((s, i) => {
      const img = new Image();
      img.onload = () => {
        if (!alive) return;
        data[i] = dither(img);
        if (i === idx) draw();
      };
      img.src = s.src;
    });

    const tick = (now: number) => {
      raf = 0;
      const dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      t += dt;
      if (wipe < 1) {
        wipe = Math.min(1, wipe + dt / 0.5);
        draw();
      }
      if (t > 2.6) {
        t = 0;
        for (let k = 1; k <= screens.length; k++) {
          const j = (idx + k) % screens.length;
          if (data[j]) {
            idx = j;
            break;
          }
        }
        wipe = 0;
        setCur(idx);
      }
      if (visible && !document.hidden) raf = requestAnimationFrame(tick);
    };
    const kick = () => {
      if (!raf && visible && !document.hidden && runRef.current && !reduce) {
        last = 0;
        raf = requestAnimationFrame(tick);
      }
    };
    kickRef.current = kick;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      kick();
    });
    io.observe(cv);
    document.addEventListener("visibilitychange", kick);
    kick();
    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      io.disconnect();
      document.removeEventListener("visibilitychange", kick);
    };
  }, [screens]);

  return (
    <>
      <canvas ref={ref} width={GW} height={GH} role="img" aria-label={label} />
      <span className={capClass} aria-live="off">
        {screens[cur]?.name}
      </span>
    </>
  );
}
