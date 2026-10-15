// One-time builder for the Bunomys-clade chronogram on the projects page.
// Run manually — the output is committed:
//
//   node scripts/build-bunomys-tree.mjs <BEAST 2 annotated tree (.tre)>
//
// Source: BEAST2_5loci67seq_100M10k_SClock_BDExp_Combined_20200122.tre, a
// TreeAnnotator summary of 67 sequences from five loci under a strict clock.
// Not committed. Published in Handika et al. (2021) Zoologica Scripta,
// https://doi.org/10.1111/zsc.12460
//
// Keeps the smallest clade holding every Bunomys-division and Halmaheramys
// sample, drops the outgroups, and collapses each monophyletic species to one
// tip. Ages are mean node heights in Ma with their 95% HPD.
//
// Output: src/data/bunomys-chronogram.json

import { readFileSync, writeFileSync } from "node:fs";

const [file] = process.argv.slice(2);
if (!file) {
  console.error("usage: node scripts/build-bunomys-tree.mjs <tree.tre>");
  process.exit(1);
}

// ---- NEXUS / Newick with [&key=value,...] annotations --------------------
const text = readFileSync(file, "utf8");
const nwk = text.slice(text.indexOf("("), text.lastIndexOf(";"));
let i = 0;

const parseMeta = () => {
  if (nwk[i] !== "[") return {};
  const start = i;
  let depth = 0;
  for (; i < nwk.length; i++) {
    if (nwk[i] === "[") depth++;
    if (nwk[i] === "]" && --depth === 0) break;
  }
  const raw = nwk.slice(start + 2, i++);
  const meta = {};
  let key = "";
  let val = "";
  let inVal = false;
  let braces = 0;
  const push = () => {
    if (key)
      meta[key] = val.startsWith("{")
        ? val.slice(1, -1).split(",").map(Number)
        : Number.isNaN(+val)
          ? val
          : +val;
    key = val = "";
    inVal = false;
  };
  for (const c of raw) {
    if (c === "{") braces++;
    if (c === "}") braces--;
    if (c === "," && !braces) push();
    else if (c === "=" && !inVal) inVal = true;
    else if (inVal) val += c;
    else key += c;
  }
  push();
  return meta;
};

const parseNode = () => {
  const node = { children: [] };
  if (nwk[i] === "(") {
    i++;
    do node.children.push(parseNode());
    while (nwk[i++] === ",");
  } else {
    const start = i;
    while (!"[:,()".includes(nwk[i])) i++;
    node.name = nwk.slice(start, i);
  }
  node.meta = parseMeta();
  if (nwk[i] === ":") {
    i++;
    while (i < nwk.length && !",()[;".includes(nwk[i])) i++;
  }
  return node;
};

const root = parseNode();
const tipsOf = (n) => (n.name ? [n.name] : n.children.flatMap(tipsOf));

// ---- Names ----------------------------------------------------------------
// Sample labels are Genus_species_voucher. The tree predates the transfer of
// Paruromys dominator to Taeromys and Bunomys fratrorum to Frateromys;
// "Genuss" marks an undescribed genus.
const species = (tip) => {
  const [g, s] = tip.split("_");
  const genus =
    s === "fratrorum" ? "Frateromys" : ({ Paruromys: "Taeromys", Genuss: "Gen. nov." }[g] ?? g);
  return `${genus} ${s === "spnov" ? "sp. nov." : s}`;
};
const INGROUP = ["Bunomys", "Eropeplus", "Lenomys", "Genuss", "Paruromys", "Taeromys", "Halmaheramys"];
const inIngroup = (tip) => INGROUP.includes(tip.split("_")[0]);
const ingroupSize = tipsOf(root).filter(inIngroup).length;

const findIngroup = (n, parent) => {
  const tips = tipsOf(n);
  if (tips.length === ingroupSize && tips.every(inIngroup)) return { node: n, parent };
  for (const c of n.children) {
    const hit = findIngroup(c, n);
    if (hit) return hit;
  }
};
const { node: crown, parent: stem } = findIngroup(root);

const round = (x) => +x.toFixed(3);
const age = (n) => ({
  h: round(n.meta.height),
  hpd: n.meta["height_95%_HPD"].map(round),
  pp: round(n.meta.posterior),
});

const collapse = (n) => {
  const tips = tipsOf(n);
  const names = new Set(tips.map(species));
  if (names.size === 1)
    return {
      name: [...names][0],
      samples: tips.length,
      // Crown age of the species' own samples, if more than one.
      crown: n.name ? null : round(n.meta.height),
    };
  return { ...age(n), children: n.children.map(collapse) };
};

const tree = collapse(crown);
const tipCount = (n) => (n.children ? n.children.reduce((s, c) => s + tipCount(c), 0) : 1);

const out = {
  source: "BEAST 2, five loci, strict clock",
  samples: ingroupSize,
  species: tipCount(tree),
  // The node joining the ingroup to the outgroups that are not drawn.
  stem: age(stem),
  tree,
};
writeFileSync("src/data/bunomys-chronogram.json", JSON.stringify(out, null, 2) + "\n");
console.log(`${out.species} species from ${out.samples} samples; crown ${tree.h} Ma`);
