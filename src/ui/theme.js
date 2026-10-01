// Sitefliq design system — tokens.
// Premium B2B SaaS: charcoal + white, with electric blue used sparingly as the
// single accent.

export const theme = {
  color: {
    // Surfaces
    bg: "#ffffff",
    bgAlt: "#f6f7f9",
    bgInk: "#16181d",      // charcoal — dark sections / primary buttons
    bgInkAlt: "#23262e",   // raised dark surface

    // Text on light
    ink: "#16181d",        // headings
    text: "#1b2435",       // body
    muted: "#5a6474",      // secondary
    faint: "#8b94a4",      // tertiary / captions

    // Text on dark
    onInk: "#ffffff",
    onInkMuted: "#aab3c5",
    onInkFaint: "#7a808c",

    // Lines
    border: "#e7e9ee",
    borderStrong: "#d3d8e0",
    borderInk: "rgba(255,255,255,0.12)",

    // Accent — electric blue (use sparingly)
    accent: "#2563eb",
    accentHover: "#1d4ed8",
    accentSoft: "#eff6ff",
    accentBorder: "#bfdbfe",
    onAccent: "#ffffff",   // text/icon colour on an accent-filled surface

    success: "#15803d",
    danger: "#dc2626",
    warning: "#d97706",
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
