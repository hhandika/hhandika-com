/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        // "Talamau" palette, sampled from the Mt. Talamau (West Sumatra)
        // summit at sunrise: mossy crater rim, sunrise gold, ember shrubs,
        // crater lakes and sky.
        moss: {
          default: "#5c6f28",
          50: "#f6f7ee",
          100: "#e9edd6",
          200: "#d3dcae",
          300: "#b5c47c",
          400: "#95a852",
          500: "#788d36",
          600: "#5c6f28",
          700: "#475622",
          800: "#3a4520",
          900: "#313b1e",
          950: "#191f0c",
        },
        sunrise: {
          default: "#eeab30",
          50: "#fef9ec",
          100: "#fbefc9",
          200: "#f7dd8f",
          300: "#f2c455",
          400: "#eeab30",
          500: "#e08b1b",
          600: "#c46815",
          700: "#a24a16",
          800: "#843a19",
          900: "#6c3118",
          950: "#3e170a",
        },
        crater: {
          default: "#4a66a6",
          50: "#f2f6fb",
          100: "#e2eaf5",
          200: "#ccdbee",
          300: "#9abbde",
          400: "#7598cd",
          500: "#5a7bbe",
          600: "#4a66a6",
          700: "#3f5487",
          800: "#374770",
          900: "#303c5b",
          950: "#1f263a",
        },
      },
      keyframes: {
        "slide-in-bottom": {
          "0%": { transform: "translateY(100%)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
      animation: {
        "slide-in-bottom": "slide-in-bottom 1s ease-out forwards",
      },
    },
  },
  plugins: [require("daisyui")],
};
