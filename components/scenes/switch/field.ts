/**
 * SC.02's dot field: the pitch, in type made of light. Every dot starts on the slit the hero
 * ends on and streams out into the first line; then, beat by beat, the same dots re-form into
 * each layer's word, scatter into a faint field under the pitch, gather into "Here's the work.",
 * and at last settle exactly on the A-side title card's words, so the card takes over type to type.
 *
 * The words are real DOM text (the accessible content). The field redraws each one, with its own
 * computed font, into an offscreen canvas and samples it on a dot grid; every beat's dot targets
 * go into one float texture, and the vertex shader morphs between two rows of it.
 */

/** The camera: fov 30° from z = 10, so the plane z = 0 is VIEW_H units tall. */
export const FOV = 30;
export const CAMERA_Z = 10;
export const VIEW_H = 2 * CAMERA_Z * Math.tan(((FOV / 2) * Math.PI) / 180);

/** The field's canvas loop: it draws every frame only while SC.02 is on screen (set by the section). */
export const fieldLoop = { running: false, dirty: true };

/** One word of DOM type, as laid out on the pinned stage (CSS pixels from its top left). */
export type WordBox = {
  text: string;
  left: number;
  top: number;
  width: number;
  /** Its line box: inline-block, so this is the line height. */
  height: number;
  font: { family: string; weight: string; size: number; stretch: string; letterSpacing: number };
};

/**
 * One beat the dots form. `words`: type, drawn at full strength (or `strength`); with `lit`, each
 * word's dots are as bright as that word is lit on the page (the title card's). `field`: no type,
 * every dot drifting dim across the frame. The first beat, the slit, is built from the viewport.
 */
export type BeatShape = { words: WordBox[]; strength?: number; lit?: boolean } | { field: true };

/**
 * The page around the field, in CSS pixels. `pinAt`: the scroll position at which the A-side's
 * title card pins (its words are measured as they stand then; before it, the card is lower by
 * the scroll still to go).
 */
export type View = { width: number; height: number; pillar: number; phone: boolean; pinAt: number };

/**
 * The scroll timeline, as fractions of the pinned scroll: each beat holds from `at` to `until`,
 * and the dots morph from one beat to the next in between. Beat 0 is the slit (the cut).
 */
export const TIMELINE: { at: number; until: number }[] = [
  { at: 0, until: 0 },
  { at: 0.07, until: 0.14 },
  { at: 0.2, until: 0.28 },
  { at: 0.34, until: 0.42 },
  { at: 0.48, until: 0.56 },
  { at: 0.62, until: 0.69 },
  { at: 0.74, until: 0.81 },
  // "Here's the work." holds up to where the A-side's hold catches (q 0.88) and glides the page
  // onto the title card, so the glide itself carries the dots from this line onto the card's.
  { at: 0.84, until: 0.89 },
  // On the title card's words, riding up with the card, then dissolving into it (the stage fades).
  { at: 0.97, until: 1 },
];

/** The last beat: the A-side title card's words. */
export const TITLE_BEAT = TIMELINE.length - 1;
/** The stage dissolves onto the title card across this stretch of the scroll. */
export const DISSOLVE: [number, number] = [0.975, 0.998];
/** The most words a lit beat can carry (each word's light is one uniform). */
export const MAX_WORDS = 16;

/** Which two beats the dots are between at scroll `q`, and how far across (0 while a beat holds). */
export function segment(q: number) {
  for (let k = 0; k < TIMELINE.length - 1; k++) {
    const here = TIMELINE[k];
    const next = TIMELINE[k + 1];
    if (q <= here.until) return { from: k, to: k, t: 0 };
    if (q < next.at) return { from: k, to: k + 1, t: (q - here.until) / (next.at - here.until) };
  }
  const last = TIMELINE.length - 1;
  return { from: last, to: last, t: 0 };
}

/** Dots in the field, and the texture columns they are packed into (one row block per beat). */
export const COLS = 256;
export const pointCount = (phone: boolean) => (phone ? 7168 : 16384);

