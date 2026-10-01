// Sitefliq design system — reusable components.
// Built on the tokens in theme.js. Inline-styled (the app uses no CSS framework).
import { useState } from "react";
import { theme as t } from "./theme";

/* Layout ------------------------------------------------------------------ */

export function Container({ children, style }) {
  return <div style={{ maxWidth: t.maxWidth, margin: "0 auto", padding: "0 24px", ...style }}>{children}</div>;
}

export function Section({ children, dark, alt, style }) {
  const bg = dark ? t.color.bgInk : alt ? t.color.bgAlt : t.color.bg;
  return (
    <section style={{ background: bg, padding: "clamp(56px,8vw,104px) 0", ...style }}>
      <Container>{children}</Container>
    </section>
  );
}

/* Text -------------------------------------------------------------------- */

export function Eyebrow({ children, onDark, style }) {
  return (
    <div style={{ ...t.type.eyebrow, color: t.color.accent, marginBottom: 14, ...style }}>
      {children}
    </div>
  );
}

export function Heading({ as: As = "h2", level = "h2", onDark, children, style }) {
  return <As style={{ ...t.type[level], color: onDark ? t.color.onInk : t.color.ink, margin: 0, ...style }}>{children}</As>;
}

export function Text({ children, onDark, muted, small, style }) {
  return (
    <p style={{ ...(small ? t.type.small : t.type.body), color: onDark ? t.color.onInkMuted : (muted ? t.color.muted : t.color.text), margin: 0, ...style }}>
      {children}
    </p>
  );
}

/* Buttons ----------------------------------------------------------------- */

const BTN_SIZES = {
  sm: { padding: "8px 14px", fontSize: 13 },
  md: { padding: "11px 20px", fontSize: 14 },
  lg: { padding: "14px 26px", fontSize: 15 },
};

// variants: primary (ink), accent (orange — use sparingly), secondary (outline),
// ghost (transparent), onInk (outline on dark surfaces).
export function Button({ variant = "primary", size = "md", as = "button", href, onClick, disabled, children, style, ...rest }) {
  const [hover, setHover] = useState(false);
  const palette = {
    primary:   { bg: t.color.bgInk, bgH: "#161f33", fg: t.color.onInk, border: "transparent" },
    accent:    { bg: t.color.accent, bgH: t.color.accentHover, fg: t.color.onAccent, border: "transparent" },
    secondary: { bg: t.color.bg, bgH: t.color.bgAlt, fg: t.color.ink, border: t.color.borderStrong },
    ghost:     { bg: "transparent", bgH: t.color.bgAlt, fg: t.color.text, border: "transparent" },
    onInk:     { bg: "rgba(255,255,255,0.06)", bgH: "rgba(255,255,255,0.12)", fg: t.color.onInk, border: t.color.borderInk },
  }[variant] || {};
  const sz = BTN_SIZES[size] || BTN_SIZES.md;

  const baseStyle = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
    fontFamily: t.font.sans, fontWeight: 600, lineHeight: 1,
    borderRadius: t.radius.md, cursor: disabled ? "not-allowed" : "pointer",
    border: `1px solid ${palette.border}`,
    background: disabled ? t.color.border : (hover && !disabled ? palette.bgH : palette.bg),
    color: disabled ? t.color.faint : palette.fg,
    textDecoration: "none", whiteSpace: "nowrap",
    transition: "background .18s ease, transform .18s ease, box-shadow .18s ease",
    transform: hover && !disabled ? "translateY(-1px)" : "none",
    ...sz, ...style,
  };
  const handlers = {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    onClick: disabled ? undefined : onClick,
  };
  if (as === "a") return <a href={href} style={baseStyle} {...handlers} {...rest}>{children}</a>;
  return <button type="button" disabled={disabled} style={baseStyle} {...handlers} {...rest}>{children}</button>;
}

/* Cards + badges ---------------------------------------------------------- */

export function Card({ children, hover, dark, style }) {
  const [h, setH] = useState(false);
  return (
    <div
      onMouseEnter={hover ? () => setH(true) : undefined}
      onMouseLeave={hover ? () => setH(false) : undefined}
      style={{
        background: dark ? t.color.bgInkAlt : t.color.bg,
        border: `1px solid ${dark ? t.color.borderInk : t.color.border}`,
        borderRadius: t.radius.lg,
        boxShadow: hover && h ? t.shadow.lg : t.shadow.sm,
        transform: hover && h ? "translateY(-3px)" : "none",
        transition: "box-shadow .22s ease, transform .22s ease",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Badge({ children, tone = "neutral", style }) {
  const tones = {
    neutral: { bg: t.color.bgAlt, fg: t.color.muted, border: t.color.border },
    accent:  { bg: t.color.accentSoft, fg: t.color.accent, border: t.color.accentBorder },
    onInk:   { bg: "rgba(255,255,255,0.08)", fg: t.color.onInkMuted, border: t.color.borderInk },
  }[tone] || {};
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "4px 11px", borderRadius: t.radius.pill,
      fontSize: 12, fontWeight: 600, letterSpacing: "0.01em",
      background: tones.bg, color: tones.fg, border: `1px solid ${tones.border}`,
      ...style,
    }}>{children}</span>
  );
}

/* Inputs (for Stage 2 reuse) --------------------------------------------- */

export function Input({ value, onChange, placeholder, type = "text", style, ...rest }) {
  const [focus, setFocus] = useState(false);
  return (
    <input
      type={type} value={value} onChange={onChange} placeholder={placeholder}
      onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
      style={{
        width: "100%", padding: "11px 13px", fontFamily: t.font.sans, fontSize: 14,
        color: t.color.ink, background: t.color.bg,
        border: `1px solid ${focus ? t.color.accent : t.color.borderStrong}`,
        borderRadius: t.radius.md, outline: "none",
        boxShadow: focus ? `0 0 0 3px ${t.color.accentSoft}` : "none",
        transition: "border-color .15s ease, box-shadow .15s ease", ...style,
      }}
      {...rest}
    />
  );
}

export function Field({ label, hint, children, style }) {
  return (
    <label style={{ display: "block", ...style }}>
      <span style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: t.color.text }}>{label}</span>
        {hint && <span style={{ fontSize: 12, color: t.color.faint }}>{hint}</span>}
      </span>
      {children}
    </label>
  );
}

