import {
  corners,
  cylinder,
  depthOf,
  extrude,
  insetPlan,
  knurl,
  onTop,
  pathOf,
  planOutline,
  radialTicks,
  ring,
  sideArc,
  sideMatrix,
  sideRing,
  slabOf,
  type Flat,
  type Plan,
  type Plane,
  type Point3,
  type SolidPaths,
} from "@/components/iso/iso-kit";
import {
  AZIMUTH,
  BASE,
  BASE_H,
  BEAM_H,
  BLOWER,
  CABINET,
  CAPSULE_LEN,
  CAPSULE_R,
  CLAMP_H,
  CLAMP_R,
  COLUMN,
  COLUMNS,
  COLUMN_TOP,
  DRAWER_FACE_X,
  DRAWER_ROWS,
  F1,
  F2,
  F3,
  F4,
  FOOT_H,
  GAUGES,
  GAUGE_Z,
  LEFT_PLATFORM,
  LEVELS,
  P,
  PLATFORM_T,
  RIGHT_PLATFORM,
  TABLE_R,
  TABLE_Z,
  TOP,
  TUBE_R,
  WIDTH,
  at,
} from "./view";

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

const RAD = Math.PI / 180;
const join = (paths: string[]) => paths.filter(Boolean).join("");
const solid = (plan: Plan, z: number, h: number, steps = 4, bevel = 0) => slabOf(plan, z, h, P, steps, bevel);
const cyl = (cx: number, cy: number, r: number, z: number, h: number, steps = 36, bevel = 0) => cylinder(cx, cy, r, z, h, P, steps, bevel);
const seg = (a: Point3, b: Point3) => pathOf([at(a), at(b)]);
export const depth = (point: Point3) => depthOf(point, P);

