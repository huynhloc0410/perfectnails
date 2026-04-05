module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
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
