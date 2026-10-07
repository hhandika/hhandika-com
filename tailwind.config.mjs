/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Figtree", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["Newsreader", "ui-serif", "Georgia", "serif"],
      },
      colors: {
        // Ground: mist over the falls, behind the three tones.
        paper: "#f4f7f8",
        // Dark ground: the shaded forest floor.
        soil: "#0e1a12",
        // "Canopy" palette: three tones sampled from a mossy montane
        // waterfall: deep forest shade, sunlit moss, and the mist of
        // falling water.
        forest: {
          default: "#0e1a12",
          50: "#f3f6f4",
          100: "#e2e9e3",
          200: "#c5d3c8",
          300: "#9db3a3",
          400: "#718e78",
          500: "#53705b",
          600: "#405847",
          700: "#33473a",
          800: "#283a2e",
          900: "#1c2b21",
          950: "#0e1a12",
        },
        moss: {
          default: "#86ae3e",
          50: "#f5f9eb",
          100: "#e8f1d2",
          200: "#d3e4a9",
          300: "#b5d177",
          400: "#9bbf4f",
          500: "#86ae3e",
          600: "#688a2c",
          700: "#506a25",
          800: "#415522",
          900: "#37481f",
          950: "#1c270c",
        },
        mist: {
          default: "#e4ecee",
          50: "#f4f7f8",
          100: "#e4ecee",
          200: "#cdd9dd",
          300: "#a9bcc2",
          400: "#8199a2",
          500: "#637c86",
          600: "#4f646d",
          700: "#42535a",
          800: "#39464c",
          900: "#323c41",
          950: "#1e2629",
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
  plugins: [],
};
