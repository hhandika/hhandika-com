/**
 * Field expeditions, following the "Selected fieldwork" section of the CV
 * (src/assets/docs/hhandika-cv.pdf). This is the single source for the
 * fieldwork timeline and the field-site pins on the Indonesia map.
 */

/** The kind of fieldwork, as grouped in the CV. */
export type FieldworkKind = "collecting" | "limited" | "survey";

export const fieldworkKinds: Record<
  FieldworkKind,
  { label: string; description: string }
> = {
  collecting: {
    label: "Field collecting",
    description: "Expeditions with full voucher specimen collecting.",
  },
  limited: {
    label: "Survey with limited collecting",
    description: "Biodiversity surveys with a small number of vouchers.",
  },
  survey: {
    label: "Biodiversity survey",
    description: "Observation-based surveys without collecting.",
  },
};

export interface FieldSite {
  name: string;
  /** Approximate latitude (decimal degrees). */
  latitude: number;
  /** Approximate longitude (decimal degrees). */
  longitude: number;
}

export interface Expedition {
  title: string;
  region: string;
  country: keyof typeof countries;
  /** First month in the field, as "YYYY-MM". */
  start: string;
  /** Last month in the field, as "YYYY-MM". Omit for single-month trips. */
  end?: string;
  kind: FieldworkKind;
  sites: FieldSite[];
}

export const countries = {
  Indonesia: "🇮🇩",
  Malaysia: "🇲🇾",
  Philippines: "🇵🇭",
  USA: "🇺🇸",
  Australia: "🇦🇺",
} as const;

