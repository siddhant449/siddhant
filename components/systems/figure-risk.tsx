"use client";

import { useEffect, useRef, useState } from "react";
import { deckPanels, factNumber, nodeSub, projectAt, riskCopy as copy } from "@/lib/copy/systems";
import { Deck } from "./deck";
import s from "./systems.module.css";
import { fit, rng, useEvery, useLoop, useWidth, type FigureProps } from "./use-figure";

/*
  Linear "AI and automations" geometry: four 400×560 windows on a still
  track (measured: the track does not slide). News with sentiment, the
  engineered-feature heat grid, the risk ensemble with its explanation, and
  the mirror feeds with a 90-day strip. All values are simulated.
*/

type News = { id: number; src: string; desk: string; score: number };

function mkNews(id: number, r: () => number): News {
  return { id, src: String(1 + Math.floor(r() * 30)).padStart(2, "0"), desk: copy.desks[id % copy.desks.length], score: r() * 2 - 1 };
}
const shapValues = (r: () => number) => copy.shapFeatures.map((_, i) => (r() * 2 - 1) * (1 - i * 0.12));

const Icon = () => (
  <svg className={s.ico} viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
    <rect x="2.5" y="2.5" width="13" height="13" rx="3" />
    <path d="M6 11.5V9M9 11.5V6.5M12 11.5V8" />
  </svg>
);

function Win({ x, name, tag, deck, children }: { x?: number; name: string; tag: string; deck?: boolean; children: React.ReactNode }) {
  return (
    <div className={deck ? `${s.win} ${s.dWin}` : s.win} style={deck ? undefined : { left: x }}>
      <div className={s.winHead}>
        <Icon />
        {name}
        <span className={s.winTag}>{tag}</span>
      </div>
      <div className={s.winBody}>{children}</div>
    </div>
  );
}

