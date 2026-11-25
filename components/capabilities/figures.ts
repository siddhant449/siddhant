/**
 * Live figures for the capability rows: one canvas drawing per service, each showing
 * the thing itself (a page assembling in a browser, a balancer spreading traffic,
 * a topic fanning out with a dead-letter lane, embeddings clustering around a query,
 * a pipeline rolling a deploy across two regions, tenants isolated row by row).
 * Drawn in ink and signal on the paper of an open row. Every label is generic.
 */
import type { CapabilityFigure } from "@/lib/copy/capabilities";
import { stackedPages } from "@/lib/kit/credits";

type Pal = { fg: string; sig: string; bg: string };
type Fonts = { sans: string; mono: string };
type State = Record<string, unknown>;
type Draw = (g: CanvasRenderingContext2D, w: number, h: number, t: number, S: State, P: Pal, F: Fonts) => void;

const TAU = Math.PI * 2;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const easeOut = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);
const inout = (t: number) => {
  t = clamp(t, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
const rgba = (hex: string, a: number) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`;
};
/** Deterministic random, so every visit draws the same figure. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
}
/** Figures are designed for a ~460×300 box; labels never drop below ~8px. */
const scaleOf = (w: number, h: number) => clamp(Math.min(w / 460, h / 300), 0.82, 1.25);

function label(g: CanvasRenderingContext2D, F: Fonts, txt: string, x: number, y: number, col: string, size: number, align: CanvasTextAlign = "left") {
  g.font = `500 ${size}px ${F.mono}`;
  g.fillStyle = col;
  g.textAlign = align;
  g.textBaseline = "middle";
  g.fillText(txt.toUpperCase(), x, y);
}
function rr(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

/* Web development: a browser frame; the layout assembles block by block, then his real
   page (Truvolt, Skinrock) settles in and scrolls. */
const PAGES = [stackedPages.truvolt, stackedPages.skinrock];
const web: Draw = (g, w, h, t, S, P, F) => {
  const sc = scaleOf(w, h);
  if (!S.imgs) {
    S.imgs = PAGES.map((p) => {
      const im = new Image();
      im.decoding = "async";
      im.onload = () => (S.onload as (() => void) | undefined)?.();
      im.src = p.src;
      return im;
    });
  }
  const imgs = S.imgs as HTMLImageElement[];
  const CYC = 9000;
  const n = Math.floor(t / CYC);
  const c = (t % CYC) / CYC;
  const x0 = w * 0.05, y0 = h * 0.08, bw = w * 0.9, bh = h * 0.84, bar = 22 * sc;
  // frame
  rr(g, x0, y0, bw, bh, 8 * sc);
  g.fillStyle = rgba(P.bg, 1);
  g.fill();
  g.strokeStyle = rgba(P.fg, 0.55);
  g.lineWidth = 1;
  g.stroke();
  g.beginPath();
  g.moveTo(x0, y0 + bar);
  g.lineTo(x0 + bw, y0 + bar);
  g.stroke();
  for (let i = 0; i < 3; i++) {
    g.beginPath();
    g.arc(x0 + 12 * sc + i * 10 * sc, y0 + bar / 2, 2.6 * sc, 0, TAU);
    g.fillStyle = i === 0 ? rgba(P.sig, 1) : rgba(P.fg, 0.3);
    g.fill();
  }
  rr(g, x0 + bw * 0.3, y0 + 5 * sc, bw * 0.4, bar - 10 * sc, (bar - 10 * sc) / 2);
  g.fillStyle = rgba(P.fg, 0.07);
  g.fill();
  // viewport
  const vx = x0 + 1, vy = y0 + bar + 1, vw = bw - 2, vh = bh - bar - 2;
  g.save();
  rr(g, vx, vy, vw, vh, 6 * sc);
  g.clip();
  // wireframe blocks, each rising 8px into place
  const blocks: [number, number, number, number, boolean][] = [
    [0.04, 0.06, 0.92, 0.07, false], // nav
    [0.04, 0.2, 0.62, 0.08, true], // headline
    [0.04, 0.31, 0.44, 0.08, true],
    [0.04, 0.44, 0.18, 0.07, false], // button
    [0.56, 0.2, 0.4, 0.31, false], // image
    [0.04, 0.6, 0.29, 0.32, false], // cards
    [0.355, 0.6, 0.29, 0.32, false],
    [0.67, 0.6, 0.29, 0.32, false],
  ];
  const wireOut = clamp((c - 0.42) / 0.1, 0, 1);
  blocks.forEach(([bx, by, bw2, bh2, text], i) => {
    const p = easeOut((c - i * 0.035) / 0.08);
    if (p <= 0) return;
    g.globalAlpha = p * (1 - wireOut);
    const yy = vy + by * vh + (1 - p) * 8 * sc;
    if (text) {
      g.fillStyle = rgba(P.fg, 0.85);
      g.fillRect(vx + bx * vw, yy, bw2 * vw, bh2 * vh * 0.62);
    } else {
      g.strokeStyle = rgba(i === 3 ? P.sig : P.fg, i === 3 ? 1 : 0.45);
      g.lineWidth = 1;
      rr(g, vx + bx * vw, yy, bw2 * vw, bh2 * vh, 3 * sc);
      g.stroke();
      if (i === 4) {
        g.beginPath();
        g.moveTo(vx + bx * vw, yy);
        g.lineTo(vx + (bx + bw2) * vw, yy + bh2 * vh);
        g.moveTo(vx + (bx + bw2) * vw, yy);
        g.lineTo(vx + bx * vw, yy + bh2 * vh);
        g.strokeStyle = rgba(P.fg, 0.18);
        g.stroke();
      }
    }
  });
  g.globalAlpha = 1;
  // the real page, greyscale like a printer's proof
  const im = imgs[n % imgs.length];
  const page = PAGES[n % PAGES.length];
  if (im.complete && im.naturalWidth) {
    // The proof filter runs once per page into a cached canvas, not on every frame.
    const grays = (S.grays ??= new Map()) as Map<HTMLImageElement, HTMLCanvasElement>;
    let gray = grays.get(im);
    if (!gray) {
      gray = document.createElement("canvas");
      gray.width = im.naturalWidth;
      gray.height = im.naturalHeight;
      const gg = gray.getContext("2d");
      if (gg) {
        gg.filter = "grayscale(1) contrast(1.04)";
        gg.drawImage(im, 0, 0);
      }
      grays.set(im, gray);
    }
    const a = clamp((c - 0.38) / 0.1, 0, 1) * (1 - clamp((c - 0.93) / 0.07, 0, 1));
    if (a > 0) {
      const sh = (vh / vw) * page.width;
      const travel = page.height - sh;
      const sy = inout(clamp((c - 0.5) / 0.4, 0, 1)) * Math.min(travel, page.width * 1.6);
      g.globalAlpha = a;
      g.drawImage(gray, 0, sy, page.width, sh, vx, vy, vw, vh);
      g.globalAlpha = 1;
    }
  }
  g.restore();
  // cursor-like caret in signal while the layout is building
  if (c < 0.42) {
    const k = c / 0.42;
    const cx = vx + vw * lerp(0.1, 0.8, k), cy = vy + vh * lerp(0.15, 0.75, Math.sin(k * Math.PI));
    g.fillStyle = rgba(P.sig, 1);
    g.beginPath();
    g.arc(cx, cy, 3.2 * sc, 0, TAU);
    g.fill();
  }
  label(g, F, "layout", x0, y0 + bh + 12 * sc, rgba(P.fg, c < 0.42 ? 0.7 : 0.3), 9 * sc);
  label(g, F, "live", x0 + bw, y0 + bh + 12 * sc, c >= 0.42 ? rgba(P.sig, 1) : rgba(P.fg, 0.3), 9 * sc, "right");
};

/* Backend & APIs: traffic swells, the balancer spreads it over replicas, p99 stays flat. */
const backend: Draw = (g, w, h, t, S, P, F) => {
  const sc = scaleOf(w, h);
  if (!S.R) {
    S.R = rng(7);
    S.parts = [];
    S.acc = 0;
    S.last = t;
  }
  const R = S.R as () => number;
  const parts = S.parts as { x: number; y: number; lane: number; v: number; hot: boolean }[];
  const dt = clamp(t - (S.last as number), 0, 50);
  S.last = t;
  const lbx = w * 0.3, top = h * 0.16, bot = h * 0.62, n = 4;
  const lanes = Array.from({ length: n }, (_, i) => lerp(top, bot, i / (n - 1)));
  const loadAt = (tt: number) => 0.5 + 0.5 * Math.sin(tt / 2400) * Math.sin(tt / 5300 + 1);
  const load = loadAt(t);
  S.acc = (S.acc as number) + (0.012 + 0.05 * load) * dt;
  while ((S.acc as number) > 1) {
    S.acc = (S.acc as number) - 1;
    parts.push({ x: -4, y: lerp(top, bot, R()), lane: Math.floor(R() * n), v: 0.16 + R() * 0.06, hot: R() < 0.12 });
  }
  g.lineWidth = 1;
  lanes.forEach((y, i) => {
    g.strokeStyle = rgba(P.fg, 0.14);
    g.beginPath();
    g.moveTo(lbx, y);
    g.lineTo(w * 0.86, y);
    g.stroke();
    const bx = w * 0.86, bw = 46 * sc, bh = 22 * sc;
    rr(g, bx, y - bh / 2, bw, bh, 4 * sc);
    g.fillStyle = rgba(P.bg, 1);
    g.fill();
    g.strokeStyle = rgba(P.fg, 0.55);
    g.stroke();
    const util = clamp(0.25 + load * 0.55 + 0.08 * Math.sin(t / 700 + i * 1.7), 0, 0.95);
    g.fillStyle = rgba(P.sig, 0.85);
    g.fillRect(bx + 5 * sc, y + bh / 2 - 6 * sc, (bw - 10 * sc) * util, 2.4 * sc);
  });
  g.fillStyle = rgba(P.fg, 0.9);
  g.fillRect(lbx - 2, top - 14 * sc, 3, bot - top + 28 * sc);
  label(g, F, "balancer", lbx, top - 26 * sc, rgba(P.fg, 0.55), 9.5 * sc, "center");
  label(g, F, "replicas", w * 0.86 + 23 * sc, top - 26 * sc, rgba(P.fg, 0.55), 9.5 * sc, "center");
  S.parts = parts.filter((p) => {
    p.x += p.v * dt * sc;
    let y = p.y;
    if (p.x > lbx) {
      const kk = easeOut((p.x - lbx) / (w * 0.14));
      y = lerp(p.y, lanes[p.lane], kk);
    }
    if (p.x > w * 0.86) return false;
    g.fillStyle = p.hot ? rgba(P.sig, 1) : rgba(P.fg, 0.7);
    g.beginPath();
    g.arc(p.x, y, (p.hot ? 2.2 : 1.6) * sc, 0, TAU);
    g.fill();
    return true;
  });
  const by = h * 0.92, ah = h * 0.16, x0 = w * 0.04, x1 = w * 0.96;
  g.beginPath();
  g.moveTo(x0, by);
  for (let i = 0; i <= 80; i++) g.lineTo(lerp(x0, x1, i / 80), by - loadAt(t - (80 - i) * 60) * ah);
  g.lineTo(x1, by);
  g.closePath();
  g.fillStyle = rgba(P.fg, 0.09);
  g.fill();
  g.strokeStyle = rgba(P.sig, 0.95);
  g.lineWidth = 1.4;
  g.beginPath();
  for (let i = 0; i <= 80; i++) {
    const x = lerp(x0, x1, i / 80), y = by - ah * 0.82 + Math.sin(i * 1.3 + t / 400) * 0.6;
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.stroke();
  label(g, F, "traffic", x0, by + 10 * sc, rgba(P.fg, 0.5), 9 * sc);
  label(g, F, "p99 latency", x1, by - ah * 0.82 - 10 * sc, rgba(P.sig, 1), 9 * sc, "right");
};

/* System design: a topic fans out to consumers; a failed message drops to the dead-letter
   lane and retries; delivered messages are ticked once; one consumer holds the lead. */
const queues: Draw = (g, w, h, t, S, P, F) => {
  const sc = scaleOf(w, h);
  if (!S.R) {
    S.R = rng(11);
    S.msgs = [];
    S.next = 0;
    S.leader = 0;
    S.lastElect = t;
    S.elect = 0;
    S.ticks = [0, 0, 0];
  }
  const R = S.R as () => number;
  const ticks = S.ticks as number[];
  type Msg = { lane: number; t0: number; fail: boolean; phase: number; t1: number };
  const tx = w * 0.14, ty = h * 0.4, cx = w * 0.8, lanesY = [h * 0.18, h * 0.4, h * 0.62], dlqY = h * 0.86;
  if (t > (S.next as number)) {
    S.next = t + 520 * (0.7 + R() * 0.6);
    (S.msgs as Msg[]).push({ lane: Math.floor(R() * 3), t0: t, fail: R() < 0.16, phase: 0, t1: 0 });
  }
  if (t - (S.lastElect as number) > 6500) {
    S.lastElect = t;
    S.leader = ((S.leader as number) + 1) % 3;
    S.elect = t;
  }
  rr(g, tx - 34 * sc, ty - 20 * sc, 68 * sc, 40 * sc, 6 * sc);
  g.fillStyle = rgba(P.fg, 0.95);
  g.fill();
  label(g, F, "topic", tx, ty, rgba(P.bg, 1), 10 * sc, "center");
  lanesY.forEach((y, i) => {
    g.strokeStyle = rgba(P.fg, 0.22);
    g.lineWidth = 1;
    g.beginPath();
    g.moveTo(tx + 34 * sc, ty);
    g.bezierCurveTo(tx + 90 * sc, ty, tx + 70 * sc, y, tx + 130 * sc, y);
    g.lineTo(cx - 30 * sc, y);
    g.stroke();
    const lead = S.leader === i;
    const pe = S.elect ? clamp(1 - (t - (S.elect as number)) / 900, 0, 1) : 0;
    g.beginPath();
    g.arc(cx, y, 15 * sc, 0, TAU);
    g.fillStyle = rgba(P.bg, 1);
    g.fill();
    g.lineWidth = lead ? 2 : 1;
    g.strokeStyle = lead ? rgba(P.sig, 1) : rgba(P.fg, 0.55);
    g.stroke();
    if (lead) {
      g.beginPath();
      g.arc(cx, y, (21 + pe * 10) * sc, 0, TAU);
      g.strokeStyle = rgba(P.sig, 0.35 * (1 - pe) + 0.2);
      g.lineWidth = 1;
      g.stroke();
      label(g, F, "leader", cx + 26 * sc, y, rgba(P.sig, 1), 9 * sc);
    }
    const tk = ticks[i] ? clamp(1 - (t - ticks[i]) / 600, 0, 1) : 0;
    g.strokeStyle = rgba(P.fg, 0.4 + 0.6 * tk);
    g.lineWidth = 1.4;
    g.beginPath();
    g.moveTo(cx - 5 * sc, y);
    g.lineTo(cx - 1.5 * sc, y + 4 * sc);
    g.lineTo(cx + 6 * sc, y - 5 * sc);
    g.stroke();
  });
  g.setLineDash([3 * sc, 4 * sc]);
  g.strokeStyle = rgba(P.fg, 0.3);
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(tx + 130 * sc, dlqY);
  g.lineTo(cx - 30 * sc, dlqY);
  g.stroke();
  g.setLineDash([]);
  label(g, F, "dead-letter · retry", tx + 130 * sc, dlqY + 14 * sc, rgba(P.fg, 0.55), 9 * sc);
  const L0 = tx + 34 * sc, L1 = cx - 18 * sc;
  S.msgs = (S.msgs as Msg[]).filter((m) => {
    const y = lanesY[m.lane];
    let x = 0, yy = 0, col = rgba(P.fg, 0.9);
    if (m.phase === 0) {
      const u = (t - m.t0) / 2300;
      if (u >= 1) {
        if (m.fail) {
          m.phase = 1;
          m.t1 = t;
        } else {
          ticks[m.lane] = t;
          return false;
        }
      }
      x = lerp(L0, L1, clamp(u, 0, 1));
      yy = lerp(ty, y, inout(clamp((x - L0) / (96 * sc), 0, 1)));
      if (m.fail && u > 0.7) col = rgba(P.sig, 1);
    } else {
      const v = (t - m.t1) / 2600;
      if (v >= 1) {
        m.phase = 0;
        m.fail = false;
        m.t0 = t;
        return true;
      }
      if (v < 0.2) {
        x = L1;
        yy = lerp(y, dlqY, inout(v / 0.2));
      } else if (v < 0.8) {
        x = lerp(L1, tx + 130 * sc, inout((v - 0.2) / 0.6));
        yy = dlqY;
      } else {
        x = tx + 130 * sc;
        yy = lerp(dlqY, y, inout((v - 0.8) / 0.2));
      }
      col = rgba(P.sig, 1);
    }
    rr(g, x - 7 * sc, yy - 4 * sc, 14 * sc, 8 * sc, 2 * sc);
    g.fillStyle = col;
    g.fill();
    return true;
  });
};

/* AI & machine learning: embeddings settle into clusters, a query finds its nearest
   neighbours, three models vote. */
const vectors: Draw = (g, w, h, t, S, P, F) => {
  const sc = scaleOf(w, h);
  type Pt = { cx: number; cy: number; sx: number; sy: number; ph: number; c: number };
  if (!S.pts) {
    const R = rng(23);
    const C = [[0.22, 0.32], [0.55, 0.22], [0.72, 0.62], [0.33, 0.72]];
    S.pts = Array.from({ length: 150 }, (_, i) => {
      const c = C[i % 4], a = R() * TAU, r = Math.pow(R(), 0.7) * 0.11;
      return { cx: c[0] + Math.cos(a) * r, cy: c[1] + Math.sin(a) * r * 1.3, sx: R(), sy: R(), ph: R() * TAU, c: i % 4 };
    });
  }
  const ph = (t % 15000) / 15000;
  const settle = ph < 0.16 ? inout(ph / 0.16) : ph > 0.92 ? 1 - inout((ph - 0.92) / 0.08) * 0.85 : 1;
  const qx = (0.45 + 0.25 * Math.sin(t / 3100)) * w, qy = (0.47 + 0.22 * Math.sin(t / 2300 + 1)) * h;
  const pos = (S.pts as Pt[]).map((p) => {
    const x = lerp(p.sx, p.cx, settle) * w + Math.sin(t / 900 + p.ph) * 1.5 * sc;
    const y = lerp(p.sy, p.cy, settle) * h + Math.cos(t / 1100 + p.ph) * 1.5 * sc;
    return { x, y, c: p.c, d: Math.hypot(x - qx, y - qy) };
  });
  const nn = new Set(pos.slice().sort((a, b) => a.d - b.d).slice(0, 6));
  g.lineWidth = 1;
  g.strokeStyle = rgba(P.sig, 0.6);
  nn.forEach((p) => {
    g.beginPath();
    g.moveTo(qx, qy);
    g.lineTo(p.x, p.y);
    g.stroke();
  });
  pos.forEach((p) => {
    const hit = nn.has(p);
    g.fillStyle = hit ? rgba(P.sig, 1) : rgba(P.fg, 0.5 + 0.2 * (p.c % 2));
    g.beginPath();
    g.arc(p.x, p.y, (hit ? 3 : 2.1) * sc, 0, TAU);
    g.fill();
  });
  g.strokeStyle = rgba(P.sig, 1);
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(qx, qy, 6 * sc, 0, TAU);
  g.stroke();
  g.fillStyle = rgba(P.sig, 1);
  g.beginPath();
  g.arc(qx, qy, 2.4 * sc, 0, TAU);
  g.fill();
  label(g, F, "query", qx + 12 * sc, qy - 10 * sc, rgba(P.sig, 1), 9.5 * sc);
  const bx = w * 0.7, by = h * 0.9;
  label(g, F, "ensemble", bx - 10 * sc, by, rgba(P.fg, 0.55), 9 * sc, "right");
  for (let i = 0; i < 3; i++) {
    const agree = (Math.floor(t / 1400) + i) % 5 !== 0;
    rr(g, bx + i * 30 * sc, by - 9 * sc, 22 * sc, 18 * sc, 3 * sc);
    g.fillStyle = agree ? rgba(P.fg, 0.9) : rgba(P.fg, 0.2);
    g.fill();
  }
  g.strokeStyle = rgba(P.sig, 1);
  g.lineWidth = 1.4;
  g.beginPath();
  g.moveTo(bx + 92 * sc, by);
  g.lineTo(bx + 110 * sc, by);
  g.stroke();
  g.beginPath();
  g.arc(bx + 116 * sc, by, 4 * sc, 0, TAU);
  g.fill();
};

/* Cloud & DevOps: a commit runs the pipeline, the deploy rolls across containers in two
   regions, and the monitor underneath catches the one spike. */
const cloud: Draw = (g, w, h, t, S, P, F) => {
  const sc = scaleOf(w, h);
  const CYC = 6400, c = (t % CYC) / CYC, n = Math.floor(t / CYC);
  const stages = ["build", "test", "image", "deploy"];
  const sy = h * 0.14, sx0 = w * 0.06, sx1 = w * 0.94, sw = (sx1 - sx0) / stages.length;
  const at = c / 0.5; // the commit crosses the pipeline in the first half
  g.strokeStyle = rgba(P.fg, 0.25);
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(sx0 + sw * 0.5, sy);
  g.lineTo(sx1 - sw * 0.5, sy);
  g.stroke();
  stages.forEach((s, i) => {
    const x = sx0 + sw * (i + 0.5);
    const done = at * (stages.length - 1) >= i - 0.02;
    const pw = 58 * sc, ph = 22 * sc;
    rr(g, x - pw / 2, sy - ph / 2, pw, ph, ph / 2);
    g.fillStyle = done ? rgba(P.fg, 0.95) : rgba(P.bg, 1);
    g.fill();
    g.strokeStyle = rgba(P.fg, 0.55);
    g.stroke();
    label(g, F, s, x, sy, done ? rgba(P.bg, 1) : rgba(P.fg, 0.6), 8.5 * sc, "center");
  });
  if (at < 1) {
    const x = lerp(sx0 + sw * 0.5, sx1 - sw * 0.5, inout(at));
    g.fillStyle = rgba(P.sig, 1);
    g.beginPath();
    g.arc(x, sy + 18 * sc, 3.4 * sc, 0, TAU);
    g.fill();
  }
  // two regions, rolling update container by container
  const regions = ["azure", "aws"];
  const ry = h * 0.32, rh = h * 0.3, rw = w * 0.42;
  regions.forEach((r, ri) => {
    const rx = ri ? w * 0.52 : w * 0.06;
    g.setLineDash([3 * sc, 3 * sc]);
    g.strokeStyle = rgba(P.fg, 0.35);
    rr(g, rx, ry, rw, rh, 6 * sc);
    g.stroke();
    g.setLineDash([]);
    label(g, F, r, rx + 10 * sc, ry + 12 * sc, rgba(P.fg, 0.6), 8.5 * sc);
    for (let k = 0; k < 4; k++) {
      const bw = (rw - 50 * sc) / 4, bx = rx + 14 * sc + k * (bw + 7 * sc), by = ry + rh * 0.42, bh = rh * 0.42;
      const start = 0.52 + (ri * 4 + k) * 0.045;
      const roll = clamp((c - start) / 0.05, 0, 1);
      const fresh = roll >= 1;
      rr(g, bx, by, bw, bh, 3 * sc);
      g.fillStyle = roll > 0 && !fresh ? rgba(P.sig, 0.9) : fresh ? rgba(P.fg, 0.9) : rgba(P.fg, n % 2 ? 0.9 : 0.18);
      g.fill();
      g.strokeStyle = rgba(P.fg, 0.6);
      g.stroke();
    }
  });
  // monitor: heartbeat with one alert spike
  const my = h * 0.86, mx0 = w * 0.06, mx1 = w * 0.94;
  g.strokeStyle = rgba(P.fg, 0.8);
  g.lineWidth = 1.2;
  g.beginPath();
  let spikeX = -1;
  for (let i = 0; i <= 120; i++) {
    const x = lerp(mx0, mx1, i / 120), tt = t / 26 + i;
    const beat = Math.exp(-Math.pow(((tt % 30) - 15) / 1.4, 2));
    const spike = Math.floor(tt / 30) % 7 === 3 ? 1 : 0;
    const y = my - beat * (spike ? 26 : 9) * sc;
    if (spike && beat > 0.9) spikeX = x;
    if (i) g.lineTo(x, y);
    else g.moveTo(x, y);
  }
  g.stroke();
  if (spikeX > 0) {
    g.fillStyle = rgba(P.sig, 1);
    g.beginPath();
    g.arc(spikeX, my - 26 * sc, 3.2 * sc, 0, TAU);
    g.fill();
    label(g, F, "alert", spikeX + 8 * sc, my - 30 * sc, rgba(P.sig, 1), 8.5 * sc);
  }
  label(g, F, "monitoring", mx0, my + 12 * sc, rgba(P.fg, 0.5), 8.5 * sc);
};

/* Security & compliance: one table, rows owned by tenants; a signed-in tenant's query
   lights only its own rows; secrets sit in a vault behind a private endpoint. */
const tenants: Draw = (g, w, h, t, S, P, F) => {
  const sc = scaleOf(w, h);
  const rows = 11, x0 = w * 0.08, x1 = w * 0.7, y0 = h * 0.08, rh = (h * 0.84) / rows;
  const own = [0, 1, 2, 0, 2, 1, 1, 0, 2, 0, 1];
  const who = Math.floor(t / 3200) % 3;
  const scan = (t % 3200) / 2200;
  const names = ["tenant a", "tenant b", "tenant c"];
  for (let i = 0; i < rows; i++) {
    const y = y0 + i * rh, mine = own[i] === who, lit = mine && scan * rows > i;
    g.fillStyle = lit ? rgba(P.sig, 0.92) : rgba(P.fg, mine ? 0.1 : 0.05);
    g.fillRect(x0, y + 2 * sc, x1 - x0, rh - 4 * sc);
    for (let c = 0; c < 4; c++) {
      g.fillStyle = lit ? rgba(P.bg, 0.8) : rgba(P.fg, mine ? 0.35 : 0.14);
      g.fillRect(x0 + 12 * sc + c * (x1 - x0) * 0.22, y + rh / 2 - 1.5 * sc, (x1 - x0) * (0.12 + ((i * 7 + c * 3) % 5) * 0.015), 3 * sc);
    }
    if (!mine) {
      g.strokeStyle = rgba(P.fg, 0.12);
      g.lineWidth = 1;
      g.beginPath();
      for (let x = x0; x < x1; x += 9 * sc) {
        g.moveTo(x, y + rh - 2 * sc);
        g.lineTo(x + 6 * sc, y + 2 * sc);
      }
      g.stroke();
    }
  }
  label(g, F, "row-level security", x0, y0 - 10 * sc, rgba(P.fg, 0.55), 9 * sc);
  const qx = w * 0.86, qy = h * 0.3;
  g.fillStyle = rgba(P.fg, 0.95);
  rr(g, qx - 34 * sc, qy - 14 * sc, 68 * sc, 28 * sc, 14 * sc);
  g.fill();
  label(g, F, names[who], qx, qy, rgba(P.bg, 1), 9 * sc, "center");
  label(g, F, "signed in", qx, qy - 24 * sc, rgba(P.fg, 0.5), 8 * sc, "center");
  g.strokeStyle = rgba(P.sig, 0.8);
  g.lineWidth = 1;
  g.beginPath();
  g.moveTo(qx - 34 * sc, qy);
  g.lineTo(x1 + 4 * sc, qy);
  g.stroke();
  const vx = w * 0.86, vy = h * 0.7;
  g.strokeStyle = rgba(P.fg, 0.7);
  g.lineWidth = 1.2;
  rr(g, vx - 26 * sc, vy - 22 * sc, 52 * sc, 44 * sc, 5 * sc);
  g.stroke();
  g.beginPath();
  g.arc(vx, vy, 9 * sc, 0, TAU);
  g.stroke();
  const sp = t / 1200;
  for (let i = 0; i < 4; i++) {
    const a = sp + (i * TAU) / 4;
    g.beginPath();
    g.moveTo(vx + Math.cos(a) * 9 * sc, vy + Math.sin(a) * 9 * sc);
    g.lineTo(vx + Math.cos(a) * 13 * sc, vy + Math.sin(a) * 13 * sc);
    g.stroke();
  }
  label(g, F, "key vault", vx, vy + 34 * sc, rgba(P.fg, 0.55), 9 * sc, "center");
  g.setLineDash([2 * sc, 3 * sc]);
  g.strokeStyle = rgba(P.fg, 0.4);
  g.beginPath();
  g.moveTo(x1 + 4 * sc, vy);
  g.lineTo(vx - 26 * sc, vy);
  g.stroke();
  g.setLineDash([]);
  label(g, F, "audit log", (x1 + vx - 26 * sc) / 2 + 2 * sc, vy - 12 * sc, rgba(P.fg, 0.45), 8 * sc, "center");
};

const FIGURES: Record<CapabilityFigure, Draw> = { web, backend, queues, vectors, cloud, tenants };

export type FigureHandle = { setActive: (on: boolean) => void; destroy: () => void };

/** Draws `figure` into `canvas`; runs only while active, on screen and the tab is visible. */
export function mountFigure(canvas: HTMLCanvasElement, figure: CapabilityFigure, reduced: boolean): FigureHandle {
  const g = canvas.getContext("2d");
  if (!g) return { setActive: () => {}, destroy: () => {} };
  const css = getComputedStyle(document.documentElement);
  const col = (v: string, f: string) => css.getPropertyValue(v).trim() || f;
  const P: Pal = { fg: col("--paper", "#ece9f3"), sig: col("--signal", "#9d7cff"), bg: col("--ink-3", "#242031") };
  const F: Fonts = {
    sans: getComputedStyle(document.body).fontFamily,
    mono: `${col("--font-geist-mono", "ui-monospace")}, ui-monospace, monospace`,
  };
  const draw = FIGURES[figure];
  const S: State = {};
  let W = 0, H = 0, dpr = 1, raf = 0, last = 0, tl = 0;
  let active = false, visible = false;
  const fit = () => {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(window.innerWidth < 760 ? 1.5 : 2, window.devicePixelRatio || 1);
    W = r.width;
    H = r.height;
    canvas.width = Math.max(1, Math.round(W * dpr));
    canvas.height = Math.max(1, Math.round(H * dpr));
  };
  const paint = (now: number) => {
    const dt = Math.min(50, now - (last || now));
    last = now;
    tl += dt;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, W, H);
    if (W > 2 && H > 2) draw(g, W, H, reduced ? 5200 : tl, S, P, F);
  };
  const running = () => active && visible && !reduced && !document.hidden;
  const loop = (now: number) => {
    paint(now);
    raf = running() ? requestAnimationFrame(loop) : 0;
  };
  const sync = () => {
    if (running() && !raf) {
      last = 0;
      raf = requestAnimationFrame(loop);
    } else if (!running() && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  };
  const still = () => {
    if (!raf) paint(performance.now());
  };
  S.onload = still;
  const ro = new ResizeObserver(() => {
    fit();
    still();
  });
  ro.observe(canvas);
  const io = new IntersectionObserver(
    (e) => {
      visible = e[0].isIntersecting;
      sync();
    },
    { rootMargin: "80px" },
  );
  io.observe(canvas);
  document.addEventListener("visibilitychange", sync);
  let alive = true;
  void document.fonts?.ready.then(() => alive && still());
  return {
    setActive(on) {
      if (on === active) return;
      active = on;
      sync();
      if (reduced) still();
    },
    destroy() {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    },
  };
}