// Newest first.
export const expeditions: Expedition[] = [
  {
    title: "Mts. Patah, Bandahara, and Kemiri",
    region: "Sumatra",
    country: "Indonesia",
    start: "2023-08",
    end: "2023-12",
    kind: "collecting",
    sites: [
      { name: "Mt. Patah", latitude: -4.2576, longitude: 103.3057 },
      { name: "Mt. Bandahara", latitude: 3.749, longitude: 97.7818 },
      { name: "Mt. Kemiri", latitude: 3.7621, longitude: 97.4824 },
    ],
  },
  {
    title: "Mt. Gede",
    region: "West Java",
    country: "Indonesia",
    start: "2023-02",
    end: "2023-04",
    kind: "collecting",
    sites: [{ name: "Mt. Gede", latitude: -6.78, longitude: 106.98 }],
  },
  {
    title: "Black Gap WMA",
    region: "Texas",
    country: "USA",
    start: "2022-04",
    end: "2022-05",
    kind: "collecting",
    sites: [{ name: "Black Gap WMA", latitude: 29.468, longitude: -102.843 }],
  },
  {
    title: "Davis Mountains",
    region: "Texas",
    country: "USA",
    start: "2021-05",
    kind: "collecting",
    sites: [{ name: "Davis Mountains", latitude: 30.599, longitude: -103.929 }],
  },
  {
    title: "Mt. Murud",
    region: "Sarawak",
    country: "Malaysia",
    start: "2019-07",
    end: "2019-08",
    kind: "collecting",
    sites: [{ name: "Mt. Murud", latitude: 3.917, longitude: 115.5 }],
  },
  {
    title: "Mt. Galang",
    region: "Central Sulawesi",
    country: "Indonesia",
    start: "2018-07",
    kind: "collecting",
    sites: [{ name: "Mt. Galang", latitude: 1.0626, longitude: 120.9345 }],
  },
  {
    title: "Mt. Talamau",
    region: "West Sumatra",
    country: "Indonesia",
    start: "2018-03",
    end: "2018-04",
    kind: "collecting",
    sites: [{ name: "Mt. Talamau", latitude: 0.0789, longitude: 99.9839 }],
  },
  {
    title: "Mt. Torompupu",
    region: "Central Sulawesi",
    country: "Indonesia",
    start: "2017-11",
    end: "2017-12",
    kind: "collecting",
    sites: [{ name: "Mt. Torompupu", latitude: -1.48, longitude: 120.05 }],
  },
  {
    title: "Solok Selatan",
    region: "West Sumatra",
    country: "Indonesia",
    start: "2017-10",
    kind: "limited",
    sites: [{ name: "Solok Selatan", latitude: -1.45, longitude: 101.1 }],
  },
  {
    title: "Mt. Katopasa",
    region: "Central Sulawesi",
    country: "Indonesia",
    start: "2017-08",
    end: "2017-09",
    kind: "collecting",
    sites: [{ name: "Mt. Katopasa", latitude: -1.2, longitude: 121.4 }],
  },
  {
    title: "Wilsons Promontory National Park",
    region: "Victoria",
    country: "Australia",
    start: "2017-06",
    kind: "survey",
    sites: [
      { name: "Wilsons Promontory", latitude: -39.013, longitude: 146.394 },
    ],
  },
  {
    title: "Grampians National Park",
    region: "Victoria",
    country: "Australia",
    start: "2016-11",
    kind: "limited",
    sites: [{ name: "Grampians", latitude: -37.208, longitude: 142.4 }],
  },
  {
    title: "Mt. Bawakaraeng",
    region: "South Sulawesi",
    country: "Indonesia",
    start: "2016-10",
    end: "2016-11",
    kind: "collecting",
    sites: [{ name: "Mt. Bawakaraeng", latitude: -5.317, longitude: 119.945 }],
  },
  {
    title: "Mt. Latimojong",
    region: "South Sulawesi",
    country: "Indonesia",
    start: "2016-07",
    end: "2016-08",
    kind: "collecting",
    sites: [{ name: "Mt. Latimojong", latitude: -3.385, longitude: 120.024 }],
  },
  {
    title: "Mt. Ambang",
    region: "North Sulawesi",
    country: "Indonesia",
    start: "2016-02",
    end: "2016-03",
    kind: "collecting",
    sites: [{ name: "Mt. Ambang", latitude: 0.757, longitude: 124.416 }],
  },
  {
    title: "Grampians National Park",
    region: "Victoria",
    country: "Australia",
    start: "2015-11",
    kind: "limited",
    sites: [{ name: "Grampians", latitude: -37.208, longitude: 142.4 }],
  },
  {
    title: "Mt. Talamau",
    region: "West Sumatra",
    country: "Indonesia",
    start: "2015-06",
    kind: "collecting",
    sites: [{ name: "Mt. Talamau", latitude: 0.0789, longitude: 99.9839 }],
  },
  {
    title: "Runtu",
    region: "Central Kalimantan",
    country: "Indonesia",
    start: "2014-12",
    kind: "limited",
    sites: [{ name: "Runtu", latitude: -2.45, longitude: 111.75 }],
  },
  {
    title: "Mts. Tujuh and Masurai",
    region: "Jambi",
    country: "Indonesia",
    start: "2014-09",
    end: "2014-10",
    kind: "collecting",
    sites: [
      { name: "Mt. Tujuh", latitude: -1.71, longitude: 101.39 },
      { name: "Mt. Masurai", latitude: -2.5, longitude: 101.85 },
    ],
  },
  {
    title: "San Rafael and Mt. Huraw",
    region: "Samar Island",
    country: "Philippines",
    start: "2014-06",
    end: "2014-07",
    kind: "collecting",
    sites: [
      { name: "San Rafael", latitude: 11.88, longitude: 125.38 },
      { name: "Mt. Huraw", latitude: 11.85, longitude: 125.25 },
    ],
  },
  {
    title: "Cirebon",
    region: "West Java",
    country: "Indonesia",
    start: "2014-05",
    kind: "limited",
    sites: [{ name: "Cirebon", latitude: -6.73, longitude: 108.55 }],
  },
  {
    title: "Bangka Island",
    region: "Bangka Belitung",
    country: "Indonesia",
    start: "2013-11",
    end: "2013-12",
    kind: "collecting",
    sites: [{ name: "Bangka Island", latitude: -2.1, longitude: 106.1 }],
  },
  {
    title: "Mts. Salak, Ijen, and Slamet",
    region: "Java",
    country: "Indonesia",
    start: "2013-09",
    end: "2013-10",
    kind: "collecting",
    sites: [
      { name: "Mt. Salak", latitude: -6.72, longitude: 106.73 },
      { name: "Mt. Slamet", latitude: -7.24, longitude: 109.21 },
      { name: "Mt. Ijen", latitude: -8.06, longitude: 114.24 },
    ],
  },
  {
    title: "Kota Waringin Barat",
    region: "Central Kalimantan",
    country: "Indonesia",
    start: "2013-06",
    end: "2013-07",
    kind: "limited",
    sites: [
      { name: "Kota Waringin Barat", latitude: -2.68, longitude: 111.63 },
    ],
  },
  {
    title: "Mt. Dako",
    region: "Central Sulawesi",
    country: "Indonesia",
    start: "2013-03",
    kind: "collecting",
    sites: [{ name: "Mt. Dako", latitude: 0.97, longitude: 120.78 }],
  },
  {
    title: "Mts. Kerinci, Tujuh, and Masurai",
    region: "Jambi",
    country: "Indonesia",
    start: "2013-01",
    kind: "collecting",
    sites: [
      { name: "Mt. Kerinci", latitude: -1.7, longitude: 101.26 },
      { name: "Mt. Tujuh", latitude: -1.71, longitude: 101.39 },
      { name: "Mt. Masurai", latitude: -2.5, longitude: 101.85 },
    ],
  },
  {
    title: "Belitung Island",
    region: "Bangka Belitung",
    country: "Indonesia",
    start: "2013-01",
    kind: "collecting",
    sites: [{ name: "Belitung Island", latitude: -2.85, longitude: 107.9 }],
  },
  {
    title: "Mt. Singgalang",
    region: "West Sumatra",
    country: "Indonesia",
    start: "2012-06",
    end: "2012-07",
    kind: "collecting",
    sites: [{ name: "Mt. Singgalang", latitude: -0.39, longitude: 100.33 }],
  },
  {
    title: "Mt. Gandang Dewata",
    region: "West Sulawesi",
    country: "Indonesia",
    start: "2012-05",
    end: "2012-06",
    kind: "collecting",
    sites: [
      { name: "Mt. Gandang Dewata", latitude: -2.88, longitude: 119.37 },
    ],
  },
  {
    title: "Mt. Malintang",
    region: "West Sumatra",
    country: "Indonesia",
    start: "2012-04",
    kind: "survey",
    sites: [{ name: "Mt. Malintang", latitude: -0.08, longitude: 100.65 }],
  },
  {
    title: "Marak Island",
    region: "West Sumatra",
    country: "Indonesia",
    start: "2011-10",
    kind: "survey",
    sites: [{ name: "Marak Island", latitude: -1.25, longitude: 100.35 }],
  },
  {
    title: "Siberut Island",
    region: "West Sumatra",
    country: "Indonesia",
    start: "2010-10",
    kind: "survey",
    sites: [{ name: "Siberut Island", latitude: -1.4, longitude: 98.9 }],
  },
  {
    title: "Mt. Sago",
    region: "West Sumatra",
    country: "Indonesia",
    start: "2010-09",
    kind: "survey",
    sites: [{ name: "Mt. Sago", latitude: -0.33, longitude: 100.67 }],
  },
  {
    title: "Angkola",
    region: "North Sumatra",
    country: "Indonesia",
    start: "2010-07",
    kind: "survey",
    sites: [{ name: "Angkola", latitude: 1.45, longitude: 99.3 }],
  },
  {
    title: "Mt. Merapi",
    region: "West Sumatra",
    country: "Indonesia",
    start: "2009-06",
    kind: "survey",
    sites: [{ name: "Mt. Merapi", latitude: -0.38, longitude: 100.47 }],
  },
];

