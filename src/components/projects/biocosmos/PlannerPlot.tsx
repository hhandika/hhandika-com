// LLM query-planner benchmark from BioCosmos (plannerbench run
// 9b24daaa, copied to src/data/biocosmos/planner.json). Each open-weight
// model turns a natural-language search into tool calls; 18 query types × 5
// repeats. Observable Plot renders each view; CSS in plots.css animates it in.
import * as Plot from "@observablehq/plot";
import { useEffect, useRef, useState } from "preact/hooks";
import planner from "../../../data/biocosmos/planner.json";
import "./plots.css";

type View = "accuracy" | "speed" | "cases";
const VIEWS: { id: View; label: string }[] = [
  { id: "accuracy", label: "Accuracy" },
  { id: "speed", label: "Speed vs accuracy" },
  { id: "cases", label: "By query type" },
];

const PROD = "#e08b1b"; // sunrise-500
const OTHER = "#788d36"; // moss-500

const models = [...planner.models].sort((a, b) => b.accuracy - a.accuracy);
const order = models.map((m) => m.model);
const color = (m: string) => (m === planner.productionModel ? PROD : OTHER);
const caseLabel = (c: string) => c.replace(/-/g, " ");
const cells = models.flatMap((m) =>
  planner.cases.map((c, j) => ({ model: m.model, case: caseLabel(c), accuracy: (m.perCase as Record<string, number>)[c], j })),
);

