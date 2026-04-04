module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        nav: ["var(--font-nav)", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
