/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./features/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        cream: "#F7F5EF",
        ivory: "#FCFBF7",
        sage: "#6F8E70",
        forest: "#0F4A24",
        mint: "#EEF4EA",
        terracotta: "#C17A5A",
        "warm-black": "#1C1917",
      },
    },
  },
  plugins: [],
}
