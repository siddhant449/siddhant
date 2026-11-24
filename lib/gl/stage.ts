/**
 * One fixed WebGL canvas behind the page. It draws two things, both tied to
 * elements in the DOM by their bounding boxes:
 *
 * - [data-gl="liquid"]: the grainy red wave. data-dir="up" puts the red at the
 *   bottom of the box (rising), otherwise at the top. data-base / data-amp set
 *   where the edge sits and how much it moves; data-rise lets it recede as the
 *   box scrolls away; data-fade="0" keeps the red full at the box's red side.
 * - [data-gl="showcase"] / [data-gl="image"]: planes over the elements. They
 *   travel through a bend field that belongs to the screen (a drum: flat in the
 *   middle, curving away above and below), flex with scroll speed, mute away
 *   from the middle of the screen, and dent softly under the pointer.
 *
 * The DOM keeps normal images as a fallback; once a plane's texture is ready
 * the element gets data-gl-on and CSS hides the fallback.
 */
import {
  CanvasTexture,
  Mesh,
  OrthographicCamera,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  Texture,
  TextureLoader,
  Vector2,
  Vector4,
  WebGLRenderer,
} from "three";

const MAX_LIQUID = 3;

const liquidVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`;

const liquidFrag = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uView;                 // viewport in CSS px
uniform float uTime;
uniform float uIntro;               // 0..1 as the stage fades in
uniform vec4 uRect[${MAX_LIQUID}];  // top, bottom, left, right in CSS px (y down)
uniform vec4 uParam[${MAX_LIQUID}]; // edge (0..1 from the red side), amplitude, progress, active
uniform vec2 uMode[${MAX_LIQUID}];  // x: 1 = red at the bottom; y: 1 = fade the red side in
uniform vec3 uRed;
uniform vec3 uDeep;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }

void main() {
  vec2 px = vec2(vUv.x * uView.x, (1.0 - vUv.y) * uView.y);
  float alpha = 0.0;
  vec3 col = uRed;
  for (int i = 0; i < ${MAX_LIQUID}; i++) {
    vec4 r = uRect[i];
    vec4 q = uParam[i];
    if (q.w < 0.5) continue;
    float h = max(1.0, r.y - r.x);
    float t01 = (px.y - r.x) / h;                       // 0 at the top of the box, 1 at the bottom
    if (t01 < -0.25 || t01 > 1.25) continue;
    float y = uMode[i].x > 0.5 ? 1.0 - t01 : t01;        // measured from the red side
    float x = (px.x - r.z) / max(1.0, r.w - r.z);
    float t = uTime;
    // A slow, layered wave along the edge between red and the page.
    float wave = sin(x * 5.2 + t * 0.35 + q.z * 2.0) * 0.55 + sin(x * 9.7 - t * 0.27) * 0.25 + (fbm(vec2(x * 3.0, t * 0.08)) - 0.5) * 0.9;
    float edge = q.x + q.y * wave;
    float soft = 0.11;
    float red = 1.0 - smoothstep(edge - soft, edge + soft, y);
    red *= mix(1.0, smoothstep(-0.12, 0.22, y), uMode[i].y);   // soften the outer red side
    red *= 1.0 - smoothstep(0.9, 1.02, y);                     // and the far side of the box
    if (red > alpha) {
      alpha = red;
      col = mix(uDeep, uRed, smoothstep(0.0, 1.0, red));
    }
  }
  alpha *= uIntro;
  // Film grain, strongest in the soft band where red meets the page.
  float g = hash(px + fract(uTime * 7.0) * 91.0) - 0.5;
  alpha = clamp(alpha + g * (0.06 + 0.22 * alpha * (1.0 - alpha) * 4.0) * step(0.001, alpha), 0.0, 1.0);
  col += g * 0.05;
  gl_FragColor = vec4(col * alpha, alpha);
}
`;

