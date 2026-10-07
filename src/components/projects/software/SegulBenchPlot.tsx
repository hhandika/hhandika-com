// SEGUL benchmarks from segul-bench (results/mean_bench_by_dataset.csv,
// copied to src/data/segul/bench.json by scripts/build-segul-bench.mjs).
// Means of 5 replicates on a Linux desktop; mobile GUI runs were timed by hand.
// Observable Plot renders each view; CSS in plots.css animates it in.
import * as Plot from "@observablehq/plot";
import { useEffect, useRef, useState } from "preact/hooks";
import ViewToggle from "../biocosmos/ViewToggle";
import bench from "../../../data/segul/bench.json";
import "../biocosmos/plots.css";

type View = "time" | "ram" | "cpu" | "mobile";
type Row = (typeof bench.rows)[number];
const VIEWS: { id: View; label: string }[] = [
  { id: "mobile", label: "GUI vs CLI" },
  { id: "time", label: "Runtime" },
  { id: "ram", label: "Memory" },
  { id: "cpu", label: "CPU × memory" },
];

const SEGUL = "#688a2c"; // moss-600
const OTHER = "#8199a2"; // mist-400
const color = (app: string) => (app.startsWith("SEGUL") ? SEGUL : OTHER);

// CPU × memory view: every desktop run with CPU data, colored by tool family.
// The GUI runs have no CPU usage, so only command-line tools and the API appear.
const FAMILIES = [
  { id: "SEGUL", color: "#688a2c" }, // moss-600
  { id: "AMAS", color: "#637c86" }, // mist-500
  { id: "goalign", color: "#d95f02" }, // ColorBrewer Dark2
  { id: "Phyluce", color: "#7570b3" }, // ColorBrewer Dark2
];
const family = (app: string) => app.split(" ")[0];
const familyColor = (app: string) => FAMILIES.find((f) => f.id === family(app))!.color;
const cpuRuns = bench.rows.filter((r) => r.cpu !== null && r.ram !== null);
const median = (xs: number[]) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];

// GUI vs CLI view: the same SEGUL core through its command line and its GUI
// on each platform, NEXUS input only.
const PLATFORMS = [
  { app: "SEGUL CLI", label: "CLI (Linux)", color: "#688a2c" }, // moss-600
  { app: "SEGUL GUI (Linux)", label: "GUI (Linux)", color: "#9bbf4f" }, // moss-400
  { app: "SEGUL GUI (iPadOS)", label: "GUI (iPadOS)", color: "#637c86" }, // mist-500
  { app: "SEGUL GUI (Android)", label: "GUI (Android)", color: "#a9bcc2" }, // mist-300
];
const MOBILE_SETS = [...new Set(bench.rows.filter((r) => r.mobile).map((r) => r.dataset))];

const short = (task: string) => task.replace(/^Alignment /, "");
const fmtTime = (s: number) => `${s < 10 ? s.toFixed(2) : s < 100 ? s.toFixed(1) : Math.round(s)} s`;
const fmtRam = (mb: number) => (mb >= 1000 ? `${(mb / 1000).toFixed(1)} GB` : `${Math.round(mb)} MB`);
const datasetInfo = (id: string) => bench.datasets.find((d) => d.id === id)!;

// Below this width the scatter plot scrolls sideways rather than squeezing its x-axis.
const MIN_SCATTER_WIDTH = 480;

const logTicks = (lo: number, hi: number, steps: number[]) => {
  const out: number[] = [];
  for (let d = lo; d <= hi; d *= 10) for (const k of steps) if (d * k <= hi) out.push(Number((d * k).toPrecision(2)));
  return out;
};

// Native arrows sit flush against the pill's rounded edge, so draw our own.
const selectClasses =
  "cursor-pointer appearance-none rounded-full border border-forest-900/15 bg-transparent py-1.5 pl-4 pr-9 text-sm text-forest-900 dark:border-forest-100/15 dark:bg-forest-950 dark:text-forest-100";
