// Draws the Stillflame hero scene (a misty lake at dawn with one small warm light) as an SVG,
// so it can be rendered at any size and is entirely ours. Usage:
//   node generate.mjs portrait out.svg      (1600 x 2844, for the app)
//   node generate.mjs wide out.svg          (2400 x 1350, for the website)
// Render with: rsvg-convert out.svg -o out.png
import { writeFileSync } from "node:fs";

const [variant = "portrait", outFile = "hero.svg"] = process.argv.slice(2);
const V = {
  portrait: { W: 1600, H: 2844, horizon: 0.625, glowX: 0.69, amp: 0.075, seed: 7 },
  wide: { W: 2400, H: 1350, horizon: 0.64, glowX: 0.72, amp: 0.1, seed: 11 },
}[variant];
const { W, H } = V;
const hy = Math.round(H * V.horizon); // the shoreline
const gx = Math.round(W * V.glowX);

// ---- seeded randomness ---------------------------------------------------------------------
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(V.seed);
const lerp = (a, b, t) => a + (b - a) * t;

/** A ridge line: smooth fractal noise sampled across the width. Returns [x, y] points. */
function ridge({ base, amp, rough, step = 8, seedOffset = 0 }) {
  const r = rng(V.seed * 131 + seedOffset);
  const octaves = [];
  for (let o = 0; o < 5; o++) {
    const wavelength = (W / 1.6) / Math.pow(2, o);
    const n = Math.ceil(W / wavelength) + 3;
    octaves.push({ wavelength, values: Array.from({ length: n }, () => r() * 2 - 1), weight: Math.pow(rough, o) });
  }
  const total = octaves.reduce((s, o) => s + o.weight, 0);
  const smooth = (t) => t * t * (3 - 2 * t);
  const pts = [];
  for (let x = -step; x <= W + step; x += step) {
    let v = 0;
    for (const o of octaves) {
      const p = (x + 200) / o.wavelength;
      const i = Math.floor(p);
      v += lerp(o.values[i], o.values[i + 1], smooth(p - i)) * o.weight;
    }
    pts.push([x, base - (v / total) * amp]);
  }
  return pts;
}
const path = (pts, bottom) =>
  `M${pts[0][0]},${bottom} ` + pts.map(([x, y]) => `L${x.toFixed(1)},${y.toFixed(1)}`).join(" ") + ` L${pts[pts.length - 1][0]},${bottom} Z`;

// ---- palette -------------------------------------------------------------------------------
const HAZE = "#CFE0D2"; // pale green-grey mist
const layers = [
  { color: "#7FAAA2", base: hy - H * 0.085, amp: H * V.amp * 1.9, rough: 0.5 },
  { color: "#5C928C", base: hy - H * 0.06, amp: H * V.amp * 1.8, rough: 0.5 },
  { color: "#3E7673", base: hy - H * 0.04, amp: H * V.amp * 1.6, rough: 0.5 },
  { color: "#265A59", base: hy - H * 0.022, amp: H * V.amp * 1.4, rough: 0.45 },
  { color: "#123F3D", base: hy - H * 0.008, amp: H * V.amp * 1.1, rough: 0.4 },
].map((l, i) => ({ ...l, pts: ridge({ ...l, seedOffset: i * 17 + 3 }) }));

// A headland on the right, rising from just right of the light. Points run left to right.
const hillStart = gx + W * 0.035;
const hillPeak = H * 0.115;
const shore = [];
for (let x = -8; x <= W + 8; x += 8) {
  const t = Math.min(1, Math.max(0, (x - hillStart) / (W - hillStart)));
  const lift = x < hillStart ? 0 : Math.pow(Math.sin((t * Math.PI) / 2), 0.75) * hillPeak;
  const bump = Math.sin(x * 0.011) * 3 + Math.sin(x * 0.037) * 2;
  shore.push([x, hy - H * 0.004 - lift + (x < hillStart ? 0 : bump)]);
}

