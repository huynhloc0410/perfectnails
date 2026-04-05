module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        champagne: {
          50: "#faf7f0",
          100: "#f3ebdc",
          200: "#e5d5bc",
          300: "#d4bc91",
          400: "#c5a85c",
          500: "#b08d3a",
          600: "#95732e",
          700: "#7a5e28",
          800: "#4a3a1a",
          900: "#2a2314",
          950: "#17140f",
        },
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        nav: ["var(--font-nav)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