/** A dim dot drifting in the field, and type drawn at full strength. */
const DUST = 0.06;
const FIELD = 0.2;
/** A title word's dots while the word is unlit: as dim as the card shows it (opacity 0.12, blurred). */
const UNLIT = 0.34;

/** Percent → the canvas's font-stretch keyword (the variable font's width axis serves each one). */
function stretchKeyword(stretch: string) {
  const pct = parseFloat(stretch) || 100;
  const steps: [number, CanvasFontStretch][] = [
    [50, "ultra-condensed"],
    [62.5, "extra-condensed"],
    [75, "condensed"],
    [87.5, "semi-condensed"],
    [100, "normal"],
    [112.5, "semi-expanded"],
    [125, "expanded"],
    [150, "extra-expanded"],
    [200, "ultra-expanded"],
  ];
  return steps.reduce((best, s) => (Math.abs(s[0] - pct) < Math.abs(best[0] - pct) ? s : best))[1];
}

/** The type is drawn for sampling at this scale: a quarter of the pixels to fill and read back. */
const INK_SCALE = 0.5;

/**
 * Where the dots of one beat's type go: its words drawn as the page draws them, sampled on a grid
 * of `pitch` pixels (wider if there are more grid points in the ink than dots). Sorted left to
 * right, so dot i is always the i-th from the left and the dots sweep across between words.
 */
