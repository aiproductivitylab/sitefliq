// Check a website (Step 6, F5 scoring half) — paste any business URL, get a free
// quality report (speed, mobile-friendly, HTTPS, overall verdict) powered by
// Google PageSpeed Insights. Login required, rate limited, no credits charged.
// From the report, "Rebuild this site" runs the importer on that URL and drops
// the user into the builder, pre-filled and ready to generate.
import { useState } from "react";
import { sb } from "../store";
import { theme as t } from "../ui/theme";
import { Container, Eyebrow, Heading, Text, Button, Card, Input, MarketingNav, MarketingFooter } from "../ui/kit";

// Verdict → colour + one-line sales read.
const VERDICTS = {
  "Needs a new website": { color: t.color.danger,  bg: "#fef2f2", border: "#fecaca", note: "Strong candidate — this site is costing them customers." },
  "Could be improved":   { color: t.color.warning, bg: "#fffbeb", border: "#fde68a", note: "Decent, but there's a clear case for a refresh." },
  "Good":                { color: t.color.success, bg: "#f0fdf4", border: "#bbf7d0", note: "This site is in good shape." },
};

function Gauge({ score }) {
  const has = typeof score === "number";
  const val = has ? score : 0;
  const color = !has ? t.color.faint : val >= 90 ? t.color.success : val >= 50 ? t.color.warning : t.color.danger;
  const r = 34, c = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: 92, height: 92, flexShrink: 0 }}>
      <svg width="92" height="92" viewBox="0 0 92 92" style={{ transform: "rotate(-90deg)" }} aria-hidden="true">
        <circle cx="46" cy="46" r={r} fill="none" stroke={t.color.border} strokeWidth="8" />
        <circle cx="46" cy="46" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - val / 100)} style={{ transition: "stroke-dashoffset .6s ease" }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 24, fontWeight: 700, color }}>{has ? val : "—"}</span>
        <span style={{ fontSize: 9, color: t.color.faint, letterSpacing: ".04em", textTransform: "uppercase" }}>/ 100</span>
      </div>
    </div>
  );
}

function Flag({ ok, label, good, bad }) {
  const color = ok ? t.color.success : t.color.danger;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: t.color.bgAlt, border: `1px solid ${t.color.border}`, borderRadius: t.radius.md }}>
      <span style={{ width: 22, height: 22, flexShrink: 0, borderRadius: "50%", background: ok ? "#f0fdf4" : "#fef2f2", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          {ok
            ? <path d="M13 4.5 6.5 11.5 3 8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            : <path d="M4 4l8 8M12 4l-8 8" stroke={color} strokeWidth="2" strokeLinecap="round" />}
        </svg>
      </span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: t.color.ink }}>{label}</div>
        <div style={{ fontSize: 12, color: t.color.muted }}>{ok ? good : bad}</div>
      </div>
    </div>
  );
}

