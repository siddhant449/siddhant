"use client";
/* three.js objects are mutated every frame inside useFrame, which is the R3F idiom. */
/* eslint-disable react-hooks/immutability */

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import type { MotionValue } from "motion/react";
import * as THREE from "three";
import "@/lib/threeConsole";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import { audio } from "@/lib/audio";
import { Driver } from "./Driver";
import { heroLoop } from "./loop";
import { backdropFrag, fullscreenVert, glintFrag, glintVert } from "./shaders";
import { HERO_PIN } from "./timing";

type SceneProps = {
  scroll: MotionValue<number>;
  /** 0 until the gate opens, then animates to 1. */
  revealAt: number | null;
  /** Reduced motion: the cursor neither tilts the title nor pans the photograph. */
  reduce: boolean;
  word: string;
};

const ease = (x: number) => 1 - Math.pow(1 - Math.min(Math.max(x, 0), 1), 4);

function revealProgress(revealAt: number | null, delay = 0, dur = 2.4) {
  if (revealAt === null) return 0;
  return ease((performance.now() / 1000 - revealAt - delay) / dur);
}

const pointer = { x: 0, y: 0, sx: 0, sy: 0 };

/** Where the chrome title's first letter is in world space, for the camera's opening insert. */
const titleFrame = { x: 0, y: 0, z: 0 };
const ORIGIN = new THREE.Vector3(0, 0, 0);
const WIDE = new THREE.Vector3(0, 0, 12);
const FOV = 32;
/** The page background (--black): the hero fades up out of it and dissolves back into it. */
const PAGE = "#121110";
/** The visible plane at z = 0 from the wide camera position. */
function wideViewport(aspect: number) {
  const height = 2 * WIDE.z * Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  return { width: height * aspect, height };
}

/**
 * The pillar's light on screen, as a fraction of the canvas width: the same expression as SC.02's
 * slit (a sixth of the viewport, or the margin on phones), so the blade lands exactly on it.
 */
function pillarAt(width: number) {
  const phone = window.matchMedia("(max-width: 800px)").matches;
  const margin = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--margin")) || 16;
  return (phone ? margin : window.innerWidth / 6) / Math.max(width, 1);
}

const exitProgress = (scroll: MotionValue<number>) => Math.min(scroll.get() / HERO_PIN, 1);
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return t * t * (3 - 2 * t);
};

