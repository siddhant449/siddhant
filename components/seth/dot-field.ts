/**
 * One WebGL2 dot field shared by the Seth hero and footer.
 *
 * sethlukin.com renders video and a liquid marble as a fine dot grid. Here a scene is drawn into a
 * buffer with one texel per grid cell, then a second pass draws each cell as a round dot in the
 * cell's colour. Two scenes:
 *   - "marble":   a real marble texture pulled through a slow domain warp (hero)
 *   - "swimmers": two molten bodies textured by a real lava photograph (footer)
 *
 * Only one context and one loop ever exist: the canvas is moved into whichever registered host is
 * most visible, and the loop stops when no host is visible or the tab is hidden.
 */

export type SceneKind = "marble" | "swimmers";

type Host = {
  /** where the canvas goes and pointer coordinates are measured */
  el: HTMLElement;
  /** what decides visibility (a fixed or sticky host can look visible while it is covered) */
  watch: HTMLElement;
  kind: SceneKind;
  ratio: number;
  ptr: { x: number; y: number; tx: number; ty: number; s: number; on: boolean; last: number };
  time: number;
  swimmers?: Swimmer[];
  fallback: () => void;
};

const N = 24;
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

const FS_SWIM = `#version 300 es
precision highp float;
uniform vec2 uView; uniform float uPitch, uTime, uHas;
uniform vec3 uA[${N}]; uniform vec3 uB[${N}]; uniform sampler2D uTex;
out vec4 o;
${NOISE}
vec2 field(vec2 p, vec3 q[${N}]){
  float f=0., s=0., w=0.;
  for(int i=0;i<${N};i++){ vec2 d=p-q[i].xy; float r=q[i].z; float k=exp(-dot(d,d)/(r*r)); f+=k; s+=k*float(i)/${N - 1}.; w+=k; }
  return vec2(f, w>1e-4 ? s/w : 1.);
}
vec3 ramp(float t){
  vec3 ink=vec3(.059,.043,.039), deep=vec3(.431,.051,.02), red=vec3(1.,.227,.102), hot=vec3(1.,.55,.36), paper=vec3(.965,.937,.929);
  if(t<.25) return mix(ink,deep,t/.25);
  if(t<.5)  return mix(deep,red,(t-.25)/.25);
  if(t<.75) return mix(red,hot,(t-.5)/.25);
  return mix(hot,paper,(t-.75)/.25);
}
void main(){
  vec2 q = gl_FragCoord.xy*uPitch; vec2 p = vec2(q.x, uView.y-q.y);
  float sc = uView.x/1440., t = uTime;
  vec2 w = vec2(fbm(p*.006/sc + vec2(t*.15,0.)), fbm(p*.006/sc + vec2(5.2,-t*.13)));
  vec2 pw = p + (w-.5)*90.*sc;
  vec2 a = field(pw, uA), b = field(pw, uB);
  vec3 col = vec3(0.);
  for(int k=0;k<2;k++){
    vec2 fs = k==0 ? a : b;
    float m = smoothstep(.22,1.2,fs.x);
    float grain = fbm(pw*.018/sc + vec2(0.,-t*.6) + float(k)*11.);
    vec2 luv = pw/(760.*sc) + vec2(t*.018 + float(k)*.37, -t*.011 + float(k)*.21) + (w-.5)*.08;
    vec3 lv = texture(uTex, luv).rgb;
    float L = dot(lv, vec3(.5,.42,.08));
    float lavaHeat = mix(grain, smoothstep(.08,.85,L), uHas);
    float heat = clamp(m*(.3 + 1.0*lavaHeat)*(1.15-.55*fs.y) + (grain-.5)*.2, 0., 1.);
    vec3 c = ramp(heat);
    float fin = smoothstep(.55,.95,fs.y)*smoothstep(.45,.7,grain);
    c = mix(c, vec3(.769,.718,.706)*m, fin*.55);
    col = max(col, c*m);
  }
  o = vec4(col,1.);
}`;

const FS_DOTS = `#version 300 es
precision highp float;
uniform sampler2D uTex; uniform float uPitch, uDpr, uR, uLo;
out vec4 o;
void main(){
  vec2 css = gl_FragCoord.xy/uDpr; vec2 cell = floor(css/uPitch);
  vec3 s = texelFetch(uTex, ivec2(cell), 0).rgb;
  float d = length(css-(cell+.5)*uPitch), r = uPitch*uR;
  float lum = dot(s, vec3(.3,.59,.11));
  float a = smoothstep(r+1./uDpr, r-1./uDpr, d) * smoothstep(uLo, uLo*3., lum);
  vec3 bg = vec3(.059,.043,.039);
  o = vec4(mix(bg, max(bg, s*1.08), a), 1.);
}`;

/* ------------------------------------------------------------------ */
/* Swimmers: a head that wanders its region (and comes to the pointer), a trailing body */
/* ------------------------------------------------------------------ */

