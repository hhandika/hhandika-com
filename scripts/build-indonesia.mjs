// One-time builder for the Indonesia map data used by the home page.
// Run manually: `node scripts/build-indonesia.mjs` — outputs are committed.
//
// Sources (both public domain):
//   - Natural Earth 10m land polygons  (naturalearthdata.com)
//   - NOAA ETOPO1 1 arc-minute relief  (via the CoastWatch ERDDAP server)
//
// Outputs:
//   public/data/indonesia-land.json        simplified coastlines, [lon, lat] rings
//   public/data/indonesia-height.png    elevation grid, meters + 12000 packed in R/G
//   src/assets/graphics/indonesia.svg   2D map (fallback + projects page)

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
const meta = JSON.parse(readFileSync("src/data/indonesia-meta.json", "utf8"));
const BBOX = meta.bbox;
const BIOGEO_LINES = meta.biogeoLines;

const tmp = join(tmpdir(), "indonesia-build");
mkdirSync(tmp, { recursive: true });
mkdirSync("src/data", { recursive: true });
mkdirSync("public/data", { recursive: true });

async function download(url, dest) {
  if (existsSync(dest)) return;
  console.log("↓", url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

// ---- 1. Coastlines -------------------------------------------------------
const neRaw = join(tmp, "ne_10m_land.geojson");
await download(
  "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_10m_land.geojson",
  neRaw,
);
const clipped = join(tmp, "land-clipped.json");
execFileSync(
  "npx",
  [
    "-y",
    "mapshaper@0.6",
    neRaw,
    "-explode",
    "-clip",
    `bbox=${BBOX.west},${BBOX.south},${BBOX.east},${BBOX.north}`,
    "-filter-slivers",
    "min-area=20km2",
    "-simplify",
    "weighted",
    "keep-shapes",
    "interval=1500",
    "-o",
    "precision=0.001",
    "format=geojson",
    clipped,
  ],
  { stdio: "inherit" },
);
const geo = JSON.parse(readFileSync(clipped, "utf8"));
const rings = [];
for (const f of geo.features) {
  const g = f.geometry;
  if (!g) continue;
  const polys = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  for (const poly of polys) rings.push(poly[0]); // outer ring only
}
rings.sort((a, b) => b.length - a.length);
writeFileSync("public/data/indonesia-land.json", JSON.stringify({ bbox: BBOX, rings }));
console.log(`coastlines: ${rings.length} islands`);

// ---- 2. Elevation --------------------------------------------------------
const STRIDE = 4; // 4 arc-min ≈ 0.067° ≈ 7.4 km
const csv = join(tmp, `etopo-${STRIDE}.csv`);
await download(
  "https://coastwatch.pfeg.noaa.gov/erddap/griddap/etopo180.csv?altitude" +
    encodeURIComponent(
      `[(${BBOX.north}):${STRIDE}:(${BBOX.south})][(${BBOX.west}):${STRIDE}:(${BBOX.east})]`,
    ),
  csv,
);
const lines = readFileSync(csv, "utf8").trim().split("\n").slice(2); // 2 header rows
const lats = new Set(), lons = new Set();
const rows = lines.map((l) => {
  const [lat, lon, alt] = l.split(",").map(Number);
  lats.add(lat);
  lons.add(lon);
  return alt;
});
const W = lons.size, H = lats.size;
// ERDDAP returns latitude ascending for etopo180 regardless of request order.
const latAsc = [...lats][0] < [...lats][1];
const buf = Buffer.alloc(W * H * 3);
for (let r = 0; r < H; r++) {
  const srcRow = latAsc ? H - 1 - r : r; // row 0 = north
  for (let c = 0; c < W; c++) {
    const v = Math.max(0, Math.min(65535, Math.round(rows[srcRow * W + c] + 12000)));
    const o = (r * W + c) * 3;
    buf[o] = v >> 8;
    buf[o + 1] = v & 255;
    buf[o + 2] = 0;
  }
}
await sharp(buf, { raw: { width: W, height: H, channels: 3 } })
  .png({ compressionLevel: 9 })
  .toFile("public/data/indonesia-height.png");
console.log(`heightmap: ${W}×${H}`);

// ---- 3. SVG --------------------------------------------------------------
const midLat = ((BBOX.north + BBOX.south) / 2) * (Math.PI / 180);
const k = 20; // px per degree
const sx = (lon) => ((lon - BBOX.west) * k * Math.cos(midLat)).toFixed(1);
const sy = (lat) => ((BBOX.north - lat) * k).toFixed(1);
const vw = Number(sx(BBOX.east)), vh = Number(sy(BBOX.south));
const path = (pts, close) =>
  "M" + pts.map(([x, y]) => `${sx(x)} ${sy(y)}`).join("L") + (close ? "Z" : "");

const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${vw} ${vh}" role="img" aria-labelledby="t">
<title id="t">Map of the Indonesian archipelago with Wallace's and Lydekker's lines</title>
<g id="land" fill="#788d36" stroke="#475622" stroke-width="0.6" stroke-linejoin="round">
${rings.map((r) => `<path d="${path(r, true)}"/>`).join("\n")}
</g>
<g id="biogeo" fill="none" stroke-width="1.6" stroke-dasharray="6 5" stroke-linecap="round">
${BIOGEO_LINES.map((l) => `<path id="${l.id}" stroke="${l.color}" d="${path(l.points, false)}"/>`).join("\n")}
</g>
</svg>
`;
writeFileSync("src/assets/graphics/indonesia.svg", svg);
console.log(`svg: ${vw}×${vh}`);
