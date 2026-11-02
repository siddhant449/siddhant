"use client";
/* three.js objects are mutated every frame inside useFrame, which is the R3F idiom. */
/* eslint-disable react-hooks/immutability */

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import type { MotionValue } from "motion/react";
import * as THREE from "three";
import "@/lib/threeConsole";
import { audio } from "@/lib/audio";
import { coverChunk, ditherChunk, fullscreenVert } from "./ditherChunk";

/**
 * The page background (--black, #121110) as raw display values: this shader writes its output
 * unconverted, like its hand-picked dot colours, so the colour must not be linearised.
 */
const PAGE = new THREE.Vector3(0x12 / 255, 0x11 / 255, 0x10 / 255);

/** The fire's ceiling: nothing ever burns in a row whose top is above this share of the portrait's height. */
const CAP = 0.75;
/**
 * The flame's top (share of the height, at the centre of the width): HIGH on a beat, falling to
 * LOW by the next one. It rises in ATTACK seconds and falls over the rest of the beat, eased.
 */
const HIGH = 0.7;
const LOW = 0.52;
const ATTACK = 0.07;
/**
 * The flame is one body: its top rises gently toward the centre of the width (DOME, centre to
 * edge) and drifts only a little, slowly, a few columns together (WANDER, either way).
 */
const DOME = 0.035;
const WANDER = 0.01;
const WANDER_COLUMNS = 6;
/** The tips lick up to LICK above the top, where the Doom fire's flicker is strong enough. */
const LICK = 0.02;
/** Pulses are at least this far apart (s): the beat stays under three a second. */
const PULSE_GAP = 1 / 3;
/**
 * The flicker underneath: a PSX Doom fire (Doom's own cooling, a unit lost every other row) at
 * full heat, stepped TICK times a second and its heat eased twice (SMOOTH, s), so a dot at a tip
 * flickers well under three times a second. Its share of the rows sets its full heat.
 */
const MAX_HEAT = 0.55;
const COOL = 0.5;
const TICK = 30;
const SMOOTH = 0.1;

const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));
/** Exponential approach toward `target` with time constant `tau` (s), frame-rate independent. */
const ease = (cur: number, target: number, dt: number, tau: number) => cur + (target - cur) * (1 - Math.exp(-dt / tau));
const smooth = (t: number) => t * t * (3 - 2 * t);

const frag = /* glsl */ `
uniform sampler2D uTex;
uniform sampler2D uHeat;
uniform vec2 uHeatSize;
uniform vec2 uRes;
uniform float uImgAspect;
uniform vec2 uFocus;
uniform float uTime;
uniform float uCells;
uniform vec2 uMouse;
uniform float uHover;
uniform float uGrow;
uniform vec3 uBg;
varying vec2 vUv;
${coverChunk}
#define DITHER_SAMPLE(p) texture2D(uTex, coverUv(p, uRes.x / uRes.y, uImgAspect, uFocus)).rgb
#define DITHER_SPEC(x) 0.0
#define DITHER_MAX_R 0.46
${ditherChunk}

// The fire's palette in the site's own warmth, indexed by heat as Doom indexes its 37 colours:
// deep red-brown at the tips, orange-red, the ember deepened to a flame orange, warm yellow, and a
// pale bone-gold core. The hues are richer than the site's ember and the core keeps its gold:
// drawn at a dot's own brightness, tan and white would both read as the grey portrait, not as fire.
vec3 firePalette(float t) {
  vec3 c = mix(vec3(0.36, 0.13, 0.07), vec3(0.86, 0.36, 0.14), smoothstep(0.08, 0.3, t));
  c = mix(c, vec3(0.88, 0.55, 0.28), smoothstep(0.3, 0.45, t));
  c = mix(c, vec3(0.96, 0.8, 0.42), smoothstep(0.62, 0.84, t));
  return mix(c, vec3(0.99, 0.9, 0.62), smoothstep(0.84, 1.0, t));
}

void main() {
  float aspect = uRes.x / uRes.y;
  // The same cells as ditherScreen; the heat grid has one value per cell.
  vec2 grid = vec2(uCells, uCells / aspect);
  vec2 cell = floor(vUv * grid);
  float heat = texture2D(uHeat, (cell + 0.5) / uHeatSize).r;

  // The portrait's dot, a little larger where it burns.
  vec4 d = ditherScreen(vUv, aspect, uCells, uMouse, uHover, 0.0, uTime, uGrow * (1.0 + 0.1 * heat));
  // Cold, it is the portrait in grey: desaturated bone at the dot's own brightness.
  vec3 own = d.rgb / max(d.a, 1e-4);
  float l = dot(own, vec3(0.299, 0.587, 0.114));
  vec3 grey = mix(vec3(l), own, 0.2);
  // Hot, it takes the fire's hue at very nearly its own brightness, so the face reads through the
  // flames and the beat changes colour rather than light.
  vec3 p = firePalette(heat);
  float lp = dot(p, vec3(0.299, 0.587, 0.114));
  vec3 fire = p * (mix(l, lp, 0.1) / max(lp, 0.02));
  float burn = smoothstep(0.06, 0.2, heat);
  // Where the photograph is black, a small flame dot still prints, so the fire reads as one body.
  vec2 local = fract(vUv * grid) - 0.5;
  float rf = 0.15 * smoothstep(0.25, 0.85, heat);
  float flame = (1.0 - smoothstep(rf - 0.06, rf + 0.02, length(local))) * step(0.001, rf);
  float a = max(d.a, flame);
  vec3 rgb = mix(grey, fire, burn) * a;
  // Dots print onto the page's own washed black, so the canvas edge disappears into it.
  gl_FragColor = vec4(rgb + uBg * (1.0 - a), 1.0);
}
`;

