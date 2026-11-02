/*
 * The messaging machine's geometry, built once at module load: every part in paint order (back to
 * front), the pipes a message travels, and where the live marks sit. Counts come from the model.
 *
 * Plan (x along the bench, y toward the viewer): Postgres stands at the back; the container lies
 * on the left with its three ports at its right end; the gateway (manifold, Redis bus bar, two
 * replicas, device sockets) is on the right; thirteen topic tubes run across the front, through
 * the workers, into the dead-letter tray; the client terminal sits front left.
 */

import {
  type Plane,
  type Run,
  pointAt,
  type Solid,
  type V2,
  type V3,
  at,
  axesOf,
  bounds,
  box,
  circle,
  disc,
  extrude,
  faceCircle,
  faceMatrix,
  faceRect,
  line,
  lines,
  onFace,
  pipe,
  poly,
  prism,
  rect,
  ringAt,
  rounded,
} from "./iso";
import { type Hop, LOST_AT, MAX_DELIVERIES, SOCKETS_PER_REPLICA, TABLES, TOPICS, WORKERS, workerFor } from "./model";

export type PartId =
  | "bench"
  | "postgres"
  | "container"
  | "gateway"
  | "redis"
  | "devices"
  | "client"
  | "topics"
  | "workers"
  | "dlq";

export type LineClass = "edge" | "crease" | "faint" | "glint";
export type FillClass = "cavity" | "well" | "glass" | "s0" | "s3";

/** Live elements the component draws in their place in the paint order. */
export type SlotId =
  | "rows"
  | "latches"
  | "seq"
  | "key"
  | "screen"
  | "lever"
  | "sockets"
  | "deviceScreens"
  | "pips"
  | "tokens"
  | "dlqCount"
  | "shadow";

/** `fine` marks detail the simplified figure (phones) leaves out. */
export type Paint =
  | { k: "solid"; s: Solid; tone?: "base" | "core"; fine?: boolean }
  | { k: "line"; d: string; c: LineClass; fine?: boolean }
  | { k: "fill"; d: string; c: FillClass }
  | { k: "dots"; pts: V2[]; r: number; fine?: boolean }
  | { k: "pipe"; id?: string; run: Run; r: number; cable?: boolean }
  | { k: "slot"; id: SlotId };

export type Part = { id: PartId | null; key: string; paint: Paint[] };

/* ---------------------------------------------------------------- helpers */

const solid = (s: Solid): Paint => ({ k: "solid", s });
const ln = (d: string, c: LineClass, fine = false): Paint => ({ k: "line", d, c, fine });
/** The same paint, marked as fine detail. */
const fine = (ps: Paint[]): Paint[] => ps.map((p) => (p.k === "solid" || p.k === "line" || p.k === "dots" ? { ...p, fine: true } : p));
const fill = (d: string, c: FillClass): Paint => ({ k: "fill", d, c });
const slot = (id: SlotId): Paint => ({ k: "slot", id });
const lift = (p: V3, n: V3, t: number): V3 => [p[0] + n[0] * t, p[1] + n[1] * t, p[2] + n[2] * t];

/** Screw heads lying on a face: a ring with a dot. */
function screws(face: Plane, points: V3[]): Paint[] {
  return fine([ln(points.map((p) => poly(faceCircle(face, p, 1.2, 12))).join(""), "crease"), { k: "dots", pts: points.map(at), r: 0.5 }]);
}

/** A label plate on a face: a thin plate, an inset line, three rules of different lengths, two screws. */
function labelPlate(face: Plane, o: V3, w: number, h: number): Paint[] {
  const n = axesOf(face).n;
  const up = (p: V3) => lift(p, n, 0.6);
  const rule = (v: number, len: number) => line([up(onFace(face, o, 3.2, v)), up(onFace(face, o, 3.2 + len, v))]);
  return fine([
    solid(extrude(faceRect(face, o, 0, 0, w, h), n, 0.6)),
    ln(poly(faceRect(face, o, 1.2, 1.2, w - 2.4, h - 2.4).map(up)), "faint"),
    ln(rule(h * 0.36, w * 0.5) + rule(h * 0.54, w * 0.66) + rule(h * 0.72, w * 0.38), "crease"),
    { k: "dots", pts: [at(up(onFace(face, o, w - 2.6, 2.4))), at(up(onFace(face, o, w - 2.6, h - 2.4)))], r: 0.45 },
  ]);
}

/** A flanged port standing proud of a face: flange, bolt circle, bore. */
function port(face: Plane, c: V3, r: number): Paint[] {
  const n = axesOf(face).n;
  const bolts = Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    return at(lift(onFace(face, c, r * 0.74 * Math.cos(a), r * 0.74 * Math.sin(a)), n, 1.6));
  });
  return [solid(disc(face, c, r, 1.6)), ln(poly(faceCircle(face, lift(c, n, 1.6), r * 0.46, 18)), "crease"), { k: "dots", pts: bolts, r: 0.42 }];
}

/** Upright cylinder. */
const cylinder = (cx: number, cy: number, r: number, z0: number, z1: number, steps = 20) => prism(circle(cx, cy, r, steps), z0, z1);

/** Inset outline on a box's cap. */
const capInset = (x: number, y: number, w: number, d: number, z: number, by = 3) =>
  ln(poly(ringAt(rect(x + by, y + by, w - by * 2, d - by * 2), z)), "faint", true);

