"use client";

import { useEffect, useRef, useState } from "react";
import { nodeSub, projectAt, shizukuCopy as copy, systemsCopy } from "@/lib/copy/systems";
import s from "./systems.module.css";
import { fit, monoFont, useEvery, useLoop, type FigureProps } from "./use-figure";

/*
  Linear "Build, review, and ship" geometry: a list panel behind, a wide
  panel over it. The list is the three pipelines (layout, panels, voice); the
  panel is the 2.5D engine: three characters on a grid, a camera orbiting,
  and the same scene rendered into four manga panels from four cameras.
*/

const W = 1344;
const H = 498;
const CAMS = [0.35, 1.25, 2.6, -0.7];
const CHARS = [
  { x: 2.2, z: 3.0, h: 1.7, c: "#f6efed" },
  { x: 4.6, z: 4.4, h: 1.55, c: "#c4b7b4" },
  { x: 5.6, z: 2.2, h: 1.8, c: "#ff3a1a" },
];

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

function drawScene(c: CanvasRenderingContext2D, cx: number, cy: number, sc: number, ang: number, tilt: number, alpha: number) {
  const G = 8;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const P = (x: number, y: number, z: number): [number, number, number] => {
    x -= G / 2;
    z -= G / 2;
    const rx = x * ca - z * sa;
    const rz = x * sa + z * ca;
    return [cx + rx * sc, cy + rz * Math.sin(tilt) * sc - y * sc * Math.cos(tilt), rz];
  };
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
  const order = CHARS.map((ch) => ({ ch, d: P(ch.x, 0, ch.z)[2] })).sort((a, b) => a.d - b.d);
  for (const { ch } of order) {
    const w = 0.32;
    const base = [P(ch.x - w, 0, ch.z - w), P(ch.x + w, 0, ch.z - w), P(ch.x + w, 0, ch.z + w), P(ch.x - w, 0, ch.z + w)];
    const top = [P(ch.x - w, ch.h, ch.z - w), P(ch.x + w, ch.h, ch.z - w), P(ch.x + w, ch.h, ch.z + w), P(ch.x - w, ch.h, ch.z + w)];
    c.fillStyle = "rgba(0,0,0,.35)";
    c.beginPath();
    base.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
    c.fill();
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      c.fillStyle = ch.c;
      c.globalAlpha = alpha * (0.35 + 0.15 * i);
      c.beginPath();
      c.moveTo(base[i][0], base[i][1]);
      c.lineTo(base[j][0], base[j][1]);
      c.lineTo(top[j][0], top[j][1]);
      c.lineTo(top[i][0], top[i][1]);
      c.closePath();
      c.fill();
    }
    c.globalAlpha = alpha * 0.95;
    c.beginPath();
    top.forEach((p, i) => (i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])));
    c.fill();
    const hd = P(ch.x, ch.h + 0.38, ch.z);
    c.beginPath();
    c.arc(hd[0], hd[1], sc * 0.26, 0, 7);
    c.fill();
    c.globalAlpha = alpha;
  }
  c.globalAlpha = 1;
}

export default function FigureShizuku({ active, reduced }: FigureProps) {
  const project = projectAt(3);
  const items = copy.groups.flatMap((g) => g.items);
  const [cur, setCur] = useState(reduced ? 3 : 0);
  useEvery(active && !reduced, 1100, () => setCur((c) => (c + 1) % (items.length + 2)));

  const cv = useRef<HTMLCanvasElement>(null);
  const draw = (t: number) => {
    const el = cv.current;
    if (!el) return;
    const c = fit(el, W, H);
    if (!c) return;
    c.clearRect(0, 0, W, H);
    drawScene(c, 250, 280, 30, 0.62, 0.55, 1);
    c.strokeStyle = "rgba(255,255,255,.08)";
    c.setLineDash([3, 5]);
    c.beginPath();
    c.ellipse(250, 280, 190, 190 * Math.sin(0.55), 0, 0, 7);
    c.stroke();
    c.setLineDash([]);
    const ci = Math.floor(t / 2.2) % 4;
    const cA = CAMS[ci];
    const camX = 250 + Math.cos(-cA + 0.62 - Math.PI / 2) * 190;
    const camY = 280 + Math.sin(-cA + 0.62 - Math.PI / 2) * 190 * Math.sin(0.55);
    c.strokeStyle = "rgba(255,58,26,.5)";
    c.beginPath();
    c.moveTo(camX, camY);
    c.lineTo(210, 280);
    c.moveTo(camX, camY);
    c.lineTo(290, 280);
    c.stroke();
    c.fillStyle = "#ff3a1a";
    c.beginPath();
    c.roundRect(camX - 7, camY - 5, 14, 10, 2);
    c.fill();
    c.fillStyle = "#8e8481";
    c.font = monoFont(12);
    c.fillText(`${copy.camera.toUpperCase()} ${ci + 1} / 4`, 32, 470);
    const px = 520;
    const py = 34;
    const pw = 520;
    const ph = 420;
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
      if (k > 0) drawScene(c, x + w / 2, y + h * 0.62, Math.min(w, h) / 9.5, CAMS[i], 0.5, k);
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
    c.fillText(copy.page.toUpperCase(), px, py + ph + 26);
  };

  useEffect(() => {
    // A still frame with every panel rendered (also the reduced-motion view).
    draw(reduced ? 3 * 2.2 + 1.5 : 0);
    const onResize = () => draw(reduced ? 3 * 2.2 + 1.5 : 0);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [reduced]);

  useLoop(active && !reduced, (t) => draw(t));

  const offsets = copy.groups.map((_, gi) => copy.groups.slice(0, gi).reduce((a, g) => a + g.items.length, 0));
  return (
    <div className={s.c4Stage}>
      <div className={`${s.frame} ${s.c4Frame}`}>
        <div className={s.panel}>
          <div className={s.grain} />
          <div style={{ height: 12 }} />
          {copy.groups.map((g, gi) => (
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
          ))}
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