function Backdrop({ scroll, revealAt }: Pick<SceneProps, "scroll" | "revealAt">) {
  const tex = useLoader(THREE.TextureLoader, "/img/ledge.jpg");
  const { size } = useThree();
  const mat = useMemo(() => {
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    return new THREE.ShaderMaterial({
      vertexShader: fullscreenVert,
      fragmentShader: backdropFrag,
      depthWrite: false,
      depthTest: false,
      uniforms: {
        uTex: { value: tex },
        uRes: { value: new THREE.Vector2(1, 1) },
        uImgAspect: { value: 1536 / 1024 },
        uFocus: { value: new THREE.Vector2(0.4, 0.5) },
        uMouse: { value: new THREE.Vector2() },
        uTime: { value: 0 },
        uBass: { value: 0 },
        uEnergy: { value: 0 },
        uExit: { value: 0 },
        uReveal: { value: 0 },
        uBg: { value: new THREE.Color(PAGE) },
        uPillar: { value: 1 / 6 },
      },
    });
  }, [tex]);
  const pillar = useMemo(() => pillarAt(size.width), [size.width]);

  useFrame((state) => {
    const u = mat.uniforms;
    const lv = audio.levels();
    u.uRes.value.set(size.width, size.height);
    u.uPillar.value = pillar;
    // On narrow screens, keep the figure in frame rather than the sky.
    u.uFocus.value.x = size.width / size.height < 1 ? 0.33 : 0.42;
    u.uTime.value = state.clock.elapsedTime;
    u.uBass.value = lv.bass;
    u.uEnergy.value = lv.energy;
    u.uMouse.value.set(pointer.sx, pointer.sy);
    u.uExit.value = exitProgress(scroll);
    u.uReveal.value = revealProgress(revealAt, 0, 2.8);
  });

  return (
    <mesh renderOrder={-1} frustumCulled={false} material={mat}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

/** Bends text like the inside of a drum: the ends drop, grow and recede. */
function bendPoint(v: THREE.Vector3, halfW: number) {
  const u2 = (v.x / halfW) ** 2;
  v.set(v.x * (1 - 0.04 * u2), v.y * (1 + 0.32 * u2) - u2 * halfW * 0.07, v.z - u2 * halfW * 0.2);
  return v;
}

function arcBend(geo: THREE.BufferGeometry, halfW: number) {
  const p = geo.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    bendPoint(v.fromBufferAttribute(p, i), halfW);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  p.needsUpdate = true;
  geo.computeVertexNormals();
}

function ChromeTitle({ word, scroll, revealAt }: Pick<SceneProps, "word" | "scroll" | "revealAt">) {
  const font = useLoader(FontLoader, "/fonts/archivo-expanded-800.typeface.json");
  const group = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshPhysicalMaterial>(null);
  const glintMat = useRef<THREE.ShaderMaterial>(null);
  const { size, gl } = useThree();

  const { geometry, width, height, glints } = useMemo(() => {
    const geo = new TextGeometry(word, {
      font,
      size: 1,
      depth: 0.26,
      curveSegments: 10,
      bevelEnabled: true,
      bevelThickness: 0.05,
      bevelSize: 0.028,
      bevelSegments: 5,
    });
    geo.center();
    geo.computeBoundingBox();
    const bb = geo.boundingBox!.clone();
    const halfW = (bb.max.x - bb.min.x) / 2;

    // Glints sit on real outline vertices along the front face, near the cap line or baseline.
    const pos = geo.attributes.position as THREE.BufferAttribute;
    const picks: number[] = [];
    const rand = mulberry(7);
    const v = new THREE.Vector3();
    const h = bb.max.y - bb.min.y;
    let guard = 0;
    while (picks.length < 12 * 3 && guard++ < 50000) {
      v.fromBufferAttribute(pos, Math.floor(rand() * pos.count));
      const onFront = v.z > bb.max.z - 0.03;
      const onEdge = v.y > bb.max.y - h * 0.08 || v.y < bb.min.y + h * 0.06;
      const spaced = picks.every((_, j) => j % 3 || Math.abs(picks[j] - v.x) > halfW * 0.12);
      if (onFront && onEdge && spaced) {
        bendPoint(v, halfW);
        picks.push(v.x, v.y, v.z + 0.05);
      }
    }
    arcBend(geo, halfW);
    geo.computeBoundingBox();
    const bent = geo.boundingBox!;

    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(picks, 3));
    const n = picks.length / 3;
    g.setAttribute("aPhase", new THREE.Float32BufferAttribute(Array.from({ length: n }, () => rand()), 1));
    g.setAttribute("aSize", new THREE.Float32BufferAttribute(Array.from({ length: n }, () => 60 + rand() * 70), 1));
    return { geometry: geo, width: bent.max.x - bent.min.x, height: bent.max.y - bent.min.y, glints: g };
  }, [font, word]);

  useEffect(() => () => {
    geometry.dispose();
    glints.dispose();
  }, [geometry, glints]);

  useFrame((state) => {
    const g = group.current;
    if (!g) return;
    const lv = audio.levels();
    // Rack focus holds the name sharp while the photograph softens. Then, still in frame, its
    // reflections fade and it dims, and it dissolves into the dark before the blade narrows.
    const e = exitProgress(scroll);
    const dim = smooth(0.12, 0.62, e);
    const gone = smooth(0.5, 0.8, e);
    const r = revealProgress(revealAt, 0.35, 2.6);
    const isNarrow = size.width < size.height;

    // Fit the width, but never let the title grow past the top quarter of the
    // frame: the face in the photograph sits just below it.
    // Lay out against the wide shot's lens (z = 0 seen from WIDE), not the live camera,
    // so the opening insert and the push never change the title's size or position.
    const viewport = wideViewport(size.width / size.height);
    const fit = Math.min((viewport.width * (isNarrow ? 0.94 : 0.7)) / width, (viewport.height * 0.25) / height);
    const pulse = 1 + lv.bass * 0.04;
    g.scale.setScalar(fit * (0.82 + 0.18 * r) * pulse);
    const top = viewport.height * (0.5 - (isNarrow ? 0.13 : 0.075));
    // It eases back a little as the camera pushes in, so its size on screen holds and it never leaves the frame.
    g.position.set(0, top - (height * fit) / 2, -4 * (1 - r) - dim * 0.8);
    titleFrame.x = -(width * g.scale.x) / 2 + width * g.scale.x * 0.06;
    titleFrame.y = g.position.y + height * g.scale.x * 0.1;
    titleFrame.z = g.position.z;
    g.rotation.x = -0.12 + pointer.sy * 0.08 - (1 - r) * 0.5;
    g.visible = gone < 0.999;
    g.rotation.y = pointer.sx * 0.16;

    if (matRef.current) {
      matRef.current.emissiveIntensity = lv.bass * 0.22 * (1 - dim);
      matRef.current.opacity = 1 - gone;
    }
    // The chrome's reflections come from the scene's environment (the title is all that uses it),
    // so they dim there: a material's own envMapIntensity only scales a map set on the material.
    state.scene.environmentIntensity = 1 - dim * 0.9;
    if (glintMat.current) {
      const u = glintMat.current.uniforms;
      u.uTime.value = state.clock.elapsedTime;
      u.uHigh.value = lv.high;
      u.uSize.value = Math.min(Math.max(size.width / 1440, 0.4), 1.15);
      u.uReveal.value = revealProgress(revealAt, 1.6, 1.2) * (1 - smooth(0.1, 0.35, e));
    }

    pointer.sx += (pointer.x - pointer.sx) * 0.05;
    pointer.sy += (pointer.y - pointer.sy) * 0.05;
  });

  return (
    <group ref={group}>
      <mesh geometry={geometry}>
        <meshPhysicalMaterial
          ref={matRef}
          transparent
          color="#f3f1ee"
          metalness={1}
          roughness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.05}
          emissive="#f6e7d3"
          emissiveIntensity={0}
        />
      </mesh>
      <points geometry={glints} renderOrder={2}>
        <shaderMaterial
          ref={glintMat}
          vertexShader={glintVert}
          fragmentShader={glintFrag}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          uniforms={{
            uTime: { value: 0 },
            uHigh: { value: 0 },
            uReveal: { value: 0 },
            uPixelRatio: { value: gl.getPixelRatio() },
            uSize: { value: 1 },
          }}
        />
      </points>
    </group>
  );
}