/* ---------------------------------------------------------------- layout */

/** The bench plate the platform is bolted to. */
const BENCH = { x: 0, y: 0, w: 430, d: 280, t: 9, r: 9 };

const CONTAINER = { x: 22, y: 106, w: 154, d: 56, z: 5, h: 60 };
const CTOP = CONTAINER.z + CONTAINER.h;
const CX1 = CONTAINER.x + CONTAINER.w;
const CY1 = CONTAINER.y + CONTAINER.d;

/** Postgres: a pedestal, 33 thin tables and the messages table on top, in a rod cage. */
const PG = { x: 152, y: 12, w: 56, d: 56 };
const PG_BASE = 12;
const SLAB = 1.3;
const PITCH = 2.2;
const TOP_SLAB = 6;
const PG_TOP0 = PG_BASE + (TABLES - 1) * PITCH;
const PG_TOP = PG_TOP0 + TOP_SLAB;

/** The REST port's tee on the container's long wall, under the riser to the messages table. */
const REST = { x: 160, z: 34 };
const TEE_Y = CY1 + 6;

/** Gateway: the manifold coupled to the container's gateway port, the Redis bar, two replicas. */
const MANIFOLD = { x: CX1 + 6, y: 112, w: 24, d: 32, h: 26 };
const FEED_Y = MANIFOLD.y + MANIFOLD.d / 2;
const GATE_PORT: V3 = [CX1, FEED_Y, 14];
const BAR = { x: 226, y: 78, w: 8, d: 108, z: 18, h: 5 };
const REPLICA = { x: 250, w: 38, d: 34, h: 26 };
const REPLICA_Y = [86, 142];

/** Topics: the header under the worker port, thirteen tubes, the worker blocks, the tray. */
const HEADER = { x: 212, y: 190, w: 20, d: 82, h: 18 };
const TUBE_R = 1.25;
const TUBE_Z = 7;
const TUBE_PITCH = 5.8;
const TUBE_Y0 = HEADER.y + (HEADER.d - (TOPICS - 1) * TUBE_PITCH) / 2;
const TUBE_X0 = HEADER.x + HEADER.w;
const TUBE_X1 = 372;
/** Worker 0 takes the back tubes, so the three blocks read as one row across the ribbon. */
const WORKER_X = [338, 309, 280];
const WORKER = { w: 22, z: TUBE_Z + TUBE_R, h: 13 };
const TRAY = { x: TUBE_X1, y: 186, w: 48, d: 90, h: 10 };
const WORKER_PORT: V3 = [CX1, CY1 - 10, 22];

/** The client terminal, front left, and the receiving devices on the right. */
const CLIENT = { x: 16, y: 190, w: 80, d: 60, h: 7 };
const DEVICE = { x: 316, w: 26, d: 20, h: 4 };

export const tubeY = (t: number) => TUBE_Y0 + t * TUBE_PITCH;

/** The tubes each worker block sits on. */
const topicsOf = (w: number) => Array.from({ length: TOPICS }, (_, t) => t).filter((t) => workerFor(t) === w);
const workerBox = (w: number) => {
  const ts = topicsOf(w);
  const y0 = tubeY(ts[0]) - TUBE_PITCH / 2 + 0.5;
  const y1 = tubeY(ts[ts.length - 1]) + TUBE_PITCH / 2 - 0.5;
  return { x: WORKER_X[w], y: y0, w: WORKER.w, d: y1 - y0, z: WORKER.z, h: WORKER.h };
};

/** Lamps on each worker's lit face: one per delivery attempt, then a gap and its ack lamp. */
const LAMP_R = 1.55;
function lampsOf(w: number): V3[] {
  const b = workerBox(w);
  const o: V3 = [b.x, b.y + b.d, b.z + b.h];
  return Array.from({ length: MAX_DELIVERIES + 1 }, (_, i) => onFace("left", o, 4 + i * 4.3 + (i === MAX_DELIVERIES ? 1.6 : 0), 6.2));
}

/* ---------------------------------------------------------------- pipes */

const P_R = 2.1;

const cableRun = pipe(
  [
    [CLIENT.x + 34, CLIENT.y + 4, 2.4],
    [CLIENT.x + 34, TEE_Y + 9, 2.4],
    [REST.x, TEE_Y + 9, 2.4],
    [REST.x, TEE_Y, 6],
    [REST.x, TEE_Y, REST.z - 4],
  ],
  7,
);

const riserRun = pipe(
  [
    [REST.x, TEE_Y, REST.z + 4],
    [REST.x, TEE_Y, PG_TOP0 + TOP_SLAB / 2],
    [REST.x, PG.y + PG.d + 1, PG_TOP0 + TOP_SLAB / 2],
  ],
  9,
);

const emitRun = pipe(
  [
    [196, PG.y + PG.d + 1, 46],
    [196, FEED_Y, 46],
    [196, FEED_Y, MANIFOLD.h + 2],
  ],
  8,
);

const feedRun = pipe(
  [
    [MANIFOLD.x + MANIFOLD.w, FEED_Y, 12],
    [BAR.x + BAR.w / 2, FEED_Y, 12],
    [BAR.x + BAR.w / 2, FEED_Y, BAR.z],
  ],
  5,
);

