/*
  Pixel garments for the fashion commerce figure: 16 px wide, hand-authored
  as left halves and mirrored (sym), lit from the top left. Role keys:

    1 outline   h hanger   C cloth   c cloth shade   x cloth light
    D deep shade   A trim / band   a trim shade   b buttons
*/
import { patch, sym, type Grid, type Roles } from "./pixel";

export const GW = 16;
/** Soft outer line so the ink outline reads on the dark cards. */
export const RIM = "#2e2523";

const HOOK: Grid = [".......hh.......", "......h..h......", ".........h......", "........h......."];
/** Hook with a clip bar, for skirts and trousers. */
const CLIP: Grid = [".......hh.......", "......h..h......", ".........h......", "..hhhhhhhhhhhh..", "...h........h..."];

const PUFF_DRESS = [
  ...HOOK,
  ...sym([
    "..111.11",
    ".1xCC11c",
    "1xCCCC11",
    "1xCCc1xC",
    ".1cc1xCC",
    "..111xCC",
    "....1xCC",
    "....1AAA",
    "...1xCCa",
    "...1xCCC",
    "..1xCCcC",
    "..1xCCcC",
    ".1xCCcCC",
    ".1xCcCCC",
    "1xCCcCCC",
    "1xCcCCCC",
    "1aAaAaAa",
    ".1111111",
  ]),
];

const DRESS = [
  ...HOOK,
  ...sym([
    ".....1A.",
    ".....1A.",
    "....1xCC",
    "....1xCC",
    "....1xCC",
    "....1AAa",
    "...1xCCC",
    "...1xCCC",
    "..1xCCCC",
    "..1xCCcC",
    ".1xCCCcC",
    ".1xCCcCC",
    "1xCCCcCC",
    "1xCCcCCC",
    "1xCcCCCC",
    "1DDDDDDD",
    ".1111111",
  ]),
];

const COAT = patch(
  [
    ...HOOK,
    ...sym([
      "...1111.",
      "..1xCCA1",
      ".1xCCCxA",
      "1xCCCCxC",
      "1xC1CxCC",
      "1xC1CbCC",
      "1xC1CxCC",
      "1xC1CbCC",
      "1xC1AAAA",
      "1DD1CxCC",
      ".11.1xCC",
      "....1xCC",
      "....1xCC",
      "...1xCCC",
      "...1xCCC",
      "...1DDDD",
      "...11111",
    ]),
  ],
  [13, 14, 15, 16, 17, 18, 19].map((y) => [7, y, "D"] as const),
);

const JACKET = [
  ...HOOK,
  ...sym([
    "....111.",
    "..11AAA1",
    ".1xCCAAa",
    "1xCCCCAa",
    "1xC1CCCb",
    "1xC1CCCb",
    "1xC1CaCb",
    "1xC1CCCb",
    "1aa1DDDD",
    ".11.1111",
  ]),
];

const SHIRT = patch(
  [
    ...HOOK,
    ...sym([
      ".....111",
      "..1111Aa",
      ".1xCCC1A",
      "1xCCCCCC",
      "1xC1CCCC",
      "1xC1CCCC",
      "1xC1CCCC",
      "1xC1CCCC",
      "1aa1CCCC",
      ".11.1xCC",
      "....1xCC",
      "....1xcc",
      "....1111",
    ]),
  ],
  [
    ...[7, 8, 9, 10, 11, 12, 13, 14].map((y) => [7, y, "D"] as const),
    [8, 8, "b"],
    [8, 10, "b"],
    [8, 12, "b"],
    [8, 14, "b"],
  ],
);

const SKIRT = [
  ...CLIP,
  ...sym([
    "...11111",
    "...1AAAA",
    "...1xCcC",
    "..1xcCcC",
    "..1xcCcC",
    ".1xCcCcC",
    ".1xCcCcC",
    "1xcCcCcC",
    "1DDDDDDD",
    ".1111111",
  ]),
];

const TROUSERS = patch(
  [
    ...CLIP,
    ...sym([
      "...11111",
      "...1AaAA",
      "...1xCCC",
      "...1xCCC",
      "..1xCCCC",
      "..1xCCc1",
      "..1xCCc1",
      ".1xCCCc1",
      ".1xCCCc1",
      ".1xCCCc1",
      "1xCCCCc1",
      "1xCCCCc1",
      "1DDDDDD1",
      ".111111.",
    ]),
  ],
  [7, 8, 9].map((y) => [7, y, "D"] as const),
);

export type GarmentSprite = { rows: Grid; roles: Roles };

const O = { "1": "k", h: "s" } as const;

/** Sprites by garment id (names and tags live in lib/copy/systems.ts). */
export const GARMENT_SPRITES: Record<string, GarmentSprite> = {
  "puff-dress": { rows: PUFF_DRESS, roles: { ...O, C: "p", c: "s", x: "w", D: "t", A: "r", a: "q" } },
  coat: { rows: COAT, roles: { ...O, C: "s", c: "t", x: "p", D: "n", A: "t", b: "m" } },
  dress: { rows: DRESS, roles: { ...O, C: "r", c: "q", x: "o", D: "d", A: "k", a: "t" } },
  shirt: { rows: SHIRT, roles: { ...O, C: "p", c: "s", x: "w", D: "s", A: "w", a: "s", b: "t" } },
  jacket: { rows: JACKET, roles: { ...O, C: "n", c: "m", x: "t", D: "g", A: "s", a: "m", b: "s" } },
  skirt: { rows: SKIRT, roles: { ...O, C: "q", c: "d", x: "r", D: "d", A: "d", a: "q" } },
  trousers: { rows: TROUSERS, roles: { ...O, C: "t", c: "n", x: "s", D: "m", A: "m", a: "s" } },
};
