/* Living gradient — one shader, four temperaments.
 * 0 Technical      cobalt → spark currents rising through a pillar of light
 * 1 Non-Technical  cyan/teal bands orbiting an off-centre void
 * 2 Fun & Social   warm ember → amber bloom breathing (the only warm light on the site)
 * 3 Daybreak       closing CTA: light rising from a low horizon, folding upward into ink
 */
export const gradVertex = /* glsl */ `
attribute vec2 position;
varying vec2 vUv;
void main() { vUv = position * 0.5 + 0.5; gl_Position = vec4(position, 0.0, 1.0); }
`

export const gradFragment = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime;
uniform float uMode;
uniform float uActive;   // 0 = ember (resting), 1 = alive
uniform float uPillar;   // 1 = vertical pillar falloff (ref-02 peak at mid-height), 0 = full bleed

const vec3 INK = vec3(0.012, 0.024, 0.051);
const vec3 PERI = vec3(0.482, 0.525, 0.910);
const vec3 FROST = vec3(0.910, 0.945, 1.000);

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = p * 2.02 + 11.7; a *= 0.5; } return v; }

vec3 technical(vec2 uv, vec2 p, float t) {
  float w = fbm(vec2(p.x * 2.4, p.y * 0.7 - t * 0.12));
  float w2 = fbm(vec2(p.x * 5.0 + w, p.y * 1.4 - t * 0.2));
  float c = smoothstep(0.25, 0.85, w * 0.7 + w2 * 0.5);
  vec3 col = mix(vec3(0.0, 0.18, 0.62), vec3(0.0, 0.341, 1.0), c);
  col = mix(col, vec3(0.102, 0.624, 0.910), smoothstep(0.55, 0.95, c));
  col = mix(col, FROST, smoothstep(0.82, 1.0, c) * 0.55);
  return col;
}
vec3 nontech(vec2 uv, vec2 p, float t) {
  vec2 c = vec2(0.08 * sin(t * 0.2), -0.05 + 0.06 * cos(t * 0.17));
  vec2 q = p - c;
  float a = 0.5 + 0.25 * sin(t * 0.1);
  q = mat2(cos(a), -sin(a), sin(a), cos(a)) * q;
  float r = length(q * vec2(1.0, 1.8));
  float warp = fbm(p * 2.0 + t * 0.05) * 0.18;
  float bands = 0.5 + 0.5 * sin((r + warp) * 22.0 - t * 0.9);
  vec3 col = mix(vec3(0.0, 0.42, 0.78), vec3(0.0, 0.70, 1.0), smoothstep(0.2, 0.8, bands));
  col = mix(col, vec3(0.17, 0.94, 0.82), smoothstep(0.62, 0.98, bands));
  float voidMask = smoothstep(0.14, 0.24, r);
  return mix(vec3(0.02, 0.06, 0.18), col, voidMask);
}
vec3 fun(vec2 uv, vec2 p, float t) {
  float breathe = 0.04 * sin(t * 0.6);
  float w = fbm(p * 1.6 + vec2(t * 0.06, -t * 0.04));
  float d = length((p - vec2(0.0, 0.32)) * vec2(0.8, 1.15)) + (w - 0.5) * 0.35 - breathe;
  vec3 amber = vec3(1.0, 0.77, 0.42);
  vec3 ember = vec3(1.0, 0.353, 0.235);
  vec3 col = mix(amber, ember, smoothstep(0.05, 0.55, d));
  col = mix(col, vec3(0.55, 0.12, 0.12), smoothstep(0.55, 0.95, d));
  col = mix(col, vec3(1.0, 0.95, 0.85), smoothstep(0.18, 0.0, d) * 0.5);
  return col;
}
vec3 daybreak(vec2 uv, vec2 p, float t) {
  float w = fbm(vec2(p.x * 1.4, p.y * 0.8) + vec2(t * 0.03, -t * 0.05));
  float w2 = fbm(vec2(p.x * 3.0, p.y * 1.6) + w * 1.3 - t * 0.04);
  float h = uv.y + (w - 0.5) * 0.45 + (w2 - 0.5) * 0.15 - 0.06 * sin(p.x * 2.0 + t * 0.2);
  vec3 col = mix(FROST, vec3(0.62, 0.86, 1.0), smoothstep(0.0, 0.2, h));
  col = mix(col, vec3(0.102, 0.624, 0.910), smoothstep(0.12, 0.42, h));
  col = mix(col, vec3(0.0, 0.341, 1.0), smoothstep(0.38, 0.66, h));
  col = mix(col, INK, smoothstep(0.62, 1.0, h));
  return col;
}

void main() {
  vec2 uv = vUv;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float t = uTime;
  vec3 col;
  if (uMode < 0.5) col = technical(uv, p, t);
  else if (uMode < 1.5) col = nontech(uv, p, t);
  else if (uMode < 2.5) col = fun(uv, p, t);
  else col = daybreak(uv, p, t);

  // resting: the light cools to a dim periwinkle ember
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  vec3 ember = mix(INK, PERI * 0.55, lum * 0.8);
  col = mix(ember, col, uActive);

  // ref-02 pillar: brightest at mid-height, sinking to ink at top and bottom; soft side edges
  if (uPillar > 0.5) {
    float v = exp(-pow((uv.y - 0.52) * 2.15, 2.0) * 1.35);
    float s = smoothstep(0.0, 0.22, uv.x) * smoothstep(1.0, 0.78, uv.x);
    col = mix(INK, col, v * mix(0.55, 1.0, s));
  }

  float g = hash(gl_FragCoord.xy + fract(t * 7.13) * 91.0) - 0.5;
  col += g * (0.035 + 0.06 * lum);
  gl_FragColor = vec4(max(col, 0.0), 1.0);
}
`
