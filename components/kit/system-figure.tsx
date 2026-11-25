"use client";

import { useEffect, useRef } from "react";
import type { Diagram } from "@/lib/content";
import { bezier, prefersReducedMotion } from "@/lib/kit/motion";
import styles from "./kit.module.css";

type Node = Diagram["nodes"][number] & { x: number; y: number; w: number; h: number; cx: number; cy: number };
type Edge = Diagram["edges"][number] & { a: Node; b: Node; pts: [number, number][]; seg: number[]; len: number };
type Packet = { e: Edge; t0: number; dur: number };

const travel = bezier([0.65, 0, 0.35, 1]);
const fade = bezier([0.16, 1, 0.3, 1]);
const SPEED = 260; // px per second along an edge

/**
 * A live schematic of one system, drawn on a canvas from its content.ts diagram.
 * A request runs the main ("hot") path in signal red and lights each node on arrival;
 * side paths carry quieter traffic. Hover a node to isolate its links. Narrow screens
 * turn the grid on its side. Paused off screen and in hidden tabs; reduced motion
 * shows the still schematic.
 */
export function SystemFigure({ diagram, className, label }: { diagram: Diagram; className?: string; label?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const reduced = prefersReducedMotion();
    const css = getComputedStyle(document.documentElement);
    const col = (v: string, f: string) => css.getPropertyValue(v).trim() || f;
    const C = {
      surface: col("--ink-2", "#1b1513"),
      paper: col("--paper", "#f6efed"),
      stone: col("--stone", "#c4b7b4"),
      signal: col("--signal", "#ff3a1a"),
    };
    const sans = getComputedStyle(document.body).fontFamily;
    const mono = col("--font-geist-mono", "ui-monospace") + ", ui-monospace, monospace";
    const rgba = (hex: string, a: number) => {
      const n = parseInt(hex.replace("#", ""), 16);
      return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
    };

    let W = 0, H = 0, dpr = 1, narrow = false;
    let nodes: Node[] = [];
    let edges: Edge[] = [];
    let packets: Packet[] = [];
    const pulses: Record<string, number> = {};
    let hover: Node | null = null;
    let on = false, raf = 0, last = 0, chainAt = 0;

    const route = (a: Node, b: Node): [number, number][] => {
      const dx = b.cx - a.cx, dy = b.cy - a.cy;
      if (Math.abs(dy) < 1) {
        const s = Math.sign(dx);
        return [[a.cx + (s * a.w) / 2, a.cy], [b.cx - (s * b.w) / 2, b.cy]];
      }
      if (Math.abs(dx) < 1) {
        const s = Math.sign(dy);
        return [[a.cx, a.cy + (s * a.h) / 2], [b.cx, b.cy - (s * b.h) / 2]];
      }
      const s = Math.sign(dy);
      const my = (a.cy + (s * a.h) / 2 + b.cy - (s * b.h) / 2) / 2;
      return [[a.cx, a.cy + (s * a.h) / 2], [a.cx, my], [b.cx, my], [b.cx, b.cy - (s * b.h) / 2]];
    };

    const layout = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(window.innerWidth < 700 ? 1.5 : 2, window.devicePixelRatio || 1);
      W = r.width;
      H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      narrow = W < 620;
      const cols = Math.max(...diagram.nodes.map((n) => n.col)) + 1;
      const rows = Math.max(...diagram.nodes.map((n) => n.row)) + 1;
      const CC = narrow ? rows : cols, RR = narrow ? cols : rows;
      const pad = narrow ? 8 : 20;
      const cw = (W - pad * 2) / CC, rh = (H - pad * 2) / RR;
      const nw = Math.min(cw * (narrow ? 0.88 : 0.74), 230), nh = Math.min(rh * (narrow ? 0.62 : 0.5), 64);
      nodes = diagram.nodes.map((n) => {
        const c = narrow ? n.row : n.col, rr = narrow ? n.col : n.row;
        const cx = pad + cw * (c + 0.5), cy = pad + rh * (rr + 0.5);
        return { ...n, x: cx - nw / 2, y: cy - nh / 2, w: nw, h: nh, cx, cy };
      });
      const byId = new Map(nodes.map((n) => [n.id, n]));
      edges = diagram.edges.flatMap((e) => {
        const a = byId.get(e.from), b = byId.get(e.to);
        if (!a || !b) return [];
        const pts = route(a, b);
        const seg = pts.slice(1).map((p, i) => Math.hypot(p[0] - pts[i][0], p[1] - pts[i][1]));
        return [{ ...e, a, b, pts, seg, len: seg.reduce((s, v) => s + v, 0) }];
      });
      packets = [];
    };

    const at = (e: Edge, t: number): [number, number] => {
      let d = t * e.len;
      for (let i = 0; i < e.seg.length; i++) {
        if (d <= e.seg[i] || i === e.seg.length - 1) {
          const k = e.seg[i] ? d / e.seg[i] : 0;
          const p = e.pts[i], q = e.pts[i + 1];
          return [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];
        }
        d -= e.seg[i];
      }
      return e.pts[e.pts.length - 1];
    };
    const launch = (e: Edge, now: number) =>
      packets.push({ e, t0: now, dur: Math.min(1500, Math.max(520, (e.len / SPEED) * 1000)) });
    const startChain = (now: number) => {
      const hot = edges.filter((e) => e.hot);
      const heads = hot.filter((e) => !hot.some((f) => f.to === e.from));
      (heads.length ? heads : hot.slice(0, 1)).forEach((e) => launch(e, now));
    };
    const roundRect = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
    };

    const draw = (now: number) => {
      const dt = last ? now - last : 16;
      last = now;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      const linked = hover ? new Set(edges.filter((e) => e.a === hover || e.b === hover).flatMap((e) => [e.a, e.b])) : null;

      for (const e of edges) {
        const dim = hover && e.a !== hover && e.b !== hover;
        ctx.strokeStyle = e.hot ? rgba(C.signal, dim ? 0.18 : 0.55) : rgba(C.stone, dim ? 0.08 : 0.26);
        ctx.lineWidth = 1;
        ctx.beginPath();
        e.pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
        ctx.stroke();
        const end = e.pts[e.pts.length - 1];
        ctx.fillStyle = e.hot ? rgba(C.signal, dim ? 0.2 : 0.8) : rgba(C.stone, dim ? 0.1 : 0.4);
        ctx.beginPath();
        ctx.arc(end[0], end[1], 2, 0, Math.PI * 2);
        ctx.fill();
      }

      if (!reduced) {
        if (!packets.some((p) => p.e.hot) && now > chainAt) startChain(now);
        for (const e of edges) if (!e.hot && Math.random() < dt / 2600) launch(e, now);
        packets = packets.filter((pk) => {
          const t = (now - pk.t0) / pk.dur;
          if (t >= 1) {
            pulses[pk.e.b.id] = now;
            if (pk.e.hot) {
              const next = edges.filter((f) => f.hot && f.from === pk.e.to);
              next.forEach((f) => launch(f, now));
              if (!next.length) chainAt = now + 700;
            }
            return false;
          }
          const k = travel(t), tail = 18 / pk.e.len, c = pk.e.hot ? C.signal : C.stone;
          ctx.lineWidth = 2;
          ctx.lineCap = "round";
          for (let s = 0; s < 6; s++) {
            const p0 = at(pk.e, Math.max(0, k - tail * (1 - s / 6)));
            const p1 = at(pk.e, Math.max(0, k - tail * (1 - (s + 1) / 6)));
            ctx.strokeStyle = rgba(c, ((s + 1) / 6) * (pk.e.hot ? 1 : 0.7));
            ctx.beginPath();
            ctx.moveTo(p0[0], p0[1]);
            ctx.lineTo(p1[0], p1[1]);
            ctx.stroke();
          }
          const head = at(pk.e, k);
          ctx.fillStyle = c;
          ctx.beginPath();
          ctx.arc(head[0], head[1], pk.e.hot ? 2.4 : 1.8, 0, Math.PI * 2);
          ctx.fill();
          return true;
        });
      }

      for (const n of nodes) {
        const dim = linked && !linked.has(n);
        const pe = pulses[n.id] ? fade(Math.max(0, 1 - (now - pulses[n.id]) / 700)) : 0;
        ctx.fillStyle = C.surface;
        ctx.strokeStyle = pe > 0 ? rgba(C.signal, 0.25 + 0.75 * pe) : rgba(C.stone, dim ? 0.12 : n === hover ? 0.7 : 0.3);
        ctx.lineWidth = 1;
        roundRect(n.x + 0.5, n.y + 0.5, n.w - 1, n.h - 1, 6);
        ctx.fill();
        ctx.stroke();
        ctx.globalAlpha = dim ? 0.35 : 1;
        ctx.textBaseline = "alphabetic";
        ctx.fillStyle = C.paper;
        ctx.font = `400 ${narrow ? 12.5 : 14}px ${sans}`;
        ctx.fillText(n.label, n.x + (narrow ? 9 : 12), n.y + n.h / 2 - 2, n.w - 20);
        ctx.fillStyle = rgba(C.stone, 0.75);
        ctx.font = `500 ${narrow ? 9 : 10.5}px ${mono}`;
        ctx.fillText(n.sub.toUpperCase(), n.x + (narrow ? 9 : 12), n.y + n.h / 2 + 13, n.w - 20);
        ctx.globalAlpha = 1;
        if (pe > 0) {
          ctx.fillStyle = rgba(C.signal, pe);
          ctx.beginPath();
          ctx.arc(n.x + n.w - 11, n.y + 11, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    };

    const loop = (now: number) => {
      draw(now);
      raf = requestAnimationFrame(loop);
    };
    const run = () => {
      cancelAnimationFrame(raf);
      last = 0;
      if (reduced || !on || document.hidden) {
        draw(performance.now());
        return;
      }
      raf = requestAnimationFrame(loop);
    };

    const onMove = (ev: PointerEvent) => {
      const r = canvas.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
      hover = nodes.find((n) => x >= n.x && x <= n.x + n.w && y >= n.y && y <= n.y + n.h) ?? null;
      if (reduced) draw(performance.now());
    };
    const onLeave = () => {
      hover = null;
      if (reduced) draw(performance.now());
    };
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerleave", onLeave);
    const ro = new ResizeObserver(() => {
      layout();
      draw(performance.now());
    });
    ro.observe(canvas);
    const io = new IntersectionObserver(([e]) => {
      on = e.isIntersecting;
      run();
    });
    io.observe(canvas);
    document.addEventListener("visibilitychange", run);
    void document.fonts?.ready.then(() => draw(performance.now()));

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", run);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerleave", onLeave);
    };
  }, [diagram]);

  const text =
    label ??
    `Diagram: ${diagram.nodes.map((n) => n.label).join(", ")}. Main path: ${diagram.edges
      .filter((e) => e.hot)
      .map((e) => `${diagram.nodes.find((n) => n.id === e.from)?.label} to ${diagram.nodes.find((n) => n.id === e.to)?.label}`)
      .join(", ")}.`;

  return <canvas ref={ref} className={`${styles.system} ${className ?? ""}`} role="img" aria-label={text} />;
}
