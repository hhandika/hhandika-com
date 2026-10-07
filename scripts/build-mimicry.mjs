// One-time builder for the BioCosmos mimicry figure on the software page.
// Run manually: `node scripts/build-mimicry.mjs [path/to/BioCosmos]` — outputs
// are committed. Defaults to a BioCosmos checkout next to this repository.
//
// Sources (BioCosmos analyses, notebooks/mimicry.ipynb):
//   analyses/data/mimicry_pairs.csv                published pairs, notes, DOIs
//   analyses/results/mimicry_recovery_*.csv        ranks, recovery, coverage,
//                                                  permutations, representatives
//   backend/static/webp/{img_id}.webp              representative dorsal images
//
// Outputs:
//   src/data/biocosmos/mimicry.json
//   public/images/biocosmos/mimicry/{species}.webp  square, transparent, 160 px

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import sharp from "sharp";

const ROOT = resolve(process.argv[2] ?? "../BioCosmos");
const RESULTS = join(ROOT, "analyses/results");
const IMAGES = join(ROOT, "backend/static/webp");
const OUT_IMAGES = "public/images/biocosmos/mimicry";
const SIZE = 160;

// Minimal RFC 4180 reader: quoted fields may hold commas.
function readCsv(path) {
  const text = readFileSync(path, "utf8").trim();
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field.replace(/\r$/, "")); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  row.push(field);
  rows.push(row);
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, j) => [h, r[j]])));
}

const csv = (name) => readCsv(join(RESULTS, `mimicry_recovery_${name}.csv`));
const published = readCsv(join(ROOT, "analyses/data/mimicry_pairs.csv"));
const coverage = csv("coverage");
const ranks = csv("ranks");
const recovery = csv("recovery");
const permutations = csv("permutations");
const representatives = csv("representatives");
const counts = Object.fromEntries(csv("counts").map((r) => [r.count, Number(r.value)]));

const slug = (name) => name.toLowerCase().replace(/\s+/g, "-");
const sideOf = (mode) => (mode.includes("ventral") ? "ventral" : "dorsal");

mkdirSync(OUT_IMAGES, { recursive: true });
for (const { species, img_id } of representatives) {
  await sharp(join(IMAGES, `${img_id}.webp`))
    .resize(SIZE, SIZE, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 82, alphaQuality: 90 })
    .toFile(join(OUT_IMAGES, `${slug(species)}.webp`));
}

const pairs = recovery.map((r) => {
  const members = coverage.filter((c) => c.pair === r.pair);
  const member = (key) => {
    const m = members.find((c) => c.member === key);
    return {
      published: m.published_species,
      accepted: m.accepted_species,
      image: `/images/biocosmos/mimicry/${slug(m.accepted_species)}.webp`,
      dorsalImages: Number(m.dorsal_images),
      ventralImages: Number(m.ventral_images),
    };
  };
  const a = member("A");
  const b = member("B");
  const source = published.find((p) => p["Species 1"] === a.published && p["Species 2"] === b.published);
  return {
    pair: r.pair,
    type: source["Mimicry type"],
    notes: source.Notes,
    references: source["Key publication(s)"],
    dois: source["DOI(s)"].split(";").map((d) => d.trim()),
    a,
    b,
    mutual: { dorsal: r.mutual_top10_dorsal === "True", ventral: r.mutual_top10_ventral === "True" },
    recovered: r.recovered === "True",
    ranks: ranks
      .filter((k) => k.pair === r.pair)
      .map((k) => ({
        side: sideOf(k.mode),
        direction: k.direction,
        query: k.query,
        partner: k.partner,
        rank: Number(k.partner_rank),
        percentile: Number(Number(k.partner_percentile).toFixed(5)),
        score: Number(Number(k.partner_score).toFixed(4)),
        siteListed: k.site_listed === "True",
      })),
  };
});

const out = {
  source: "BioCosmos analyses/notebooks/mimicry.ipynb (analyses/results/mimicry_recovery_*.csv)",
  top: 10,
  counts: {
    publishedPairs: counts["Published pairs"],
    testedPairs: counts["Tested pairs"],
    publishedSpecies: counts["Published species"],
    testedSpecies: counts["Tested species (accepted names)"],
    speciesRanked: counts["Species ranked in the collection"],
    imagesRanked: counts["Images ranked"],
  },
  pairs,
  permutations: permutations.map((p) => ({
    side: sideOf(p.mode),
    null: p.null,
    queries: Number(p.query_rows),
    observed: Number(Number(p.observed_mean_percentile).toFixed(4)),
    mean: Number(Number(p.null_mean).toFixed(4)),
    low: Number(Number(p.null_low_2_5).toFixed(4)),
    high: Number(Number(p.null_high_97_5).toFixed(4)),
    p: Number(p.p_value),
    permutations: Number(p.permutations),
  })),
};

mkdirSync("src/data/biocosmos", { recursive: true });
writeFileSync("src/data/biocosmos/mimicry.json", JSON.stringify(out, null, 1) + "\n");
console.log(`✓ ${pairs.length} pairs, ${representatives.length} images`);