/** Bus taps: along the bar's top from the feed, then out to a replica's back. */
const busRuns = REPLICA_Y.map((ry) => {
  const y = ry + REPLICA.d / 2;
  const z = BAR.z + BAR.h + 1;
  return pipe(
    [
      [BAR.x + BAR.w / 2, FEED_Y, z],
      [BAR.x + BAR.w / 2, y, z],
      [REPLICA.x + 3, y, z],
    ],
    3,
  );
});

/** Device sockets on each replica's shaded face (+x), each cabled to a device. */
const SOCKET_AT: V3[] = SOCKETS_PER_REPLICA.flatMap((n, r) =>
  Array.from({ length: n }, (_, i): V3 => [REPLICA.x + REPLICA.w, REPLICA_Y[r] + REPLICA.d / 2 + (i - (n - 1) / 2) * 11, 12]),
);
const DEVICE_Y = SOCKET_AT.map((s, i) => [76, 104, 150][i] ?? s[1]);
const sockRuns = SOCKET_AT.map((s, i) => {
  const dy = DEVICE_Y[i] + DEVICE.d / 2;
  return pipe(
    [
      [s[0] + 2.2, s[1], s[2]],
      [s[0] + 9, s[1], s[2]],
      [s[0] + 9, s[1], 1.2],
      [s[0] + 9, dy, 1.2],
      [DEVICE.x, dy, 1.2],
    ],
    4,
  );
});

const pubRun = pipe(
  [
    [CX1 + 1.6, WORKER_PORT[1], WORKER_PORT[2]],
    [HEADER.x + 10, WORKER_PORT[1], WORKER_PORT[2]],
    [HEADER.x + 10, HEADER.y + 5, WORKER_PORT[2]],
    [HEADER.x + 10, HEADER.y + 5, HEADER.h],
  ],
  7,
);

const tubeRuns = Array.from({ length: TOPICS }, (_, t) =>
  pipe([
    [TUBE_X0, tubeY(t), TUBE_Z],
    [TUBE_X1 + 1, tubeY(t), TUBE_Z],
  ]),
);

/** Every pipe a message can travel, by id. */
export const PIPES: Record<string, { run: Run; r: number }> = {
  cable: { run: cableRun, r: 1.5 },
  riser: { run: riserRun, r: P_R },
  emit: { run: emitRun, r: P_R },
  feed: { run: feedRun, r: 1.8 },
  busA: { run: busRuns[0], r: 1.1 },
  busB: { run: busRuns[1], r: 1.1 },
  ...Object.fromEntries(sockRuns.map((run, i) => [`sock${i}`, { run, r: 0.8 }])),
  pub: { run: pubRun, r: 1.8 },
  ...Object.fromEntries(tubeRuns.map((run, t) => [`tube${t}`, { run, r: TUBE_R }])),
};

const pipePaint = (id: string, cable = false): Paint => ({ k: "pipe", id, run: PIPES[id].run, r: PIPES[id].r, cable });

/* ---------------------------------------------------------------- parts */

function benchPart(): Part {
  const { x, y, w, d, t, r } = BENCH;
  const feet = [
    [x + 18, y + 18],
    [x + w - 18, y + 18],
    [x + 18, y + d - 18],
    [x + w - 18, y + d - 18],
    [x + w / 2, y + d - 18],
    [x + w - 18, y + d / 2],
  ].map(([fx, fy]) => solid(cylinder(fx, fy, 6, -t - 6, -t)));
  const corners: V3[] = [
    [x + 9, y + 9, 0],
    [x + w - 9, y + 9, 0],
    [x + 9, y + d - 9, 0],
    [x + w - 9, y + d - 9, 0],
    [x + w / 2, y + 9, 0],
    [x + w / 2, y + d - 9, 0],
  ];
  return {
    id: "bench",
    key: "bench",
    paint: [
      ...feet,
      { k: "solid", s: prism(rounded(x, y, w, d, r, 6), -t, 0), tone: "base" },
      ln(poly(ringAt(rounded(x + 4.5, y + 4.5, w - 9, d - 9, r - 4.5, 5), 0)), "faint", true),
      ...screws("top", corners),
      // The tests plaque, in front of the terminal.
      ...labelPlate("top", [x + 112, y + d - 30, 0], 44, 14),
      slot("shadow"),
    ],
  };
}

