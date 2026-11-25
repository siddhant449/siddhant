"use client";

import { useEffect, useRef, useState } from "react";
import { deckPanels, nodeSub, projectAt, shizukuCopy as copy, systemsCopy } from "@/lib/copy/systems";
import { Card, Deck } from "./deck";
import { bake, blit, spriteCache } from "./pixel";
import { BUBBLES, CAST, CH, CW, RIM, SHADOW, chibiLayers, type Pose, type View } from "./sprites-chibi";
import s from "./systems.module.css";
import { fit, monoFont, useEvery, useLoop, useWide, useWidth, type FigureProps } from "./use-figure";

/*
  Linear "Build, review, and ship" geometry: a list panel behind, a wide
  panel over it. The list is the three pipelines (layout, panels, voice); the
  panel is the 2.5D engine: three chibi pixel characters on a grid, a camera
  orbiting, and the same scene rendered into four manga panels from four
  cameras (each panel picks the front, side or back sprite its camera sees).
*/

const W = 1344;
const H = 498;
const CAMS = [0.35, 1.25, 2.6, -0.7];
/** The cast on the 8 × 8 grid (CAST order: Aki, Ren, Mio). */
const SPOTS = [
  { x: 1.4, z: 3.6 },
  { x: 4.6, z: 4.9 },
  { x: 5.8, z: 2.4 },
];
/** Everyone faces the middle of the group, cheated out toward the main camera (stage blocking). */
const MID = { x: (1.4 + 4.6 + 5.8) / 3, z: (3.6 + 4.9 + 2.4) / 3 };
const MAIN = 0.62;
const FACING = SPOTS.map((p) => {
  const dx = MID.x - p.x;
  const dz = MID.z - p.z;
  const l = Math.hypot(dx, dz) || 1;
  return { x: (dx / l) * 0.6 + Math.sin(MAIN) * 0.8, z: (dz / l) * 0.6 + Math.cos(MAIN) * 0.8 };
});
/** Per panel: zoom and the grid point the camera frames (wide, close-up, over the shoulder, reverse). */
const SHOTS: { zoom: number; focus?: [number, number] }[] = [
  { zoom: 1 },
  { zoom: 1.65, focus: [5.6, 2.6] },
  { zoom: 1.3, focus: [3.2, 3.6] },
  { zoom: 1 },
];

const cache = spriteCache();
const chibi = (i: number, pose: Pose) =>
  cache(`c${i}${pose.view}${pose.bob}${+pose.blink}${pose.wave}`, () => bake(CW, CH, chibiLayers(CAST[i], pose), RIM));
const bubble = (kind: "talk" | "heart") => cache(`b${kind}`, () => bake(11, BUBBLES[kind].length, [{ rows: BUBBLES[kind] }]));
const shadow = () => cache("shadow", () => bake(10, 3, [{ rows: SHADOW }]));

/** Which sprite a camera sees: the facing direction rotated into view space. */
function viewOf(i: number, ca: number, sa: number): { view: View; flip: boolean } {
  const fx = FACING[i].x;
  const fz = FACING[i].z;
  const rx = fx * ca - fz * sa;
  const rz = fx * sa + fz * ca;
  const a = Math.abs(Math.atan2(rx, rz));
  if (a < Math.PI / 4) return { view: "front", flip: false };
  if (a > (3 * Math.PI) / 4) return { view: "back", flip: false };
  return { view: "side", flip: rx < 0 };
}

/** Idle bob, a blink, and each character's gesture (a wave or a speech bubble), from the clock. */
function poseOf(i: number, t: number, view: View) {
  const ph = i * 1.37;
  const bob = (Math.floor((t + ph) * 2.4) % 2) as 0 | 1;
  const blink = view !== "back" && (t + ph * 2.3) % 3.4 < 0.13;
  const g = (t + ph * 1.9) % 6;
  const gesture = CAST[i].gesture;
  const wave = (gesture === "wave" && view === "front" && g < 1.5 ? Math.floor(g * 5) % 2 : -1) as -1 | 0 | 1;
  const talking = gesture !== "wave" && g > 2 && g < 3.8 ? g - 2 : -1;
  return { pose: { view, bob, blink, wave }, talking };
}

