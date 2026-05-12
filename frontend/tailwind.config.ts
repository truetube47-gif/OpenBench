import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bench: {
          bg:       "#080B12",
          surface:  "#0F1520",
          card:     "#141B2D",
          border:   "#1E2A42",
          muted:    "#8892A4",
          text:     "#E2E8F0",
          accent:   "#6366F1",
          accent2:  "#8B5CF6",
          green:    "#22C55E",
          amber:    "#F59E0B",
          red:      "#EF4444",
        },
      },
      fontFamily: {
        mono: ["'JetBrains Mono'", "monospace"],
      },
      backgroundImage: {
        "hero-glow": "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(99,102,241,0.15), transparent)",
        "card-glow":  "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(99,102,241,0.08), transparent)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4,0,0.6,1) infinite",
        "fade-in":    "fadeIn 0.4s ease-out",
        "slide-up":   "slideUp 0.4s ease-out",
      },
      keyframes: {
        fadeIn:  { from: { opacity: "0" }, to: { opacity: "1" } },
        slideUp: { from: { opacity: "0", transform: "translateY(12px)" }, to: { opacity: "1", transform: "translateY(0)" } },
      },
    },
  },
  plugins: [],
};

export default config;
