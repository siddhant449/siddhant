/**
 * One WebGL2 dot field shared by the Seth hero and footer.
 *
 * sethlukin.com renders video and a liquid marble as a fine dot grid. Here a scene is drawn into a
 * buffer with one texel per grid cell, then a second pass draws each cell as a round dot in the
 * cell's colour. Two scenes:
 *   - "marble":   a real marble texture pulled through a slow domain warp (hero)
 *   - "hands":    the hands from Michelangelo's Creation of Adam, sampled from a public-domain
 *                 photograph of the fresco; the fingertip gap breathes and the pointer ripples it (footer)
 *
 * Only one context and one loop ever exist: the canvas is moved into whichever registered host is
 * most visible, and the loop stops when no host is visible or the tab is hidden.
 */

export type SceneKind = "marble" | "hands";

/** Where the footer wants the hands: the fingertip gap at (x, y), `s` screen px per image px and
 * `tilt` radians (negative lifts the right hand). */
export type HandsLayout = { x: number; y: number; s: number; tilt: number };

type Host = {
  /** where the canvas goes and pointer coordinates are measured */
  el: HTMLElement;
  /** what decides visibility (a fixed or sticky host can look visible while it is covered) */
  watch: HTMLElement;
  kind: SceneKind;
  ratio: number;
  ptr: { x: number; y: number; tx: number; ty: number; s: number; on: boolean; last: number };
  time: number;
  layout?: (W: number, H: number) => HandsLayout;
  place?: HandsLayout;
  fallback: () => void;
};

const VS = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;

const NOISE = `
float h(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(h(i),h(i+vec2(1,0)),f.x), mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x), f.y); }
float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*n(p); p=p*2.02+vec2(17.1,9.3); a*=.5; } return s; }`;

const FS_MARBLE = `#version 300 es
precision highp float;
uniform vec2 uView; uniform float uPitch, uTime, uHas; uniform vec3 uPtr; uniform sampler2D uTex;
out vec4 o;
${NOISE}
void main(){
  vec2 q = gl_FragCoord.xy*uPitch; vec2 p = vec2(q.x, uView.y-q.y); float t = uTime;
  vec2 d = p - uPtr.xy; float r = .22*uView.x; float k = exp(-dot(d,d)/(r*r))*uPtr.z;
  float ang = k*1.6; mat2 R = mat2(cos(ang),-sin(ang),sin(ang),cos(ang));
  vec2 uv = (uPtr.xy + R*d)/uView.x;
  vec2 a = uv*1.35;
  vec2 w1 = vec2(fbm(a + vec2(t*.035, 0.)), fbm(a + vec2(5.2, -t*.03)));
  vec2 w2 = vec2(fbm(a*1.4 + 3.2*w1 + vec2(1.7, 9.2) + t*.02), fbm(a*1.4 + 3.2*w1 + vec2(8.3, 2.8) - t*.018));
  float m = fbm(a*.9 + 2.6*w2);
  vec3 st = texture(uTex, uv*.45 + w2*.35 + vec2(t*.004,0.)).rgb;
  float L = m + (dot(st, vec3(.3,.59,.11)) - .3)*.35*uHas;
  float f = fract(L*3.2 + .15);
  float band = smoothstep(.18,.26,f) * (1. - smoothstep(.62,.70,f));
  float edge = band * (1. - smoothstep(.26,.36,f) * (1. - smoothstep(.52,.62,f)));
  float g = band*.34 + edge*.38;
  g *= .55 + .45*smoothstep(.3,.7, fbm(a*.6 - t*.01));
  float ember = smoothstep(.55,.85, w2.y) * band;
  vec3 stone = vec3(.769,.718,.706), red = vec3(1.,.227,.102), deep = vec3(.431,.051,.02);
  vec3 col = stone*g;
  col = mix(col, mix(deep, red, smoothstep(.65,.95,w2.y))*(g*1.3+.15), ember*.75);
  col += red*k*.18*band;
  o = vec4(col,1.);
}`;