// Fir trees along the headland.
function firs() {
  const r = rng(V.seed * 7);
  let out = "";
  const count = variant === "portrait" ? 26 : 34;
  for (let i = 0; i < count; i++) {
    const x = lerp(hillStart + W * 0.01, W * 1.02, r());
    const pt = shore.reduce((best, p) => (Math.abs(p[0] - x) < Math.abs(best[0] - x) ? p : best), shore[0]);
    const h = lerp(H * 0.022, H * 0.062, r() * r());
    const w = h * 0.34;
    const tiers = 5;
    let d = `M${x},${pt[1] - h}`;
    for (let t = 1; t <= tiers; t++) {
      const y = pt[1] - h + (h * t) / tiers;
      const half = (w * t) / tiers;
      d += ` L${x + half},${y} L${x + half * 0.5},${y}`;
    }
    for (let t = tiers; t >= 1; t--) {
      const y = pt[1] - h + (h * t) / tiers;
      const half = (w * t) / tiers;
      d += ` L${x - half * 0.5},${y} L${x - half},${y}`;
    }
    out += `<path d="${d} Z" fill="#06201F" opacity="${(0.9 + r() * 0.1).toFixed(2)}"/>`;
  }
  return out;
}

// Thin ripples on the water.
function ripples() {
  const r = rng(V.seed * 3);
  let out = "";
  for (let i = 0; i < 55; i++) {
    const y = lerp(hy + 8, H, Math.pow(r(), 1.5));
    const depth = (y - hy) / (H - hy);
    const len = lerp(40, 360, r()) * (0.5 + depth);
    const x = r() * W - len / 2;
    out += `<rect x="${x.toFixed(0)}" y="${y.toFixed(0)}" width="${len.toFixed(0)}" height="${(1 + depth * 2.2).toFixed(1)}" rx="1" fill="#BFE3DB" opacity="${(0.05 + r() * 0.1).toFixed(2)}"/>`;
  }
  return out;
}

// The light's reflection: a broken column of gold on the water.
function glowColumn() {
  const r = rng(V.seed * 5);
  let out = "";
  for (let i = 0; i < 38; i++) {
    const depth = i / 38;
    const y = hy + 6 + depth * (H - hy) * 0.5;
    const wdt = lerp(18, 150, depth) * (0.6 + r() * 0.8);
    const x = gx + (r() - 0.5) * lerp(6, 70, depth);
    out += `<ellipse cx="${x.toFixed(0)}" cy="${y.toFixed(0)}" rx="${wdt.toFixed(0)}" ry="${(1.6 + depth * 3).toFixed(1)}" fill="#F6D58B" opacity="${(0.55 * (1 - depth) + 0.05).toFixed(2)}"/>`;
  }
  return out;
}

// Mist bands between the ridges.
const mist = [
  [0.52, 0.34, 0.9, 40], [0.57, 0.28, 0.7, 52], [0.6, 0.32, 1.1, 34], [0.625, 0.3, 1.0, 46],
]
  .map(([hh, op, wf, bl], i) => {
    const y = H * hh + (variant === "portrait" ? 0 : H * 0.0);
    const r = rng(V.seed + i * 71);
    const cx = W * (0.3 + r() * 0.4);
    return `<ellipse cx="${cx.toFixed(0)}" cy="${y.toFixed(0)}" rx="${(W * wf).toFixed(0)}" ry="${(H * 0.03).toFixed(0)}" fill="${HAZE}" opacity="${op}" filter="url(#b${bl})"/>`;
  })
  .join("");

