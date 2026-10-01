// Sitefliq design system — tokens.
// Premium B2B SaaS: deep navy/charcoal + white, Sitefliq orange used sparingly.
// Every screen should reference these tokens rather than hard-coding values.

export const theme = {
  color: {
    // Surfaces
    bg: "#ffffff",
    bgAlt: "#f6f7f9",      // subtle section background
    bgInk: "#0b1221",      // deep navy — dark sections / primary buttons
    bgInkAlt: "#121b30",   // raised dark surface

    // Text on light
    ink: "#0b1221",        // headings
    text: "#1b2435",       // body
    muted: "#5a6474",      // secondary
    faint: "#8b94a4",      // tertiary / captions

    // Text on dark
    onInk: "#ffffff",
    onInkMuted: "#aab3c5",
    onInkFaint: "#6b7688",

    // Lines
    border: "#e7e9ee",
    borderStrong: "#d3d8e0",
    borderInk: "rgba(255,255,255,0.12)",

    // Accent (use sparingly)
    accent: "#f97316",
    accentHover: "#ea6a08",
    accentSoft: "#fff4ec",
    accentBorder: "#ffd7bd",

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

  // Type scale — spread onto style props.
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
