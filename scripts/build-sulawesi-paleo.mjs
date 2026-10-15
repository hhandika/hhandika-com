// One-time builder for the palaeogeography view of the Sulawesi map on the
// projects page. Run manually — outputs are committed:
//
//   node scripts/build-sulawesi-paleo.mjs <2-1Ma figure> <4-3Ma figure>
//
// Sources:
//   - Nugraha, A.M.S. & Hall, R. (2018) Late Cenozoic palaeogeography of
//     Sulawesi, Indonesia. Palaeogeography, Palaeoclimatology, Palaeoecology
//     490: 191–209. https://doi.org/10.1016/j.palaeo.2017.10.033
//     Two figures, each with two stacked map panels (A above B): 2 Ma over
//     1 Ma, and 4 Ma over 3 Ma. Not committed.
//   - src/assets/graphics/sulawesi-relief.png  (scripts/build-sulawesi.R)
//     for today's coastline.
//
// Each panel is georeferenced from its graticule ticks, pixels are classed by
// the nearest legend colour (symbols, labels, and outlines are filled from
// their neighbours), and each depth or elevation band is traced with
// d3-contour.
//
// Output: src/data/sulawesi-paleo.json — per time slice, [lon, lat] rings for
// the shelf (< 200 m deep), land, and land above 1,000 and 2,000 m, plus areas.

import { readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { contours } from "d3-contour";

const [fig21, fig43] = process.argv.slice(2);
if (!fig21 || !fig43) {
  console.error("usage: node scripts/build-sulawesi-paleo.mjs <2-1Ma figure> <4-3Ma figure>");
  process.exit(1);
}

const { bbox } = JSON.parse(readFileSync("src/data/sulawesi-dominator.json", "utf8"));

// ---- Georeferencing -------------------------------------------------------
// Graticule ticks (pixels) in both figures: 118–126°E every 2° at x = 58…515;
// 2°N–6°S every 2° at y = 29…486 in panel A and y = 555…1012 in panel B.
const PX_PER_DEG = (515 - 58) / 8;
const panels = [
  { ma: 4, file: fig43, y2N: 29 },
  { ma: 3, file: fig43, y2N: 555 },
  { ma: 2, file: fig21, y2N: 29 },
  { ma: 1, file: fig21, y2N: 555 },
];
const lonToX = (lon) => 58 + (lon - 118) * PX_PER_DEG;
const latToY = (lat, y2N) => y2N + (2 - lat) * PX_PER_DEG;

// ---- Legend classes -------------------------------------------------------
const OUT = 0, OCEANIC = 1, DEEP = 2, SHELF = 3, LAKE = 4, LAND = 5, HIGH = 6, PEAK = 7;
const legend = [
  [OUT, [255, 255, 255]],
  [OCEANIC, [62, 80, 222]],
  [DEEP, [137, 167, 250]],
  [SHELF, [202, 227, 252]],
  [LAKE, [175, 215, 238]],
  [LAND, [238, 255, 187]],
  [HIGH, [227, 169, 46]],
  [PEAK, [147, 109, 33]],
  // Inner- and outer-neritic sample symbols, close to the deep-sea colours:
  // left unclassed so they are filled from their surroundings.
  [-1, [105, 180, 245]],
  [-1, [60, 64, 210]],
];
const MAX_DIST = 40;

// Grid: one cell per source pixel over the map's bounding box.
const x0 = Math.floor(lonToX(bbox.xmin));
const x1 = Math.ceil(lonToX(bbox.xmax));
const W = x1 - x0;
const cellLon = (i) => 118 + (x0 + i - 58) / PX_PER_DEG;

const KM_PER_DEG = 111.32;
const cellKm2 = (lat) => (KM_PER_DEG / PX_PER_DEG) ** 2 * Math.cos((lat * Math.PI) / 180);

function classify(data, width, y0, H) {
  const cls = new Int8Array(W * H).fill(-1);
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const k = ((y0 + j) * width + x0 + i) * 3;
      let best = -1;
      let bestD = MAX_DIST ** 2;
      for (const [c, [r, g, b]] of legend) {
        const d = (data[k] - r) ** 2 + (data[k + 1] - g) ** 2 + (data[k + 2] - b) ** 2;
        if (d < bestD) [best, bestD] = [c, d];
      }
      cls[j * W + i] = best;
    }
  }
  // Fill unclassed pixels (symbols, labels, outlines) from their neighbours,
  // then smooth anti-aliased edges with two majority passes.
  const vote = (src, j, i, skipUnknown) => {
    const n = new Int32Array(8);
    for (let dj = -1; dj <= 1; dj++) {
      for (let di = -1; di <= 1; di++) {
        const jj = j + dj, ii = i + di;
        if (jj < 0 || jj >= H || ii < 0 || ii >= W) continue;
        const c = src[jj * W + ii];
        if (c >= 0) n[c]++;
      }
    }
    let best = -1, bestN = 0;
    n.forEach((v, c) => {
      if (v > bestN) [best, bestN] = [c, v];
    });
    return skipUnknown && bestN === 0 ? -1 : best;
  };
  for (let left = Infinity; left > 0; ) {
    const prev = cls.slice();
    left = 0;
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        if (prev[j * W + i] >= 0) continue;
        cls[j * W + i] = vote(prev, j, i, true);
        if (cls[j * W + i] < 0) left++;
      }
    }
  }
  for (let pass = 0; pass < 2; pass++) {
    const prev = cls.slice();
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) cls[j * W + i] = vote(prev, j, i, false);
  }
  // Sample symbols in blue tones read as water: absorb small patches of water
  // (and stray specks of any class) into whatever surrounds them.
  const seen = new Uint8Array(W * H);
  for (let start = 0; start < W * H; start++) {
    if (seen[start]) continue;
    const c = cls[start];
    const patch = [start];
    seen[start] = 1;
    const border = new Int32Array(8);
    for (let q = 0; q < patch.length; q++) {
      const k = patch[q], i = k % W, j = (k - i) / W;
      for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const ii = i + di, jj = j + dj;
        if (ii < 0 || ii >= W || jj < 0 || jj >= H) continue;
        const kk = jj * W + ii;
        if (cls[kk] !== c) border[cls[kk]]++;
        else if (!seen[kk]) {
          seen[kk] = 1;
          patch.push(kk);
        }
      }
    }
    const limit = c === OCEANIC || c === DEEP || c === SHELF || c === LAKE ? 80 : 12;
    if (patch.length >= limit) continue;
    const to = border.indexOf(Math.max(...border));
    if (border[to] > 0) patch.forEach((k) => (cls[k] = to));
  }
  return cls;
}

