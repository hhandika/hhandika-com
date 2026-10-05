// Shared visual language for the software diagrams (NAHPU architecture and
// the embedding pipeline): tones, chip wrapping, and arrowheads.

export type Tone = "dart" | "rust" | "data" | "app";

// Full class strings so Tailwind can see them.
export const tones: Record<
  Tone,
  { box: string; title: string; muted: string; badge: string; badgeText: string; chip: string; chipText: string }
> = {
  dart: {
    box: "fill-moss-50 stroke-moss-300 dark:fill-moss-950 dark:stroke-moss-700",
    title: "fill-moss-900 dark:fill-moss-50",
    muted: "fill-moss-700 dark:fill-moss-300",
    badge: "fill-moss-600 dark:fill-moss-400",
    badgeText: "fill-white dark:fill-moss-950",
    chip: "fill-moss-100 stroke-moss-200 dark:fill-moss-900 dark:stroke-moss-800",
    chipText: "fill-moss-800 dark:fill-moss-100",
  },
  rust: {
    box: "fill-sunrise-50 stroke-sunrise-300 dark:fill-sunrise-950 dark:stroke-sunrise-800",
    title: "fill-sunrise-900 dark:fill-sunrise-50",
    muted: "fill-sunrise-800 dark:fill-sunrise-200",
    badge: "fill-sunrise-600 dark:fill-sunrise-400",
    badgeText: "fill-white dark:fill-sunrise-950",
    chip: "fill-sunrise-100 stroke-sunrise-200 dark:fill-sunrise-900 dark:stroke-sunrise-800",
    chipText: "fill-sunrise-900 dark:fill-sunrise-100",
  },
  data: {
    box: "fill-crater-50 stroke-crater-300 dark:fill-crater-950 dark:stroke-crater-700",
    title: "fill-crater-900 dark:fill-crater-50",
    muted: "fill-crater-700 dark:fill-crater-200",
    badge: "fill-crater-600 dark:fill-crater-400",
    badgeText: "fill-white dark:fill-crater-950",
    chip: "fill-crater-100 stroke-crater-200 dark:fill-crater-900 dark:stroke-crater-800",
    chipText: "fill-crater-900 dark:fill-crater-100",
  },
  app: {
    box: "fill-moss-700 stroke-moss-700 dark:fill-moss-800 dark:stroke-moss-600",
    title: "fill-white",
    muted: "fill-moss-100",
    badge: "fill-sunrise-400",
    badgeText: "fill-sunrise-950",
    chip: "fill-moss-600 stroke-moss-500 dark:fill-moss-700 dark:stroke-moss-500",
    chipText: "fill-white",
  },
};

// Stroke classes for connectors and the matching packet fills.
export const lineClass = "stroke-moss-400 dark:stroke-moss-500";
export const labelClass = "fill-moss-700 dark:fill-moss-300";
export const packetClass: Record<Tone, string> = {
  dart: "fill-moss-500 dark:fill-moss-300",
  rust: "fill-sunrise-500 dark:fill-sunrise-300",
  data: "fill-crater-500 dark:fill-crater-300",
  app: "fill-moss-500 dark:fill-moss-300",
};

export interface Chip {
  label: string;
  x: number;
  y: number;
  w: number;
}

/** Lay chips out left to right, wrapping when a row runs past maxW. */
export function wrapChips(
  labels: string[],
  x: number,
  y: number,
  maxW: number,
  { charW = 6.4, pad = 16, gap = 6, rowH = 26 } = {},
): Chip[] {
  const chips: Chip[] = [];
  let cx = x;
  let cy = y;
  for (const label of labels) {
    const w = Math.round(label.length * charW + pad);
    if (cx + w > x + maxW && cx > x) {
      cx = x;
      cy += rowH;
    }
    chips.push({ label, x: cx, y: cy, w });
    cx += w + gap;
  }
  return chips;
}

/** Triangle at the end of a straight connector pointing from (x1,y1) to (x2,y2). */
export function arrowHead(x1: number, y1: number, x2: number, y2: number, size = 6): string {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const p = (da: number) =>
    `${(x2 - size * Math.cos(a + da)).toFixed(1)},${(y2 - size * Math.sin(a + da)).toFixed(1)}`;
  return `${x2},${y2} ${p(0.5)} ${p(-0.5)}`;
}

/** Deterministic pseudo-random numbers so the build output is stable. */
export function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