const planeVert = /* glsl */ `
uniform vec2 uSize;
uniform vec2 uView;     // viewport, CSS px
uniform float uVel;     // smoothed, signed scroll speed, -1..1
uniform float uDepth;   // how far the drum curves away at the screen edges, px
uniform vec2 uMouse;    // pointer in the plane's uv
uniform float uHover;   // 0..1, eased
varying vec2 vUv;
varying float vNy;
varying float vRecede;
varying float vDent;
varying vec2 vDir;

void main() {
  vUv = uv;
  // The deformation belongs to the screen, not to the card: every vertex
  // asks where it is in the viewport, so a card changes shape as it travels.
  vec4 w = modelMatrix * vec4(position * vec3(uSize, 1.0), 1.0);
  float halfH = uView.y * 0.5;
  float ny = clamp(w.y / halfH, -1.8, 1.8);   // 0 in the middle of the screen, ±1 at the edges
  float sp = abs(uVel);

  // A drum: flat in the middle of the screen, curving away above and below.
  float z = -uDepth * ny * ny * (1.0 + 0.6 * sp);

  // A soft dent follows the pointer.
  vec2 du = (uv - uMouse) * vec2(uSize.x / uSize.y, 1.0);
  float dent = exp(-dot(du, du) / 0.0576) * uHover;   // radius 0.24 of the card height
  z -= dent * uSize.y * 0.065;

  // With speed, the middle of each card trails its edges (a smile one way, a frown the other).
  float ex = uv.x * 2.0 - 1.0;
  w.y += uVel * 0.07 * uView.y * 0.5 * (1.0 - ex * ex);

  // Near the top and bottom of the screen the cards wring in opposite directions.
  float a = 0.32 * uVel * smoothstep(0.3, 0.95, abs(ny)) * sign(ny);
  float cy = modelMatrix[3].y;
  float dy = w.y - cy;
  float ca = cos(a), sa = sin(a);
  w.y = cy + dy * ca - z * sa;
  w.z += dy * sa + z * ca;

  vNy = ny;
  vRecede = clamp((uDepth * ny * ny) / (uDepth * 1.4), 0.0, 1.0);
  vDent = dent;
  vDir = du;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`;

const planeFrag = /* glsl */ `
precision highp float;
uniform sampler2D uMap;
uniform vec2 uSize;
uniform float uAspect;   // texture width / height
uniform float uRadius;
uniform float uAlpha;
uniform float uVel;
uniform float uLens;     // 1: only the middle of the screen is in full colour
varying vec2 vUv;
varying float vNy;
varying float vRecede;
varying float vDent;
varying vec2 vDir;

float roundedBox(vec2 p, vec2 b, float r) { vec2 q = abs(p) - b + r; return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r; }

void main() {
  float pa = uSize.x / uSize.y;
  vec2 uv = vUv;
  if (uAspect > pa) uv.x = (uv.x - 0.5) * pa / uAspect + 0.5;
  else uv.y = 1.0 - (1.0 - uv.y) * (uAspect / pa); // keep the top of tall screenshots
  // With speed the picture stretches a touch toward the sides.
  uv.x -= (vUv.x - 0.5) * abs(uVel) * 0.06;
  vec3 c = texture2D(uMap, uv).rgb;
  // Colour lens: full colour in the middle of the screen, muted toward the edges.
  float sat = mix(1.0, mix(0.32, 1.0, smoothstep(0.7, 0.15, abs(vNy))), uLens);
  float g = dot(c, vec3(0.299, 0.587, 0.114));
  c = mix(vec3(g), c, sat);
  // Receding parts fall into shadow.
  c *= 1.0 - 0.5 * pow(vRecede, 1.3);
  // The dent catches light on its upper-left wall and shades the lower-right.
  float lit = dot(normalize(vDir + 1e-5), normalize(vec2(-0.6, 0.7)));
  c *= 1.0 + vDent * (0.16 * lit - 0.06);
  vec2 p = (vUv - 0.5) * uSize;
  float d = roundedBox(p, uSize * 0.5, uRadius);
  float a = (1.0 - smoothstep(-0.75, 0.75, d)) * uAlpha;
  gl_FragColor = vec4(c * a, a);
}
`;

type Plane = {
  el: HTMLElement;
  mesh: Mesh<PlaneGeometry, ShaderMaterial>;
  ready: boolean;
  hover: number;
  mouse: Vector2;
};

/** How far the smooth scroll still has to travel: the source of "speed". */
export type LagSource = () => number;

const optimised = (src: string, w: number) => `/_next/image?url=${encodeURIComponent(src)}&w=${w}&q=75`;

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws an image to fill a box, anchored to its top. */
function drawCover(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.width, h / img.height);
  const sw = w / s;
  const sh = h / s;
  ctx.drawImage(img, (img.width - sw) / 2, 0, sw, sh, x, y, w, h);
}

