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
        "input": "4.25rem",
      },
      fontFamily: {
        "inter": "Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji"
      },
      translate: {
        "input": "2.25rem",
      },
      keyframes: {
        "soundWave": {
          "0%": {
            "height": "3px",
            "opacity": "0.35"
          },
          "100%": {
            "height": "15px",
            "opacity": "0.95"
          }
        }
      },
      animation: {
        "sound": "soundWave 0ms -3200ms ease-in-out infinite alternate"
      }
    },
    colors: {
      text: "#FFFFFF",
      background: "#040316",
      accent: "#9693BD",
      settingName: "#A19EC4",
      primaryButton: "#4944A7",
      input: "#1D1C2D",
      toggleOff: "#807CC1",
      embedBackground: "#181414",
    }
  },
  safelist: [
    "animate-sound"
  ],
  plugins: [],
}

