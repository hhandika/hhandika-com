// Heatmap and activity-tracker panels as HTML strings, so the build and the
// browser render the same markup from whichever stats.json they have.

import { formatDay, fullMonth, levelOf, type Activity } from "./github-activity";

const WEEKDAY_NAMES: Record<string, string> = {
  Sun: "Sunday",
  Mon: "Monday",
  Tue: "Tuesday",
  Wed: "Wednesday",
  Thu: "Thursday",
  Fri: "Friday",
  Sat: "Saturday",
};

const HEAT_LEVELS = [
  "fill-mist-200 dark:fill-white/10",
  "fill-moss-200 dark:fill-moss-800",
  "fill-moss-400 dark:fill-moss-700",
  "fill-moss-600 dark:fill-moss-500",
  "fill-forest-800 dark:fill-moss-300",
];

const DOT_LEVELS = [
  "bg-mist-200 dark:bg-white/10",
  "bg-moss-200 dark:bg-moss-800",
  "bg-moss-400 dark:bg-moss-700",
  "bg-moss-600 dark:bg-moss-500",
  "bg-forest-800 dark:bg-moss-300",
];

const panel =
  "rounded-3xl border border-forest-900/10 bg-white p-5 text-forest-950 shadow-sm dark:border-forest-100/10 dark:bg-forest-950/60 dark:text-forest-50 sm:p-6";
const eyebrow =
  "text-xs uppercase tracking-wide text-forest-700 dark:text-forest-300";
const muted = "text-slate-600 dark:text-slate-400";
const divider =
  "border-t border-forest-900/10 pt-4 dark:border-forest-100/10";

const num = (n: number) => n.toLocaleString("en");

export interface HeatmapOptions {
  /** Cell shape: square GitHub-style tiles or round dots. */
  shape?: "square" | "dot";
  showLabels?: boolean;
  class?: string;
}

export function heatmapHtml(
  a: Activity,
  { shape = "square", showLabels = true, class: className = "" }: HeatmapOptions = {},
): string {
  const cell = 11;
  const gap = 3;
  const step = cell + gap;
  const left = showLabels ? 28 : 0;
  const top = showLabels ? 16 : 0;
  const width = left + a.weeks.length * step - gap;
  const height = top + 7 * step - gap;
  const radius = shape === "dot" ? cell / 2 : 2.5;
  const label = `Contribution heatmap: ${num(a.total)} contributions on ${a.activeDays} of ${a.days.length} days in the past year; busiest day ${formatDay(a.best.date)} with ${a.best.count}.`;
  const text = (x: number, y: number, s: string) =>
    `<text x="${x}" y="${y}" font-size="9" class="fill-slate-500 dark:fill-slate-400">${s}</text>`;

  const labels = showLabels
    ? a.monthLabels.map((m) => text(left + m.col * step, 10, m.label)).join("") +
      ([[1, "Mon"], [3, "Wed"], [5, "Fri"]] as const)
        .map(([row, name]) => text(0, top + row * step + cell - 2, name))
        .join("")
    : "";
  const cells = a.weeks
    .flatMap((week, col) =>
      week.map((d, row) =>
        d
          ? `<rect x="${left + col * step}" y="${top + row * step}" width="${cell}" height="${cell}" rx="${radius}" class="${HEAT_LEVELS[levelOf(d.count, a.thresholds)]}"><title>${d.count} contributions · ${formatDay(d.date)}</title></rect>`
          : "",
      ),
    )
    .join("");
  const legend = HEAT_LEVELS.map(
    (c) =>
      `<svg viewBox="0 0 11 11" class="h-2.5 w-2.5" aria-hidden="true"><rect width="11" height="11" rx="${radius}" class="${c}" /></svg>`,
  ).join("");

  return `<figure class="${className}">
  <svg viewBox="0 0 ${width} ${height}" class="block h-auto w-full" role="img" aria-label="${label}">${labels}${cells}</svg>
  <figcaption class="mt-2 flex items-center justify-end gap-1.5 text-xs ${muted}">Less ${legend} More</figcaption>
</figure>`;
}

/** Vertical bar list shared by the monthly and weekday charts. */
function barsHtml(
  bars: { label: string; total: number; title: string; peak?: boolean }[],
  gridClass: string,
  ariaLabel: string,
  style = "",
): string {
  const max = Math.max(...bars.map((b) => b.total), 1);
  const items = bars
    .map(
      (b) => `<li class="flex flex-col items-center gap-1" title="${b.title}">
  <span class="text-[10px] tabular-nums text-slate-500 dark:text-slate-400">${b.total}</span>
  <span class="flex h-16 w-full items-end"><span class="${
    b.peak
      ? "w-full rounded-t-md bg-forest-700 dark:bg-moss-300"
      : "w-full rounded-t-md bg-moss-400 dark:bg-moss-600"
  }" style="height:${Math.max((b.total / max) * 100, 3)}%"></span></span>
  <span class="text-[10px] ${muted}">${b.label}</span>
</li>`,
    )
    .join("");
  return `<ol class="${gridClass}"${style ? ` style="${style}"` : ""} aria-label="${ariaLabel}">${items}</ol>`;
}

