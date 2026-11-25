/**
 * Measured motion. Each value comes from per-frame logs of a named reference site
 * (requestAnimationFrame logger injected before load, headless Chromium at 1440×900),
 * fitted to a duration and a cubic-bezier. Reuse these; don't retype numbers.
 *
 * Durations are in milliseconds. Easings are cubic-bezier control points, ready for
 * `motion` (`ease: LINE_REVEAL.ease`) or CSS (`cssEase(LINE_REVEAL.ease)`).
 */

export type Bezier = readonly [number, number, number, number];

export const cssEase = (b: Bezier) => `cubic-bezier(${b.join(", ")})`;

/** dennissnellenberg.com home intro. Per word, inside an overflow-hidden mask.
 *  Frames matched power3.out: 27% done at a tenth of the time, 87% at half. */
export const LINE_REVEAL = {
  ref: "https://dennissnellenberg.com/",
  from: "100%",
  duration: 800,
  ease: [0.33, 1, 0.68, 1] as Bezier,
  /** per word: 13 words started inside 122ms */
  stagger: 10,
} as const;

/** obys.agency work figures (read from the live computed transitions). */
export const IMAGE_REVEAL = {
  ref: "https://obys.agency/",
  clipFrom: "inset(50%)",
  clipDuration: 800,
  scaleFrom: 1.15,
  scaleDuration: 1600,
  ease: [0.16, 1, 0.3, 1] as Bezier,
} as const;

/** dennissnellenberg.com/about (Locomotive data-scroll-speed). Linear in scroll:
 *  translateY = (viewport centre − element centre) × factor. */
export const PARALLAX = {
  ref: "https://dennissnellenberg.com/about",
  media: 0.2,
  text: 0.1,
  footer: 0.4,
  /** media is oversized by this much inside its frame */
  overscan: 0.28,
} as const;

/** dennissnellenberg.com "About me" circle (173px). Offset = (cursor − centre) / size × pull. */
export const MAGNETIC = {
  ref: "https://dennissnellenberg.com/",
  pull: 100,
  inner: 50,
  duration: 1500,
  ease: [0.23, 0.98, 0.64, 0.99] as Bezier,
  /** release: elastic.out(1, 0.3) over 1.5s. Overshoot measured +9.4, −3.4, +1.2, −0.4px. */
  release: { duration: 1500, amplitude: 1, period: 0.3 },
  size: 173,
} as const;

/** obys.agency header menu (stylesheet rule). In from the left, out to the right. */
export const UNDERLINE = {
  ref: "https://obys.agency/",
  weight: 1,
  duration: 800,
  ease: [0.19, 1, 0.22, 1] as Bezier,
} as const;

/** dennissnellenberg.com/work list. */
export const HOVER_PREVIEW = {
  ref: "https://dennissnellenberg.com/work",
  /** 396px at 1440 */
  size: "27.5vw",
  open: { duration: 355, ease: [0.09, 0.19, 0.32, 1] as Bezier },
  close: { duration: 351, ease: [0.44, 0.01, 0.69, 0.19] as Bezier },
  /** the card eases to the cursor, retargeted on every move */
  follow: { duration: 1200, ease: [0.16, 1, 0.38, 1] as Bezier },
  /** stacked images slide by row index */
  swap: { duration: 500, ease: [0.65, 0, 0.35, 1] as Bezier },
  /** hovered title shift, −18.9px at 1440 */
  rowShift: "-1.3vw",
  row: { duration: 300, ease: [0.7, 0, 0.3, 1] as Bezier },
  view: 84,
} as const;

/** instrument.com body. Switches when a section crosses the middle; not scrubbed.
 *  Observed 0.40–0.45s at low headless frame rates. */
export const THEME = {
  ref: "https://www.instrument.com/",
  duration: 350,
  ease: [0.42, 0, 0.58, 1] as Bezier,
} as const;

/** lusion.co loader: one 0–9 column per digit; higher columns turn as the lower one wraps.
 *  Frames were irregular (their WebGL was loading): ±150ms. */
export const ODOMETER = {
  ref: "https://lusion.co/",
  step: 1200,
  ease: [0.19, 0.64, 0, 0.92] as Bezier,
} as const;

/** dennissnellenberg.com hero name. Constant rate; direction follows scroll direction.
 *  Measured 116px/s on a 2085px copy: 18s a loop. */
export const MARQUEE = {
  ref: "https://dennissnellenberg.com/",
  /** percent of one copy per frame at 60fps */
  ratePerFrame: 0.1,
} as const;

/** dennissnellenberg.com route change (header "Work"). About two seconds end to end. */
export const CURTAIN = {
  ref: "https://dennissnellenberg.com/",
  in: { duration: 400, ease: [0.86, 0, 0.69, 0.84] as Bezier },
  /** convex top edge grows 0 → 10vh over 307ms while rising */
  curve: { height: "10vh", grow: 307, ease: [0.87, -0.05, 0.83, 0.89] as Bezier },
  label: { fadeIn: 460, delay: 90, fadeOut: 380 },
  hold: 700,
  out: { duration: 620, ease: [0.7, 0, 0.2, 1] as Bezier },
  /** bottom edge 10vh → 0 in the second half of the exit */
  tail: { duration: 541, ease: [0.54, 0.35, 0.29, 0.98] as Bezier },
} as const;

/* ------------------------------------------------------------------ */
/* Small runtime helpers shared by the kit components                    */
/* ------------------------------------------------------------------ */

/** cubic-bezier as a function of t ∈ [0, 1]. */
export function bezier([x1, y1, x2, y2]: Bezier) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (s: number) => ((ax * s + bx) * s + cx) * s;
  const Y = (s: number) => ((ay * s + by) * s + cy) * s;
  const dX = (s: number) => (3 * ax * s + 2 * bx) * s + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let s = x;
    for (let i = 0; i < 6; i++) {
      const e = X(s) - x, d = dX(s);
      if (Math.abs(e) < 1e-5 || Math.abs(d) < 1e-6) break;
      s -= e / d;
    }
    if (s < 0 || s > 1 || Math.abs(X(s) - x) > 1e-3) {
      let lo = 0, hi = 1;
      for (let i = 0; i < 30; i++) {
        s = (lo + hi) / 2;
        if (X(s) < x) lo = s;
        else hi = s;
      }
    }
    return Y(s);
  };
}

/** GSAP-style elastic.out(amplitude, period). */
export function elasticOut(amplitude = 1, period = 0.3) {
  const s = (period / (2 * Math.PI)) * Math.asin(1 / amplitude);
  return (t: number) =>
    t <= 0 ? 0 : t >= 1 ? 1 : amplitude * Math.pow(2, -10 * t) * Math.sin(((t - s) * (2 * Math.PI)) / period) + 1;
}

/** A requestAnimationFrame tween. Returns a cancel function. */
export function tween(duration: number, ease: (t: number) => number, update: (k: number) => void, done?: () => void) {
  const t0 = performance.now();
  let raf = 0;
  let dead = false;
  const step = (now: number) => {
    if (dead) return;
    const t = Math.min(1, (now - t0) / duration);
    update(ease(t));
    if (t < 1) raf = requestAnimationFrame(step);
    else done?.();
  };
  raf = requestAnimationFrame(step);
  return () => {
    dead = true;
    cancelAnimationFrame(raf);
  };
}

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export const hasFinePointer = () =>
  typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
