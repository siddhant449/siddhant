"use client";
/* three.js objects are mutated every frame inside useFrame, which is the R3F idiom. */
/* eslint-disable react-hooks/immutability */

import { useEffect, useInsertionEffect, useMemo, useRef, type RefObject } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { useInView, useReducedMotion } from "motion/react";
import * as THREE from "three";
import "@/lib/threeConsole";
import { audio } from "@/lib/audio";
import { ditherChunk, fullscreenVert } from "@/components/dither/ditherChunk";
import { mangaArt } from "@/lib/content";
import styles from "./MangaPanels.module.css";

/** Page-space bounding boxes (x0, y0, x1, y1; y up) of the five panels cut by the lines in the shader. */
const BOXES: [number, number, number, number][] = [
  [0, 0.655, 1, 1],
  [0, 0.2859, 0.47, 0.6715],
  [0.37, 0.27, 1, 0.69],
  [0, 0, 0.62, 0.3],
  [0.58, 0, 1, 0.2814],
];

type Shot = {
  /** Crop centre in image uv (y up) and crop height as a fraction of the image. */
  focus: [number, number];
  h: number;
  /** Screen-tone density: dots across the panel. */
  cells: number;
  /** Parallax depth, 0 (far) to 1 (near). */
  depth: number;
  /** Where in the spectrum (0..1) this panel listens. */
  band: number;
  /** Below this luminance the source prints as solid ink (its line work and flat blacks). */
  ink: number;
};

/** One shot per panel, in page order; the art itself (and its credit) is `mangaArt` in lib/content.ts. */
const SHOTS: Shot[] = [
  { focus: [0.5, 0.5], h: 0.62, cells: 150, depth: 0.25, band: 0.12, ink: 0.24 }, // the eyes, across the top
  { focus: [0.5, 0.27], h: 0.4, cells: 96, depth: 1, band: 0.3, ink: 0.3 }, // the "!" panel, speed lines and all
  { focus: [0.5, 0.8], h: 0.36, cells: 120, depth: 0.45, band: 0.5, ink: 0.26 }, // one character, several styles
  { focus: [0.5, 0.62], h: 0.22, cells: 130, depth: 0.7, band: 0.7, ink: 0.32 }, // an ink portrait, eyes in close-up
  // Fine line art goes grey when sampled down, so it inks at a much lighter threshold.
  { focus: [0.53, 0.6], h: 0.24, cells: 96, depth: 0.85, band: 0.86, ink: 0.72 }, // line-art action
];

