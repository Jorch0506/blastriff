import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0A0A0A",
        surface: "#111111",
        "surface-elevated": "#1A1A1A",
        border: "#2A2A2A",
        primary: {
          DEFAULT: "#CC0000",
          hover: "#FF0000",
        },
        gold: {
          DEFAULT: "#FFD700",
          dim: "#B8860B",
        },
        text: {
          DEFAULT: "#F5F5F5",
          muted: "#888888",
        },
        success: "#00C853",
        error: "#FF1744",
        warning: "#FF6D00",
      },
      fontFamily: {
        metal: ["var(--font-metal-mania)", "cursive"],
        sans: ["var(--font-inter)", "sans-serif"],
      },
      animation: {
        "float-up": "float-up 1s ease-out forwards",
        shake: "shake 0.4s ease-in-out",
        "pulse-gold": "pulse-gold 2s ease-in-out infinite",
        "glow-red": "glow-red 1.8s ease-in-out infinite",
      },
      keyframes: {
        "float-up": {
          "0%": { transform: "translateY(0)", opacity: "1" },
          "100%": { transform: "translateY(-60px)", opacity: "0" },
        },
        shake: {
          "0%, 100%": { transform: "translateX(0)" },
          "20%": { transform: "translateX(-8px)" },
          "40%": { transform: "translateX(8px)" },
          "60%": { transform: "translateX(-6px)" },
          "80%": { transform: "translateX(6px)" },
        },
        "pulse-gold": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(255, 215, 0, 0.5)" },
          "50%": { boxShadow: "0 0 20px 4px rgba(255, 215, 0, 0.5)" },
        },
        "glow-red": {
          "0%, 100%": { boxShadow: "0 0 6px 0 rgba(204, 0, 0, 0.6)" },
          "50%": { boxShadow: "0 0 18px 4px rgba(255, 0, 0, 0.7)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