function postgresPart(): Part {
  const { x, y, w, d } = PG;
  const paint: Paint[] = [];
  // Pedestal, with the sequence counter's window on its lit face.
  paint.push(solid(prism(rounded(x - 6, y - 6, w + 12, d + 12, 3, 3), 0, PG_BASE)));
  const winO: V3 = [x + 4, y + d + 6, PG_BASE - 2.2];
  paint.push(fill(poly(faceRect("left", winO, 0, 0, 30, 7.6)), "well"));
  paint.push(ln(poly(faceRect("left", winO, 0, 0, 30, 7.6)), "crease"));
  paint.push(slot("seq"));
  paint.push(...screws("left", [onFace("left", winO, 36, 3.8), onFace("left", winO, -3.4, 3.8)]));
  // The dark core the tables are stacked round: it shows in the gaps between them.
  paint.push({ k: "solid", s: box(x + 1.5, y + 1.5, PG_BASE, w - 3, d - 3, PG_TOP - PG_BASE), tone: "core" });
  // Thirty-three thin tables under the messages table, one path per face tone.
  const left: string[] = [];
  const right: string[] = [];
  const seams: string[] = [];
  const glints: string[] = [];
  for (let i = 0; i < TABLES - 1; i++) {
    const z0 = PG_BASE + i * PITCH;
    const z1 = z0 + SLAB;
    left.push(poly([[x, y + d, z0], [x + w, y + d, z0], [x + w, y + d, z1], [x, y + d, z1]]));
    right.push(poly([[x + w, y, z0], [x + w, y + d, z0], [x + w, y + d, z1], [x + w, y, z1]]));
    seams.push(line([[x, y + d, z0], [x + w, y + d, z0], [x + w, y, z0]]));
    seams.push(line([[x + w, y + d, z0], [x + w, y + d, z1]]));
    glints.push(line([[x, y + d, z1], [x + w, y + d, z1]]));
  }
  paint.push(fill(left.join(""), "s3"), fill(right.join(""), "s0"));
  paint.push(ln(seams.join(""), "crease"), ln(glints.join(""), "glint"));
  paint.push(slot("latches"));
  // The messages table, with its ledger of rows.
  paint.push(solid(box(x, y, PG_TOP0, w, d, TOP_SLAB)));
  const ledger = ringAt(rect(x + 5, y + 5, w - 10, d - 10), PG_TOP);
  paint.push(fill(poly(ledger), "well"));
  paint.push(ln(poly(ledger), "crease"));
  paint.push(slot("rows"));
  paint.push(...screws("top", [[x + 2.6, y + 2.6, PG_TOP], [x + w - 2.6, y + 2.6, PG_TOP], [x + 2.6, y + d - 2.6, PG_TOP], [x + w - 2.6, y + d - 2.6, PG_TOP]]));
  // The cage: rods at the visible corners, capped with nuts.
  for (const [rx, ry] of [
    [x - 2.4, y + d + 2.4],
    [x + w + 2.4, y + d + 2.4],
    [x + w + 2.4, y - 2.4],
  ]) {
    paint.push(solid(cylinder(rx, ry, 1.5, PG_BASE, PG_TOP + 1.2, 12)));
    paint.push(solid(cylinder(rx, ry, 2.3, PG_TOP + 1.2, PG_TOP + 2.6, 6)));
  }
  return { id: "postgres", key: "postgres", paint };
}

/** One shipping-container image: corrugated walls, corner castings, sleepers, three ports. */
function containerPart(): Part {
  const { x, y, w, d, z, h } = CONTAINER;
  const paint: Paint[] = [];
  for (const sx of [x + 8, x + w - 18]) paint.push(solid(box(sx, y - 3, 0, 10, d + 6, z)));
  paint.push(solid(box(x, y, z, w, d, h)));
  // Corrugation: a crease and a glint per rib on the long wall; creases on the end wall.
  const ribs: V3[][] = [];
  const lights: V3[][] = [];
  for (let rx = x + 10; rx <= x + w - 10; rx += 5) {
    ribs.push([[rx, y + d, z + 4], [rx, y + d, z + h - 4]]);
    lights.push([[rx + 2, y + d, z + 4], [rx + 2, y + d, z + h - 4]]);
  }
  for (let ry = y + 8; ry <= y + d - 8; ry += 5) ribs.push([[x + w, ry, z + 4], [x + w, ry, z + h - 4]]);
  paint.push(ln(lines(ribs), "crease", true), ln(lines(lights), "faint", true));
  paint.push(
    ln(
      lines([
        [[x, y + d, z + 4], [x + w, y + d, z + 4], [x + w, y, z + 4]],
        [[x, y + d, z + h - 4], [x + w, y + d, z + h - 4], [x + w, y, z + h - 4]],
      ]),
      "crease",
    ),
  );
  // The roof: a raised panel and its cross ribs.
  paint.push(capInset(x, y, w, d, z + h, 4.5));
  const roofRibs: V3[][] = [];
  for (let rx = x + 14; rx <= x + w - 14; rx += 12) roofRibs.push([[rx, y + 4.5, z + h], [rx, y + d - 4.5, z + h]]);
  paint.push(ln(lines(roofRibs), "faint", true));
  // Corner castings, proud of the corners, each with its oval hole.
  const k = 6;
  for (const [cx, cy, cz] of [
    [x, y, z + h - k],
    [x, y + d - k, z + h - k],
    [x + w - k, y + d - k, z + h - k],
    [x + w - k, y, z + h - k],
    [x, y + d - k, z],
    [x + w - k, y + d - k, z],
    [x + w - k, y, z],
  ]) {
    paint.push(solid(box(cx - 0.3, cy - 0.3, cz - 0.3, k + 0.6, k + 0.6, k + 0.6)));
    if (cy + k >= y + d) paint.push(fill(poly(faceCircle("left", [cx + k / 2, y + d + 0.31, cz + k / 2], 1.5, 10)), "cavity"));
    if (cx + k >= x + w) paint.push(fill(poly(faceCircle("right", [x + w + 0.31, cy + k / 2, cz + k / 2], 1.5, 10)), "cavity"));
  }
  paint.push(...labelPlate("left", [x + 16, y + d, z + h - 18], 30, 12));
  // Three ports: REST on the long wall; the gateway and the workers on the end wall.
  paint.push(...port("left", [REST.x, y + d, REST.z], 5.5));
  paint.push(...port("right", GATE_PORT, 5));
  paint.push(...port("right", WORKER_PORT, 4.6));
  return { id: "container", key: "container", paint };
}

