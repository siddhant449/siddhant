"use client";

import { useEffect, useRef, useState } from "react";

const VERT = `attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}`;

const FRAG = `
precision highp float;
varying vec2 v;
uniform sampler2D T;
uniform float t;
uniform vec2 M;       // pointer, in canvas uv
uniform float H;      // pointer heat, 0..1
uniform vec2 R;       // canvas size, px
uniform float P;      // pour, 0..1: the liquid level rising through the letters
uniform float S;      // melt, 0..1: the letters drip as the hero scrolls away

float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}
float fb(vec2 p){float s=0.,a=.5;for(int i=0;i<5;i++){s+=a*n(p);p*=2.03;a*=.5;}return s;}
float A(vec2 uv){return texture2D(T,vec2(uv.x,1.-uv.y)).a;}

void main(){
  vec2 uv=v;
  // The pointer pushes the liquid outward and heats it.
  vec2 d=uv-M; d.x*=R.x/R.y;
  float push=exp(-dot(d,d)*18.)*H;
  vec2 w=vec2(fb(uv*vec2(3.,5.)+vec2(0.,t*.12)),fb(uv*vec2(4.,3.)-vec2(t*.08,0.)))-.5;
  // Melting: each column drips by its own amount.
  float drip=S*(.35+.65*fb(vec2(uv.x*7.,1.3)))*.3;
  // Push outward with a smooth falloff (no direction flip under the pointer).
  vec2 q=uv+w*(.004+S*.02)+d*push*.07+vec2(0.,drip);
  float a=A(q);
  // Pouring: a liquid level, slightly uneven, rises from the bottom of the letters.
  float lv=P*1.25-.1;
  float level=1.-smoothstep(lv-.02,lv+.02,uv.y+(fb(vec2(uv.x*6.,t*.5))-.5)*.06);
  a*=level;
  // A glow that bleeds mostly downward from the letters.
  float g=0.;
  for(int k=1;k<7;k++){
    float o=float(k)*.006; float wk=1.-float(k)/7.;
    g+=A(q+vec2(0.,o*1.6))*wk; g+=A(q+vec2(o,o*.5))*.5*wk; g+=A(q+vec2(-o,o*.5))*.5*wk;
    g+=A(q+vec2(o*1.2,0.))*.3*wk; g+=A(q+vec2(-o*1.2,0.))*.3*wk;
  }
  g*=.11*level*(1.+S*1.5);
  // Molten colour flowing inside the letters.
  float f=fb(vec2(q.x*2.2,q.y*4.)+vec2(t*.05,-t*.22));
  vec3 deep=vec3(.43,.05,.02), red=vec3(1.,.23,.1), hot=vec3(1.,.72,.42);
  vec3 col=mix(deep,red,smoothstep(.25,.7,f));
  col=mix(col,hot,smoothstep(.62,.9,f)*.55+push*.6);
  float gr=h(v*R+fract(t*7.)*91.)-.5;
  float glow=clamp(g*(1.-a),0.,1.);
  float fade=1.-S*.7;
  vec3 outc=(col*a+red*glow*.6)*fade;
  float alpha=clamp(a+glow*.6+gr*.05*(a+glow),0.,1.)*fade;
  gl_FragColor=vec4(outc+gr*.04*alpha,alpha);
}`;

/**
 * The name, set in WebGL: red liquid flows inside the letters and a glow
 * bleeds beneath them. It pours in on first load, the pointer stirs and heats
 * it, and it drips away as the hero scrolls off. Plain type stands in if
 * WebGL is unavailable.
 */
