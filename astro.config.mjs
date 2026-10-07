// @ts-check
import { defineConfig } from "astro/config";

import partytown from "@astrojs/partytown";

import preact from "@astrojs/preact";

// https://astro.build/config
export default defineConfig({
  integrations: [partytown(), preact()],
  // Astro 7 defaults to JSX whitespace rules, which drop the spaces between
  // prose and inline components such as <Link />. Keep the v5 behavior.
  compressHTML: true,
});
