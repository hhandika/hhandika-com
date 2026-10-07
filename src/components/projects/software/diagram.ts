// Shared visual language for the software diagrams (NAHPU and BioCosmos
// architectures, and the embedding pipeline): tones, chip wrapping, and
// arrowheads.

export type Tone = "dart" | "rust" | "data" | "app";

// Full class strings so Tailwind can see them. Contrast targets (WCAG 2.2):
// box borders, badges, and packets reach 3:1 against the figure card, and all
// text reaches 4.5:1 against its fill, in light and dark modes. The three
// tones differ in hue on both the border and the tinted fill, and every box
// also names itself in text, so the tone is never the only cue. Border and
// legend colors differ in lightness as well as hue (dark green, mid
// yellow-green, light blue-gray), keeping them apart (CIEDE2000 ΔE > 26) even
// under red-green color blindness.
export const tones: Record<
  Tone,
  {
    box: string;
    title: string;
    muted: string;
    badge: string;
    badgeText: string;
    chip: string;
    chipText: string;
    // Legend key: the same color as the box border.
    swatch: string;
  }
> = {
  dart: {
    box: "fill-forest-50 stroke-forest-800 dark:fill-forest-900 dark:stroke-forest-500",
    title: "fill-forest-900 dark:fill-forest-50",
    muted: "fill-forest-700 dark:fill-forest-300",
    badge: "fill-forest-600 dark:fill-forest-400",
    badgeText: "fill-white dark:fill-forest-950",
    chip: "fill-forest-100 stroke-forest-300 dark:fill-forest-800 dark:stroke-forest-600",
    chipText: "fill-forest-800 dark:fill-forest-100",
    swatch: "fill-forest-800 dark:fill-forest-500",
  },
  rust: {
    box: "fill-moss-100 stroke-moss-600 dark:fill-moss-950 dark:stroke-moss-400",
    title: "fill-moss-900 dark:fill-moss-50",
    muted: "fill-moss-800 dark:fill-moss-200",
    badge: "fill-moss-700 dark:fill-moss-400",
    badgeText: "fill-white dark:fill-moss-950",
    chip: "fill-moss-50 stroke-moss-300 dark:fill-moss-900 dark:stroke-moss-700",
    chipText: "fill-moss-900 dark:fill-moss-100",
    swatch: "fill-moss-600 dark:fill-moss-400",
  },
  data: {
    box: "fill-mist-100 stroke-mist-500 dark:fill-mist-950 dark:stroke-mist-300",
    title: "fill-mist-900 dark:fill-mist-50",
    muted: "fill-mist-700 dark:fill-mist-200",
    badge: "fill-mist-600 dark:fill-mist-400",
    badgeText: "fill-white dark:fill-mist-950",
    chip: "fill-mist-50 stroke-mist-300 dark:fill-mist-900 dark:stroke-mist-700",
    chipText: "fill-mist-900 dark:fill-mist-100",
    swatch: "fill-mist-500 dark:fill-mist-300",
  },
  app: {
    box: "fill-forest-700 stroke-forest-700 dark:fill-forest-800 dark:stroke-forest-400",
    title: "fill-white",
    muted: "fill-forest-100",
    badge: "fill-moss-400",
    badgeText: "fill-moss-950",
    chip: "fill-forest-600 stroke-forest-500 dark:fill-forest-700 dark:stroke-forest-500",
    chipText: "fill-white",
    swatch: "fill-forest-700 dark:fill-forest-400",
  },
};

// Stroke classes for connectors and the matching packet fills.
export const lineClass = "stroke-forest-400 dark:stroke-forest-500";
export const labelClass = "fill-forest-700 dark:fill-forest-300";
export const packetClass: Record<Tone, string> = {
  dart: "fill-forest-500 dark:fill-forest-300",
  rust: "fill-moss-600 dark:fill-moss-300",
  data: "fill-mist-500 dark:fill-mist-300",
  app: "fill-forest-500 dark:fill-forest-300",
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
