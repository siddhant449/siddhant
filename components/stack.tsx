"use client";

import { useLenis } from "lenis/react";
import {
  AnimatePresence,
  motion,
  useInView,
  useMotionTemplate,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { stack, type StackLayer } from "@/lib/content";
import { Fade, Lines } from "./ui/reveal";

const EASE = [0.22, 1, 0.36, 1] as const;
const LAYERS: readonly StackLayer[] = stack.layers;
const N = LAYERS.length;

/* ------------------------------------------------------------------ */
/* Geometry. Each layer is a square plate seen from above at an angle   */
/* (rotated 45 degrees, tilted 58 degrees), drawn as plain SVG so every  */
/* line stays crisp. Plates are glass: you see the ones below through    */
/* the ones above.                                                       */
/* ------------------------------------------------------------------ */

const HALF = 120; // half the plate's side
const TILT = (58 * Math.PI) / 180;
const SIN = Math.sin(TILT);
const COS = Math.cos(TILT);
const A = Math.round(HALF * Math.SQRT2 * 100) / 100; // horizontal half-width of a plate on screen
const B = Math.round(A * COS * 100) / 100; // vertical half-height of a plate on screen
const DROP = Math.round(14 * SIN * 100) / 100; // plate thickness on screen
const LIFT = 22;
const MIN_GAP = 16;
const MAX_GAP = 86;
const VIEW = { x: -A - 16, y: -((N - 1) * MAX_GAP + LIFT) * SIN - B - 56, w: 2 * A + 262 };
const VIEW_H = -VIEW.y + B + DROP + 48;

/** Round to hundredths so the server and the browser print identical numbers. */
const r2 = (v: number) => Math.round(v * 100) / 100;

type Pt = [number, number];
/** Project a point on a plate (local x, y) onto the screen. */
const P = (x: number, y: number): Pt => [(x + y) / Math.SQRT2, ((y - x) / Math.SQRT2) * COS];
const f = (p: Pt) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`;
const down = (p: Pt): Pt => [p[0], p[1] + DROP];

const L = P(-HALF, -HALF);
const T = P(HALF, -HALF);
const R = P(HALF, HALF);
const BOT = P(-HALF, HALF);
const TOP_FACE = `M${f(L)}L${f(T)}L${f(R)}L${f(BOT)}Z`;
const LEFT_FACE = `M${f(L)}L${f(BOT)}L${f(down(BOT))}L${f(down(L))}Z`;
const RIGHT_FACE = `M${f(BOT)}L${f(R)}L${f(down(R))}L${f(down(BOT))}Z`;
const GRID = (() => {
  let d = "";
  const n = 8;
  for (let k = 1; k < n; k++) {
    const t = -HALF + (2 * HALF * k) / n;
    d += `M${f(P(-HALF, t))}L${f(P(HALF, t))}M${f(P(t, -HALF))}L${f(P(t, HALF))}`;
  }
  return d;
})();
const INSET = (() => {
  const i = HALF - 20;
  return `M${f(P(-i, -i))}L${f(P(i, -i))}L${f(P(i, i))}L${f(P(-i, i))}Z`;
})();
const PACKET = (() => {
  const s = 9;
  return `M${f(P(-s, -s))}L${f(P(s, -s))}L${f(P(s, s))}L${f(P(-s, s))}Z`;
})();

type Tone = "active" | "hover" | "passed" | "idle";
const TONES: Record<Tone, { top: number; left: number; right: number; stroke: number; grid: number; inset: number; label: number }> = {
  active: { top: 0.09, left: 0.2, right: 0.34, stroke: 0.95, grid: 0.16, inset: 0.5, label: 1 },
  hover: { top: 0.05, left: 0.1, right: 0.16, stroke: 0.6, grid: 0.09, inset: 0.25, label: 0.85 },
  passed: { top: 0.035, left: 0.07, right: 0.11, stroke: 0.42, grid: 0.06, inset: 0.16, label: 0.6 },
  idle: { top: 0.022, left: 0.05, right: 0.085, stroke: 0.26, grid: 0.045, inset: 0.11, label: 0.45 },
};
const FADE = { transition: "fill-opacity .5s, stroke-opacity .5s, opacity .5s" };

function Plate({
  layer,
  index,
  gap,
  tone,
  onHover,
  onPick,
}: {
  layer: StackLayer;
  index: number;
  gap: MotionValue<number>;
  tone: Tone;
  onHover: (i: number | null) => void;
  onPick: (i: number) => void;
}) {
  const lift = useSpring(0, { stiffness: 220, damping: 22 });
  useEffect(() => {
    lift.set(tone === "active" ? LIFT : tone === "hover" ? 8 : 0);
  }, [tone, lift]);
  const y = useTransform(() => r2(-((N - 1 - index) * gap.get() + lift.get()) * SIN));
  const t = TONES[tone];
  const chalk = "var(--chalk)";

  return (
    <motion.g style={{ y }}>
      <path d={LEFT_FACE} fill={chalk} fillOpacity={t.left} stroke={chalk} strokeOpacity={t.stroke * 0.6} strokeWidth={1} style={FADE} />
      <path d={RIGHT_FACE} fill={chalk} fillOpacity={t.right} stroke={chalk} strokeOpacity={t.stroke * 0.6} strokeWidth={1} style={FADE} />
      <path d={TOP_FACE} fill={chalk} fillOpacity={t.top} stroke={chalk} strokeOpacity={t.stroke} strokeWidth={1.1} style={FADE} />
      <path d={GRID} fill="none" stroke={chalk} strokeOpacity={t.grid} strokeWidth={0.75} style={FADE} />
      <path d={INSET} fill="none" stroke={chalk} strokeOpacity={t.inset} strokeWidth={0.9} strokeDasharray="3 5" style={FADE} />
      {tone === "active" && (
        <path d={TOP_FACE} fill="none" stroke={chalk} strokeOpacity={0.55} strokeWidth={2} filter="url(#stack-glow)" />
      )}

      {/* Callout: a leader line from the plate's right corner to its name. */}
      <g
        role="button"
        className="cursor-pointer"
        onPointerEnter={() => onHover(index)}
        onPointerLeave={() => onHover(null)}
        onClick={() => onPick(index)}
      >
        <rect x={A - 4} y={-18} width={250} height={36} fill="transparent" />
        <circle cx={A} cy={0} r={2.6} fill={chalk} fillOpacity={t.label} style={FADE} />
        <line x1={A + 10} x2={A + 58} y1={0} y2={0} stroke={chalk} strokeOpacity={t.label * 0.7} strokeWidth={1} strokeDasharray={tone === "active" ? undefined : "2 4"} style={FADE} />
        <text x={A + 68} y={0} dy="0.36em" fill={chalk} fillOpacity={t.label * 0.75} fontSize={12} className="tabular-nums" style={FADE}>
          {String(index + 1).padStart(2, "0")}
        </text>
        <text
          x={A + 94}
          y={0}
          dy="0.35em"
          fill={chalk}
          fillOpacity={t.label}
          fontSize={21}
          fontWeight={tone === "active" ? 700 : 500}
          className="wdth-75"
          style={FADE}
        >
          {layer.short}
        </text>
      </g>
    </motion.g>
  );
}

/** Two rings spread across the plate when the packet lands. */
function Ripple() {
  return (
    <>
      {[0, 0.22].map((delay) => (
        <motion.ellipse
          key={delay}
          cx={0}
          cy={0}
          fill="none"
          stroke="var(--chalk)"
          strokeWidth={1.2}
          initial={{ rx: 6, ry: 6 * COS, opacity: 0.85 }}
          animate={{ rx: A * 0.9, ry: A * 0.9 * COS, opacity: 0 }}
          transition={{ duration: 1.5, ease: [0.22, 1, 0.36, 1], delay }}
        />
      ))}
    </>
  );
}

function Exploded({ active, explode }: { active: number; explode: MotionValue<number> }) {
  const lenis = useLenis();
  const [hover, setHover] = useState<number | null>(null);
  const gap = useTransform(explode, [0, 1], [MIN_GAP, MAX_GAP]);

  // The packet travels to whichever layer is active and sits on it.
  const slot = useSpring(0, { stiffness: 140, damping: 20 });
  useEffect(() => {
    slot.set(active);
  }, [active, slot]);
  const packetY = useTransform(() => r2(-((N - 1 - slot.get()) * gap.get() + LIFT) * SIN));
  const beamEnd = useTransform(packetY, (v) => r2(v - 6));

  // Assembly guides run between the top and bottom plates.
  const topY = useTransform(gap, (g) => r2(-((N - 1) * g) * SIN));
  const topBottomCorner = useTransform(topY, (v) => r2(v + B + DROP));

  const pick = (i: number) => {
    const el = document.getElementById(`stack-layer-${i}`);
    if (!el) return;
    if (lenis) lenis.scrollTo(el, { offset: -window.innerHeight * 0.3, duration: 1.4 });
    else el.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const order = LAYERS.map((_, i) => N - 1 - i); // paint the bottom plate first

  return (
    <svg
      aria-hidden
      viewBox={`${r2(VIEW.x)} ${r2(VIEW.y)} ${r2(VIEW.w)} ${r2(VIEW_H)}`}
      preserveAspectRatio="xMinYMid meet"
      className="block h-[min(60vh,600px)] w-full overflow-visible"
    >
      <defs>
        <filter id="stack-glow" x="-30%" y="-60%" width="160%" height="220%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id="packet-glow" x="-200%" y="-200%" width="500%" height="500%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--chalk)" stopOpacity="0" />
          <stop offset="1" stopColor="var(--chalk)" stopOpacity="0.9" />
        </linearGradient>
        <radialGradient id="floor">
          <stop offset="0" stopColor="var(--chalk)" stopOpacity="0.13" />
          <stop offset="1" stopColor="var(--chalk)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx={0} cy={B + DROP + 26} rx={A * 1.15} ry={30} fill="url(#floor)" />

      {order.map((i) => {
        const tone: Tone = i === active ? "active" : i === hover ? "hover" : i < active ? "passed" : "idle";
        return (
          <g key={LAYERS[i].name}>
            <Plate layer={LAYERS[i]} index={i} gap={gap} tone={tone} onHover={setHover} onPick={pick} />
            {i === active && (
              <g>
                {/* The request: a beam from above, ending in the packet. */}
                <motion.line x1={0} x2={0} y1={r2(VIEW.y)} y2={beamEnd} stroke="url(#beam)" strokeWidth={1.5} />
                <motion.g style={{ y: packetY }}>
                  <AnimatePresence>
                    <motion.g key={active}>
                      <Ripple />
                    </motion.g>
                  </AnimatePresence>
                  <path d={PACKET} fill="var(--chalk)" filter="url(#packet-glow)" opacity={0.9} />
                  <path d={PACKET} fill="var(--chalk)" />
                </motion.g>
              </g>
            )}
          </g>
        );
      })}

      {/* Dashed assembly guides through the corners, like an exploded drawing. */}
      <g stroke="var(--chalk)" strokeOpacity={0.2} strokeWidth={0.9} strokeDasharray="2 5" fill="none">
        <motion.line x1={-A} x2={-A} y1={topY} y2={0} />
        <motion.line x1={A} x2={A} y1={topY} y2={0} />
        <motion.line x1={0} x2={0} y1={topBottomCorner} y2={B} />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* The proof line: swaps word by word with the active layer.            */
/* ------------------------------------------------------------------ */

function Proof({ text }: { text: string }) {
  const words = text.split(" ");
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.p key={text} className="max-w-[30ch]" exit={{ opacity: 0, y: -10, filter: "blur(6px)" }} transition={{ duration: 0.3, ease: EASE }}>
        {words.map((w, i) => (
          <motion.span
            key={i}
            className="inline-block"
            initial={{ opacity: 0, y: "0.4em", filter: "blur(6px)" }}
            animate={{ opacity: 1, y: "0em", filter: "blur(0px)" }}
            transition={{ duration: 0.55, ease: EASE, delay: 0.04 + i * 0.028 }}
          >
            {w}
            {i < words.length - 1 ? "\u00a0" : null}
          </motion.span>
        ))}
      </motion.p>
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* One layer in the scrolling list.                                     */
/* ------------------------------------------------------------------ */

function Layer({
  layer,
  index,
  onActive,
}: {
  layer: StackLayer;
  index: number;
  onActive: (i: number) => void;
}) {
  const ref = useRef<HTMLLIElement>(null);
  const inView = useInView(ref, { margin: "-46% 0px -46% 0px" });
  const seen = useInView(ref, { once: true, margin: "0px 0px -30% 0px" });
  useEffect(() => {
    if (inView) onActive(index);
  }, [inView, index, onActive]);

  let chip = 0;
  return (
    <li ref={ref} id={`stack-layer-${index}`} className="relative py-[clamp(40px,10vh,112px)] pl-9 md:pl-14">
      <span
        aria-hidden
        className={`absolute left-0 top-[clamp(40px,10vh,112px)] mt-[5px] h-[13px] w-[13px] -translate-x-1/2 rounded-full border transition-colors duration-500 ${
          inView ? "border-chalk bg-chalk" : "border-line-strong bg-ink"
        }`}
      />
      <p className="text-[14px] tabular-nums text-ash">
        {String(index + 1).padStart(2, "0")}
        <span className="sr-only"> of {N}</span>
      </p>
      <h3 className="mt-2 text-[clamp(36px,3.8vw,64px)] font-bold leading-[0.95] tracking-[-0.02em] wdth-75">{layer.name}</h3>
      <p className="mt-4 max-w-[38ch] text-[clamp(18px,1.4vw,22px)] leading-[1.45] text-chalk/90">{layer.promise}</p>
      <p className="mt-3 max-w-[44ch] text-[15px] leading-[1.55] text-ash md:hidden">{layer.proof}</p>

      <dl className="mt-8 space-y-5">
        {layer.groups.map((group) => (
          <div key={group.label} className="grid gap-2.5 sm:grid-cols-[124px_1fr] sm:gap-5">
            <dt className="text-[13px] leading-[30px] text-ash">{group.label}</dt>
            <dd>
              <ul className="flex flex-wrap gap-1.5">
                {group.tools.map((tool) => {
                  const delay = chip++ * 28;
                  return (
                    <li
                      key={tool}
                      style={{ transitionDelay: seen ? `${delay}ms` : "0ms" }}
                      className={`rounded-full border px-3 py-[7px] text-[13.5px] leading-none transition-[color,border-color,opacity,translate] duration-700 ease-out-expo ${
                        seen ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
                      } ${inView ? "border-chalk/50 text-chalk" : "border-line text-chalk/70"}`}
                    >
                      {tool}
                    </li>
                  );
                })}
              </ul>
            </dd>
          </div>
        ))}
      </dl>
    </li>
  );
}

/* ------------------------------------------------------------------ */

export function Stack() {
  const [active, setActive] = useState(0);
  const section = useRef<HTMLElement>(null);
  const list = useRef<HTMLOListElement>(null);

  // The stack opens up as the section arrives.
  const { scrollYProgress: arrive } = useScroll({ target: section, offset: ["start end", "start 0.15"] });
  const explode = useSpring(arrive, { stiffness: 90, damping: 22, mass: 0.6 });

  // Progress down the list drives the rail.
  const { scrollYProgress } = useScroll({ target: list, offset: ["start 0.5", "end 0.5"] });
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 26, mass: 0.4 });
  const packetTop = useMotionTemplate`${useTransform(progress, [0, 1], [0, 100])}%`;

  const current = LAYERS[active] ?? LAYERS[0];

  return (
    <section
      ref={section}
      id="stack"
      data-nav="stack"
      aria-labelledby="stack-title"
      className="relative z-10 bg-ink px-gutter pb-[clamp(96px,12vw,200px)] pt-[clamp(80px,10vw,160px)]"
    >
      <div className="grid items-end gap-6 md:grid-cols-12">
        <Lines
          as="h2"
          id="stack-title"
          lines={[...stack.title]}
          className="text-[clamp(52px,8.4vw,156px)] font-extrabold leading-[0.86] tracking-[-0.025em] wdth-62 md:col-span-7"
        />
        <Fade as="p" className="max-w-[34ch] text-[clamp(17px,1.3vw,20px)] leading-[1.5] text-ash md:col-span-4 md:col-start-9 md:pb-3">
          {stack.intro}
        </Fade>
      </div>

      <div className="mt-[clamp(32px,5vw,80px)] grid gap-x-6 md:grid-cols-12">
        <div className="hidden md:col-span-6 md:block">
          <div className="sticky top-[max(88px,10vh)]">
            <Exploded active={active} explode={explode} />
            <div className="mt-2">
              <p className="text-[14px] tabular-nums text-ash">
                Layer {String(active + 1).padStart(2, "0")} of {String(N).padStart(2, "0")}, {current.name}
              </p>
              <div className="mt-3 min-h-[4.4em] text-[clamp(20px,1.75vw,28px)] font-light leading-[1.3] tracking-[-0.01em] text-chalk wdth-112">
                <Proof text={current.proof} />
              </div>
            </div>
          </div>
        </div>

        <div className="relative md:col-span-6 md:col-start-7 lg:col-span-6">
          {/* The rail, and on small screens the packet travelling down it. */}
          <div aria-hidden className="absolute bottom-0 left-0 top-0 w-px bg-line">
            <motion.div style={{ scaleY: progress }} className="absolute inset-0 origin-top bg-chalk/70" />
            <motion.div style={{ top: packetTop }} className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 md:hidden">
              <span className="block h-2.5 w-2.5 rounded-full bg-chalk shadow-[0_0_0_6px_rgb(236_236_231/0.12),0_0_24px_4px_rgb(236_236_231/0.45)]" />
            </motion.div>
          </div>
          <ol ref={list}>
            {LAYERS.map((layer, i) => (
              <Layer key={layer.name} layer={layer} index={i} onActive={setActive} />
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
