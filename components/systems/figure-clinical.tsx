"use client";

import { useEffect, useRef, useState } from "react";
import { clinicalCopy as copy, factNumber, projectAt, systemsCopy } from "@/lib/copy/systems";
import s from "./systems.module.css";
import { fit, rng, useEvery, useLoop, type FigureProps } from "./use-figure";

/*
  Linear "Intake" geometry: a board of the message path behind, a floating
  card in front. Messages move Received → Service Bus → Delivered in sequence
  order; every sixth goes to the dead-letter column and is replayed. The card
  runs the automated test suite as a grid of dots (one per test).
*/

type Msg = { seq: number; tenant: string; topic: string; dlq?: boolean; note?: "retry" | "replayed" };
type Board = [Msg[], Msg[], Msg[], Msg[]];

const X0 = 377;
const PITCH = 312;
const Y0 = 66;
const ROW = 108;

const icons = [
  <svg key="o" viewBox="0 0 14 14" fill="none" stroke="#8e8481" strokeWidth="1.4" aria-hidden><circle cx="7" cy="7" r="5.5" /></svg>,
  <svg key="h" viewBox="0 0 14 14" fill="none" aria-hidden><circle cx="7" cy="7" r="5.5" stroke="#c4b7b4" strokeWidth="1.4" /><path d="M7 7V1.5A5.5 5.5 0 0 1 12.5 7Z" fill="#c4b7b4" /></svg>,
  <svg key="d" viewBox="0 0 14 14" aria-hidden><circle cx="7" cy="7" r="6.2" fill="#c4b7b4" /><path d="M4.3 7.2 6.2 9l3.6-3.8" stroke="#161210" strokeWidth="1.5" fill="none" /></svg>,
  <svg key="x" viewBox="0 0 14 14" fill="none" aria-hidden><circle cx="7" cy="7" r="5.5" stroke="#ff3a1a" strokeWidth="1.4" strokeDasharray="2 2" /></svg>,
];

function seedBoard(): { board: Board; seq: number } {
  const r = rng(11);
  let seq = 18240;
  const mk = (): Msg => {
    seq += 1;
    return { seq, tenant: String(1 + Math.floor(r() * 14)).padStart(2, "0"), topic: copy.topics[seq % copy.topics.length] };
  };
  const board: Board = [[mk(), mk(), mk()], [mk(), mk()], [mk(), mk(), mk(), mk()].reverse(), [{ ...mk(), dlq: true, note: "retry" }]];
  return { board, seq };
}

