/**
 * 3D relief map of the Indonesian archipelago.
 * Elevation: NOAA ETOPO1 (public/data/indonesia-height.png, built by
 * scripts/build-indonesia.mjs). Coastlines: Natural Earth.
 * Units: 1 scene unit = 1 degree; +x east, -z north.
 */
import * as THREE from "three";

export interface Bbox {
  west: number;
  east: number;
  south: number;
  north: number;
}

export interface BiogeoLine {
  id: string;
  color: string;
  points: [number, number][];
}

export interface MapPin {
  id: string;
  lon: number;
  lat: number;
  effort: "full" | "semi" | "none";
}

export interface IndonesiaOptions {
  heightUrl: string;
  bbox: Bbox;
  /** GeoJSON-ish `{ rings: [lon, lat][][] }` from the build script. */
  coastUrl: string;
  lines: BiogeoLine[];
  pins: MapPin[];
  /** Ids whose screen positions are reported to `onHotspots`. */
  hotspotIds: string[];
  onHotspots?: (pts: Record<string, { x: number; y: number; visible: boolean }>) => void;
}

export interface IndonesiaMapHandle {
  setSeaLevel(meters: number): void;
  setLinesVisible(v: boolean): void;
  setExplore(v: boolean): void;
  dispose(): void;
}

// Talamau palette (see tailwind.config.mjs).
const C = {
  deep: new THREE.Color("#1f263a"),
  shelfSea: new THREE.Color("#3f5487"),
  exposedShelf: new THREE.Color("#f2c455"), // emerged Sundaland, gold so it stands out
  sand: new THREE.Color("#f7dd8f"),
  lowland: new THREE.Color("#788d36"),
  forest: new THREE.Color("#475622"),
  montane: new THREE.Color("#313b1e"),
  ember: new THREE.Color("#a24a16"),
  summit: new THREE.Color("#e9edd6"),
  water: new THREE.Color("#4a66a6"),
  sky: new THREE.Color("#1f263a"),
  coast: new THREE.Color("#fbefc9"),
};

const LAND_SCALE = 0.00028; // ≈ ×30 vertical exaggeration
function yFor(h: number) {
  if (h > -200) return h * LAND_SCALE;
  // Compress the deep ocean so trenches don't dominate.
  return -200 * LAND_SCALE - Math.sqrt((-h - 200) / 1000) * 0.12;
}

const tmpC = new THREE.Color();
function colorFor(h: number, sea: number, out: THREE.Color) {
  if (h < sea) {
    const t = Math.min(1, (sea - h) / 1500);
    return out.copy(C.shelfSea).lerp(C.deep, t);
  }
  if (h < 0) return out.copy(C.exposedShelf); // land bridge at low sea level
  if (h < 40) return out.copy(C.sand).lerp(C.lowland, h / 40);
  if (h < 800) return out.copy(C.lowland).lerp(C.forest, (h - 40) / 760);
  if (h < 2000) return out.copy(C.forest).lerp(C.montane, (h - 800) / 1200);
  if (h < 3500) return out.copy(C.montane).lerp(C.ember, (h - 2000) / 1500);
  return out.copy(C.ember).lerp(C.summit, Math.min(1, (h - 3500) / 900));
}

async function loadHeights(url: string, step: number) {
  const img = await createImageBitmap(await (await fetch(url)).blob());
  const cv = document.createElement("canvas");
  cv.width = img.width;
  cv.height = img.height;
  const ctx = cv.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  const { data } = ctx.getImageData(0, 0, img.width, img.height);
  const w = Math.floor((img.width - 1) / step) + 1;
  const h = Math.floor((img.height - 1) / step) + 1;
  const out = new Float32Array(w * h);
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const i = (r * step * img.width + c * step) * 4;
      out[r * w + c] = data[i] * 256 + data[i + 1] - 12000;
    }
  }
  return { w, h, heights: out };
}