const frag = /* glsl */ `
uniform sampler2D uImg0;
uniform sampler2D uImg1;
uniform sampler2D uImg2;
uniform sampler2D uImg3;
uniform sampler2D uImg4;
uniform sampler2D uSpec;
uniform vec2 uRes;
uniform float uTime;
uniform float uBass;
uniform vec2 uShift;
uniform vec2 uMouse;
uniform float uHover;
uniform vec4 uBox[5];
uniform vec4 uCrop[5];
uniform vec4 uTone[5];
varying vec2 vUv;

// The panel being drawn, read by the sampling macros below.
int gK;
vec4 gCrop;
float gBand;
float gLod;

vec3 art(vec2 uv, float lod) {
  if (gK == 0) return textureLod(uImg0, uv, lod).rgb;
  if (gK == 1) return textureLod(uImg1, uv, lod).rgb;
  if (gK == 2) return textureLod(uImg2, uv, lod).rgb;
  if (gK == 3) return textureLod(uImg3, uv, lod).rgb;
  return textureLod(uImg4, uv, lod).rgb;
}

// The source's luminance at panel point q, at mip level lod.
float lumAt(vec2 q, float lod) {
  vec2 uv = clamp(gCrop.xy + (q - 0.5) * gCrop.zw, 0.002, 0.998);
  return dot(art(uv, lod), vec3(0.299, 0.587, 0.114));
}

// Printed positive, as manga is: white stays paper, mid-tones become screen-tone dots,
// and the dither's dots grow with darkness. Scaled into the range the dot screen reads.
#define DITHER_SAMPLE(p) vec3(pow(smoothstep(0.06, 0.92, 1.0 - lumAt(p, gLod)), 1.15) * 0.45)
#define DITHER_SPEC(x) textureLod(uSpec, vec2(clamp(gBand + ((x) - 0.5) * 0.2, 0.0, 1.0), 0.5), 0.0).r
${ditherChunk}

const vec3 PAPER = vec3(0.925, 0.906, 0.871);
const vec3 INK = vec3(0.035, 0.032, 0.03);

float hash1(float n) {
  return fract(sin(n * 127.1) * 43758.5453);
}

// Signed distance in pixels from p to the line a→b; positive on its left.
float lineDist(vec2 p, vec2 a, vec2 b) {
  vec2 e = (b - a) * uRes;
  vec2 q = (p - a) * uRes;
  return (e.x * q.y - e.y * q.x) / length(e);
}

void main() {
  vec2 p = vUv;
  // The page: a wide band on top, then two bands each split by a slanted gutter.
  float h1 = lineDist(p, vec2(0.0, 0.655), vec2(1.0, 0.69));
  float h2 = lineDist(p, vec2(0.0, 0.30), vec2(1.0, 0.27));
  float v1 = lineDist(p, vec2(0.37, 0.2889), vec2(0.47, 0.6715));
  float v2 = lineDist(p, vec2(0.58, 0.0), vec2(0.62, 0.2814));

  int k;
  float gut;
  if (h1 > 0.0) {
    k = 0;
    gut = h1;
  } else if (h2 > 0.0) {
    k = v1 > 0.0 ? 1 : 2;
    gut = min(-h1, min(h2, abs(v1)));
  } else {
    k = v2 > 0.0 ? 3 : 4;
    gut = min(-h2, abs(v2));
  }

  vec4 box = uBox[0];
  vec4 crop = uCrop[0];
  vec4 tone = uTone[0];
  for (int i = 1; i < 5; i++) {
    if (i == k) {
      box = uBox[i];
      crop = uCrop[i];
      tone = uTone[i];
    }
  }

  vec2 size = box.zw - box.xy;
  vec2 sizePx = size * uRes;
  vec2 q = (p - box.xy) / size;
  // 2.5D: each panel's layer slides by its own depth, dots and all, so the screen never shimmers.
  q += uShift * tone.y * 18.0 / sizePx;

  gK = k;
  gCrop = crop;
  gBand = tone.z;
  // Sampled at the mip level that matches one dot, so each dot carries its area's average tone.
  gLod = max(log2(crop.z * 1400.0 / tone.x) - 0.5, 0.0);

  float pulse = textureLod(uSpec, vec2(tone.z, 0.5), 0.0).r;
  float aspect = sizePx.x / sizePx.y;
  vec4 d = ditherScreen(q, aspect, tone.x, (uMouse - box.xy) / size, uHover, uBass, uTime + float(k) * 1.7, 0.94 + 0.1 * pulse);

  // The artist's own line work and flat blacks print solid, sampled near full resolution so lines stay crisp.
  float lodLine = max(log2(crop.z * 1400.0 / sizePx.x), 0.0);
  float line = 1.0 - smoothstep(tone.w, tone.w + 0.1, lumAt(q, lodLine));
  float ink = max(d.a, line);

  // The action panel gets speed lines across it, the manga's own motion blur.
  if (k == 4) {
    float row = q.y * 70.0;
    float h = hash1(floor(row));
    float x0 = hash1(floor(row) + 5.0) * 0.6;
    float streak = step(0.84, h) * (1.0 - smoothstep(0.12, 0.42, abs(fract(row) - 0.5)));
    ink = max(ink, streak * smoothstep(x0, x0 + 0.25, q.x) * (1.0 - smoothstep(0.7, 0.9, q.x)) * 0.8);
  }

  // Beat-driven brightness stays inside 6%.
  vec3 col = mix(PAPER * (0.9 + 0.06 * pulse), INK, ink);

  // The printed page: a paper margin round it, paper gutters, and an inked border on every panel.
  float s = uRes.y / 520.0;
  float edgePx = min(min(p.x, 1.0 - p.x) * uRes.x, min(p.y, 1.0 - p.y) * uRes.y) - 9.0 * s;
  float into = min(gut - 3.5 * s, edgePx);
  float border = 1.0 - smoothstep(1.6 * s, 2.4 * s, into);
  col = mix(col, INK, border);
  col = mix(col, PAPER * 0.92, 1.0 - smoothstep(-0.5, 0.5, into));
  gl_FragColor = vec4(col, 1.0);
}
`;