// Light blur so traced edges follow the source curves, not its pixel steps.
function blur(mask, w, h) {
  let a = Float32Array.from(mask);
  for (let pass = 0; pass < 2; pass++) {
    const b = new Float32Array(w * h);
    for (let j = 0; j < h; j++) {
      for (let i = 0; i < w; i++) {
        let s = 0, n = 0;
        for (let dj = -1; dj <= 1; dj++) {
          for (let di = -1; di <= 1; di++) {
            const jj = j + dj, ii = i + di;
            if (jj < 0 || jj >= h || ii < 0 || ii >= w) continue;
            s += a[jj * w + ii];
            n++;
          }
        }
        b[j * w + i] = s / n;
      }
    }
    a = b;
  }
  return a;
}

// Douglas–Peucker on a closed ring, tolerance in grid cells. The ring is split
// at the vertex farthest from its start, since its own chord has no length.
function simplify(ring, tol) {
  const last = ring.length - 1;
  let mid = 1;
  for (let k = 1; k < last; k++) {
    const d = (p) => Math.hypot(p[0] - ring[0][0], p[1] - ring[0][1]);
    if (d(ring[k]) > d(ring[mid])) mid = k;
  }
  const keep = new Uint8Array(ring.length);
  keep[0] = keep[mid] = keep[last] = 1;
  const stack = [[0, mid], [mid, last]];
  while (stack.length) {
    const [a, b] = stack.pop();
    const [ax, ay] = ring[a], [bx, by] = ring[b];
    const dx = bx - ax, dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    let far = -1, farD = tol;
    for (let k = a + 1; k < b; k++) {
      const d = Math.abs(dy * (ring[k][0] - ax) - dx * (ring[k][1] - ay)) / len;
      if (d > farD) [far, farD] = [k, d];
    }
    if (far > 0) {
      keep[far] = 1;
      stack.push([a, far], [far, b]);
    }
  }
  return ring.filter((_, k) => keep[k]);
}

