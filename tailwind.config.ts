import type { Config } from "tailwindcss";

/**
 * Sattva Design System v2 — derived entirely from the official HealerJi logo.
 * Official palette: primary #BE3A95 · secondary #4B0E42 · ink #141414.
 * mist = plum at 10% saturation (neutrals); functional states are
 * desaturated to sit quietly beside the brand hues.
 */
const brand = {
  plum: { 50: "#FBF4FA", 100: "#F5E5F3", 200: "#F3C3EC", 300: "#EA95DD", 400: "#DF5ECB", 500: "#D42BBB", 600: "#B2249D", 700: "#901D7F", 800: "#731765", 900: "#4B0E42", 950: "#340E2E" },
  orchid: { 50: "#FBF4F9", 100: "#F5E5F0", 200: "#EFC8E3", 300: "#E29CCD", 400: "#D369B3", 500: "#BE3A95", 600: "#A63082", 700: "#862769", 800: "#6B1F54", 900: "#4B1B3C", 950: "#311227" },
  mist: { 50: "#F8F7F8", 100: "#EEECEE", 200: "#DED9DD", 300: "#C3BBC2", 400: "#A598A3", 500: "#887785", 600: "#726470", 700: "#5C515B", 800: "#494048", 900: "#363035", 950: "#231F22" },
  success: { 50: "#F4FAF7", 100: "#E6F4ED", 200: "#CEE9DA", 300: "#A7D7BE", 400: "#7AC39C", 500: "#4FB07C", 600: "#439468", 700: "#367755", 800: "#2B5F43", 900: "#234332", 950: "#172C20" },
  warning: { 50: "#FBF8F4", 100: "#F5EEE5", 200: "#EFDDC7", 300: "#E3C29B", 400: "#D5A267", 500: "#C88437", 600: "#A86F2F", 700: "#885A26", 800: "#6C471E", 900: "#4C351A", 950: "#312211" },
  error: { 50: "#FAF4F4", 100: "#F4E6E6", 200: "#EACDCD", 300: "#D9A5A5", 400: "#C67676", 500: "#B44B4B", 600: "#973F3F", 700: "#7A3333", 800: "#612929", 900: "#452121", 950: "#2D1616" },
  info: { 50: "#F6F7F9", 100: "#EAECF0", 200: "#D5DAE1", 300: "#B5BCCA", 400: "#8E9AAE", 500: "#6B7A94", 600: "#5A667D", 700: "#495365", 800: "#3A4250", 900: "#2C313A", 950: "#1D2026" },
};

const config: Config = {
  darkMode: ["class"],
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ...brand,
        ink: { 600: "#4E4650", 900: "#141414" },
        night: { 900: "#1C1220", 950: "#150D18" },
        // Role tokens (aliases into the brand scales)
        surface: { 0: "#F8F7F8", 50: "#F4EDF2", 100: "#EFE5EC", 200: "#DED9DD", 300: "#C3BBC2" },
        primary: { DEFAULT: "#4B0E42", hover: "#901D7F", active: "#4B0E42" },
        accent: { DEFAULT: "#BE3A95", hover: "#A63082", active: "#862769" },
        border: { DEFAULT: "#DED9DD" },
      },
      fontFamily: {
        display: ["var(--font-display)", "var(--font-tiro)", "-apple-system", "system-ui", "sans-serif"],
        sans: ["var(--font-text)", "var(--font-anek)", "-apple-system", "system-ui", "sans-serif"],
      },
      fontSize: {
        // Optical tracking is baked in: the larger the size, the tighter the set.
        xs: ["0.8125rem", { lineHeight: "1.5", letterSpacing: "0.005em" }],
        sm: ["0.875rem", { lineHeight: "1.55", letterSpacing: "0" }],
        base: ["1rem", { lineHeight: "1.65", letterSpacing: "-0.003em" }],
        lg: ["1.125rem", { lineHeight: "1.6", letterSpacing: "-0.008em" }],
        xl: ["1.375rem", { lineHeight: "1.45", letterSpacing: "-0.014em" }],
        "2xl": ["1.75rem", { lineHeight: "1.3", letterSpacing: "-0.019em" }],
        "3xl": ["2.25rem", { lineHeight: "1.18", letterSpacing: "-0.023em" }],
        "4xl": ["2.875rem", { lineHeight: "1.1", letterSpacing: "-0.027em" }],
        "5xl": ["3.5rem", { lineHeight: "1.06", letterSpacing: "-0.031em" }],
        "6xl": ["4.25rem", { lineHeight: "1.02", letterSpacing: "-0.034em" }],
        "7xl": ["5.25rem", { lineHeight: "0.98", letterSpacing: "-0.037em" }],
      },
      borderRadius: { xs: "6px", sm: "10px", md: "14px", lg: "20px", full: "9999px" },
      boxShadow: {
        // Depth comes from a hairline and a barely-there cast, never a glow.
        "e-1": "0 0 0 1px rgba(20,20,20,0.045), 0 1px 2px rgba(20,20,20,0.035)",
        "e-2": "0 0 0 1px rgba(20,20,20,0.05), 0 12px 32px -12px rgba(20,20,20,0.14)",
        "e-3": "0 0 0 1px rgba(20,20,20,0.05), 0 28px 60px -24px rgba(20,20,20,0.20)",
        glass: "inset 0 1px 0 rgba(255,255,255,0.5), 0 1px 1px rgba(20,20,20,0.04)",
      },
      maxWidth: { measure: "62ch", reading: "70ch" },
      keyframes: {
        "aurora-a": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)" },
          "50%": { transform: "translate3d(6%, 4%, 0) scale(1.12)" },
        },
        "aurora-b": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1.08)" },
          "50%": { transform: "translate3d(-5%, -3%, 0) scale(1)" },
        },
        "aurora-c": {
          "0%, 100%": { transform: "translate3d(0,0,0) scale(1)", opacity: "0.6" },
          "50%": { transform: "translate3d(4%, -5%, 0) scale(1.15)", opacity: "1" },
        },
        "border-glow": {
          from: { "--glow-angle": "0deg" },
          to: { "--glow-angle": "360deg" },
        },
        breathe: {
          "0%, 100%": { transform: "scale(1)", opacity: "0.55" },
          "50%": { transform: "scale(1.06)", opacity: "0.85" },
        },
        drift: {
          "0%, 100%": { transform: "translate3d(0,0,0)" },
          "50%": { transform: "translate3d(2.5rem,-1.5rem,0)" },
        },
        rise: {
          from: { opacity: "0", transform: "translateY(8px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "aurora-a": "aurora-a 34s ease-in-out infinite",
        "aurora-b": "aurora-b 42s ease-in-out infinite",
        "aurora-c": "aurora-c 38s ease-in-out infinite",
        "border-glow": "border-glow 9s linear infinite",
        breathe: "breathe 10s ease-in-out infinite",
        "breathe-slow": "breathe 14s ease-in-out infinite",
        drift: "drift 20s ease-in-out infinite",
        rise: "rise 0.4s ease-out both",
      },
      transitionTimingFunction: { calm: "cubic-bezier(0.22, 1, 0.36, 1)" },
    },
  },
  plugins: [],
};

export default config;