function mulberry(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * The hero's camera. It opens on an insert, the first chrome letter catching the key light
 * in the dark, a little low so it looks up at it, then pulls back to the wide of the ledge
 * as the photograph fades up. On exit it makes a slow, motivated push in toward the pillar,
 * gentle enough that the title stays whole in the frame (on a narrow screen, straight in).
 */
function CameraRig({ scroll, revealAt }: Pick<SceneProps, "scroll" | "revealAt">) {
  const look = useMemo(() => new THREE.Vector3(), []);
  const from = useMemo(() => new THREE.Vector3(), []);
  const { size } = useThree();
  useFrame(({ camera }) => {
    const t = revealAt === null ? 0 : Math.min(Math.max((performance.now() / 1000 - revealAt) / 3.4, 0), 1);
    const u = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    const narrow = size.width < size.height;
    const push = smooth(0, 0.85, exitProgress(scroll));
    const side = narrow ? 0 : push * 0.25;
    look.set(titleFrame.x, titleFrame.y, titleFrame.z).lerp(ORIGIN, u);
    from.set(titleFrame.x + 0.6, titleFrame.y - 0.25, titleFrame.z + 3.2).lerp(WIDE, u);
    camera.position.set(from.x - side, from.y, from.z - push * (narrow ? 0.35 : 0.9));
    look.x -= side;
    camera.lookAt(look);
  });
  return null;
}

function BloomPulse() {
  const ref = useRef<{ intensity: number } | null>(null);
  useFrame(() => {
    // Bloom follows the bass only gently: a pulse of light, never a strobe.
    if (ref.current) ref.current.intensity = 0.55 + audio.levels().bass * 0.35;
  });
  return (
    <EffectComposer multisampling={2}>
      <Bloom ref={ref as never} mipmapBlur luminanceThreshold={0.82} luminanceSmoothing={0.12} intensity={0.55} radius={0.7} />
    </EffectComposer>
  );
}

export default function HeroScene(props: SceneProps) {
  const { reduce } = props;
  // Up to 1.25x pixel density (bloom softens the edges anyway), dropping to 1x on a device
  // that can't hold the frame rate: integrated graphics are fill-rate bound here.
  const [maxDpr, setMaxDpr] = useState(1.25);
  useEffect(() => {
    if (reduce) {
      // Held square to the lens, even if motion was reduced while the cursor had it turned.
      Object.assign(pointer, { x: 0, y: 0, sx: 0, sy: 0 });
      return;
    }
    const move = (e: PointerEvent) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", move, { passive: true });
    return () => window.removeEventListener("pointermove", move);
  }, [reduce]);

  return (
    <Canvas
      dpr={[1, maxDpr]}
      // It fills a pinned stage: its size changes with the viewport, never with scrolling, so the
      // canvas isn't re-measured (a layout read) and re-rendered on every scroll.
      resize={{ scroll: false }}
      // Driven by heroLoop (Hero.tsx), which flips it on and off without a render. Paused, it still
      // draws a frame once loaded, so the shaders compile before the gate opens.
      frameloop="never"
      camera={{ fov: FOV, position: [WIDE.x, WIDE.y, WIDE.z], near: 0.1, far: 50 }}
      gl={{ antialias: false, powerPreference: "high-performance", alpha: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.setClearColor(PAGE);
      }}
    >
      <Backdrop scroll={props.scroll} revealAt={props.revealAt} />
      <ChromeTitle word={props.word} scroll={props.scroll} revealAt={props.revealAt} />
      <CameraRig scroll={props.scroll} revealAt={props.revealAt} />
      {/* One key light from camera-left, as in the photograph (Rembrandt-style): a warm key,
          a weak cool fill on the right, strips on black so the chrome reads as metal. */}
      <Environment resolution={256} frames={1}>
        <Lightformer form="rect" intensity={3.2} color="#f2c89a" position={[-6, 2, 2]} scale={[1.2, 9, 1]} rotation-y={Math.PI / 2} />
        <Lightformer form="rect" intensity={3.4} color="#fff6ea" position={[-1, 6, 1]} scale={[12, 0.8, 1]} rotation-x={Math.PI / 2} />
        <Lightformer form="rect" intensity={2.6} color="#ffffff" position={[-1, 2.5, 5]} scale={[14, 0.35, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#cfd8ea" position={[7, 0, 2]} scale={[0.6, 8, 1]} rotation-y={-Math.PI / 2} />
        <Lightformer form="rect" intensity={0.6} color="#f2c89a" position={[0, -5, 2]} scale={[12, 0.4, 1]} rotation-x={-Math.PI / 2} />
        <Lightformer form="ring" intensity={2.5} color="#ffffff" position={[-3, 3, 7]} scale={1} />
      </Environment>
      <BloomPulse />
      <Driver loop={heroLoop} />
      <PerformanceMonitor flipflops={2} onDecline={() => setMaxDpr(1)} />
    </Canvas>
  );
}