/** A presentation board: the project's colour, its desktop site, and a phone in front. */
async function showcaseTexture(el: HTMLElement) {
  const W = 1800;
  const H = 900;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const [desk, phone] = await Promise.all([
    loadImage(optimised(el.dataset.desktop ?? "", 1920)),
    loadImage(optimised(el.dataset.mobile ?? "", 828)),
  ]);
  ctx.fillStyle = el.dataset.bg ?? "#1a1a1a";
  ctx.fillRect(0, 0, W, H);
  // A soft light from the top left, so the board reads as a surface.
  const glow = ctx.createRadialGradient(W * 0.3, H * 0.2, 0, W * 0.3, H * 0.2, W * 0.8);
  glow.addColorStop(0, "rgba(255,255,255,0.16)");
  glow.addColorStop(1, "rgba(0,0,0,0.18)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  // Desktop window.
  const dw = W * 0.64;
  const dh = dw * 0.625;
  const dx = W * 0.075;
  const dy = (H - dh) / 2 - H * 0.02;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 24;
  roundRect(ctx, dx, dy, dw, dh, 14);
  ctx.fillStyle = "#111";
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRect(ctx, dx, dy, dw, dh, 14);
  ctx.clip();
  drawCover(ctx, desk, dx, dy, dw, dh);
  ctx.restore();

  // Phone, overlapping the right edge of the desktop.
  const ph = H * 0.86;
  const pw = ph * 0.47;
  const px = W * 0.64;
  const py = (H - ph) / 2 + H * 0.02;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 70;
  ctx.shadowOffsetY = 30;
  roundRect(ctx, px, py, pw, ph, 52);
  ctx.fillStyle = "#0b0b0c";
  ctx.fill();
  ctx.restore();
  const b = 12;
  ctx.save();
  roundRect(ctx, px + b, py + b, pw - b * 2, ph - b * 2, 42);
  ctx.clip();
  drawCover(ctx, phone, px + b, py + b, pw - b * 2, ph - b * 2);
  ctx.restore();
  // Speaker notch.
  roundRect(ctx, px + pw / 2 - 46, py + b + 12, 92, 26, 13);
  ctx.fillStyle = "#0b0b0c";
  ctx.fill();

  const tex = new CanvasTexture(canvas);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, aspect: W / H };
}

export class Stage {
  private renderer: WebGLRenderer;
  private planeScene = new Scene();
  private liquidScene = new Scene();
  private camera = new PerspectiveCamera(42, 1, 10, 10000);
  /** Uniforms every plane shares, so the field is one surface. */
  private field = {
    uView: { value: new Vector2(1, 1) },
    uVel: { value: 0 },
    uDepth: { value: 140 },
  };
  private lag: LagSource = () => 0;
  private flat = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private liquidMat: ShaderMaterial;
  private planes = new Map<HTMLElement, Plane>();
  private liquids: HTMLElement[] = [];
  private loader = new TextureLoader();
  private geometry = new PlaneGeometry(1, 1, 32, 48);
  private w = 0;
  private h = 0;
  private velocity = 0;
  private time = 0;
  private pointer = { x: -1e4, y: -1e4, fine: false };
  private observer: MutationObserver;
  private scanQueued = false;
  private reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  /** Draw only when something changed (for captures and very slow machines). */
  private still: boolean;
  private lastKey = "";
  /** Adaptive quality: if frames run long, the canvas drops to a lower resolution. */
  private slowFrames = 0;
  private dpr = Math.min(1.75, window.devicePixelRatio || 1);

