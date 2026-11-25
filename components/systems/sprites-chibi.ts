/*
  Chibi manga cast for the Shizuku 2.5D engine figure. 16 × 21 sprites: a
  12-row head over a 9-row body. Heads are per character (front, side, back);
  bodies are shared templates recoloured through role keys:

    1 outline   H hair   h hair shade   i hair light
    S skin      z skin shade   B blush   M mouth
    E eye       e eye shine    Y lower iris (closed lid when blinking)
    C top       c top shade    x top light   A collar   a collar shade / tie
    P bottom    Q bottom shade L legs   F shoes
*/
import { patch, sym, type Grid, type Layer, type PalKey, type Roles } from "./pixel";

/** Canvas size: the 16 × 21 figure sits at (X0, Y0), leaving room for a rim and a waving hand. Feet rest on row 21. */
export const CW = 22;
export const CH = 23;
const X0 = 3;
const Y0 = 1;
/** Soft outer line so the ink outline reads on the dark panels. */
export const RIM = "#2e2523";

export type View = "front" | "side" | "back";

/* ---------------------------------------------------------------- bodies */

const BODY_FRONT = sym([
  "....111z",
  "....11AA",
  "...1CCAa",
  "..1xC1CC",
  "..1AA1CC",
  "..1SS1QQ",
  "...1QPPP",
  "....1LL1",
  "....1FF1",
]);

const BODY_BACK = sym([
  "....111z",
  "....11AA",
  "...1CCAA",
  "..1xC1AA",
  "..1AA1CC",
  "..1SS1QQ",
  "...1QPPP",
  "....1LL1",
  "....1FF1",
]);

/** Facing right; flipped for facing left. */
const BODY_SIDE: Grid = [
  ".....111zz1.....",
  ".....11CCAA1....",
  "....1xCCCCAa1...",
  "....1xCcCCCC1...",
  "....1xCACCCC1...",
  "....1QQSQQQQ1...",
  "....1PPPPPPPQ1..",
  ".....1LL1LL1....",
  ".....1FF11FFF1..",
];

/** Front body with the right arm lifted out of the way (it is drawn as a wave overlay). */
const BODY_WAVE = patch(BODY_FRONT, [
  [10, 3, "1..."],
  [10, 4, "1..."],
  [10, 5, "1..."],
]);

/** The waving arm, two frames, in canvas coordinates (drawn over the head). */
const WAVE: { rows: Grid; x: number; y: number }[] = [
  {
    x: 15,
    y: 7,
    rows: [
      "...111.",
      "..1SSS1",
      "..1SSS1",
      "...1S1.",
      "..1CC1.",
      ".1CC1..",
      "1CC1...",
      "CC1....",
    ],
  },
  {
    x: 15,
    y: 8,
    rows: [
      "..111..",
      ".1SSS1.",
      ".1SSS1.",
      "..1C1..",
      ".1CC1..",
      "1CC1...",
      "CC1....",
    ],
  },
];

/* ----------------------------------------------------------------- heads */

/** Shared face rows (front), mirrored. Rows 7–11 of the head. */
const FACE = [
  "1HSEESSS",
  "1HSEeSSS",
  "1HSYYSSS",
  "1HzBSSSM",
  ".1H1zSSS",
];

type Heads = { front: Grid; side: Grid; back: Grid; behind?: Grid };

