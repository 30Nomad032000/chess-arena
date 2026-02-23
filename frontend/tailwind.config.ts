import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#08080A",
        panel: "#0E0E12",
        surface: "#151519",
        elevated: "#1A1A20",
        "arena-border": "#242430",
        "border-dim": "#1A1A24",
        "t-primary": "#D4D0C8",
        "t-secondary": "#7A7A88",
        "t-dim": "#4A4A56",
        red: "#E53935",
        "red-glow": "rgba(229,57,53,0.12)",
        green: "#00E676",
        "green-glow": "rgba(0,230,118,0.10)",
        amber: "#FFB300",
        "amber-glow": "rgba(255,179,0,0.08)",
      },
      fontFamily: {
        mono: ['"IBM Plex Mono"', "monospace"],
        heading: ['"Space Grotesk"', "sans-serif"],
        display: ['"Instrument Serif"', "serif"],
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        pill: "100px",
      },
      animation: {
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
        blink: "blink 1s step-end infinite",
        ticker: "ticker 30s linear infinite",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.4", transform: "scale(1.5)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        ticker: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
