/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        cream: "#F0EBE1",
        sage: "#7C9A7E",
        terracotta: "#C17A5A",
        "warm-black": "#1C1917",
      },
    },
  },
  plugins: [],
}