export default function PlannerPlot() {
  const ref = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>("accuracy");
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const ro = new ResizeObserver(([e]) => setWidth(Math.round(e.contentRect.width)));
    if (ref.current) ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!ref.current || !width) return;
    const narrow = width < 560;
    const style = { background: "transparent", color: "currentColor", fontSize: "12px" };
    let plot: (SVGSVGElement | HTMLElement) & Plot.Plot;

    if (view === "accuracy") {
      plot = Plot.plot({
        width,
        height: 260,
        marginLeft: narrow ? 150 : 180,
        marginRight: 48,
        style,
        x: { domain: [0, 1], tickFormat: "%", label: null, grid: true },
        y: { domain: order, label: null },
        marks: [
          Plot.barX(models, { x: "accuracy", y: "model", fill: (d) => color(d.model), rx: 4, insetTop: 6, insetBottom: 6 }),
          Plot.text(models, {
            x: "accuracy",
            y: "model",
            text: (d) => `${Math.round(d.accuracy * 100)}%`,
            dx: 6,
            textAnchor: "start",
            fontWeight: 600,
          }),
          Plot.ruleX([0]),
        ],
      });
    } else if (view === "speed") {
      plot = Plot.plot({
        width,
        height: 320,
        marginLeft: 48,
        marginRight: 24,
        marginTop: 24,
        style,
        x: { domain: [0, 4.4], label: "Latency (s) →", grid: true },
        y: { domain: [0.4, 1.05], tickFormat: "%", label: "↑ Accuracy", grid: true },
        r: { domain: [0, 3200], range: [0, 14] },
        marks: [
          Plot.link(models, {
            x1: "latencyP50",
            x2: "latencyP95",
            y1: "accuracy",
            y2: "accuracy",
            stroke: (d) => color(d.model),
            strokeWidth: 2.5,
            strokeOpacity: 0.55,
          }),
          Plot.dot(models, {
            x: "latencyP50",
            y: "accuracy",
            r: "tokensPerCall",
            fill: (d) => color(d.model),
            fillOpacity: 0.9,
            stroke: "currentColor",
            strokeOpacity: 0.25,
          }),
          // gpt-oss-20b and nemotron share 51%; label nemotron to the left to keep them apart.
          ...[false, true].map((left) =>
            Plot.text(
              models.filter((d) => d.model.startsWith("nemotron") === left),
              {
                x: "latencyP50",
                y: "accuracy",
                text: "model",
                dy: -18,
                dx: left ? 10 : -10,
                textAnchor: left ? "end" : "start",
                fontSize: narrow ? 10 : 11.5,
              },
            ),
          ),
        ],
      });
    } else {
      plot = Plot.plot({
        width: Math.max(width, 820),
        height: 350,
        marginLeft: 170,
        marginBottom: 150,
        marginTop: 8,
        style,
        padding: 0.06,
        x: { domain: planner.cases.map(caseLabel), tickRotate: -45, label: null },
        y: { domain: order, label: null },
        color: { domain: [0, 1], range: ["#fbefc9", "#475622"], interpolate: "rgb" },
        marks: [
          Plot.cell(cells, { x: "case", y: "model", fill: "accuracy", rx: 3, title: (d) => `${d.model}\n${d.case}: ${Math.round(d.accuracy * 100)}% correct (${Math.round(d.accuracy * planner.repeats)}/${planner.repeats} runs)` }),
          Plot.text(cells, {
            x: "case",
            y: "model",
            text: (d) => `${Math.round(d.accuracy * 100)}%`,
            fill: (d) => (d.accuracy > 0.55 ? "white" : "#3a4520"),
            fontSize: 9.5,
          }),
        ],
      });
    }

    plot.classList.add("bc-anim", `bc-${view}`);
    // Keep the heatmap readable on phones: scroll sideways instead of shrinking.
    if (view === "cases") plot.style.maxWidth = "none";
    // Stagger the entrance: bars and dots by row, heatmap cells by column.
    const stagger = (mark: string, sel: string, delay: (i: number) => number) =>
      plot
        .querySelectorAll<SVGElement>(`g[aria-label="${mark}"] ${sel}`)
        .forEach((el, i) => el.style.setProperty("--d", `${delay(i)}ms`));
    stagger("bar", "rect", (i) => i * 160);
    stagger("link", ":is(path, line)", (i) => 300 + i * 200);
    plot.querySelectorAll('g[aria-label="link"] :is(path, line)').forEach((el) => el.setAttribute("pathLength", "1"));
    stagger("dot", "circle", (i) => i * 200);
    stagger("cell", "rect", (i) => (i % planner.cases.length) * 60);
    stagger("text", "text", (i) => (view === "cases" ? (i % planner.cases.length) * 60 + 200 : 600 + i * 160));
    ref.current.replaceChildren(plot);
  }, [view, width]);

  const prod = models.find((m) => m.model === planner.productionModel)!;

  return (
    <div class="bc-plot">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div class="inline-flex flex-wrap rounded-full border border-moss-900/15 p-1 dark:border-moss-100/15" role="tablist" aria-label="Benchmark view">
          {VIEWS.map((v) => (
            <button
              type="button"
              role="tab"
              aria-selected={view === v.id}
              onClick={() => setView(v.id)}
              class={`rounded-full px-3 py-1 text-sm transition-colors duration-500 ${
                view === v.id
                  ? "bg-moss-600 text-white dark:bg-moss-300 dark:text-moss-950"
                  : "text-moss-800 hover:bg-moss-100 dark:text-moss-200 dark:hover:bg-moss-900"
              }`}
            >
              {v.label}
            </button>
          ))}
        </div>
        <p class="flex items-center gap-3 text-xs text-moss-700 dark:text-moss-300">
          <span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-full" style={{ background: PROD }} /> in production</span>
          <span class="inline-flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-full" style={{ background: OTHER }} /> evaluated</span>
        </p>
      </div>
      <div ref={ref} class="w-full overflow-x-auto text-moss-900 dark:text-moss-100" role="img" aria-label={`LLM planner benchmark, ${view} view`} />
      <p class="mt-2 text-xs text-moss-700 dark:text-moss-300">
        {view === "accuracy" &&
          `Share of correct tool calls over ${planner.cases.length} query types × ${planner.repeats} repeats per model. ${prod.model} answered all ${prod.trials} correctly and stayed consistent on ${prod.consistentCases} of ${planner.cases.length} query types.`}
        {view === "speed" &&
          `Dot = median latency, line = 95th percentile, dot size = tokens per call. ${prod.model}: median ${prod.latencyP50} s, ${prod.tokensPerCall.toLocaleString()} tokens per call, the fastest and most accurate model tested.`}
        {view === "cases" && `Share of correct runs per query type (${planner.repeats} repeats each). Weaker models fail mostly on combined queries such as color + country, usually by answering without calling a search tool.`}
      </p>
    </div>
  );
}
