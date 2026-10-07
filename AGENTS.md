# AGENTS.md

Guidance for AI coding agents working on this repository, the source of [hhandika.com](https://www.hhandika.com/).

## Setup and commands

Use **Bun** (not npm or Yarn) and **Node.js 24** (pinned in `package.json` `engines` for Vercel).

```bash
bun install
bun run dev      # local dev server (port 4321)
bun run build    # astro check + static build to dist/
```

- `bun run build` is the check before handing work back: it must report 0 errors.
- Do not start a second dev server while one is running. Two Vite dev servers share `node_modules/.vite` and break each other's dependency cache. To preview a build, run `bunx astro preview` on `dist/`.
- If the dev server shows `504 (Outdated Optimize Dep)`, clear `node_modules/.vite` and restart it.

## Repository rules

- Do not commit `.claude/` or other local agent settings. Put shared agent instructions here instead.
- Do not commit unless asked. Never force-push without explicit approval.
- Data-prep scripts in `scripts/` (R and Node) are run manually; their outputs in `src/data/` and `public/data/` are committed.

## Stack

- Astro 7, static output, TypeScript. Pages live in `src/pages/`, sections in `src/components/`.
- Tailwind CSS 3 through PostCSS (`postcss.config.mjs`, `src/styles/tailwind.css`). No component library.
- Interactive figures are Preact islands (`client:visible`) using Observable Plot, plus Leaflet and three.js maps.
- `compressHTML: true` in `astro.config.mjs` keeps the spaces between prose and inline components such as `<Link />`. Do not remove it.

## Code conventions

- Colors come from the custom palettes in `tailwind.config.mjs` (`forest`, `moss`, `mist`, plus `paper` and `soil`). Pair every color with a `dark:` variant; dark mode uses the `class` strategy.
- Write full class strings so Tailwind can find them; group long lists with `cntl`.
- In Astro templates, keep text and the expressions that follow it on one line when no space should appear between them. Since Astro 7, a line break between expressions renders as a space.
- In Preact components that insert DOM outside Preact (for example Observable Plot via `replaceChildren`), give conditionally rendered siblings distinct `key`s so Preact does not reuse the container.
- Figures need accessible text: an `aria-label` or caption that states the result, and keyboard-reachable controls.
- Compute figure numbers and captions from the data files rather than hard-coding them.

## Writing style for site content

- Concise, high-level prose; keep only what the page shows or supports.
- Section headings in sentence case.
- Italicize taxon names (`<i>Bunomys</i>`). Data-driven strings may contain `<i>` and are rendered with `set:html`.
- Do not start a sentence with a numeral.
- Link software, data standards, and collaborators on first mention.
- When the author supplies wording, use it verbatim unless asked to edit it.
