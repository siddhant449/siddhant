"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { commerceCopy as copy, garments, nodeSub, projectAt, systemsCopy } from "@/lib/copy/systems";
import s from "./systems.module.css";
import { fit, rng, useEvery, useLoop, type FigureProps } from "./use-figure";

/*
  Linear "Planning" geometry: a catalogue timeline behind (rows being tagged),
  a floating panel in front. The panel is visual search: a query (a photo or
  words) lands in a CLIP-style point cloud, its nearest neighbours light up and
  the ranked results fill in. Garments are The Met Open Access photographs.
*/

const W = 470;
const H = 290;
const ROW_Y = (i: number) => 68 + i * 76;

type Pt = [number, number, number];

function buildCloud() {
  const r = rng(7);
  const n = garments.length;
  const centers: Pt[] = garments.map((_, i) => {
    const a = (i / n) * Math.PI * 2;
    return [Math.cos(a) * 0.75 + (r() - 0.5) * 0.3, (r() - 0.5) * 0.9, Math.sin(a) * 0.75 + (r() - 0.5) * 0.3];
  });
  const pts: Pt[] = [];
  for (let i = 0; i < 600; i++) {
    const c = centers[i % n];
    const g = () => (r() + r() + r() - 1.5) * 0.3;
    pts.push([c[0] + g(), c[1] + g(), c[2] + g()]);
  }
  return { centers, pts };
}

function proj(p: Pt, a: number): [number, number, number, number] {
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const x = p[0] * ca - p[2] * sa;
  const z = p[0] * sa + p[2] * ca;
  const y = p[1] * Math.cos(0.35) - z * Math.sin(0.35);
  const zz = p[1] * Math.sin(0.35) + z * Math.cos(0.35);
  const k = 2.6 / (2.6 - zz);
  return [W / 2 + x * 128 * k, H / 2 + y * 118 * k, k, zz];
}