const Chevron = () => (
  <svg
    class="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest-700 dark:text-forest-300"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    stroke-width="1.75"
    aria-hidden="true"
  >
    <path d="m6 8 4 4 4-4" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

export default function SegulBenchPlot() {
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>("mobile");
  const [task, setTask] = useState(bench.tasks[0]);
  const [cpuTask, setCpuTask] = useState("all");
  const [format, setFormat] = useState("NEXUS");
  const [dataset, setDataset] = useState(bench.datasets[0].id);
  const [width, setWidth] = useState(0);

  // The mobile runs cover two datasets only; fall back to the largest.
  const mobileSet = MOBILE_SETS.includes(dataset) ? dataset : MOBILE_SETS[0];
  const metric = view === "ram" ? "ram" : "time";
  const fmt = view === "ram" ? fmtRam : fmtTime;
  const bars: Row[] = bench.rows
    .filter((r) => r.task === task && r.format === format && r.dataset === dataset && r[metric] !== null)
    .sort((a, b) => a[metric]! - b[metric]!);
  const mobile = bench.rows
    .filter((r) => r.format === "NEXUS" && r.dataset === mobileSet && PLATFORMS.some((p) => p.app === r.app))
    .map((r) => ({
      ...r,
      task: short(r.task),
      platform: PLATFORMS.find((p) => p.app === r.app)!.label,
    }));
  const points = cpuRuns.filter((r) => cpuTask === "all" || r.task === cpuTask);
  const datasets = view === "mobile" ? MOBILE_SETS : bench.datasets.map((d) => d.id);

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!ref.current || !width) return;
    const narrow = width < 560;
    const style = {
      background: "transparent",
      color: "currentColor",
      fontSize: "12px",
    };
    let plot: (SVGSVGElement | HTMLElement) & Plot.Plot;

    if (view === "cpu") {
      // Pad the data range rather than snapping to whole decades, which left a
      // blank band at the low end.
      const lo = Math.min(...points.map((r) => r.cpu!)) / 1.4;
      const hi = Math.max(...points.map((r) => r.cpu!)) * 1.4;
      const decade = 10 ** Math.floor(Math.log10(lo));
      plot = Plot.plot({
        width: Math.max(width, MIN_SCATTER_WIDTH),
        height: narrow ? 340 : 400,
        marginLeft: 52,
        marginRight: 16,
        marginTop: 24,
        style,
        x: {
          type: "log",
          domain: [lo, hi],
          grid: true,
          label: "CPU time (s, log scale) →",
          ticks: logTicks(decade, hi, narrow ? [1] : [1, 2, 5]).filter((t) => t >= lo),
          tickFormat: (v: number) => (v >= 1000 ? `${v / 1000}k` : `${v}`),
        },
        y: {
          domain: [0, Math.ceil(Math.max(...points.map((r) => r.ram!)) / 500) * 500],
          grid: true,
          label: "↑ Peak memory (MB)",
        },
        marks: [
          Plot.dot(points, {
            x: "cpu",
            y: "ram",
            fill: (d) => familyColor(d.app),
            // Variants of a tool share its color; hollow dots mark non-default options.
            stroke: (d) => familyColor(d.app),
            fillOpacity: (d) => (/\(--|v0\.21|API|multi-core/.test(d.app) ? 0 : 0.75),
            strokeWidth: 1.5,
            r: narrow ? 3.5 : 4.5,
          }),
          Plot.tip(
            points,
            Plot.pointer({
              x: "cpu",
              y: "ram",
              title: (d) =>
                `${d.app}\n${d.task} (${d.format})\n${d.dataset}\nCPU ${fmtTime(d.cpu!)} · wall ${fmtTime(d.time!)} · ${fmtRam(d.ram!)}`,
            }),
          ),
        ],
      });
    } else if (view !== "mobile") {
      // Log scale: tools span 1 s to several minutes. Bars start at the axis floor.
      const values = bars.flatMap((r) => [r[metric]! - (r[`${metric}Sd`] ?? 0), r[metric]! + (r[`${metric}Sd`] ?? 0)]);
      const lo = 10 ** Math.floor(Math.log10(Math.max(Math.min(...values), metric === "ram" ? 10 : 0.01)));
      const hi = 10 ** Math.ceil(Math.log10(Math.max(...values) * 1.6));
      plot = Plot.plot({
        width,
        height: bars.length * (narrow ? 38 : 30) + 50,
        marginLeft: narrow ? 118 : 200,
        marginRight: 16,
        // Room for the axis label below the tick labels, so they don't overlap.
        marginBottom: 40,
        style,
        x: {
          type: "log",
          domain: [lo, hi],
          grid: true,
          label: metric === "ram" ? "Peak memory (MB, log scale) →" : "Wall-clock time (s, log scale) →",
          // 1-2-5 ticks per decade (decades only on phones) keep labels apart.
          ticks: logTicks(lo, hi, narrow ? [1] : [1, 2, 5]),
          tickFormat: (v: number) => (v >= 1000 ? `${v / 1000}k` : `${v}`),
        },
        y: { domain: bars.map((r) => r.app), label: null },
        marks: [
          // Wrap long tool names (e.g. "SEGUL CLI (--datatype ignore)") on phones.
          Plot.axisY({ lineWidth: narrow ? 9 : 20, label: null }),
          Plot.barX(bars, {
            x1: lo,
            x2: metric,
            y: "app",
            fill: (d) => color(d.app),
            rx: 4,
            insetTop: 5,
            insetBottom: 5,
          }),
          Plot.ruleY(bars, {
            y: "app",
            x1: (d) => Math.max(lo, d[metric] - (d[`${metric}Sd`] ?? 0)),
            x2: (d) => d[metric] + (d[`${metric}Sd`] ?? 0),
            stroke: "currentColor",
            strokeOpacity: 0.6,
          }),
          Plot.text(bars, {
            x: (d) => d[metric] + (d[`${metric}Sd`] ?? 0),
            y: "app",
            text: (d) => fmt(d[metric]),
            dx: 6,
            textAnchor: "start",
            fontWeight: 600,
          }),
        ],
      });
    } else {
      const tasks = bench.tasks.map(short);
      plot = Plot.plot({
        width,
        height: tasks.length * PLATFORMS.length * (narrow ? 20 : 18) + tasks.length * 14 + 50,
        marginLeft: narrow ? 96 : 124,
        marginRight: 56,
        marginBottom: 40,
        style,
        x: {
          grid: true,
          label: "Wall-clock time (s) →",
          ticks: narrow ? 4 : undefined,
        },
        y: { domain: PLATFORMS.map((p) => p.label), label: null, axis: null },
        fy: { domain: tasks, label: null },
        color: {
          domain: PLATFORMS.map((p) => p.label),
          range: PLATFORMS.map((p) => p.color),
        },
        marks: [
          // Wrap "Sequence Removal" onto two lines on phones so it fits the margin.
          Plot.axisFy({ anchor: "left", lineWidth: narrow ? 7 : 20, label: null }),
          Plot.barX(mobile, {
            x: "time",
            y: "platform",
            fy: "task",
            fill: "platform",
            rx: 3,
            insetTop: 2,
            insetBottom: 2,
          }),
          Plot.text(mobile, {
            x: "time",
            y: "platform",
            fy: "task",
            text: (d) => fmtTime(d.time),
            dx: 5,
            textAnchor: "start",
            fontSize: 11,
          }),
          Plot.ruleX([0]),
        ],
      });
    }

    plot.classList.add("bc-anim", `sb-${view}`);
    // Let the scatter plot keep its minimum width; the container scrolls.
    if (view === "cpu") plot.style.maxWidth = "none";
    // The container carries the accessible name with every value.
    plot.setAttribute("aria-hidden", "true");
    const stagger = (mark: string, sel: string, delay: (i: number) => number) =>
      plot.querySelectorAll<SVGElement>(`g[aria-label="${mark}"] ${sel}`).forEach((el, i) => el.style.setProperty("--d", `${delay(i)}ms`));
    stagger("dot", "circle", (i) => Math.min(i * 6, 1200));
    stagger("bar", "rect", (i) => i * (view === "mobile" ? 60 : 120));
    stagger("text", "text", (i) => 500 + i * (view === "mobile" ? 60 : 120));
    ref.current.replaceChildren(plot);
  }, [view, task, cpuTask, format, dataset, width]);

  // Linux GUI time over CLI time per task, for the caption.
  const guiRatio = bench.tasks.map((t) => {
    const at = (app: string) => mobile.find((r) => r.app === app && r.task === short(t))!.time!;
    return at("SEGUL GUI (Linux)") / at("SEGUL CLI");
  });
  const info = datasetInfo(view === "mobile" ? mobileSet : dataset);
  const setLabel = `${info.id} (${info.mbases} Mb, ${info.datatype})`;
  const fastest = bars[0];
  const amas = bars.find((r) => r.app === "AMAS");
  const segulCli = bars.find((r) => r.app === "SEGUL CLI");
  const ratio = amas && segulCli ? amas[metric]! / segulCli[metric]! : null;
  const families = FAMILIES.map((f) => {
    const runs = points.filter((r) => family(r.app) === f.id);
    return {
      ...f,
      runs,
      cpu: runs.length ? median(runs.map((r) => r.cpu!)) : null,
      ram: runs.length ? median(runs.map((r) => r.ram!)) : null,
    };
  }).filter((f) => f.runs.length);
  const segulFam = families.find((f) => f.id === "SEGUL");
  const amasFam = families.find((f) => f.id === "AMAS");
  const summary =
    view === "cpu"
      ? `CPU time against peak memory for ${points.length} desktop runs, ${cpuTask === "all" ? "all tasks" : cpuTask.toLowerCase()}. Median per tool family: ${families
          .map((f) => `${f.id} ${fmtTime(f.cpu!)} CPU and ${fmtRam(f.ram!)} over ${f.runs.length} runs`)
          .join("; ")}.`
      : view === "mobile"
        ? `SEGUL CLI and GUI runtime by platform, NEXUS input, ${setLabel}. ${bench.tasks
            .map(short)
            .map(
              (t) =>
                `${t}: ${mobile
                  .filter((r) => r.task === t)
                  .map((r) => `${r.platform} ${fmtTime(r.time)}`)
                  .join(", ")}`,
            )
            .join("; ")}.`
        : `${view === "ram" ? "Peak memory" : "Runtime"} for ${short(task).toLowerCase()} of ${format} alignments, ${setLabel}, fastest first: ${bars
            .map((r) => `${r.app} ${fmt(r[metric]!)}`)
            .join(", ")}.`;

  const legend =
    view === "cpu"
      ? FAMILIES.map((f) => ({ label: f.id, color: f.color }))
      : view === "mobile"
        ? PLATFORMS.map((p) => ({ label: p.label, color: p.color }))
        : [
            { label: "SEGUL", color: SEGUL },
            { label: "other tools", color: OTHER },
          ];

  return (
    <div class="bc-plot">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <ViewToggle label="Benchmark view" options={VIEWS} value={view} onChange={setView} />
        <p class="flex flex-wrap items-center gap-3 text-xs text-forest-700 dark:text-forest-300">
          {legend.map((l) => (
            <span class="inline-flex items-center gap-1">
              <span class="h-2.5 w-2.5 rounded-full" style={{ background: l.color }} /> {l.label}
            </span>
          ))}
        </p>
      </div>
      <div class="mb-3 flex flex-wrap gap-2 text-sm">
        {view === "cpu" && (
          <>
            <label class="sr-only" for="sb-cpu-task">
              Task
            </label>
            <span class="relative inline-flex">
              <select id="sb-cpu-task" class={selectClasses} value={cpuTask} onChange={(e) => setCpuTask(e.currentTarget.value)}>
                <option value="all">All tasks</option>
                {bench.tasks.map((t) => (
                  <option value={t}>{t}</option>
                ))}
              </select>
              <Chevron />
            </span>
          </>
        )}
        {(view === "time" || view === "ram") && (
          <>
            <label class="sr-only" for="sb-task">
              Task
            </label>
            <span class="relative inline-flex">
              <select id="sb-task" class={selectClasses} value={task} onChange={(e) => setTask(e.currentTarget.value)}>
                {bench.tasks.map((t) => (
                  <option value={t}>{t}</option>
                ))}
              </select>
              <Chevron />
            </span>
            <label class="sr-only" for="sb-format">
              Input format
            </label>
            <span class="relative inline-flex">
              <select id="sb-format" class={selectClasses} value={format} onChange={(e) => setFormat(e.currentTarget.value)}>
                {bench.formats.map((f) => (
                  <option value={f}>{f}</option>
                ))}
              </select>
              <Chevron />
            </span>
          </>
        )}
        {view !== "cpu" && (
          <>
            <label class="sr-only" for="sb-dataset">
              Dataset
            </label>
            <span class="relative inline-flex">
              <select
                id="sb-dataset"
                class={selectClasses}
                value={view === "mobile" ? mobileSet : dataset}
                onChange={(e) => setDataset(e.currentTarget.value)}
              >
                {datasets.map((id) => {
                  const d = datasetInfo(id);
                  return <option value={id}>{`${id} · ${d.mbases} Mb ${d.datatype}`}</option>;
                })}
              </select>
              <Chevron />
            </span>
          </>
        )}
      </div>
      <div ref={ref} class="w-full overflow-x-auto text-forest-900 dark:text-forest-100" role="img" aria-label={summary} />
      <p class="mt-2 text-xs text-forest-700 dark:text-forest-300">
        {view === "time" &&
          `Mean of ${bench.replicates} runs, line = ±1 SD. ${fastest ? `${fastest.app} was fastest (${fmtTime(fastest.time!)})` : ""}${
            ratio && ratio > 1 ? `; SEGUL CLI ran ${ratio.toFixed(1)}× faster than AMAS` : ""
          }. Desktop runs on an ${bench.machine}; mobile GUI runs were timed by hand.`}
        {view === "ram" &&
          `Peak resident memory, mean of ${bench.replicates} runs.${
            ratio && ratio > 1 ? ` SEGUL CLI used ${ratio.toFixed(1)}× less memory than AMAS.` : ""
          } Memory was not recorded for the iPadOS and Android runs.`}
        {view === "cpu" &&
          `Each dot is one tool on one task, input format, and dataset (mean of ${bench.replicates} runs); hollow dots are option or API variants. CPU time is wall-clock time × CPU use, so multithreading counts in full. Lower left is better.${
            segulFam && amasFam
              ? ` Median SEGUL run: ${fmtTime(segulFam.cpu!)} CPU and ${fmtRam(segulFam.ram!)}; AMAS: ${fmtTime(amasFam.cpu!)} and ${fmtRam(amasFam.ram!)}.`
              : ""
          } GUI runs are left out: CPU use was not recorded.`}
        {view === "mobile" &&
          `The GUI calls the same Rust core as the command line. On the same Linux desktop it took ${Math.min(...guiRatio).toFixed(1)}–${Math.max(...guiRatio).toFixed(1)}× the command-line time across the five tasks. The iPad and Android runs are slower because of the hardware, yet still finish ${info.mbases} Mb of alignments in seconds.`}
      </p>
    </div>
  );
}