/** A pipe support on the roof, under the riser. */
function roofSupport(): Paint[] {
  const sy = CONTAINER.y + CONTAINER.d / 2;
  const zr = PG_TOP0 + TOP_SLAB / 2;
  return [
    solid(box(REST.x - 2.5, sy - 2.5, CTOP, 5, 5, 2)),
    solid(cylinder(REST.x, sy, 1, CTOP + 2, zr - P_R - 0.6, 8)),
    solid(box(REST.x - 3.2, sy - 1.6, zr - P_R - 0.6, 6.4, 3.2, 1.2)),
  ];
}

/** The REST tee: the client's cable comes up into it and the riser leaves from its top. */
const tee = (): Paint[] => [solid(box(REST.x - 3, CY1 + 1.6, REST.z - 4, 6, 6.4, 8))];

function gatewayParts(): Part[] {
  const m = MANIFOLD;
  const manifold: Paint[] = [
    // The coupling from the container's gateway port.
    solid(box(CX1 + 1.6, FEED_Y - 3, GATE_PORT[2] - 3, m.x - CX1 - 1.6, 6, 6)),
    solid(box(m.x, m.y, 0, m.w, m.d, m.h)),
    capInset(m.x, m.y, m.w, m.d, m.h),
    solid(disc("top", [196, FEED_Y, m.h], 4, 2)),
    ...screws("top", [[m.x + 3, m.y + 3, m.h], [m.x + m.w - 3, m.y + 3, m.h], [m.x + 3, m.y + m.d - 3, m.h], [m.x + m.w - 3, m.y + m.d - 3, m.h]]),
    ...labelPlate("left", [m.x + 3, m.y + m.d, m.h - 4], m.w - 6, 9),
  ];
  const b = BAR;
  const redis: Paint[] = [
    ...[b.y + 8, b.y + b.d - 8].flatMap((sy) => [
      solid(cylinder(b.x + b.w / 2, sy, 3.2, 0, 2, 12)),
      solid(cylinder(b.x + b.w / 2, sy, 2, 2, b.z, 12)),
    ]),
    pipePaint("feed"),
    solid(box(b.x, b.y, b.z, b.w, b.d, b.h)),
    { k: "dots", pts: [b.y + 3.5, FEED_Y, b.y + b.d - 3.5].map((sy) => at([b.x + b.w / 2, sy, b.z + b.h])), r: 0.9 },
    pipePaint("busA"),
    pipePaint("busB"),
  ];
  const replicas: Paint[] = REPLICA_Y.flatMap((ry) => {
    const rx = REPLICA.x;
    const vents: V3[][] = [];
    for (let i = 0; i < 6; i++) vents.push([[rx + 7 + i * 4.6, ry + 5, REPLICA.h], [rx + 7 + i * 4.6, ry + REPLICA.d - 12, REPLICA.h]]);
    return [
      solid(box(rx, ry, 0, REPLICA.w, REPLICA.d, REPLICA.h)),
      ln(lines(vents), "crease", true),
      capInset(rx, ry, REPLICA.w, REPLICA.d, REPLICA.h),
      ...labelPlate("left", [rx + 4, ry + REPLICA.d, REPLICA.h - 5], 20, 8),
    ];
  });
  const sockets: Paint[] = SOCKET_AT.flatMap((s) => [
    solid(disc("right", s, 3.4, 1.2)),
    fill(poly(faceCircle("right", [s[0] + 1.2, s[1], s[2]], 1.8, 14)), "cavity"),
    solid(disc("right", [s[0] + 1.2, s[1], s[2]], 1.3, 1.4, 12)),
  ]);
  const devices: Paint[] = DEVICE_Y.flatMap((dy) => [
    solid(prism(rounded(DEVICE.x, dy, DEVICE.w, DEVICE.d, 3, 3), 0, DEVICE.h)),
    fill(poly(ringAt(rounded(DEVICE.x + 3, dy + 3, DEVICE.w - 6, DEVICE.d - 6, 1.5, 3), DEVICE.h)), "glass"),
  ]);
  return [
    { id: "gateway", key: "manifold", paint: manifold },
    // Postgres's emit passes in front of the container's end and drops onto the manifold.
    { id: null, key: "emit", paint: [pipePaint("emit")] },
    { id: "redis", key: "redis", paint: redis },
    { id: "gateway", key: "replicas", paint: [...replicas, ...sockets, slot("sockets")] },
    { id: null, key: "socket-cables", paint: sockRuns.map((_, i) => pipePaint(`sock${i}`, true)) },
    { id: "devices", key: "devices", paint: [...devices, slot("deviceScreens")] },
  ];
}

function clientPart(): Part {
  const c = CLIENT;
  return {
    id: "client",
    key: "client",
    paint: [
      solid(prism(rounded(c.x, c.y, c.w, c.d, 4, 4), 0, c.h)),
      // A raised bezel round the screen.
      solid(prism(rounded(SCREEN.x - 2, SCREEN.y - 2, SCREEN.w + 4, SCREEN.d + 4, 2.5, 3), c.h, SCREEN.z)),
      fill(poly(ringAt(rounded(SCREEN.x, SCREEN.y, SCREEN.w, SCREEN.d, 1.5, 3), SCREEN.z)), "glass"),
      slot("screen"),
      // The tenant switch: a slot with its lever, and the Send key.
      fill(poly(ringAt(rect(c.x + 8, c.y + 45, 19, 4.4), c.h)), "cavity"),
      slot("lever"),
      ...screws("top", [[c.x + 4, c.y + 4, c.h], [c.x + c.w - 4, c.y + c.d - 4, c.h]]),
      slot("key"),
    ],
  };
}

