/**
 * The dot screen: an image redrawn as luminance-sized discs on a grid. Bone dots warm to
 * ember where the music is loud, each column listening to one band of the spectrum, with
 * an optional lens that swells the dots under the pointer.
 *
 * Before including, define two macros:
 *   #define DITHER_SAMPLE(uv) <vec3 colour of the source at surface uv 0..1>
 *   #define DITHER_SPEC(x)    <float 0..1 spectrum value for column x 0..1>  (use 0.0 if silent)
 * and optionally a third, which defaults to 0 (no cap):
 *   #define DITHER_MAX_R      <the largest dot radius, in cells: about 0.46 keeps every dot round>
 */
export const ditherChunk = /* glsl */ `
const vec3 DITHER_BONE = vec3(0.925, 0.906, 0.871);
const vec3 DITHER_EMBER = vec3(0.84, 0.63, 0.42);
#ifndef DITHER_MAX_R
#define DITHER_MAX_R 0.0
#endif

// uv: 0..1 across the surface. aspect: surface width / height. cells: dots across.
// lensAt/lensAmt: pointer lens. bass: 0..1. time: seconds. grow: 0..1 scales every dot
// (0 = no dots, 1 = full screen), which lets a scene build or dissolve the image.
// Returns colour premultiplied by coverage in rgb, coverage in a.
vec4 ditherScreen(vec2 uv, float aspect, float cells, vec2 lensAt, float lensAmt, float bass, float time, float grow) {
  vec2 grid = vec2(cells, cells / aspect);
  vec2 cell = floor(uv * grid);
  vec2 center = (cell + 0.5) / grid;
  vec2 local = fract(uv * grid) - 0.5;

  vec3 src = DITHER_SAMPLE(center);
  float lum = dot(src, vec3(0.299, 0.587, 0.114));
  lum = smoothstep(0.015, 0.42, lum);

  float spec = DITHER_SPEC(center.x);
  float breathe = 0.04 * sin(time * 0.8 + center.y * 6.0 + center.x * 3.0);

  vec2 d = (uv - lensAt) * vec2(aspect, 1.0);
  float lens = exp(-dot(d, d) * 18.0) * lensAmt;

  float r = sqrt(lum) * 0.5 * (0.78 + spec * 0.9 + breathe + lens * 0.5);
  r += bass * 0.06 * lum;
  r *= grow;
  if (DITHER_MAX_R > 0.0) r = min(r, DITHER_MAX_R);
  float disc = 1.0 - smoothstep(r - 0.06, r + 0.02, length(local));

  vec3 col = mix(DITHER_BONE * 0.82, DITHER_EMBER, smoothstep(0.25, 0.75, spec) * lum);
  col *= 0.35 + 0.65 * lum;
  return vec4(col * disc, disc);
}
`;

/** Cover-fit: maps surface uv to image uv so the image fills the surface, centred on `focus`. */
export const coverChunk = /* glsl */ `
vec2 coverUv(vec2 uv, float surfaceAspect, float imageAspect, vec2 focus) {
  vec2 s = surfaceAspect > imageAspect ? vec2(1.0, imageAspect / surfaceAspect) : vec2(surfaceAspect / imageAspect, 1.0);
  vec2 c = clamp(focus, s * 0.5, 1.0 - s * 0.5);
  return (uv - 0.5) * s + c;
}
`;

/** A full-screen quad, drawn just in front of the far plane: the vertex stage of every 2D shader here. */
export const fullscreenVert = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.999, 1.0);
}
`;