export function MoltenWordmark({ text, className = "" }: { text: string; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [state, setState] = useState<"init" | "on" | "off">("init");

  useEffect(() => {
    const c = canvas.current;
    const box = wrap.current;
    if (!c || !box) return;
    const el: HTMLCanvasElement = c;
    const gl = c.getContext("webgl", { premultipliedAlpha: true, alpha: true, antialias: false });
    if (!gl) {
      setState("off");
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const seen = document.documentElement.hasAttribute("data-seen");
    const still = new URLSearchParams(window.location.search).has("still");

    const compile = (kind: number, src: string) => {
      const s = gl.createShader(kind)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setState("off");
      return;
    }
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const u = (name: string) => gl.getUniformLocation(prog, name);
    const tex = gl.createTexture();
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    let dpr = Math.min(2, window.devicePixelRatio || 1);
    const family = getComputedStyle(document.documentElement).getPropertyValue("--font-geist").trim() || "sans-serif";

    // Draw the name into a texture that fills the width, inside the gutter.
    const paint = () => {
      const w = box.clientWidth;
      const hgt = box.clientHeight;
      c.width = Math.max(1, Math.round(w * dpr));
      c.height = Math.max(1, Math.round(hgt * dpr));
      gl.viewport(0, 0, c.width, c.height);
      const t = document.createElement("canvas");
      t.width = c.width;
      t.height = c.height;
      const x = t.getContext("2d")!;
      const pad = parseFloat(getComputedStyle(box).paddingLeft) * dpr;
      const avail = c.width - pad * 2;
      const set = (size: number) => {
        x.font = `500 ${size}px ${family}`;
        (x as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = `${-0.06 * size}px`;
      };
      set(100);
      let size = (100 * avail) / x.measureText(text).width;
      set(size);
      size *= avail / x.measureText(text).width;
      set(size);
      x.fillStyle = "#fff";
      x.textBaseline = "alphabetic";
      x.fillText(text, pad, c.height * 0.76);
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform2f(u("R"), c.width, c.height);
    };

    const pointer = { x: 0.5, y: 0.5, heat: 0, tx: 0.5, ty: 0.5, th: 0 };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const r = c.getBoundingClientRect();
      pointer.tx = (e.clientX - r.left) / r.width;
      pointer.ty = 1 - (e.clientY - r.top) / r.height;
      pointer.th = pointer.ty > -0.4 && pointer.ty < 1.4 ? 1 : 0;
    };

    let raf = 0;
    let visible = true;
    let started = 0;
    let last = performance.now();
    let slow = 0;
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !raf) raf = requestAnimationFrame(frame);
    });

    function frame(now: number) {
      raf = 0;
      if (!visible) return;
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // Weak GPU: after a run of long frames, render at 1x.
      slow = dt > 1 / 32 ? slow + 1 : Math.max(0, slow - 1);
      if (slow > 40 && dpr > 1) {
        dpr = 1;
        slow = 0;
        paint();
      }
      const k = 1 - Math.pow(1 - 0.08, dt * 60);
      pointer.x += (pointer.tx - pointer.x) * k;
      pointer.y += (pointer.ty - pointer.y) * k;
      pointer.heat += (pointer.th - pointer.heat) * (1 - Math.pow(1 - 0.05, dt * 60));
      const elapsed = (now - started) / 1000;
      const pourFor = seen ? 0.5 : 1.5;
      const p = reduce || still ? 1 : Math.min(1, elapsed / pourFor);
      const pour = 1 - Math.pow(1 - p, 3);
      const r = el.getBoundingClientRect();
      const melt = reduce ? 0 : Math.max(0, Math.min(1, -r.top / (window.innerHeight * 0.55)));
      gl!.clearColor(0, 0, 0, 0);
      gl!.clear(gl!.COLOR_BUFFER_BIT);
      gl!.uniform1f(u("t"), reduce || still ? 6 : elapsed);
      gl!.uniform2f(u("M"), pointer.x, pointer.y);
      gl!.uniform1f(u("H"), pointer.heat);
      gl!.uniform1f(u("P"), pour);
      gl!.uniform1f(u("S"), melt);
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4);
      if (!still) raf = requestAnimationFrame(frame);
    }

    let disposed = false;
    // Wait for the real face (a fallback would change the fit), but never forever.
    const fontReady = Promise.race([
      (document.fonts?.load(`500 100px ${family}`).then(() => document.fonts.ready) ?? Promise.resolve()).catch(() => undefined),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
    fontReady.then(() => {
      if (disposed) return;
      paint();
      setState("on");
      started = performance.now();
      last = started;
      io.observe(c);
      raf = requestAnimationFrame(frame);
    });
    const ro = new ResizeObserver(() => {
      paint();
      // In still mode nothing redraws on its own, so draw the repainted name once.
      if (still && started) requestAnimationFrame(frame);
    });
    ro.observe(box);
    window.addEventListener("pointermove", onMove, { passive: true });
    if (still) window.addEventListener("scroll", () => requestAnimationFrame(frame), { passive: true });

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      window.removeEventListener("pointermove", onMove);
      gl.deleteTexture(tex);
      gl.deleteBuffer(buf);
      gl.deleteProgram(prog);
    };
  }, [text]);

  return (
    <div ref={wrap} className={`relative aspect-[5/1] px-gutter ${className}`}>
      {/* Plain type: for no WebGL, and if the canvas has not started after a moment. */}
      <span
        aria-hidden
        className={`molten-fallback pointer-events-none absolute inset-x-[var(--m)] top-[16%] block whitespace-nowrap text-[13.9vw] font-medium leading-none tracking-[-0.06em] text-signal ${
          state === "on" ? "hidden" : state === "off" ? "opacity-100" : ""
        }`}
      >
        {text}
      </span>
      <canvas ref={canvas} aria-hidden className={`absolute inset-0 h-full w-full transition-opacity duration-300 ${state === "on" ? "opacity-100" : "opacity-0"}`} />
    </div>
  );
}