/** Aki: a red bob with a paper hair clip. */
const AKI: Heads = {
  front: patch(
    sym([
      ".....111",
      "...11HHH",
      "..1HHiHH",
      ".1HHiHHH",
      ".1HiHHHH",
      "1HHhHHHh",
      "1HhSShHS",
      ...FACE,
    ]),
    [[11, 3, "AA"]],
  ),
  side: [
    ".....111111.....",
    "...11HHHHiH11...",
    "..1HHHHHHHiiH1..",
    ".1HHHHHHHHHHiH1.",
    ".1HHHHHHHHHHHH1.",
    "1HHHHHHHHHhSShH1",
    "1HHHHHHHhSSSSSh1",
    "1HHHHHzzSSSSEES1",
    "1HHHHHzSSSSSEeS1",
    "1hHHHHHzSSSSYYS1",
    ".1hHHHHzSSSBSM1.",
    "..1hh11zzzSS11..",
  ],
  back: sym([
    ".....111",
    "...11HHH",
    "..1HHiHH",
    ".1HHiHHH",
    ".1HiHHHH",
    "1HHHHHHH",
    "1HHhHHHH",
    "1HHhHHhH",
    "1HHhHHhH",
    "1HhHHHhH",
    ".1hHHHhH",
    "..1hh1zz",
  ]),
};

/** Ren: spiky dark hair swept to one side. */
const REN: Heads = {
  front: [
    "...1....1.......",
    "..1H1..1H1..11..",
    ".1HHH11HHH11HH1.",
    ".1HiHHHHiHHHHH1.",
    "1HHHiHHHHiHHHHH1",
    "1HHhHHHHhHHHhHH1",
    "1HhSShHSSShHSShH",
    "1HSEESSSSSSEESH1",
    "1zSEeSSSSSSEeSz1",
    "1zSYYSSSSSSYYSz1",
    "1HzSSSSMMSSSSzH1",
    ".1H1zSSSSSSz1H1.",
  ],
  side: [
    "...1....1.......",
    "..1H1..1H1.11...",
    ".1HHH11HHH1HH1..",
    "1HHHHHHHHHHHiH1.",
    "1HHHHHHHHHHHHHH1",
    "1HHHHHHHHHhSHhH1",
    "1HHHHHHHHSSShSH1",
    "1HHHHHzzSSSSEES1",
    "1HHHHHzSSSSSEeS1",
    ".1HHHHHzSSSSYYS1",
    ".1hHHHHzSSSSSM1.",
    "..1hh11zzzSS11..",
  ],
  back: [
    "...1....1.......",
    "..1H1..1H1..11..",
    ".1HHH11HHH11HH1.",
    ".1HHHHHHHHHHHH1.",
    "1HHHHHHHHHHHHHH1",
    "1HHhHHHHhHHHhHH1",
    "1HHhHHHHhHHHhHH1",
    "1HhHHHHhHHHHhHH1",
    "1HhHHHHhHHHhHHH1",
    "1HHHHHHHHHHHHHH1",
    ".1hHHhHHHhHHhH1.",
    "..1hh1zzzz1hh1..",
  ],
};

/** Mio: long silver hair with a centre part. */
const MIO: Heads = {
  front: sym([
    ".....111",
    "...11HHH",
    "..1HiiHH",
    ".1HiHHHh",
    ".1HHHHhS",
    "1HHHHhSS",
    "1HHHhSSS",
    "1HSEESSS",
    "1HSEeSSS",
    "1HSYYSSS",
    "1HzBSSSM",
    "1HH1zSSS",
  ]),
  side: [
    ".....111111.....",
    "...11HHHHHiH1...",
    "..1HHHHHHHHiiH1.",
    ".1HHHHHHHHHHhiH1",
    ".1HHHHHHHHHHhSH1",
    "1HHHHHHHHHHhSSS1",
    "1HHHHHHHHhSSSSS1",
    "1HHHHHHzzSSSEES1",
    "1HHHHHHzSSSSEeS1",
    "1HhHHHHHzSSSYYS1",
    "1HHhHHHHzSSBSM1.",
    "1hHHhH11zzzSS1..",
  ],
  back: sym([
    ".....111",
    "...11HHH",
    "..1HiiHH",
    ".1HiHHHH",
    ".1HHHHHH",
    "1HHHHHHH",
    "1HhHHHHH",
    "1HhHHhHH",
    "1HhHHhHH",
    "1hHHHhHH",
    "1hHHHHhH",
    "1hHHHHhH",
  ]),
  /** Long hair that falls behind the shoulders (drawn under the body). */
  behind: sym([
    ".1HH....",
    ".1hH....",
    ".1hH....",
    "..1h....",
    "...1....",
  ]),
};

