/* The Aperture — one full-screen fragment pass.
 *
 * Two vast dark masses meet in a thin almond of light (a vesica: the intersection of two huge circles).
 * A white-hot point — the spark — sits inside it and bends the space around it (screen-space lensing).
 * Ignition (uIgnite 0→1) is the preloader: point → seam drawn outward → aperture opens.
 * Scroll (uScroll 0→1): aperture parts → blue floods the frame → flood collapses to one vertical line.
 */

export const heroVertex = /* glsl */ `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`

export const heroFragment = /* glsl */ `
precision highp float;

uniform vec2  uRes;
uniform float uTime;
uniform vec2  uPointer;   // eased, -1..1, y up
uniform float uScroll;    // 0..1 pinned scroll progress
uniform float uOrient;    // 0 = landscape (horizontal seam), 1 = portrait (vertical seam)
uniform float uIgnite;    // 0..1 preloader sequence
uniform float uFade;      // 0..1 global fade-in (repeat visits)

const vec3 INK    = vec3(0.012, 0.024, 0.051);
const vec3 SPARK  = vec3(0.102, 0.624, 0.910);
const vec3 COBALT = vec3(0.000, 0.341, 1.000);
const vec3 FROST  = vec3(0.910, 0.945, 1.000);
const vec3 PERI   = vec3(0.482, 0.525, 0.910);

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return v;
}
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// sparse drifting dust: one soft mote in ~8% of cells
float dust(vec2 p) {
  vec2 g = p * 46.0;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float h = hash(id);
  if (h < 0.92) return 0.0;
  vec2 o = vec2(hash(id + 7.1), hash(id + 3.3)) - 0.5;
  float d = length(f - o * 0.7);
  float tw = 0.55 + 0.45 * sin(uTime * (0.6 + h * 1.6) + h * 40.0);
  return exp(-d * d * 260.0) * tw * (h - 0.92) * 12.5;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 p = (frag - 0.5 * uRes) / uRes.y;          // y in [-0.5, 0.5]

  float ig = uIgnite;
  float igPoint = smoothstep(0.00, 0.22, ig);
  float igSeam  = smoothstep(0.16, 0.58, ig);
  float igOpen  = smoothstep(0.48, 1.00, ig);

  float open     = smoothstep(0.00, 0.55, uScroll);
  float flood    = smoothstep(0.28, 0.56, uScroll);
  float collapse = smoothstep(0.62, 0.95, uScroll);

  // ── the spark's anchor; drifts toward the pointer with heavy weight
  vec2 s = mix(vec2(0.0, 0.0), vec2(0.0, 0.0), uOrient); // the crystal sits exactly here
  s += uPointer * vec2(0.035, 0.022) * (1.0 - open);

  // ── local frame: tilt follows the pointer a few degrees; portrait turns the seam vertical
  float tilt = 0.06 + uPointer.y * 0.04 - uPointer.x * 0.018 + sin(uTime * 0.11) * 0.008;
  tilt += uOrient * 1.5707963;
  vec2 q = rot(tilt) * (p - s);
  float r = length(q);

  // ── gravitational lensing: sample space is pulled toward the spark
  float lensK = 0.0011 * (0.4 + igOpen) * (1.0 + open * 1.5);
  vec2 ql = q - q * lensK / (r * r + 0.0018);

  // ── aperture: intersection of two huge circles → a long, thin almond of light
  // portrait: a smaller radius makes a shorter almond that tapers out above the type
  float R = mix(6.0, 2.4, uOrient);
  float rest = mix(0.052, 0.04, uOrient) + sin(uTime * 0.33) * 0.0035;
  float halfGap = mix(0.0, rest, igOpen);
  halfGap = mix(halfGap, mix(1.6, 1.1, uOrient), open * open * open);
  float d = R - halfGap;
  float sd = max(length(ql - vec2(0.0, -d)) - R, length(ql - vec2(0.0, d)) - R); // <0 = light

  float soft   = 0.010 + 0.05 * open;
  float inside = 1.0 - smoothstep(-soft, soft, sd);
  float bleed  = exp(-max(sd, 0.0) * mix(13.0, 2.6, open)) * igOpen;

  // light colour: frost at the spark → electric blue → cobalt in the far reaches
  float along = abs(ql.x);
  vec3 lightCol = mix(SPARK, COBALT, smoothstep(0.08, 1.1, along));
  lightCol = mix(lightCol, FROST, exp(-r * 8.0) * 0.6);
  // flood = the ref-03 material: light poured from the spark, folding through blue into ink
  if (flood > 0.0) {
    vec2 fp = (p - s) * vec2(0.62, 1.0);
    // folds run vertically, like light poured down a pane (ref-03's quality, not its picture)
    float w = fbm(vec2(p.x * 2.2, p.y * 0.55) + vec2(uTime * 0.03, -uTime * 0.05));
    float w2 = fbm(vec2(p.x * 4.0, p.y * 1.1) - vec2(uTime * 0.02, uTime * 0.04) + w * 1.5);
    float pool = 0.46 - length(fp) * 1.15 + (w - 0.5) * 0.5 + (w2 - 0.5) * 0.12;
    vec3 floodCol = mix(INK * 0.5, COBALT * 0.7, smoothstep(-0.35, 0.05, pool));
    floodCol = mix(floodCol, SPARK, smoothstep(0.0, 0.38, pool));
    floodCol = mix(floodCol, FROST, smoothstep(0.38, 0.75, pool) * 0.9);
    lightCol = mix(lightCol, floodCol, flood);
  }

  // ── the dark masses: not flat black — curved bodies faintly lit from the seam
  vec3 col = INK * 0.55;
  col += mix(COBALT, PERI, 0.25) * 0.022 * exp(-max(sd, 0.0) * 2.6) * igOpen;
  col += mix(COBALT, SPARK, 0.55) * bleed * 0.5;
  col = mix(col, lightCol, inside * igOpen);

  // ── rim: a thin frost highlight on both lids, brightest near the spark and on the pointer's side
  float side = sign(ql.y);
  float cursorSide = clamp(side * uPointer.y, 0.0, 1.0) + clamp(sign(ql.x) * uPointer.x, 0.0, 1.0) * 0.5;
  float rim = exp(-abs(sd) * mix(320.0, 110.0, open)) * (0.18 + 0.95 * exp(-r * 2.6));
  col += FROST * rim * 0.55 * (1.0 + 0.7 * cursorSide) * igOpen * (1.0 - flood);

  // ── ignition seam: a hairline drawn outward from the spark, handing over to the aperture
  float seamLen = igSeam * 2.4;
  float seamMask = 1.0 - smoothstep(seamLen * 0.7, seamLen, abs(q.x));
  float seam = exp(-abs(q.y) * mix(2200.0, 900.0, igSeam)) * seamMask * (1.0 - igOpen * 0.85) * (1.0 - open);
  col += mix(SPARK, FROST, 0.6) * seam * 1.4;

  // ── dust in the light, lensed by the spark
  float dl = dust(ql + vec2(uTime * 0.0035, 0.0) + uPointer * 0.01);
  col += mix(SPARK, FROST, 0.5) * dl * (inside * 0.5 + bleed * 0.6 + 0.04) * igOpen * (1.0 - collapse);

  // ── the spark: white-hot core, blue halo, anamorphic streak along the seam
  float tw = 0.9 + 0.1 * sin(uTime * 2.3) * sin(uTime * 1.7 + 1.0);
  float core = exp(-r * r * 52000.0);
  float halo = pow(0.006 / (r + 0.006), 1.6);
  float streak = exp(-abs(q.y) * 520.0) * exp(-abs(q.x) * 4.5);
  float sparkAmt = igPoint * (1.0 - flood * 0.6);
  col += (FROST * (core * 1.6 + halo * 0.9) + SPARK * halo * 0.7) * tw * sparkAmt;
  col += mix(SPARK, FROST, 0.45) * streak * 0.32 * tw * sparkAmt * (0.3 + 0.7 * igSeam);

  // ── vignette keeps the corners for type
  col *= 1.0 - 0.6 * smoothstep(0.3, 1.05, length(p * vec2(0.62, 1.0))) * (1.0 - flood);

  // ── collapse: the flood narrows to one vertical line at centre screen (hands off to the next section)
  // background clears to ink first, then the line thins to a hairline
  col = mix(col, INK * 0.25, smoothstep(0.0, 0.6, collapse));
  float vline = exp(-abs(p.x) * mix(6.0, 1100.0, smoothstep(0.0, 1.0, collapse)));
  float vhalo = exp(-abs(p.x) * 60.0) * 0.18;
  col += (mix(SPARK, FROST, 0.35 + collapse * 0.3) * vline + SPARK * vhalo) * smoothstep(0.0, 0.35, collapse);

  // ── film grain baked in (also kills banding)
  float luma = dot(col, vec3(0.299, 0.587, 0.114));
  float g = hash(frag + fract(uTime * 7.31) * 113.0) - 0.5;
  col += g * (0.018 + 0.08 * luma);

  gl_FragColor = vec4(max(col, 0.0) * uFade, 1.0);
}
`