function hull(points: Flat[]): Flat[] {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cross = (o: Flat, a: Flat, b: Flat) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower: Flat[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Flat[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** A round bar lying along x, shaded on its lower half, with its near end face. */
export interface Rod {
  fill: string;
  outline: string;
  shade: string;
  end: string;
  shine: string;
}
export function rodX(x1: number, x2: number, y: number, z: number, r: number, steps = 28): Rod {
  const ringAt = (x: number) =>
    Array.from({ length: steps }, (_, i) => {
      const a = (i / steps) * Math.PI * 2;
      return [x, y + r * Math.cos(a), z + r * Math.sin(a)] as Point3;
    });
  const a = ringAt(x1).map(at);
  const b = ringAt(x2).map(at);
  const fill = pathOf(hull([...a, ...b]), true);
  const lowerA = ringAt(x1).filter(([, , pz]) => pz <= z + 0.01).map(at);
  const lowerB = ringAt(x2).filter(([, , pz]) => pz <= z + 0.01).map(at);
  return {
    fill,
    outline: fill,
    shade: pathOf(hull([...lowerA, ...lowerB]), true),
    end: pathOf(b, true),
    shine: seg([x1 + 1.5, y - r * 0.15, z + r * 0.78], [x2 - 1.5, y - r * 0.15, z + r * 0.78]),
  };
}

/** A ring-shaped prism cut in two along the view, so a tube can pass through it. */
function annulusHalf(cx: number, cy: number, outer: number, inner: number, z: number, h: number, half: "back" | "front", steps = 24) {
  // The back half is the one facing away from the camera.
  const from = half === "back" ? AZIMUTH + 90 : AZIMUTH - 90;
  const pts: Plane[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (from + (180 * i) / steps) * RAD;
    pts.push([cx + outer * Math.cos(a), cy + outer * Math.sin(a)]);
  }
  for (let i = steps; i >= 0; i--) {
    const a = (from + (180 * i) / steps) * RAD;
    pts.push([cx + inner * Math.cos(a), cy + inner * Math.sin(a)]);
  }
  return extrude(pts, z, h, P, { convex: false });
}

/** A seam around the two visible faces of a box at height z. */
const boxSeam = (plan: Plan, z: number) => pathOf([at([plan.x, plan.y + plan.d, z]), at([plan.x + plan.w, plan.y + plan.d, z]), at([plan.x + plan.w, plan.y, z])]);

function boltCircle(cx: number, cy: number, r: number, z: number, count: number, offset = 0): Flat[] {
  return Array.from({ length: count }, (_, i) => {
    const a = (offset + (360 * i) / count) * RAD;
    return at([cx + r * Math.cos(a), cy + r * Math.sin(a), z]);
  });
}

/** A beam of rectangular section between two points on the floor plan. */
function beamBetween(a: Flat, b: Flat, width: number, z: number, h: number) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  const nx = (-dy / len) * (width / 2);
  const ny = (dx / len) * (width / 2);
  return extrude(
    [
      [a[0] + nx, a[1] + ny],
      [b[0] + nx, b[1] + ny],
      [b[0] - nx, b[1] - ny],
      [a[0] - nx, a[1] - ny],
    ],
    z,
    h,
    P,
  );
}

/* ------------------------------------------------------------------ */
/* Base                                                                 */
/* ------------------------------------------------------------------ */

const BASE_Z = -BASE_H;
const FEET = corners(BASE, 22).sort((a, b) => depth([a[0], a[1], 0]) - depth([b[0], b[1], 0]));
const LABEL: Plan = { x: BASE.x + BASE.w - 74, y: BASE.y + BASE.d - 22, w: 60, d: 12, r: 2 };
const RULER_Y = BASE.y + BASE.d - 13;

export const BASE_ART = {
  halo: solid(BASE, BASE_Z - FOOT_H, BASE_H).fill,
  feet: FEET.map(([x, y]) => [cyl(x, y, 8, BASE_Z - FOOT_H, 1.6, 28), cyl(x, y, 6.2, BASE_Z - FOOT_H + 1.6, FOOT_H - 1.6, 28)]),
  slab: solid(BASE, BASE_Z, BASE_H, 8, 1.6),
  groove: planOutline(insetPlan(BASE, 5), 0, P),
  screwRings: join(corners(BASE, 11).map(([x, y]) => ring(x, y, 2.4, 0, P, 16))),
  screws: corners(BASE, 11).map(([x, y]) => at([x, y, 0])),
  label: solid(LABEL, 0, 0.8, 4),
  labelLine: planOutline(insetPlan(LABEL, 1.6), 0.8, P),
  labelRule: join([0, 1, 2].map((row) => onTop([[LABEL.x + 9, LABEL.y + 3.2 + row * 2.5], [LABEL.x + (row === 1 ? 36 : 48), LABEL.y + 3.2 + row * 2.5]], 0.8, P))),
  labelScrews: [at([LABEL.x + 3.6, LABEL.y + LABEL.d / 2, 0.8]), at([LABEL.x + LABEL.w - 3.6, LABEL.y + LABEL.d / 2, 0.8])],
  ruler: solid({ x: BASE.x + 14, y: RULER_Y, w: 120, d: 6, r: 1 }, 0, 0.6, 2),
  ticksMinor: join(
    Array.from({ length: 25 }, (_, i) => i)
      .filter((i) => i % 5 !== 0)
      .map((i) => onTop([[BASE.x + 18 + i * 4.6, RULER_Y], [BASE.x + 18 + i * 4.6, RULER_Y + 2.4]], 0.6, P)),
  ),
  ticksMajor: join(Array.from({ length: 6 }, (_, i) => i * 5).map((i) => onTop([[BASE.x + 18 + i * 4.6, RULER_Y], [BASE.x + 18 + i * 4.6, RULER_Y + 4]], 0.6, P))),
};

/* ------------------------------------------------------------------ */
/* Stand: columns, crossbeams, tube clamps and platforms                */
/* ------------------------------------------------------------------ */

const columnPlan = ([x, y]: Flat): Plan => ({ x: x - COLUMN / 2, y: y - COLUMN / 2, w: COLUMN, d: COLUMN, r: 1.2 });

/** A column segment between two heights. */
export function columnSegment(i: number, z0: number, z1: number) {
  const [x, y] = COLUMNS[i];
  return { paths: solid(columnPlan(COLUMNS[i]), z0, z1 - z0, 2, 0.6), depth: depth([x, y, (z0 + z1) / 2]) };
}

export const COLUMN_FEET = COLUMNS.map(([x, y], i) => ({
  plate: solid(insetPlan(columnPlan(COLUMNS[i]), -5), 0, 2.4, 2, 0.4),
  bolts: [at([x - 8, y - 8, 2.4]), at([x + 8, y - 8, 2.4]), at([x - 8, y + 8, 2.4]), at([x + 8, y + 8, 2.4])],
  depth: depth([x, y, 1]),
}));

export const COLUMN_CAPS = COLUMNS.map(([x, y]) => ({ cap: solid({ x: x - 7, y: y - 7, w: 14, d: 14, r: 1.6 }, COLUMN_TOP, 3, 2, 0.5), knob: cyl(x, y, 2.6, COLUMN_TOP + 3, 2.4, 18) }));

/** At each level: the crossbeam and the clamp that holds the tube to it. */
export const LEVEL_ART = LEVELS.map((z) => ({
  z,
  beam: beamBetween(COLUMNS[0], COLUMNS[1], 7, z - BEAM_H, BEAM_H),
  beamBolts: [at([COLUMNS[0][0] + 6, COLUMNS[0][1] - 6, z]), at([COLUMNS[1][0] - 6, COLUMNS[1][1] + 6, z])],
  lug: beamBetween([-8, -8], [-14, -14], 9, z - BEAM_H, BEAM_H),
  clamp: cyl(0, 0, CLAMP_R, z, CLAMP_H, 40, 0.6),
  clampBolts: boltCircle(0, 0, 12, z + CLAMP_H, 8, 22.5),
  clampSeam: sideArc(0, 0, CLAMP_R, z + CLAMP_H / 2, P, 30),
}));

function platform(plan: Plan, z: number, column: Flat) {
  const [cx, cy] = column;
  return {
    plate: solid(plan, z - PLATFORM_T, PLATFORM_T, 4, 0.8),
    groove: planOutline(insetPlan(plan, 3.5), z, P),
    screws: corners(plan, 6).map(([x, y]) => at([x, y, z])),
    seam: boxSeam(plan, z - 1.4),
    // A bracket block where the platform meets its column, and a gusset under it.
    bracket: solid({ x: cx - 7, y: cy - 7, w: 14, d: 14, r: 1 }, z - PLATFORM_T - 10, 10, 2, 0.4),
    bracketBolts: [at([cx + 7, cy - 3, z - PLATFORM_T - 3]), at([cx + 7, cy + 3, z - PLATFORM_T - 3])],
  };
}

export const PLATFORMS = {
  interface: platform(RIGHT_PLATFORM, F1, COLUMNS[1]),
  systems: platform(LEFT_PLATFORM, F2, COLUMNS[0]),
  fullstack: platform(RIGHT_PLATFORM, F3, COLUMNS[1]),
  ai: platform(LEFT_PLATFORM, F4, COLUMNS[0]),
};

/* ------------------------------------------------------------------ */
/* Tube and capsule                                                     */
/* ------------------------------------------------------------------ */

const shineA: Plane = [TUBE_R * Math.cos(12 * RAD), TUBE_R * Math.sin(12 * RAD)];
const shineB: Plane = [TUBE_R * Math.cos(32 * RAD), TUBE_R * Math.sin(32 * RAD)];
const backWall: Plane = [-TUBE_R * 0.55, -TUBE_R * 0.83];

/** One glass run of the tube between two heights. */
export function tubeRun(z0: number, z1: number) {
  const glass = cyl(0, 0, TUBE_R, z0, z1 - z0, 40);
  const bore = cyl(0, 0, TUBE_R - 1.1, z0, z1 - z0, 40);
  return {
    glass,
    clip: bore.fill,
    back: seg([backWall[0], backWall[1], z0 + 1], [backWall[0], backWall[1], z1 - 1]),
    shine: seg([shineA[0], shineA[1], z0 + 3], [shineA[0], shineA[1], z1 - 3]),
    shineSoft: seg([shineB[0], shineB[1], z0 + 3], [shineB[0], shineB[1], z1 - 3]),
  };
}

export const RUNS = {
  interface: tubeRun(LEVELS[3] + CLAMP_H, LEVELS[4]),
  systems: tubeRun(TABLE_Z, LEVELS[3]),
  fullstack: tubeRun(LEVELS[1] + CLAMP_H, LEVELS[2]),
  ai: tubeRun(LEVELS[0] + CLAMP_H, LEVELS[1]),
  cloud: tubeRun(26, LEVELS[0]),
};

export const CAPSULE = {
  body: cyl(0, 0, CAPSULE_R, -CAPSULE_LEN / 2, CAPSULE_LEN, 32),
  capTop: cyl(0, 0, CAPSULE_R - 1.6, CAPSULE_LEN / 2, 2.2, 28),
  capBottom: cyl(0, 0, CAPSULE_R - 1.6, -CAPSULE_LEN / 2 - 2.2, 2.2, 28),
  band: join([sideArc(0, 0, CAPSULE_R, 4, P, 20), sideArc(0, 0, CAPSULE_R, -4, P, 20)]),
  latch: seg([CAPSULE_R * 0.71, CAPSULE_R * 0.71, -3], [CAPSULE_R * 0.71, CAPSULE_R * 0.71, 3]),
};

/* ------------------------------------------------------------------ */
/* Floor 5: Cloud & Deployment (on the base)                            */
/* ------------------------------------------------------------------ */

const HOUSING: Plan = { x: -18, y: -18, w: 36, d: 36, r: 3 };
const DUCT: Plan = { x: -7, y: 18, w: 14, d: 26, r: 1 };
const BULKHEAD: Plan = { x: 104, y: -34, w: 7, d: 68, r: 1 };
const PEDESTAL: Plan = { x: 34, y: 32, w: 36, d: 24, r: 2 };
export const OUTBOUND_Y = [-10, 10];
export const OUTBOUND_Z = 11;

export const CLOUD_ART = {
  housing: solid(HOUSING, 0, 22, 6, 0.8),
  housingGroove: planOutline(insetPlan(HOUSING, 3.5), 22, P),
  housingBolts: corners(HOUSING, 4).map(([x, y]) => at([x, y, 22])),
  housingSeam: boxSeam(HOUSING, 6),
  inlet: cyl(0, 0, CLAMP_R, 22, 4, 40, 0.6),
  inletBolts: boltCircle(0, 0, 12, 26, 8, 22.5),
  duct: solid(DUCT, 4, 13, 2),
  ductBands: join([25, 34].map((y) => pathOf([at([DUCT.x, y, 17]), at([DUCT.x + DUCT.w, y, 17]), at([DUCT.x + DUCT.w, y, 4])]))),
  blowerFoot: cyl(BLOWER[0], BLOWER[1], 24, 0, 3, 48),
  blowerFootBolts: boltCircle(BLOWER[0], BLOWER[1], 21.5, 3, 10, 9),
  blower: cyl(BLOWER[0], BLOWER[1], 20, 3, 37, 48, 0.8),
  blowerRibs: knurl(BLOWER[0], BLOWER[1], 20, 10, 36, 40, P),
  blowerBand: sideArc(BLOWER[0], BLOWER[1], 20, 10, P, 30),
  cowl: cyl(BLOWER[0], BLOWER[1], 16.5, 40, 3, 44, 0.6),
  grille: ring(BLOWER[0], BLOWER[1], 13.5, 43, P, 36),
  hub: cyl(BLOWER[0], BLOWER[1], 3.4, 43, 2.4, 20),
  outbound: OUTBOUND_Y.map((y) => rodX(HOUSING.x + HOUSING.w, BULKHEAD.x - 3, y, OUTBOUND_Z, 5.4)),
  outboundFlanges: OUTBOUND_Y.flatMap((y) => [rodX(HOUSING.x + HOUSING.w, HOUSING.x + HOUSING.w + 3, y, OUTBOUND_Z, 7.6), rodX(BULKHEAD.x - 3, BULKHEAD.x, y, OUTBOUND_Z, 7.6)]),
  outboundBands: OUTBOUND_Y.map((y) => rodX(68, 71, y, OUTBOUND_Z, 6.3)),
  flow: OUTBOUND_Y.map((y) => seg([HOUSING.x + HOUSING.w + 4, y - 1.2, OUTBOUND_Z + 5.3], [BULKHEAD.x - 4, y - 1.2, OUTBOUND_Z + 5.3])),
  bulkhead: solid(BULKHEAD, 0, 44, 2, 0.6),
  bulkheadBolts: [
    at([BULKHEAD.x + BULKHEAD.w, BULKHEAD.y + 5, 39]),
    at([BULKHEAD.x + BULKHEAD.w, BULKHEAD.y + BULKHEAD.d - 5, 39]),
    at([BULKHEAD.x + BULKHEAD.w, BULKHEAD.y + 5, 5]),
    at([BULKHEAD.x + BULKHEAD.w, BULKHEAD.y + BULKHEAD.d - 5, 5]),
  ],
  bulkheadFoot: solid({ x: BULKHEAD.x - 6, y: BULKHEAD.y - 4, w: BULKHEAD.w + 12, d: BULKHEAD.d + 8, r: 2 }, 0, 2, 4),
  pedestal: solid(PEDESTAL, 0, 18, 4, 0.8),
  pedestalGroove: planOutline(insetPlan(PEDESTAL, 2.6), 18, P),
  gauges: GAUGES.map(([x, y]) => ({
    bezel: cyl(x, y, 7, 18, 2.4, 36, 0.4),
    face: ring(x, y, 5.8, GAUGE_Z, P, 32),
    ticks: radialTicks(x, y, 5.6, 20, 5, GAUGE_Z, [0.8, 1.6], P, -135 * RAD, 270 * RAD),
    center: at([x, y, GAUGE_Z]),
  })),
  senseLine: { from: at([HOUSING.x + HOUSING.w, 12, 16]), via: [at([HOUSING.x + HOUSING.w + 9, 27, 16])], to: at([PEDESTAL.x, 37, 12]) },
};

export const CLOUD_DEPTH = {
  housing: depth([0, 0, 11]),
  duct: depth([0, 31, 10]),
  blower: depth([BLOWER[0], BLOWER[1], 20]),
  outbound: depth([60, 0, OUTBOUND_Z]),
  bulkhead: depth([BULKHEAD.x, 0, 22]),
  pedestal: depth([52, 44, 9]),
};

/* ------------------------------------------------------------------ */
/* Floor 4: AI (scanner ring, and a display on the left platform)       */
/* ------------------------------------------------------------------ */

const RING_Z = F4 + CLAMP_H + 12;
const RING_H = 11;
const SENSOR_R = 20;
export const SENSOR_ANGLES = [0, 60, 120, 180, 240, 300];
const DISPLAY: Plan = { x: -50, y: 22, w: 14, d: 34, r: 1.5 };
const DISPLAY_Z = F4 + 30;
const DISPLAY_H = 24;
const STALK: Flat = [-43, 39];

const isBack = (a: number) => Math.cos((a - AZIMUTH) * RAD) < 0;

export const AI_ART = {
  struts: [45, 165, 285].map((a) => {
    const x = 18 * Math.cos(a * RAD);
    const y = 18 * Math.sin(a * RAD);
    return { a, back: isBack(a), paths: cyl(x, y, 2, F4 + CLAMP_H, RING_Z - F4 - CLAMP_H, 14) };
  }),
  ringBack: annulusHalf(0, 0, 26, TUBE_R + 1.2, RING_Z, RING_H, "back"),
  ringFront: annulusHalf(0, 0, 26, TUBE_R + 1.2, RING_Z, RING_H, "front"),
  ringGroove: ring(0, 0, 23, RING_Z + RING_H, P, 48),
  sensors: SENSOR_ANGLES.map((a) => {
    const x = SENSOR_R * Math.cos(a * RAD);
    const y = SENSOR_R * Math.sin(a * RAD);
    return { a, back: isBack(a), head: cyl(x, y, 2.8, RING_Z + RING_H, 3.4, 16), lens: at([x, y, RING_Z + RING_H + 3.4]) };
  }),
  stalkFoot: cyl(STALK[0], STALK[1], 5.5, F4, 1.6, 20),
  stalk: cyl(STALK[0], STALK[1], 2.4, F4 + 1.6, DISPLAY_Z - F4 - 1.6, 16),
  display: solid(DISPLAY, DISPLAY_Z, DISPLAY_H, 4, 0.8),
  displayTop: planOutline(insetPlan(DISPLAY, 2), DISPLAY_Z + DISPLAY_H, P),
  face: sideMatrix([DISPLAY.x + DISPLAY.w, DISPLAY.y + DISPLAY.d], DISPLAY_Z + DISPLAY_H, P, "right"),
  faceSize: { w: DISPLAY.d, h: DISPLAY_H },
  cable: { from: at([SENSOR_R * Math.cos(120 * RAD), SENSOR_R * Math.sin(120 * RAD) + 3.6, RING_Z + 4]), via: [at([-24, 30, RING_Z + 4])], to: at([DISPLAY.x + DISPLAY.w, DISPLAY.y + 6, DISPLAY_Z + 4]) },
};

export const AI_DEPTH = {
  display: depth([DISPLAY.x + DISPLAY.w / 2, DISPLAY.y + DISPLAY.d / 2, DISPLAY_Z]),
};

/* ------------------------------------------------------------------ */
/* Floor 3: Fullstack (filing cabinet on the right platform)            */
/* ------------------------------------------------------------------ */

const CABINET_H = 54;

function drawerFront(z0: number, z1: number) {
  const face = DRAWER_FACE_X + 1.6;
  const midY = CABINET.y + CABINET.d / 2;
  const hz = z0 + (z1 - z0) * 0.62;
  return {
    front: solid({ x: DRAWER_FACE_X, y: CABINET.y + 3, w: 1.6, d: CABINET.d - 6, r: 0.6 }, z0 + 0.6, z1 - z0 - 1.2, 2),
    handle: solid({ x: face, y: midY - 7, w: 2.2, d: 14, r: 1 }, z0 + 2.4, 1.8, 2),
    holder: pathOf([at([face, midY + 8, hz + 2]), at([face, midY - 8, hz + 2]), at([face, midY - 8, hz - 1.6]), at([face, midY + 8, hz - 1.6])], true),
    card: seg([face, midY + 5.5, hz + 0.2], [face, midY - 5.5, hz + 0.2]),
    lock: sideRing([face, CABINET.y + 7, z0 + (z1 - z0) / 2], 1.3, "x", P, 14),
    rivets: [at([face, midY + 9.4, hz + 0.2]), at([face, midY - 9.4, hz + 0.2])],
  };
}

export const FULLSTACK_ART = {
  plinth: solid(insetPlan(CABINET, -2), F3, 2, 4),
  cabinet: solid(CABINET, F3 + 2, CABINET_H, 4, 0.8),
  cabinetTop: planOutline(insetPlan(CABINET, 3), F3 + 2 + CABINET_H, P),
  cabinetBolts: corners(CABINET, 3.4).map(([x, y]) => at([x, y, F3 + 2 + CABINET_H])),
  drawers: DRAWER_ROWS.map(({ z0, z1 }) => drawerFront(z0, z1)),
  // A pusher arm from the tube clamp to the cabinet, on a lug.
  arm: solid({ x: TUBE_R + 0.6, y: -26, w: CABINET.x - TUBE_R - 0.6, d: 9, r: 1 }, F3 + 34, 6, 2),
  armBolts: [at([TUBE_R + 4, -21.5, F3 + 40]), at([CABINET.x - 3, -21.5, F3 + 40])],
  armLug: solid({ x: TUBE_R - 0.6, y: -27.5, w: 3, d: 12, r: 1 }, F3 + 32, 10, 2),
  plate: solid({ x: DRAWER_FACE_X, y: CABINET.y + 6, w: 0.8, d: CABINET.d - 12, r: 0.4 }, F3 + 2 + CABINET_H - 5, 3, 2),
};

export const FULLSTACK_DEPTH = {
  cabinet: depth([CABINET.x + CABINET.w / 2, CABINET.y + CABINET.d / 2, F3 + 28]),
  arm: depth([(TUBE_R + CABINET.x) / 2, -21.5, F3 + 37]),
};

/* ------------------------------------------------------------------ */
/* Floor 2: System Design (index table, queue, dead-letter tray)        */
/* ------------------------------------------------------------------ */

export const TOPICS = 13;
const MAGAZINE: Plan = { x: -54, y: 14, w: 18, d: 34, r: 2 };
export const QUEUE_Y = [21, 32, 43];
const QUEUE_X = MAGAZINE.x + MAGAZINE.w / 2;
const TRAY: Plan = { x: -48, y: 50, w: 34, d: 14, r: 2 };
const TRAY_WALL = 1.6;
const TRAY_H = 8;

export const SYSTEMS_ART = {
  tableFoot: cyl(0, 0, TABLE_R + 3, F2, 2, 56),
  table: cyl(0, 0, TABLE_R, F2 + 2, TABLE_Z - F2 - 2, 64, 0.6),
  ticks: radialTicks(0, 0, TABLE_R - 1, TOPICS * 4, 4, TABLE_Z, [1.4, 3.2], P),
  index: solid({ x: TABLE_R + 0.5, y: -2, w: 5, d: 4, r: 0.8 }, F2 + 2, TABLE_Z - F2 + 1, 2),
  indexMark: seg([TABLE_R + 0.5, 0, TABLE_Z + 1], [TABLE_R + 5.5, 0, TABLE_Z + 1]),
  magazineBase: solid(MAGAZINE, F2, 4, 4, 0.6),
  magazineBack: solid({ x: MAGAZINE.x, y: MAGAZINE.y, w: 3, d: MAGAZINE.d, r: 0.6 }, F2 + 4, 30, 2),
  magazineRail: solid({ x: MAGAZINE.x + 3, y: MAGAZINE.y, w: 2, d: MAGAZINE.d, r: 0.4 }, F2 + 22, 3, 2),
  queue: QUEUE_Y.map((y) => ({
    body: cyl(QUEUE_X, y, 5.2, F2 + 4, 20, 28),
    cap: cyl(QUEUE_X, y, 3.8, F2 + 24, 2, 20),
    band: sideArc(QUEUE_X, y, 5.2, F2 + 14, P, 16),
  })),
  chute: extrude(
    [
      [MAGAZINE.x + MAGAZINE.w, 26],
      [-TABLE_R * 0.66, 12],
      [-TABLE_R * 0.5, 20],
      [MAGAZINE.x + MAGAZINE.w, 36],
    ],
    F2 + 4,
    2.4,
    P,
  ),
  trayFloor: solid(TRAY, F2, 2, 4),
  trayBackWalls: [solid({ x: TRAY.x, y: TRAY.y, w: TRAY_WALL, d: TRAY.d, r: 0.4 }, F2 + 2, TRAY_H, 2), solid({ x: TRAY.x, y: TRAY.y, w: TRAY.w, d: TRAY_WALL, r: 0.4 }, F2 + 2, TRAY_H, 2)],
  trayFrontWalls: [
    solid({ x: TRAY.x, y: TRAY.y + TRAY.d - TRAY_WALL, w: TRAY.w, d: TRAY_WALL, r: 0.4 }, F2 + 2, TRAY_H, 2),
    solid({ x: TRAY.x + TRAY.w - TRAY_WALL, y: TRAY.y, w: TRAY_WALL, d: TRAY.d, r: 0.4 }, F2 + 2, TRAY_H, 2),
  ],
  rejected: rodX(TRAY.x + 6, TRAY.x + 25, TRAY.y + 7, F2 + 6.6, 4.4),
  trayHolder: pathOf(
    [at([TRAY.x + 8, TRAY.y + TRAY.d, F2 + 8.4]), at([TRAY.x + 22, TRAY.y + TRAY.d, F2 + 8.4]), at([TRAY.x + 22, TRAY.y + TRAY.d, F2 + 4.6]), at([TRAY.x + 8, TRAY.y + TRAY.d, F2 + 4.6])],
    true,
  ),
  trayCard: seg([TRAY.x + 10, TRAY.y + TRAY.d, F2 + 6.5], [TRAY.x + 20, TRAY.y + TRAY.d, F2 + 6.5]),
  trayRivets: [at([TRAY.x + 6.4, TRAY.y + TRAY.d, F2 + 6.5]), at([TRAY.x + 23.6, TRAY.y + TRAY.d, F2 + 6.5])],
  rejectChute: extrude(
    [
      [-TABLE_R * 0.15, TABLE_R * 0.98],
      [TRAY.x + TRAY.w - 2, TRAY.y + 2],
      [TRAY.x + TRAY.w - 2, TRAY.y + 10],
      [-TABLE_R * 0.55, TABLE_R * 0.82],
    ],
    F2 + 3,
    2,
    P,
  ),
};

export const SYSTEMS_DEPTH = {
  magazine: depth([MAGAZINE.x + MAGAZINE.w / 2, MAGAZINE.y + MAGAZINE.d / 2, F2 + 14]),
  chute: depth([-30, 22, F2 + 5]),
  tray: depth([TRAY.x + TRAY.w / 2, TRAY.y + TRAY.d / 2, F2 + 5]),
  rejectChute: depth([-18, 40, F2 + 4]),
};

/* ------------------------------------------------------------------ */
/* Floor 1: Interface (terminal and keyboard on the right platform)     */
/* ------------------------------------------------------------------ */

const DESK: Plan = { x: 18, y: -54, w: 46, d: 40, r: 2 };
const DESK_H = 14;
const MONITOR: Plan = { x: 22, y: -50, w: 18, d: 32, r: 2 };
const MONITOR_Z = F1 + DESK_H;
const MONITOR_H = 30;
const KEYBOARD: Plan = { x: 46, y: -48, w: 12, d: 28, r: 1 };

export const SCREEN = {
  matrix: sideMatrix([MONITOR.x + MONITOR.w, MONITOR.y + MONITOR.d], MONITOR_Z + MONITOR_H, P, "right"),
  u0: 3.2,
  v0: 3.2,
  w: MONITOR.d - 6.4,
  h: MONITOR_H - 9,
};

export const INTERFACE_ART = {
  desk: solid(DESK, F1, DESK_H, 4, 0.8),
  deskSeam: boxSeam(DESK, F1 + 4),
  vents: join(Array.from({ length: 6 }, (_, i) => DESK.y + 9 + i * 5).map((y) => seg([DESK.x + DESK.w, y, F1 + 8], [DESK.x + DESK.w, y + 2.6, F1 + 8]))),
  monitor: solid(MONITOR, MONITOR_Z, MONITOR_H, 4, 0.8),
  monitorTop: planOutline(insetPlan(MONITOR, 2.4), MONITOR_Z + MONITOR_H, P),
  neck: solid({ x: MONITOR.x + 4, y: MONITOR.y + MONITOR.d / 2 - 4, w: 8, d: 8, r: 1 }, MONITOR_Z - 0.01, 0.01, 2),
  keyboard: solid(KEYBOARD, MONITOR_Z, 2.6, 2, 0.4),
  keys: Array.from({ length: 4 }, (_, row) => Array.from({ length: 10 }, (_, col) => at([KEYBOARD.x + 2.4 + row * 2.4, KEYBOARD.y + 2.4 + col * 2.6, MONITOR_Z + 2.6]))).flat(),
  lamp: cyl(DESK.x + DESK.w - 6, DESK.y + DESK.d - 6, 2.2, F1 + DESK_H, 2.4, 16),
  lampTop: at([DESK.x + DESK.w - 6, DESK.y + DESK.d - 6, F1 + DESK_H + 2.4]),
  cable: { from: at([MONITOR.x, MONITOR.y + 6, MONITOR_Z + 18]), via: [at([8, -38, MONITOR_Z + 18])], to: at([TUBE_R * 0.42, -TUBE_R * 0.9, MONITOR_Z + 18]) },
};

export const INTERFACE_DEPTH = {
  desk: depth([DESK.x + DESK.w / 2, DESK.y + DESK.d / 2, F1 + 7]),
  monitor: depth([MONITOR.x + MONITOR.w / 2, MONITOR.y + MONITOR.d / 2, MONITOR_Z + 15]),
  keyboard: depth([KEYBOARD.x + KEYBOARD.w / 2, KEYBOARD.y + KEYBOARD.d / 2, MONITOR_Z + 1]),
};

/* ------------------------------------------------------------------ */
/* Roof: the intake                                                     */
/* ------------------------------------------------------------------ */

const BELL_Z = TOP + CLAMP_H;
export const INTAKE = {
  bell: cyl(0, 0, 17, BELL_Z, 9, 48, 0.8),
  bellBolts: boltCircle(0, 0, 15, BELL_Z + 9, 10, 18),
  hinge: solid({ x: -24, y: -5, w: 7, d: 10, r: 1 }, BELL_Z + 3, 9, 2),
  lid: cyl(0, 0, 18, BELL_Z + 9, 3, 48, 0.6),
  lidKnob: cyl(0, 0, 3.2, BELL_Z + 12, 3, 18),
  lidRing: ring(0, 0, 14, BELL_Z + 12, P, 40),
};

/** A horizontal band of the figure per floor, used as a hit area for picking it. */
export const FLOOR_HITS = [
  [F1, TOP + 30],
  [F2, F1],
  [F3, F2],
  [F4, F3],
  [-18, F4],
].map(([z0, z1]) => {
  const top = at([0, 0, z1])[1];
  const bottom = at([0, 0, z0])[1];
  return `M0 ${top.toFixed(1)}H${WIDTH}V${bottom.toFixed(1)}H0Z`;
});

export type { SolidPaths };