/** The 12-month panel and streak tracker above the all-time tiles. */
export function activityPanelsHtml(a: Activity): string {
  const peakWeekday = a.weekday.reduce((x, y) => (y.total > x.total ? y : x));
  const recent = a.days.slice(-14);
  const delta = a.prev30
    ? Math.round(((a.last30 - a.prev30) / a.prev30) * 100)
    : 0;
  const activePct = Math.round((a.activeDays / a.days.length) * 100);

  const months = barsHtml(
    a.months.map((m) => ({
      label: m.label.slice(0, 1),
      total: m.total,
      title: `${fullMonth(m.key)}: ${m.total} contributions on ${m.active} days`,
    })),
    "mt-2 grid items-end gap-1",
    `Contributions per month: ${a.months.map((m) => `${fullMonth(m.key)} ${m.total}`).join(", ")}`,
    `grid-template-columns:repeat(${a.months.length},minmax(0,1fr))`,
  );
  const weekdays = barsHtml(
    a.weekday.map((w) => ({
      label: w.label,
      total: w.total,
      title: `${WEEKDAY_NAMES[w.label]}: ${w.total} contributions`,
      peak: w === peakWeekday,
    })),
    "mt-2 grid grid-cols-7 items-end gap-2",
    `Contributions by day of the week: ${a.weekday.map((w) => `${WEEKDAY_NAMES[w.label]} ${w.total}`).join(", ")}`,
  );
  const dots = recent
    .map(
      (d) =>
        `<li title="${formatDay(d.date)}: ${d.count}" class="h-5 flex-1 rounded ${DOT_LEVELS[levelOf(d.count, a.thresholds)]}"></li>`,
    )
    .join("");
  const deltaClass =
    delta >= 0
      ? "whitespace-nowrap rounded-full bg-moss-100 px-2 py-0.5 text-xs font-medium text-moss-800 dark:bg-moss-900 dark:text-moss-200"
      : "whitespace-nowrap rounded-full bg-mist-100 px-2 py-0.5 text-xs font-medium text-mist-800 dark:bg-mist-900 dark:text-mist-200";

  return `<div class="mt-4 grid gap-4 lg:grid-cols-3">
  <div class="${panel} lg:col-span-2">
    <p class="${eyebrow}">Past 12 months</p>
    <h3 class="mt-1 text-3xl font-semibold tabular-nums">${num(a.total)} <span class="text-base font-normal ${muted}">contributions</span></h3>
    ${heatmapHtml(a, { class: "mt-4" })}
    <p class="${eyebrow} mt-6">Monthly volume</p>
    ${months}
    <p class="${eyebrow} mt-6">Weekly rhythm</p>
    <p class="text-xs ${muted}">Busiest on ${WEEKDAY_NAMES[peakWeekday.label]}s.</p>
    ${weekdays}
  </div>
  <aside class="${panel} flex flex-col gap-5" aria-label="Activity tracker">
    <div>
      <p class="${eyebrow}">Current streak</p>
      <p class="mt-1 text-4xl font-semibold tabular-nums">${a.currentStreak}<span class="ml-1 text-base font-normal ${muted}">days</span></p>
      <ol class="mt-3 flex gap-1" aria-label="Last 14 days">${dots}</ol>
      <p class="mt-1 flex justify-between text-[10px] text-slate-500 dark:text-slate-400"><span>14 days ago</span><span>Today</span></p>
    </div>
    <div class="${divider}">
      <p class="${eyebrow}">Last 30 days</p>
      <p class="mt-1 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span class="text-2xl font-semibold tabular-nums">${a.last30}<span class="ml-1 text-base font-normal ${muted}">contributions</span></span>
        <span class="${deltaClass}">${delta >= 0 ? "▲" : "▼"} ${Math.abs(delta)}% vs prior 30</span>
      </p>
    </div>
    <div class="${divider}">
      <p class="${eyebrow}">Active days</p>
      <p class="mt-1 text-2xl font-semibold tabular-nums">${a.activeDays}<span class="ml-1 text-base font-normal ${muted}">of ${a.days.length} days</span></p>
      <p class="text-xs ${muted}">Days with at least one contribution</p>
      <div class="mt-2 h-2 rounded-full bg-mist-100 dark:bg-forest-900" role="img" aria-label="${activePct}% of days active"><div class="h-full rounded-full bg-forest-700 dark:bg-moss-400" style="width:${activePct}%"></div></div>
    </div>
    <dl class="grid grid-cols-2 gap-3 ${divider} text-sm">
      <div>
        <dt class="${eyebrow}">Longest streak</dt>
        <dd class="mt-0.5 text-lg font-semibold tabular-nums">${a.longestStreak} days</dd>
      </div>
      <div>
        <dt class="${eyebrow}">Best day</dt>
        <dd class="mt-0.5 text-lg font-semibold tabular-nums">${a.best.count}<span class="ml-1 text-sm font-normal ${muted}">contributions</span></dd>
        <dd class="text-xs ${muted}">${formatDay(a.best.date)}</dd>
      </div>
    </dl>
  </aside>
</div>`;
}