export type Hover = { x: number; y: number; on: number };

/**
 * The fire's grid, one cell per dot: the Doom fire underneath (integer heat, eased twice) that
 * gives the tips their flicker, each column's slow drift, scratch for each row's mean, and the
 * heat shown with its texture.
 */
type Fire = {
  w: number;
  h: number;
  max: number;
  /** The first row that never burns. */
  cap: number;
  heat: Uint8Array;
  ease1: Float32Array;
  ease2: Float32Array;
  rowMean: Float32Array;
  drift: Float32Array;
  driftAim: Float32Array;
  data: Uint8Array;
  tex: THREE.DataTexture;
};

function makeFire(w: number, h: number): Fire {
  const data = new Uint8Array(w * h);
  const tex = new THREE.DataTexture(data, w, h, THREE.RedFormat);
  // One flat value per dot, in rows of any width.
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.unpackAlignment = 1;
  tex.needsUpdate = true;
  const n = w * h;
  return {
    w,
    h,
    max: Math.max(8, Math.round(h * MAX_HEAT)),
    cap: Math.floor(h * CAP),
    heat: new Uint8Array(n),
    ease1: new Float32Array(n),
    ease2: new Float32Array(n),
    rowMean: new Float32Array(h),
    drift: new Float32Array(w),
    driftAim: new Float32Array(w),
    data,
    tex,
  };
}

/**
 * One step of the PSX Doom fire (after Fabien Sanglard's write-up): from the top down, every cell
 * passes its heat to the row above, a unit cooler half the time, blown up to one cell sideways
 * with a little wind to the right. The bottom row is the source.
 */
function spread(f: Fire) {
  const { w, h, heat } = f;
  for (let y = h - 2; y >= 0; y--) {
    for (let x = 0; x < w; x++) {
      const r = Math.random();
      const to = Math.min(w - 1, Math.max(0, x + (r < 0.28 ? -1 : r < 0.64 ? 0 : 1)));
      heat[(y + 1) * w + to] = Math.max(0, heat[y * w + x] - (Math.random() < COOL ? 1 : 0));
    }
  }
}

/**
 * The portrait on fire, when `mode` is "audio" and the sound is on: one flame that beats with the
 * song. On every beat of whatever is playing (from the deck's time and the song's tempo, or bass
 * hits when that is not known), the whole flame leaps to about 70% of the portrait in ATTACK seconds, then sinks to
 * about half by the next beat; nothing ever burns above the 75% ceiling. Across the width it moves
 * as one body, its top rounded a little higher in the middle. Below the top the heat runs from a
 * gold base through orange to red tips, and only the tips flicker, with a PSX Doom fire running
 * underneath. Burning dots take the fire's colours at very nearly their own brightness, so the face
 * reads through the flames and the beat changes colour rather than light; the rest are the portrait
 * in grey. With the sound off the flame sinks away to the still, grey portrait, and the canvas
 * draws nothing until the pointer or the sound wakes it.
 */
