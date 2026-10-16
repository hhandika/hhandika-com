// Contribution-calendar metrics for the heatmap and activity tracker, from
// `overview.contribution_calendar` in the profile repo's stats.json.

import type { Day, GithubStats } from "./github-stats";

export interface Activity {
  days: Day[];
  weeks: (Day | null)[][];
  thresholds: number[];
  total: number;
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  best: Day;
  months: {
    key: string;
    label: string;
    total: number;
    active: number;
    days: number;
  }[];
  last30: number;
  prev30: number;
  weekday: { label: string; total: number }[];
  hours: number[];
  monthLabels: { col: number; label: string }[];
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const weekdayOf = (date: string) => new Date(`${date}T00:00:00Z`).getUTCDay();
const monthLabel = (date: string, style: "short" | "long" = "short") =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en", {
    month: style,
    timeZone: "UTC",
  });

/** Level 0–4 by quartiles of non-zero days, like GitHub's own calendar. */
export function levelOf(count: number, thresholds: number[]): number {
  if (count <= 0) return 0;
  return 1 + thresholds.filter((t) => count > t).length;
}

/** Null when stats.json predates the daily calendar or failed to load. */
export function summarize(stats: GithubStats | null): Activity | null {
  const days = stats?.overview.contribution_calendar ?? [];
  if (!days.length) return null;

  const nonZero = days
    .map((d) => d.count)
    .filter((c) => c > 0)
    .sort((a, b) => a - b);
  const q = (p: number) => nonZero[Math.floor(p * (nonZero.length - 1))] ?? 0;
  const thresholds = [q(0.25), q(0.5), q(0.75)];

  const weeks: (Day | null)[][] = [];
  const monthLabels: Activity["monthLabels"] = [];
  let week: (Day | null)[] = Array(weekdayOf(days[0].date)).fill(null);
  let lastMonth = "";
  for (const d of days) {
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    const m = d.date.slice(0, 7);
    if (m !== lastMonth && Number(d.date.slice(8)) <= 7) {
      monthLabels.push({ col: weeks.length, label: monthLabel(d.date) });
    }
    lastMonth = m;
    week.push(d);
  }
  weeks.push([...week, ...Array(7 - week.length).fill(null)]);

  let longestStreak = 0;
  let run = 0;
  for (const d of days) {
    run = d.count > 0 ? run + 1 : 0;
    longestStreak = Math.max(longestStreak, run);
  }
  // Today may still be in progress, so a zero today does not break the streak.
  let currentStreak = 0;
  const tail = days[days.length - 1]?.count === 0 ? days.slice(0, -1) : days;
  for (let i = tail.length - 1; i >= 0 && tail[i].count > 0; i--)
    currentStreak++;

  const months = new Map<string, Activity["months"][number]>();
  for (const d of days) {
    const key = d.date.slice(0, 7);
    const m = months.get(key) ?? {
      key,
      label: monthLabel(d.date),
      total: 0,
      active: 0,
      days: 0,
    };
    m.total += d.count;
    m.active += d.count > 0 ? 1 : 0;
    m.days += 1;
    months.set(key, m);
  }

  const sum = (ds: Day[]) => ds.reduce((s, d) => s + d.count, 0);
  const weekdayTotals = WEEKDAYS.map((label) => ({ label, total: 0 }));
  for (const d of days) weekdayTotals[weekdayOf(d.date)].total += d.count;

  return {
    days,
    weeks,
    thresholds,
    total: sum(days),
    activeDays: days.filter((d) => d.count > 0).length,
    currentStreak,
    longestStreak,
    best: days.reduce((a, b) => (b.count > a.count ? b : a)),
    months: [...months.values()],
    last30: sum(days.slice(-30)),
    prev30: sum(days.slice(-60, -30)),
    weekday: weekdayTotals,
    hours: stats?.overview.hourly_events_et ?? Array(24).fill(0),
    monthLabels,
  };
}

export const formatDay = (date: string) =>
  new Date(`${date}T00:00:00Z`).toLocaleDateString("en", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

export const fullMonth = (key: string) => monthLabel(`${key}-01`, "long");