/** public/seth/hands.webp: 1400×420, the two hands on black; the fingertip gap is centred on GAP. */
const HANDS_IMG = [1400, 420] as const;
const HANDS_GAP = [668, 210] as const;

const FS_HANDS = `#version 300 es
precision highp float;
uniform vec2 uView; uniform float uPitch, uTime, uHas; uniform vec3 uPtr; uniform vec4 uPlace;
uniform sampler2D uTex;
out vec4 o;
${NOISE}
const vec2 IMG = vec2(${HANDS_IMG[0]}., ${HANDS_IMG[1]}.), GAP = vec2(${HANDS_GAP[0]}., ${HANDS_GAP[1]}.);
const float TAU = 6.2831853;
vec3 ramp(float t){
  vec3 ink=vec3(.059,.043,.039), deep=vec3(.431,.051,.02), red=vec3(1.,.227,.102), hot=vec3(1.,.55,.36), paper=vec3(.965,.937,.929);
  if(t<.3) return mix(ink,deep,t/.3);
  if(t<.62) return mix(deep,red,(t-.3)/.32);
  if(t<.88) return mix(red,hot,(t-.62)/.26);
  return mix(hot,paper,min(1.,(t-.88)/.12));
}
// one hand: side -1 is Adam's (left of the gap), +1 is God's; loc is in image px around the gap.
// The texture is the cut-out hands on pure black, so v is 0 everywhere off the skin.
float hand(vec2 loc, float side, vec2 off, float lod, out float along){
  vec2 uv = loc - off + GAP;
  along = abs(uv.x - GAP.x)/IMG.x;
  // sample unconditionally at a fixed LOD (no derivatives), then mask: branching around texture()
  // left straight lines of stray dots along the cut and the image edges
  float v = textureLod(uTex, uv/IMG, lod).r;
  float inside = step(0., uv.y)*step(uv.y, IMG.y)*step(0., side*(uv.x - GAP.x))*step(0., uv.x)*step(uv.x, IMG.x);
  return v * inside;
}
void main(){
  vec2 q = gl_FragCoord.xy*uPitch; vec2 p = vec2(q.x, uView.y-q.y);
  float t = uTime, s = uPlace.z, ca = cos(uPlace.w), sa = sin(uPlace.w);
  // the gap breathes: both hands ease toward each other along the tilted axis and back over 5.2s
  float b = .5 - .5*cos(t*TAU/5.2);
  vec2 oL = vec2(-21. + b*15., sin(t*.71)*6.5);
  vec2 oR = vec2( 21. - b*14., sin(t*.63 + 1.3)*6.5);
  // pointer: a ripple that pushes the image outward and lifts the dots under it
  vec2 d = p - uPtr.xy; float dist = length(d);
  float R = max(90., .09*uView.x), k = exp(-dist*dist/(R*R))*uPtr.z;
  float wave = sin(dist*.085 - t*5.5);
  vec2 pw = p + (dist > 1. ? d/dist : vec2(0.))*wave*k*9.;
  vec2 rel = (pw - uPlace.xy)/s;
  vec2 loc = vec2(ca*rel.x + sa*rel.y, -sa*rel.x + ca*rel.y);
  float lod = max(0., log2(uPitch/s) - .5);
  float aL, aR;
  float vL = hand(loc, -1., oL, lod, aL), vR = hand(loc, 1., oR, lod, aR);
  float v = max(vL, vR), along = vL > vR ? aL : aR;
  // skin only: below this the cell is off, with no glow
  float on = smoothstep(.1, .16, v);
  // shading (shadowed to lit skin, 0..1) drives dot size and brightness
  float shade = clamp((v - .18)/.82, 0., 1.);
  shade = pow(shade, 1.6);
  // low intensity behind the type, rising to full at the fingertip gap
  float gd = length(loc)*s/uView.x;
  float glow = exp(-gd*gd/(.065*.065)*.5);
  float sweep = pow(.5 + .5*sin(along*TAU*2.4 + t*1.3), 6.);
  float flick = n(p/uPitch*.9 + vec2(t*1.7, -t*1.1));
  float heat = .3 + .34*shade + .42*glow*(.6 + .4*shade) + .08*sweep + .05*(flick - .5) + k*(.3 + .15*wave);
  vec3 col = ramp(clamp(heat, 0., 1.))*on;
  // a spark in the gap itself, strongest as the fingertips close
  float sp = exp(-gd*gd/(.008*.008)*.5)*(.55 + .45*b)*(1. - on);
  col += mix(vec3(.431,.051,.02), vec3(1.,.227,.102), b)*sp;
  // faint rings in the empty ink around the pointer
  col += vec3(.431,.051,.02)*k*smoothstep(.55,1.,wave)*(1. - on)*.9;
  // alpha carries the dot size for the dots pass
  float size = on > 0. ? .42 + .58*shade + .1*sweep : .55;
  o = vec4(col*uHas, clamp(size, 0., 1.));
}`;

