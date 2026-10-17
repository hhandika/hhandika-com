// Interactive map of field localities (src/scripts/fieldwork.ts). One marker
// per locality, sized by the number of visits and styled by the most
// intensive kind of fieldwork done there. Follows the timeline's kind filter
// through the "fieldwork:filter" event. The basemap matches BioCosmos:
// OpenFreeMap's Positron and Dark vector styles drawn with MapLibre, which
// touches `window` on import and so loads inside the effect.
import { useEffect, useRef, useState } from "preact/hooks";
import type { Map as MapLibreMap, Marker } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
// MapLibre finds its worker with `new URL(..., import.meta.url)`, which
// Vite's dependency pre-bundling breaks. Let Vite bundle the worker instead.
import workerUrl from "maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url";
import "./fieldwork-map.css";
import {
  countries,
  expeditions,
  fieldworkKinds,
  formatSeason,
  type FieldworkKind,
} from "../../scripts/fieldwork";
import { fieldworkIconSvg } from "../../scripts/fieldworkIcons";

const rank: Record<FieldworkKind, number> = {
  collecting: 2,
  limited: 1,
  survey: 0,
};

interface Locality {
  name: string;
  latitude: number;
  longitude: number;
  kind: FieldworkKind;
  country: keyof typeof countries;
  visits: { title: string; season: string; kind: FieldworkKind; place: string }[];
}

// Sites closer than this (about 1 km) share a marker; one would hide the other.
const NEAR = 0.01;

// One marker per locality, merging sites that share or nearly share a point.
const localities = expeditions.reduce<Locality[]>((acc, e) => {
  for (const s of e.sites) {
    let loc = acc.find(
      (l) =>
        Math.abs(l.latitude - s.latitude) < NEAR &&
        Math.abs(l.longitude - s.longitude) < NEAR,
    );
    if (!loc) {
      loc = {
        name: s.name,
        latitude: s.latitude,
        longitude: s.longitude,
        kind: e.kind,
        country: e.country,
        visits: [],
      };
      acc.push(loc);
    }
    if (!loc.name.split(" / ").includes(s.name)) loc.name += ` / ${s.name}`;
    if (rank[e.kind] > rank[loc.kind]) loc.kind = e.kind;
    loc.visits.push({
      title: e.title,
      season: formatSeason(e),
      kind: e.kind,
      place: `${e.region}, ${e.country}`,
    });
  }
  return acc;
}, []);

type Region = "all" | "asia" | "australia" | "usa";

const REGIONS: { id: Region; label: string; countries: string[] }[] = [
  { id: "asia", label: "Southeast Asia", countries: ["Indonesia", "Malaysia", "Philippines"] },
  { id: "australia", label: "Australia", countries: ["Australia"] },
  { id: "usa", label: "United States", countries: ["USA"] },
  { id: "all", label: "All", countries: Object.keys(countries) },
];

const chipClasses =
  "rounded-full border border-forest-900/15 px-3 py-1 text-sm text-forest-900 transition hover:border-moss-400 aria-pressed:border-moss-400 aria-pressed:bg-moss-100 aria-pressed:text-moss-950 dark:border-forest-100/15 dark:text-forest-100 dark:aria-pressed:bg-moss-900/50 dark:aria-pressed:text-moss-50";

const markerClasses: Record<FieldworkKind, string> = {
  collecting:
    "border-white bg-moss-600 dark:border-forest-950 dark:bg-moss-400",
  limited: "border-white bg-mist-500 dark:border-forest-950 dark:bg-mist-300",
  survey:
    "border-forest-700 bg-white dark:border-forest-100 dark:bg-forest-950",
};

// Same badges as the timeline icons (TimelineItem.astro).
const iconClasses: Record<FieldworkKind, string> = {
  collecting: "bg-moss-400 text-moss-950",
  limited: "bg-mist-300 text-mist-950",
  survey: "bg-forest-200 text-forest-900",
};

// OpenFreeMap serves MapLibre vector styles for free, without an API key.
const STYLES = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};
// The styles carry their own OpenMapTiles/OpenStreetMap credit.
const ATTRIBUTION =
  '<a href="https://openfreemap.org" target="_blank">OpenFreeMap</a>';

const isDark = () => document.documentElement.classList.contains("dark");
const styleUrl = () => (isDark() ? STYLES.dark : STYLES.light);

// Shift the Americas east by 360° so the map spans the Pacific rather than
// the whole Atlantic side of the world.
const lng = (longitude: number) => (longitude < -30 ? longitude + 360 : longitude);

