"use client";

import { useEffect, useRef } from "react";
import { motion, useTransform, type MotionValue } from "motion/react";
import { watchKeyLight, type Key } from "@/lib/keylight";
import { scrollTop } from "@/lib/scroll";
import styles from "./Cine.module.css";

/** The veil is drawn at this fraction of its size and scaled up: it is all soft gradient. */
const DOWN = 6;

/**
 * The key light's shadow, for one viewport-sized stage. Place it inside a position:relative
 * 100svh stage, above the imagery and below any text that must be read (give that text a
 * higher z-index). A small canvas, redrawn as the light moves: a full-screen CSS mask in its
 * place re-rasterised the whole viewport every frame.
 */
export function KeyVeil({ className }: { className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let w = 1;
    let h = 1;
    let last: Readonly<Key> | null = null;
    const draw = (k: Readonly<Key>) => {
      last = k;
      ctx.clearRect(0, 0, w, h);
      if (k.d < 0.002) return;
      const cx = k.x * w;
      const cy = k.y * h;
      const r = Math.max(((k.r / 100) * Math.max(window.innerWidth, window.innerHeight)) / DOWN, 0.5);
      // Inverse-square falloff stops, measured from the light's centre outward, in the page's black.
      const veil = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      [[0, 0], [0.15, 0.5], [0.3, 0.8], [0.45, 0.9], [0.6, 0.94], [1, 1]].forEach(([at, a]) => veil.addColorStop(at, `rgba(18, 17, 16, ${a})`));
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = k.d;
      ctx.fillStyle = veil;
      ctx.fillRect(0, 0, w, h);
      // Warm light, cool shadow: the veil's edge picks up the ember of the pillar.
      const warm = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 0.5);
      warm.addColorStop(0, `rgba(214, 160, 106, ${k.w * 0.14})`);
      warm.addColorStop(0.7, "rgba(214, 160, 106, 0)");
      ctx.globalCompositeOperation = "source-atop";
      ctx.globalAlpha = 1;
      ctx.fillStyle = warm;
      ctx.fillRect(0, 0, w, h);
    };
    const fit = () => {
      const box = canvas.getBoundingClientRect();
      w = canvas.width = Math.max(1, Math.ceil(box.width / DOWN));
      h = canvas.height = Math.max(1, Math.ceil(box.height / DOWN));
      if (last) draw(last);
    };
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);
    fit();
    const stop = watchKeyLight(draw);
    return () => {
      stop();
      ro.disconnect();
    };
  }, []);
  return <canvas ref={ref} className={`${styles.veil} ${className ?? ""}`} aria-hidden />;
}

/**
 * Letterbox bars closing to 2.39:1 (about 12.8% of a 16:9 frame each side).
 * `amount` 0 = open full frame, 1 = full letterbox. Parent must be position:relative.
 */
export function Letterbox({ amount }: { amount: MotionValue<number> }) {
  const scale = useTransform(amount, [0, 1], [0, 1]);
  return (
    <>
      <motion.div className={`${styles.bar} ${styles.barTop}`} style={{ scaleY: scale }} aria-hidden />
      <motion.div className={`${styles.bar} ${styles.barBottom}`} style={{ scaleY: scale }} aria-hidden />
    </>
  );
}

/**
 * Burned-in timecode that runs with scroll position (24 frames per second, 12px per frame). Every
 * slate on screen shares one scroll listener and one write per frame; slates off screen, and a page
 * at rest, cost nothing.
 */
const timecodes = new Set<HTMLSpanElement>();
let shownFrame = -1;
let queued = false;
let watcher: IntersectionObserver | null = null;
const pad = (n: number) => String(n).padStart(2, "0");

function paintTimecodes() {
  queued = false;
  const frame = Math.floor(scrollTop() / 12);
  if (frame === shownFrame) return;
  shownFrame = frame;
  const f = frame % 24;
  const s = Math.floor(frame / 24);
  const text = `${pad(Math.floor(s / 3600))}:${pad(Math.floor(s / 60) % 60)}:${pad(s % 60)}:${pad(f)}`;
  timecodes.forEach((el) => {
    el.textContent = text;
  });
}

function queueTimecodes() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(paintTimecodes);
}

function useTimecode(ref: React.RefObject<HTMLSpanElement | null>) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!watcher) {
      window.addEventListener("scroll", queueTimecodes, { passive: true });
      watcher = new IntersectionObserver((entries) => {
        for (const e of entries) {
          const span = e.target as HTMLSpanElement;
          if (e.isIntersecting) timecodes.add(span);
          else timecodes.delete(span);
        }
        // A slate coming on screen shows the current time straight away.
        shownFrame = -1;
        queueTimecodes();
      });
    }
    watcher.observe(el);
    return () => {
      watcher?.unobserve(el);
      timecodes.delete(el);
    };
  }, [ref]);
}

export function Slate({ scene, take = "TK.01", label, className }: { scene: string; take?: string; label: string; className?: string }) {
  const tc = useRef<HTMLSpanElement>(null);
  useTimecode(tc);
  return (
    <div className={`${styles.slate} ${className ?? ""}`} aria-hidden>
      <span>{scene}</span>
      <span>{take}</span>
      <span>{label}</span>
      <span ref={tc} className={styles.tc}>
        00:00:00:00
      </span>
    </div>
  );
}