export default function FigureRisk({ active, reduced, deck, label }: FigureProps) {
  const project = projectAt(2);
  const cells = factNumber(project, "Engineered features") || 146;
  const uptime = project.facts.find((f) => f.label.startsWith("Uptime"))?.value ?? "";
  const r = useRef(rng(41));

  const [news, setNews] = useState<News[]>(() => {
    const seed = rng(43);
    return Array.from({ length: 8 }, (_, i) => mkNews(18430 - i, seed));
  });
  useEvery(active && !reduced, 900, () => setNews((n) => [mkNews(n[0].id + 1, r.current), ...n].slice(0, 8)));

  const [shap, setShap] = useState<number[]>(() => shapValues(rng(47)));
  const target = useRef(0.42);
  const score = useRef(0.37);
  useEvery(active && !reduced, 3200, () => {
    target.current = 0.18 + r.current() * 0.6;
    setShap(shapValues(r.current));
  });

  const heat = useRef<Float32Array | null>(null);
  const heatV = useRef<Float32Array | null>(null);
  const heatCv = useRef<HTMLCanvasElement>(null);
  const upCv = useRef<HTMLCanvasElement>(null);
  const scoreEl = useRef<HTMLDivElement>(null);
  const heatBox = useRef<HTMLDivElement>(null);
  const bodyW = useWidth(heatBox, !!deck);
  // Canvas width: the window body (368 on the stage, the panel's own in the deck).
  const BW = deck ? bodyW || 368 : 368;

  const drawHeat = () => {
    const el = heatCv.current;
    if (!el) return;
    if (!heat.current) {
      const hr = rng(3);
      heat.current = new Float32Array(cells).map(() => hr());
      heatV.current = new Float32Array(cells).map(() => hr() * 2 - 1);
    }
    const Wd = BW;
    const Hd = deck ? Math.ceil(cells / 11) * (Wd / 11) * 0.8 : 380;
    const c = fit(el, Wd, Hd);
    if (!c) return;
    c.clearRect(0, 0, Wd, Hd);
    const C = 11;
    const P = Wd / C;
    const PH = P * 0.8;
    for (let i = 0; i < cells; i++) {
      const v = heat.current[i];
      c.fillStyle = v > 0.88 ? "#ff3a1a" : `rgba(196,183,180,${0.06 + v * 0.62})`;
      c.beginPath();
      c.roundRect((i % C) * P + 1, Math.floor(i / C) * PH + 1, P - 4, PH - 4, 3);
      c.fill();
    }
  };
  const drawUp = () => {
    const el = upCv.current;
    if (!el) return;
    const c = fit(el, BW, 54);
    if (!c) return;
    c.clearRect(0, 0, BW, 54);
    const P = BW / 90;
    c.fillStyle = "rgba(196,183,180,.7)";
    for (let i = 0; i < 90; i++) c.fillRect(i * P, 8, P - 1.8, 38);
  };

  useEffect(() => {
    drawHeat();
    drawUp();
    const onResize = () => {
      drawHeat();
      drawUp();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [BW]);

  useLoop(active && !reduced, (_t, dt) => {
    const h = heat.current;
    const v = heatV.current;
    if (h && v) {
      for (let i = 0; i < cells; i++) {
        h[i] += v[i] * dt * 0.18;
        if (h[i] < 0 || h[i] > 1) {
          v[i] *= -1;
          h[i] = Math.max(0, Math.min(1, h[i]));
        }
      }
    }
    drawHeat();
    score.current += (target.current - score.current) * Math.min(1, dt * 2.2);
    const txt = score.current.toFixed(2);
    if (scoreEl.current && scoreEl.current.textContent !== txt) scoreEl.current.textContent = txt;
  });

  const newsBody = (
    <>
      <div className={s.sim} style={{ marginBottom: 12 }}>
        {copy.newsNote} · {nodeSub(project, "sentiment")}
      </div>
      {news.map((n) => (
        <div key={n.id} className={s.news}>
          <div>
            <div className={s.newsA}>
              {copy.article} {n.id.toLocaleString("en-US")}
            </div>
            <div className={s.newsB}>
              {copy.source} {n.src} · {n.desk}
            </div>
          </div>
          <div className={`${s.score} ${n.score < 0 ? s.neg : ""}`}>
            {n.score >= 0 ? "+" : ""}
            {n.score.toFixed(2)}
          </div>
        </div>
      ))}
    </>
  );
  const featBody = (
    <>
      <div ref={heatBox}>
        <canvas ref={heatCv} aria-hidden />
      </div>
      <div className={s.kv} style={{ marginTop: 14 }}>
        <span>{copy.featureStore}</span>
        <b>
          {cells} {copy.live}
        </b>
      </div>
      <div className={s.sim}>{copy.valuesSimulated}</div>
    </>
  );
  const ensBody = (
    <>
      <div className={s.sim}>{copy.scoreNote}</div>
      <div ref={scoreEl} className={s.big}>
        0.37
      </div>
      <div className={s.kv}>
        <span>{copy.explainedWith}</span>
        <b>{nodeSub(project, "explain")}</b>
      </div>
      <div className={s.shap}>
        {copy.shapFeatures.map((f, i) => (
          <div key={f} className={s.shapRow}>
            <span className={s.mono} style={{ fontSize: 11.5 }}>
              {f}
            </span>
            <i className={shap[i] < 0 ? s.shapNeg : ""} style={{ transform: `scaleX(${Math.abs(shap[i])})` }} />
            <span>
              {shap[i] >= 0 ? "+" : ""}
              {shap[i].toFixed(2)}
            </span>
          </div>
        ))}
      </div>
    </>
  );
  const mirrorBody = (
    <>
      <div className={s.kv}>
        <span>{copy.uptime}</span>
        <b>{uptime}</b>
      </div>
      <canvas ref={upCv} aria-hidden />
      <div style={{ marginTop: 18 }} />
      <div className={s.kv}>
        <span>{copy.primary}</span>
        <b>{copy.closed}</b>
      </div>
      <div className={s.kv}>
        <span>{copy.mirrorFeed}</span>
        <b>{copy.standby}</b>
      </div>
      <div className={s.kv}>
        <span>{copy.retrain}</span>
        <b>{nodeSub(project, "retrain")}</b>
      </div>
      <div className={s.sim} style={{ marginTop: 10 }}>
        {copy.strip}
      </div>
    </>
  );

  if (deck) {
    return (
      <Deck names={deckPanels.risk} label={label ?? ""}>
        <Win deck name={copy.news} tag={nodeSub(project, "news")}>
          {newsBody}
        </Win>
        <Win deck name={copy.features} tag={nodeSub(project, "features")}>
          {featBody}
        </Win>
        <Win deck name={copy.ensemble} tag={nodeSub(project, "ensemble")}>
          {ensBody}
        </Win>
        <Win deck name={copy.mirror} tag={nodeSub(project, "mirror")}>
          {mirrorBody}
        </Win>
      </Deck>
    );
  }

  return (
    <div className={s.c3Stage}>
      <div style={{ position: "absolute", left: -151, top: 0 }}>
        <Win x={0} name={copy.news} tag={nodeSub(project, "news")}>
          {newsBody}
        </Win>
        <Win x={412} name={copy.features} tag={nodeSub(project, "features")}>
          {featBody}
        </Win>
        <Win x={824} name={copy.ensemble} tag={nodeSub(project, "ensemble")}>
          {ensBody}
        </Win>
        <Win x={1236} name={copy.mirror} tag={nodeSub(project, "mirror")}>
          {mirrorBody}
        </Win>
      </div>
    </div>
  );
}