/* -------------------------------------------------------------- the cast */

export type Gesture = "wave" | "talk" | "heart";

export type Chibi = {
  name: string;
  heads: Heads;
  roles: Roles;
  gesture: Gesture;
};

const base = { "1": "k", S: "p", z: "s", B: "b", M: "d", E: "k", e: "w" } as const satisfies Record<string, PalKey>;

export const CAST: Chibi[] = [
  {
    name: "Aki",
    heads: AKI,
    gesture: "wave",
    // Red bob, paper sailor top with a red tie, charcoal skirt.
    roles: { ...base, H: "q", h: "d", i: "o", Y: "d", C: "p", c: "s", x: "w", A: "n", a: "r", P: "m", Q: "g", L: "p", F: "m" },
  },
  {
    name: "Ren",
    heads: REN,
    gesture: "talk",
    // Charcoal spikes, stone hoodie with paper strings, ink trousers.
    roles: { ...base, H: "n", h: "m", i: "t", Y: "m", C: "s", c: "t", x: "p", A: "t", a: "p", P: "m", Q: "g", L: "m", F: "k", B: "s" },
  },
  {
    name: "Mio",
    heads: MIO,
    gesture: "heart",
    // Silver hair, signal-red jacket over a paper shirt, ink skirt.
    roles: { ...base, H: "s", h: "t", i: "p", Y: "m", C: "r", c: "q", x: "o", A: "p", a: "s", P: "m", Q: "g", L: "p", F: "d" },
  },
];

export type Pose = { view: View; bob: 0 | 1; blink: boolean; wave: -1 | 0 | 1 };

/** The layers for one character in one pose (feet on the bottom row of the canvas). */
export function chibiLayers(ch: Chibi, pose: Pose): Layer[] {
  const S = ch.roles.S ?? "p";
  const roles: Roles = pose.blink ? { ...ch.roles, E: S, e: S, Y: "k" } : ch.roles;
  const head = ch.heads[pose.view];
  const waving = pose.view === "front" && pose.wave >= 0;
  const body = pose.view === "side" ? BODY_SIDE : pose.view === "back" ? BODY_BACK : waving ? BODY_WAVE : BODY_FRONT;
  const at = (rows: Grid, y: number, x = 0): Layer => ({ rows, x: X0 + x, y: Y0 + y, roles });
  const layers: Layer[] = [];
  if (ch.heads.behind && pose.view !== "back") layers.push(at(ch.heads.behind, 12));
  layers.push(at(body, 12));
  if (ch.heads.behind && pose.view === "back") layers.push(at(ch.heads.behind, 12 + pose.bob));
  layers.push(at(head, pose.bob));
  if (waving) {
    const w = WAVE[pose.wave];
    layers.push({ rows: w.rows, x: w.x, y: w.y, roles });
  }
  return layers;
}

/* ------------------------------------------------------- speech bubbles */

export const BUBBLES: Record<"talk" | "heart", Grid> = {
  talk: [
    ".111111111.",
    "1ppppppppp1",
    "1ppkpkpkpp1",
    "1ppppppppp1",
    ".1111p1111.",
    "....1p1....",
    ".....1.....",
  ],
  heart: [
    ".111111111.",
    "1ppppppppp1",
    "1pprrprrpp1",
    "1pprorrrpp1",
    "1ppprrrppp1",
    "1pppprpppp1",
    ".1111p1111.",
    "....1p1....",
    ".....1.....",
  ],
};

/** A pixel ground shadow under the feet (k at partial alpha). */
export const SHADOW: Grid = [".kkkkkkkk.", "kkkkkkkkkk", ".kkkkkkkk."];
