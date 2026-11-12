"use client";

import { useEffect, useRef } from "react";
import { flowState } from "@/lib/flow-state";
import { useIntro } from "@/lib/intro";

/*
  A single fixed canvas behind the page. The hero and the footer are
  transparent and show it; every section between them is opaque, and the
  render loop sleeps while neither end of the page is on screen.

  The image is a set of contour lines over a domain-warped noise field: loose
  and liquid at rest ("polished on the surface"), pulled into straight,
  evenly spaced lines as you scroll ("engineered all the way down"). Around
  the cursor the field twists and the red, green and blue channels separate,
  which is the only place the page shows colour on its own.
*/

const VERT = /* glsl */ `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = /* glsl */ `#version 300 es
precision highp float;

uniform vec2 uRes;
uniform float uTime;
uniform vec2 uMouse;
uniform vec2 uVel;
uniform float uHover;
uniform float uOrder;
uniform float uIntro;

out vec4 outColor;

vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

// 2D simplex noise (Ashima Arts / Stefan Gustavson, MIT).
float snoise(vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 r = mat2(0.8, -0.6, 0.6, 0.8);
  for (int i = 0; i < 3; i++) {
    v += a * snoise(p);
    p = r * p * 2.03;
    a *= 0.5;
  }
  return v;
}

// Anti-aliased line at every integer value of v, about 1.3 device pixels wide.
float contour(float v, float w) {
  float d = abs(fract(v + 0.5) - 0.5);
  return 1.0 - smoothstep(0.35, 1.35, d / max(w, 1e-4));
}

