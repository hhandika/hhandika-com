// Live GitHub metrics from the profile repo (hhandika/hhandika), which a daily
// workflow regenerates. The file is ~20 kB, so pages fetch it at build time for
// a static first paint and again in the browser to stay current.

export const STATS_URL =
  "https://raw.githubusercontent.com/hhandika/hhandika/main/data/stats.json";
export const STATS_SOURCE_URL =
  "https://github.com/hhandika/hhandika/blob/main/data/stats.json";

export interface RepoChanges {
  name_with_owner: string;
  additions: number;
  deletions: number;
  commits: number;
}

export interface Language {
  name: string;
  bytes: number;
  color: string | null;
  percentage: number;
}

export interface FeaturedRepo {
  name_with_owner: string;
  description: string;
  available: boolean;
  languages: Language[];
}

export interface GithubStats {
  generated_at: string;
  status: string;
  overview: {
    total_contributions: number;
    total_repositories: number;
    total_pull_requests: number;
    total_issues: number;
    total_reviews: number;
    total_stars: number;
    streak_days: number;
    code_additions: number;
    code_deletions: number;
    peak_day: string;
    peak_hours: string;
  };
  code_changes: {
    repositories: RepoChanges[];
    repositories_counted: number;
    repositories_total: number;
    totals: { additions: number; deletions: number; commits: number };
  };
  featured_repositories: FeaturedRepo[];
  language_statistics: {
    languages: Record<string, Omit<Language, "name">>;
    total: number;
  };
}

let pending: Promise<GithubStats | null> | undefined;

/** Fetches stats.json once per page (or build); resolves null on failure. */
export function loadStats(): Promise<GithubStats | null> {
  pending ??= fetch(STATS_URL)
    .then((res) => (res.ok ? (res.json() as Promise<GithubStats>) : null))
    .catch(() => null);
  return pending;
}

