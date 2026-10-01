import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./config/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#8F1D2D", // Deep red primary
          pressed: "#741725",
          light: "#FDF2F3",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          subtle: "#F7F7F8", // Gray 50
        },
        border: {
          DEFAULT: "#ECEDEF", // Gray 100
        },
        content: {
          DEFAULT: "#202124", // Gray 900
          muted: "#686B70", // Gray 500
        },
        status: {
          success: "#247A4B",
          "success-subtle": "#EBF6F0",
          warning: "#A45A00",
          "warning-subtle": "#FFF8EE",
          danger: "#C5221F",
          "danger-subtle": "#FCE8E6",
        },
      },
      fontFamily: {
        sans: ["var(--font-noto-sans-thai)", "sans-serif"],
      },
      screens: {
        xs: "360px",
      },
    },
  },
  plugins: [],
};
export default config;