  constructor(private canvas: HTMLCanvasElement, options: { still?: boolean } = {}) {
    this.still = Boolean(options.still);
    this.renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true, powerPreference: "high-performance" });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.autoClear = false;

    this.liquidMat = new ShaderMaterial({
      vertexShader: liquidVert,
      fragmentShader: liquidFrag,
      transparent: true,
      depthTest: false,
      premultipliedAlpha: true,
      uniforms: {
        uView: { value: new Vector2() },
        uTime: { value: 0 },
        uIntro: { value: 0 },
        uRect: { value: Array.from({ length: MAX_LIQUID }, () => new Vector4()) },
        uParam: { value: Array.from({ length: MAX_LIQUID }, () => new Vector4()) },
        uMode: { value: Array.from({ length: MAX_LIQUID }, () => new Vector2()) },
        uRed: { value: [1, 0.227, 0.102] },   // --signal #ff3a1a
        uDeep: { value: [0.431, 0.051, 0.02] }, // --deep #6e0d05
      },
    });
    this.liquidScene.add(new Mesh(new PlaneGeometry(2, 2), this.liquidMat));

    this.resize();
    window.addEventListener("resize", this.resize);
    window.addEventListener("pointermove", this.onPointer, { passive: true });
    this.observer = new MutationObserver(() => this.queueScan());
    this.observer.observe(document.body, { childList: true, subtree: true });
    this.scan();
  }

  private onPointer = (e: PointerEvent) => {
    this.pointer.x = e.clientX;
    this.pointer.y = e.clientY;
    this.pointer.fine = e.pointerType === "mouse";
  };

  private queueScan() {
    if (this.scanQueued) return;
    this.scanQueued = true;
    requestAnimationFrame(() => {
      this.scanQueued = false;
      this.scan();
    });
  }

  private scan() {
    const seen = new Set<HTMLElement>();
    for (const el of document.querySelectorAll<HTMLElement>('[data-gl="image"], [data-gl="showcase"]')) {
      seen.add(el);
      if (!this.planes.has(el)) this.addPlane(el);
    }
    for (const [el, plane] of this.planes) {
      if (seen.has(el)) continue;
      this.planeScene.remove(plane.mesh);
      plane.mesh.material.uniforms.uMap.value?.dispose();
      plane.mesh.material.dispose();
      this.planes.delete(el);
    }
    this.liquids = [...document.querySelectorAll<HTMLElement>('[data-gl="liquid"]')].slice(0, MAX_LIQUID);
  }

  private addPlane(el: HTMLElement) {
    const material = new ShaderMaterial({
      vertexShader: planeVert,
      fragmentShader: planeFrag,
      transparent: true,
      depthTest: false,
      premultipliedAlpha: true,
      uniforms: {
        uMap: { value: null as Texture | null },
        uSize: { value: new Vector2(1, 1) },
        uAspect: { value: 1.6 },
        uRadius: { value: 10 },
        uAlpha: { value: 0 },
        uLens: { value: el.dataset.lens === "0" ? 0 : 1 },
        uMouse: { value: new Vector2(0.5, 0.5) },
        uHover: { value: 0 },
        ...this.field,
      },
    });
    const mesh = new Mesh(this.geometry, material);
    mesh.visible = false;
    this.planeScene.add(mesh);
    const plane: Plane = { el, mesh, ready: false, hover: 0, mouse: new Vector2(0.5, 0.5) };
    this.planes.set(el, plane);

    const done = (tex: Texture, aspect: number) => {
      if (!this.planes.has(el)) return tex.dispose();
      material.uniforms.uMap.value = tex;
      material.uniforms.uAspect.value = aspect;
      plane.ready = true;
      el.dataset.glOn = "";
    };

    if (el.dataset.gl === "showcase") {
      showcaseTexture(el).then(({ tex, aspect }) => done(tex, aspect)).catch(() => {});
    } else {
      const src = el.dataset.src;
      if (!src) return;
      this.loader.load(optimised(src, this.w > 900 ? 1920 : 1080), (tex) => {
        tex.colorSpace = SRGBColorSpace;
        const img = tex.image as HTMLImageElement;
        done(tex, img.width / img.height);
      });
    }
  }

  private resize = () => {
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(this.w, this.h, false);
    this.camera.aspect = this.w / this.h;
    const fov = (this.camera.fov * Math.PI) / 180;
    this.camera.position.set(0, 0, this.h / 2 / Math.tan(fov / 2));
    this.camera.updateProjectionMatrix();
    this.liquidMat.uniforms.uView.value.set(this.w, this.h);
    this.field.uView.value.set(this.w, this.h);
    this.field.uDepth.value = this.h * 0.16;
  };

  /** Lets the stage read how far smooth scrolling lags behind the wheel. */
  setLag(source: LagSource) {
    this.lag = source;
  }

  /** Called once per frame, after smooth scroll has moved the page. */
  render(dt: number) {
    if (!this.still) {
      // Keep the page smooth on weak GPUs: after a run of long frames, render at 1x.
      this.slowFrames = dt > 1 / 32 ? this.slowFrames + 1 : Math.max(0, this.slowFrames - 1);
      if (this.slowFrames > 45 && this.dpr > 1) {
        this.dpr = 1;
        this.slowFrames = 0;
        this.resize();
      }
    } else {
      const ready = [...this.planes.values()].filter((p) => p.ready).length;
      const key = `${Math.round(window.scrollY)}|${this.w}|${this.h}|${ready}|${this.pointer.x},${this.pointer.y}`;
      if (key === this.lastKey) return;
      this.lastKey = key;
      dt = 0;
      this.liquidMat.uniforms.uIntro.value = 1;
      this.time = 4;
    }
    this.time += dt;
    const ease = (k: number) => 1 - Math.pow(1 - k, dt * 60);

    // Speed is how far the smooth scroll lags behind the wheel, squashed to -1..1.
    const lag = this.lag();
    const target = this.reduced ? 0 : Math.sign(lag) * Math.tanh(Math.abs(lag) / 350) ** 2;
    this.velocity += (target - this.velocity) * ease(0.3);
    if (Math.abs(this.velocity) < 1e-4) this.velocity = 0;
    this.field.uVel.value = this.velocity;

    // Liquid boxes.
    const u = this.liquidMat.uniforms;
    u.uIntro.value = Math.min(1, u.uIntro.value + dt / 1.4);
    const rects = u.uRect.value as Vector4[];
    const params = u.uParam.value as Vector4[];
    const modes = u.uMode.value as Vector2[];
    let liquidOn = false;
    for (let i = 0; i < MAX_LIQUID; i++) {
      const el = this.liquids[i];
      if (!el) {
        params[i].w = 0;
        continue;
      }
      const r = el.getBoundingClientRect();
      const visible = r.bottom > -r.height * 0.25 && r.top < this.h + r.height * 0.25;
      params[i].w = visible ? 1 : 0;
      if (!visible) continue;
      liquidOn = true;
      rects[i].set(r.top, r.bottom, r.left, r.right);
      const progress = Math.max(0, Math.min(1, -r.top / Math.max(1, r.height)));
      const base = Number(el.dataset.base ?? 0.5);
      const rise = Number(el.dataset.rise ?? 0);
      params[i].set(base - progress * rise, Number(el.dataset.amp ?? 0.12), progress, 1);
      modes[i].set(el.dataset.dir === "up" ? 1 : 0, el.dataset.fade === "0" ? 0 : 1);
    }
    u.uTime.value = this.time;

    // Planes.
    let planesOn = false;
    const { x: px, y: py, fine } = this.pointer;
    for (const plane of this.planes.values()) {
      const r = plane.el.getBoundingClientRect();
      const visible = plane.ready && r.bottom > -200 && r.top < this.h + 200 && r.width > 0;
      plane.mesh.visible = visible;
      if (!visible) continue;
      planesOn = true;
      const m = plane.mesh.material.uniforms;
      m.uSize.value.set(r.width, r.height);
      m.uRadius.value = Number(plane.el.dataset.radius ?? 10);
      plane.mesh.position.set(r.left + r.width / 2 - this.w / 2, this.h / 2 - (r.top + r.height / 2), 0);
      m.uAlpha.value = this.still ? 1 : Math.min(1, m.uAlpha.value + dt * 2.5);
      // The dent eases in under a fine pointer and settles out when it leaves.
      const inside = fine && !this.reduced && px >= r.left && px <= r.right && py >= r.top && py <= r.bottom;
      if (inside) plane.mouse.lerp(new Vector2((px - r.left) / r.width, 1 - (py - r.top) / r.height), ease(0.35));
      plane.hover += ((inside ? 1 : 0) - plane.hover) * ease(0.08);
      m.uMouse.value.copy(plane.mouse);
      m.uHover.value = plane.hover;
    }

    this.renderer.clear();
    if (liquidOn) this.renderer.render(this.liquidScene, this.flat);
    if (planesOn) this.renderer.render(this.planeScene, this.camera);
  }

  dispose() {
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("pointermove", this.onPointer);
    this.observer.disconnect();
    for (const plane of this.planes.values()) {
      plane.mesh.material.uniforms.uMap.value?.dispose();
      plane.mesh.material.dispose();
    }
    this.geometry.dispose();
    this.liquidMat.dispose();
    this.renderer.dispose();
  }
}