const bottom = H + 20;
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="${hy}" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#05201F"/><stop offset="0.35" stop-color="#0D4240"/>
    <stop offset="0.7" stop-color="#2D7F7B"/><stop offset="0.9" stop-color="#8FB6A6"/><stop offset="1" stop-color="#E6C88D"/>
  </linearGradient>
  <radialGradient id="halo" cx="${gx}" cy="${hy - H * 0.012}" r="${W * 0.55}" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#FFE3A0" stop-opacity="0.95"/><stop offset="0.1" stop-color="#F6C46E" stop-opacity="0.6"/>
    <stop offset="0.4" stop-color="#E3A95C" stop-opacity="0.22"/><stop offset="1" stop-color="#E3A95C" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="water" x1="0" y1="${hy}" x2="0" y2="${H}" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#4F8F8A"/><stop offset="0.25" stop-color="#1F5857"/><stop offset="1" stop-color="#041A19"/>
  </linearGradient>
  ${layers.map((l, i) => `<linearGradient id="ridge${i}" x1="0" y1="${(l.base - l.amp * 0.6).toFixed(0)}" x2="0" y2="${hy}" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${l.color}"/><stop offset="0.55" stop-color="${l.color}"/><stop offset="1" stop-color="#C9D8C6" stop-opacity="${(0.32 + i * 0.05).toFixed(2)}"/></linearGradient>`).join("")}
  <linearGradient id="vignette" x1="0" y1="0" x2="0" y2="${H}" gradientUnits="userSpaceOnUse">
    <stop offset="0" stop-color="#021110" stop-opacity="0.55"/><stop offset="0.25" stop-color="#021110" stop-opacity="0"/>
    <stop offset="0.8" stop-color="#021110" stop-opacity="0"/><stop offset="1" stop-color="#021110" stop-opacity="0.6"/>
  </linearGradient>
  ${[10, 30, 34, 40, 46, 52].map((b) => `<filter id="b${b}" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="${b}"/></filter>`).join("")}
  <filter id="soft"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="grain" x="0" y="0" width="100%" height="100%">
    <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="${V.seed}" result="n"/>
    <feColorMatrix in="n" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0.9 0.9 0.9 0 -1.05"/>
  </filter>
  <clipPath id="waterClip"><rect x="0" y="${hy}" width="${W}" height="${H - hy}"/></clipPath>
</defs>

<rect width="${W}" height="${H}" fill="url(#sky)"/>
<rect width="${W}" height="${H}" fill="url(#halo)"/>

<!-- ridges, far to near, each fading into the mist at its foot -->
${layers.map((l, i) => `<path d="${path(l.pts, hy + 4)}" fill="url(#ridge${i})"/>`).join("\n")}
${mist}
<path d="${path(shore.filter(([x]) => x >= hillStart - 8), hy + 4)}" fill="#08292A"/>
${firs()}
<ellipse cx="${gx}" cy="${hy - H * 0.014}" rx="${W * 0.26}" ry="${H * 0.035}" fill="#FFE3A0" opacity="0.28" filter="url(#b52)"/>

<!-- the light -->
<circle cx="${gx}" cy="${hy - H * 0.0125}" r="${W * 0.045}" fill="#FFD27A" opacity="0.7" filter="url(#b30)"/>
<circle cx="${gx}" cy="${hy - H * 0.0125}" r="${W * 0.011}" fill="#FFF3CF" filter="url(#b10)"/>
<circle cx="${gx}" cy="${hy - H * 0.0125}" r="${W * 0.0055}" fill="#FFFBEA"/>

<!-- the lake -->
<rect x="0" y="${hy}" width="${W}" height="${H - hy}" fill="url(#water)"/>
<g clip-path="url(#waterClip)">
  <g transform="translate(0 ${2 * hy}) scale(1 -1)" opacity="0.62" filter="url(#soft)">
    ${layers.map((l) => `<path d="${path(l.pts, hy + 4)}" fill="${l.color}"/>`).join("")}
    <path d="${path(shore.filter(([x]) => x >= hillStart - 8), hy + 4)}" fill="#08292A"/>
    ${firs()}
  </g>
  <rect x="0" y="${hy}" width="${W}" height="${(H - hy) * 0.7}" fill="#0B3B39" opacity="0.28"/>
  <ellipse cx="${W * 0.5}" cy="${hy + 10}" rx="${W * 0.7}" ry="${H * 0.02}" fill="${HAZE}" opacity="0.35" filter="url(#b40)"/>
  ${glowColumn()}
  ${ripples()}
</g>
<rect y="${hy - 1}" width="${W}" height="3" fill="#CFE6DA" opacity="0.28" filter="url(#b10)"/>

<rect width="${W}" height="${H}" fill="url(#vignette)"/>
<rect width="${W}" height="${H}" filter="url(#grain)" opacity="0.32"/>
</svg>
`;
writeFileSync(outFile, svg);
console.log(`Wrote ${outFile} (${W}x${H}, ${(svg.length / 1024).toFixed(0)} KB)`);
