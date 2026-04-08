module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        /** Luxury salon: espresso, warm paper, bronze accent (homepage Style A) */
        lux: {
          paper: "#faf8f4",
          cream: "#f3efe8",
          espresso: "#2a241c",
          espressoLight: "#3d352c",
          bronze: "#9a835c",
          line: "#c9b896",
          mist: "#e8e2d6",
        },
        champagne: {
          50: "#f7f3e8",
          100: "#ebe3d0",
          200: "#d9ccb0",
          300: "#c4b082",
          400: "#a88a3d",
          500: "#8f7228",
          600: "#765d22",
          700: "#5e4a1c",
          800: "#3d3114",
          900: "#241e0f",
          950: "#141108",
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
