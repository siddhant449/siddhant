"use client";

import { Fragment, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useInView, useReducedMotion } from "motion/react";
import { audio } from "@/lib/audio";
import { pointAt, type Solid } from "./iso";
import {
  ACTIONS,
  HOME,
  MAX_DELIVERIES,
  SAS_MINUTES,
  TABLES,
  TESTS,
  TOPICS,
  dlqTotal,
  initialWorld,
  locked,
  readyLog,
  short,
  visibleRows,
  type Action,
  type Line,
  type Mark,
  type Run,
  type Tenant,
  type World,
} from "./model";
import {
  CALLOUTS,
  CLIENT_BUBBLE,
  CLIENT_CROSS,
  CLIENT_LINES,
  CLIENT_TICK,
  CLIENT_WAIT,
  DEVICE_BUBBLES,
  DLQ_WINDOW,
  FRAME,
  LATCH_THROW,
  LEVER,
  LEVER_THROW,
  PARTS,
  PIPES,
  LAMPS,
  BREAK_AT,
  SEND_KEY,
  SHADOWS,
  calloutAt,
  SEQ_WINDOW,
  SOCKET_RINGS,
  hiddenOn,
  latch,
  legsOf,
  rowCells,
  token,
  type CalloutId,
  type Paint,
  type PartId,
  type SlotId,
} from "./parts";
import styles from "./MessagingMachine.module.css";

/* ---------------------------------------------------------------- static art */

const TONE = { 0: styles.s0, 1: styles.s1, 2: styles.s2, 3: styles.s3, top: styles.top } as const;

function solidArt(s: Solid, key: string, tone?: "base" | "core", fine?: boolean) {
  return (
    <g key={key} className={[tone && styles[tone], fine && styles.fine].filter(Boolean).join(" ") || undefined}>
      {s.faces.map((f, i) => (
        <path key={i} d={f.d} className={TONE[f.tone]} />
      ))}
      {s.crease && <path d={s.crease} className={styles.crease} />}
      {s.glint && <path d={s.glint} className={styles.glint} />}
      <path d={s.edge} className={styles.edge} />
    </g>
  );
}

/** A tube: outline, body and a highlight along its upper side; plus its glow, lit as messages pass. */
function pipeArt(p: Extract<Paint, { k: "pipe" }>, key: string) {
  const w = p.r * 2;
  return (
    <g key={key} className={p.cable ? styles.cable : undefined}>
      <path d={p.run.d} className={styles.pipeEdge} strokeWidth={w + 0.8} />
      <path d={p.run.d} className={styles.pipeBody} strokeWidth={Math.max(0.4, w - 0.5)} />
      <path d={p.run.d} className={styles.pipeShine} strokeWidth={Math.max(0.3, w * 0.24)} transform={`translate(0 ${-(p.r * 0.42).toFixed(2)})`} />
      {p.id && <path d={p.run.d} className={styles.glow} strokeWidth={Math.max(0.8, w * 0.72)} pathLength={1} data-glow={p.id} />}
    </g>
  );
}

function paintArt(p: Paint, key: string): ReactNode {
  switch (p.k) {
    case "solid":
      return solidArt(p.s, key, p.tone, p.fine);
    case "line":
      return <path key={key} d={p.d} className={p.fine ? `${styles[p.c]} ${styles.fine}` : styles[p.c]} />;
    case "fill":
      return <path key={key} d={p.d} className={styles[p.c]} />;
    case "dots":
      return (
        <g key={key} className={`${styles.screw} ${styles.fine}`}>
          {p.pts.map(([x, y], i) => (
            <circle key={i} cx={x.toFixed(2)} cy={y.toFixed(2)} r={p.r} />
          ))}
        </g>
      );
    case "pipe":
      return pipeArt(p, key);
    case "slot":
      return null;
  }
}

/** Each part as runs of static art, built once, and the live slots between them. */
type Chunk = { slot: SlotId } | { key: string; art: ReactNode[] };
const ART = PARTS.map((part) => {
  const chunks: Chunk[] = [];
  let run: ReactNode[] = [];
  part.paint.forEach((p, i) => {
    if (p.k !== "slot") {
      run.push(paintArt(p, `${part.key}${i}`));
      return;
    }
    if (run.length) chunks.push({ key: `${part.key}-${i}`, art: run });
    run = [];
    chunks.push({ slot: p.id });
  });
  if (run.length) chunks.push({ key: `${part.key}-end`, art: run });
  return { part, chunks };
});

