import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#F3F9F3",
          100: "#E2F2E3",
          200: "#C3E4C6",
          300: "#9AD09E",
          400: "#4DAA55",
          500: "#238631",
          600: "#1B6E2A", // Exact Logo Green
          700: "#155821",
          800: "#0F4218",
          850: "#104319", // footer base bar
          900: "#0A290F",
          DEFAULT: "#1B6E2A",
        },
        /* WhatsApp brand colours — fixed by WhatsApp, not ours to re-tint */
        whatsapp: {
          600: "#20BD5C",
          700: "#1AA94A",
          DEFAULT: "#25D366",
        },
        /* Editorial light palette — mirrors tokens.css (paper / ink / rule) */
        paper: "var(--color-paper)",
        "paper-2": "var(--color-paper-2)",
        "paper-3": "var(--color-paper-3)",
        "paper-20": "var(--color-paper-20)",
        "paper-35": "var(--color-paper-35)",
        "paper-50": "var(--color-paper-50)",
        "paper-60": "var(--color-paper-60)",
        "paper-75": "var(--color-paper-75)",
        "paper-90": "var(--color-paper-90)",
        ink: "var(--color-ink)",
        "ink-2": "var(--color-ink-2)",
        "ink-3": "var(--color-ink-3)",
        "ink-faint": "var(--color-ink-faint)",
        "ink-soft": "var(--color-ink-soft)",
        "ink-mid": "var(--color-ink-mid)",
        rule: "var(--color-rule)",
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
        display: ["var(--font-playfair)", "var(--font-marcellus)", "Georgia", "serif"],
        body: ["var(--font-jakarta)", "system-ui", "-apple-system", "sans-serif"],
        sans: ["var(--font-jakarta)", "system-ui", "-apple-system", "sans-serif"],
        serif: ["var(--font-marcellus)", "var(--font-playfair)", "Georgia", "serif"],
        luxury: ["var(--font-cinzel)", "var(--font-playfair)", "serif"],
        modern: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      animation: {
        marquee: "marquee 35s linear infinite",
      },
      keyframes: {
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-33.33333%)" },
        },
      },
      transitionProperty: {
        /* The house transition. Everything a hover/focus state legitimately
           changes — and nothing that triggers layout or delays a focus ring. */
        ui: "background-color, border-color, color, fill, stroke, box-shadow, transform, opacity",
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
