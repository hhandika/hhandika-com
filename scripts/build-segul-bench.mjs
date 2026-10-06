// One-time builder for the SEGUL benchmark figure on the projects page.
// Run manually: `node scripts/build-segul-bench.mjs [path/to/segul-bench]` —
// the output is committed. Defaults to ../../R/segul-bench next to this repo.
//
// Source: results/mean_bench_by_dataset.csv (R/benchmark.Rmd), means and SDs
// of 5 replicates per task × dataset × app. Linux desktop runs on an AMD
// Ryzen 9 5900X; mobile GUI runs were timed by hand and have no RAM data.
//
// Output: src/data/segul/bench.json

import { readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const ROOT = resolve(process.argv[2] ?? "../../R/segul-bench");
const OUT = "src/data/segul/bench.json";

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

const num = (v) => (v === undefined || v === "" || v === "NA" ? null : Number(v));
const round = (v, d = 3) => (v === null || Number.isNaN(v) ? null : Number(v.toFixed(d)));

const TASKS = [
  "Alignment Concatenation",
  "Alignment Conversion",
  "Alignment Splitting",
  "Alignment Summary",
  "Sequence Removal",
];
const FORMATS = ["NEXUS", "FASTA", "PHYLIP"];

const raw = readCsv(join(ROOT, "results/mean_bench_by_dataset.csv"));
const datasets = new Map();
const rows = [];

for (const r of raw) {
  const m = r.Analyses.trim().match(/^(.*?) \((\w+)\)$/);
  if (!m || !TASKS.includes(m[1])) continue; // drops the FASTQ read summary
  const d = r.Datasets.match(/^(.*?) et al\. (\d{4}) \(([\d.]+) MBases, (\w+)\)$/);
  if (!d) continue;
  const dataset = `${d[1]} ${d[2]}`;
  datasets.set(dataset, { id: dataset, mbases: Number(d[3]), datatype: d[4] });
  // v0.21.3 CLI runs are the API comparison; keep them apart from v0.20.0.
  const app = r.Apps === "SEGUL CLI" && r.Version === "v0.21.3" ? "SEGUL CLI v0.21.3" : r.Apps;
  rows.push({
    task: m[1],
    format: m[2],
    dataset,
    app,
    version: r.Version || null,
    mobile: r.Platform === "Mobile",
    time: round(num(r.Mean_Execution_time_secs)),
    timeSd: round(num(r.SD_Execution_time_secs)),
    ram: round(num(r.Mean_RAM_usage_Mb), 1),
    ramSd: round(num(r.SD_RAM_usage_Mb), 1),
    cpu: round(num(r.Mean_CPU_Time)), // CPU seconds = wall time × CPU% / 100
  });
}

const out = {
  source: "github.com/hhandika/segul-bench, results/mean_bench_by_dataset.csv",
  machine: "AMD Ryzen 9 5900X, openSUSE Linux",
  replicates: 5,
  tasks: TASKS,
  formats: FORMATS,
  datasets: [...datasets.values()].sort((a, b) => b.mbases - a.mbases),
  rows,
};
writeFileSync(OUT, JSON.stringify(out) + "\n");
console.log(`${rows.length} rows, ${out.datasets.length} datasets → ${OUT}`);
