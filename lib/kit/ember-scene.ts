/**
 * The ember: a cooling molten body. Dark glossy crust, heat in the seams in the brand's
 * violet signal, lit by Poly Haven's "Studio Small 09" (CC0), stored in /kit/hdri-studio.webp as
 * y = (x / (1 + x))^(1/2.2) so it can be served as an 8-bit image (lossless WebP, 256 × 128:
 * the clearcoat's sharpest reflection samples the environment at about a 90px cube face, so a
 * larger map renders the same; it was downsampled in linear radiance). Loaded on demand by <Ember>.
 */
import {
  ACESFilmicToneMapping,
  BufferAttribute,
  BufferGeometry,
  Color,
  DataTexture,
  DataUtils,
  DirectionalLight,
  EquirectangularReflectionMapping,
  HalfFloatType,
  IcosahedronGeometry,
  LinearFilter,
  LinearSRGBColorSpace,
  Mesh,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PMREMGenerator,
  RGBAFormat,
  Scene,
  SRGBColorSpace,
  WebGLRenderer,
  type Texture,
} from "three";

const NOISE = /* glsl */ `
vec4 kperm(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 ktis(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
  i = mod(i, 289.0);
  vec4 p = kperm(kperm(kperm(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = ktis(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}
float kdisp(vec3 p, float t){
  return snoise(p * 0.95 + vec3(0.0, t * 0.13, t * 0.05)) * 0.26 + snoise(p * 2.1 - vec3(t * 0.09)) * 0.035;
}
`;

async function loadEnv(renderer: WebGLRenderer, url: string): Promise<Texture> {
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image();
    i.decoding = "async";
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = url;
  });
  const c = document.createElement("canvas");
  c.width = img.width;
  c.height = img.height;
  const g = c.getContext("2d", { willReadFrequently: true });
  if (!g) throw new Error("no 2d context");
  g.drawImage(img, 0, 0);
  const px = g.getImageData(0, 0, c.width, c.height).data;
  const data = new Uint16Array(c.width * c.height * 4);
  const one = DataUtils.toHalfFloat(1);
  for (let i = 0; i < px.length; i += 4) {
    for (let k = 0; k < 3; k++) {
      const cc = Math.min(0.9985, Math.pow(px[i + k] / 255, 2.2));
      data[i + k] = DataUtils.toHalfFloat(cc / (1 - cc));
    }
    data[i + 3] = one;
  }
  const tex = new DataTexture(data, c.width, c.height, RGBAFormat, HalfFloatType);
  tex.flipY = true;
  tex.mapping = EquirectangularReflectionMapping;
  tex.colorSpace = LinearSRGBColorSpace;
  tex.magFilter = LinearFilter;
  tex.minFilter = LinearFilter;
  tex.needsUpdate = true;
  const pm = new PMREMGenerator(renderer);
  const env = pm.fromEquirectangular(tex).texture;
  tex.dispose();
  pm.dispose();
  return env;
}

/**
 * An icosphere with shared vertices. three's IcosahedronGeometry repeats every vertex for each of
 * the (up to six) triangles that meet there, and the displacement runs per vertex (three noise
 * lookups each), so indexing it draws the same surface with about a sixth of the vertex work.
 * Normals of a unit icosphere are its positions; uvs are unused by this material.
 */
function icosphere(detail: number) {
  const src = new IcosahedronGeometry(1, detail);
  const p = src.getAttribute("position");
  const seen = new Map<string, number>();
  const pos: number[] = [];
  const index = new Uint32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const key = `${Math.round(x * 1e5)},${Math.round(y * 1e5)},${Math.round(z * 1e5)}`;
    let k = seen.get(key);
    if (k === undefined) {
      k = pos.length / 3;
      seen.set(key, k);
      pos.push(x, y, z);
    }
    index[i] = k;
  }
  src.dispose();
  const geo = new BufferGeometry();
  const arr = new Float32Array(pos);
  geo.setAttribute("position", new BufferAttribute(arr, 3));
  geo.setAttribute("normal", new BufferAttribute(arr.slice(), 3));
  geo.setIndex(new BufferAttribute(index, 1));
  geo.computeBoundingSphere();
  return geo;
}

export type EmberHandle = { setHeat: (h: number) => void; dispose: () => void };