const status = {
  todo: (
    <svg viewBox="0 0 14 14" fill="none" stroke="#645b58" strokeWidth="1.4" aria-hidden>
      <circle cx="7" cy="7" r="5.5" />
    </svg>
  ),
  prog: (
    <svg viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="7" cy="7" r="5.5" stroke="#ff3a1a" strokeWidth="1.4" />
      <path d="M7 7V1.5A5.5 5.5 0 0 1 12.5 7Z" fill="#ff3a1a" />
    </svg>
  ),
  done: (
    <svg viewBox="0 0 14 14" aria-hidden>
      <circle cx="7" cy="7" r="6.2" fill="#c4b7b4" />
      <path d="M4.3 7.2 6.2 9l3.6-3.8" stroke="#161210" strokeWidth="1.5" fill="none" />
    </svg>
  ),
};

function drawScene(
  c: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  sc: number,
  ang: number,
  tilt: number,
  alpha: number,
  t: number,
  focus?: [number, number],
) {
  const G = 8;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  let ox = 0;
  let oy = 0;
  const P = (x: number, y: number, z: number): [number, number, number] => {
    x -= G / 2;
    z -= G / 2;
    const rx = x * ca - z * sa;
    const rz = x * sa + z * ca;
    return [cx + ox + rx * sc, cy + oy + rz * Math.sin(tilt) * sc - y * sc * Math.cos(tilt), rz];
  };
  if (focus) {
    // Frame the shot on a point a little above the floor.
    const f = P(focus[0], 0.9, focus[1]);
    ox = cx - f[0];
    oy = cy - f[1];
  }
  c.globalAlpha = alpha;
  c.strokeStyle = "rgba(196,183,180,.22)";
  c.lineWidth = 1;
  for (let i = 0; i <= G; i++) {
    let a = P(i, 0, 0);
    let b = P(i, 0, G);
    c.beginPath();
    c.moveTo(a[0], a[1]);
    c.lineTo(b[0], b[1]);
    c.stroke();
    a = P(0, 0, i);
    b = P(G, 0, i);
    c.beginPath();
    c.moveTo(a[0], a[1]);
    c.lineTo(b[0], b[1]);
    c.stroke();
  }
  // Sprites: whole design pixels per sprite pixel, back to front.
  const k = Math.max(2, Math.round(sc / 10));
  const order = SPOTS.map((p, i) => ({ i, p: P(p.x, 0, p.z) })).sort((a, b) => a.p[2] - b.p[2]);
  for (const { i, p } of order) {
    c.globalAlpha = alpha * 0.5;
    blit(c, shadow(), p[0], p[1] + k * 1.5, k);
    c.globalAlpha = alpha;
    const { view, flip } = viewOf(i, ca, sa);
    const { pose, talking } = poseOf(i, t, view);
    blit(c, chibi(i, pose), p[0], p[1] + k, k, flip);
    if (talking >= 0) {
      const gesture = CAST[i].gesture as "talk" | "heart";
      const pop = talking < 0.12 ? k : 0;
      const side = flip ? -1 : 1;
      blit(c, bubble(gesture), p[0] + side * 7 * k, p[1] + k - (CH - 1) * k - pop, k);
    }
  }
  c.globalAlpha = 1;
}

/** The camera rig: the cast on the grid, the orbit and the live camera. k scales the 500px stage rig. */
function drawRig(c: CanvasRenderingContext2D, cx: number, cy: number, k: number, t: number, lx: number, ly: number) {
  const R = 190 * k;
  c.strokeStyle = "rgba(255,255,255,.08)";
  c.setLineDash([3, 5]);
  c.beginPath();
  c.ellipse(cx, cy, R, R * Math.sin(0.55), 0, 0, 7);
  c.stroke();
  c.setLineDash([]);
  const ci = Math.floor(t / 2.2) % 4;
  const cA = CAMS[ci];
  const camX = cx + Math.cos(-cA + 0.62 - Math.PI / 2) * R;
  const camY = cy + Math.sin(-cA + 0.62 - Math.PI / 2) * R * Math.sin(0.55);
  c.strokeStyle = "rgba(255,58,26,.5)";
  c.beginPath();
  c.moveTo(camX, camY);
  c.lineTo(cx - 40 * k, cy);
  c.moveTo(camX, camY);
  c.lineTo(cx + 40 * k, cy);
  c.stroke();
  // The rig sits behind the cast; the camera body stays on top so it is always readable.
  drawScene(c, cx, cy, 30 * k, MAIN, 0.55, 1, t);
  c.fillStyle = "#ff3a1a";
  c.beginPath();
  c.roundRect(camX - 7, camY - 5, 14, 10, 2);
  c.fill();
  c.fillStyle = "#8e8481";
  c.font = monoFont(12);
  c.fillText(`${copy.camera.toUpperCase()} ${ci + 1} / 4`, lx, ly);
}

