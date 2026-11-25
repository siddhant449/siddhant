/*
  Pixel-art helpers for the systems figures, in the same family as the
  hand-made sprites: sprites are rows of
  palette keys ('.' is transparent), drawn with nearest-neighbour scaling and
  snapped to the device pixel grid so every sprite pixel is the same size.
  No imports, so the sprite data files can be checked outside the app.
*/

/** The Ember palette plus the in-between tones the shading needs. */
export const PAL = {
  k: "#0f0b0a", // ink (outline)
  g: "#1b1513", // ink-2
  m: "#3a2f2c", // bezel
  n: "#645b58", // stone-4
  t: "#8e8481", // stone-3
  s: "#c4b7b4", // stone
  p: "#f6efed", // paper
  w: "#ffffff",
  d: "#6e0d05", // deep
  q: "#b3200e", // signal, shaded
  r: "#ff3a1a", // signal
  o: "#ff7a5c", // signal, lit
  b: "#f2a48f", // blush
} as const;
export type PalKey = keyof typeof PAL;

export type Grid = readonly string[];
/** Sprite role key (as written in a grid) to a palette key; unmapped roles are read as palette keys. */
export type Roles = Readonly<Record<string, PalKey | null>>;

/**
 * Mirror left halves into symmetric rows. Keys on the mirrored side go through `swap`
 * (a highlight on the lit left becomes shade on the right).
 */
export function sym(half: Grid, swap: Readonly<Record<string, string>> = { x: "c", i: "H" }): string[] {
  return half.map((row) => {
    const right = [...row].reverse().map((ch) => swap[ch] ?? ch).join("");
    return row + right;
  });
}

/** Replace characters at fixed positions: patch(rows, [[x, y, "abc"], ...]). */
export function patch(rows: Grid, edits: readonly (readonly [number, number, string])[]): string[] {
  const out = rows.map((r) => [...r]);
  for (const [x, y, s] of edits) for (let i = 0; i < s.length; i++) out[y][x + i] = s[i];
  return out.map((r) => r.join(""));
}

export type Layer = { rows: Grid; x?: number; y?: number; roles?: Roles };

const hex = (k: PalKey) => PAL[k];

/** Resolve a key through roles, then the palette ('.' and null are transparent). */
export function color(ch: string, roles?: Roles): string | null {
  if (ch === ".") return null;
  const k = roles && ch in roles ? roles[ch] : (ch as PalKey);
  return k && k in PAL ? hex(k) : null;
}

/**
 * Flatten layers into a w × h grid of colours (null is transparent). With `rim`,
 * every empty pixel touching the sprite gets that colour: a soft outer line that
 * keeps the ink outline readable on the ink-dark panels.
 */
export function raster(w: number, h: number, layers: readonly Layer[], rim?: string): (string | null)[][] {
  const out: (string | null)[][] = Array.from({ length: h }, () => Array<string | null>(w).fill(null));
  for (const { rows, x = 0, y = 0, roles } of layers) {
    rows.forEach((row, j) => {
      for (let i = 0; i < row.length; i++) {
        const c = color(row[i], roles);
        const X = x + i;
        const Y = y + j;
        if (c && X >= 0 && Y >= 0 && X < w && Y < h) out[Y][X] = c;
      }
    });
  }
  if (rim) {
    const solid = out.map((r) => r.map((c) => c !== null));
    for (let j = 0; j < h; j++)
      for (let i = 0; i < w; i++) {
        if (solid[j][i]) continue;
        const near = (solid[j - 1]?.[i] ?? false) || (solid[j + 1]?.[i] ?? false) || solid[j][i - 1] || solid[j][i + 1];
        if (near) out[j][i] = rim;
      }
  }
  return out;
}

/** Bake layers into a w × h canvas at one canvas pixel per sprite pixel. */
export function bake(w: number, h: number, layers: readonly Layer[], rim?: string): HTMLCanvasElement {
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const g = cv.getContext("2d");
  if (!g) return cv;
  raster(w, h, layers, rim).forEach((row, j) =>
    row.forEach((c, i) => {
      if (!c) return;
      g.fillStyle = c;
      g.fillRect(i, j, 1, 1);
    }),
  );
  return cv;
}

/** A tiny memo for baked sprites, keyed by name. */
export function spriteCache() {
  const m = new Map<string, HTMLCanvasElement>();
  return (key: string, make: () => HTMLCanvasElement) => {
    let v = m.get(key);
    if (!v) {
      v = make();
      m.set(key, v);
    }
    return v;
  };
}

/**
 * Draw a baked sprite with its bottom centre at (x, y) in the context's current
 * (design) space, `scale` design pixels per sprite pixel. The draw happens in
 * device pixels, so the sprite pixel size is a whole number of device pixels
 * and edges land on the pixel grid. Honours the current clip and globalAlpha.
 */
export function blit(c: CanvasRenderingContext2D, img: HTMLCanvasElement, x: number, y: number, scale: number, flip = false) {
  const m = c.getTransform();
  const ps = Math.max(1, Math.round(scale * m.a));
  const w = img.width * ps;
  const h = img.height * ps;
  const X = Math.round(m.a * x + m.e - w / 2);
  const Y = Math.round(m.d * y + m.f - h);
  c.save();
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.imageSmoothingEnabled = false;
  if (flip) {
    c.translate(X + w, Y);
    c.scale(-1, 1);
    c.drawImage(img, 0, 0, w, h);
  } else {
    c.drawImage(img, X, Y, w, h);
  }
  c.restore();
}
