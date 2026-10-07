# <img src="https://raw.githubusercontent.com/hhandika/hhandika-com/main/public/favicon-dark.svg" alt="Web logo" width="40"> HHANDIKA-COM

Source code for [hhandika.com](https://www.hhandika.com/), the personal website of Heru Handika, an evolutionary biologist working on island speciation, natural history collections, AI for biodiversity, and open-source scientific software. The site presents research projects, software, fieldwork, and a CV, with interactive maps and figures built from published data.

## Tech stack

- **Framework:** [Astro](https://astro.build) 7 with TypeScript, rendering static pages
- **Styling:** [Tailwind CSS](https://tailwindcss.com) 3 through PostCSS, with light and dark themes
- **Interactive figures:** [Preact](https://preactjs.com) islands with [Observable Plot](https://observablehq.com/plot/), [Leaflet](https://leafletjs.com) for the fieldwork map, and [three.js](https://threejs.org) for the 3D map
- **Third-party scripts:** [Partytown](https://partytown.builder.io) moves them off the main thread
- **Data preparation:** one-time R and Node scripts in `scripts/` build the figure data, and their outputs are committed

## Development

Uses [Bun](https://bun.sh) and Node.js 24.

```bash
bun install
bun run dev      # local dev server
bun run build    # type check and build to dist/
```
