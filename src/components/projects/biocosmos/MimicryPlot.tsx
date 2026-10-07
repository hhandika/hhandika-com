// Mimicry recovery from the BioCosmos analyses (notebooks/mimicry.ipynb,
// copied to src/data/biocosmos/mimicry.json by scripts/build-mimicry.mjs).
// Each published pair is queried in both directions: where does the partner
// rank among all species by visual similarity of dorsal or ventral centroids?
// The rank view is HTML so dots slide between sides; Observable Plot draws the
// permutation tests and plots.css animates them in.
import * as Plot from "@observablehq/plot";
import { useEffect, useRef, useState } from "preact/hooks";
import mimicry from "../../../data/biocosmos/mimicry.json";
import "./plots.css";

type View = "ranks" | "tests";
type Side = "dorsal" | "ventral" | "both";
type Pair = (typeof mimicry.pairs)[number];
type Rank = Pair["ranks"][number];

const VIEWS: { id: View; label: string }[] = [
  { id: "ranks", label: "Mimicry pairs" },
  { id: "tests", label: "Permutation tests" },
];
const SIDES: { id: Side; label: string }[] = [
  { id: "dorsal", label: "Dorsal" },
  { id: "ventral", label: "Ventral" },
  { id: "both", label: "Both sides" },
];

// ColorBrewer Dark2, as in the publication figure and the morphospace.
const COLOR = { dorsal: "#1b9e77", ventral: "#d95f02" };
const NULL_COLOR = "#8199a2"; // mist-400

const species = mimicry.counts.speciesRanked - 1; // species compared per query
const chance = species / 2;
const DOMAIN = [0.75, 12000];
const TICKS = [1, 10, 100, 1000, 10000];
const pos = (rank: number) =>
  ((Math.log10(rank) - Math.log10(DOMAIN[0])) /
    (Math.log10(DOMAIN[1]) - Math.log10(DOMAIN[0]))) *
  100;

const short = (name: string) => name.replace(/^(\w)\w+ /, "$1. ");

function mutual(p: Pair, side: Side) {
  return side === "both" ? p.recovered : p.mutual[side];
}

// Vertical position of a dot inside its row, in percent.
function lane(r: Rank, side: Side) {
  if (side === "both") return r.side === "dorsal" ? 32 : 68;
  return 50;
}