function Dots({ src, aspect, focus, cells, mode, grow, hover, inView }: Pick<Props, "src" | "aspect" | "focus" | "mode" | "inView"> & {
  cells?: number;
  grow?: MotionValue<number>;
  hover: React.RefObject<Hover>;
}) {
  const tex = useLoader(THREE.TextureLoader, src);
  const { size, gl } = useThree();
  const invalidate = useThree((s) => s.invalidate);

  /**
   * The flame and what drives it: the beat envelope (when the last pulse came, from what height,
   * and how long its fall is), the flame's top now, how present the flame is (fading in and out
   * with the sound), the bass's recent level for hits, a clock locked to the deck for the beats,
   * and the Doom steps owed.
   */
  const sim = useRef({
    fire: null as Fire | null,
    now: 0,
    pulseAt: -10,
    from: 0,
    fall: 0.7,
    env: 0,
    top: 0,
    alive: 0,
    bass: 0,
    clock: 0,
    beat: -1,
    locked: false,
    owed: 0,
    burning: false,
  });
  // The fire's state, for verification in development (as the director is).
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") (window as unknown as { __portrait: unknown }).__portrait = sim.current;
  }, []);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: fullscreenVert,
        fragmentShader: frag,
        depthTest: false,
        uniforms: {
          uTex: { value: tex },
          uHeat: { value: null },
          uHeatSize: { value: new THREE.Vector2(1, 1) },
          uRes: { value: new THREE.Vector2(1, 1) },
          uImgAspect: { value: aspect },
          uFocus: { value: new THREE.Vector2(0.5, 0.52) },
          uTime: { value: 0 },
          uCells: { value: 90 },
          uMouse: { value: new THREE.Vector2(0.5, 0.5) },
          uHover: { value: 0 },
          uGrow: { value: 1 },
          uBg: { value: PAGE },
        },
      }),
    [tex, aspect],
  );
  useEffect(() => () => sim.current.fire?.tex.dispose(), []);
  // Ready before it is seen: the image is uploaded and the shader compiled (in parallel where the GPU
  // allows) as soon as the canvas mounts, so its first frame on screen never stalls the scroll.
  const { scene, camera } = useThree();
  useEffect(() => {
    gl.initTexture(tex);
    void gl.compileAsync(scene, camera).catch(() => {});
  }, [gl, tex, scene, camera, mat]);

  // Frames are drawn on demand. The sound, the pointer, `grow` and coming into view wake the
  // canvas; useFrame keeps it awake while anything still moves.
  useEffect(() => {
    const off = audio.subscribe(() => invalidate());
    return () => {
      off();
    };
  }, [invalidate]);
  useEffect(() => grow?.on("change", () => invalidate()), [grow, invalidate]);
  useEffect(() => {
    if (inView) invalidate();
  }, [inView, invalidate]);
  useEffect(() => {
    const el = gl.domElement;
    const wake = () => invalidate();
    el.addEventListener("pointermove", wake);
    el.addEventListener("pointerleave", wake);
    return () => {
      el.removeEventListener("pointermove", wake);
      el.removeEventListener("pointerleave", wake);
    };
  }, [gl, invalidate]);

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const lv = audio.levels();
    const { soundOn, cue } = audio.getState();
    const listening = mode === "audio" && soundOn;
    const u = mat.uniforms;
    const q = sim.current;
    q.now += dt;

    // The grid matches the dot grid.
    const cols = cells ?? (size.width < 560 ? 56 : 92);
    const rows = Math.ceil(cols / (size.width / Math.max(size.height, 1)));
    if (!q.fire || q.fire.w !== cols || q.fire.h !== rows) {
      q.fire?.tex.dispose();
      q.fire = makeFire(cols, rows);
      u.uHeat.value = q.fire.tex;
      u.uHeatSize.value.set(cols, rows);
    }
    const f = q.fire;

    // The beat: a pulse on every beat of whatever is playing, at least PULSE_GAP apart.
    const pulse = () => {
      if (q.now - q.pulseAt < PULSE_GAP) return;
      q.from = q.env;
      q.pulseAt = q.now;
    };
    const t = listening && cue ? audio.trackTime(cue) : null;
    const track = audio.track(cue);
    if (t !== null && track) {
      // A clock locked to the deck, so a beat lands between the media element's coarse updates.
      const next = q.clock + dt;
      q.clock = q.locked && Math.abs(t - next) < 0.25 ? next + (t - next) * 0.12 : t;
      const beatLength = 60 / track.bpm;
      q.fall = Math.max(0.2, beatLength - ATTACK);
      const beat = Math.floor((q.clock - track.downbeat) / beatLength);
      if (q.locked && beat !== q.beat) pulse();
      q.beat = beat;
      q.locked = true;
    } else q.locked = false;
    // Without the deck's time, bass hits keep the beat instead. (With it they are left out: a
    // syncopated hit just before a beat would take that beat's pulse.)
    const hit = lv.bass - q.bass;
    q.bass = ease(q.bass, lv.bass, dt, 0.6);
    if (listening && !q.locked && hit > 0.05) pulse();
    // Up fast, then down over the beat, eased at both ends.
    const since = q.now - q.pulseAt;
    q.env = since < ATTACK ? q.from + (1 - q.from) * smooth(since / ATTACK) : 0.5 * (1 + Math.cos(Math.PI * clamp((since - ATTACK) / q.fall)));
    // The flame grows in with the sound and sinks away without it.
    q.alive = ease(q.alive, listening ? 1 : 0, dt, listening ? 0.3 : 0.4);
    q.top = q.alive * (LOW + (HIGH - LOW) * q.env);

    // Each column's slow drift: a few columns share an aim, renewed about every second.
    for (let g = 0; g < cols; g += WANDER_COLUMNS) {
      if (Math.random() < dt) {
        const aim = WANDER * (Math.random() * 2 - 1);
        for (let x = g; x < Math.min(g + WANDER_COLUMNS, cols); x++) f.driftAim[x] = aim;
      }
    }
    for (let x = 0; x < cols; x++) {
      const aim = (f.driftAim[Math.max(x - 2, 0)] + f.driftAim[Math.max(x - 1, 0)] + f.driftAim[x] + f.driftAim[Math.min(x + 1, cols - 1)] + f.driftAim[Math.min(x + 2, cols - 1)]) / 5;
      f.drift[x] = ease(f.drift[x], aim, dt, 0.5);
    }

    // The Doom fire underneath, at full heat while the flame burns, stepped at its own rate.
    q.owed = Math.min(q.owed + dt * TICK, 3);
    while (q.owed >= 1) {
      q.owed -= 1;
      for (let x = 0; x < cols; x++) f.heat[x] = q.alive > 0.01 ? f.max : 0;
      spread(f);
    }
    const k = 1 - Math.exp(-dt / SMOOTH);
    for (let i = 0; i < f.heat.length; i++) {
      f.ease1[i] += (f.heat[i] / f.max - f.ease1[i]) * k;
      f.ease2[i] += (f.ease1[i] - f.ease2[i]) * k;
    }
    for (let y = 0; y < rows; y++) {
      let sum = 0;
      for (let x = 0; x < cols; x++) sum += f.ease2[y * cols + x];
      f.rowMean[y] = sum / cols;
    }

    // The heat shown: a gradient under each column's top (gold base, orange body, red tips), the
    // tips flickering with the Doom fire's own unevenness and licking a little above the top.
    let burning = false;
    for (let x = 0; x < cols; x++) {
      const across = (2 * x) / Math.max(cols - 1, 1) - 1;
      const top = q.top > 0.01 ? q.top + q.alive * (DOME * (0.5 - across * across) + f.drift[x]) : 0;
      for (let y = 0; y < rows; y++) {
        const i = y * cols + x;
        let shown = 0;
        if (top > 0.01 && y < f.cap) {
          const at = (y + 0.5) / rows;
          const rise = at / top;
          // How much hotter or cooler this cell runs than its row in the fire underneath.
          const flicker = f.rowMean[y] > 0.02 ? f.ease2[i] / f.rowMean[y] - 1 : 0;
          if (rise < 1) {
            const body = 1 - 0.85 * Math.pow(rise, 1.5);
            const tip = smooth(clamp((rise - 0.82) / 0.18));
            shown = body * (1 + 1.6 * tip * flicker);
          } else if (at < top + LICK) {
            shown = 0.15 * clamp(flicker * 3) * (1 - (at - top) / LICK);
          }
        }
        shown = clamp(shown);
        if (shown > 0) burning = true;
        f.data[i] = Math.round(shown * 255);
      }
    }
    f.tex.needsUpdate = true;
    q.burning = burning || q.alive > 0.01;

    u.uRes.value.set(size.width, size.height);
    u.uCells.value = cols;
    // The dots breathe with the music (always, on a "still" screen) and hold still in silence.
    if (listening || mode === "still") u.uTime.value += dt;
    u.uGrow.value = grow ? grow.get() : 1;
    u.uFocus.value.set(focus[0], focus[1]);
    const h = hover.current;
    u.uMouse.value.set(h.x, h.y);
    u.uHover.value += (h.on - u.uHover.value) * 0.08;

    const settling = q.burning || Math.abs(h.on - u.uHover.value) > 0.002;
    if (listening || mode === "still" || settling) state.invalidate();
  });

  return (
    <mesh frustumCulled={false} material={mat}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

type Props = {
  src: string;
  aspect: number;
  mode: "audio" | "still";
  focus: [number, number];
  cells?: number;
  grow?: MotionValue<number>;
  hover: React.RefObject<Hover>;
  /** Renders frames only while its box is near the viewport. */
  inView: boolean;
};

/** The dot screen's canvas, loaded on its own so three.js never weighs on the first page load. */
export default function DitherCanvas({ src, aspect, mode, focus, cells, grow, hover, inView }: Props) {
  return (
    <Canvas dpr={[1, 1.25]} frameloop={inView ? "demand" : "never"} gl={{ antialias: false, alpha: false }}>
      <Dots src={src} aspect={aspect} focus={focus} cells={cells} mode={mode} grow={grow} hover={hover} inView={inView} />
    </Canvas>
  );
}