export default function FigureClinical({ active, reduced }: FigureProps) {
  const total = factNumber(projectAt(0), "Automated tests") || 1313;
  const [state, setState] = useState(seedBoard);
  const step = useRef(0);
  const r = useRef(rng(23));

  useEvery(active && !reduced, 1350, () => {
    step.current += 1;
    const n = step.current;
    setState(({ board, seq }) => {
      const [rec, bus, del, dlq] = board.map((c) => [...c]) as Board;
      if (bus.length) {
        const m = bus.shift()!;
        if (n % 6 === 0 && dlq.length < 2) dlq.push({ ...m, dlq: true, note: "retry" });
        else del.unshift({ ...m, dlq: false });
      }
      if (n % 6 === 3 && dlq.length) bus.push({ ...dlq.shift()!, note: "replayed" });
      if (rec.length) bus.push(rec.shift()!);
      let next = seq;
      while (rec.length < 3) {
        next += 1;
        rec.push({ seq: next, tenant: String(1 + Math.floor(r.current() * 14)).padStart(2, "0"), topic: copy.topics[next % copy.topics.length] });
      }
      while (del.length > 7) del.pop();
      return { board: [rec, bus, del, dlq], seq: next };
    });
  });

  // Test grid: one rounded dot per automated test.
  const cv = useRef<HTMLCanvasElement>(null);
  const pass = useRef<HTMLElement>(null);
  const bar = useRef<HTMLElement>(null);
  const C = 41;
  const P = 10.5;
  const S = 7;
  const W = C * P;
  const H = Math.ceil(total / C) * P;
  const rank = useRef<Float32Array | null>(null);
  const run = useRef(0);

  const draw = (p: number) => {
    const el = cv.current;
    if (!el) return;
    if (!rank.current) {
      const rr = rng(5);
      const order = Array.from({ length: total }, (_, i) => i).sort(() => rr() - 0.5);
      rank.current = new Float32Array(total);
      order.forEach((k, i) => (rank.current![k] = i / total));
    }
    const c = fit(el, W, H);
    if (!c) return;
    c.clearRect(0, 0, W, H);
    for (let i = 0; i < total; i++) {
      const v = rank.current[i];
      c.fillStyle = v < p - 0.012 ? "rgba(196,183,180,.78)" : v < p ? "#ff3a1a" : "rgba(255,255,255,.07)";
      c.beginPath();
      c.roundRect((i % C) * P, Math.floor(i / C) * P, S, S, 1.6);
      c.fill();
    }
    if (pass.current) pass.current.textContent = Math.min(total, Math.round(p * total)).toLocaleString("en-US");
    if (bar.current) bar.current.style.transform = `scaleX(${p})`;
  };

  useEffect(() => {
    draw(reduced ? 1 : run.current);
    const onResize = () => draw(reduced ? 1 : Math.min(1, run.current));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  useLoop(active && !reduced, (_t, dt) => {
    run.current += dt / 7.5;
    if (run.current > 1.25) run.current = 0;
    draw(Math.min(1, run.current));
  });

  const { board } = state;
  return (
    <>
      <div className={`${s.frame} ${s.c1Frame}`}>
        <div className={s.panel} style={{ opacity: 0.85 }}>
          <div className={s.grain} />
          {copy.columns.map((name, i) => (
            <div key={name} className={s.colHead} style={{ left: X0 + i * PITCH }}>
              {icons[i]}
              <span>{name}</span>
              <span className={s.count}>{board[i].length}</span>
            </div>
          ))}
          {board.flatMap((col, ci) =>
            col.map((m, ri) => (
              <div
                key={m.seq}
                className={`${s.msg} ${m.dlq ? s.msgDlq : ""}`}
                style={{ transform: `translate(${X0 + ci * PITCH}px, ${Y0 + ri * ROW}px)`, opacity: ri > 4 ? 0 : 1 }}
              >
                <div className={s.msgId}>
                  <span>MSG-{m.seq}</span>
                  <span>seq {m.seq}</span>
                </div>
                <div className={s.msgTitle}>{m.topic}</div>
                <div className={s.msgRow}>
                  <span className={s.chip}>
                    <i className={s.dot} />
                    {copy.tenant} {m.tenant}
                  </span>
                  <span className={s.chip}>{copy.rls}</span>
                  {m.note ? (
                    <span className={s.chip}>
                      <i className={`${s.dot} ${s.dotHot}`} />
                      {m.note === "retry" ? copy.retry : copy.replayed}
                    </span>
                  ) : null}
                </div>
              </div>
            )),
          )}
        </div>
      </div>
      <div className={`${s.box} ${s.tests}`}>
        <div className={s.grain} style={{ opacity: 0.9 }} />
        <div className={s.boxHead}>
          <svg className={s.ico} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
            <rect x="2" y="2" width="6" height="6" rx="1.5" />
            <rect x="10" y="2" width="6" height="6" rx="1.5" />
            <rect x="2" y="10" width="6" height="6" rx="1.5" />
            <rect x="10" y="10" width="6" height="6" rx="1.5" />
          </svg>
          <span className={s.boxName}>{copy.testsTitle}</span>
          <span className={s.boxSub}>{copy.testsSub}</span>
          <span className={s.sim} style={{ marginLeft: "auto" }}>
            {copy.testsRun}
          </span>
        </div>
        <canvas ref={cv} />
        <div className={s.testsFoot}>
          <div className={s.testsBig}>
            <b ref={pass}>0</b> of {total.toLocaleString("en-US")} {copy.passing}
          </div>
          <div className={s.bar}>
            <i ref={bar} style={{ transform: "scaleX(0)" }} />
          </div>
        </div>
        <div className={s.shine} style={{ "--sx": "100%", "--sy": "9%" } as React.CSSProperties} />
      </div>
      <span className="sr-only">{systemsCopy.simulated}</span>
    </>
  );
}
