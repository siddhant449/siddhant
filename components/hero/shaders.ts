import { ditherChunk } from "../dither/ditherChunk";

export const fullscreenVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.999, 1.0);
}
`;

const noise = /* glsl */ `
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * vnoise(p); p *= 2.03; a *= 0.5; }
  return v;
}
`;

/**
 * The ledge photograph: cover-fit around the figure, drifting mist over the valley, and
 * the light on the pillar edge breathing with the bass. Shot on film: the frame weaves a
 * fraction of a pixel, highlights halate orange, shadows lean to the cool sky.
 *
 * On exit (uExit 0 → 1), full screen: the frame pushes in toward the pillar and racks focus
 * to the chrome name while the dark closes in from the edges; the photograph breaks into the
 * dot screen, the dark printing a faint floor of dots so the whole frame dissolves; the dots
 * shrink away from the edges in, and the pillar's light swells into a blade (drawn in CSS over
 * this, at the slit SC.02 opens on). It ends on the page tone exactly: SC.02's first frame.
 */
export const backdropFrag = /* glsl */ `
uniform sampler2D uTex;
uniform vec2 uRes;
uniform float uImgAspect;
uniform vec2 uFocus;
uniform vec2 uMouse;
uniform float uTime;
uniform float uBass;
uniform float uEnergy;
uniform float uExit;
uniform float uReveal;
uniform vec3 uBg;
/** Where the pillar's light stands on screen, as a fraction of the width: the blade and SC.02's slit. */
uniform float uPillar;
varying vec2 vUv;
${noise}

vec2 coverUv(vec2 uv) {
  float sa = uRes.x / uRes.y;
  vec2 s = sa > uImgAspect ? vec2(1.0, uImgAspect / sa) : vec2(sa / uImgAspect, 1.0);
  vec2 c = clamp(uFocus, s * 0.5, 1.0 - s * 0.5);
  // The push: the frame scales up about the pillar, so the light holds still as everything moves toward it.
  vec2 anchor = vec2(uPillar, 0.5);
  uv = anchor + (uv - anchor) * (1.0 - 0.1 * smoothstep(0.0, 0.9, uExit));
  return (uv - 0.5) * s + c;
}

/** The dark closing in from the edges: a tall ellipse of light around the pillar, shrinking to nothing. */
float iris(vec2 uv) {
  vec2 q = (uv - vec2(uPillar, 0.5)) * vec2(uRes.x / uRes.y, 0.42);
  float reach = mix(2.6, 0.02, smoothstep(0.04, 0.8, uExit));
  return 1.0 - smoothstep(reach * 0.35, reach, length(q));
}

/** What the dot screen prints: the darkening photograph over a faint floor, so the dark prints dots too. */
vec3 dotSource(vec2 p) {
  return max(texture2D(uTex, coverUv(p)).rgb * iris(p), vec3(0.085));
}

#define DITHER_SAMPLE(p) dotSource(p)
#define DITHER_SPEC(x) 0.0
${ditherChunk}

float hash1(float n) { return fract(sin(n) * 43758.5453); }

void main() {
  float t = uTime;
  // Gate weave: the whole frame drifts a fraction of a pixel, 24 times a second.
  float frame = floor(t * 24.0);
  vec2 weave = (vec2(hash1(frame), hash1(frame + 7.31)) - 0.5) * 0.0008;
  vec2 uv = coverUv(vUv + weave) + uMouse * vec2(0.006, 0.004);

  // Mist: only where the photo is sky and valley (right of the ledge).
  float skyMask = smoothstep(0.42, 0.62, uv.x) * smoothstep(0.05, 0.45, uv.y);
  vec2 flow = vec2(t * 0.012, 0.0);
  float n = fbm(uv * vec2(3.0, 5.0) + flow);
  vec2 warp = (vec2(fbm(uv * 4.0 + flow * 1.7), fbm(uv * 4.0 - flow)) - 0.5) * 0.012 * skyMask;

  // Rack focus: the photograph softens (mip bias) while the chrome name stays sharp.
  float blur = smoothstep(0.04, 0.35, uExit) * 3.5;
  vec3 col = texture2D(uTex, uv + warp, blur).rgb;

  float fogBand = smoothstep(0.55, 0.22, uv.y) * smoothstep(0.38, 0.7, uv.x);
  col += vec3(0.62, 0.58, 0.52) * fogBand * pow(n, 2.6) * (0.07 + uEnergy * 0.3);

  // The key light on the pillar edge, with orange (never red) halation around it.
  float edge = exp(-abs(uv.x - 0.168) * 120.0) * smoothstep(0.32, 0.5, uv.y);
  float halo = exp(-abs(uv.x - 0.168) * 14.0) * smoothstep(0.25, 0.75, uv.y);
  vec3 ember = vec3(0.92, 0.66, 0.42);
  col += ember * edge * (0.3 + uBass * 0.5) + vec3(1.0, 0.45, 0.2) * halo * (0.05 + uBass * 0.08);

  // Grade: crush the floor; warm light, cool shadow.
  col = max(col - 0.012, 0.0) * 1.04;
  col = pow(col, vec3(1.32));
  float l = dot(col, vec3(0.299, 0.587, 0.114));
  col *= mix(vec3(0.9, 0.96, 1.1), vec3(1.04, 1.0, 0.94), smoothstep(0.05, 0.5, l));
  float vig = smoothstep(1.25, 0.25, length((vUv - vec2(0.5, 0.55)) * vec2(1.25, 1.0)));
  col *= mix(0.35, 1.0, vig);

  // Exit, 1: the dark closes in from the edges toward the pillar.
  float e = uExit;
  col = mix(uBg, col, iris(vUv));

  // Exit, 2: the photograph breaks into the dot screen, and the dots shrink away from the edges in.
  float dmix = smoothstep(0.24, 0.48, e);
  if (dmix > 0.0) {
    vec2 q = (vUv - vec2(uPillar, 0.5)) * vec2(uRes.x / uRes.y, 1.0);
    float grow = 1.0 - smoothstep(0.46, 0.84, e + clamp(length(q) / 1.2, 0.0, 1.0) * 0.14);
    vec4 d = ditherScreen(vUv, uRes.x / uRes.y, uRes.x < 800.0 ? 70.0 : 130.0, vec2(0.5), 0.0, uBass, t, grow);
    // The dots print onto the page's washed black, so the hero ends on the same tone as the next scene.
    col = mix(col, d.rgb + uBg * (1.0 - d.a), dmix);
  }

  // Exit, 3: the pillar's light swells under the blade, then leaves it to the slit.
  float bx = (vUv.x - uPillar) * uRes.x / max(uRes.y, 1.0);
  col += ember * exp(-bx * bx * 40.0) * smoothstep(0.28, 0.55, e) * (1.0 - smoothstep(0.62, 0.92, e)) * 0.16;

  // The photograph fades up out of the page tone, not out of pure black, and ends on it exactly.
  col = mix(uBg, col, uReveal * (1.0 - smoothstep(0.93, 0.99, e)));

  gl_FragColor = vec4(col, 1.0);
}
`;