/**
 * Planned expeditions. Kept apart from `expeditions` so they don't count
 * toward the completed-fieldwork stats or the map pins.
 */
export interface UpcomingExpedition {
  title: string;
  region: string;
  country: keyof typeof countries;
  /** Planned field season, e.g. "Spring 2027". */
  season: string;
}

export const upcomingExpeditions: UpcomingExpedition[] = [
  {
    title: "Mt. Hulu Palik",
    region: "Sumatra",
    country: "Indonesia",
    season: "Spring 2027",
  },
];

const monthFormat = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
});

const monthName = (ym: string) => monthFormat.format(new Date(`${ym}-01T00:00Z`));

/** Formats the field season, e.g. "August–December 2023" or "May 2021". */
export function formatSeason({ start, end }: Expedition): string {
  const year = start.slice(0, 4);
  if (!end || end === start) return `${monthName(start)} ${year}`;
  if (end.slice(0, 4) !== year) {
    return `${monthName(start)} ${year}–${monthName(end)} ${end.slice(0, 4)}`;
  }
  return `${monthName(start)}–${monthName(end)} ${year}`;
}

/** Distinct localities across all expeditions (revisits count once). */
export const localityCount = new Set(
  expeditions.flatMap((e) => e.sites.map((s) => s.name)),
).size;

/**
 * Defines the structure for a single fieldwork locality,
 * including its name and geographic coordinates.
 */
export interface FieldworkLocality {
  /** The common name of the locality. */
  localityName: string;

  /** The latitude of the locality (decimal degrees). */
  latitude: number;

  /** The longitude of the locality (decimal degrees). */
  longitude: number;

  /** A description of the locality. */
  description: string;

  /** The level of collecting effort at the locality. */
  collectingEffort: CollectingEffort;
}

/**
 * Defines the possible levels of collecting effort.
 */
export type CollectingEffort = "full" | "semi" | "none";

const effortByKind: Record<FieldworkKind, CollectingEffort> = {
  collecting: "full",
  limited: "semi",
  survey: "none",
};

export const fieldworkLocalities: FieldworkLocality[] = expeditions.flatMap(
  (e) =>
    e.sites.map((s) => ({
      localityName: s.name,
      latitude: s.latitude,
      longitude: s.longitude,
      description: `${e.region}, ${e.country}`,
      collectingEffort: effortByKind[e.kind],
    })),
);
