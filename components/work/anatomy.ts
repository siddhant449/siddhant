/**
 * The exploded hero ("anatomy of the page"): each site's hero as its real layers, captured
 * from the live site at 1x (1440×900, transparent WebP), stacked isometrically and labelled,
 * then folded flat into the front-on chapter-01 screen. Labels quote only the site or
 * lib/content.ts.
 *
 * Geometry is in plane units: the screen's picture is 100 wide and 62.5 tall (16:10). The
 * stack's font-size is one unit, so transforms written in em scale with the screen.
 */
export type Layer = {
  id: string;
  /** The captured layer; the ground is the site's flat page colour instead. */
  src?: string;
  color?: string;
  /** Where the leader line lands on this layer, as fractions of the page. */
  at: [number, number];
  name: string;
  detail?: string;
};

/** Bottom to top. */
export const ANATOMY: Record<string, Layer[]> = {
  truvolt: [
    { id: "ground", color: "#dde7f3", at: [0.74, 0.3], name: "Ground", detail: "A cold steel-blue palette" },
    { id: "photo", src: "/img/work/layers/truvolt-photo.webp", at: [0.66, 0.9], name: "Photograph", detail: "A 36 MVA, 33 kV power transformer" },
    { id: "type", src: "/img/work/layers/truvolt-type.webp", at: [0.32, 0.36], name: "Headline and intro", detail: "Set in a tight grotesk" },
    { id: "ratings", src: "/img/work/layers/truvolt-ratings.webp", at: [0.8, 0.6], name: "Ratings", detail: "36 MVA, 66 kV, 55+ yrs" },
    { id: "nav", src: "/img/work/layers/truvolt-nav.webp", at: [0.93, 0.05], name: "Navigation", detail: "Home, Company, Products, Portfolio, Quality" },
  ],
  webindia: [
    { id: "ground", color: "#eaf1fb", at: [0.62, 0.14], name: "Ground" },
    { id: "scribbles", src: "/img/work/layers/webindia-scribbles.webp", at: [0.9, 0.25], name: "Pen scribbles", detail: "A tangle that pulls straight" },
    { id: "marquee", src: "/img/work/layers/webindia-marquee.webp", at: [0.56, 0.96], name: "Platform marquee", detail: "Facebook, Amazon, Bing, WordPress, Shopify, Google" },
    { id: "type", src: "/img/work/layers/webindia-type.webp", at: [0.46, 0.42], name: "Headline and intro", detail: "Serif italic cut into a sans" },
    { id: "reviews", src: "/img/work/layers/webindia-reviews.webp", at: [0.83, 0.68], name: "Reviews", detail: "680+ on Upwork, on a ruler of ticks" },
    { id: "nav", src: "/img/work/layers/webindia-nav.webp", at: [0.89, 0.05], name: "Navigation", detail: "Let’s Connect" },
  ],
};

export const PLANE_W = 100;
export const PLANE_H = 62.5;

/** The isometric view: tilted back, turned a quarter, layers lifted apart. */
const TILT = 55;
const TURN = -45;
const GAP = 13.75;
/** The figure sits left of centre to leave a column for its labels. */
const SHIFT = -16;
const LABEL_GAP = 4;
/** Labels are at least this far apart (two lines of type at the smallest desktop screen). */
const LABEL_ROW = 6.4;

const RAD = Math.PI / 180;

/** The figure's height at scale 1: the turned page, tilted, plus the lift of every layer above the ground. */
const height = (count: number) => (PLANE_W + PLANE_H) * Math.SQRT1_2 * Math.cos(TILT * RAD) + (count - 1) * GAP * Math.sin(TILT * RAD);
/** As large as fits the screen's height, so a taller stack is drawn smaller. */
const scaleFor = (count: number) => Math.min(0.56, (0.98 * PLANE_H) / height(count));

export type Pose = { tx: number; ty: number; s: number; rx: number; rz: number; spread: number };

/** The pose at fold f: 0 exploded, 1 flat and front-on, filling the screen. */
export function pose(f: number, count: number): Pose {
  const k = 1 - f;
  const s = scaleFor(count);
  // Centred on the screen: the lifted layers would otherwise carry the figure up.
  const lift = (count - 1) * GAP * Math.sin(TILT * RAD) * s;
  return { tx: SHIFT * k, ty: (lift / 2) * k, s: s + (1 - s) * f, rx: TILT * k, rz: TURN * k, spread: k };
}

/** Layer i's CSS transform at a pose, about the plane's centre, in plane units (em). */
export function layerTransform(p: Pose, i: number) {
  const z = i * GAP * p.spread;
  return `translate(${p.tx.toFixed(3)}em, ${p.ty.toFixed(3)}em) scale(${p.s.toFixed(4)}) rotateX(${p.rx.toFixed(3)}deg) rotateZ(${p.rz.toFixed(3)}deg) translateZ(${z.toFixed(3)}em)`;
}

/** Where a point on layer i lands on screen (orthographic, as CSS has no perspective here). */
export function project(p: Pose, i: number, fx: number, fy: number): [number, number] {
  const x = (fx - 0.5) * PLANE_W;
  const y = (fy - 0.5) * PLANE_H;
  const z = i * GAP * p.spread;
  const cz = Math.cos(p.rz * RAD);
  const sz = Math.sin(p.rz * RAD);
  const x1 = x * cz - y * sz;
  const y1 = x * sz + y * cz;
  const y2 = y1 * Math.cos(p.rx * RAD) - z * Math.sin(p.rx * RAD);
  return [PLANE_W / 2 + p.tx + p.s * x1, PLANE_H / 2 + p.ty + p.s * y2];
}

export type Callout = { id: string; n: string; name: string; detail?: string; anchor: [number, number]; label: [number, number] };

/**
 * The labels at the exploded pose: a column right of the figure, top layer first, each pushed
 * down only as far as it needs to clear the one above. Leaders run from the anchor to the label.
 */
export function callouts(layers: Layer[]): Callout[] {
  const p = pose(0, layers.length);
  // The figure's right edge is the page's bottom-right corner, turned and scaled.
  const right = PLANE_W / 2 + SHIFT + p.s * ((PLANE_W + PLANE_H) / 2) * Math.SQRT1_2 + LABEL_GAP;
  let floor = -Infinity;
  return layers
    .map((l, i) => ({ l, i, anchor: project(p, i, l.at[0], l.at[1]) }))
    .sort((a, b) => a.anchor[1] - b.anchor[1])
    .map(({ l, i, anchor }) => {
      const y = Math.max(anchor[1], floor + LABEL_ROW);
      floor = y;
      return { id: l.id, n: String(i + 1).padStart(2, "0"), name: l.name, detail: l.detail, anchor, label: [right, y] as [number, number] };
    });
}