/** The manga page: the same scene from four cameras, each panel inking in when its camera is live. */
function drawPage(c: CanvasRenderingContext2D, px: number, py: number, pw: number, ph: number, t: number) {
  const ci = Math.floor(t / 2.2) % 4;
  const cells = [
    [0, 0, 0.58, 0.48],
    [0.6, 0, 0.4, 0.48],
    [0, 0.5, 0.4, 0.5],
    [0.42, 0.5, 0.58, 0.5],
  ];
  cells.forEach((cl, i) => {
    const x = px + cl[0] * pw;
    const y = py + cl[1] * ph;
    const w = cl[2] * pw - 6;
    const h = cl[3] * ph - 6;
    c.fillStyle = "#120e0d";
    c.fillRect(x, y, w, h);
    c.save();
    c.beginPath();
    c.rect(x, y, w, h);
    c.clip();
    const k = i === ci ? Math.min(1, (t % 2.2) / 1.1) : i < ci ? 1 : 0;
    const shot = SHOTS[i];
    if (k > 0)
      drawScene(c, x + w / 2, y + h * (shot.focus ? 0.5 : 0.62), (Math.min(w, h) / 9.5) * shot.zoom, CAMS[i], 0.5, k, t, shot.focus);
    if (i === ci && k < 1) {
      c.fillStyle = "rgba(255,58,26,.12)";
      c.fillRect(x, y + h * k - 2, w, 2);
    }
    c.restore();
    c.strokeStyle = i === ci ? "rgba(255,58,26,.7)" : "rgba(246,239,237,.35)";
    c.lineWidth = 1.5;
    c.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5);
  });
  c.fillStyle = "#8e8481";
  c.font = monoFont(12);
  c.fillText(copy.page.toUpperCase(), px, py + ph + 26);
}