const compactFormat = new Intl.NumberFormat("en", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const numberFormat = new Intl.NumberFormat("en");

export const formatters = {
  compact: (v: unknown) => compactFormat.format(Number(v)),
  number: (v: unknown) => numberFormat.format(Number(v)),
  date: (v: unknown) =>
    new Date(String(v)).toLocaleDateString("en", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
  text: (v: unknown) => String(v),
};
export type Format = keyof typeof formatters;

/** Reads a dotted path such as "overview.total_stars". */
export function pick(stats: GithubStats | null, path: string): unknown {
  return path
    .split(".")
    .reduce<any>((obj, key) => (obj == null ? undefined : obj[key]), stats);
}

export function formatStat(
  stats: GithubStats | null,
  path: string,
  format: Format = "number",
): string {
  const value = pick(stats, path);
  return value == null ? "—" : formatters[format](value);
}

/** Sums code changes across repos; null if none of them have data. */
export function repoChanges(
  stats: GithubStats | null,
  repos: string[],
): RepoChanges | null {
  const found = stats?.code_changes.repositories.filter((r) =>
    repos.includes(r.name_with_owner),
  );
  if (!found?.length) return null;
  return found.reduce(
    (sum, r) => ({
      ...sum,
      additions: sum.additions + r.additions,
      deletions: sum.deletions + r.deletions,
      commits: sum.commits + r.commits,
    }),
    { name_with_owner: repos.join(","), additions: 0, deletions: 0, commits: 0 },
  );
}

export function topLanguages(
  stats: GithubStats | null,
  limit = 6,
): Language[] {
  if (!stats) return [];
  const all = Object.entries(stats.language_statistics.languages)
    .map(([name, l]) => ({ name, ...l }))
    .sort((a, b) => b.bytes - a.bytes);
  return collapseOther(all, limit);
}

export function repoLanguages(
  stats: GithubStats | null,
  repo: string,
  limit = 4,
): Language[] {
  const featured = stats?.featured_repositories.find(
    (r) => r.name_with_owner === repo,
  );
  return featured ? collapseOther(featured.languages, limit) : [];
}

function collapseOther(langs: Language[], limit: number): Language[] {
  const head = langs.slice(0, limit).filter((l) => l.percentage >= 0.5);
  const rest = 100 - head.reduce((s, l) => s + l.percentage, 0);
  return rest >= 0.5
    ? [...head, { name: "Other", bytes: 0, color: null, percentage: rest }]
    : head;
}

const escape = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

const OTHER_COLOR = "#a8a29e";

/** Stacked language bar with a legend. Shared by server and client renders. */
export function languageBarHtml(langs: Language[], showLegend = true): string {
  if (!langs.length) return "";
  const segments = langs
    .map(
      (l) =>
        `<span title="${escape(l.name)} ${l.percentage.toFixed(1)}%" style="width:${l.percentage}%;background:${l.color ?? OTHER_COLOR}"></span>`,
    )
    .join("");
  const legend = langs
    .map(
      (l) =>
        `<li class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full" style="background:${l.color ?? OTHER_COLOR}"></span>${escape(l.name)} <span class="tabular-nums opacity-70">${l.percentage.toFixed(1)}%</span></li>`,
    )
    .join("");
  return `<div class="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full" role="img" aria-label="Language mix: ${langs
    .map((l) => `${escape(l.name)} ${l.percentage.toFixed(0)}%`)
    .join(", ")}">${segments}</div>${
    showLegend
      ? `<ul class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">${legend}</ul>`
      : ""
  }`;
}

/**
 * Selected repositories, as curated in the profile README: description,
 * language mix, and code changes when GitHub has computed them.
 */
export function selectedReposHtml(stats: GithubStats | null): string {
  if (!stats) return "";
  return stats.featured_repositories
    .filter((r) => r.available)
    .map((r) => {
      const c = repoChanges(stats, [r.name_with_owner]);
      const changes = c
        ? `<p class="mt-1 text-xs tabular-nums opacity-80">${numberFormat.format(c.commits)} commits · <span class="text-moss-700 dark:text-moss-300">+${compactFormat.format(c.additions)}</span> <span class="text-sunrise-700 dark:text-sunrise-300">−${compactFormat.format(c.deletions)}</span></p>`
        : "";
      return `<li>
  <a class="font-mono text-sm font-medium hover:underline" href="https://github.com/${escape(r.name_with_owner)}" target="_blank" rel="noopener">${escape(r.name_with_owner)}</a>
  <p class="mt-0.5 text-sm text-slate-600 dark:text-slate-400">${escape(r.description)}</p>
  <div class="mt-2 [&_ul]:mt-1.5 [&_ul]:text-xs">${languageBarHtml(collapseOther(r.languages, 4))}</div>
  ${changes}
</li>`;
    })
    .join("");
}

/** Per-project metric chips: commits and line changes across its repos. */
export function repoMetricsHtml(
  stats: GithubStats | null,
  repos: string[],
): string {
  const c = repoChanges(stats, repos);
  if (!c) return "";
  const chip = (value: string, label: string) =>
    `<div><dt class="text-xs uppercase tracking-wide opacity-70">${label}</dt><dd class="text-xl font-semibold tabular-nums">${value}</dd></div>`;
  return [
    chip(numberFormat.format(c.commits), "Commits"),
    chip(`+${compactFormat.format(c.additions)}`, "Lines added"),
    chip(`−${compactFormat.format(c.deletions)}`, "Lines removed"),
  ].join("");
}

/**
 * Refreshes every live-bound element under `root` with the latest stats:
 *   [data-gh-stat="path"][data-gh-format]  → text value
 *   [data-gh-languages]                    → overall language bar
 *   [data-gh-repo-langs="owner/repo"]      → per-repo language bar
 *   [data-gh-repo-metrics="a,b"]           → per-project metric chips
 *   [data-gh-selected-repos]               → selected repositories
 */
export async function hydrateStats(root: ParentNode = document) {
  const stats = await loadStats();
  if (!stats) return;
  root.querySelectorAll<HTMLElement>("[data-gh-stat]").forEach((el) => {
    const format = (el.dataset.ghFormat ?? "number") as Format;
    el.textContent = formatStat(stats, el.dataset.ghStat!, format);
  });
  root.querySelectorAll<HTMLElement>("[data-gh-languages]").forEach((el) => {
    el.innerHTML = languageBarHtml(
      topLanguages(stats, Number(el.dataset.ghLanguages) || 6),
    );
  });
  root.querySelectorAll<HTMLElement>("[data-gh-repo-langs]").forEach((el) => {
    el.innerHTML = languageBarHtml(repoLanguages(stats, el.dataset.ghRepoLangs!));
  });
  root.querySelectorAll<HTMLElement>("[data-gh-repo-metrics]").forEach((el) => {
    const html = repoMetricsHtml(stats, el.dataset.ghRepoMetrics!.split(","));
    if (html) el.innerHTML = html;
  });
  root.querySelectorAll<HTMLElement>("[data-gh-selected-repos]").forEach((el) => {
    el.innerHTML = selectedReposHtml(stats);
  });
}
