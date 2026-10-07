// Tailwind 3 runs through PostCSS; @astrojs/tailwind does not support Astro 6+.
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