/** What each part is, with one fact about it, for the caption on hover. */
const CAPTIONS: Record<PartId, { name: string; fact: string }> = {
  bench: { name: "The bench", fact: `${TESTS.backend} backend and ${TESTS.frontend} frontend tests hold it together.` },
  client: { name: "Client", fact: "Every send carries a client idempotency key, so a retry returns the original row." },
  container: {
    name: "One container image",
    fact: "Deployed as three independently scaled Azure Container Apps: REST, gateway, workers.",
  },
  postgres: {
    name: "PostgreSQL",
    fact: `FORCE row-level security on ${TABLES} tables; each transaction sets its tenant with SET LOCAL.`,
  },
  gateway: { name: "Socket.IO gateway", fact: "Replicas scale out, and every one of them gets each message." },
  redis: { name: "Redis adapter", fact: "Carries every emit across the gateway replicas." },
  devices: {
    name: "Devices",
    fact: `Zero-PHI push; protected files come on ${SAS_MINUTES}-minute SAS URLs, never through the API.`,
  },
  topics: { name: "Service Bus", fact: `${TOPICS} publish/subscribe topics, each with its dead-letter queue.` },
  workers: { name: "Workers", fact: "Bounded retries and idempotent consumers." },
  dlq: { name: "Dead-letter queues", fact: "A message that fails every retry is parked here, not lost." },
};

/** The four scenarios as keys: a verb, and what pressing it will show. The guided run plays them in this order. */
const CTAS: { action: Action; verb: string; then: string }[] = [
  { action: "send", verb: "Send a message", then: "Watch it fan out to every device" },
  { action: "drop", verb: "Drop the connection", then: "The retry is replayed, never duplicated" },
  { action: "poison", verb: "Poison a message", then: "Three retries, then the dead-letter queue" },
  { action: "tenant", verb: "Switch tenant", then: "Row-level security returns 0 rows" },
];

const TOUR = CTAS.map((c) => c.action);

/* ---------------------------------------------------------------- playback */

/** A press waiting its turn; `step` numbers the guided run's scenarios from 1. */
type Press = { action: Action; step?: number };
/** The press playing now, and the tenant its run leaves the device on. */
type Active = Press & { to: Tenant };

/** Log lines, plus the heading each run starts with. */
type LogLine = { text: string; kind: Line["kind"] | "play"; id: number };

/** That heading: the scenario, and its place in the guided run. */
const playLine = (p: Press) => {
  const verb = CTAS.find((c) => c.action === p.action)!.verb.toLowerCase();
  return p.step ? `play ${p.step} of ${TOUR.length}  ${verb}` : `play  ${verb}`;
};

type Playing = {
  run: Run;
  step: number;
  /** Seconds into the current step, and whether it has landed. */
  t: number;
  landed: boolean;
  /** Seconds to wait for the next 16th note before the first hop. */
  wait: number;
  sixteenth: number;
};

/** A pipe's glow: the lit stretch (fractions along it), its brightness, and whether a message is in it. */
type Glow = { a: number; b: number; e: number; held: boolean };

const BEADS = 3;
const LOG_KEEP = 40;
/** Without the song: the B-side's own song's tempo (Harder Better Faster Stronger), unlocked. */
const FALLBACK_BPM = 123.47;
const QUEUE_MAX = 2;

/**
 * Queues a press. The guided run always fits; single presses queue only while fewer than
 * QUEUE_MAX of them are waiting, so mashing a key never builds a long backlog.
 */
function admit(queue: Press[], press: Press) {
  if (press.step === undefined && queue.filter((q) => q.step === undefined).length >= QUEUE_MAX) return false;
  queue.push(press);
  return true;
}

const easeInOut = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1, Math.max(0, t)));

/** One 16th note of the song playing now, and how long until the next one if it is playing. */
function beatGrid() {
  const cue = audio.getState().cue;
  const track = audio.track(cue);
  const sixteenth = 60 / (track?.bpm ?? FALLBACK_BPM) / 4;
  const now = cue ? audio.trackTime(cue) : null;
  if (now === null || !track) return { sixteenth, wait: 0 };
  const phase = (((now - track.downbeat) % sixteenth) + sixteenth) % sixteenth;
  return { sixteenth, wait: (sixteenth - phase) % sixteenth };
}

