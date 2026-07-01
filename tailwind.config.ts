import type { Config } from "tailwindcss";

// Mirrorwright palette: a near-black room lit only by the glass.
const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        room: {
          black: "#060607",
          obsidian: "#0E0F12",
          shadow: "#14242A",
        },
        glass: {
          mercury: "#C7CDD4",
          breath: "#EFF4F8",
          smoke: "#4A4E55",
          violet: "#2A2336",
        },
        // Ember warm appears only when the twin answers in its own voice.
        ember: "#E8A36A",
      },
      fontFamily: {
        display: ["var(--font-display)", "Georgia", "serif"],
        body: ["var(--font-body)", "system-ui", "sans-serif"],
      },
      keyframes: {
        breathe: {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%": { opacity: "0.75", transform: "scale(1.03)" },
        },
        drift: {
          "0%": { transform: "translateY(0) translateX(0)" },
          "50%": { transform: "translateY(-22px) translateX(6px)" },
          "100%": { transform: "translateY(0) translateX(0)" },
        },
        fog: {
          "0%": { opacity: "0.15", transform: "translateX(-4%) scale(1.05)" },
          "50%": { opacity: "0.4", transform: "translateX(4%) scale(1.1)" },
          "100%": { opacity: "0.15", transform: "translateX(-4%) scale(1.05)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "0% 50%" },
          "100%": { backgroundPosition: "200% 50%" },
        },
        bead: {
          "0%": { transform: "translateY(0)", opacity: "0" },
          "20%": { opacity: "0.8" },
          "100%": { transform: "translateY(14px)", opacity: "0" },
        },
      },
      animation: {
        breathe: "breathe 7s ease-in-out infinite",
        drift: "drift 16s ease-in-out infinite",
        fog: "fog 12s ease-in-out infinite",
        shimmer: "shimmer 9s linear infinite",
        bead: "bead 6s ease-in infinite",
      },
    },
  },
  plugins: [],
};

export default config;
