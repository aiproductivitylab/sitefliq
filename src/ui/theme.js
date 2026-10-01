// Sitefliq design system — tokens.
// Premium B2B SaaS: a deep dark surface + white, with one accent used sparingly.
//
// TEMPORARY: four candidate palettes are switchable via ?theme=a|b|c|d so they
// can be compared live in the browser. Default is "d" (current navy + orange).
// Once a palette is chosen, collapse this to a single palette and remove the
// ThemeSwitcher in kit.jsx.

const PALETTES = {
  // a) Midnight navy + emerald (money / growth)
  a: {
    bgInk: "#0a1628", bgInkAlt: "#102038", ink: "#0a1628", onInkFaint: "#67748c",
    accent: "#059669", accentHover: "#047857", accentSoft: "#ecfdf5", accentBorder: "#a7f3d0", onAccent: "#ffffff",
  },
  // b) Charcoal + electric blue (classic SaaS trust)
  b: {
    bgInk: "#16181d", bgInkAlt: "#23262e", ink: "#16181d", onInkFaint: "#7a808c",
    accent: "#2563eb", accentHover: "#1d4ed8", accentSoft: "#eff6ff", accentBorder: "#bfdbfe", onAccent: "#ffffff",
  },
  // c) Black + gold (luxury / premium)
  c: {
    bgInk: "#0b0b0d", bgInkAlt: "#18181b", ink: "#0b0b0d", onInkFaint: "#7c7a74",
    accent: "#bd962f", accentHover: "#a9841f", accentSoft: "#faf5e6", accentBorder: "#e7d3a0", onAccent: "#1a1407",
  },
  // d) Current navy + orange (default)
  d: {
    bgInk: "#0b1221", bgInkAlt: "#121b30", ink: "#0b1221", onInkFaint: "#6b7688",
    accent: "#f97316", accentHover: "#ea6a08", accentSoft: "#fff4ec", accentBorder: "#ffd7bd", onAccent: "#ffffff",
  },
};

export function getThemeKey() {
  try {
    const p = new URLSearchParams(window.location.search).get("theme");
    if (p && PALETTES[p]) return p;
  } catch { /* no window (prerender) → default */ }
  return "d";
}

export const themeKey = getThemeKey();
const palette = PALETTES[themeKey];

export const theme = {
  color: {
    // Surfaces (shared)
    bg: "#ffffff",
    bgAlt: "#f6f7f9",
    // Dark surface + accent come from the active palette
    bgInk: palette.bgInk,
    bgInkAlt: palette.bgInkAlt,

    // Text on light
    ink: palette.ink,
    text: "#1b2435",
    muted: "#5a6474",
    faint: "#8b94a4",

    // Text on dark
    onInk: "#ffffff",
    onInkMuted: "#aab3c5",
    onInkFaint: palette.onInkFaint,

    // Lines
    border: "#e7e9ee",
    borderStrong: "#d3d8e0",
    borderInk: "rgba(255,255,255,0.12)",

    // Accent (use sparingly)
    accent: palette.accent,
    accentHover: palette.accentHover,
    accentSoft: palette.accentSoft,
    accentBorder: palette.accentBorder,
    onAccent: palette.onAccent,   // text/icon colour on an accent-filled surface

    success: "#15803d",
    danger: "#dc2626",
  },

  // 4px base spacing scale — space(4) === "16px"
  space: (n) => `${n * 4}px`,

  radius: { sm: "8px", md: "12px", lg: "16px", xl: "22px", pill: "999px" },

  shadow: {
    sm: "0 1px 2px rgba(16,24,40,.05)",
    md: "0 6px 20px rgba(16,24,40,.08)",
    lg: "0 20px 50px rgba(16,24,40,.12)",
    ink: "0 24px 60px rgba(11,18,33,.40)",
  },

  font: {
    sans: "'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif",
  },

  type: {
    display: { fontSize: "clamp(42px,5.4vw,66px)", lineHeight: 1.04, letterSpacing: "-0.03em", fontWeight: 700 },
    h1:      { fontSize: "clamp(32px,4vw,46px)",  lineHeight: 1.1,  letterSpacing: "-0.025em", fontWeight: 700 },
    h2:      { fontSize: "clamp(24px,3vw,34px)",  lineHeight: 1.15, letterSpacing: "-0.02em",  fontWeight: 700 },
    h3:      { fontSize: "19px", lineHeight: 1.35, letterSpacing: "-0.01em", fontWeight: 600 },
    body:    { fontSize: "16px", lineHeight: 1.7,  fontWeight: 400 },
    small:   { fontSize: "14px", lineHeight: 1.6,  fontWeight: 400 },
    eyebrow: { fontSize: "12px", lineHeight: 1, letterSpacing: "0.16em", fontWeight: 600, textTransform: "uppercase" },
  },

  maxWidth: "1120px",
};