const FS_DOTS = `#version 300 es
precision highp float;
uniform sampler2D uTex; uniform float uPitch, uDpr, uR, uLo, uVar;
out vec4 o;
void main(){
  vec2 css = gl_FragCoord.xy/uDpr; vec2 cell = floor(css/uPitch);
  vec4 c = texelFetch(uTex, ivec2(cell), 0); vec3 s = c.rgb;
  float lum = dot(s, vec3(.3,.59,.11));
  // uVar > 0 scales each dot by the size the scene wrote to alpha (a halftone)
  float d = length(css-(cell+.5)*uPitch), r = uPitch*uR*mix(1., c.a, uVar);
  float a = smoothstep(r+1./uDpr, r-1./uDpr, d) * smoothstep(uLo, uLo*3., lum);
  vec3 bg = vec3(.059,.043,.039);
  o = vec4(mix(bg, max(bg, s*1.08), a), 1.);
}`;

/* ------------------------------------------------------------------ */
/* The shared renderer                                                  */
/* ------------------------------------------------------------------ */

class Renderer {
  canvas: HTMLCanvasElement;
  gl: WebGL2RenderingContext;
  progs: Record<SceneKind | "dots", WebGLProgram>;
  uni = new Map<string, WebGLUniformLocation | null>();
  cellTex: WebGLTexture;
  fbo: WebGLFramebuffer;
  tex: Partial<Record<SceneKind, WebGLTexture>> = {};
  has: Record<SceneKind, number> = { marble: 0, hands: 0 };
  W = 0;
  H = 0;
  pitch = 7;
  cols = 0;
  rows = 0;

