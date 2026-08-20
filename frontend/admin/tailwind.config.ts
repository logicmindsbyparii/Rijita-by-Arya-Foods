import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#e8f5e9",
          100: "#c8e6c9",
          200: "#a5d6a7",
          300: "#81c784",
          400: "#4caf50",
          500: "#2E7D32",
          600: "#1B5E20",
          700: "#145218",
          800: "#0a2e0f",
          900: "#061f0a",
        },
        gold: {
          50: "#fffdf0",
          100: "#fdf4d4",
          200: "#fae8a8",
          300: "#f0d06a",
          400: "#e6b93e",
          500: "#D4A545",
          600: "#b88930",
          700: "#9a6e20",
          800: "#7d5518",
          900: "#5f3e10",
        },
        luxury: {
          50: "#faf6f0",
          100: "#f0e8d8",
          200: "#e0d0b0",
          300: "#c8b080",
          400: "#b09060",
          500: "#8a7040",
          600: "#6a5530",
          700: "#504020",
          800: "#3a3020",
          900: "#282018",
        },
        cream: "#FFF8F0",
        "spice-red": "#C0392B",
        spice: {
          red: "#C0392B",
          gold: "#D4A545",
          green: "#27AE60",
          saffron: "#F39C12",
        },
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        border: "hsl(var(--border))",
      },
      fontFamily: {
        display: ["var(--font-playfair)", "Georgia", "serif"],
        body: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        "fade-in": "fadeIn 0.6s ease-out",
        "slide-up": "slideUp 0.6s ease-out",
        "slide-down": "slideDown 0.3s ease-out",
        "scale-in": "scaleIn 0.3s ease-out",
        shimmer: "shimmer 2s infinite linear",
        float: "float 3s ease-in-out infinite",
        "spin-slow": "spin 8s linear infinite",
        marquee: "marquee-scroll 25s linear infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        slideDown: {
          "0%": { transform: "translateY(-10px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
        scaleIn: {
          "0%": { transform: "scale(0.95)", opacity: "0" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      backgroundImage: {
        "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
        "hero-pattern": "url('/hero-bg.jpg')",
      },
      transitionDuration: {
        short: "var(--dur-short)",
        long: "var(--dur-long)",
      },
      transitionTimingFunction: {
        "out-custom": "var(--ease-out)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