type Pointer = { x: number; y: number; u: number; v: number; on: number };

function clamp(v: number, lo: number, hi: number) {
  return Math.min(Math.max(v, lo), hi);
}

function Page({ pointer, place, reduce }: { pointer: RefObject<Pointer>; place: RefObject<number>; reduce: boolean }) {
  const sources = useLoader(
    THREE.TextureLoader,
    mangaArt.map((a) => a.src),
  );
  const { size } = useThree();
  const shift = useRef({ x: 0, y: 0 });

  // Own copies: the loader cache is shared with other canvases that change filtering and colour space.
  const images = useMemo(
    () =>
      sources.map((src) => {
        const t = src.clone();
        t.colorSpace = THREE.NoColorSpace;
        t.minFilter = THREE.LinearMipmapLinearFilter;
        t.magFilter = THREE.LinearFilter;
        t.generateMipmaps = true;
        t.needsUpdate = true;
        return t;
      }),
    [sources],
  );

  const specData = useMemo(() => new Uint8Array(64 * 4), []);
  const specTex = useMemo(() => {
    const t = new THREE.DataTexture(specData, 64, 1, THREE.RGBAFormat);
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearFilter;
    t.needsUpdate = true;
    return t;
  }, [specData]);

  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: fullscreenVert,
        fragmentShader: frag,
        depthTest: false,
        uniforms: {
          ...Object.fromEntries(images.map((t, i) => [`uImg${i}`, { value: t }])),
          uSpec: { value: specTex },
          uRes: { value: new THREE.Vector2(1, 1) },
          uTime: { value: 0 },
          uBass: { value: 0 },
          uShift: { value: new THREE.Vector2() },
          uMouse: { value: new THREE.Vector2(0.5, 0.5) },
          uHover: { value: 0 },
          uBox: { value: BOXES.map((b) => new THREE.Vector4(...b)) },
          uCrop: { value: SHOTS.map(() => new THREE.Vector4(0.5, 0.5, 0.5, 0.5)) },
          uTone: { value: SHOTS.map((s) => new THREE.Vector4(s.cells, s.depth, s.band, s.ink)) },
        },
      }),
    [images, specTex],
  );

  // Ready before it is seen: the art uploaded (with its mipmaps) and the shader compiled (in parallel
  // where the GPU allows) as soon as the canvas mounts, so its first frame on screen never stalls the scroll.
  const { gl, scene, camera } = useThree();
  useEffect(() => {
    images.forEach((t) => gl.initTexture(t));
    gl.initTexture(specTex);
    void gl.compileAsync(scene, camera).catch(() => {});
  }, [gl, scene, camera, mat, images, specTex]);

  // Freed only when the page is really removed: an insertion effect isn't cleaned up while the route waits
  // hidden in an <Activity>, so the art stays on the GPU for the return instead of being uploaded again.
  useInsertionEffect(
    () => () => {
      mat.dispose();
      images.forEach((t) => t.dispose());
      specTex.dispose();
    },
    [mat, images, specTex],
  );

  // Crops follow each panel's real proportions, so a portrait phone page and a wide desktop page both frame the shot.
  useEffect(() => {
    const crops = mat.uniforms.uCrop.value as THREE.Vector4[];
    SHOTS.forEach((s, i) => {
      const [x0, y0, x1, y1] = BOXES[i];
      const aspect = ((x1 - x0) * size.width) / ((y1 - y0) * size.height);
      let sy = s.h;
      let sx = (s.h * aspect) / mangaArt[i].aspect;
      if (sx > 0.9) {
        sy *= 0.9 / sx;
        sx = 0.9;
      }
      crops[i].set(
        clamp(s.focus[0], sx / 2 + 0.02, 1 - sx / 2 - 0.02),
        clamp(s.focus[1], sy / 2 + 0.02, 1 - sy / 2 - 0.02),
        sx,
        sy,
      );
    });
  }, [mat, size.width, size.height]);

  useFrame((state) => {
    const lv = audio.levels();
    const s = audio.spectrum;
    for (let i = 0; i < 64; i++) {
      const v = Math.min(255, s[i] * 1.25 * 255);
      specData[i * 4] = specData[i * 4] * 0.6 + v * 0.4;
    }
    specTex.needsUpdate = true;

    const u = mat.uniforms;
    u.uRes.value.set(size.width, size.height);
    u.uTime.value = state.clock.elapsedTime;
    u.uBass.value = lv.bass;

    // Parallax target: the pointer, plus a slow drift with the page's place in the viewport (for touch).
    const p = pointer.current;
    let tx = 0;
    let ty = 0;
    if (!reduce) {
      tx = p.x * p.on;
      ty = p.y * p.on + place.current * 0.7;
    }
    const sh = shift.current;
    sh.x += (tx - sh.x) * 0.06;
    sh.y += (ty - sh.y) * 0.06;
    u.uShift.value.set(sh.x, sh.y);
    u.uMouse.value.set(p.u, p.v);
    u.uHover.value += (p.on - u.uHover.value) * 0.08;
  });

  return (
    <mesh frustumCulled={false} material={mat}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

/**
 * Shizuku as a printed manga page: five panels of real, freely licensed manga and anime art
 * (credited beside it), printed the way manga is: the artists' line work in solid ink, their tones
 * as the film's dither screen-tone, each panel in its own tone density, sliding at its own depth
 * with the pointer (the studio's 2.5D engine, in miniature) and listening to its own band of the
 * song. One canvas, paused off screen. Decorative: the text beside it carries the meaning.
 * It fills its parent's box, at any proportions: the panel crops follow the page's shape.
 */
export default function MangaPanels({ className }: { className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const pointer = useRef<Pointer>({ x: 0, y: 0, u: 0.5, v: 0.5, on: 0 });
  const inView = useInView(box, { margin: "200px 0px 200px 0px" });
  const reduce = useReducedMotion() ?? false;

  // Where the page's centre sits in the viewport (-1 top, 1 bottom), for the drift. Measured on scroll and resize,
  // not in the frame loop, where the read could force a layout mid-frame.
  const place = useRef(0);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      place.current = clamp(((r.top + r.height / 2) / window.innerHeight - 0.5) * 2, -1, 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro.disconnect();
      window.removeEventListener("scroll", measure);
    };
  }, []);

  return (
    <div
      ref={box}
      className={`${styles.box} ${className ?? ""}`}
      aria-hidden
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        const u = (e.clientX - r.left) / r.width;
        const v = 1 - (e.clientY - r.top) / r.height;
        pointer.current = { x: u * 2 - 1, y: v * 2 - 1, u, v, on: 1 };
      }}
      onPointerLeave={() => {
        pointer.current.on = 0;
      }}
    >
      {/* offsetSize: the canvas follows the page's layout box, whatever transforms an ancestor applies. */}
      <Canvas
        dpr={[1, 1.25]}
        frameloop={inView ? "always" : "never"}
        resize={{ offsetSize: true }}
        gl={{ antialias: false, alpha: false }}
      >
        <Page pointer={pointer} place={place} reduce={reduce} />
      </Canvas>
    </div>
  );
}
