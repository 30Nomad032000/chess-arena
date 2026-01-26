import type { Config } from "tailwindcss";

export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        void: "#0A0A0C",
        elevated: "#111114",
        surface: "#1C1C22",
        "arena-border": "#2A2A32",
        "border-subtle": "#1E1E26",
        "warm-white": "#E8E4DD",
        secondary: "#8A8A96",
        muted: "#5A5A66",
        "signal-red": "#E63B2E",
        "signal-red-hover": "#FF4D3D",
        "terminal-green": "#22C55E",
        amber: "#F59E0B",
        "red-dim": "rgba(230,59,46,0.08)",
        "green-dim": "rgba(34,197,94,0.12)",
      },
      fontFamily: {
        heading: ['"Space Grotesk"', "sans-serif"],
        drama: ['"Instrument Serif"', "serif"],
        mono: ['"JetBrains Mono"', "monospace"],
        tabular: ['"IBM Plex Mono"', "monospace"],
      },
      letterSpacing: {
        tighter: "-0.03em",
        label: "0.1em",
        nav: "0.08em",
      },
      borderRadius: {
        card: "1rem",
        pill: "100px",
      },
      animation: {
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
        blink: "blink 1s step-end infinite",
      },
      keyframes: {
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.6", transform: "scale(1.3)" },
        },
        blink: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
