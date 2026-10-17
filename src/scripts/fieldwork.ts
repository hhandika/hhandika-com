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
      { name: "Mt. Patah", latitude: -4.27, longitude: 103.3 },
      { name: "Mt. Bandahara", latitude: 3.7489, longitude: 97.7814 },
      { name: "Mt. Kemiri", latitude: 3.7625, longitude: 97.4835 },
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
    sites: [{ name: "Black Gap Wildlife Management Area", latitude: 29.5633, longitude: -102.8978 }],
  },
  {
    title: "Davis Mountains",
    region: "Texas",
    country: "USA",
    start: "2021-05",
    kind: "collecting",
    sites: [{ name: "Davis Mountains", latitude: 30.7167, longitude: -104 }],
  },
  {
    title: "Mt. Murud",
    region: "Sarawak",
    country: "Malaysia",
    start: "2019-07",
    end: "2019-08",
    kind: "collecting",
    sites: [{ name: "Mt. Murud", latitude: 3.9053, longitude: 115.4889 }],
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
    sites: [{ name: "Mt. Talamau", latitude: 0.0792, longitude: 99.9833 }],
  },
  {
    title: "Mt. Torompupu",
    region: "Central Sulawesi",
    country: "Indonesia",
    start: "2017-11",
    end: "2017-12",
    kind: "collecting",
    sites: [{ name: "Mt. Torompupu", latitude: -1.4248, longitude: 119.8563 }],
  },
  {
    title: "Solok Selatan",
    region: "West Sumatra",
    country: "Indonesia",
    start: "2017-10",
    kind: "limited",
    sites: [{ name: "Solok Selatan", latitude: -1.2333, longitude: 101.417 }],
  },
  {
    title: "Mt. Katopasa",
    region: "Central Sulawesi",
    country: "Indonesia",
    start: "2017-08",
    end: "2017-09",
    kind: "collecting",
    sites: [{ name: "Mt. Katopasa", latitude: -1.1893, longitude: 121.4416 }],
  },
  {
    title: "Wilsons Promontory National Park",
    region: "Victoria",
    country: "Australia",
    start: "2017-06",
    kind: "survey",
    sites: [
      { name: "Wilsons Promontory National Park", latitude: -39.033, longitude: 146.383 },
    ],
  },
  {
    title: "Grampians National Park",
    region: "Victoria",
    country: "Australia",
    start: "2016-11",
    kind: "limited",
    sites: [{ name: "Grampians National Park", latitude: -37.2078, longitude: 142.3997 }],
  },
  {
    title: "Mt. Bawakaraeng",
    region: "South Sulawesi",
    country: "Indonesia",
    start: "2016-10",
    end: "2016-11",
    kind: "collecting",
    sites: [{ name: "Mt. Bawakaraeng", latitude: -5.3173, longitude: 119.944 }],
  },
  {
    title: "Mt. Latimojong",
    region: "South Sulawesi",
    country: "Indonesia",
    start: "2016-07",
    end: "2016-08",
    kind: "collecting",
    sites: [{ name: "Mt. Latimojong", latitude: -3.385, longitude: 120.0242 }],
  },
  {
    title: "Mts. Ambang and Dua Saudara",
    region: "North Sulawesi",
    country: "Indonesia",
    start: "2016-02",
    end: "2016-03",
    kind: "collecting",
    sites: [
      { name: "Mt. Ambang", latitude: 0.75, longitude: 124.42 },
      { name: "Mt. Dua Saudara", latitude: 1.499546, longitude: 125.175809 },
    ],
  },
  {
    title: "Grampians National Park",
    region: "Victoria",
    country: "Australia",
    start: "2015-11",
    kind: "limited",
    sites: [{ name: "Grampians National Park", latitude: -37.2078, longitude: 142.3997 }],
  },
  {
    title: "Mt. Talamau",
    region: "West Sumatra",
    country: "Indonesia",
    start: "2015-06",
    kind: "collecting",
    sites: [{ name: "Mt. Talamau", latitude: 0.0792, longitude: 99.9833 }],
  },
  {
    title: "Runtu",
    region: "Central Kalimantan",
    country: "Indonesia",
    start: "2014-12",
    kind: "limited",
    sites: [{ name: "Runtu", latitude: -2.351, longitude: 111.7071 }],
  },
  {
    title: "Mts. Tujuh and Masurai",
    region: "Jambi",
    country: "Indonesia",
    start: "2014-09",
    end: "2014-10",
    kind: "collecting",
    sites: [
      { name: "Mt. Tujuh", latitude: -1.6747, longitude: 101.425 },
      { name: "Mt. Masurai", latitude: -2.5025, longitude: 101.8583 },
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
      { name: "San Rafael", latitude: 11.5902, longitude: 124.9589 },
      { name: "Mt. Huraw", latitude: 12.0651, longitude: 125.0599 },
    ],
  },
  {
    title: "Cirebon",
    region: "West Java",
    country: "Indonesia",
    start: "2014-05",
    kind: "limited",
    sites: [{ name: "Cirebon", latitude: -6.7071, longitude: 108.5574 }],
  },
  {
    title: "Mt. Buliohuto",
    region: "Gorontalo",
    country: "Indonesia",
    start: "2014-01",
    end: "2014-02",
    kind: "collecting",
    sites: [{ name: "Mt. Buliohuto", latitude: 0.910136, longitude: 122.450746 }],
  },
  {
    title: "Bangka Island",
    region: "Bangka Belitung",
    country: "Indonesia",
    start: "2013-11",
    end: "2013-12",
    kind: "collecting",
    sites: [{ name: "Bangka Island", latitude: -2.25, longitude: 106 }],
  },
  {
    title: "Mts. Salak, Ijen, and Slamet",
    region: "Java",
    country: "Indonesia",
    start: "2013-09",
    end: "2013-10",
    kind: "collecting",
    sites: [
      { name: "Mt. Salak", latitude: -6.7158, longitude: 106.7336 },
      { name: "Mt. Slamet", latitude: -7.2392, longitude: 109.22 },
      { name: "Mt. Ijen", latitude: -8.0579, longitude: 114.2431 },
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
      { name: "Kota Waringin Barat", latitude: -2.683, longitude: 111.617 },
    ],
  },
  {
    title: "Mt. Dako",
    region: "Central Sulawesi",
    country: "Indonesia",
    start: "2013-03",
    kind: "collecting",
    sites: [{ name: "Mt. Dako", latitude: 1.0617, longitude: 120.935 }],
  },
  {
    title: "Mts. Kerinci, Tujuh, and Masurai",
    region: "Jambi",
    country: "Indonesia",
    start: "2013-01",
    kind: "collecting",
    sites: [
      { name: "Mt. Kerinci", latitude: -1.6967, longitude: 101.2656 },
      { name: "Mt. Tujuh", latitude: -1.6747, longitude: 101.425 },
      { name: "Mt. Masurai", latitude: -2.5025, longitude: 101.8583 },
    ],
  },
  {
    title: "Belitung Island",
    region: "Bangka Belitung",
    country: "Indonesia",
    start: "2013-01",
    kind: "collecting",
    sites: [{ name: "Belitung Island", latitude: -2.833, longitude: 107.917 }],
  },
  {
    title: "Mt. Singgalang",
    region: "West Sumatra",
    country: "Indonesia",
    start: "2012-06",
    end: "2012-07",
    kind: "collecting",
    sites: [{ name: "Mt. Singgalang", latitude: -0.39, longitude: 100.3308 }],
  },
  {
    title: "Mt. Gandang Dewata",
    region: "West Sulawesi",
    country: "Indonesia",
    start: "2012-05",
    end: "2012-06",
    kind: "collecting",
    sites: [
      { name: "Mt. Gandang Dewata", latitude: -2.748, longitude: 119.3685 },
    ],
  },
  {
    title: "Mt. Malintang",
    region: "West Sumatra",
    country: "Indonesia",
    start: "2012-04",
    kind: "survey",
    sites: [{ name: "Mt. Malintang", latitude: -0.3269, longitude: 100.6706 }],
  },
  {
    title: "Marak Island",
    region: "West Sumatra",
    country: "Indonesia",
    start: "2011-10",
    kind: "survey",
    sites: [{ name: "Marak Island", latitude: -1.1997, longitude: 100.3347 }],
  },
  {
    title: "Siberut Island",
    region: "West Sumatra",
    country: "Indonesia",
    start: "2010-10",
    kind: "survey",
    sites: [{ name: "Siberut Island", latitude: -1.383, longitude: 98.9 }],
  },
  {
    title: "Mt. Sago",
    region: "West Sumatra",
    country: "Indonesia",
    start: "2010-09",
    kind: "survey",
    sites: [{ name: "Mt. Sago", latitude: -0.3269, longitude: 100.6706 }],
  },
  {
    title: "Angkola",
    region: "North Sumatra",
    country: "Indonesia",
    start: "2010-07",
    kind: "survey",
    sites: [{ name: "Angkola", latitude: 1.3786, longitude: 99.2722 }],
  },
  {
    title: "Mt. Merapi",
    region: "West Sumatra",
    country: "Indonesia",
    start: "2009-06",
    kind: "survey",
    sites: [{ name: "Mt. Marapi", latitude: -0.38, longitude: 100.4742 }],
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
