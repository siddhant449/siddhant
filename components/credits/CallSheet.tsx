"use client";

import { useEffect, useId, useMemo, useRef, useState, type FocusEvent, type PointerEvent } from "react";
import { useLenis } from "lenis/react";
import { additionalCrew, callSheet, productions, type Production } from "@/lib/content";
import { keyLight } from "@/lib/keylight";
import styles from "./CallSheet.module.css";

/** What is lit: one cast member's row (and the productions they worked on), or one production's column (and its cast). */
type Lit = { kind: "row"; tool: string } | { kind: "col"; id: string } | null;

type Row = { no: string; tool: string; worked: Partial<Record<string, string>>; days: number };

/** Below this sheet width the grid gives way to the production tab strip. Matches the container query in the CSS. */
const TAB_MODE = 440;

/** The callout stays clear of the nav above and the mini player below (px from the viewport edges). */
const SAFE_TOP = 56;
const SAFE_BOTTOM = 64;

/** The scene each production's column links to, by anchor. */
const SCENE: Record<string, string> = { "#top": "SC.01", "#a-side": "SC.03", "#b-side": "SC.04" };

const pad = (n: number) => String(n).padStart(2, "0");
const code = (i: number) => `P.${pad(i + 1)}`;
const same = (a: Lit, b: Lit) =>
  !!a && !!b && a.kind === b.kind && (a.kind === "row" ? a.tool === (b as { tool: string }).tool : a.id === (b as { id: string }).id);

/* Cast IDs run down the whole sheet, the way a call sheet numbers its cast. */
let counter = 0;
const DEPARTMENTS = callSheet.map((d) => ({
  name: d.name,
  rows: d.cast.map<Row>((c) => ({ no: pad(++counter), tool: c.tool, worked: c.worked, days: Object.keys(c.worked).length })),
}));
const ROWS = DEPARTMENTS.flatMap((d) => d.rows);
const SHARED = ROWS.filter((r) => r.days > 1).length;
const PROD_INDEX = new Map(productions.map((p, i) => [p.id, i]));

/** Runs `fn` now and again (once per frame at most) whenever the page scrolls or resizes. */
function follow(fn: () => void) {
  let raf = 0;
  const schedule = () => {
    if (!raf) raf = requestAnimationFrame(() => ((raf = 0), fn()));
  };
  fn();
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule);
  return () => {
    cancelAnimationFrame(raf);
    window.removeEventListener("scroll", schedule);
    window.removeEventListener("resize", schedule);
  };
}

function castOf(id: string) {
  return ROWS.filter((r) => r.worked[id]);
}

/** The remarks callout beside the grid: the lit row's notes, or the lit production's cast. Visual only; every note is also in its cell. */
function Remarks({ lit }: { lit: Lit }) {
  if (lit?.kind === "row") {
    const row = ROWS.find((r) => r.tool === lit.tool)!;
    const worked = productions.filter((p) => row.worked[p.id]);
    return (
      <>
        <p className={styles.rmHead}>
          <span className={styles.rmCode}>{row.no}</span>
          <span className={styles.rmTitle}>{row.tool}</span>
          <span className={styles.rmCount}>
            W &times; {row.days}
          </span>
        </p>
        <ul className={styles.rmList}>
          {worked.map((p) => (
            <li key={p.id}>
              <span className={styles.rmCode}>{code(PROD_INDEX.get(p.id)!)}</span>
              <span className={styles.rmProd}>{p.title}</span>
              <span className={styles.rmNote}>{row.worked[p.id]}</span>
            </li>
          ))}
        </ul>
      </>
    );
  }
  if (lit?.kind === "col") {
    const i = PROD_INDEX.get(lit.id)!;
    const p = productions[i];
    const cast = castOf(p.id);
    return (
      <>
        <p className={styles.rmHead}>
          <span className={styles.rmCode}>{code(i)}</span>
          <span className={styles.rmTitle}>{p.title}</span>
          <span className={styles.rmWhere}>{p.where}</span>
          <span className={styles.rmCount}>{pad(cast.length)} cast called</span>
        </p>
        <p className={styles.rmCast}>
          {cast.map((r) => (
            <span key={r.tool}>
              <span className={styles.rmCode}>{r.no}</span> {r.tool}
            </span>
          ))}
        </p>
      </>
    );
  }
  return null;
}

