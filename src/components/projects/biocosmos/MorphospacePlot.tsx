// Animated dorso-ventral morphospace from the BioCosmos analyses
// (analyses/results/morphospace_points.csv, exported to
// public/data/biocosmos/morphospace.json). Observable Plot draws the axes;
// the 6,424 species centroids are drawn on a canvas so transitions stay smooth.
import * as Plot from "@observablehq/plot";
import { useEffect, useRef, useState } from "preact/hooks";
import "./plots.css";

type Row = [string, number, number | null, number | null, number | null, number | null];
interface Data {
  families: string[];
  pcVariance: [number, number];
  species: Row[];
}
type Mode = "dorsal" | "ventral" | "both";

// ColorBrewer Dark2, in the same family order as the publication figure.
// On the light background, green, yellow, and gray are darkened to reach
// 3:1 (WCAG 1.4.11); the dark background keeps the original hues.
const PALETTE_DARK = ["#1b9e77", "#d95f02", "#7570b3", "#e7298a", "#66a61e", "#e6ab02", "#9a9a9a"];
const PALETTE_LIGHT = ["#1b9e77", "#d95f02", "#7570b3", "#e7298a", "#5d8a1a", "#a67c00", "#767676"];
const isDark = () => document.documentElement.classList.contains("dark");
const DURATION = 1800; // slow, gentle transitions
const RADIUS = 2.4;

const MODES: { id: Mode; label: string }[] = [
  { id: "dorsal", label: "Dorsal" },
  { id: "ventral", label: "Ventral" },
  { id: "both", label: "Both sides" },
];

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

interface Frame {
  dx: Float32Array; dy: Float32Array; da: Float32Array;
  vx: Float32Array; vy: Float32Array; va: Float32Array;
  link: number;
  fam: Float32Array;
}