function sampleWords(words: WordBox[], view: View, budget: number, pitch: number, ctx: CanvasRenderingContext2D) {
  const k = INK_SCALE;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  ctx.textBaseline = "alphabetic";
  for (let wi = 0; wi < words.length; wi++) {
    const w = words[wi];
    // Each word inked in its own red, so every sampled point knows its word.
    ctx.fillStyle = `rgb(${(wi + 1) * 15}, 255, 255)`;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.font = `${w.font.weight} ${w.font.size}px ${w.font.family}`;
    ctx.fontStretch = stretchKeyword(w.font.stretch);
    ctx.letterSpacing = `${w.font.letterSpacing}px`;
    const m = ctx.measureText(w.text);
    const ascent = m.fontBoundingBoxAscent;
    const descent = m.fontBoundingBoxDescent;
    const baseline = w.top + (w.height - (ascent + descent)) / 2 + ascent;
    // The page's own width for the word, in case the canvas's font differs a hair.
    const sx = m.width > 0 && Math.abs(w.width / m.width - 1) < 0.12 ? w.width / m.width : 1;
    ctx.setTransform(sx * k, 0, 0, k, w.left * k, baseline * k);
    ctx.fillText(w.text, 0, 0);
    x0 = Math.min(x0, w.left);
    x1 = Math.max(x1, w.left + w.width);
    y0 = Math.min(y0, baseline - ascent);
    y1 = Math.max(y1, baseline + descent);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const cw = ctx.canvas.width, ch = ctx.canvas.height;
  const bx = Math.max(0, Math.floor(x0 * k)), by = Math.max(0, Math.floor(y0 * k));
  const bw = Math.min(cw, Math.ceil(x1 * k)) - bx, bh = Math.min(ch, Math.ceil(y1 * k)) - by;
  if (bw <= 0 || bh <= 0) return { targets: [] as (readonly [number, number, number])[], pitch };
  const ink = ctx.getImageData(bx, by, bw, bh).data;
  // The grid in page pixels, each point tested against the ink at the drawing's scale.
  const grid = (p: number) => {
    const out: [number, number, number][] = [];
    for (let y = by / k + p / 2; y < (by + bh) / k; y += p) {
      const iy = Math.floor(y * k) - by;
      if (iy < 0 || iy >= bh) continue;
      for (let x = bx / k + p / 2; x < (bx + bw) / k; x += p) {
        const ix = Math.floor(x * k) - bx;
        const at = (iy * bw + ix) * 4;
        if (ix >= 0 && ix < bw && ink[at + 3] > 127) out.push([x, y, Math.round(ink[at] / 15) - 1]);
      }
    }
    return out;
  };
  let used = pitch;
  let targets = grid(used);
  if (targets.length > budget) {
    used = pitch * Math.sqrt(targets.length / budget) * 1.02;
    targets = grid(used);
  }
  const sorted = targets
    .map(([x, y, word], i) => [x, y, word, x + ((i * 7919) % 13) * 0.3] as const)
    .sort((a, b) => a[3] - b[3])
    .map(([x, y, word]) => [x, y, word] as const);
  return { targets: sorted, pitch: used };
}

export type Beats = { data: Float32Array; rows: number; beats: number; sizes: number[] };

/**
 * Every beat's dot targets, packed into one RGBA float texture: COLS dots to a row, a block of
 * rows per beat; each texel is a dot's position (world units) and strength. Also each beat's dot
 * size (the grid pitch it was sampled at). A generator, yielding after every beat, so the work
 * can be spread over idle moments while the hero plays.
 */
export function* buildBeats(shapes: BeatShape[], view: View): Generator<void, Beats, void> {
  const n = pointCount(view.phone);
  const rows = Math.ceil(n / COLS);
  const beats = shapes.length + 1;
  const data = new Float32Array(COLS * rows * beats * 4);
  const sizes: number[] = [];
  const H = VIEW_H;
  const W = (H * view.width) / view.height;
  const unit = W / view.width;
  const wx = (px: number) => (px / view.width - 0.5) * W;
  const wy = (py: number) => (0.5 - py / view.height) * H;
  const rand = mulberry(41);
  // Each dot's own drifting place in the field, for when no word needs it.
  const home = Array.from({ length: n }, () => [wx(rand() * view.width), wy(rand() * view.height), (rand() - 0.5) * 1.6] as const);
  const put = (beat: number, i: number, x: number, y: number, z: number, a: number) => {
    const at = ((beat * rows + Math.floor(i / COLS)) * COLS + (i % COLS)) * 4;
    data[at] = x;
    data[at + 1] = y;
    data[at + 2] = z;
    data[at + 3] = a;
  };

  // Beat 0: on the slit, a line of light down the frame, densest through the middle; not yet lit.
  const sx = wx(view.pillar);
  for (let i = 0; i < n; i++) put(0, i, sx + (rand() - 0.5) * 2 * unit, (0.5 - (0.12 + 0.76 * (0.5 + (rand() + rand() - 1) * 0.5))) * H, 0, 0);
  const pitch = view.phone ? 2.4 : 3;
  sizes.push(pitch * unit);
  yield;

  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(view.width * INK_SCALE);
  canvas.height = Math.ceil(view.height * INK_SCALE);
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  for (let s = 0; s < shapes.length; s++) {
    const shape = shapes[s];
    const beat = s + 1;
    if ("field" in shape) {
      for (let i = 0; i < n; i++) put(beat, i, home[i][0], home[i][1], home[i][2], FIELD);
      sizes.push(pitch * unit * 0.8);
    } else {
      const { targets, pitch: used } = sampleWords(shape.words, view, n, pitch, ctx);
      const strength = shape.strength ?? 1;
      for (let i = 0; i < n; i++) {
        if (i >= targets.length) put(beat, i, home[i][0], home[i][1], home[i][2], DUST);
        else {
          const [x, y, word] = targets[i];
          // A lit beat's strength is its word, written as -(word + 1): the shader looks up its light.
          const a = shape.lit && word >= 0 && word < MAX_WORDS ? -(word + 1) : strength;
          put(beat, i, wx(x), wy(y), 0, a);
        }
      }
      // The dot spacing this beat was sampled at sets its dots' size.
      sizes.push(used * unit);
    }
    yield;
  }
  return { data, rows, beats, sizes };
}

/**
 * The dots, in the vertex stage. Each reads where it is in the beat it leaves and the beat it
 * goes to, and travels between them in a wave from left to right, lifting a little toward the
 * lens on the way and warming to ember while it moves. Out of the slit, it fans across the whole
 * frame first. The cursor parts the dots, in screen space.
 */
export const fieldVert = /* glsl */ `
uniform sampler2D uBeats;
uniform float uRowFrom;
uniform float uRowTo;
uniform float uT;
uniform float uStream;
uniform float uSizeFrom;
uniform float uSizeTo;
uniform float uHalfW;
uniform float uTime;
uniform float uPx;
uniform float uDpr;
uniform float uAspect;
uniform vec2 uPointer;
uniform float uPart;
uniform float uBass;
uniform float uDropFrom;
uniform float uDropTo;
uniform float uLit[${MAX_WORDS}];
attribute vec2 aRef;
attribute vec4 aSeed;
varying vec3 vColor;
varying float vAlpha;

const vec3 BONE = vec3(0.925, 0.906, 0.871);
const vec3 EMBER = vec3(0.84, 0.63, 0.42);

float ease(float x) {
  x = clamp(x, 0.0, 1.0);
  return x * x * (3.0 - 2.0 * x);
}

/** A dot's strength: as written, or (negative) as lit as its word on the page. */
float level(float w) {
  if (w >= 0.0) return w;
  return mix(${UNLIT.toFixed(2)}, 1.0, uLit[int(-w + 0.5) - 1]);
}

void main() {
  vec4 a = texture2D(uBeats, vec2(aRef.x, aRef.y + uRowFrom));
  vec4 b = texture2D(uBeats, vec2(aRef.x, aRef.y + uRowTo));
  a.y -= uDropFrom;
  b.y -= uDropTo;
  a.w = level(a.w);
  b.w = level(b.w);
  float lead = clamp(b.x / (2.0 * uHalfW) + 0.5, 0.0, 1.0);
  vec3 p;
  float s;
  float warm;
  if (uStream > 0.5) {
    // Fast off the slit, soft into place: the stream fans across the whole frame at once.
    float f = clamp((uT - lead * 0.3 - aSeed.x * 0.06) / 0.6, 0.0, 1.0);
    s = 1.0 - pow(1.0 - f, 3.0);
    vec3 ctrl = mix(a.xyz, b.xyz, 0.62) + vec3(0.0, (aSeed.z - 0.5) * 1.4, 0.9 + aSeed.z * 1.2);
    p = mix(mix(a.xyz, ctrl, s), mix(ctrl, b.xyz, s), s);
    warm = 1.0 - smoothstep(0.5, 1.0, s);
  } else {
    s = ease((uT - lead * 0.35 - aSeed.x * 0.08) / 0.55);
    float arc = sin(s * 3.14159);
    p = mix(a.xyz, b.xyz, s) + vec3(0.0, (aSeed.y - 0.5) * 0.3, 0.5) * arc;
    warm = arc * 0.6;
  }
  float strength = mix(a.w, b.w, s);
  // The dim dots of the field drift; the type holds still on its grid, so it reads as a dot screen.
  float drift = 1.0 - smoothstep(0.1, 0.3, max(a.w, b.w));
  drift *= 1.0 - step(0.3, max(a.w, b.w));
  p += vec3(sin(uTime * 0.4 + aSeed.w * 6.283), cos(uTime * 0.33 + aSeed.z * 6.283), 0.0) * 0.05 * drift;

  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vec4 clip = projectionMatrix * mv;
  vec2 ndc = clip.xy / clip.w;
  vec2 d = (ndc - uPointer) * vec2(uAspect, 1.0);
  float push = exp(-dot(d, d) / 0.012) * uPart;
  ndc += normalize(d + 1e-5) * push * 0.03 / vec2(uAspect, 1.0);
  clip.xy = ndc * clip.w;
  gl_Position = clip;

  vColor = mix(BONE, EMBER * 1.25, warm);
  vAlpha = strength;
  float size = mix(uSizeFrom, uSizeTo, s) * 0.86 * mix(0.6, 1.0, smoothstep(0.08, 0.5, strength)) * (1.0 + uBass * 0.06);
  gl_PointSize = max(size * uPx * (${CAMERA_Z.toFixed(1)} / -mv.z) * uDpr, 1.0);
}
`;

export const fieldFrag = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main() {
  float r = length(gl_PointCoord - 0.5);
  float a = (1.0 - smoothstep(0.32, 0.5, r)) * vAlpha;
  if (a < 0.004) discard;
  gl_FragColor = vec4(vColor * a, a);
}
`;

export function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