export function mountEmber(
  host: HTMLElement,
  opts: { heat?: number; still?: boolean; env?: string; onReady?: () => void; watch?: HTMLElement } = {},
): EmberHandle {
  const phone = window.innerWidth < 700;
  // Throws without WebGL; <Ember> keeps its still image then.
  const renderer = new WebGLRenderer({ antialias: !phone, alpha: true, powerPreference: "high-performance" });
  // A physical material with noise in both shaders: 1.5x on desktop and 1.25x on phones look the
  // same at this size and cost about half the fragments of 2x.
  renderer.setPixelRatio(Math.min(phone ? 1.25 : 1.5, window.devicePixelRatio || 1));
  renderer.toneMapping = ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = SRGBColorSpace;
  renderer.domElement.setAttribute("aria-hidden", "true");
  host.appendChild(renderer.domElement);

  const scene = new Scene();
  const camera = new PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0, 6.2);

  const uniforms = { uTime: { value: 8 }, uHeat: { value: opts.heat ?? 1 } };
  const mat = new MeshPhysicalMaterial({
    color: new Color("#1a1723"),
    roughness: 0.34,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.09,
    envMapIntensity: 1,
    ior: 1.5,
    specularIntensity: 0.8,
  });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uniforms.uTime;
    sh.uniforms.uHeat = uniforms.uHeat;
    sh.vertexShader = sh.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;\nvarying vec3 vObj;\nvarying float vDisp;\n" + NOISE)
      .replace("#include <beginnormal_vertex>", `
        vec3 kn = normalize(normal);
        vec3 kt = normalize(abs(kn.y) < 0.99 ? cross(kn, vec3(0.0,1.0,0.0)) : cross(kn, vec3(1.0,0.0,0.0)));
        vec3 kb = cross(kn, kt);
        float ke = 0.012;
        float d0 = kdisp(position, uTime);
        vec3 pA = position + kt * ke; pA += normalize(pA) * kdisp(pA, uTime);
        vec3 pB = position + kb * ke; pB += normalize(pB) * kdisp(pB, uTime);
        vec3 p0 = position + kn * d0;
        vec3 objectNormal = normalize(cross(pA - p0, pB - p0));
        if (dot(objectNormal, kn) < 0.0) objectNormal = -objectNormal;
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3( tangent.xyz );
        #endif`)
      .replace("#include <begin_vertex>", "vec3 transformed = p0; vObj = position; vDisp = d0;");
    sh.fragmentShader = sh.fragmentShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;\nuniform float uHeat;\nvarying vec3 vObj;\nvarying float vDisp;\n" + NOISE)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>
        float kr = abs(snoise(vObj * 3.1 + vec3(uTime * 0.03)));
        float kr2 = abs(snoise(vObj * 6.7 - vec3(uTime * 0.02)));
        float seam = (1.0 - smoothstep(0.0, 0.075, kr)) + 0.45 * (1.0 - smoothstep(0.0, 0.05, kr2));
        float valley = smoothstep(0.02, -0.22, vDisp);
        float heat = clamp(seam * (0.35 + 0.9 * valley) + valley * 0.35, 0.0, 1.6) * uHeat;
        heat *= 0.82 + 0.18 * sin(uTime * 1.3 + vObj.y * 3.0);
        roughnessFactor = mix(roughnessFactor, 0.12, clamp(heat, 0.0, 1.0));`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
        vec3 kDeep = vec3(0.042, 0.019, 0.168);    // #3a2672 linear
        vec3 kSig  = vec3(0.338, 0.201, 1.0);      // #9d7cff linear
        vec3 kHot  = vec3(0.70, 0.60, 1.0);
        vec3 glow = mix(kDeep, kSig, smoothstep(0.0, 0.7, heat));
        glow = mix(glow, kHot, smoothstep(0.85, 1.5, heat));
        totalEmissiveRadiance += glow * heat * 2.4;`);
  };

  const geo = icosphere(phone ? 40 : 64);
  const mesh = new Mesh(geo, mat);
  scene.add(mesh);
  const key = new DirectionalLight(0xe6e0ff, 0.35);
  key.position.set(2, 3, 4);
  scene.add(key);

  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = (e: PointerEvent) => {
    const r = host.getBoundingClientRect();
    ptr.tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    ptr.ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
  };
  const onLeave = () => {
    ptr.tx = 0;
    ptr.ty = 0;
  };
  host.addEventListener("pointermove", onMove);
  host.addEventListener("pointerleave", onLeave);

  let ready = false;
  let on = false;
  let raf = 0;
  let last = 0;
  let t = 8;
  const draw = () => {
    uniforms.uTime.value = t;
    mesh.rotation.y = t * 0.12 + ptr.x * 0.5;
    mesh.rotation.x = Math.sin(t * 0.21) * 0.18 + ptr.y * 0.35;
    renderer.render(scene, camera);
  };
  const frame = (now: number) => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016;
    last = now;
    t += dt;
    ptr.x += (ptr.tx - ptr.x) * 0.05;
    ptr.y += (ptr.ty - ptr.y) * 0.05;
    draw();
    raf = requestAnimationFrame(frame);
  };
  const run = () => {
    cancelAnimationFrame(raf);
    if (!ready) return;
    if (opts.still) {
      draw();
      return;
    }
    if (on && !document.hidden) {
      last = 0;
      raf = requestAnimationFrame(frame);
    }
  };

  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w / h < 0.9 ? (6.2 / Math.max(0.55, w / h)) * 0.9 : 6.2;
    camera.updateProjectionMatrix();
    if (ready && (opts.still || !on)) draw();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  resize();

  // `watch` decides visibility when the host sits in a pinned screen that can be covered.
  const io = new IntersectionObserver(([e]) => {
    on = e.isIntersecting;
    run();
  });
  io.observe(opts.watch ?? host);
  const onVis = () => run();
  document.addEventListener("visibilitychange", onVis);

  let disposed = false;
  loadEnv(renderer, opts.env ?? "/kit/hdri-studio.webp")
    .catch(() => null)
    .then((env) => {
      if (disposed) {
        env?.dispose();
        return;
      }
      if (env) scene.environment = env;
      ready = true;
      draw();
      opts.onReady?.();
      run();
    });

  return {
    setHeat: (h) => {
      uniforms.uHeat.value = h;
      if (opts.still && ready) draw();
    },
    dispose: () => {
      disposed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVis);
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      scene.environment?.dispose();
      geo.dispose();
      mat.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    },
  };
}
