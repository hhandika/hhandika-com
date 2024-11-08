/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}"],
  theme: {
    extend: {
      colors: {
        "talamau-blue": "#1B578C",
        "talamau-light-blue": "#537FA6",
        "talamau-yellow": "#F2BF27",
        "talamau-brown": "#A66414",
        "talamau-dark-brown": "#59290C",
      },
    },
  },
  plugins: [],
};