void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uTime;
  vec2 p = uv;

  // Cursor: twist the field around the pointer and drag it along.
  vec2 d = p - uMouse;
  float infl = uHover * exp(-dot(d, d) * 13.0);
  float ang = infl * 0.85;
  float s = sin(ang);
  float c = cos(ang);
  p = uMouse + mat2(c, -s, s, c) * d;
  p -= uVel * infl * 1.4;

  float order = smoothstep(0.0, 1.0, uOrder);

  // Liquid state: one level of domain warping over three-octave noise.
  vec2 q = p * mix(1.18, 1.0, uIntro) * 0.95;
  vec2 w = vec2(
    fbm(q + vec2(0.0, t * 0.05)),
    fbm(q + vec2(5.2, 1.3) - t * 0.04)
  );
  float fluid = fbm(q + 1.35 * w + vec2(t * 0.025, -t * 0.02)) * 0.5 + 0.5;

  // Engineered state: level lines run straight across on a slow carrier wave.
  float straight = p.y * 0.74 + 0.5 + 0.01 * sin(p.x * 2.6 + t * 0.35);

  float f = mix(fluid, straight, order);
  float k = mix(21.0, 28.0, order);
  float v = f * k;
  float fw = fwidth(v);

  // Colour only on contact: split the channels where the cursor is.
  float split = infl * 0.13;
  vec3 lines = vec3(
    contour(v + split, fw),
    contour(v, fw),
    contour(v - split, fw)
  );

  // Every fifth line is an index line, as on a survey map.
  float idx = 1.0 - step(0.5, mod(floor(v + 0.5), 5.0));
  // Fade lines where they bunch up so they never turn into moire.
  float dens = 1.0 - smoothstep(0.22, 0.55, fw);

  float vig = smoothstep(1.25, 0.1, length(uv * vec2(0.72, 1.0)));
  // Quieter behind the reading column on the right of the hero.
  float calm = 1.0 - 0.45 * smoothstep(0.35, 0.0, abs(uv.y + 0.02)) * smoothstep(0.05, 0.45, uv.x);
  float base = mix(0.1, 0.24, idx) * (0.35 + 0.65 * vig) * calm;
  float amt = (base + infl * 0.42) * dens * uIntro;

  // Keep the fringe soft: half the split, half plain chalk.
  lines = mix(vec3(lines.g), lines, 0.55);
  vec3 chalk = vec3(0.925, 0.925, 0.906);
  vec3 col = lines * amt * chalk;

  float g = fract(sin(dot(gl_FragCoord.xy + fract(t) * 91.0, vec2(12.9898, 78.233))) * 43758.5453);
  col += (g - 0.5) * 0.01;

  outColor = vec4(max(col, 0.0), 1.0);
}
`;

function compile(gl: WebGL2RenderingContext, type: number, src: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("[flow-field]", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

export function FlowField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { done: introDone } = useIntro();
  const introDoneRef = useRef(introDone);

  useEffect(() => {
    introDoneRef.current = introDone;
    flowState.listeners.forEach((fn) => fn());
  }, [introDone]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl2", {
      antialias: false,
      alpha: false,
      depth: false,
      stencil: false,
      powerPreference: "high-performance",
    });
    if (!gl) {
      canvas.dataset.fallback = "true";
      return;
    }

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) {
      canvas.dataset.fallback = "true";
      return;
    }
    const program = gl.createProgram()!;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn("[flow-field]", gl.getProgramInfoLog(program));
      canvas.dataset.fallback = "true";
      return;
    }
    gl.useProgram(program);

    // One triangle that covers the screen.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = {
      res: gl.getUniformLocation(program, "uRes"),
      time: gl.getUniformLocation(program, "uTime"),
      mouse: gl.getUniformLocation(program, "uMouse"),
      vel: gl.getUniformLocation(program, "uVel"),
      hover: gl.getUniformLocation(program, "uHover"),
      order: gl.getUniformLocation(program, "uOrder"),
      intro: gl.getUniformLocation(program, "uIntro"),
    };

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    // Keep the pixel budget near 2.6 million so the shader holds 60fps on
    // ordinary laptops; drop it further if frames start running long.
    let quality = 1;
    let width = 0;
    let height = 0;

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      const budget = Math.sqrt(2.6e6 / (width * height));
      const scale = Math.min(window.devicePixelRatio || 1, 2, budget) * quality;
      canvas!.width = Math.round(width * scale);
      canvas!.height = Math.round(height * scale);
      gl!.viewport(0, 0, canvas!.width, canvas!.height);
      gl!.uniform2f(u.res, canvas!.width, canvas!.height);
      if (!running) draw(0);
    }

    // Pointer, in the shader's aspect-corrected space (y up, centred).
    const pointer = { x: 0.35, y: 0.1, tx: 0.35, ty: 0.1, vx: 0, vy: 0, hover: 0, active: 0 };
    let lastMove = 0;

    function onPointerMove(e: PointerEvent) {
      if (reduceMotion) return;
      pointer.tx = (e.clientX - width / 2) / height;
      pointer.ty = -(e.clientY - height / 2) / height;
      pointer.active = e.pointerType === "mouse" ? 1 : 0.75;
      lastMove = performance.now();
    }
    function onPointerLeave() {
      pointer.active = 0;
    }

    let time = 7.3; // start somewhere with an interesting shape
    let order = flowState.heroOrder;
    let intro = 0;
    let raf = 0;
    let running = false;
    let last = 0;
    let slowFrames = 0;

    function draw(dt: number) {
      const visible = flowState.heroVisible || flowState.footerVisible;
      const targetOrder = flowState.footerVisible && !flowState.heroVisible ? 1 : flowState.heroOrder;
      const ease = (rate: number) => 1 - Math.exp(-dt * rate);

      if (reduceMotion) {
        order = targetOrder;
        intro = introDoneRef.current ? 1 : 0;
      } else {
        order += (targetOrder - order) * ease(4);
        const introTarget = introDoneRef.current ? 1 : 0;
        intro += (introTarget - intro) * ease(1.6);
        time += dt;

        // Pointer easing, velocity and presence.
        const px = pointer.x;
        const py = pointer.y;
        pointer.x += (pointer.tx - pointer.x) * ease(7);
        pointer.y += (pointer.ty - pointer.y) * ease(7);
        const vx = dt > 0 ? (pointer.x - px) / dt : 0;
        const vy = dt > 0 ? (pointer.y - py) / dt : 0;
        pointer.vx += (Math.max(-2, Math.min(2, vx)) * 0.06 - pointer.vx) * ease(6);
        pointer.vy += (Math.max(-2, Math.min(2, vy)) * 0.06 - pointer.vy) * ease(6);
        const idle = performance.now() - lastMove > (finePointer ? 4000 : 900);
        const hoverTarget = idle ? 0 : pointer.active;
        pointer.hover += (hoverTarget - pointer.hover) * ease(hoverTarget > pointer.hover ? 3 : 1.2);
      }

      gl!.uniform1f(u.time, time);
      gl!.uniform2f(u.mouse, pointer.x, pointer.y);
      gl!.uniform2f(u.vel, pointer.vx, pointer.vy);
      gl!.uniform1f(u.hover, pointer.hover);
      gl!.uniform1f(u.order, order);
      gl!.uniform1f(u.intro, intro);
      if (visible || !running) gl!.drawArrays(gl!.TRIANGLES, 0, 3);
    }

    function loop(now: number) {
      const dt = last ? Math.min((now - last) / 1000, 1 / 20) : 1 / 60;
      last = now;

      // Adaptive quality: if frames keep running long, render fewer pixels.
      if (dt > 1 / 40) slowFrames++;
      else slowFrames = Math.max(0, slowFrames - 1);
      if (slowFrames > 45 && quality > 0.55) {
        quality *= 0.8;
        slowFrames = 0;
        resize();
      }

      draw(dt);
      const visible = flowState.heroVisible || flowState.footerVisible;
      if (!visible || document.hidden) {
        running = false;
        last = 0;
        return;
      }
      raf = requestAnimationFrame(loop);
    }

    function wake() {
      if (reduceMotion) {
        draw(0);
        return;
      }
      if (running || document.hidden) return;
      if (!(flowState.heroVisible || flowState.footerVisible)) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(loop);
    }

    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    flowState.listeners.add(wake);
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onPointerLeave);

    function onLost(e: Event) {
      e.preventDefault();
      cancelAnimationFrame(raf);
      running = false;
      canvas!.dataset.fallback = "true";
    }
    canvas.addEventListener("webglcontextlost", onLost);

    canvas.dataset.ready = "true";
    wake();

    return () => {
      cancelAnimationFrame(raf);
      running = false;
      ro.disconnect();
      flowState.listeners.delete(wake);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener("pointerleave", onPointerLeave);
      canvas.removeEventListener("webglcontextlost", onLost);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buffer);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 z-0 h-lvh">
      {/* Shown when WebGL is unavailable: a quiet wash instead of lines. */}
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_70%_30%,rgb(236_236_231/0.07),transparent_70%)]" />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full opacity-0 transition-opacity duration-700 data-[fallback=true]:hidden data-[ready=true]:opacity-100"
      />
    </div>
  );
}
