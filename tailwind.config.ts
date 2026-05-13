import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
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
      colors: {
        border: "hsl(var(--border))",
        "border-light": "hsl(var(--border-light))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        "background-secondary": "hsl(var(--background-secondary))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
          pressed: "hsl(var(--primary-pressed))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        surface: {
          DEFAULT: "hsl(var(--surface))",
          muted: "hsl(var(--surface-muted))",
        },
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        premium: {
          DEFAULT: "hsl(var(--premium))",
          foreground: "hsl(var(--premium-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        xs: "var(--radius-xs)",
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        full: "var(--radius-full)",
      },
      spacing: {
        "1": "4px",
        "2": "8px",
        "3": "12px",
        "4": "16px",
        "5": "20px",
        "6": "24px",
        "8": "32px",
        "10": "40px",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        elevated: "var(--shadow-elevated)",
      },
      transitionDuration: {
        fast: "var(--motion-fast)",
        normal: "var(--motion-normal)",
        slow: "var(--motion-slow)",
      },
      transitionTimingFunction: {
        premium: "var(--ease-premium)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "cta-pulse": {
          "0%, 100%": { boxShadow: "0 0 0 0 hsl(var(--primary) / 0.45)" },
          "50%": { boxShadow: "0 0 0 12px hsl(var(--primary) / 0)" },
        },
        "bell-wiggle": {
          "0%, 60%, 100%": { transform: "rotate(0deg)" },
          "10%": { transform: "rotate(-12deg)" },
          "20%": { transform: "rotate(10deg)" },
          "30%": { transform: "rotate(-8deg)" },
          "40%": { transform: "rotate(6deg)" },
          "50%": { transform: "rotate(-3deg)" },
        },
        "breathe": {
          "0%, 100%": { boxShadow: "0 8px 24px -8px hsl(var(--primary) / 0.35)" },
          "50%":      { boxShadow: "0 14px 34px -6px hsl(var(--primary) / 0.55)" },
        },
        "arrow-nudge": {
          "0%, 70%, 100%": { transform: "translateX(0)" },
          "82%":           { transform: "translateX(4px)" },
          "92%":           { transform: "translateX(-1px)" },
        },
        "tick-pop": {
          "0%":   { transform: "scale(0.6)", opacity: "0" },
          "60%":  { transform: "scale(1.15)", opacity: "1" },
          "100%": { transform: "scale(1)", opacity: "1" },
        },
        "bubble-pop": {
          "0%":   { transform: "scale(0.92) translateY(6px)", opacity: "0" },
          "60%":  { transform: "scale(1.02) translateY(0)",   opacity: "1" },
          "100%": { transform: "scale(1) translateY(0)",      opacity: "1" },
        },
        "dots-bounce": {
          "0%, 80%, 100%": { transform: "translateY(0)",   opacity: "0.45" },
          "40%":           { transform: "translateY(-3px)", opacity: "1" },
        },
        "paw-bounce": {
          "0%, 100%": { transform: "translateY(0) rotate(0)" },
          "30%":      { transform: "translateY(-3px) rotate(-6deg)" },
          "60%":      { transform: "translateY(0) rotate(4deg)" },
        },
        "heart-pulse": {
          "0%":   { transform: "scale(1)" },
          "30%":  { transform: "scale(1.25)" },
          "60%":  { transform: "scale(0.94)" },
          "100%": { transform: "scale(1)" },
        },
        "pulse-soft": {
          "0%, 100%": { opacity: "1", transform: "scale(1)" },
          "50%":      { opacity: "0.75", transform: "scale(1.12)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "cta-pulse": "cta-pulse 1.6s ease-out 1",
        "bell-wiggle": "bell-wiggle 1.4s ease-in-out 0.6s 1",
        "breathe": "breathe 6s ease-in-out infinite",
        "arrow-nudge": "arrow-nudge 1.6s ease-in-out 0.8s 1",
        "tick-pop": "tick-pop 450ms cubic-bezier(0.34, 1.56, 0.64, 1) 1",
        "bubble-pop": "bubble-pop 240ms cubic-bezier(0.34, 1.56, 0.64, 1) 1",
        "dots-bounce": "dots-bounce 1.2s ease-in-out infinite",
        "paw-bounce": "paw-bounce 600ms cubic-bezier(0.34, 1.56, 0.64, 1) 1",
        "heart-pulse": "heart-pulse 380ms cubic-bezier(0.34, 1.56, 0.64, 1) 1",
        "pulse-soft": "pulse-soft 2s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