/* Icons (minimal line SVGs — no emoji) ----------------------------------- */

export function Check({ size = 16, color = t.color.accent }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }} aria-hidden="true">
      <path d="M13 4.5 6.5 11.5 3 8" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function Arrow({ size = 15, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M3 8h10M9 4l4 4-4 4" stroke={color} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* Brand ------------------------------------------------------------------- */

export function Logo({ onClick, onDark, size = 26 }) {
  return (
    <div onClick={onClick} style={{ display: "inline-flex", alignItems: "center", gap: 9, cursor: onClick ? "pointer" : "default" }}>
      <span style={{
        width: size, height: size, borderRadius: 7, background: t.color.accent,
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        color: "#fff", fontWeight: 700, fontSize: size * 0.5,
      }}>S</span>
      <span style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em", color: onDark ? t.color.onInk : t.color.ink }}>Sitefliq</span>
    </div>
  );
}

/* Marketing nav + footer (shared by home/pricing) ------------------------ */

export function MarketingNav({ onHome, onBuild, onSignIn, onSignOut, user, credits, links = [] }) {
  return (
    <nav style={{
      position: "sticky", top: 0, zIndex: 100, height: 64,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 24px", maxWidth: t.maxWidth, margin: "0 auto",
    }}>
      <Logo onClick={onHome} />
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        {links.map(l => (
          <Button key={l.label} variant="ghost" size="sm" onClick={l.onClick}>{l.label}</Button>
        ))}
        {user ? (
          <>
            <Badge style={{ marginLeft: 4 }}>{credits} credits</Badge>
            <Button variant="ghost" size="sm" onClick={onSignOut}>Sign out</Button>
          </>
        ) : (
          <Button variant="ghost" size="sm" onClick={onSignIn}>Sign in</Button>
        )}
        <Button variant="accent" size="sm" onClick={onBuild}>Start building</Button>
      </div>
    </nav>
  );
}

export function MarketingFooter({ onMarketing }) {
  const legal = [["terms", "Terms"], ["privacy", "Privacy"], ["refund", "Refund"], ["acceptable-use", "Acceptable Use"]];
  const compare = [["vs-durable", "Durable"], ["vs-carrd", "Carrd"], ["vs-wix", "Wix"]];
  const solutions = [["for-plumbers", "Plumbers"], ["for-electricians", "Electricians"], ["for-gyms", "Gyms"], ["for-salons", "Salons"]];
  const linkStyle = { fontSize: 13, color: t.color.muted, textDecoration: "none", cursor: "pointer" };
  const colHead = { ...t.type.eyebrow, color: t.color.faint, marginBottom: 14 };
  return (
    <footer style={{ background: t.color.bgInk, color: t.color.onInkMuted }}>
      <Container style={{ padding: "56px 24px 40px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr 1fr 1fr", gap: 32 }}>
          <div>
            <Logo onDark />
            <p style={{ ...t.type.small, color: t.color.onInkFaint, marginTop: 14, maxWidth: 260 }}>
              AI website builder for local businesses and the agencies that serve them.
            </p>
          </div>
          <div>
            <div style={colHead}>Compare</div>
            {compare.map(([s, l]) => (
              <a key={s} href={`/${s}`} onClick={e => { e.preventDefault(); onMarketing(s); }} style={{ ...linkStyle, display: "block", marginBottom: 9 }}>vs {l}</a>
            ))}
          </div>
          <div>
            <div style={colHead}>Solutions</div>
            {solutions.map(([s, l]) => (
              <a key={s} href={`/${s}`} onClick={e => { e.preventDefault(); onMarketing(s); }} style={{ ...linkStyle, display: "block", marginBottom: 9 }}>{l}</a>
            ))}
          </div>
          <div>
            <div style={colHead}>Legal</div>
            {legal.map(([s, l]) => (
              <a key={s} href={`#${s}`} style={{ ...linkStyle, display: "block", marginBottom: 9 }}>{l}</a>
            ))}
          </div>
        </div>
        <div style={{ borderTop: `1px solid ${t.color.borderInk}`, marginTop: 40, paddingTop: 24, display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <span style={{ ...t.type.small, color: t.color.onInkFaint }}>© 2026 Sitefliq</span>
          <a href="mailto:hello@sitefliq.com" style={linkStyle}>hello@sitefliq.com</a>
        </div>
      </Container>
    </footer>
  );
}