const escape = (s: string) =>
  s.replace(/[&<>"]/g, (c) => `&${{ "&": "amp", "<": "lt", ">": "gt", '"': "quot" }[c]};`);

function popupHtml(loc: Locality) {
  const visits = loc.visits
    .map(
      (v) =>
        `<li><span class="font-semibold">${escape(v.season)}</span> · ${escape(
          fieldworkKinds[v.kind].label,
        )}${
          loc.visits.length === 1 || v.title === loc.name
            ? ""
            : `<br><span class="opacity-75">${escape(v.title)}</span>`
        }</li>`,
    )
    .join("");
  return `<div class="flex items-center gap-3 pr-6"><span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
    iconClasses[loc.kind]
  }">${fieldworkIconSvg(loc.kind, "h-5 w-5")}</span><div><p class="font-semibold leading-tight text-forest-950 dark:text-forest-50">${escape(
    loc.name,
  )}</p><p class="text-xs text-forest-700 dark:text-forest-300">${escape(
    loc.visits[0].place,
  )}</p></div></div><ul class="mt-2.5 space-y-1 border-t border-forest-900/10 pt-2.5 text-xs dark:border-forest-100/10">${visits}</ul>`;
}

export default function FieldworkMap() {
  const ref = useRef<HTMLDivElement>(null);
  const [region, setRegion] = useState<Region>("asia");
  const fitRef = useRef<(region: Region, animate: boolean) => void>();

  useEffect(() => {
    if (!ref.current) return;
    let map: MapLibreMap | undefined;
    let cleanup = () => {};
    let cancelled = false;

    import("maplibre-gl").then((maplibre) => {
      if (cancelled || !ref.current) return;
      maplibre.setWorkerUrl(workerUrl);
      let currentStyle = styleUrl();
      const m = (map = new maplibre.Map({
        container: ref.current,
        style: currentStyle,
        center: [115, -2],
        zoom: 3,
        minZoom: 1,
        maxZoom: 12,
        scrollZoom: false,
        dragRotate: false,
        touchPitch: false,
        attributionControl: { compact: true, customAttribution: ATTRIBUTION },
      }));
      m.addControl(
        new maplibre.NavigationControl({ showCompass: false }),
        "top-left",
      );

      const markers: { loc: Locality; marker: Marker; shown: boolean }[] =
        localities.map((loc) => {
          const size = 14 + 4 * (loc.visits.length - 1);
          const el = document.createElement("div");
          el.className = `fieldwork-marker rounded-full border-2 shadow ${markerClasses[loc.kind]}`;
          el.style.width = el.style.height = `${size}px`;
          el.setAttribute("role", "button");
          el.setAttribute(
            "aria-label",
            loc.visits.length === 1
              ? loc.name
              : `${loc.name}: ${loc.visits.length} visits`,
          );
          el.title = el.getAttribute("aria-label")!;
          const popup = new maplibre.Popup({
            className: "fieldwork-popup",
            offset: size / 2 + 4,
            maxWidth: "260px",
          }).setHTML(popupHtml(loc));
          const marker = new maplibre.Marker({ element: el })
            .setLngLat([lng(loc.longitude), loc.latitude])
            .setPopup(popup)
            .addTo(m);
          return { loc, marker, shown: true };
        });

      let current: Region = "asia";
      // Fit the visible markers in a region, or all visible markers if the
      // kind filter leaves none there.
      const fit = (next: Region, animate: boolean) => {
        current = next;
        const inRegion = REGIONS.find((r) => r.id === next)!.countries;
        const visible = markers.filter((x) => x.shown);
        const shown = visible.filter(({ loc }) => inRegion.includes(loc.country));
        const target = shown.length ? shown : visible;
        if (!target.length) return;
        const bounds = new maplibre.LngLatBounds();
        for (const { marker } of target) bounds.extend(marker.getLngLat());
        m.fitBounds(bounds, {
          padding: 48,
          maxZoom: 7,
          duration: animate ? 800 : 0,
        });
      };
      fitRef.current = fit;
      fit(current, false);

      const onFilter = (event: Event) => {
        const kind = (event as CustomEvent<string>).detail;
        for (const x of markers) {
          x.marker.getPopup()?.remove();
          x.shown = kind === "all" || x.loc.visits.some((v) => v.kind === kind);
          if (x.shown) x.marker.addTo(m);
          else x.marker.remove();
        }
        fit(current, true);
      };
      document.addEventListener("fieldwork:filter", onFilter);

      // Markers are DOM elements, so they survive the style swap.
      const themeObserver = new MutationObserver(() => {
        const next = styleUrl();
        if (next !== currentStyle) m.setStyle((currentStyle = next));
      });
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });

      cleanup = () => {
        document.removeEventListener("fieldwork:filter", onFilter);
        themeObserver.disconnect();
      };
    });

    return () => {
      cancelled = true;
      fitRef.current = undefined;
      cleanup();
      map?.remove();
    };
  }, []);

  const select = (next: Region) => {
    setRegion(next);
    fitRef.current?.(next, true);
  };

  return (
    <div>
      <div class="mb-3 flex flex-wrap gap-2" role="group" aria-label="Zoom the map to a region">
        {REGIONS.map((r) => (
          <button
            key={r.id}
            type="button"
            class={chipClasses}
            aria-pressed={region === r.id}
            onClick={() => select(r.id)}
          >
            {r.label}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        class="fieldwork-map h-[360px] overflow-hidden rounded-3xl border border-forest-900/10 bg-mist-100 dark:border-forest-100/10 dark:bg-mist-950 sm:h-[460px]"
        role="region"
        aria-label={`Map of ${localities.length} field localities. Markers are keyboard focusable; press Enter to show the visits at each locality.`}
      />
    </div>
  );
}
