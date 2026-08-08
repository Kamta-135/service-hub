import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Core design tokens for Service.Hub
        paper: "#FBF7F0",       // legacy warm paper (used by older landing components)
        canvas: "#F7F7F5",      // current light-theme background
        ink: "#1A1A1A",         // primary text
        // Current brand direction (orange) — used by auth, dashboard, and anything new.
        brand: {
          DEFAULT: "#FF7A1A",
          light: "#FFC15C",
          dark: "#E0650A",
        },
        // Legacy tokens — still used by the original landing page components.
        trust: {
          DEFAULT: "#1E3A5F",  // Indigo Trust — primary/authority
          light: "#2E4F7A",
          dark: "#132A47",
        },
        marigold: {
          DEFAULT: "#F5A623",  // warm accent / CTA
          light: "#FFC15C",
          dark: "#D68C0F",
        },
        signal: {
          DEFAULT: "#16A34A",  // available now / success
          light: "#DCFCE7",
        },
        alert: {
          DEFAULT: "#DC2626",  // emergency
          light: "#FEE2E2",
        },
        busy: {
          DEFAULT: "#D97706",
          light: "#FEF3C7",
        },
        line: "#E7DFD1",        // hairline borders on paper
        line2: "#ECE9E3",       // hairline borders on canvas
      },
      fontFamily: {
        display: ["var(--font-sora)", "sans-serif"],
        body: ["var(--font-inter)", "sans-serif"],
        mono: ["var(--font-plex-mono)", "monospace"],
      },
      borderRadius: {
        stamp: "999px",
      },
      keyframes: {
        "fade-slide-up": {
          "0%": { opacity: "0", transform: "translateY(14px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "stamp-in": {
          "0%": { opacity: "0", transform: "scale(0.6) rotate(-18deg)" },
          "70%": { opacity: "1", transform: "scale(1.06) rotate(3deg)" },
          "100%": { opacity: "1", transform: "scale(1) rotate(-6deg)" },
        },
        "type-cursor": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%": { opacity: "0.5", transform: "scale(0.85)" },
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" },
        },
      },
      animation: {
        "fade-slide-up": "fade-slide-up 0.6s cubic-bezier(0.16,1,0.3,1) both",
        "stamp-in": "stamp-in 0.7s cubic-bezier(0.16,1,0.3,1) both",
        "type-cursor": "type-cursor 0.9s step-start infinite",
        "pulse-dot": "pulse-dot 1.6s ease-in-out infinite",
        marquee: "marquee 22s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