export default function MimicryPlot() {
  const testsRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState<View>("ranks");
  const [side, setSide] = useState<Side>("both");
  const [open, setOpen] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [width, setWidth] = useState(0);

  // Let the dots slide in from the left once the figure is mounted.
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setReady(true)),
    );
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (view !== "tests" || !testsRef.current) return;
    const ro = new ResizeObserver(([e]) =>
      setWidth(Math.round(e.contentRect.width)),
    );
    ro.observe(testsRef.current);
    return () => ro.disconnect();
  }, [view]);

  useEffect(() => {
    if (view !== "tests" || !testsRef.current || !width) return;
    const narrow = width < 560;
    const rows = mimicry.permutations.map((p) => ({
      ...p,
      row: `${p.side === "dorsal" ? "Dorsal" : "Ventral"} · ${p.null}`,
    }));
    const plot = Plot.plot({
      width,
      height: 260,
      marginLeft: narrow ? 120 : 150,
      marginRight: narrow ? 64 : 80,
      marginBottom: 40,
      style: {
        background: "transparent",
        color: "currentColor",
        fontSize: "12px",
      },
      x: {
        domain: [0.3, 1.02],
        label: "Mean partner percentile (1 = nearest) →",
        grid: true,
      },
      y: { domain: rows.map((r) => r.row), label: null },
      marks: [
        Plot.link(rows, {
          x1: "low",
          x2: "high",
          y1: "row",
          y2: "row",
          stroke: NULL_COLOR,
          strokeWidth: 4,
          strokeOpacity: 0.8,
          strokeLinecap: "round",
        }),
        Plot.dot(rows, {
          x: "mean",
          y: "row",
          r: 4.5,
          fill: NULL_COLOR,
          title: (d) =>
            `${d.row} null: mean ${d.mean.toFixed(2)}, 95% ${d.low.toFixed(2)}–${d.high.toFixed(2)} (${d.permutations.toLocaleString()} permutations)`,
        }),
        Plot.dot(rows, {
          x: "observed",
          y: "row",
          r: 7,
          symbol: "diamond",
          fill: (d) => COLOR[d.side as "dorsal" | "ventral"],
          stroke: "currentColor",
          strokeOpacity: 0.3,
          title: (d) =>
            `Observed mean percentile ${d.observed.toFixed(3)} over ${d.queries} queries`,
        }),
        Plot.text(rows, {
          x: "observed",
          y: "row",
          text: (d) =>
            `p ≤ ${(1 / (d.permutations + 1)).toFixed(4).replace(/0+$/, "")}`,
          dx: 12,
          textAnchor: "start",
          fontWeight: 600,
          fontSize: narrow ? 10 : 11.5,
        }),
      ],
    });
    plot.classList.add("bc-anim");
    plot.setAttribute("aria-hidden", "true");
    plot
      .querySelectorAll('g[aria-label="link"] :is(path, line)')
      .forEach((el, i) => {
        el.setAttribute("pathLength", "1");
        (el as SVGElement).style.setProperty("--d", `${i * 180}ms`);
      });
    plot
      .querySelectorAll<SVGElement>('g[aria-label="dot"] :is(circle, path)')
      .forEach((el, i) =>
        el.style.setProperty("--d", `${300 + (i % 4) * 180}ms`),
      );
    plot
      .querySelectorAll<SVGElement>('g[aria-label="text"] text')
      .forEach((el, i) => el.style.setProperty("--d", `${900 + i * 180}ms`));
    testsRef.current.replaceChildren(plot);
  }, [view, width]);

  const shown = (r: Rank) => side === "both" || r.side === side;
  const recovered = mimicry.pairs.filter((p) => mutual(p, side)).length;
  const dorsal = mimicry.permutations.find(
    (p) => p.side === "dorsal" && p.null === "Random",
  )!;
  const ventral = mimicry.permutations.find(
    (p) => p.side === "ventral" && p.null === "Random",
  )!;
  const congeners = mimicry.permutations.filter((p) => p.null === "Congeners");

  const tabClasses = (active: boolean) =>
    `rounded-full px-3 py-1 text-sm transition-colors duration-500 ${
      active
        ? "bg-forest-600 text-white dark:bg-forest-300 dark:text-forest-950"
        : "text-forest-800 hover:bg-forest-100 dark:text-forest-200 dark:hover:bg-forest-900"
    }`;

  return (
    <div class="bc-plot">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div
          class="inline-flex flex-wrap rounded-full border border-forest-900/15 p-1 dark:border-forest-100/15"
          role="group"
          aria-label="Mimicry view"
        >
          {VIEWS.map((v) => (
            <button
              type="button"
              aria-pressed={view === v.id}
              onClick={() => setView(v.id)}
              class={tabClasses(view === v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
        {view === "ranks" && (
          <div
            class="inline-flex flex-wrap rounded-full border border-forest-900/15 p-1 dark:border-forest-100/15"
            role="group"
            aria-label="Wing surface"
          >
            {SIDES.map((s) => (
              <button
                type="button"
                aria-pressed={side === s.id}
                onClick={() => setSide(s.id)}
                class={tabClasses(side === s.id)}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Keys stop Preact from reusing one div for both views, which would
          leave the Plot SVG (added outside Preact) behind in the ranks view. */}
      {view === "ranks" ? (
        <div key="ranks" class="text-forest-900 dark:text-forest-100">
          <p class="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-forest-700 dark:text-forest-300">
            <span class="inline-flex items-center gap-1">
              <span
                class="h-2.5 w-2.5 rounded-full"
                style={{ background: COLOR.dorsal }}
              />{" "}
              dorsal
            </span>
            <span class="inline-flex items-center gap-1">
              <span
                class="h-2.5 w-2.5 rounded-full"
                style={{ background: COLOR.ventral }}
              />{" "}
              ventral
            </span>
            <span>● first species queries · ○ second species queries</span>
            <span class="inline-flex items-center gap-1">
              <span class="h-2.5 w-4 rounded-sm bg-amber-200/70 dark:bg-amber-400/25" />{" "}
              mutual top 10
            </span>
          </p>

          <ul
            class="divide-y divide-forest-900/10 dark:divide-forest-100/10"
            aria-label="Partner rank of each published mimicry pair"
          >
            {mimicry.pairs.map((p, i) => {
              const isOpen = open === p.pair;
              const hit = mutual(p, side);
              return (
                <li
                  class={`transition-colors duration-700 ${hit ? "bg-amber-100/70 dark:bg-amber-400/10" : ""}`}
                >
                  <div class="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1 px-2 py-2 sm:grid-cols-[minmax(0,17rem)_1fr]">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? null : p.pair)}
                      class="col-span-2 flex items-center gap-2 rounded-lg text-left hover:bg-forest-900/5 dark:hover:bg-white/5 sm:col-span-1"
                    >
                      <span class="flex shrink-0">
                        {[p.a, p.b].map((m) => (
                          <img
                            src={m.image}
                            alt={`${m.accepted}, dorsal`}
                            width={44}
                            height={44}
                            loading="lazy"
                            class="h-11 w-11 object-contain"
                          />
                        ))}
                      </span>
                      <span
                        class={`text-sm leading-tight ${hit ? "font-semibold" : ""}`}
                      >
                        <i>{short(p.a.published)}</i> –{" "}
                        <i>{short(p.b.published)}</i>
                        <span class="block text-xs font-normal text-forest-700 dark:text-forest-300">
                          {p.type}
                          <span
                            aria-hidden="true"
                            class={`ml-1 inline-block transition-transform duration-300 ${isOpen ? "rotate-90" : ""}`}
                          >
                            ›
                          </span>
                        </span>
                      </span>
                    </button>

                    <div class="relative col-span-2 h-12 sm:col-span-1">
                      <span
                        class="absolute inset-y-0 border-l border-dashed border-moss-600/70 dark:border-moss-300/60"
                        style={{ left: `${pos(10.5)}%` }}
                        aria-hidden="true"
                      />
                      <span
                        class="absolute inset-y-0 border-l border-dotted border-forest-900/30 dark:border-forest-100/30"
                        style={{ left: `${pos(chance)}%` }}
                        aria-hidden="true"
                      />
                      {p.ranks.map((r, k) => {
                        const color = COLOR[r.side as "dorsal" | "ventral"];
                        const visible = shown(r);
                        const label = `${short(r.query)} → ${short(r.partner)}, ${r.side}: rank ${r.rank.toLocaleString()} of ${species.toLocaleString()}`;
                        return (
                          <span
                            class="absolute -ml-[6px] -mt-[6px] h-3 w-3 rounded-full border-2 transition-all duration-1000 ease-out motion-reduce:transition-none"
                            style={{
                              left: `${ready ? pos(r.rank) : 0}%`,
                              top: `${lane(r, side)}%`,
                              borderColor: color,
                              background:
                                r.direction === "A→B" ? color : "transparent",
                              opacity: ready && visible ? 1 : 0,
                              transitionDelay: ready
                                ? `${i * 60 + k * 30}ms`
                                : "0ms",
                              pointerEvents: visible ? "auto" : "none",
                            }}
                            role="img"
                            aria-label={label}
                            aria-hidden={!visible}
                            title={`${label}${r.siteListed ? ", listed on the species page" : ""}`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {isOpen && (
                    <div class="mx-2 mb-3 rounded-xl bg-white/80 p-3 text-xs text-forest-800 ring-1 ring-forest-900/10 dark:bg-forest-950/60 dark:text-forest-200 dark:ring-forest-100/10">
                      <p>{p.notes}</p>
                      <table class="mt-1.5 tabular-nums">
                        <caption class="sr-only">
                          Partner ranks for {p.pair}
                        </caption>
                        <thead>
                          <tr>
                            <th
                              scope="col"
                              class="pr-3 text-left font-semibold"
                            >
                              Query → partner
                            </th>
                            <th
                              scope="col"
                              class="pr-3 text-left font-semibold"
                            >
                              Side
                            </th>
                            <th
                              scope="col"
                              class="pr-3 text-right font-semibold"
                            >
                              Rank
                            </th>
                            <th scope="col" class="text-left font-semibold">
                              On species page
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {p.ranks.map((r) => (
                            <tr>
                              <td class="pr-3">
                                <i>{short(r.query)}</i> →{" "}
                                <i>{short(r.partner)}</i>
                              </td>
                              <td class="pr-3">{r.side}</td>
                              <td class="pr-3 text-right">
                                {r.rank.toLocaleString()}
                              </td>
                              <td>{r.siteListed ? "yes" : "no"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <p class="mt-1.5">
                        {[p.a, p.b].map((m, j) => (
                          <span>
                            {j > 0 && " · "}
                            <i>{m.accepted}</i>
                            {m.accepted !== m.published && (
                              <>
                                {" "}
                                (published as <i>{m.published}</i>)
                              </>
                            )}
                            : {m.dorsalImages.toLocaleString()} dorsal,{" "}
                            {m.ventralImages.toLocaleString()} ventral images
                          </span>
                        ))}
                      </p>
                      <p class="mt-1.5">
                        {p.references}
                        {": "}
                        {p.dois.map((d, j) => (
                          <>
                            {j > 0 && ", "}
                            <a
                              href={`https://doi.org/${d}`}
                              class="break-all font-mono text-moss-700 underline decoration-moss-400/50 hover:decoration-moss-500 dark:text-moss-300"
                            >
                              {d}
                            </a>
                          </>
                        ))}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          <div
            class="grid grid-cols-[auto_1fr] gap-x-3 px-2 sm:grid-cols-[minmax(0,17rem)_1fr]"
            aria-hidden="true"
          >
            <span class="hidden sm:block" />
            <div class="relative col-span-2 h-9 border-t border-forest-900/20 text-[0.7rem] text-forest-700 dark:border-forest-100/20 dark:text-forest-300 sm:col-span-1">
              {TICKS.map((t) => (
                <span
                  class="absolute top-1 -translate-x-1/2"
                  style={{ left: `${pos(t)}%` }}
                >
                  {t >= 1000 ? `${t / 1000}k` : t}
                </span>
              ))}
              <span class="absolute bottom-0 right-0">
                Partner rank among all species (log) →
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div
          key="tests"
          ref={testsRef}
          class="w-full text-forest-900 dark:text-forest-100"
          role="img"
          aria-label={`Permutation tests. ${mimicry.permutations.map((p) => `${p.side} side, ${p.null} null: observed mean partner percentile ${p.observed.toFixed(3)}, null mean ${p.mean.toFixed(2)} (95% ${p.low.toFixed(2)} to ${p.high.toFixed(2)})`).join("; ")}. All p ≤ 0.0001.`}
        />
      )}

      <p class="mt-2 text-xs text-forest-700 dark:text-forest-300">
        {view === "ranks"
          ? `Rank of each mimicry pair among ${species.toLocaleString()} species when either member queries the collection (1 = most similar; dashed green = the top 10 shown on species pages, dotted = chance). In ${recovered} of ${mimicry.pairs.length} pairs, both partners place each other in their top 10 ${side === "both" ? "on at least one wing side" : `on the ${side} side`} (highlighted). Hover a dot for its rank, or open a pair for its ranks, notes, and references.`
          : `Observed mean partner percentile (◆) against null distributions (mean and 95% interval) that redraw each partner from any species (Random) or, for pairs within a genus, from the query's congeners. Dorsal ${dorsal.observed.toFixed(3)} and ventral ${ventral.observed.toFixed(3)}, against ${dorsal.mean.toFixed(2)} at random and ${congeners.map((c) => c.mean.toFixed(2)).join(" and ")} among congeners.`}
      </p>
    </div>
  );
}