export default function FigureCommerce({ active, reduced }: FigureProps) {
  const project = projectAt(1);
  const { centers, pts } = useMemo(() => buildCloud(), []);
  const r = useRef(rng(31));

  // Catalogue: one tag appears per beat; a row completes, the scan moves on.
  const [tagState, setTagState] = useState({ cur: 2, sub: 0 });
  useEvery(active && !reduced, 550, () => {
    setTagState(({ cur, sub }) =>
      sub < garments[cur].tags.length ? { cur, sub: sub + 1 } : { cur: (cur + 1) % garments.length, sub: 0 },
    );
  });

  // Query: alternates photo / words, picks a garment cluster.
  const [query, setQuery] = useState({ n: 1, k: 0, q: [0, 0, 0] as Pt, nn: [] as number[] });
  const qT = useRef(reduced ? 2 : 0);
  const newQuery = (n: number) => {
    const k = Math.floor(r.current() * garments.length);
    const c = centers[k];
    const q: Pt = [c[0] + (r.current() - 0.5) * 0.15, c[1] + (r.current() - 0.5) * 0.15, c[2] + (r.current() - 0.5) * 0.15];
    const nn = pts
      .map((p, i) => [i, (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2 + (p[2] - q[2]) ** 2] as const)
      .sort((a, b) => a[1] - b[1])
      .slice(0, 8)
      .map((a) => a[0]);
    qT.current = reduced ? 2 : 0;
    setQuery({ n, k, q, nn });
  };
  useEffect(() => {
    newQuery(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const order = useMemo(() => {
    const d = (x: number) => centers[x].reduce((acc, v, j) => acc + (v - centers[query.k][j]) ** 2, 0);
    return [query.k, ...garments.map((_, i) => i).filter((i) => i !== query.k).sort((a, b) => d(a) - d(b))];
  }, [centers, query.k]);

  const cv = useRef<HTMLCanvasElement>(null);
  const tiers = useRef<HTMLDivElement>(null);
  const results = useRef<HTMLDivElement>(null);

  const draw = (t: number) => {
    const el = cv.current;
    if (!el || !query.nn.length) return;
    const c = fit(el, W, H);
    if (!c) return;
    const a = t * 0.12 + 0.6;
    c.clearRect(0, 0, W, H);
    c.strokeStyle = "rgba(255,255,255,.05)";
    c.setLineDash([2, 4]);
    for (let y = 20; y < H; y += 68) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(W, y);
      c.stroke();
    }
    c.setLineDash([]);
    const P = pts.map((p) => proj(p, a));
    const hot = new Set(query.nn);
    const qt = qT.current;
    const k = Math.min(1, qt / 0.9);
    const qp = proj(query.q, a);
    if (k > 0) {
      c.strokeStyle = `rgba(255,58,26,${0.5 * k})`;
      c.lineWidth = 1;
      query.nn.forEach((i, j) => {
        if (j / 8 < k) {
          c.beginPath();
          c.moveTo(qp[0], qp[1]);
          c.lineTo(P[i][0], P[i][1]);
          c.stroke();
        }
      });
    }
    P.forEach((p, i) => {
      const h = hot.has(i) && k > 0.2;
      c.fillStyle = h ? "#ff3a1a" : `rgba(196,183,180,${0.22 + (0.5 * (p[3] + 1)) / 2})`;
      c.beginPath();
      c.arc(p[0], p[1], (h ? 3.2 : 1.8) * p[2], 0, 7);
      c.fill();
    });
    const ring = qt % 1.6;
    c.strokeStyle = `rgba(246,239,237,${Math.max(0, 0.8 - ring / 1.6)})`;
    c.beginPath();
    c.arc(qp[0], qp[1], 8 + ring * 14, 0, 7);
    c.stroke();
    c.fillStyle = "#f6efed";
    c.beginPath();
    c.arc(qp[0], qp[1], 4, 0, 7);
    c.fill();

    const on = Math.min(8, Math.floor(qt * 6));
    tiers.current?.querySelectorAll("i").forEach((e, i) => {
      e.dataset.on = i < on ? (i === on - 1 && qt < 1.6 ? "hot" : "on") : "";
    });
    const ro = Math.min(6, Math.floor(Math.max(0, qt - 0.5) * 7));
    results.current?.querySelectorAll<HTMLElement>("[data-res]").forEach((e, i) => {
      e.dataset.on = i < ro ? "1" : "";
      e.dataset.top = i === 0 && ro > 0 ? "1" : "";
    });
  };

  useEffect(() => {
    draw(0);
    const onResize = () => draw(0);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  useLoop(active && !reduced, (t, dt) => {
    qT.current += dt;
    if (qT.current > 4) newQuery(query.n + 1);
    draw(t);
  });

  const photo = query.n % 2 === 1;
  const g = garments[query.k];

  return (
    <div className={s.c2Stage}>
      <div className={s.timeline}>
        <div className={s.panel}>
          <div className={s.grain} />
          <div className={s.catHead}>
            <span>{copy.catalogue}</span>
            <span>{copy.tagsHead}</span>
            <span>{copy.status}</span>
            <span className={s.sim} style={{ marginLeft: "auto", marginRight: 720, width: "auto" }}>
              {systemsCopy.simulated}
            </span>
          </div>
          <div className={s.scan} style={{ transform: `translateY(${ROW_Y(tagState.cur) - 4}px)` }} />
          {garments.map((item, i) => {
            const done = i < tagState.cur;
            const shown = i === tagState.cur ? tagState.sub : done ? item.tags.length : 0;
            const label = i === tagState.cur && tagState.sub > 0 ? copy.tagging : done ? copy.tagged : copy.queued;
            return (
              <div key={item.id} className={s.sku} style={{ top: ROW_Y(i) }}>
                <div className={s.thumb}>
                  <Image src={item.src} alt="" width={240} height={320} unoptimized />
                </div>
                <div className={s.skuName}>SKU {4100 + i * 37}</div>
                <div className={s.tags}>
                  {item.tags.map((t, j) => (
                    <span key={t} className={`${s.chip} ${s.tag} ${j < shown ? s.tagOn : ""}`}>
                      {t}
                    </span>
                  ))}
                </div>
                <div className={`${s.status} ${label === copy.tagged ? s.statusOk : ""}`}>{label}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className={`${s.box} ${s.vs}`}>
        <div className={s.grain} style={{ opacity: 0.9 }} />
        <div className={s.vsHead}>
          {copy.searchTitle}
          <span>
            {nodeSub(project, "embed").split(" · ")[0]} · {nodeSub(project, "index")}
          </span>
        </div>
        <div className={s.query}>
          <div className={s.qImg}>
            <Image key={g.id} src={g.src} alt="" width={240} height={320} unoptimized style={{ opacity: photo ? 1 : 0 }} />
            <div className={s.words} style={{ opacity: photo ? 0 : 1 }}>
              {copy.wordsQuery}
              <span className={s.caret} />
            </div>
          </div>
          <div className={s.qCap}>{photo ? copy.queryPhoto : copy.queryWords}</div>
        </div>
        <canvas ref={cv} className={s.cloud} aria-hidden />
        <div className={s.rank}>
          <div className={s.rankHead}>
            <span>{copy.nearest}</span>
            <span>Ranked in {nodeSub(project, "rank")}</span>
          </div>
          <div ref={results} className={s.results}>
            {order.map((gi) => (
              <div key={garments[gi].id} data-res className={s.res}>
                <Image src={garments[gi].src} alt="" width={240} height={320} unoptimized />
              </div>
            ))}
          </div>
          <div ref={tiers} className={s.tiers}>
            {Array.from({ length: 8 }, (_, i) => (
              <i key={i} />
            ))}
          </div>
        </div>
        <div className={s.shine} />
      </div>
    </div>
  );
}