const ringArea = (r) => {
  let s = 0;
  for (let k = 0, n = r.length; k < n; k++) {
    const [ax, ay] = r[k], [bx, by] = r[(k + 1) % n];
    s += ax * by - bx * ay;
  }
  return Math.abs(s / 2);
};

// Trace a mask into [lon, lat] rings; cell (i, j) spans [i, i + 1] × [j, j + 1].
function trace(mask, w, h, toLonLat, { tol = 0.35, minArea = 3 } = {}) {
  const [mp] = contours().size([w, h]).thresholds([0.5])(blur(mask, w, h)).map((c) => c.coordinates);
  const rings = [];
  for (const poly of mp) {
    for (const ring of poly) {
      if (ringArea(ring) < minArea) continue;
      const s = simplify(ring, tol);
      if (s.length < 4) continue;
      rings.push(s.map(([x, y]) => toLonLat(x, y).map((v) => Math.round(v * 1000) / 1000)));
    }
  }
  return rings;
}

const r0 = (v) => Math.round(v / 100) * 100;

// ---- Time slices ----------------------------------------------------------
const cache = new Map();
const frames = [];
for (const p of panels) {
  if (!cache.has(p.file)) {
    cache.set(p.file, await sharp(p.file).removeAlpha().raw().toBuffer({ resolveWithObject: true }));
  }
  const { data, info } = cache.get(p.file);
  const y0 = Math.floor(latToY(bbox.ymax, p.y2N));
  const H = Math.ceil(latToY(bbox.ymin, p.y2N)) - y0;
  const cellLat = (j) => 2 - (y0 + j - p.y2N) / PX_PER_DEG;
  const cls = classify(data, info.width, y0, H);

  const bands = {
    shelf: (c) => c >= SHELF,
    land: (c) => c >= LAND,
    high: (c) => c >= HIGH,
    peak: (c) => c >= PEAK,
  };
  const toLonLat = (x, y) => [cellLon(x), cellLat(y)];
  const layers = {};
  const areaKm2 = {};
  for (const [name, test] of Object.entries(bands)) {
    const mask = Array.from(cls, (c) => (test(c) ? 1 : 0));
    layers[name] = trace(mask, W, H, toLonLat);
    let a = 0;
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) if (mask[j * W + i]) a += cellKm2(cellLat(j + 0.5));
    areaKm2[name] = r0(a);
  }
  frames.push({ ma: p.ma, areaKm2, layers });
  console.log(`${p.ma} Ma`, areaKm2, Object.fromEntries(Object.entries(layers).map(([k, v]) => [k, v.length])));
}

// ---- Today's coastline from the relief's alpha ----------------------------
const relief = await sharp("src/assets/graphics/sulawesi-relief.png")
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const RW = relief.info.width, RH = relief.info.height;
const rLon = (x) => bbox.xmin + (x / RW) * (bbox.xmax - bbox.xmin);
const rLat = (y) => bbox.ymax - (y / RH) * (bbox.ymax - bbox.ymin);
const coast = new Array(RW * RH);
let todayKm2 = 0;
const rCellKm2 = (lat) =>
  KM_PER_DEG ** 2 * ((bbox.xmax - bbox.xmin) / RW) * ((bbox.ymax - bbox.ymin) / RH) * Math.cos((lat * Math.PI) / 180);
for (let j = 0; j < RH; j++) {
  for (let i = 0; i < RW; i++) {
    const on = relief.data[(j * RW + i) * 4 + 3] > 127 ? 1 : 0;
    coast[j * RW + i] = on;
    if (on) todayKm2 += rCellKm2(rLat(j + 0.5));
  }
}
const today = {
  ma: 0,
  areaKm2: { land: r0(todayKm2) },
  coast: trace(coast, RW, RH, (x, y) => [rLon(x), rLat(y)], { tol: 0.8, minArea: 20 }),
};
console.log("Today", today.areaKm2, today.coast.length, "rings");

writeFileSync(
  "src/data/sulawesi-paleo.json",
  JSON.stringify({
    source: {
      citation:
        "Nugraha, A.M.S. & Hall, R. (2018) Late Cenozoic palaeogeography of Sulawesi, Indonesia. Palaeogeography, Palaeoclimatology, Palaeoecology 490: 191–209.",
      short: "Nugraha & Hall (2018)",
      doi: "https://doi.org/10.1016/j.palaeo.2017.10.033",
    },
    frames,
    today,
  }),
);