export default function CheckWebsite({ onHome, onBuild, onMarketing, user, credits, onSignIn, onSignOut, onRebuild }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [rebuilding, setRebuilding] = useState(false);
  const [err, setErr] = useState("");
  const [report, setReport] = useState(null);

  const run = async () => {
    if (!url.trim() || loading) return;
    if (!user) { onSignIn?.(); return; }
    setLoading(true); setErr(""); setReport(null);
    try {
      const r = await fetch("/api/leads/score", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + (sb._token || "") },
        body: JSON.stringify({ url: url.trim() }),
      });
      const d = await r.json().catch(() => ({}));
      if (r.ok) setReport(d);
      else if (r.status === 401) { onSignIn?.(); }
      else setErr(d.message || d.error || "Couldn't check that site — try again.");
    } catch { setErr("Network error — please try again."); }
    setLoading(false);
  };

  const rebuild = async () => {
    if (rebuilding) return;
    setRebuilding(true);
    try { await onRebuild?.(report.url); }
    finally { setRebuilding(false); }
  };

  const v = report ? (VERDICTS[report.verdict] || VERDICTS["Could be improved"]) : null;

  return (
    <div style={{ background: t.color.bg, color: t.color.text, fontFamily: t.font.sans, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ borderBottom: `1px solid ${t.color.border}` }}>
        <MarketingNav
          onHome={onHome} onBuild={onBuild} onSignIn={onSignIn} onSignOut={onSignOut}
          user={user} credits={credits}
          links={[{ label: "Home", onClick: onHome }]} />
      </div>

      <Container style={{ padding: "clamp(40px,6vw,72px) 24px 64px", flex: 1, width: "100%" }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <Eyebrow>Free tool</Eyebrow>
          <Heading level="h1" style={{ marginBottom: 12 }}>Check a website</Heading>
          <Text muted style={{ marginBottom: 28 }}>
            Paste any business website and get an instant quality report — speed,
            mobile-friendliness and security. Perfect for sizing up a prospect
            before you pitch. Free, and it never uses your credits.
          </Text>

          <Card style={{ padding: 20 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 260px" }}>
                <Input
                  value={url}
                  onChange={e => setUrl(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && run()}
                  placeholder="acmeplumbing.com"
                />
              </div>
              <Button variant="accent" onClick={run} disabled={loading || !url.trim()} style={{ flex: "0 0 auto" }}>
                {loading ? "Checking…" : "Check website"}
              </Button>
            </div>
            {!user && (
              <Text small muted style={{ marginTop: 10 }}>
                <a onClick={onSignIn} style={{ color: t.color.accent, cursor: "pointer" }}>Sign in</a> to run a check — it's free.
              </Text>
            )}
            {err && <Text small style={{ marginTop: 10, color: t.color.danger }}>{err}</Text>}
          </Card>

          {loading && (
            <Text muted style={{ marginTop: 24, textAlign: "center" }}>Analysing the site — this can take up to a minute…</Text>
          )}

          {report && v && (
            <div style={{ marginTop: 24 }}>
              {/* Verdict banner */}
              <Card style={{ padding: 22, background: v.bg, border: `1px solid ${v.border}`, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                <Gauge score={report.perf} />
                <div style={{ flex: "1 1 240px" }}>
                  <div style={{ ...t.type.eyebrow, color: v.color, marginBottom: 6 }}>Verdict</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: v.color, letterSpacing: "-0.02em", lineHeight: 1.1 }}>{report.verdict}</div>
                  <Text small muted style={{ marginTop: 6 }}>{v.note}</Text>
                  <Text small muted style={{ marginTop: 2, wordBreak: "break-all" }}>{report.finalUrl?.replace(/^https?:\/\//, "")}</Text>
                </div>
              </Card>

              {/* Signals */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 12, marginTop: 16 }}>
                <Flag
                  ok={typeof report.perf === "number" && report.perf >= 50}
                  label={`Speed — ${typeof report.perf === "number" ? report.perf + "/100" : "unknown"}`}
                  good="Loads at a reasonable speed on mobile."
                  bad="Slow to load on mobile — visitors leave before it opens."
                />
                <Flag ok={report.mobileFriendly} label="Mobile-friendly"
                  good="Scales correctly on phones." bad="Not built for phones — most visitors are on mobile." />
                <Flag ok={report.https} label="Secure (HTTPS)"
                  good="Served securely over HTTPS." bad="No HTTPS — browsers warn visitors it's 'Not secure'." />
              </div>

              {/* One-click rebuild */}
              <Card style={{ padding: 22, marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
                <div style={{ flex: "1 1 260px" }}>
                  <Heading level="h3" style={{ marginBottom: 4 }}>Rebuild this site</Heading>
                  <Text small muted>
                    We'll pull their logo, colours and details from the current site and
                    pre-fill the builder, so you can generate a modern replacement in minutes.
                  </Text>
                </div>
                <Button variant="primary" onClick={rebuild} disabled={rebuilding} style={{ flex: "0 0 auto" }}>
                  {rebuilding ? "Importing…" : "Rebuild this site"}
                </Button>
              </Card>

              <Text small muted style={{ marginTop: 16, textAlign: "center" }}>
                Measured with Google PageSpeed Insights on a mobile device.
              </Text>
            </div>
          )}
        </div>
      </Container>

      <MarketingFooter onMarketing={onMarketing} />
    </div>
  );
}