export default function FigureShizuku({ active, reduced, deck, label }: FigureProps) {
  const project = projectAt(3);
  const items = copy.groups.flatMap((g) => g.items);
  const [cur, setCur] = useState(reduced ? 3 : 0);
  useEvery(active && !reduced, 1100, () => setCur((c) => (c + 1) % (items.length + 2)));

  const cv = useRef<HTMLCanvasElement>(null);
  const pageCv = useRef<HTMLCanvasElement>(null);
  const rigBox = useRef<HTMLDivElement>(null);
  const pageBox = useRef<HTMLDivElement>(null);
  const rigW = useWidth(rigBox, !!deck);
  const pageW = useWidth(pageBox, !!deck);
  // Tablet: the rig and the page share one wide panel (the desktop composition); phones swipe between them.
  const wide = useWide();

  const draw = (t: number) => {
    if (deck && wide) {
      const el = cv.current;
      if (!el || !rigW) return;
      const w = rigW;
      const rw = Math.round(w * 0.42);
      const pw = w - rw - 24;
      const ph = Math.round((pw * 420) / 520);
      const h = ph + 64;
      const c = fit(el, w, h);
      if (!c) return;
      c.clearRect(0, 0, w, h);
      const k = Math.min((rw - 32) / 400, (h - 60) / 300);
      drawRig(c, rw / 2 + 4, h / 2 + 30 * k, k, t, 20, h - 18);
      drawPage(c, rw, 20, pw, ph, t);
      return;
    }
    if (deck) {
      const rc = cv.current;
      if (rc && rigW) {
        const w = rigW;
        const h = Math.round(w * 1.05);
        const c = fit(rc, w, h);
        if (c) {
          c.clearRect(0, 0, w, h);
          const k = Math.min((w - 24) / 390, (h - 60) / 300);
          drawRig(c, w / 2, h / 2 + 30 * k, k, t, 20, h - 18);
        }
      }
      const pc = pageCv.current;
      if (pc && pageW) {
        const pw = pageW - 40;
        const ph = Math.round((pw * 420) / 520);
        const c = fit(pc, pageW, ph + 64);
        if (c) {
          c.clearRect(0, 0, pageW, ph + 64);
          drawPage(c, 20, 20, pw, ph, t);
        }
      }
      return;
    }
    const el = cv.current;
    if (!el) return;
    const c = fit(el, W, H);
    if (!c) return;
    c.clearRect(0, 0, W, H);
    drawRig(c, 250, 280, 1, t, 32, 470);
    drawPage(c, 520, 34, 520, 420, t);
  };

  useEffect(() => {
    // A still frame with every panel rendered (also the reduced-motion view).
    draw(reduced ? 3 * 2.2 + 1.5 : 0);
    const onResize = () => draw(reduced ? 3 * 2.2 + 1.5 : 0);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced, rigW, pageW, wide]);

  useLoop(active && !reduced, (t) => draw(t));

  const offsets = copy.groups.map((_, gi) => copy.groups.slice(0, gi).reduce((a, g) => a + g.items.length, 0));
  const list = copy.groups.map((g, gi) => (
    <div key={g.name}>
      <div className={s.grp}>
        {status.prog}
        <span>{g.name}</span>
        <span className={s.count}>{g.items.length}</span>
      </div>
      {g.items.map((it, ii) => {
        const n = offsets[gi] + ii;
        const st = n < cur ? status.done : n === cur ? status.prog : status.todo;
        return (
          <div key={it} className={s.li}>
            <span className={s.pid}>SHZ-{201 + n}</span>
            {st}
            <span>{it}</span>
          </div>
        );
      })}
      <div style={{ height: 6 }} />
    </div>
  ));

  if (deck && wide) {
    return (
      <Deck names={[copy.engine, deckPanels.shizuku[2]]} label={label ?? ""} span={[true, true]}>
        <Card title={copy.engine} sub={`${nodeSub(project, "engine")} · ${copy.engineNote}`} note={systemsCopy.simulated} flush>
          <div ref={rigBox}>
            <canvas ref={cv} aria-hidden />
          </div>
        </Card>
        <Card title={deckPanels.shizuku[2]} note={systemsCopy.simulated} flush>
          <div className={s.dList}>{list}</div>
        </Card>
      </Deck>
    );
  }

  if (deck) {
    return (
      <Deck names={deckPanels.shizuku} label={label ?? ""}>
        <Card title={copy.engine} sub={nodeSub(project, "engine")} note={systemsCopy.simulated} flush>
          <div ref={rigBox}>
            <canvas ref={cv} aria-hidden />
          </div>
        </Card>
        <Card title={deckPanels.shizuku[1]} sub={copy.engineNote} note={systemsCopy.simulated} flush>
          <div ref={pageBox}>
            <canvas ref={pageCv} aria-hidden />
          </div>
        </Card>
        <Card title={deckPanels.shizuku[2]} note={systemsCopy.simulated} flush>
          <div className={s.dList}>{list}</div>
        </Card>
      </Deck>
    );
  }

  return (
    <div className={s.c4Stage}>
      <div className={`${s.frame} ${s.c4Frame}`}>
        <div className={s.panel}>
          <div className={s.grain} />
          <div style={{ height: 12 }} />
          {list}
        </div>
      </div>
      <div className={s.diff}>
        <div className={s.diffHead}>
          <b>{copy.engine}</b>
          <span>
            {nodeSub(project, "engine")} · {copy.engineNote}
          </span>
          <span className={s.sim} style={{ marginLeft: "auto", marginRight: 560 }}>
            {systemsCopy.simulated}
          </span>
        </div>
        <canvas ref={cv} aria-hidden />
        <div className={s.grain} style={{ opacity: 0.6 }} />
        <div className={s.shine} />
      </div>
    </div>
  );
}
