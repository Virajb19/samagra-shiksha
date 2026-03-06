import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"] as any,
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      keyframes: {
        floaty: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-6px)" },
        },
     shimmer: {
      "0%": { transform: "translateX(-150%) skewX(-12deg)" },
      "100%": { transform: "translateX(150%) skewX(-12deg)" },
    },
      },
      animation: {
        floaty: "floaty 1.6s ease-in-out infinite",
         shimmer: "shimmer 0.9s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
