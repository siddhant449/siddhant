/*
 * A small isometric kit for the messaging machine. The method follows Anatomy
 * (github.com/wheresryan22/anatomy, MIT): one orthographic camera, solids built once from extruded
 * rings, walls shaded by which way they face one light, hairline silhouettes and creases, and a
 * glint on the edges that catch the light. The code is this site's own.
 *
 * World units are figure units: x and y on the floor, z up. The camera is 2:1 dimetric
 * (azimuth 45°, elevation 30°), so a world x step reads down-right, a y step down-left.
 */

export type V2 = readonly [number, number];
export type V3 = readonly [number, number, number];

const C = Math.SQRT1_2;
const SIN_E = 0.5;
const COS_E = Math.sqrt(3) / 2;

/** Toward the viewer. A face is drawn when its normal points this way. */
const VIEW: V3 = [C * COS_E, C * COS_E, SIN_E];
/** Toward the key light: above, from the upper left of the frame, a little in front. */
const LIGHT: V3 = norm([-0.5, 0.75, 1]);
const LIGHT_FLAT = Math.hypot(LIGHT[0], LIGHT[1]);

/** World point to figure point. */
export function iso(x: number, y: number, z: number): V2 {
  return [(x - y) * C, (x + y) * C * SIN_E - z * COS_E];
}

export const at = (p: V3) => iso(p[0], p[1], p[2]);

/** Screen offset of one world unit straight up, for lifting a part. */
export const UP = COS_E;

const r2 = (v: number) => Math.round(v * 100) / 100;

/** A projected polyline as path data. */
export function line(points: readonly V3[], close = false): string {
  if (!points.length) return "";
  const out = points.map((p, i) => {
    const [x, y] = at(p);
    return `${i ? "L" : "M"}${r2(x)} ${r2(y)}`;
  });
  return out.join("") + (close ? "Z" : "");
}

/** Several polylines as one path. */
export const lines = (runs: readonly (readonly V3[])[]) => runs.map((r) => line(r)).join("");

export const poly = (points: readonly V3[]) => line(points, true);

/** 2D polyline as path data (already projected). */
export function line2(points: readonly V2[], close = false): string {
  return points.map(([x, y], i) => `${i ? "L" : "M"}${r2(x)} ${r2(y)}`).join("") + (close ? "Z" : "");
}

function norm(v: V3): V3 {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
}

const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const sub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const add = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a: V3, s: number): V3 => [a[0] * s, a[1] * s, a[2] * s];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];

/** Five face tones: four wall shades (0 faces away from the light, 3 faces it) and the cap. */
export type Tone = 0 | 1 | 2 | 3 | "top";

export function toneOf(n: V3): Tone {
  if (n[2] > 0.55) return "top";
  const lit = dot(n, LIGHT) / LIGHT_FLAT;
  return Math.min(3, Math.max(0, Math.floor((lit + 1) * 2))) as Tone;
}

export type Face = { d: string; tone: Tone };

/** A solid's paint, back to front: faces, then the lines over them. */
export type Solid = {
  faces: Face[];
  /** Silhouette. */
  edge: string;
  /** Where the visible cap meets the walls, and seams between flat walls. */
  crease: string;
  /** Cap edges that face the light. */
  glint: string;
};