export async function mountIndonesia(
  canvas: HTMLCanvasElement,
  opts: IndonesiaOptions,
): Promise<IndonesiaMapHandle> {
  const { bbox } = opts;
  const cx = (bbox.west + bbox.east) / 2;
  const cz = (bbox.south + bbox.north) / 2;
  const toX = (lon: number) => lon - cx;
  const toZ = (lat: number) => -(lat - cz);
  const spanX = bbox.east - bbox.west;
  const spanZ = bbox.north - bbox.south;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.background = C.sky;
  scene.fog = new THREE.Fog(C.sky, 40, 120);

  const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 400);
  const target = new THREE.Vector3(0, 0, 1);
  const camBase = new THREE.Vector3(0, 22, 30);

  scene.add(new THREE.HemisphereLight(0x9abbde, 0x191f0c, 1.3));
  const sun = new THREE.DirectionalLight(0xf2c455, 2.4); // sunrise from the east
  sun.position.set(30, 18, -10);
  scene.add(sun);

  // ---- Terrain
  const step = innerWidth < 768 ? 2 : 1;
  const { w, h, heights } = await loadHeights(opts.heightUrl, step);
  const geo = new THREE.PlaneGeometry(spanX, spanZ, w - 1, h - 1);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, yFor(heights[i]));
  geo.computeVertexNormals();
  const colors = new Float32Array(pos.count * 3);
  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const paint = (sea: number) => {
    for (let i = 0; i < heights.length; i++) {
      colorFor(heights[i], sea, tmpC).toArray(colors, i * 3);
    }
    geo.attributes.color.needsUpdate = true;
  };
  paint(0);
  scene.add(
    new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }),
    ),
  );

  const heightAt = (lon: number, lat: number) => {
    const c = Math.round(((lon - bbox.west) / spanX) * (w - 1));
    const r = Math.round(((bbox.north - lat) / spanZ) * (h - 1));
    if (c < 0 || r < 0 || c >= w || r >= h) return 0;
    return heights[r * w + c];
  };

  // ---- Water
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(spanX * 4, spanZ * 6),
    new THREE.MeshStandardMaterial({
      color: C.water,
      transparent: true,
      opacity: 0.55,
      roughness: 0.25,
      metalness: 0.2,
    }),
  );
  water.rotation.x = -Math.PI / 2;
  scene.add(water);

  // ---- Modern coastlines
  const coastPts: number[] = [];
  const { rings } = (await (await fetch(opts.coastUrl)).json()) as {
    rings: [number, number][][];
  };
  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const [a, b] = [ring[i], ring[i + 1]];
      coastPts.push(toX(a[0]), 0.004, toZ(a[1]), toX(b[0]), 0.004, toZ(b[1]));
    }
  }
  const coastGeo = new THREE.BufferGeometry();
  coastGeo.setAttribute("position", new THREE.Float32BufferAttribute(coastPts, 3));
  const coast = new THREE.LineSegments(
    coastGeo,
    new THREE.LineBasicMaterial({ color: C.coast, transparent: true, opacity: 0.35 }),
  );
  scene.add(coast);

  // ---- Biogeographic lines
  const linesGroup = new THREE.Group();
  for (const l of opts.lines) {
    const g = new THREE.BufferGeometry().setFromPoints(
      l.points.map(([lon, lat]) => new THREE.Vector3(toX(lon), 0.25, toZ(lat))),
    );
    const line = new THREE.Line(
      g,
      new THREE.LineDashedMaterial({ color: l.color, dashSize: 0.4, gapSize: 0.3 }),
    );
    line.computeLineDistances();
    linesGroup.add(line);
  }
  scene.add(linesGroup);

  // ---- Field-site pins
  const pinColors = { full: 0xeeab30, semi: 0x9abbde, none: 0xe9edd6 };
  const anchors: { id: string; v: THREE.Vector3 }[] = [];
  const pinGroup = new THREE.Group();
  const head = new THREE.SphereGeometry(0.14, 12, 8);
  for (const p of opts.pins) {
    if (p.lon < bbox.west || p.lon > bbox.east || p.lat < bbox.south || p.lat > bbox.north) continue;
    const y = Math.max(0, yFor(heightAt(p.lon, p.lat)));
    const top = y + 0.9;
    const mat = new THREE.MeshBasicMaterial({ color: pinColors[p.effort] });
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, top - y, 6), mat);
    stem.position.set(toX(p.lon), (y + top) / 2, toZ(p.lat));
    const ball = new THREE.Mesh(head, mat);
    ball.position.set(toX(p.lon), top, toZ(p.lat));
    pinGroup.add(stem, ball);
    if (opts.hotspotIds.includes(p.id)) {
      anchors.push({ id: p.id, v: ball.position.clone().setY(top + 0.2) });
    }
  }
  scene.add(pinGroup);

  // ---- Controls (explore mode)
  const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
  const controls = new OrbitControls(camera, canvas);
  controls.enabled = false;
  controls.enableDamping = true;
  controls.minDistance = 8;
  controls.maxDistance = 80;
  controls.maxPolarAngle = Math.PI * 0.45;
  controls.target.copy(target);
  let explore = false;

  // ---- Framing
  const resize = () => {
    const cw = canvas.clientWidth, ch = canvas.clientHeight;
    if (!cw || !ch) return;
    renderer.setSize(cw, ch, false);
    camera.aspect = cw / ch;
    const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
    // Fit ~spanX/2 horizontally (slightly cropped on very narrow screens).
    const d = THREE.MathUtils.clamp((spanX * 0.47) / (Math.tan(halfFov) * camera.aspect), 18, 90);
    camBase.set(0, d * 0.62, d * 0.78);
    // On portrait screens, aim further south so the map sits above the copy.
    target.set(0, 0, camera.aspect < 1 ? d * 0.16 : 1);
    const fog = scene.fog as THREE.Fog;
    fog.near = d * 0.9;
    fog.far = d * 2.6;
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  camera.position.copy(camBase);

  const pointer = { x: 0, y: 0 };
  const onMove = (e: PointerEvent) => {
    pointer.x = (e.clientX / innerWidth) * 2 - 1;
    pointer.y = (e.clientY / innerHeight) * 2 - 1;
  };
  addEventListener("pointermove", onMove);

  let visible = true;
  const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
  io.observe(canvas);

  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let sea = 0, seaTarget = 0;
  const t0 = performance.now();
  const tmp = new THREE.Vector3();

  renderer.setAnimationLoop(() => {
    if (!visible) return;
    const t = reduceMotion ? 0 : (performance.now() - t0) / 1000;

    if (Math.abs(seaTarget - sea) > 0.5) {
      sea += (seaTarget - sea) * (reduceMotion ? 1 : 0.08);
      paint(sea);
    } else if (sea !== seaTarget) {
      sea = seaTarget;
      paint(sea);
    }
    water.position.y = yFor(sea) + 0.002;

    if (explore) {
      controls.update();
    } else {
      camera.position.set(
        camBase.x + Math.sin(t * 0.05) * 2 + pointer.x * 1.5,
        camBase.y + Math.sin(t * 0.08) * 0.5 - pointer.y * 1,
        camBase.z,
      );
      camera.lookAt(target);
    }
    renderer.render(scene, camera);

    if (opts.onHotspots) {
      const out: Record<string, { x: number; y: number; visible: boolean }> = {};
      for (const a of anchors) {
        tmp.copy(a.v).project(camera);
        out[a.id] = {
          x: ((tmp.x + 1) / 2) * canvas.clientWidth,
          y: ((1 - tmp.y) / 2) * canvas.clientHeight,
          visible: tmp.z < 1 && Math.abs(tmp.x) < 1.05 && Math.abs(tmp.y) < 1.05,
        };
      }
      opts.onHotspots(out);
    }
  });

  return {
    setSeaLevel(m) {
      seaTarget = m;
    },
    setLinesVisible(v) {
      linesGroup.visible = v;
    },
    setExplore(v) {
      explore = v;
      controls.enabled = v;
      if (v) controls.target.copy(target);
      else camera.position.copy(camBase);
    },
    dispose() {
      renderer.setAnimationLoop(null);
      removeEventListener("pointermove", onMove);
      ro.disconnect();
      io.disconnect();
      controls.dispose();
      renderer.dispose();
    },
  };
}
