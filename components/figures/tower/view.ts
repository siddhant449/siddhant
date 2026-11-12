import { boxCorners, fitProjection, iso, type Flat, type Plan, type Point3 } from "@/components/iso/iso-kit";

/*
  World layout of the pneumatic sorting tower, in world units (about one
  pixel of the real thing): x and y on the floor, z up. The viewer stands
  at +x +y, so +x runs to the right of the screen and +y to the left.

  A heavy base carries two columns at the back. At each level a crossbeam
  joins them and clamps the glass tube that runs down the middle. Each
  floor's machine stands on its own platform, alternating right and left,
  so every floor stays in view.
*/

export const WIDTH = 600;
export const HEIGHT = 760;
/** Turned a little so the faces that carry the detail (screen, drawers, display) face the viewer. */
export const AZIMUTH = 40;
/** A touch lower than isometric, so the tower reads tall. */
export const ELEVATION = 27;

export const BASE: Plan = { x: -122, y: -96, w: 244, d: 192, r: 10 };
export const BASE_H = 12;
export const FOOT_H = 5;

/** Two columns stand at the back left and back right. */
export const COLUMN = 10;
export const COLUMNS: Flat[] = [
  [-64, 42],
  [42, -64],
];
/** Levels where a crossbeam and a tube clamp sit, bottom to top. The last one is the roof. */
export const LEVELS = [64, 128, 192, 256, 312];
export const BEAM_H = 6;
export const TOP = LEVELS[LEVELS.length - 1];
export const COLUMN_TOP = TOP + 8;

/** Platforms: right ones hang off the right column, left ones off the left. */
export const PLATFORM_T = 4;
export const RIGHT_PLATFORM: Plan = { x: 14, y: -58, w: 54, d: 48, r: 3 };
export const LEFT_PLATFORM: Plan = { x: -58, y: 12, w: 48, d: 54, r: 3 };

/** The tube. */
export const TUBE_R = 10;
export const CLAMP_R = 14.5;
export const CLAMP_H = 6;

/** The capsule: the one lit part. */
export const CAPSULE_R = 6.4;
export const CAPSULE_LEN = 26;

/* Floors, top to bottom, in the order of the layers on the page. */
export const F1 = LEVELS[3];
export const F2 = LEVELS[2];
export const F3 = LEVELS[1];
export const F4 = LEVELS[0];

export const FLOORS = [
  { key: "interface", floor: F1, stop: 288 },
  { key: "systems", floor: F2, stop: 229 },
  { key: "fullstack", floor: F3, stop: 162 },
  { key: "ai", floor: F4, stop: 111 },
  { key: "cloud", floor: 0, stop: 46 },
] as const;

/** Where the capsule waits before it is sent: up in the intake bell. */
export const INTAKE_STOP = TOP + 24;

/* Constants shared by the static drawing and the moving parts. */
export const BLOWER: Flat = [0, 62];
export const FAN_Z = 46;
export const GAUGES: Flat[] = [
  [44, 44],
  [60, 44],
];
export const GAUGE_Z = 18 + 2.4;

export const TABLE_R = 28;
export const TABLE_Z = F2 + 8;

export const CABINET: Plan = { x: 22, y: -52, w: 30, d: 40, r: 2 };
export const DRAWER_ROWS = [0, 1, 2, 3].map((i) => {
  const z0 = F3 + 2 + i * 13;
  return { z0, z1: z0 + 11.5 };
});
export const DRAWER_FACE_X = CABINET.x + CABINET.w;
export const OPEN_DRAWER = 1;
export const DRAWER_TRAVEL = 16;

export const P = fitProjection(
  [
    ...boxCorners(BASE, -BASE_H - FOOT_H, 0),
    ...boxCorners({ x: -70, y: -70, w: 140, d: 140, r: 0 }, TOP, COLUMN_TOP + 14),
    [BASE.x + BASE.w, 0, 46],
  ],
  WIDTH,
  HEIGHT,
  { pad: 6, azimuth: AZIMUTH, elevation: ELEVATION },
);

export const at = (point: Point3): Flat => iso(point, P);
