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
        floor: {
          bg: "#1a1a2e",
          grid: "#16213e",
          cell: "#0f3460",
          "cell-hover": "#1a4a7a",
          "cell-occupied": "#0d2137",
        },
      },
      gridTemplateColumns: {
        "floor-10": "repeat(10, minmax(0, 1fr))",
        "floor-8": "repeat(8, minmax(0, 1fr))",
        "floor-6": "repeat(6, minmax(0, 1fr))",
      },
    },
  },
  plugins: [],
  safelist: [
    // Equipment category colours — generated dynamically, must be safelisted
    {
      pattern:
        /^(bg|border|text)-(red|blue|green|purple|teal|gray)-(100|200|400|600|700|800)$/,
    },
  ],
};

export default config;