  constructor(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement) {
    this.gl = gl;
    this.canvas = canvas;
    this.progs = { marble: this.prog(FS_MARBLE), hands: this.prog(FS_HANDS), dots: this.prog(FS_DOTS) };
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.cellTex = gl.createTexture()!;
    this.fbo = gl.createFramebuffer()!;
    this.load("marble", "/kit/tex-stone-duo.webp");
    this.load("hands", "/seth/hands.webp");
  }
  prog(fs: string) {
    const gl = this.gl, p = gl.createProgram()!;
    for (const [type, src] of [[gl.VERTEX_SHADER, VS], [gl.FRAGMENT_SHADER, fs]] as const) {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) ?? "shader");
      gl.attachShader(p, s);
    }
    gl.bindAttribLocation(p, 0, "p");
    gl.linkProgram(p);
    return p;
  }
  u(kind: SceneKind | "dots", name: string) {
    const key = kind + name;
    if (!this.uni.has(key)) this.uni.set(key, this.gl.getUniformLocation(this.progs[kind], name));
    return this.uni.get(key)!;
  }
  load(kind: SceneKind, src: string) {
    const img = new Image();
    img.onload = () => {
      const gl = this.gl, t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);
      const wrap = kind === "hands" ? gl.CLAMP_TO_EDGE : gl.MIRRORED_REPEAT;
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrap);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrap);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      this.tex[kind] = t;
      this.has[kind] = 1;
      manager.redraw();
    };
    img.src = src;
  }
  resize(W: number, H: number, kind: SceneKind) {
    const gl = this.gl, phone = W <= 720;
    const dpr = Math.min(window.devicePixelRatio || 1, phone ? 1.5 : 2);
    this.W = W;
    this.H = H;
    this.canvas.width = Math.round(W * dpr);
    this.canvas.height = Math.round(H * dpr);
    // measured pitches: 6.5px (hero marble) and 7.5px (footer) at 1440
    this.pitch = kind === "marble" ? (phone ? 5.5 : Math.max(5, (W * 6.5) / 1440)) : phone ? 6 : Math.max(6, (W * 7.5) / 1440);
    this.cols = Math.ceil(W / this.pitch);
    this.rows = Math.ceil(H / this.pitch);
    gl.bindTexture(gl.TEXTURE_2D, this.cellTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, this.cols, this.rows, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.cellTex, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }
  draw(host: Host) {
    const gl = this.gl, k = host.kind;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.viewport(0, 0, this.cols, this.rows);
    gl.useProgram(this.progs[k]);
    gl.uniform2f(this.u(k, "uView"), this.W, this.H);
    gl.uniform1f(this.u(k, "uPitch"), this.pitch);
    gl.uniform1f(this.u(k, "uTime"), host.time);
    gl.uniform1f(this.u(k, "uHas"), this.has[k]);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.tex[k] ?? null);
    gl.uniform1i(this.u(k, "uTex"), 1);
    gl.uniform3f(this.u(k, "uPtr"), host.ptr.x, host.ptr.y, host.ptr.s);
    if (k === "hands") {
      const pl = host.place ?? { x: this.W / 2, y: this.H / 2, s: this.W / HANDS_IMG[0], tilt: 0 };
      gl.uniform4f(this.u(k, "uPlace"), pl.x, pl.y, pl.s, pl.tilt);
    }
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.progs.dots);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.cellTex);
    gl.uniform1i(this.u("dots", "uTex"), 0);
    gl.uniform1f(this.u("dots", "uPitch"), this.pitch);
    gl.uniform1f(this.u("dots", "uDpr"), this.canvas.width / this.W);
    gl.uniform1f(this.u("dots", "uR"), k === "marble" ? 0.27 : 0.31);
    gl.uniform1f(this.u("dots", "uVar"), k === "marble" ? 0 : 1);
    gl.uniform1f(this.u("dots", "uLo"), k === "marble" ? 0.02 : 0.015);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  dispose() {
    this.gl.getExtension("WEBGL_lose_context")?.loseContext();
    this.canvas.remove();
  }
}

class Manager {
  hosts = new Set<Host>();
  r: Renderer | null = null;
  failed = false;
  active: Host | null = null;
  raf = 0;
  last = 0;
  io: IntersectionObserver | null = null;
  ro: ResizeObserver | null = null;
  reduce = false;