/**
 * The clinical messaging platform as an isometric machine a visitor can operate: send a message
 * and watch it travel, drop the connection and see the retry replayed, poison a message into the
 * dead-letter tray, or read as another tenant and watch row-level security lock every table, one
 * scenario at a time or all four in turn. Nothing plays until the visitor presses; until then the
 * keys pulse in turn, on the song's beat, to invite it. Every number comes from the model; the log
 * narrates each hop as it lands.
 *
 * `layout`: "stacked" puts the figure over its controls and fills the parent's box. "split" sets
 * `lead` (the project's copy) and the controls in a column beside the figure, which draws at its
 * own proportions; phones get it stacked: the copy, the figure, the keys, then the log.
 */
export default function MessagingMachine({
  className,
  layout = "stacked",
  lead,
}: {
  className?: string;
  layout?: "stacked" | "split";
  /** Split only: copy that heads the controls column. */
  lead?: ReactNode;
}) {
  const uid = useId().replace(/[^\w-]/g, "");
  const reduce = useReducedMotion() ?? false;
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const inView = useInView(rootRef, { margin: "200px 0px 200px 0px" });

  const [world, setWorld] = useState<World>(initialWorld);
  const [log, setLog] = useState<LogLine[]>(() => readyLog(initialWorld()).map((l, i) => ({ ...l, id: -1 - i })));
  const [hover, setHover] = useState<PartId | null>(null);
  const [active, setActive] = useState<Active | null>(null);
  /** Presses waiting their turn, mirrored from the queue for the keys' lamps. */
  const [waiting, setWaiting] = useState<Press[]>([]);
  /** Until the first press, the keys pulse to invite one. */
  const [invite, setInvite] = useState(true);
  /** The assembly the message last landed on: its callout brightens. */
  const [live, setLive] = useState<CalloutId | null>(null);

  const logRef = useRef<HTMLOListElement>(null);
  const worldRef = useRef(world);
  const player = useRef<Playing | null>(null);
  const queue = useRef<Press[]>([]);
  const glows = useRef(new Map<string, Glow>());
  const glowEls = useRef(new Map<string, SVGPathElement>());
  const beadEls = useRef<(SVGGElement | null)[]>([]);
  const lineId = useRef(0);
  /** Starts or queues a press; until the loop is live, presses wait in the queue. */
  const kick = useRef<(press?: Press) => void>((press) => {
    if (press && admit(queue.current, press)) setWaiting(queue.current.slice());
  });
  /** Marks of steps that have landed, lit once React has drawn their world. */
  const pending = useRef<{ marks: Mark[]; world: World; sixteenth: number }[]>([]);

  // The log reads top down and keeps its newest line in view.
  useLayoutEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [log]);

  // Callouts keep their type at 11-12px however large the figure draws: --u is figure units per CSS px.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width && height) svg.style.setProperty("--u", Math.max(FRAME.w / width, FRAME.h / height).toFixed(4));
    });
    ro.observe(svg);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const map = glowEls.current;
    svgRef.current?.querySelectorAll<SVGPathElement>("[data-glow]").forEach((el) => map.set(el.dataset.glow!, el));
    return () => map.clear();
  }, []);

  // One-off lights for the step that just landed: ember overlays that fade back to each part's tone.
  // They run after React has drawn the step's world, so a new row or token exists to be lit.
  useEffect(() => {
    const fx = (id: string) => rootRef.current?.querySelector(`[data-fx="${id}"]`);
    for (const due of pending.current.splice(0)) {
      const flash = (id: string, ms: number) => {
        fx(id)?.animate(
          [{ opacity: 1 }, { opacity: 0 }],
          reduce
            ? { duration: due.sixteenth * 4000, easing: "steps(1, end)" }
            : { duration: ms, easing: "cubic-bezier(0.3, 0.6, 0.3, 1)" },
        );
      };
      for (const m of due.marks) {
        if (m.kind === "key") {
          if (!reduce) {
            fx("key")?.animate(
              [{ transform: "translate(0px, 0px)" }, { transform: "translate(0px, 1.5px)", offset: 0.3 }, { transform: "translate(0px, 0px)" }],
              { duration: 380, easing: "ease-out" },
            );
          }
          flash("keyGlow", 700);
        } else if (m.kind === "row") flash(`row${m.seq}`, m.replay ? 1100 : 1800);
        else if (m.kind === "sockets") {
          for (let i = 0; i < SOCKET_RINGS.length; i++) {
            flash(`socket${i}`, 1500);
            flash(`bubble${i}`, 1900);
          }
        } else if (m.kind === "ack") flash(`ack${m.worker}`, 1300);
        else if (m.kind === "fail") flash(`fail${m.worker}`, 650);
        else if (m.kind === "dead") flash(`token${m.topic}-${due.world.dlq[m.topic] - 1}`, 1800);
        else {
          flash("lost", 1400);
          if (reduce) flash("break", 0);
          else {
            fx("break")?.animate(
              [
                { opacity: 1, transform: "scale(0.5)" },
                { opacity: 0, transform: "scale(1.6)" },
              ],
              { duration: 900, easing: "cubic-bezier(0.2, 0.7, 0.2, 1)" },
            );
          }
        }
      }
    }
  }, [world, reduce]);

  // The loop: hops travel, landings apply the model's world, glows decay. It runs only while the
  // figure is on screen and something is moving, and stops once everything has settled.
  useEffect(() => {
    if (!inView) return;
    let frame = 0;
    let last = 0;

    const land = (p: Playing) => {
      const s = p.run.steps[p.step];
      worldRef.current = s.world;
      setWorld(s.world);
      if (s.log.length) {
        setLog((prev) => prev.concat(s.log.map((l) => ({ ...l, id: ++lineId.current }))).slice(-LOG_KEEP));
      }
      if (s.marks.length) pending.current.push({ marks: s.marks, world: s.world, sixteenth: p.sixteenth });
      if (s.hops.length) setLive(calloutAt(s.hops[0]));
      for (const g of glows.current.values()) g.held = false;
    };

    const start = (press: Press) => {
      const run = ACTIONS[press.action](worldRef.current);
      const grid = beatGrid();
      player.current = { run, step: 0, t: 0, landed: false, wait: grid.wait, sixteenth: grid.sixteenth };
      setActive({ ...press, to: run.steps[run.steps.length - 1].world.device });
      setLog((prev) => prev.concat({ text: playLine(press), kind: "play", id: ++lineId.current }).slice(-LOG_KEEP));
    };

    /** Lights a hop's legs up to distance `s` along them, and places its dot there. */
    const travel = (legs: ReturnType<typeof legsOf>, s: number, bead: SVGGElement | null, total: number) => {
      let left = s;
      let where: { pipe: string; f: number } | null = null;
      for (const leg of legs) {
        const run = PIPES[leg.pipe].run;
        const len = Math.abs(leg.to - leg.from) * run.length;
        const g = glows.current.get(leg.pipe) ?? { a: 0, b: 0, e: 0, held: false };
        const done = Math.min(1, len ? left / len : 1);
        const f = leg.from + (leg.to - leg.from) * done;
        const a = Math.min(leg.from, f);
        const b = Math.max(leg.from, f);
        // A pipe met twice in one hop (a redelivery) keeps the whole stretch lit.
        if (g.held) {
          g.a = Math.min(g.a, a);
          g.b = Math.max(g.b, b);
        } else Object.assign(g, { a, b });
        g.e = 1;
        g.held = true;
        glows.current.set(leg.pipe, g);
        if (left <= len || leg === legs[legs.length - 1]) {
          where = { pipe: leg.pipe, f };
          break;
        }
        left -= len;
      }
      if (!bead || !where) return;
      const run = PIPES[where.pipe].run;
      const [x, y] = pointAt(run, where.f * run.length);
      // Fade in leaving a part, out arriving, and out of sight under a worker.
      const edge = Math.min(10, total * 0.12);
      let o = Math.min(1, s / edge, (total - s) / edge);
      for (const [h0, h1] of hiddenOn(where.pipe)) {
        const d = Math.min(where.f - h0, h1 - where.f);
        if (d > -0.015) o = Math.min(o, Math.max(0, -d / 0.015));
      }
      bead.setAttribute("transform", `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
      bead.style.opacity = Math.max(0, o).toFixed(3);
    };

    const tick = (now: number) => {
      const dt = last ? Math.min((now - last) / 1000, 1 / 30) : 1 / 60;
      last = now;
      const p = player.current;
      const beads = beadEls.current;
      let used = 0;
      if (p) {
        if (p.wait > 0) p.wait -= dt;
        else {
          const step = p.run.steps[p.step];
          const span = step.beats * p.sixteenth;
          const hold = step.hold * p.sixteenth;
          if (reduce) {
            // No travelling dots: each step lights whole and lands at once, in sequence.
            if (!p.landed) {
              for (const g of glows.current.values()) g.e = 0;
              for (const hop of step.hops) {
                for (const leg of legsOf(hop)) {
                  glows.current.set(leg.pipe, { a: Math.min(leg.from, leg.to), b: Math.max(leg.from, leg.to), e: 1, held: true });
                }
              }
              land(p);
              p.landed = true;
            }
          } else if (!p.landed) {
            const s = easeInOut(span ? (p.t + dt) / span : 1);
            step.hops.forEach((hop, i) => {
              const legs = legsOf(hop);
              const total = legs.reduce((sum, l) => sum + Math.abs(l.to - l.from) * PIPES[l.pipe].run.length, 0);
              travel(legs, s * total, beads[i] ?? null, total);
            });
            used = step.hops.length;
          }
          p.t += dt;
          if (!p.landed && p.t >= span) {
            land(p);
            p.landed = true;
          }
          if (p.t >= span + hold) {
            p.t -= span + hold;
            p.step += 1;
            p.landed = false;
            if (p.step >= p.run.steps.length) {
              player.current = null;
              const next = queue.current.shift();
              if (next) start(next);
              else setActive(null);
              setWaiting(queue.current.slice());
            }
          }
        }
      }
      for (let i = used; i < beads.length; i++) beads[i]?.style.setProperty("opacity", "0");

      let glowing = false;
      for (const [id, g] of glows.current) {
        const el = glowEls.current.get(id);
        if (!g.held && !reduce) g.e *= Math.exp(-dt / 0.55);
        if (g.e < 0.01) g.e = 0;
        else glowing = true;
        if (!el) continue;
        el.style.opacity = g.e.toFixed(3);
        el.style.strokeDasharray = `${(g.b - g.a).toFixed(4)} 2`;
        el.style.strokeDashoffset = (-g.a).toFixed(4);
      }
      if (reduce && !player.current) {
        for (const [id, g] of glows.current) {
          g.e = 0;
          const el = glowEls.current.get(id);
          if (el) el.style.opacity = "0";
        }
        glowing = false;
      }
      frame = player.current || glowing ? requestAnimationFrame(tick) : 0;
      if (!frame) {
        last = 0;
        setLive(null);
      }
    };

    const queueOnly = kick.current;
    kick.current = (press?: Press) => {
      if (press) {
        if (!player.current) start(press);
        else if (admit(queue.current, press)) setWaiting(queue.current.slice());
      }
      if (!frame) frame = requestAnimationFrame(tick);
    };
    // Anything pressed while the figure was off screen plays now.
    const due = !player.current && queue.current.shift();
    if (due) {
      start(due);
      setWaiting(queue.current.slice());
    }
    kick.current();
    return () => {
      cancelAnimationFrame(frame);
      kick.current = queueOnly;
    };
  }, [inView, reduce]);

  const act = (action: Action) => {
    setInvite(false);
    kick.current({ action });
  };
  /** The guided run's step (0 while it waits behind a single press), or null outside it. */
  const tourStep = active?.step ?? (waiting.some((q) => q.step !== undefined) ? 0 : null);
  /** The tenant key says what it shows: the switch playing now, or else the one a press would make. */
  const tenantTo = active?.action === "tenant" ? active.to : world.device === HOME ? "b" : HOME;
  const playAll = () => {
    setInvite(false);
    if (tourStep === null) TOUR.forEach((action, i) => kick.current({ action, step: i + 1 }));
  };

  const isLocked = locked(world);
  const rows = world.rows;
  const caption = hover ? CAPTIONS[hover] : null;

  const slots: Record<SlotId, ReactNode> = {
    shadow: (
      <g aria-hidden>
        {(Object.keys(SHADOWS) as PartId[]).map((id) => (
          <path key={id} d={SHADOWS[id]} className={styles.shadow} data-on={hover === id || undefined} filter={`url(#${uid}-soft)`} />
        ))}
      </g>
    ),
    seq: (
      <text className={styles.counter} transform={SEQ_WINDOW} x={27.5} y={6.1} textAnchor="end">
        <tspan className={styles.counterLabel} x={3}>
          seq
        </tspan>
        <tspan x={27.5}>{String(world.seq).padStart(3, "0")}</tspan>
      </text>
    ),
    latches: (
      <g className={styles.latches} data-locked={isLocked || undefined}>
        {Array.from({ length: TABLES }, (_, i) => {
          const s = latch(i);
          return (
            <g
              key={i}
              className={styles.latch}
              style={{ "--i": TABLES - 1 - i, "--tx": `${LATCH_THROW[0]}px`, "--ty": `${LATCH_THROW[1]}px` } as CSSProperties}
            >
              {s.faces.map((f, j) => (
                <path key={j} d={f.d} className={TONE[f.tone]} />
              ))}
              <path d={s.edge} className={styles.latchEdge} />
            </g>
          );
        })}
      </g>
    ),
    rows: (
      <g className={styles.rows} data-locked={isLocked || undefined}>
        {rows.map((r, i) => {
          const cells = rowCells(i, rows.length);
          return (
            <Fragment key={r.seq}>
              <path d={cells.seq} className={styles.rowSeq} />
              <path d={cells.key} className={styles.row} />
              <path d={cells.seq + cells.key} className={styles.rowGlow} data-fx={`row${r.seq}`} />
            </Fragment>
          );
        })}
      </g>
    ),
    key: (
      <g data-fx="key" className={styles.key} onClick={() => act("send")}>
        {solidArt(SEND_KEY, "send-key")}
        <path d={SEND_KEY.faces.find((f) => f.tone === "top")?.d} className={styles.keyGlow} data-fx="keyGlow" />
      </g>
    ),
    screen: (
      <g className={styles.screen} data-state={world.client}>
        <path d={CLIENT_LINES} className={styles.screenLines} />
        <path d={CLIENT_BUBBLE} className={styles.bubble} />
        <path d={CLIENT_TICK} className={styles.tick} />
        <path d={CLIENT_CROSS} className={styles.cross} />
        <circle cx={CLIENT_WAIT[0]} cy={CLIENT_WAIT[1]} r={1.3} className={styles.wait} />
        <path d={CLIENT_CROSS} className={styles.lost} data-fx="lost" />
      </g>
    ),
    lever: (
      <g
        className={styles.lever}
        data-tenant={world.device}
        style={{ "--tx": `${LEVER_THROW[0]}px`, "--ty": `${LEVER_THROW[1]}px` } as CSSProperties}
      >
        {solidArt(LEVER, "lever")}
      </g>
    ),
    sockets: (
      <g>
        {SOCKET_RINGS.map((d, i) => (
          <path key={i} d={d} className={styles.socketGlow} data-fx={`socket${i}`} />
        ))}
      </g>
    ),
    deviceScreens: (
      <g className={styles.devices}>
        {DEVICE_BUBBLES.map((d, i) => (
          <Fragment key={i}>
            <path d={d} className={styles.deviceBubble} />
            <path d={d} className={styles.bubbleGlow} data-fx={`bubble${i}`} />
          </Fragment>
        ))}
      </g>
    ),
    pips: (
      <g>
        {LAMPS.map((lamps, w) => (
          <g key={w}>
            {lamps.slice(0, MAX_DELIVERIES).map((d, i) => (
              <path key={i} d={d} className={styles.pip} data-on={(world.worker === w && world.attempt > i) || undefined} />
            ))}
            <path d={lamps[MAX_DELIVERIES]} className={styles.pip} />
            <path d={lamps[MAX_DELIVERIES]} className={styles.ackGlow} data-fx={`ack${w}`} />
            <path d={lamps.slice(0, MAX_DELIVERIES).join("")} className={styles.failGlow} data-fx={`fail${w}`} />
          </g>
        ))}
      </g>
    ),
    tokens: (
      <g>
        {world.dlq.flatMap((count, t) =>
          Array.from({ length: Math.min(count, 12) }, (_, n) => {
            const s = token(t, n);
            return (
              <g key={`${t}-${n}`}>
                {solidArt(s, "t")}
                <path d={s.edge} className={styles.tokenGlow} data-fx={`token${t}-${n}`} />
              </g>
            );
          }),
        )}
      </g>
    ),
    dlqCount: (
      <text className={styles.counter} transform={DLQ_WINDOW} y={5.8}>
        <tspan className={styles.counterLabel} x={2.6}>
          dlq
        </tspan>
        <tspan x={19.6} textAnchor="end">
          {dlqTotal(world)}
        </tspan>
      </text>
    ),
  };

  const split = layout === "split";

  return (
    <div
      ref={rootRef}
      className={`${styles.root} ${className ?? ""}`}
      data-layout={layout}
      // The invitation pulses only on screen, and never under reduced motion.
      data-invite={(invite && inView && !reduce) || undefined}
      style={{ "--ratio": (FRAME.w / FRAME.h).toFixed(4), "--beat": `${(60 / FALLBACK_BPM).toFixed(3)}s` } as CSSProperties}
    >
      {split && lead && <div className={styles.lead}>{lead}</div>}
      <div className={styles.card}>
        <svg
          ref={svgRef}
          className={styles.svg}
          viewBox={`${FRAME.x.toFixed(1)} ${FRAME.y.toFixed(1)} ${FRAME.w.toFixed(1)} ${FRAME.h.toFixed(1)}`}
          role="img"
          aria-labelledby={`${uid}-t`}
          aria-describedby={`${uid}-d`}
        >
          <title id={`${uid}-t`}>The clinical messaging platform as a working machine</title>
          <desc id={`${uid}-d`}>
            {`An isometric machine on a bench. A client terminal is cabled to the REST port of one container image, which also has a gateway port and a workers port. A riser carries each send to PostgreSQL: ${TABLES} stacked tables, each with a tenant lock, the messages table on top. The gateway fans each message out over a Redis bus bar to two replicas and ${SOCKET_RINGS.length} device sockets. ${TOPICS} topic tubes run through the workers into a dead-letter tray. Four keys send a message, drop the connection, publish a poison message or switch tenant, a fifth plays all four in turn, and the log narrates every step.`}
          </desc>
          <defs>
            <filter id={`${uid}-soft`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.2" />
            </filter>
            <radialGradient id={`${uid}-bead`}>
              <stop offset="0" stopColor="var(--ember)" stopOpacity="0.55" />
              <stop offset="1" stopColor="var(--ember)" stopOpacity="0" />
            </radialGradient>
          </defs>
          {ART.map(({ part, chunks }) => (
            <g
              key={part.key}
              className={part.id ? styles.part : undefined}
              data-part={part.id ?? undefined}
              data-hover={(part.id && hover === part.id) || undefined}
              onPointerEnter={part.id ? () => setHover(part.id) : undefined}
              onPointerDown={part.id ? () => setHover(part.id) : undefined}
              onPointerLeave={part.id ? (e) => e.pointerType === "mouse" && setHover((h) => (h === part.id ? null : h)) : undefined}
            >
              {chunks.map((c) => ("slot" in c ? <Fragment key={c.slot}>{slots[c.slot]}</Fragment> : <Fragment key={c.key}>{c.art}</Fragment>))}
            </g>
          ))}
          <g className={styles.callouts}>
            {CALLOUTS.map((c, i) => (
              <g
                key={c.id}
                className={styles.callout}
                data-on={hover === c.part || undefined}
                data-live={live === c.id || undefined}
                onPointerEnter={() => setHover(c.part)}
                onPointerDown={() => setHover(c.part)}
                onPointerLeave={(e) => e.pointerType === "mouse" && setHover((h) => (h === c.part ? null : h))}
              >
                <line x1={c.dot[0]} y1={c.dot[1]} x2={c.end[0]} y2={c.end[1]} className={styles.leader} />
                <circle cx={c.dot[0]} cy={c.dot[1]} r={1.6} className={styles.calloutDot} />
                <text x={c.end[0]} y={c.end[1]} textAnchor={c.side} className={styles.label}>
                  <tspan dx={c.side === "start" ? "0.5em" : "-0.5em"} dy="0.36em" className={styles.labelName}>
                    {c.name}
                  </tspan>
                  {c.detail && (
                    <tspan x={c.end[0]} dx={c.side === "start" ? "0.5em" : "-0.5em"} dy="1.2em">
                      {c.detail}
                    </tspan>
                  )}
                </text>
                {/* Phones: a numbered marker on the part instead, keyed to the legend. */}
                <g className={styles.marker} transform={`translate(${c.dot[0].toFixed(2)} ${c.dot[1].toFixed(2)})`}>
                  <circle r={5} />
                  <text dy="0.36em" textAnchor="middle">
                    {i + 1}
                  </text>
                </g>
              </g>
            ))}
          </g>
          <circle cx={BREAK_AT[0]} cy={BREAK_AT[1]} r={3.2} className={styles.breakRing} data-fx="break" />
          <g className={styles.beads} aria-hidden>
            {Array.from({ length: BEADS }, (_, i) => (
              <g
                key={i}
                ref={(el) => {
                  beadEls.current[i] = el;
                }}
                style={{ opacity: 0 }}
              >
                <circle r={7} fill={`url(#${uid}-bead)`} />
                <circle r={2.2} className={styles.bead} />
              </g>
            ))}
          </g>
        </svg>

        <p className={styles.fig}>Fig B1</p>
        {/* Split, the copy beside it names the platform, so this corner reads the device's last response. */}
        <p className={styles.title}>{split ? world.status : "Clinical messaging platform"}</p>
        <p className={styles.caption}>
          {caption ? (
            <>
              <span className={styles.captionName}>{caption.name}.</span> {caption.fact}
            </>
          ) : (
            <>
              <span className={styles.mouse}>Hover</span>
              <span className={styles.touch}>Tap</span> a part to name it.
            </>
          )}
        </p>
        <dl className={styles.readout}>
          <div>
            <dt>seq</dt>
            <dd>{world.seq}</dd>
          </div>
          <div>
            <dt>key</dt>
            <dd>{world.key ? short(world.key) : "none"}</dd>
          </div>
          <div>
            <dt>tenant</dt>
            <dd>{world.tenant}</dd>
          </div>
          <div>
            <dt>rows</dt>
            <dd>{visibleRows(world)}</dd>
          </div>
          <div>
            <dt>dlq</dt>
            <dd>{dlqTotal(world)}</dd>
          </div>
        </dl>
      </div>

      <ol className={styles.legend} aria-label="Parts of the figure">
        {CALLOUTS.map((c, i) => (
          <li key={c.id} data-on={hover === c.part || undefined}>
            <span className={styles.legendN}>{i + 1}</span>
            <span>
              {c.name}
              {c.detail && <span className={styles.legendDetail}> {c.detail}</span>}
            </span>
          </li>
        ))}
      </ol>

      <div className={styles.controls} role="group" aria-label="Operate the platform">
        {CTAS.map((c, i) => {
          const back = c.action === "tenant" && tenantTo === HOME;
          return (
            <button
              key={c.action}
              type="button"
              className={styles.cta}
              style={{ "--i": i } as CSSProperties}
              data-active={active?.action === c.action || undefined}
              data-queued={waiting.some((q) => q.action === c.action) || undefined}
              aria-pressed={c.action === "tenant" ? world.device !== HOME : undefined}
              aria-labelledby={`${uid}-${c.action}`}
              aria-describedby={`${uid}-${c.action}-then`}
              onClick={() => act(c.action)}
            >
              <span className={styles.lamp} aria-hidden />
              <span id={`${uid}-${c.action}`} className={styles.verb}>
                {c.verb}
              </span>
              <span id={`${uid}-${c.action}-then`} className={styles.then}>
                {back ? `Tenant ${HOME} reads its ${world.seq} rows again` : c.then}
              </span>
            </button>
          );
        })}
        <button type="button" className={styles.playAll} data-active={tourStep !== null || undefined} aria-disabled={tourStep !== null || undefined} onClick={playAll}>
          <span className={styles.playIcon} aria-hidden />
          <span>{tourStep === null ? "Play all four" : tourStep ? `Playing ${tourStep} of ${TOUR.length}` : "Queued"}</span>
          <span className={styles.steps} aria-hidden>
            {TOUR.map((action, k) => (
              <i key={action} data-done={(tourStep !== null && k + 1 < tourStep) || undefined} data-now={tourStep === k + 1 || undefined} />
            ))}
          </span>
        </button>
      </div>

      <ol ref={logRef} className={styles.log} aria-live="polite" aria-label="Platform log">
        {log.map((l, i) => (
          <li key={l.id} data-kind={l.kind} data-new={i === log.length - 1 || undefined}>
            {l.text}
          </li>
        ))}
      </ol>
      <p className={styles.note}>Simulated in your browser, same rules as production.</p>
    </div>
  );
}