export default function MorphospacePlot() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const axesRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [data, setData] = useState<Data | null>(null);
  const [mode, setMode] = useState<Mode>("dorsal");
  const [family, setFamily] = useState<number | null>(null);
  const [width, setWidth] = useState(0);
  const [tip, setTip] = useState<{ x: number; y: number; text: string; sub: string } | null>(null);
  const [dark, setDark] = useState(false);
  const PALETTE = dark ? PALETTE_DARK : PALETTE_LIGHT;

  const frame = useRef<Frame | null>(null);
  const scales = useRef<{ x: (v: number) => number; y: (v: number) => number } | null>(null);
  const raf = useRef(0);
  const reduced = useRef(false);

  useEffect(() => {
    reduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setDark(isDark());
    const themeObserver = new MutationObserver(() => setDark(isDark()));
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setTip(null);
    window.addEventListener("keydown", onKey);
    fetch("/data/biocosmos/morphospace.json")
      .then((r) => r.json())
      .then(setData)
      .catch(() => setData(null));
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    if (wrapRef.current) ro.observe(wrapRef.current);
    return () => {
      ro.disconnect();
      themeObserver.disconnect();
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  const height = Math.round(Math.min(560, Math.max(320, width * 0.68)));

  // Target positions and opacities for a mode, in pixel space.
  function target(d: Data, m: Mode, fam: number | null): Frame {
    const n = d.species.length;
    const { x, y } = scales.current!;
    const f: Frame = {
      dx: new Float32Array(n), dy: new Float32Array(n), da: new Float32Array(n),
      vx: new Float32Array(n), vy: new Float32Array(n), va: new Float32Array(n),
      link: m === "both" ? 1 : 0,
      fam: new Float32Array(d.families.length).map((_, i) => (fam === null || fam === i ? 1 : 0.06)),
    };
    d.species.forEach(([, , d1, d2, v1, v2], i) => {
      const hasD = d1 !== null && d2 !== null;
      const hasV = v1 !== null && v2 !== null;
      const D = hasD ? [x(d1!), y(d2!)] : [x(v1!), y(v2!)];
      const V = hasV ? [x(v1!), y(v2!)] : D;
      // A paired species morphs from a filled dot (dorsal) into a ring (ventral).
      const dPos = m === "ventral" ? V : D;
      const vPos = m === "dorsal" ? D : V;
      f.dx[i] = dPos[0]; f.dy[i] = dPos[1];
      f.vx[i] = vPos[0]; f.vy[i] = vPos[1];
      f.da[i] = hasD && m !== "ventral" ? 1 : 0;
      f.va[i] = hasV && m !== "dorsal" ? 1 : 0;
    });
    return f;
  }

  function draw(d: Data, f: Frame, alpha: number) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const ctx = canvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    const fg = getComputedStyle(canvas).color;

    if (f.link > 0.01) {
      ctx.strokeStyle = fg;
      ctx.lineWidth = 0.5;
      d.species.forEach(([, fam], i) => {
        if (f.da[i] < 0.01 || f.va[i] < 0.01) return;
        ctx.globalAlpha = 0.12 * f.link * f.fam[fam] * alpha;
        ctx.beginPath();
        ctx.moveTo(f.dx[i], f.dy[i]);
        ctx.lineTo(f.vx[i], f.vy[i]);
        ctx.stroke();
      });
    }
    // Draw the highlighted family last so it sits on top.
    const order = d.species.map((_, i) => i);
    if (family !== null) order.sort((a, b) => Number(d.species[a][1] === family) - Number(d.species[b][1] === family));
    ctx.lineWidth = 1.1;
    for (const i of order) {
      const fam = d.species[i][1];
      const k = f.fam[fam] * alpha;
      ctx.fillStyle = ctx.strokeStyle = PALETTE[fam];
      if (f.da[i] > 0.01) {
        ctx.globalAlpha = 0.72 * f.da[i] * k;
        ctx.beginPath();
        ctx.arc(f.dx[i], f.dy[i], RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
      if (f.va[i] > 0.01) {
        ctx.globalAlpha = 0.8 * f.va[i] * k;
        ctx.beginPath();
        ctx.arc(f.vx[i], f.vy[i], RADIUS, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  function animate(d: Data, to: Frame, fromAlpha = 1) {
    cancelAnimationFrame(raf.current);
    const from = frame.current ?? to;
    const lerp = (a: Float32Array, b: Float32Array, t: number) => a.map((v, i) => v + (b[i] - v) * t);
    const start = performance.now();
    const duration = reduced.current ? 0 : DURATION;
    const step = (now: number) => {
      const t = duration ? Math.min(1, (now - start) / duration) : 1;
      const e = ease(t);
      const cur: Frame = {
        dx: lerp(from.dx, to.dx, e), dy: lerp(from.dy, to.dy, e), da: lerp(from.da, to.da, e),
        vx: lerp(from.vx, to.vx, e), vy: lerp(from.vy, to.vy, e), va: lerp(from.va, to.va, e),
        link: from.link + (to.link - from.link) * e,
        fam: lerp(from.fam, to.fam, e),
      };
      frame.current = cur;
      draw(d, cur, fromAlpha + (1 - fromAlpha) * e);
      if (t < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
  }

  // Axes via Observable Plot; rebuilt when the size changes.
  useEffect(() => {
    if (!data || !width || !axesRef.current || !canvasRef.current) return;
    const pts = data.species.flatMap(([, , a, b, c, d]) => [a, c].map((v, k) => [v, k ? d : b]));
    const xs = pts.map((p) => p[0]).filter((v): v is number => v !== null);
    const ys = pts.map((p) => p[1]).filter((v): v is number => v !== null);
    const pad = (lo: number, hi: number) => [lo - (hi - lo) * 0.03, hi + (hi - lo) * 0.03];
    const plot = Plot.plot({
      width,
      height,
      marginLeft: 46,
      marginBottom: 38,
      marginTop: 14,
      marginRight: 12,
      style: { background: "transparent", color: "currentColor", fontSize: "11px" },
      x: { domain: pad(Math.min(...xs), Math.max(...xs)), label: `PC1 (${data.pcVariance[0].toFixed(1)}%) →`, grid: true, ticks: 6 },
      y: { domain: pad(Math.min(...ys), Math.max(...ys)), label: `↑ PC2 (${data.pcVariance[1].toFixed(1)}%)`, grid: true, ticks: 6 },
      marks: [Plot.frame({ strokeOpacity: 0.15 })],
    });
    axesRef.current.replaceChildren(plot);
    const sx = plot.scale("x")!;
    const sy = plot.scale("y")!;
    scales.current = { x: (v) => sx.apply(v) as number, y: (v) => sy.apply(v) as number };

    const canvas = canvasRef.current;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    const t = target(data, mode, family);
    if (frame.current) {
      frame.current = t;
      draw(data, t, 1);
    } else {
      // First view: fade the points in.
      frame.current = t;
      animate(data, t, 0);
    }
  }, [data, width]);

  useEffect(() => {
    if (data && scales.current) animate(data, target(data, mode, family));
  }, [mode, family]);

  // Repaint in the other palette when the site theme changes.
  useEffect(() => {
    if (data && frame.current) draw(data, frame.current, 1);
  }, [dark]);

  function onMove(e: MouseEvent) {
    const f = frame.current;
    if (!data || !f) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    let best = -1;
    let bestD = 64; // 8 px radius
    let side = "";
    data.species.forEach(([, fam], i) => {
      if (f.fam[fam] < 0.5) return;
      for (const [x, y, a, s] of [[f.dx[i], f.dy[i], f.da[i], "dorsal"], [f.vx[i], f.vy[i], f.va[i], "ventral"]] as const) {
        if (a < 0.5) continue;
        const dd = (x - mx) ** 2 + (y - my) ** 2;
        if (dd < bestD) { bestD = dd; best = i; side = s; }
      }
    });
    if (best < 0) return setTip(null);
    const [name, fam] = data.species[best];
    setTip({ x: mx, y: my, text: name, sub: `${data.families[fam]} · ${side}` });
  }

  const counts = data
    ? {
        dorsal: data.species.filter((s) => s[2] !== null).length,
        ventral: data.species.filter((s) => s[4] !== null).length,
      }
    : null;

  return (
    <div class="bc-plot">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div class="inline-flex rounded-full border border-forest-900/15 p-1 dark:border-forest-100/15" role="group" aria-label="Wing surface">
          {MODES.map((m) => (
            <button
              type="button"
              aria-pressed={mode === m.id}
              onClick={() => setMode(m.id)}
              class={`rounded-full px-3 py-1 text-sm transition-colors duration-500 ${
                mode === m.id
                  ? "bg-forest-600 text-white dark:bg-forest-300 dark:text-forest-950"
                  : "text-forest-800 hover:bg-forest-100 dark:text-forest-200 dark:hover:bg-forest-900"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p class="text-xs text-forest-700 dark:text-forest-300">
          {counts ? `${counts.dorsal.toLocaleString()} dorsal · ${counts.ventral.toLocaleString()} ventral species centroids` : "Loading…"}
          <span class="ml-2">● dorsal ○ ventral</span>
        </p>
      </div>

      <div ref={wrapRef} class="relative w-full text-forest-900 dark:text-forest-100" style={{ height: `${height}px` }} onMouseMove={onMove} onMouseLeave={() => setTip(null)}>
        <div ref={axesRef} class="absolute inset-0" aria-hidden="true" />
        <canvas
          ref={canvasRef}
          class="absolute left-0 top-0"
          role="img"
          aria-label={`Scatter plot of butterfly species in a two-dimensional principal component space of image embeddings, colored by family.${
            data
              ? ` ${data.families
                  .map((name, i) => {
                    const rows = data.species.filter((sp) => sp[1] === i);
                    return `${name}: ${rows.filter((sp) => sp[2] !== null).length} dorsal, ${rows.filter((sp) => sp[4] !== null).length} ventral species`;
                  })
                  .join("; ")}.`
              : ""
          }`}
        />
        {tip && (
          <div
            class="pointer-events-none absolute z-10 rounded-lg bg-white/95 px-2.5 py-1.5 text-xs shadow-md ring-1 ring-forest-900/10 dark:bg-forest-950/95 dark:ring-forest-100/10"
            style={{ left: `${Math.min(tip.x + 12, width - 180)}px`, top: `${Math.max(tip.y - 44, 0)}px` }}
          >
            <div class="font-semibold italic">{tip.text}</div>
            <div class="text-forest-700 dark:text-forest-300">{tip.sub}</div>
          </div>
        )}
      </div>

      {data && (
        <div class="mt-3 flex flex-wrap gap-2" aria-label="Highlight a family">
          {data.families.map((name, i) => (
            <button
              type="button"
              aria-pressed={family === i}
              onClick={() => setFamily(family === i ? null : i)}
              class={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs transition-opacity duration-500 ${
                family === null || family === i ? "opacity-100" : "opacity-50"
              } border-forest-900/15 text-forest-900 hover:bg-forest-50 dark:border-forest-100/15 dark:text-forest-100 dark:hover:bg-forest-900`}
            >
              <span class="h-2.5 w-2.5 rounded-full" style={{ background: PALETTE[i] }} />
              {name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
