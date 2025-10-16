/** @type {import('tailwindcss').Config} */
export default {
  presets: [require('./tailwind.poolsuite.preset.cjs')],
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}

