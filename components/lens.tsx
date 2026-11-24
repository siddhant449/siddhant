"use client";

import { useScroll } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { lens } from "@/lib/content";

const LINES = lens.lines;
const INDENT = [0, 0.14, 0.3];

const vert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const frag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uText;
uniform vec2 uRes;     // CSS px
uniform vec2 uLens;    // CSS px, y down
uniform float uR;      // radius, CSS px
uniform float uTime;

vec4 sampleAt(vec2 p) { return texture2D(uText, vec2(p.x / uRes.x, 1.0 - p.y / uRes.y)); }

void main() {
  vec2 p = vec2(vUv.x * uRes.x, (1.0 - vUv.y) * uRes.y);
  vec2 d = (p - uLens) / max(uR, 1.0);
  float r = length(d);
  vec4 col = sampleAt(p);

  // Soft shadow the glass casts on the page.
  float sh = 1.0 - smoothstep(0.75, 1.45, length(d - vec2(0.0, 0.28)));
  vec4 shadow = vec4(0.0, 0.0, 0.0, sh * 0.16 * step(1.0, r));
  col = col + shadow * (1.0 - col.a);

  if (r < 1.0) {
    float z = sqrt(1.0 - r * r);
    // A ball lens: strong magnification in the middle, squeezed toward the rim.
    float k = mix(0.5, 1.0, pow(r, 2.2));
    vec2 o = d * uR;
    vec4 cr = sampleAt(uLens + o * (k * 0.985));
    vec4 cg = sampleAt(uLens + o * k);
    vec4 cb = sampleAt(uLens + o * (k * 1.015));
    vec4 glass = vec4(cr.r, cg.g, cb.b, max(cg.a, max(cr.a, cb.a)));
    // Tint, rim darkening and a highlight up and to the left.
    float rim = smoothstep(0.72, 1.0, r);
    float hi = smoothstep(0.42, 0.0, length(d - vec2(-0.38, -0.42)));
    float ring = smoothstep(0.86, 0.95, r) * (1.0 - smoothstep(0.95, 1.0, r));
    vec3 c = glass.rgb;
    float a = glass.a;
    // Background through the glass is the page with a faint cool tint.
    vec4 body = vec4(vec3(1.0) * 0.08, 0.08) + vec4(0.0, 0.0, 0.0, rim * 0.18);
    vec4 outc = vec4(c, a) + body * (1.0 - a);
    outc += vec4(vec3(1.0) * (hi * 0.55 + ring * 0.35), hi * 0.55 + ring * 0.35) * (1.0 - z * 0.3);
    float edge = 1.0 - smoothstep(0.985, 1.0, r);
    col = mix(col, outc, edge);
  }
  gl_FragColor = col;
}
`;

/** Paints the statement into a transparent canvas, at device resolution. */
function paintText(w: number, h: number, dpr: number) {
  const c = document.createElement("canvas");
  c.width = Math.round(w * dpr);
  c.height = Math.round(h * dpr);
  const ctx = c.getContext("2d")!;
  ctx.scale(dpr, dpr);
  const styles = getComputedStyle(document.documentElement);
  const family = styles.getPropertyValue("--font-newsreader").trim() || "serif";
  const ink = styles.getPropertyValue("--ink").trim() || "#0f0b0a";
  const size = Math.max(40, Math.min(132, w * 0.078));
  const gutter = Math.max(16, Math.min(56, w * 0.034));
  ctx.font = `italic 300 ${size}px ${family}`;
  ctx.fillStyle = ink;
  ctx.textBaseline = "alphabetic";
  const lineH = size * 1.0;
  const top = h / 2 - (LINES.length * lineH) / 2 + size * 0.78;
  LINES.forEach((line, i) => {
    const x = gutter + (w > 768 ? INDENT[i] * w : 0);
    ctx.fillText(line, x, top + i * lineH);
  });
  return c;
}

/**
 * A pinned runway: while it scrolls past, a glass lens travels across the
 * statement and bends it. The pointer pulls the lens toward it.
 */
export function Lens() {
  const runway = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const { scrollYProgress } = useScroll({ target: runway, offset: ["start start", "end end"] });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let disposed = false;
    let raf = 0;
    let cleanup: (() => void) | undefined;
    const pointer = { x: 0, y: 0, on: false };
    const lensPos = { x: -9999, y: 0 };

    (async () => {
      const probe = document.createElement("canvas");
      if (!probe.getContext("webgl2") && !probe.getContext("webgl")) return;
      await document.fonts?.load(`italic 300 64px ${getComputedStyle(document.documentElement).getPropertyValue("--font-newsreader").trim() || "serif"}`).catch(() => {});
      await document.fonts?.ready;
      const THREE = await import("three");
      if (disposed) return;
      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false, premultipliedAlpha: true });
      renderer.setClearColor(0x000000, 0);
      const scene = new THREE.Scene();
      const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const texture = new THREE.CanvasTexture(document.createElement("canvas"));
      const material = new THREE.ShaderMaterial({
        vertexShader: vert,
        fragmentShader: frag,
        transparent: true,
        premultipliedAlpha: true,
        uniforms: {
          uText: { value: texture },
          uRes: { value: new THREE.Vector2() },
          uLens: { value: new THREE.Vector2() },
          uR: { value: 120 },
          uTime: { value: 0 },
        },
      });
      scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));

      let w = 0;
      let h = 0;
      const resize = () => {
        const r = canvas.getBoundingClientRect();
        w = r.width;
        h = r.height;
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        renderer.setPixelRatio(dpr);
        renderer.setSize(w, h, false);
        texture.image = paintText(w, h, dpr);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.premultiplyAlpha = true;
        texture.needsUpdate = true;
        material.uniforms.uRes.value.set(w, h);
        material.uniforms.uR.value = Math.max(70, Math.min(170, w * 0.11));
      };
      resize();
      window.addEventListener("resize", resize);
      const onMove = (e: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        pointer.x = e.clientX - r.left;
        pointer.y = e.clientY - r.top;
        pointer.on = e.pointerType === "mouse" && pointer.y > 0 && pointer.y < r.height;
      };
      window.addEventListener("pointermove", onMove, { passive: true });
      setReady(true);

      const start = performance.now();
      const tick = () => {
        raf = requestAnimationFrame(tick);
        const rect = canvas.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > window.innerHeight) return;
        const t = (performance.now() - start) / 1000;
        const p = scrollYProgress.get();
        // Scroll carries the lens left to right across the three lines.
        const e = p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
        let tx = -0.12 * w + e * 1.24 * w;
        let ty = h * 0.5 + Math.sin(p * Math.PI * 2.2) * h * 0.13 + Math.sin(t * 0.8) * 6;
        if (pointer.on) {
          tx = tx * 0.35 + pointer.x * 0.65;
          ty = ty * 0.35 + pointer.y * 0.65;
        }
        if (lensPos.x < -9000) {
          lensPos.x = tx;
          lensPos.y = ty;
        }
        lensPos.x += (tx - lensPos.x) * 0.12;
        lensPos.y += (ty - lensPos.y) * 0.12;
        material.uniforms.uLens.value.set(lensPos.x, lensPos.y);
        material.uniforms.uTime.value = t;
        renderer.render(scene, camera);
      };
      tick();

      cleanup = () => {
        window.removeEventListener("resize", resize);
        window.removeEventListener("pointermove", onMove);
        texture.dispose();
        material.dispose();
        renderer.dispose();
      };
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      cleanup?.();
    };
  }, [scrollYProgress]);

  return (
    <section ref={runway} data-theme="paper" aria-label="Approach" className="relative h-[260svh]">
      <div className="sticky top-0 h-svh overflow-hidden">
        <p className="sr-only">{LINES.join(" ")}</p>
        {/* Without WebGL the statement is plain type. */}
        <p
          aria-hidden
          className={`t-it absolute inset-0 flex flex-col justify-center px-gutter text-[clamp(40px,7.8vw,132px)] leading-[1] transition-opacity duration-500 ${ready ? "opacity-0" : "opacity-100"}`}
        >
          {LINES.map((line, i) => (
            <span key={line} className="block" style={{ paddingLeft: `${INDENT[i] * 100}%` }}>
              {line}
            </span>
          ))}
        </p>
        <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />
        <div className="t-label mute absolute inset-x-0 bottom-8 flex justify-between px-gutter">
          <span>{lens.aside}</span>
          <span className="hidden md:block">{lens.note}</span>
        </div>
      </div>
    </section>
  );
}
