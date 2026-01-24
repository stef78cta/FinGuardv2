import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
    "./src/**/*.{ts,tsx}",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      /* ============================================
         NEWA Design System - Tailwind Integration
         Source: newa_design-tokens.jsonc v2.0.0
         ============================================ */

      colors: {
        /* Core Semantic Colors (shadcn compatibility) */
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        background: "var(--background)",
        foreground: "var(--foreground)",

        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
        },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },

        /* NEWA Brand Colors */
        newa: {
          "primary-dark": "var(--newa-brand-primary-dark)",
          indigo: "var(--newa-brand-accent-indigo)",
          emerald: "var(--newa-brand-accent-emerald)",
          rose: "var(--newa-brand-danger-rose)",
        },

        /* NEWA Surface Colors */
        surface: {
          DEFAULT: "var(--newa-surface-canvas)",
          light: "var(--newa-surface-light)",
          canvas: "var(--newa-surface-canvas)",
        },

        /* NEWA Text Colors */
        text: {
          primary: "var(--newa-text-primary)",
          secondary: "var(--newa-text-secondary)",
          muted: "var(--newa-text-muted)",
          inverse: "var(--newa-text-inverse)",
        },

        /* NEWA Semantic Colors */
        semantic: {
          success: "var(--newa-semantic-success)",
          warning: "var(--newa-semantic-warning)",
          info: "var(--newa-semantic-info)",
          danger: "var(--newa-semantic-danger)",
        },

        /* NEWA Alert Colors */
        alert: {
          "success-bg": "var(--newa-alert-success-bg)",
          "warning-bg": "var(--newa-alert-warning-bg)",
          "info-bg": "var(--newa-alert-info-bg)",
          "danger-bg": "var(--newa-alert-danger-bg)",
          "success-border": "var(--newa-alert-success-border)",
          "warning-border": "var(--newa-alert-warning-border)",
          "info-border": "var(--newa-alert-info-border)",
          "danger-border": "var(--newa-alert-danger-border)",
        },

        /* NEWA Chart Colors */
        chart: {
          "1": "var(--newa-chart-1)",
          "2": "var(--newa-chart-2)",
          "3": "var(--newa-chart-3)",
          "4": "var(--newa-chart-4)",
          "5": "var(--newa-chart-5)",
          positive: "var(--newa-chart-positive)",
          negative: "var(--newa-chart-negative)",
          neutral: "var(--newa-chart-neutral)",
          "cat-1": "var(--newa-chart-cat-1)",
          "cat-2": "var(--newa-chart-cat-2)",
          "cat-3": "var(--newa-chart-cat-3)",
          "cat-4": "var(--newa-chart-cat-4)",
          "cat-5": "var(--newa-chart-cat-5)",
          "cat-6": "var(--newa-chart-cat-6)",
          "cat-7": "var(--newa-chart-cat-7)",
          "cat-8": "var(--newa-chart-cat-8)",
        },

        /* NEWA State Colors */
        state: {
          hover: "var(--newa-state-hover)",
          active: "var(--newa-state-active)",
          selected: "var(--newa-state-selected)",
        },

        /* NEWA Selection */
        selection: {
          bg: "var(--newa-selection-bg)",
          border: "var(--newa-selection-border)",
          text: "var(--newa-selection-text)",
        },

        /* NEWA Table Colors */
        table: {
          "header-bg": "var(--newa-table-header-bg)",
          "row-hover": "var(--newa-table-row-hover)",
          "row-selected": "var(--newa-table-row-selected)",
          "row-disabled-bg": "var(--newa-table-row-disabled-bg)",
          "row-disabled-text": "var(--newa-table-row-disabled-text)",
          "grid-border": "var(--newa-table-grid-border)",
        },

        /* NEWA Disabled State */
        disabled: {
          bg: "var(--newa-disabled-bg)",
          text: "var(--newa-disabled-text)",
          border: "var(--newa-disabled-border)",
        },

        /* Sidebar (shadcn) */
        sidebar: {
          DEFAULT: "var(--sidebar-background)",
          foreground: "var(--sidebar-foreground)",
          primary: "var(--sidebar-primary)",
          "primary-foreground": "var(--sidebar-primary-foreground)",
          accent: "var(--sidebar-accent)",
          "accent-foreground": "var(--sidebar-accent-foreground)",
          border: "var(--sidebar-border)",
          ring: "var(--sidebar-ring)",
        },
      },

      /* NEWA Font Family */
      fontFamily: {
        sans: ["var(--newa-font-application)"],
        serif: ["var(--newa-font-editorial)"],
        mono: ["var(--newa-font-mono)"],
        editorial: ["var(--newa-font-editorial)"],
        app: ["var(--newa-font-application)"],
      },

      /* NEWA Font Size */
      fontSize: {
        xs: ["var(--newa-font-size-xs)", { lineHeight: "var(--newa-line-height-normal)" }],
        sm: ["var(--newa-font-size-sm)", { lineHeight: "var(--newa-line-height-normal)" }],
        base: ["var(--newa-font-size-base)", { lineHeight: "var(--newa-line-height-normal)" }],
        lg: ["var(--newa-font-size-lg)", { lineHeight: "var(--newa-line-height-normal)" }],
        xl: ["var(--newa-font-size-xl)", { lineHeight: "var(--newa-line-height-tight)" }],
        "2xl": ["var(--newa-font-size-2xl)", { lineHeight: "var(--newa-line-height-tight)" }],
        "3xl": ["var(--newa-font-size-3xl)", { lineHeight: "var(--newa-line-height-tight)" }],
        "4xl": ["var(--newa-font-size-4xl)", { lineHeight: "var(--newa-line-height-tight)" }],
      },

      /* NEWA Line Height */
      lineHeight: {
        tight: "var(--newa-line-height-tight)",
        normal: "var(--newa-line-height-normal)",
        relaxed: "var(--newa-line-height-relaxed)",
      },

      /* NEWA Spacing (extends Tailwind's default) */
      spacing: {
        "newa-1": "var(--newa-spacing-1)",
        "newa-2": "var(--newa-spacing-2)",
        "newa-3": "var(--newa-spacing-3)",
        "newa-4": "var(--newa-spacing-4)",
        "newa-5": "var(--newa-spacing-5)",
        "newa-6": "var(--newa-spacing-6)",
        "newa-8": "var(--newa-spacing-8)",
        "newa-10": "var(--newa-spacing-10)",
        "newa-12": "var(--newa-spacing-12)",
      },

      /* NEWA Border Radius */
      borderRadius: {
        "newa-sm": "var(--newa-radius-sm)",
        "newa-md": "var(--newa-radius-md)",
        "newa-lg": "var(--newa-radius-lg)",
        "newa-xl": "var(--newa-radius-xl)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },

      /* NEWA Box Shadow */
      boxShadow: {
        "newa-sm": "var(--newa-shadow-sm)",
        "newa-md": "var(--newa-shadow-md)",
        "newa-lg": "var(--newa-shadow-lg)",
        sm: "var(--shadow-sm)",
        md: "var(--shadow-md)",
        lg: "var(--shadow-lg)",
      },

      /* Ring (Focus) */
      ringColor: {
        DEFAULT: "var(--newa-focus-ring-color)",
        focus: "var(--newa-focus-ring-color)",
      },
      ringWidth: {
        focus: "var(--newa-focus-ring-width)",
      },
      ringOffsetWidth: {
        focus: "var(--newa-focus-ring-offset)",
      },

      /* Opacity */
      opacity: {
        disabled: "var(--newa-disabled-opacity)",
      },

      /* Z-Index */
      zIndex: {
        dropdown: "var(--newa-z-dropdown)",
        sticky: "var(--newa-z-sticky)",
        modal: "var(--newa-z-modal)",
        tooltip: "var(--newa-z-tooltip)",
      },

      /* Height (for form fields and table rows) */
      height: {
        field: "var(--newa-field-height)",
        "field-compact": "var(--newa-density-compact-field)",
        "field-comfortable": "var(--newa-density-comfortable-field)",
        "row-compact": "var(--newa-density-compact-row)",
        "row-comfortable": "var(--newa-density-comfortable-row)",
      },

      /* Min Height */
      minHeight: {
        field: "var(--newa-field-height)",
      },

      /* Animations */
      keyframes: {
        "accordion-down": {
          from: { height: "0", opacity: "0" },
          to: { height: "var(--radix-accordion-content-height)", opacity: "1" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)", opacity: "1" },
          to: { height: "0", opacity: "0" },
        },
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(50px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "scale-in": {
          "0%": { opacity: "0", transform: "scale(0.95)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        spin: {
          from: { transform: "rotate(0deg)" },
          to: { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.3s ease-out",
        "accordion-up": "accordion-up 0.3s ease-out",
        "fade-in-up": "fade-in-up 0.6s ease-out",
        "slide-in-right": "slide-in-right 0.8s ease-out",
        "scale-in": "scale-in 0.4s ease-out",
        float: "float 3s ease-in-out infinite",
        spin: "spin 1s linear infinite",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
