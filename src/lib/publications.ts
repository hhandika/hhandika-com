// Helpers over the `publications` content collection (src/content.config.ts).
// The CV and the project pages read from here.
import { getCollection, type CollectionEntry } from "astro:content";

export type Publication = CollectionEntry<"publications">["data"] & {
  id: string;
};

const surname = (name: string) => name.split(",")[0].trim();

// Papers first-authored by the site author lead their section.
const isSelfFirst = (p: Publication) => surname(p.authors[0]) === "Handika";
const selfFirst = (a: Publication, b: Publication) =>
  Number(isSelfFirst(b)) - Number(isSelfFirst(a));

const byAuthor = (a: Publication, b: Publication) =>
  selfFirst(a, b) ||
  surname(a.authors[0]).localeCompare(surname(b.authors[0])) ||
  a.title.localeCompare(b.title);

let cache: Publication[] | undefined;

export async function getPublications(): Promise<Publication[]> {
  cache ??= (await getCollection("publications"))
    .map((e) => ({ ...e.data, id: e.id }))
    .sort(byAuthor);
  return cache;
}

export async function getPublication(id: string): Promise<Publication> {
  const pub = (await getPublications()).find((p) => p.id === id);
  if (!pub) throw new Error(`Unknown publication id: ${id}`);
  return pub;
}

/** Year label: the year, or the status for forthcoming work. */
export const yearLabel = (pub: Publication) =>
  pub.year !== undefined ? String(pub.year) : (pub.status ?? "");

/** In-text citation label from the first author: "Handika et al.". */
export function citeAuthor(pub: Publication): string {
  const [first, second] = pub.authors;
  if (pub.authors.length === 1) return surname(first);
  if (pub.authors.length === 2) return `${surname(first)} and ${surname(second)}`;
  return `${surname(first)} et al.`;
}

/** Bare DOIs become doi.org links; URLs pass through. */
export const doiUrl = (value?: string) =>
  !value ? undefined : /^https?:\/\//.test(value) ? value : `https://doi.org/${value}`;

/** "Journal, 50(2), 141–154" (journal is rendered separately in italics). */
export function formatVolume(pub: Publication): string {
  const vol = pub.volume ? `${pub.volume}${pub.issue ? `(${pub.issue})` : ""}` : "";
  return [vol, pub.pages].filter(Boolean).join(", ");
}

export const plainTitle = (title: string) => title.replace(/<[^>]+>/g, "");

export type PubActionKind = "pdf" | "article" | "preprint" | "code" | "website";
export interface PubAction {
  kind: PubActionKind;
  url: string;
}

/**
 * Links for a publication, in display order. The first one is the primary
 * action and sits on the left: PDF, then the article, preprint, code, and
 * project website.
 */
export function pubActions(pub: Publication): PubAction[] {
  const actions: [PubActionKind, string | undefined][] = [
    ["pdf", pub.pdf],
    ["article", doiUrl(pub.doi) ?? pub.url],
    ["preprint", doiUrl(pub.preprint)],
    ["code", pub.github],
    ["website", pub.website],
  ];
  return actions.flatMap(([kind, url]) => (url ? [{ kind, url }] : []));
}

/** CV sections in display order; datasets are not listed on the CV. */
export async function cvSections(): Promise<
  { heading: string; pubs: Publication[] }[]
> {
  const all = (await getPublications()).filter((p) => p.type !== "dataset");
  const articles = all.filter((p) => p.type !== "chapter");
  const statusRank = { Accepted: 0, "In revision": 1, "In review": 2, Submitted: 3 } as const;
  const forthcoming = articles
    .filter((p) => p.status && p.status !== "In prep")
    .sort(
      (a, b) =>
        selfFirst(a, b) ||
        statusRank[a.status as keyof typeof statusRank] -
          statusRank[b.status as keyof typeof statusRank] || byAuthor(a, b),
    );
  const years = [
    ...new Set(articles.flatMap((p) => (p.year && p.year >= 2020 ? [p.year] : []))),
  ].sort((a, b) => b - a);

  return [
    { heading: "Forthcoming", pubs: forthcoming },
    ...years.map((y) => ({
      heading: String(y),
      pubs: articles.filter((p) => p.year === y),
    })),
    {
      heading: "2019 and earlier",
      pubs: articles
        .filter((p) => p.year !== undefined && p.year < 2020)
        .sort((a, b) => b.year! - a.year! || byAuthor(a, b)),
    },
    {
      heading: "Manuscripts in prep",
      pubs: articles.filter((p) => p.status === "In prep"),
    },
    { heading: "Book chapter", pubs: all.filter((p) => p.type === "chapter") },
  ].filter((s) => s.pubs.length > 0);
}