/** Convex hull of figure points (monotone chain), for silhouettes. */
function hull(points: V2[]): V2[] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (o: V2, a: V2, b: V2) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: V2[] = [];
  for (const q of p) {
    while (lower.length >= 2 && turn(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: V2[] = [];
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i];
    while (upper.length >= 2 && turn(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/** Consecutive runs of ring edges that pass a test, as polylines (wrapping round the ring). */
function runsOf(ring: readonly V3[], pass: boolean[]): V3[][] {
  const n = ring.length;
  const start = pass.findIndex((v, i) => v && !pass[(i - 1 + n) % n]);
  if (start < 0) return pass.every(Boolean) ? [[...ring, ring[0]]] : [];
  const runs: V3[][] = [];
  let run: V3[] | null = null;
  for (let k = 0; k < n; k++) {
    const i = (start + k) % n;
    if (pass[i]) {
      if (!run) run = [ring[i]];
      run.push(ring[(i + 1) % n]);
    } else if (run) {
      runs.push(run);
      run = null;
    }
  }
  if (run) runs.push(run);
  return runs;
}

/**
 * A planar ring pushed `length` along `axis`: walls, the visible cap, silhouette, crease and glint.
 * The ring must be convex. Walls of one tone that touch are merged, so a cylinder costs a few paths.
 */
export function extrude(ring: readonly V3[], axis: V3, length: number): Solid {
  const a = norm(axis);
  const far = ring.map((p) => add(p, mul(a, length)));
  const n = ring.length;
  const centre = mul(ring.reduce<V3>((s, p) => add(s, p), [0, 0, 0]), 1 / n);
  const normals = ring.map((p, i) => {
    const q = ring[(i + 1) % n];
    let m = norm(cross(sub(q, p), a));
    if (dot(m, sub(mul(add(p, q), 0.5), centre)) < 0) m = mul(m, -1);
    return m;
  });
  const shown = normals.map((m) => dot(m, VIEW) > 1e-6);

  const faces: Face[] = [];
  // Merge touching visible walls of the same tone into one face.
  let i0 = shown.findIndex((v, i) => v && !(shown[(i - 1 + n) % n] && toneOf(normals[(i - 1 + n) % n]) === toneOf(normals[i])));
  if (i0 < 0) i0 = 0;
  let group: number[] = [];
  const flush = () => {
    if (!group.length) return;
    const bottom = group.map((i) => ring[i]).concat([ring[(group[group.length - 1] + 1) % n]]);
    const top = group.map((i) => far[i]).concat([far[(group[group.length - 1] + 1) % n]]);
    faces.push({ d: poly(bottom.concat(top.reverse())), tone: toneOf(normals[group[0]]) });
    group = [];
  };
  for (let k = 0; k < n; k++) {
    const i = (i0 + k) % n;
    if (!shown[i]) {
      flush();
      continue;
    }
    if (group.length && toneOf(normals[group[0]]) !== toneOf(normals[i])) flush();
    group.push(i);
  }
  flush();

  // The cap that faces the viewer: the far ring if the axis points toward us, else the near one.
  const capFar = dot(a, VIEW) > 0;
  const cap = capFar ? far : ring;
  const capNormal = capFar ? a : mul(a, -1);
  if (dot(capNormal, VIEW) > 1e-6) faces.push({ d: poly(cap), tone: toneOf(capNormal) });

  const edge = line2(hull(ring.map(at).concat(far.map(at))), true);
  const creaseRuns = runsOf(cap, shown);
  // Seams: a sharp turn between two visible walls leaves a line down the solid.
  const seams: V3[][] = [];
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    if (shown[i] && shown[j] && dot(normals[i], normals[j]) < 0.8) seams.push([ring[j], far[j]]);
  }
  const glint = runsOf(
    cap,
    normals.map((m) => dot(m, LIGHT) > 0.3),
  );
  return { faces, edge, crease: lines(creaseRuns.concat(seams)), glint: lines(glint) };
}

/** A plan ring at height z (counter-clockwise from above). */
export const ringAt = (plan: readonly V2[], z: number): V3[] => plan.map(([x, y]) => [x, y, z]);

/** Rectangle plan. */
export function rect(x: number, y: number, w: number, d: number): V2[] {
  return [
    [x, y],
    [x + w, y],
    [x + w, y + d],
    [x, y + d],
  ];
}

/** Rounded-rectangle plan, corner radius r, `steps` segments per corner. */
export function rounded(x: number, y: number, w: number, d: number, r: number, steps = 6): V2[] {
  const k = Math.min(r, w / 2, d / 2);
  const corners: [number, number, number][] = [
    [x + w - k, y + k, -Math.PI / 2],
    [x + w - k, y + d - k, 0],
    [x + k, y + d - k, Math.PI / 2],
    [x + k, y + k, Math.PI],
  ];
  const out: V2[] = [];
  for (const [cx, cy, a0] of corners) {
    for (let s = 0; s <= steps; s++) {
      const a = a0 + (s / steps) * (Math.PI / 2);
      out.push([cx + k * Math.cos(a), cy + k * Math.sin(a)]);
    }
  }
  return out;
}

/** Circle plan. */
export function circle(cx: number, cy: number, r: number, steps = 28): V2[] {
  return Array.from({ length: steps }, (_, i) => {
    const a = (i / steps) * Math.PI * 2;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as V2;
  });
}

/** An upright prism on a plan: the common case. */
export const prism = (plan: readonly V2[], z0: number, z1: number) => extrude(ringAt(plan, z0), [0, 0, 1], z1 - z0);

/** Axis-aligned box: x, y, z of its low corner and its size. */
export const box = (x: number, y: number, z: number, w: number, d: number, h: number) => prism(rect(x, y, w, d), z, z + h);

/** The faces a disc or plate can sit on: the cap, the lit wall (facing +y) and the shaded wall (facing +x). */
export type Plane = "top" | "left" | "right";

/** Unit vectors in a face's plane: u runs along it left to right, v down it (top: v runs toward the viewer). */
export function axesOf(face: Plane): { u: V3; v: V3; n: V3 } {
  if (face === "top") return { u: [1, 0, 0], v: [0, 1, 0], n: [0, 0, 1] };
  if (face === "left") return { u: [1, 0, 0], v: [0, 0, -1], n: [0, 1, 0] };
  return { u: [0, -1, 0], v: [0, 0, -1], n: [1, 0, 0] };
}

/** A point on a face, from face coordinates (u along, v down) about an origin. */
export function onFace(face: Plane, o: V3, u: number, v: number, lift = 0): V3 {
  const ax = axesOf(face);
  return add(add(add(o, mul(ax.u, u)), mul(ax.v, v)), mul(ax.n, lift));
}

/** A circle lying on a face. */
export function faceCircle(face: Plane, c: V3, r: number, steps = 28): V3[] {
  return Array.from({ length: steps }, (_, i) => {
    const t = (i / steps) * Math.PI * 2;
    return onFace(face, c, r * Math.cos(t), r * Math.sin(t));
  });
}

/** A rectangle lying on a face, from its top-left corner in face coordinates. */
export function faceRect(face: Plane, o: V3, u: number, v: number, w: number, h: number): V3[] {
  return [onFace(face, o, u, v), onFace(face, o, u + w, v), onFace(face, o, u + w, v + h), onFace(face, o, u, v + h)];
}

/** A disc (flange, boss, socket) standing proud of a face by `t`. */
export function disc(face: Plane, c: V3, r: number, t: number, steps = 24): Solid {
  return extrude(faceCircle(face, c, r, steps), axesOf(face).n, t);
}

/** SVG matrix that maps face coordinates (u right, v down) onto a face, for text and fine marks. */
export function faceMatrix(face: Plane, o: V3): string {
  const ax = axesOf(face);
  const [ox, oy] = at(o);
  const [ux, uy] = at(ax.u);
  const [vx, vy] = at(ax.v);
  return `matrix(${r2(ux)} ${r2(uy)} ${r2(vx)} ${r2(vy)} ${r2(ox)} ${r2(oy)})`;
}

/** A run of pipe: its centreline in the figure, and its length there (for travelling dots). */
export type Run = { d: string; points: V2[]; length: number };

/** Rounds the corners of a 3D polyline with arcs of radius `bend`, then projects it. */
export function pipe(points: readonly V3[], bend = 6, steps = 6): Run {
  const out: V3[] = [points[0]];
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const a = norm(sub(points[i - 1], p));
    const b = norm(sub(points[i + 1], p));
    const la = Math.hypot(...sub(points[i - 1], p));
    const lb = Math.hypot(...sub(points[i + 1], p));
    const k = Math.min(bend, la * 0.48, lb * 0.48);
    const s = add(p, mul(a, k));
    const e = add(p, mul(b, k));
    // A quadratic Bézier through the corner reads as a bend at these sizes.
    for (let j = 0; j <= steps; j++) {
      const t = j / steps;
      const q = add(add(mul(s, (1 - t) * (1 - t)), mul(p, 2 * (1 - t) * t)), mul(e, t * t));
      out.push(q);
    }
  }
  out.push(points[points.length - 1]);
  const flat = out.map(at);
  let length = 0;
  for (let i = 1; i < flat.length; i++) length += Math.hypot(flat[i][0] - flat[i - 1][0], flat[i][1] - flat[i - 1][1]);
  return { d: line2(flat), points: flat, length };
}

/** The point a distance `s` along a run (clamped to its ends). */
export function pointAt(r: Run, s: number): V2 {
  let left = Math.max(0, Math.min(s, r.length));
  for (let i = 1; i < r.points.length; i++) {
    const a = r.points[i - 1];
    const b = r.points[i];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (left <= l || i === r.points.length - 1) {
      const t = l ? Math.min(1, left / l) : 0;
      return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    }
    left -= l;
  }
  return r.points[r.points.length - 1];
}

/** Figure-space bounds of some points. */
export function bounds(points: readonly V2[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of points) {
    if (x < x0) x0 = x;
    if (y < y0) y0 = y;
    if (x > x1) x1 = x;
    if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1 };
}