/** The client's screen: where its message bubble and status mark sit. */
export const SCREEN = { x: CLIENT.x + 7, y: CLIENT.y + 6, w: CLIENT.w - 14, d: 30, z: CLIENT.h + 2.4 };

/** The Send key, at rest. */
export const SEND_KEY = prism(rounded(CLIENT.x + CLIENT.w - 28, CLIENT.y + 42, 21, 11, 2.2, 3), CLIENT.h, CLIENT.h + 2.8);

/** The tenant lever, at home; it slides along its slot by LEVER_THROW for the other tenant. */
export const LEVER = box(CLIENT.x + 9, CLIENT.y + 45.6, CLIENT.h - 0.5, 6, 3.2, 3.4);

function topicParts(): Part[] {
  const hd = HEADER;
  const header: Paint[] = [
    solid(box(hd.x, hd.y, 0, hd.w, hd.d, hd.h)),
    capInset(hd.x, hd.y, hd.w, hd.d, hd.h),
    solid(disc("top", [hd.x + 10, hd.y + 5, hd.h], 3.4, 1.4)),
    ...screws("top", [[hd.x + 4, hd.y + hd.d - 4, hd.h], [hd.x + hd.w - 4, hd.y + hd.d - 4, hd.h]]),
    ...Array.from({ length: TOPICS }, (_, t) => solid(disc("right", [TUBE_X0, tubeY(t), TUBE_Z], 2.1, 1, 10))),
  ];
  // Combs that carry the tubes clear of the bench.
  const comb = (cx: number): Paint => solid(box(cx, hd.y + 3, 0, 4, hd.d - 6, TUBE_Z - TUBE_R - 0.1));
  const tubes = Array.from({ length: TOPICS }, (_, t) => pipePaint(`tube${t}`));
  // Workers, back to front: each block sits on its own run of tubes.
  const workers = Array.from({ length: WORKERS }, (_, w) => w).flatMap((w): Paint[] => {
    const b = workerBox(w);
    const top = b.z + b.h;
    const slots: V3[][] = [];
    for (let s = 0; s < 3; s++) slots.push([[b.x + 4, b.y + b.d - 9 + s * 2.4, top], [b.x + b.w - 4, b.y + b.d - 9 + s * 2.4, top]]);
    return [
      solid(box(b.x, b.y, b.z, b.w, b.d, b.h)),
      capInset(b.x, b.y, b.w, b.d, top, 2.2),
      ln(lines(slots), "crease", true),
      ...lampsOf(w).map((c) => solid(disc("left", c, LAMP_R, 0.6, 14))),
    ];
  });
  const t = TRAY;
  const wall = 1.4;
  const tray: Paint[] = [
    solid(box(t.x, t.y, 0, t.w, t.d, t.h)),
    fill(poly(ringAt(rect(t.x + wall, t.y + wall, t.w - wall * 2, t.d - wall * 2), t.h)), "cavity"),
  ];
  // Twelve dividers make thirteen compartments, one under each tube's end.
  const dividers: V3[][] = [];
  for (let i = 1; i < TOPICS; i++) {
    const dy = (tubeY(i - 1) + tubeY(i)) / 2;
    dividers.push([[t.x + wall, dy, t.h], [t.x + t.w - wall, dy, t.h]]);
  }
  tray.push(ln(lines(dividers), "crease"), slot("tokens"));
  const winO: V3 = [t.x + 12, t.y + t.d, t.h - 1.4];
  tray.push(fill(poly(faceRect("left", winO, 0, 0, 22, 7.2)), "well"), ln(poly(faceRect("left", winO, 0, 0, 22, 7.2)), "crease"));
  tray.push(slot("dlqCount"));
  return [
    { id: null, key: "pub", paint: [pipePaint("pub")] },
    { id: "topics", key: "header", paint: header },
    { id: "topics", key: "tubes", paint: [comb(TUBE_X0 + 6), ...tubes, comb(TUBE_X1 - 8)] },
    { id: "workers", key: "workers", paint: [...workers, slot("pips")] },
    { id: "dlq", key: "dlq", paint: tray },
  ];
}

/** Every part, back to front. */
export const PARTS: Part[] = [
  benchPart(),
  postgresPart(),
  containerPart(),
  { id: "container", key: "roof", paint: roofSupport() },
  { id: null, key: "riser", paint: [...tee(), pipePaint("riser")] },
  ...gatewayParts(),
  clientPart(),
  { id: null, key: "cable", paint: [pipePaint("cable", true)] },
  ...topicParts(),
];

/* ---------------------------------------------------------------- live geometry */

/** A world-space move as a figure-space offset, for parts that slide. */
function throwOf(v: V3): V2 {
  const a = at(v);
  const b = at([0, 0, 0]);
  return [a[0] - b[0], a[1] - b[1]];
}

export const LEVER_THROW = throwOf([10, 0, 0]);
/** How far a latch shoots out of its table when locked. */
export const LATCH_THROW = throwOf([0, 2.4, 0]);

/** Where a dropped reply dies on the cable. */
export const BREAK_AT = pointAt(cableRun, (1 - LOST_AT) * cableRun.length);