/**
 * The stack as a call sheet, a day-out-of-days grid: tools are the cast, numbered and grouped by
 * department; productions are the columns; a condensed W marks every production a tool worked on.
 * Hovering or focusing a name lights its row and its productions (and swings the key light onto
 * it); a production lights its whole cast. Under 440px the grid becomes a strip of production tabs
 * that filters the cast list, with each note shown in full.
 */
/**
 * `lightable` is asked when the light would swing (whether the credits are the scene in play), so a
 * change of scene never re-renders the sheet.
 */
export default function CallSheet({ lightable, onSwing }: { lightable: () => boolean; onSwing: (on: boolean) => void }) {
  const tableId = useId();
  const lenis = useLenis();
  const wrapRef = useRef<HTMLDivElement>(null);
  const rowEls = useRef(new Map<string, HTMLTableRowElement>());
  const colEls = useRef(new Map<string, HTMLTableCellElement>());

  const [hover, setHover] = useState<Lit>(null);
  const [focus, setFocus] = useState<Lit>(null);
  const [pin, setPin] = useState<Lit>(null);
  const [tab, setTab] = useState(productions[0].id);

  const lit = hover ?? focus ?? pin;
  // The callout keeps its last content while it fades out.
  const [shown, setShown] = useState<Lit>(null);
  if (lit && !same(lit, shown)) setShown(lit);
  const calloutRef = useRef<HTMLDivElement>(null);
  const { rows: litRows, cols: litCols } = useMemo(() => {
    const rows = new Set<string>();
    const cols = new Set<string>();
    if (lit?.kind === "row") {
      rows.add(lit.tool);
      Object.keys(ROWS.find((r) => r.tool === lit.tool)?.worked ?? {}).forEach((id) => cols.add(id));
    } else if (lit?.kind === "col") {
      cols.add(lit.id);
      castOf(lit.id).forEach((r) => rows.add(r.tool));
    }
    return { rows, cols };
  }, [lit]);

  // The key light follows what the pointer or the keyboard is on (not a held pin, which may scroll away).
  const swing = hover ?? focus;
  const swingKey = swing ? `${swing.kind}:${swing.kind === "row" ? swing.tool : swing.id}` : "";
  useEffect(() => {
    if (!swingKey || !lightable()) return;
    const wrap = wrapRef.current;
    if (!wrap || wrap.clientWidth < TAB_MODE) return;
    const [kind, key] = [swingKey.slice(0, 3), swingKey.slice(4)];
    const el = kind === "row" ? rowEls.current.get(key) : colEls.current.get(key);
    const table = el?.closest("table");
    if (!el || !table) return;
    let held = false;
    const aim = () => {
      const r = el.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      // Scrolled out of view (say, a focused row left behind): hand the light back to the scene.
      const mid = r.top + r.height / 2;
      const inView = mid > 0 && mid < vh;
      if (inView !== held) {
        held = inView;
        onSwing(inView);
      }
      if (!inView) return;
      if (kind === "row") {
        keyLight.set({ x: (r.left + r.width * 0.3) / vw, y: (r.top + r.height / 2) / vh, r: 30, d: 0.55, w: 0.95 });
      } else {
        // A column is tall: light it at the middle of the part of the sheet that is on screen.
        const t = table.getBoundingClientRect();
        const y = Math.min(Math.max(vh / 2, t.top + 80), t.bottom - 80);
        keyLight.set({ x: (r.left + r.width / 2) / vw, y: y / vh, r: 46, d: 0.55, w: 0.95 });
      }
    };
    const stop = follow(aim);
    return () => {
      stop();
      if (held) onSwing(false);
    };
  }, [swingKey, lightable, onSwing]);

  // Park the callout beside whatever is lit (a header may be stuck to the top, so follow it while lit).
  const litKey = lit ? `${lit.kind}:${lit.kind === "row" ? lit.tool : lit.id}` : "";
  useEffect(() => {
    const wrap = wrapRef.current;
    const box = calloutRef.current;
    if (!litKey || !wrap || !box || wrap.clientWidth < TAB_MODE) return;
    const [kind, key] = [litKey.slice(0, 3), litKey.slice(4)];
    const el = kind === "row" ? rowEls.current.get(key) : colEls.current.get(key);
    if (!el) return;
    // A row that has scrolled under the stuck column heads is as good as gone.
    const head = kind === "row" ? el.closest("table")?.tHead : null;
    let last = "";
    return follow(() => {
      const r = el.getBoundingClientRect();
      const h = box.offsetHeight;
      const mid = r.top + r.height / 2;
      // Centre on the lit row, but keep the whole card between the nav and the mini player.
      const top = Math.min(Math.max(mid - h / 2, SAFE_TOP), window.innerHeight - SAFE_BOTTOM - h);
      const lead = Math.min(Math.max(mid - top, 10), h - 10);
      // Only while the lit row (or its head) is on screen; a held row that scrolls away takes its card with it.
      const floor = Math.max(SAFE_TOP - 16, head ? head.getBoundingClientRect().bottom : 0);
      box.dataset.off = mid < floor || mid > window.innerHeight - SAFE_BOTTOM ? "1" : "0";
      const next = `${Math.round(top - wrap.getBoundingClientRect().top)}|${Math.round(lead)}`;
      if (next !== last) {
        const [y, l] = next.split("|");
        box.style.setProperty("--y", `${y}px`);
        box.style.setProperty("--lead", `${l}px`);
        last = next;
      }
    });
  }, [litKey]);

  const fine = (e: PointerEvent) => e.pointerType === "mouse" || e.pointerType === "pen";
  const enter = (next: Lit) => (e: PointerEvent) => {
    if (fine(e)) setHover(next);
  };
  const leave = (prev: Lit) => () => setHover((h) => (same(h, prev) ? null : h));
  const focused = (next: Lit) => (e: FocusEvent<HTMLElement>) => {
    if (e.currentTarget.matches(":focus-visible")) setFocus(next);
  };
  const blurred = () => setFocus(null);
  const toggle = (next: Lit) => () => setPin((p) => (same(p, next) ? null : next));

  const go = (href: string) => (e: React.MouseEvent) => {
    if (!lenis) return; // Reduced motion: native anchor jump.
    e.preventDefault();
    lenis.scrollTo(href, { force: true });
  };

  const tabProd = productions[PROD_INDEX.get(tab)!];
  const tabCast = castOf(tab);
  const sceneLink = (p: Production, className: string) => (
    <a href={p.href} className={className} onClick={go(p.href)} aria-label={`Go to ${p.title}, ${SCENE[p.href] ?? "its scene"}`}>
      {SCENE[p.href] ?? "Scene"} <span aria-hidden>&darr;</span>
    </a>
  );

  return (
    <div
      ref={wrapRef}
      className={styles.sheet}
      data-callsheet
      data-lit={lit ? lit.kind : undefined}
      onKeyDown={(e) => {
        if (e.key === "Escape") setPin(null);
      }}
    >
      <h3 className={`label ${styles.label}`}>
        <span className="dot" />
        Call sheet
      </h3>

      {/* Narrow screens: one production at a time. */}
      <div className={styles.tabs} role="group" aria-label="Show one production's cast">
        {productions.map((p, i) => (
          <button
            key={p.id}
            type="button"
            className={styles.tab}
            data-tab={p.id}
            aria-pressed={tab === p.id}
            aria-controls={tableId}
            onClick={() => setTab(p.id)}
          >
            <span className={styles.tabCode}>{code(i)}</span>
            <span className={styles.tabTitle}>{p.title}</span>
          </button>
        ))}
      </div>
      <p className={styles.tabMeta}>
        <span>{tabProd.where}</span>
        <span>
          <span className={styles.fig}>{pad(tabCast.length)}</span> cast called
        </span>
        {sceneLink(tabProd, styles.tabScene)}
      </p>

      <table id={tableId} className={styles.table}>
        <caption className={styles.caption}>
          <span className="sr-only">
            Call sheet: the tools credited on each production, as a day out of days. {ROWS.length} cast across{" "}
            {productions.length} productions, {SHARED} of them shared. W marks a production the tool worked on.
          </span>
          <span className={styles.capRow} aria-hidden>
            <span className={styles.capTitle}>Day out of days</span>
            <span className={styles.capStats}>
              <span>
                <b>{ROWS.length}</b> cast
              </span>
              <span>
                <b>{pad(productions.length)}</b> productions
              </span>
              <span>
                <b>{pad(SHARED)}</b> shared
              </span>
            </span>
            <span className={styles.capKey}>
              <b className={styles.wKey}>W</b> worked
            </span>
          </span>
        </caption>

        <colgroup>
          <col className={styles.colCast} />
          {productions.map((p) => (
            <col key={p.id} className={styles.colProd} data-sel={tab === p.id || undefined} />
          ))}
          <col className={styles.colDays} />
        </colgroup>

        <thead className={styles.head}>
          <tr>
            <th scope="col" className={styles.hCast}>
              <span className={styles.hNo} aria-hidden>
                No.
              </span>
              Cast
            </th>
            {productions.map((p, i) => {
              const me: Lit = { kind: "col", id: p.id };
              return (
                <th
                  key={p.id}
                  ref={(el) => {
                    if (el) colEls.current.set(p.id, el);
                    else colEls.current.delete(p.id);
                  }}
                  scope="col"
                  className={styles.hProd}
                  data-prod={p.id}
                  data-on={litCols.has(p.id) || undefined}
                  onPointerEnter={enter(me)}
                  onPointerLeave={leave(me)}
                >
                  <button
                    type="button"
                    className={styles.hBtn}
                    aria-pressed={same(pin, me)}
                    aria-describedby={`${tableId}-w${i}`}
                    onClick={toggle(me)}
                    onFocus={focused(me)}
                    onBlur={blurred}
                  >
                    <span className={styles.hCode}>{code(i)}</span>
                    <span className={styles.hTitle}>{p.title}</span>
                  </button>
                  <span id={`${tableId}-w${i}`} className={styles.hWhere}>
                    {p.where}
                  </span>
                  {sceneLink(p, styles.hScene)}
                </th>
              );
            })}
            <th scope="col" className={styles.hDays}>
              <span aria-hidden>Total</span>
              <span className="sr-only">Productions worked</span>
            </th>
          </tr>
        </thead>

        {DEPARTMENTS.map((d) => {
          const shown = d.rows.some((r) => r.worked[tab]);
          return (
            <tbody key={d.name} className={styles.dept} data-in={shown ? "1" : "0"}>
              <tr className={styles.deptRow}>
                <th scope="rowgroup" colSpan={productions.length + 2}>
                  <span className={styles.deptName}>{d.name}</span>
                  <span className={styles.deptCount} aria-hidden>
                    {pad(d.rows.length)}
                  </span>
                </th>
              </tr>
              {d.rows.map((r) => {
                const me: Lit = { kind: "row", tool: r.tool };
                const on = litRows.has(r.tool);
                return (
                  <tr
                    key={r.tool}
                    ref={(el) => {
                      if (el) rowEls.current.set(r.tool, el);
                      else rowEls.current.delete(r.tool);
                    }}
                    className={styles.row}
                    data-tool={r.tool}
                    data-on={on || undefined}
                    data-self={(lit?.kind === "row" && lit.tool === r.tool) || undefined}
                    data-in={r.worked[tab] ? "1" : "0"}
                    onPointerEnter={enter(me)}
                    onPointerLeave={leave(me)}
                  >
                    <th scope="row" className={styles.cast}>
                      <button
                        type="button"
                        className={styles.castBtn}
                        aria-pressed={same(pin, me)}
                        onClick={toggle(me)}
                        onFocus={focused(me)}
                        onBlur={blurred}
                      >
                        <span className={styles.no}>{r.no}</span>
                        <span className={styles.name}>{r.tool}</span>
                      </button>
                    </th>
                    {productions.map((p) => {
                      const note = r.worked[p.id];
                      return (
                        <td
                          key={p.id}
                          className={styles.cell}
                          data-w={note ? "1" : undefined}
                          data-col={litCols.has(p.id) || undefined}
                          data-sel={tab === p.id || undefined}
                        >
                          {note ? (
                            <span className={styles.in}>
                              <span className={styles.w} aria-hidden>
                                W
                              </span>
                              <span className={styles.note}>
                                <span className="sr-only">Used in {p.title}: </span>
                                {note}
                              </span>
                            </span>
                          ) : (
                            <>
                              <span className={styles.blank} aria-hidden />
                              <span className="sr-only">Not used in {p.title}</span>
                            </>
                          )}
                        </td>
                      );
                    })}
                    <td className={styles.days}>
                      <span className={styles.daysFig} aria-hidden>
                        {r.days}
                      </span>
                      <span className="sr-only">
                        {r.days} of {productions.length}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          );
        })}
      </table>

      <p className={styles.crew}>
        <span className={styles.crewLabel}>Additional crew</span>
        <span className={styles.crewList}>{additionalCrew}</span>
      </p>

      <p className={styles.hint} aria-hidden>
        Point at a name for its call, or a production for its cast. Click holds it; Esc lets go.
      </p>

      <div ref={calloutRef} className={styles.callout} data-show={lit ? "1" : undefined} data-kind={shown?.kind} aria-hidden>
        <Remarks lit={shown} />
      </div>
    </div>
  );
}