  ensure() {
    if (this.r || this.failed) return;
    const canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none";
    const gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance" });
    if (!gl) {
      this.failed = true;
      return;
    }
    try {
      this.r = new Renderer(gl, canvas);
    } catch {
      this.failed = true;
      return;
    }
    this.reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const h = [...this.hosts].find((x) => x.watch === e.target);
          if (h) h.ratio = e.isIntersecting ? e.intersectionRatio : 0;
        }
        this.pick();
      },
      { threshold: [0, 0.01, 0.1, 0.25, 0.5, 0.75, 1] },
    );
    this.ro = new ResizeObserver(() => this.layout());
    document.addEventListener("visibilitychange", this.onVis);
  }
  onVis = () => {
    if (document.hidden) this.stop();
    else this.pick();
  };
  add(h: Host) {
    this.ensure();
    if (this.failed) {
      h.fallback();
      return;
    }
    this.hosts.add(h);
    this.io!.observe(h.watch);
    this.ro!.observe(h.el);
  }
  remove(h: Host) {
    this.hosts.delete(h);
    this.io?.unobserve(h.watch);
    this.ro?.unobserve(h.el);
    if (this.active === h) {
      this.active = null;
      this.stop();
    }
    if (!this.hosts.size && this.r) {
      this.stop();
      this.io?.disconnect();
      this.ro?.disconnect();
      document.removeEventListener("visibilitychange", this.onVis);
      this.r.dispose();
      this.r = null;
      this.io = null;
      this.ro = null;
    }
  }
  pick() {
    let best: Host | null = null;
    for (const h of this.hosts) if (h.ratio > 0 && (!best || h.ratio > best.ratio)) best = h;
    if (best !== this.active) {
      this.active = best;
      if (best && this.r) {
        best.el.prepend(this.r.canvas);
        this.layout();
      }
    }
    if (this.active && !document.hidden) this.start();
    else this.stop();
  }
  layout() {
    const h = this.active, r = this.r;
    if (!h || !r) return;
    const rect = h.el.getBoundingClientRect();
    r.resize(Math.round(rect.width), Math.round(rect.height), h.kind);
    if (h.layout) h.place = h.layout(r.W, r.H);
    r.draw(h);
  }
  redraw() {
    if (this.active && this.r) this.r.draw(this.active);
  }
  start() {
    if (this.reduce) {
      this.redraw();
      return;
    }
    if (!this.raf) {
      this.last = 0;
      this.raf = requestAnimationFrame(this.frame);
    }
  }
  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
  frame = (now: number) => {
    this.raf = 0;
    const h = this.active, r = this.r;
    if (!h || !r) return;
    const dt = Math.min(0.05, (now - (this.last || now)) / 1000);
    this.last = now;
    h.time += dt;
    const p = h.ptr;
    if (p.on && now - p.last > 4000 && window.matchMedia("(hover: none)").matches) p.on = false;
    p.x += (p.tx - p.x) * Math.min(1, dt * 6);
    p.y += (p.ty - p.y) * Math.min(1, dt * 6);
    p.s += ((p.on ? 1 : 0) - p.s) * Math.min(1, dt * 2.5);
    r.draw(h);
    this.raf = requestAnimationFrame(this.frame);
  };
}

const manager = new Manager();

/**
 * Registers `el` as a host for the shared dot field. Returns a cleanup and a pointer setter.
 * `fallback` runs if WebGL2 is unavailable (show a static treatment instead).
 */
export function attachDotField(
  el: HTMLElement,
  kind: SceneKind,
  fallback: () => void,
  watch: HTMLElement = el,
  layout?: (W: number, H: number) => HandsLayout,
) {
  const host: Host = {
    el,
    watch,
    kind,
    ratio: 0,
    // the hands open on a near-touch, which is also the still frame under reduced motion
    time: kind === "marble" ? 2 : 2.9,
    ptr: { x: -9999, y: -9999, tx: -9999, ty: -9999, s: 0, on: false, last: 0 },
    layout,
    fallback,
  };
  manager.add(host);
  const setPointer = (clientX: number, clientY: number, on: boolean) => {
    const r = el.getBoundingClientRect();
    host.ptr.tx = clientX - r.left;
    host.ptr.ty = clientY - r.top;
    if (!host.ptr.on && on) {
      host.ptr.x = host.ptr.tx;
      host.ptr.y = host.ptr.ty;
    }
    host.ptr.on = on;
    host.ptr.last = performance.now();
  };
  /** re-run `layout` (e.g. after the footer's type has been fitted) */
  const relayout = () => {
    if (manager.active === host) manager.layout();
  };
  return { detach: () => manager.remove(host), setPointer, relayout };
}