/** The messages table's ledger: a row per shown message, oldest at the back, a seq cell and a key cell. */
export function rowCells(i: number, of: number, shown = 6) {
  const y0 = PG.y + 8 + (i + (shown - of)) * 6.5;
  const z = PG_TOP + 0.01;
  return {
    seq: poly(ringAt(rect(PG.x + 8, y0, 9, 4.1), z)),
    key: poly(ringAt(rect(PG.x + 20, y0, PG.w - 28, 4.1), z)),
  };
}

/** A tenant lock on each table: a latch on its lit face, shot out when the other tenant reads. */
export function latch(i: number) {
  const z0 = PG_BASE + i * PITCH + 0.1;
  const h = i === TABLES - 1 ? TOP_SLAB - 0.2 : SLAB - 0.2;
  return box(PG.x + 3, PG.y + PG.d - 0.6, z0, 6, 1.6, h);
}

/** Maps face coordinates onto the counters' windows. */
export const SEQ_WINDOW = faceMatrix("left", [PG.x + 4, PG.y + PG.d + 6.02, PG_BASE - 2.2]);
export const DLQ_WINDOW = faceMatrix("left", [TRAY.x + 12, TRAY.y + TRAY.d + 0.02, TRAY.h - 1.4]);

/** The socket rings that light as a message arrives. */
export const SOCKET_RINGS = SOCKET_AT.map((s) => poly(faceCircle("right", [s[0] + 1.21, s[1], s[2]], 2.7, 18)));

export const DEVICE_BUBBLES = DEVICE_Y.map((dy) => poly(ringAt(rect(DEVICE.x + 6, dy + 6, DEVICE.w - 13, 3.4), DEVICE.h + 0.02)));

const onScreen = (u: number, v: number): V3 => [SCREEN.x + u, SCREEN.y + v, SCREEN.z + 0.01];
/** The client's outgoing bubble, its earlier lines, and status marks (sent, lost, waiting). */
export const CLIENT_BUBBLE = poly([onScreen(24, 17), onScreen(SCREEN.w - 5, 17), onScreen(SCREEN.w - 5, 21.6), onScreen(24, 21.6)]);
export const CLIENT_LINES = lines([
  [onScreen(5, 6), onScreen(30, 6)],
  [onScreen(5, 10), onScreen(20, 10)],
]);
export const CLIENT_TICK = line([onScreen(8, 23.2), onScreen(10.4, 26), onScreen(15, 20.6)]);
export const CLIENT_CROSS = lines([
  [onScreen(8.5, 20.6), onScreen(14, 26)],
  [onScreen(14, 20.6), onScreen(8.5, 26)],
]);
export const CLIENT_WAIT = at(onScreen(11, 23.4));

export const LAMPS = Array.from({ length: WORKERS }, (_, w) =>
  lampsOf(w).map((c) => poly(faceCircle("left", lift(c, [0, 1, 0], 0.62), LAMP_R - 0.25, 14))),
);

/** A dead-lettered message: a small block in its topic's compartment, stacked by count. */
export function token(topic: number, n: number) {
  return box(TRAY.x + 6 + (n % 6) * 6.4, tubeY(topic) - 1.6, 1.4 + Math.floor(n / 6) * 3.2, 4.6, 3.2, 3);
}

/** Where each part stands, for the soft shadow it leaves on the bench as it lifts. */
const foot = (x: number, y: number, w: number, d: number, z = 0) => poly(ringAt(rounded(x, y, w, d, 2.5, 3), z));
export const SHADOWS: Partial<Record<PartId, string>> = {
  postgres: foot(PG.x - 6, PG.y - 6, PG.w + 12, PG.d + 12),
  container: foot(CONTAINER.x, CONTAINER.y - 3, CONTAINER.w, CONTAINER.d + 6),
  client: foot(CLIENT.x, CLIENT.y, CLIENT.w, CLIENT.d),
  gateway: [foot(MANIFOLD.x, MANIFOLD.y, MANIFOLD.w, MANIFOLD.d), ...REPLICA_Y.map((ry) => foot(REPLICA.x, ry, REPLICA.w, REPLICA.d))].join(""),
  redis: foot(BAR.x - 1, BAR.y, BAR.w + 2, BAR.d),
  devices: DEVICE_Y.map((dy) => foot(DEVICE.x, dy, DEVICE.w, DEVICE.d)).join(""),
  topics: [foot(HEADER.x, HEADER.y, HEADER.w, HEADER.d), foot(TUBE_X0, tubeY(0) - 2, TUBE_X1 - TUBE_X0, tubeY(TOPICS - 1) - tubeY(0) + 4)].join(""),
  workers: Array.from({ length: WORKERS }, (_, w) => workerBox(w))
    .map((b) => foot(b.x, b.y, b.w, b.d))
    .join(""),
  dlq: foot(TRAY.x, TRAY.y, TRAY.w, TRAY.d),
};

/* ---------------------------------------------------------------- callouts */

export type CalloutId = "client" | "rest" | "postgres" | "gateway" | "workers" | "dlq";

/**
 * The main assemblies, named on the figure: a dot on the part, a hairline out to an empty corner of
 * the bench's diamond, and the label beside the line's end (`side` is the text anchor). Ends are in
 * figure units, placed so the labels clear the machine and each other at the two-shot's size, where
 * fixed-size type is largest against the figure.
 */
export type Callout = { id: CalloutId; part: PartId; name: string; detail?: string; dot: V2; end: V2; side: "start" | "end" };

