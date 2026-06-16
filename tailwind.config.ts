import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Semantic tokens — driven by CSS variables (tokens.css), theme-switchable
        window: "var(--bg-window)",
        sidebar: "var(--bg-sidebar)",
        surface: "var(--bg-surface)",
        elevated: "var(--bg-elevated)",
        inset: "var(--bg-inset)",
        "border-subtle": "var(--border-subtle)",
        "border-strong": "var(--border-strong)",
        "text-primary": "var(--text-primary)",
        "text-secondary": "var(--text-secondary)",
        "text-tertiary": "var(--text-tertiary)",
        accent: "var(--accent)",
        "accent-soft": "var(--accent-soft)",
        success: "var(--success)",
        "success-soft": "var(--success-soft)",
        danger: "var(--danger)",
        "danger-soft": "var(--danger-soft)",
        warning: "var(--warning)",
        "warning-soft": "var(--warning-soft)",
        // syntax
        "syntax-key": "var(--syntax-key)",
        "syntax-string": "var(--syntax-string)",
        "syntax-number": "var(--syntax-number)",
        "syntax-bool": "var(--syntax-bool)",
        "syntax-null": "var(--syntax-null)",
        "syntax-punct": "var(--syntax-punct)",
        // traffic lights (fixed)
        "tl-red": "#FF5F57",
        "tl-yellow": "#FEBC2E",
        "tl-green": "#28C840",
      },
      fontFamily: {
        ui: "var(--font-ui)",
        mono: "var(--font-mono)",
        serif: "var(--font-serif)",
      },
      borderRadius: {
        sm: "6px",
        md: "10px",
        lg: "14px",
      },
      fontSize: {
        "2xs": ["10px", "1.4"],
        xs: ["11px", "1.4"],
        sm: ["12px", "1.45"],
        base: ["13px", "1.5"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
