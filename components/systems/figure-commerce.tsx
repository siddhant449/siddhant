"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { commerceCopy as copy, deckPanels, garments, nodeSub, projectAt, systemsCopy } from "@/lib/copy/systems";
import { Card, Deck } from "./deck";
import { bake, spriteCache } from "./pixel";
import { GARMENT_SPRITES, GW, RIM } from "./sprites-garments";
import s from "./systems.module.css";
import { fit, rng, useEvery, useLoop, useWidth, type FigureProps } from "./use-figure";

/*
  Linear "Planning" geometry: a catalogue timeline behind (rows being tagged),
  a floating panel in front. The panel is visual search: a query (a photo or
  words) lands in a CLIP-style point cloud, its nearest neighbours light up and
  the ranked results fill in. Garments are hand-made pixel sprites
  (sprites-garments.ts), shown at whole-number scales.
*/

const cache = spriteCache();

/** One garment sprite on a canvas at sprite resolution, scaled up by CSS with nearest-neighbour. */
function Garment({ id, scale }: { id: string; scale: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const sp = GARMENT_SPRITES[id];
  const w = GW + 2;
  const h = sp.rows.length + 2;
  useEffect(() => {
    const c = ref.current?.getContext("2d");
    if (!c) return;
    c.clearRect(0, 0, w, h);
    c.drawImage(
      cache(id, () => bake(w, h, [{ rows: sp.rows, roles: sp.roles, x: 1, y: 1 }], RIM)),
      0,
      0,
    );
  }, [id, sp, w, h]);
  return <canvas ref={ref} width={w} height={h} className={s.px} style={{ width: w * scale, height: h * scale }} aria-hidden />;
}

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

/** Project a point into a w × h view (the stage's 470 × 290 by default; the deck's own size). */
function proj(p: Pt, a: number, w = W, h = H): [number, number, number, number] {
  const f = Math.min(w / W, h / H);
  const ca = Math.cos(a);
  const sa = Math.sin(a);
  const x = p[0] * ca - p[2] * sa;
  const z = p[0] * sa + p[2] * ca;
  const y = p[1] * Math.cos(0.35) - z * Math.sin(0.35);
  const zz = p[1] * Math.sin(0.35) + z * Math.cos(0.35);
  const k = 2.6 / (2.6 - zz);
  return [w / 2 + x * 128 * k * f, h / 2 + y * 118 * k * f, k, zz];
}

export default function FigureCommerce({ active, reduced, deck, label }: FigureProps) {
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
    // Photo queries pick a garment; the words query ("ivory dress, puffed sleeves") is the first.
    const k = n % 2 === 1 ? Math.floor(r.current() * garments.length) : 0;
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
  const cloudBox = useRef<HTMLDivElement>(null);
  const cloudW = useWidth(cloudBox, !!deck);
  // The deck's cloud spans its panel; the stage keeps 470 × 290.
  const cw = deck ? cloudW || W : W;
  const chh = deck ? Math.round(Math.min(260, Math.max(170, cw * 0.56))) : H;
  const tiers = useRef<HTMLDivElement>(null);
  const results = useRef<HTMLDivElement>(null);

  const draw = (t: number) => {
    const el = cv.current;
    if (!el || !query.nn.length) return;
    const c = fit(el, cw, chh);
    if (!c) return;
    const a = t * 0.12 + 0.6;
    c.clearRect(0, 0, cw, chh);
    c.strokeStyle = "rgba(255,255,255,.05)";
    c.setLineDash([2, 4]);
    for (let y = 20; y < chh; y += 68) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(cw, y);
      c.stroke();
    }
    c.setLineDash([]);
    const P = pts.map((p) => proj(p, a, cw, chh));
    const hot = new Set(query.nn);
    const qt = qT.current;
    const k = Math.min(1, qt / 0.9);
    const qp = proj(query.q, a, cw, chh);
    if (k > 0) {
      c.strokeStyle = `rgba(157, 124, 255,${0.5 * k})`;
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
      c.fillStyle = h ? "#9d7cff" : `rgba(196,183,180,${0.22 + (0.5 * (p[3] + 1)) / 2})`;
      c.beginPath();
      c.arc(p[0], p[1], (h ? 3.2 : 1.8) * p[2], 0, 7);
      c.fill();
    });
    const ring = qt % 1.6;
    c.strokeStyle = `rgba(246,239,237,${Math.max(0, 0.8 - ring / 1.6)})`;
    c.beginPath();
    c.arc(qp[0], qp[1], 8 + ring * 14, 0, 7);
    c.stroke();
    c.fillStyle = "#ece9f3";
    c.beginPath();
    c.arc(qp[0], qp[1], 4, 0, 7);
    c.fill();

    const on = Math.min(8, Math.floor(qt * 6));
    // Attributes are written only when they change: each write restyles the element.
    const set = (e: HTMLElement, k: "on" | "top", v: string) => {
      if (e.dataset[k] !== v) e.dataset[k] = v;
    };
    tiers.current?.querySelectorAll("i").forEach((e, i) => {
      set(e, "on", i < on ? (i === on - 1 && qt < 1.6 ? "hot" : "on") : "");
    });
    const ro = Math.min(garments.length, Math.floor(Math.max(0, qt - 0.5) * 7));
    results.current?.querySelectorAll<HTMLElement>("[data-res]").forEach((e, i) => {
      set(e, "on", i < ro ? "1" : "");
      set(e, "top", i === 0 && ro > 0 ? "1" : "");
    });
  };

  useEffect(() => {
    draw(0);
    const onResize = () => draw(0);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, cw]);

  useLoop(active && !reduced, (t, dt) => {
    qT.current += dt;
    if (qT.current > 4) newQuery(query.n + 1);
    draw(t);
  });

  const photo = query.n % 2 === 1;
  const g = garments[query.k];

  const rowLabel = (i: number) => {
    const done = i < tagState.cur;
    const shown = i === tagState.cur ? tagState.sub : done ? garments[i].tags.length : 0;
    const label = i === tagState.cur && tagState.sub > 0 ? copy.tagging : done ? copy.tagged : copy.queued;
    return { shown, label };
  };

  if (deck) {
    return (
      <Deck names={deckPanels.commerce} label={label ?? ""}>
        <Card title={copy.searchTitle} note={systemsCopy.simulated}>
          <div className={s.dQuery}>
            <div className={s.qImg}>
              <div className={s.qPhoto} style={{ opacity: photo ? 1 : 0 }}>
                <Garment key={g.id} id={g.id} scale={5} />
              </div>
              <div className={s.words} style={{ opacity: photo ? 0 : 1 }}>
                {copy.wordsQuery}
                <span className={s.caret} />
              </div>
            </div>
            <div className={s.dSpec}>
              <b>{photo ? copy.queryPhoto : copy.queryWords}</b>
              <span>
                {nodeSub(project, "embed").split(" · ")[0]} · {nodeSub(project, "index")}
              </span>
              <span>Ranked in {nodeSub(project, "rank")}</span>
            </div>
          </div>
          <div ref={cloudBox} className={s.dCloud}>
            <canvas ref={cv} aria-hidden />
          </div>
          <div className={s.dRank}>
            <div className={s.rankHead}>
              <span>{copy.nearest}</span>
            </div>
            <div ref={results} className={s.results}>
              {order.map((gi) => (
                <div key={garments[gi].id} data-res className={s.res}>
                  <Garment id={garments[gi].id} scale={2} />
                </div>
              ))}
            </div>
            <div ref={tiers} className={s.tiers}>
              {Array.from({ length: 8 }, (_, i) => (
                <i key={i} />
              ))}
            </div>
          </div>
        </Card>
        <Card title={copy.catalogue} sub={copy.tagsHead} note={systemsCopy.simulated} flush>
          {garments.map((item, i) => {
            const { shown, label: st } = rowLabel(i);
            return (
              <div key={item.id} className={s.dRow} data-cur={i === tagState.cur ? "" : undefined}>
                <div className={s.thumb}>
                  <Garment id={item.id} scale={2} />
                </div>
                <div>
                  <div className={s.dRowMeta}>
                    <span>SKU {4100 + i * 37}</span>
                    <span className={`${s.status} ${st === copy.tagged ? s.statusOk : ""}`}>{st}</span>
                  </div>
                  <div className={s.tags}>
                    {item.tags.map((t, j) => (
                      <span key={t} className={`${s.chip} ${s.tag} ${j < shown ? s.tagOn : ""}`}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </Card>
      </Deck>
    );
  }

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
                  <Garment id={item.id} scale={2} />
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
            <div className={s.qPhoto} style={{ opacity: photo ? 1 : 0 }}>
              <Garment key={g.id} id={g.id} scale={6} />
            </div>
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
                <Garment id={garments[gi].id} scale={2} />
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
