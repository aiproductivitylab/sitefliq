// Public client preview page (Step 4) — /p/:token. No login required.
// Shows the generated page; when the project came from the website importer
// (source_url present), offers a before/after view of their old site vs the new.
import { useEffect, useState } from "react";
import { sb } from "../store";
import { theme as t } from "../ui/theme";
import { Button, Logo } from "../ui/kit";

export default function PreviewPage({ token, onExit }) {
  const [state, setState] = useState("loading"); // loading | ready | notfound
  const [data, setData] = useState(null);
  const [view, setView] = useState("after");     // after | before

  useEffect(() => {
    let alive = true;
    sb.getSharedProject(token).then(p => {
      if (!alive) return;
      if (p && p.html) { setData(p); setState("ready"); }
      else setState("notfound");
    }).catch(() => alive && setState("notfound"));
    return () => { alive = false; };
  }, [token]);

  const hasBefore = state === "ready" && !!data.source_url;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", fontFamily: t.font.sans, background: t.color.bgAlt }}>
      {/* Top bar */}
      <div style={{ height: 56, flexShrink: 0, background: t.color.bg, borderBottom: `1px solid ${t.color.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Logo />
          {state === "ready" && <span style={{ fontSize: 13, color: t.color.muted }}>Preview for <strong style={{ color: t.color.ink }}>{data.business_name || "your business"}</strong></span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {hasBefore && (
            <div style={{ display: "flex", gap: 2, background: t.color.bgAlt, borderRadius: t.radius.pill, padding: 3 }}>
              {[["before", "Their current site"], ["after", "New site"]].map(([k, label]) => (
                <button key={k} onClick={() => setView(k)} style={{ padding: "6px 14px", fontSize: 12, fontWeight: 600, border: "none", borderRadius: t.radius.pill, cursor: "pointer",
                  background: view === k ? t.color.bg : "transparent", color: view === k ? t.color.ink : t.color.muted, boxShadow: view === k ? t.shadow.sm : "none" }}>{label}</button>
              ))}
            </div>
          )}
          <Button variant="accent" size="sm" onClick={onExit}>Build your own</Button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
        {state === "loading" && (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: t.color.faint, fontSize: 14 }}>Loading preview…</div>
        )}
        {state === "notfound" && (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 24, textAlign: "center" }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: t.color.ink }}>Preview not available</div>
            <div style={{ fontSize: 14, color: t.color.muted }}>This link is invalid or has been turned off.</div>
            <Button variant="secondary" onClick={onExit} style={{ marginTop: 8 }}>Go to Sitefliq</Button>
          </div>
        )}
        {state === "ready" && view === "after" && (
          <iframe title="New site" srcDoc={data.html} sandbox="allow-scripts allow-same-origin"
            style={{ width: "100%", height: "100%", border: "none", display: "block", background: "#fff" }} />
        )}
        {state === "ready" && view === "before" && hasBefore && (
          <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <iframe title="Current site" src={data.source_url}
              style={{ width: "100%", flex: 1, border: "none", display: "block", background: "#fff" }} />
            <div style={{ flexShrink: 0, padding: "8px 16px", fontSize: 12, color: t.color.muted, background: t.color.bg, borderTop: `1px solid ${t.color.border}`, textAlign: "center" }}>
              Their current site. If it doesn't load here, some sites block embedding —{" "}
              <a href={data.source_url} target="_blank" rel="noreferrer" style={{ color: t.color.accent }}>open it in a new tab</a>.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
