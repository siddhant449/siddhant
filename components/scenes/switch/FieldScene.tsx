"use client";
/* three.js objects are mutated every frame inside useFrame, which is the R3F idiom. */
/* eslint-disable react-hooks/immutability */

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";
import type { MotionValue } from "motion/react";
import * as THREE from "three";
import "@/lib/threeConsole";
import { audio } from "@/lib/audio";
import { scrollTop } from "@/lib/scroll";
import { Driver } from "@/components/hero/Driver";
import { CAMERA_Z, COLS, FOV, MAX_WORDS, TITLE_BEAT, VIEW_H, buildBeats, fieldFrag, fieldLoop, fieldVert, mulberry, pointCount, segment, type BeatShape, type View } from "./field";

type Props = {
  /** The pitch's progress, 0..1 across the pinned scroll. */
  q: MotionValue<number>;
  /** The viewport and the slit, in CSS pixels. */
  view: View;
  /** What each beat's dots form: the type as the page lays it out, or the open field. */
  shapes: BeatShape[];
};

const pointer = { x: 0, y: 0, part: 0, target: 0 };

function Field({ q, view, shapes }: Props) {
  const { size, gl } = useThree();
  const n = pointCount(view.phone);
  const rows = Math.ceil(n / COLS);
  const height = rows * (shapes.length + 1);

  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const ref = new Float32Array(n * 2);
    const seed = new Float32Array(n * 4);
    const rand = mulberry(7);
    for (let i = 0; i < n; i++) {
      ref[i * 2] = ((i % COLS) + 0.5) / COLS;
      ref[i * 2 + 1] = (Math.floor(i / COLS) + 0.5) / height;
      for (let k = 0; k < 4; k++) seed[i * 4 + k] = rand();
    }
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    g.setAttribute("aRef", new THREE.BufferAttribute(ref, 2));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seed, 4));
    return g;
  }, [n, height]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: fieldVert,
        fragmentShader: fieldFrag,
        transparent: true,
        depthWrite: false,
        depthTest: false,
        blending: THREE.AdditiveBlending,
        premultipliedAlpha: true,
        uniforms: {
          uBeats: { value: null },
          uRowFrom: { value: 0 },
          uRowTo: { value: 0 },
          uT: { value: 0 },
          uStream: { value: 0 },
          uSizeFrom: { value: 0.02 },
          uSizeTo: { value: 0.02 },
          uHalfW: { value: 1 },
          uTime: { value: 0 },
          uPx: { value: 1 },
          uDpr: { value: 1 },
          uAspect: { value: 1 },
          uPointer: { value: new THREE.Vector2() },
          uPart: { value: 0 },
          uBass: { value: 0 },
          uDropFrom: { value: 0 },
          uDropTo: { value: 0 },
          uLit: { value: new Float32Array(MAX_WORDS) },
        },
      }),
    [],
  );
  useEffect(() => () => material.dispose(), [material]);

  // Every beat's dots, sampled from the page's own type for this viewport: built once per layout,
  // while the hero still plays, so scrolling through costs no uploads at all.
  // One beat per idle moment (a few milliseconds each), so no frame of the hero waits on it.
  const sizes = useRef<number[]>([]);
  useEffect(() => {
    const steps = buildBeats(shapes, view);
    let texture: THREE.DataTexture | null = null;
    let handle = 0;
    const idle = typeof window.requestIdleCallback === "function";
    const schedule = () => (handle = idle ? window.requestIdleCallback(step, { timeout: 250 }) : window.setTimeout(step, 16));
    const step = () => {
      const next = steps.next();
      if (!next.done) return void schedule();
      const built = next.value;
      texture = new THREE.DataTexture(built.data, COLS, built.rows * built.beats, THREE.RGBAFormat, THREE.FloatType);
      texture.minFilter = THREE.NearestFilter;
      texture.magFilter = THREE.NearestFilter;
      texture.needsUpdate = true;
      material.uniforms.uBeats.value = texture;
      sizes.current = built.sizes;
      fieldLoop.dirty = true;
    };
    schedule();
    return () => {
      if (idle) window.cancelIdleCallback(handle);
      else window.clearTimeout(handle);
      texture?.dispose();
    };
  }, [shapes, view, material]);

  // Which of the title card's words are lit (sung, or scrolled past), as the card marks them:
  // watched, never read in a frame.
  const lit = useRef(new Float32Array(MAX_WORDS));
  useEffect(() => {
    const line = document.querySelector("#a-side h2[data-lyric]");
    if (!line) return;
    const read = () =>
      line.querySelectorAll<HTMLElement>(":scope > span").forEach((el, i) => {
        if (i < MAX_WORDS) lit.current[i] = el.dataset.lit === "1" ? 1 : 0;
      });
    read();
    const mo = new MutationObserver(read);
    mo.observe(line, { subtree: true, attributes: true, attributeFilter: ["data-lit"] });
    return () => mo.disconnect();
  }, []);

  // The cursor, in normalised device coordinates. The canvas fills the viewport, so no layout is read.
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = -((e.clientY / window.innerHeight) * 2 - 1);
      pointer.target = 1;
    };
    const leave = () => (pointer.target = 0);
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, []);

  useFrame((state, delta) => {
    const u = material.uniforms;
    const seg = segment(q.get());
    u.uRowFrom.value = (seg.from * rows) / height;
    u.uRowTo.value = (seg.to * rows) / height;
    u.uT.value = seg.t;
    u.uStream.value = seg.from === 0 ? 1 : 0;
    u.uSizeFrom.value = sizes.current[seg.from] ?? 0.02;
    u.uSizeTo.value = sizes.current[seg.to] ?? 0.02;
    // The title card rides up with the page until it pins: its words' dots ride with it.
    const drop = (Math.max(0, view.pinAt - scrollTop()) * VIEW_H) / view.height;
    u.uDropFrom.value = seg.from === TITLE_BEAT ? drop : 0;
    u.uDropTo.value = seg.to === TITLE_BEAT ? drop : 0;
    // Each title word's dots brighten and dim as the card's word does (it eases in 0.12s, out 0.35s).
    const shown = u.uLit.value as Float32Array;
    for (let i = 0; i < MAX_WORDS; i++) {
      const target = lit.current[i];
      shown[i] += (target - shown[i]) * (1 - Math.exp(-delta * (target > shown[i] ? 18 : 7)));
    }
    u.uHalfW.value = (VIEW_H * size.width) / size.height / 2;
    u.uTime.value = state.clock.elapsedTime;
    u.uPx.value = size.height / VIEW_H;
    u.uDpr.value = gl.getPixelRatio();
    u.uAspect.value = size.width / size.height;
    u.uBass.value = audio.levels().bass;
    // The parting eases in and out, and follows the cursor softly.
    const k = 1 - Math.exp(-delta * 6);
    pointer.part += (pointer.target - pointer.part) * k;
    u.uPointer.value.x += (pointer.x - u.uPointer.value.x) * Math.min(1, k * 2);
    u.uPointer.value.y += (pointer.y - u.uPointer.value.y) * Math.min(1, k * 2);
    u.uPart.value = pointer.part;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}

/**
 * The field's one canvas: transparent over the stage's page tone (so it starts exactly on the
 * hero's last frame), up to 1.25x pixel density, dropping to 1x on a device that can't hold the
 * frame rate. It mounts (compiling its shader and building its dots) while the hero still plays,
 * and draws every frame only while `fieldLoop.running`, flipped by the section without a render.
 */
export default function FieldScene(props: Props) {
  const [maxDpr, setMaxDpr] = useState(1.25);
  return (
    <Canvas
      dpr={[1, maxDpr]}
      frameloop="never"
      // It fills a pinned stage: its size changes with the viewport, never with scrolling, so the
      // canvas isn't re-measured (a layout read) and re-rendered on every scroll.
      resize={{ scroll: false }}
      camera={{ fov: FOV, position: [0, 0, CAMERA_Z], near: 0.1, far: 40 }}
      gl={{ antialias: false, alpha: true, premultipliedAlpha: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
    >
      <Field {...props} />
      <Driver loop={fieldLoop} />
      <PerformanceMonitor flipflops={2} onDecline={() => setMaxDpr(1)} />
    </Canvas>
  );
}