export const CALLOUTS: Callout[] = [
  { id: "client", part: "client", name: "Client", dot: at([CLIENT.x + 12, CLIENT.y + CLIENT.d - 10, CLIENT.h]), end: [-150, 44], side: "start" },
  { id: "rest", part: "container", name: "REST API", dot: at([REST.x - 3, TEE_Y + 2, REST.z + 1]), end: [-26, -16], side: "start" },
  {
    id: "postgres",
    part: "postgres",
    name: "PostgreSQL",
    detail: `${TABLES} tables (RLS)`,
    dot: at([PG.x + PG.w - 6, PG.y + 8, PG_TOP]),
    end: [166, 2],
    side: "start",
  },
  {
    id: "gateway",
    part: "gateway",
    name: "Socket.IO gateway",
    detail: "Redis adapter",
    dot: at([REPLICA.x + REPLICA.w / 2, REPLICA_Y[0] + REPLICA.d / 2, REPLICA.h]),
    end: [186, 90],
    side: "start",
  },
  {
    id: "workers",
    part: "workers",
    name: "Service Bus workers",
    detail: `${TOPICS} topics`,
    dot: at([WORKER_X[2] + WORKER.w / 2, workerBox(2).y + workerBox(2).d / 2, WORKER.z + WORKER.h]),
    end: [-22, 206],
    side: "end",
  },
  { id: "dlq", part: "dlq", name: "Dead-letter queue", dot: at([TRAY.x + TRAY.w - 12, TRAY.y + 22, TRAY.h]), end: [190, 184], side: "start" },
];

/** Which assembly a hop brings the message to, so its callout lights as it lands. */
export function calloutAt(hop: Hop): CalloutId {
  switch (hop.via) {
    case "cable":
      return hop.back ? "client" : "rest";
    case "riser":
      return hop.back ? "rest" : "postgres";
    case "topic":
    case "redeliver":
      return "workers";
    case "dead":
      return "dlq";
    default:
      return "gateway";
  }
}

/* ---------------------------------------------------------------- hops */

/** A leg of a hop: part of one pipe, travelled from `from` to `to` (fractions of the pipe's run). */
export type Leg = { pipe: string; from: number; to: number };

/** Where a worker sits along the tubes, as fractions of a tube. */
const workerSpan = (w: number): [number, number] => {
  const len = TUBE_X1 + 1 - TUBE_X0;
  return [(WORKER_X[w] - TUBE_X0) / len, (WORKER_X[w] + WORKER.w - TUBE_X0) / len];
};
const workerMid = (w: number) => (workerSpan(w)[0] + workerSpan(w)[1]) / 2;

/** The pipes a hop travels, in order. */
export function legsOf(hop: Hop): Leg[] {
  switch (hop.via) {
    case "cable":
      return [{ pipe: "cable", from: hop.back ? 1 : 0, to: hop.back ? 1 - (hop.lostAt ?? 1) : 1 }];
    case "riser":
      return [{ pipe: "riser", from: hop.back ? 1 : 0, to: hop.back ? 0 : 1 }];
    case "emit":
    case "feed":
      return [{ pipe: hop.via, from: 0, to: 1 }];
    case "branch":
      return [{ pipe: hop.replica ? "busB" : "busA", from: 0, to: 1 }];
    case "socket":
      return [{ pipe: `sock${hop.socket}`, from: 0, to: 1 }];
    case "topic":
      return [
        { pipe: "pub", from: 0, to: 1 },
        { pipe: `tube${hop.topic}`, from: 0, to: workerMid(hop.worker) },
      ];
    case "redeliver": {
      const back = workerSpan(hop.worker)[0] - 0.03;
      return [
        { pipe: `tube${hop.topic}`, from: workerMid(hop.worker), to: back },
        { pipe: `tube${hop.topic}`, from: back, to: workerMid(hop.worker) },
      ];
    }
    case "dead":
      return [{ pipe: `tube${hop.topic}`, from: workerMid(hop.worker), to: 1 }];
  }
}

/** Where along a pipe a travelling message is out of sight (under its worker), as fraction ranges. */
export function hiddenOn(pipeId: string): [number, number][] {
  if (!pipeId.startsWith("tube")) return [];
  const [a, b] = workerSpan(workerFor(Number(pipeId.slice(4))));
  return [[a + 0.01, b - 0.01]];
}

/* ---------------------------------------------------------------- frame */

/** The figure's box: the bench and everything standing on it, with room round it. */
export const FRAME = (() => {
  const corners: V3[] = [
    [BENCH.x, BENCH.y, 0],
    [BENCH.x + BENCH.w, BENCH.y, 0],
    [BENCH.x, BENCH.y + BENCH.d, -BENCH.t - 6],
    [BENCH.x + BENCH.w, BENCH.y + BENCH.d, -BENCH.t - 6],
    [BENCH.x + BENCH.w, BENCH.y, -BENCH.t - 6],
    [BENCH.x, BENCH.y + BENCH.d, 0],
    [PG.x - 6, PG.y - 6, PG_TOP + 3],
    [CONTAINER.x, CONTAINER.y, CTOP],
  ];
  const b = bounds(corners.map(at).concat(Object.values(PIPES).flatMap((p) => p.run.points)));
  const pad = 8;
  return { x: b.x0 - pad, y: b.y0 - pad, w: b.x1 - b.x0 + pad * 2, h: b.y1 - b.y0 + pad * 2 };
})();