class Swimmer {
  pts: [number, number][] = [];
  v: [number, number] = [0, 0];
  cx = 0;
  cy = 0;
  r = 0;
  constructor(
    private hx: [number, number],
    private hy: [number, number],
    private rx: number,
    private ry: number,
    private R: number,
    private phase: number,
    private follow: [number, number, number],
  ) {}
  place(W: number, H: number) {
    const phone = W <= 720;
    this.cx = (phone ? this.hx[1] : this.hx[0]) * W;
    this.cy = (phone ? this.hy[1] : this.hy[0]) * H;
    this.r = phone ? this.R * 0.62 : (this.R * W) / 1440;
    if (!this.pts.length) for (let i = 0; i < N; i++) this.pts.push([this.cx - i * 6, this.cy]);
  }
  step(dt: number, t: number, W: number, H: number, ptr: Host["ptr"]) {
    const k = this.phase, sx = this.rx * W, sy = this.ry * H;
    let tx = this.cx + sx * (Math.sin(t * 0.23 + k) + 0.35 * Math.sin(t * 0.61 + k * 2.1));
    let ty = this.cy + sy * (Math.sin(t * 0.19 + k * 1.3) + 0.35 * Math.cos(t * 0.47 + k));
    if (ptr.on) {
      const f = this.follow;
      tx += (ptr.tx + f[0] * this.r - tx) * f[2];
      ty += (ptr.ty + f[1] * this.r - ty) * f[2];
    }
    const h = this.pts[0];
    this.v[0] += (tx - h[0]) * 2.2 * dt;
    this.v[1] += (ty - h[1]) * 2.2 * dt;
    const damp = Math.exp(-1.9 * dt);
    this.v[0] *= damp;
    this.v[1] *= damp;
    const sp = Math.hypot(this.v[0], this.v[1]), max = this.r * 5;
    if (sp > max) {
      this.v[0] *= max / sp;
      this.v[1] *= max / sp;
    }
    h[0] += this.v[0] * dt;
    h[1] += this.v[1] * dt;
    const seg = this.r * 0.36;
    for (let i = 1; i < N; i++) {
      const a = this.pts[i - 1], b = this.pts[i];
      const dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy) || 1;
      const pull = d > seg ? 1 : Math.min(1, dt * 9);
      b[0] += (a[0] + (dx / d) * seg - b[0]) * pull;
      b[1] += (a[1] + (dy / d) * seg - b[1]) * pull;
    }
  }
  write(out: Float32Array, t: number) {
    for (let i = 0; i < N; i++) {
      const u = i / (N - 1), a = this.pts[Math.max(0, i - 1)], b = this.pts[Math.min(N - 1, i + 1)];
      let dx = b[0] - a[0], dy = b[1] - a[1];
      const d = Math.hypot(dx, dy) || 1;
      dx /= d;
      dy /= d;
      const wave = Math.sin(t * 3.4 - i * 0.38 + this.phase) * this.r * 0.9 * u * u;
      const body = (0.3 + 0.55 * Math.sin(Math.PI * Math.min(1, u * 1.8))) * (1 - 0.5 * u);
      const fin = 1.15 * Math.pow(Math.max(0, (u - 0.55) / 0.45), 1.6);
      out[i * 3] = this.pts[i][0] - dy * wave;
      out[i * 3 + 1] = this.pts[i][1] + dx * wave;
      out[i * 3 + 2] = this.r * (body + fin);
    }
  }
}

const makeSwimmers = () => [
  // desktop homes follow the reference: one low-left, one high-right
  new Swimmer([0.22, 0.32], [0.7, 0.74], 0.07, 0.1, 74, 0, [-1.2, 0.4, 0.5]),
  new Swimmer([0.79, 0.74], [0.26, 0.17], 0.07, 0.11, 70, 2.4, [1.4, -0.8, 0.35]),
];

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
  has: Record<SceneKind, number> = { marble: 0, swimmers: 0 };
  W = 0;
  H = 0;
  pitch = 7;
  cols = 0;
  rows = 0;
  A = new Float32Array(N * 3);
  B = new Float32Array(N * 3);

  constructor(gl: WebGL2RenderingContext, canvas: HTMLCanvasElement) {
    this.gl = gl;
    this.canvas = canvas;
    this.progs = { marble: this.prog(FS_MARBLE), swimmers: this.prog(FS_SWIM), dots: this.prog(FS_DOTS) };
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.cellTex = gl.createTexture()!;
    this.fbo = gl.createFramebuffer()!;
    this.load("marble", "/kit/tex-stone-duo.webp");
    this.load("swimmers", "/seth/lava.jpg");
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
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.MIRRORED_REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.MIRRORED_REPEAT);
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
    if (k === "marble") gl.uniform3f(this.u(k, "uPtr"), host.ptr.x, host.ptr.y, host.ptr.s);
    else if (host.swimmers) {
      host.swimmers[0].write(this.A, host.time);
      host.swimmers[1].write(this.B, host.time);
      gl.uniform3fv(this.u(k, "uA"), this.A);
      gl.uniform3fv(this.u(k, "uB"), this.B);
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
    if (h.kind === "swimmers") {
      if (!h.swimmers) {
        h.swimmers = makeSwimmers();
        h.swimmers.forEach((s) => s.place(r.W, r.H));
        // settle the bodies before the first frame
        for (let i = 0; i < 240; i++) {
          h.time += 1 / 60;
          h.swimmers.forEach((s) => s.step(1 / 60, h.time, r.W, r.H, h.ptr));
        }
      } else h.swimmers.forEach((s) => s.place(r.W, r.H));
    }
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
    h.swimmers?.forEach((s) => s.step(dt, h.time, r.W, r.H, p));
    r.draw(h);
    this.raf = requestAnimationFrame(this.frame);
  };
}

const manager = new Manager();

/**
 * Registers `el` as a host for the shared dot field. Returns a cleanup and a pointer setter.
 * `fallback` runs if WebGL2 is unavailable (show a static treatment instead).
 */
export function attachDotField(el: HTMLElement, kind: SceneKind, fallback: () => void, watch: HTMLElement = el) {
  const host: Host = {
    el,
    watch,
    kind,
    ratio: 0,
    time: kind === "marble" ? 2 : 3,
    ptr: { x: -9999, y: -9999, tx: -9999, ty: -9999, s: 0, on: false, last: 0 },
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
  return { detach: () => manager.remove(host), setPointer };
}
