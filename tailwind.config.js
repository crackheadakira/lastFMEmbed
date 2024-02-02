/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{html,js}"],
  theme: {
    extend: {
      height: {
        "816px": "816px",
        "embed": "120px"
      },
      width: {
        "embed": "382px",
      },
      fontFamily: {
        "inter-tight": "Inter Tight, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji"
      }
    },
    colors: {
      text: "#FFFFFF",
      background: "#040316",
      accent: "#9693BD",
      primaryButton: "#4944A7",
      input: "#1D1C2D",
      toggleOff: "#807CC1",
      embedBackground: "#181414",
    }
  },
  plugins: [],
}

