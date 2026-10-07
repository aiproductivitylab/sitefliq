// Connect your domain (Step 6, F8) — modal for a published project.
// All writes go through /api/domains (server verifies ownership and talks to
// Netlify); the domain is only shown as connected once the server has confirmed
// DNS actually points at the site.
import { useEffect, useState } from "react";
import { sb } from "../store";
import { theme as t } from "../ui/theme";
import { Heading, Text, Button, Badge, Input, Field, Check } from "../ui/kit";

const STATUS_LABEL = {
  pending:   { label: "Waiting for DNS", tone: "neutral" },
  verifying: { label: "Connected · securing HTTPS", tone: "accent" },
  live:      { label: "Connected", tone: "accent" },
};

const REGISTRAR_TIPS = [
  ["GoDaddy", "My Products → your domain → DNS → Add New Record."],
  ["Namecheap", "Domain List → Manage → Advanced DNS → Add New Record."],
  ["Squarespace / Google Domains", "Domains → your domain → DNS → Custom records."],
  ["Cloudflare", "DNS → Records → Add record. Set Proxy status to “DNS only” (grey cloud), or the check below can't see your site."],
];

function Dot({ ok, waiting }) {
  const bg = ok ? t.color.success : waiting ? t.color.borderStrong : t.color.warning;
  return <span aria-hidden="true" style={{ width: 9, height: 9, borderRadius: "50%", background: bg, flexShrink: 0, marginTop: 6 }} />;
}

function CopyValue({ value }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 0 }}>
      <code style={{ fontSize: 13, color: t.color.ink, wordBreak: "break-all" }}>{value}</code>
      <Button variant="ghost" size="sm" onClick={copy} style={{ padding: "4px 8px", fontSize: 12 }}>{copied ? "Copied" : "Copy"}</Button>
    </span>
  );
}

function RecordsTable({ records }) {
  const cell = { padding: "10px 12px", borderTop: `1px solid ${t.color.border}`, verticalAlign: "top", fontSize: 13, textAlign: "left" };
  const head = { ...cell, borderTop: "none", fontSize: 12, fontWeight: 600, color: t.color.muted };
  return (
    <div style={{ border: `1px solid ${t.color.border}`, borderRadius: t.radius.md, overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: t.font.sans }}>
        <thead style={{ background: t.color.bgAlt }}>
          <tr><th style={head}>Type</th><th style={head}>Host / Name</th><th style={head}>Value / Points to</th></tr>
        </thead>
        <tbody>
          {records.map((r, i) => (
            <tr key={i}>
              <td style={{ ...cell, fontWeight: 700, color: t.color.ink }}>{r.type}</td>
              <td style={cell}><CopyValue value={r.host} /></td>
              <td style={cell}>
                <CopyValue value={r.value} />
                <div style={{ fontSize: 12, color: t.color.muted, marginTop: 4 }}>{r.note}</div>
                {r.alt && <div style={{ fontSize: 12, color: t.color.faint, marginTop: 4 }}>{r.alt}</div>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ConnectDomainModal({ project, onClose, onChange }) {
  const [domain, setDomain] = useState(project.custom_domain || null);
  const [status, setStatus] = useState(project.domain_status || null);
  const [records, setRecords] = useState(null);
  const [check, setCheck] = useState(null);       // last status result { dns, https }
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(null);         // "connect" | "status" | "disconnect"
  const [error, setError] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const apply = (d) => {
    setDomain(d.domain ?? null);
    setStatus(d.status ?? null);
    if (d.records) setRecords(d.records);
    onChange?.({ custom_domain: d.domain ?? null, domain_status: d.status ?? null });
  };

  const runCheck = async () => {
    setBusy("status"); setError(null);
    const { ok, data } = await sb.domains("status", project.id);
    setBusy(null);
    if (!ok) { setError(data.error || "Couldn't check the connection. Please try again."); return; }
    apply(data);
    setCheck({ dns: data.dns, https: data.https, at: new Date() });
  };

  // An already-added domain: fetch its records + current status straight away.
  useEffect(() => { if (project.custom_domain) runCheck(); /* eslint-disable-next-line */ }, []);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const connect = async () => {
    if (!input.trim() || busy) return;
    setBusy("connect"); setError(null); setCheck(null);
    const { ok, data } = await sb.domains("connect", project.id, input);
    setBusy(null);
    if (!ok) { setError(data.error || "Couldn't add that domain. Please try again."); return; }
    apply(data);
  };

  const disconnect = async () => {
    setBusy("disconnect"); setError(null);
    const { ok, data } = await sb.domains("disconnect", project.id);
    setBusy(null); setConfirmRemove(false);
    if (!ok) { setError(data.error || "Couldn't remove the domain. Please try again."); return; }
    apply(data);
    setRecords(null); setCheck(null); setInput("");
  };

  const badge = status && STATUS_LABEL[status];
  const dnsOk = check?.dns?.ok;
  const httpsText = {
    active: "Active — your site loads securely on https://",
    provisioning: "Being issued. This usually takes a few minutes once DNS is pointing, occasionally up to a day.",
    waiting_for_dns: "Starts automatically once DNS points to your site.",
  }[check?.https];

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 500, background: "rgba(22,24,29,.45)", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "6vh 16px", overflowY: "auto" }}>
      <div role="dialog" aria-modal="true" aria-label="Connect your domain" onClick={e => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 640, background: t.color.bg, borderRadius: t.radius.lg, boxShadow: t.shadow.lg, padding: "clamp(20px,4vw,32px)", fontFamily: t.font.sans, color: t.color.text }}>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 6 }}>
          <Heading level="h3">Connect your domain</Heading>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">Close</Button>
        </div>
        <Text small muted style={{ marginBottom: 20 }}>{project.business_name || "This site"} · currently at {(project.published_url || "").replace(/^https?:\/\//, "")}</Text>

        {!domain ? (
          <>
            <Field label="Your domain" hint="e.g. www.yourbusiness.com">
              <Input value={input} onChange={e => setInput(e.target.value)} placeholder="www.yourbusiness.com"
                autoFocus onKeyDown={e => { if (e.key === "Enter") connect(); }} />
            </Field>
            <Text small muted style={{ marginTop: 10 }}>
              You need to own this domain already (from GoDaddy, Namecheap, etc.). We'll add it to your site and show you exactly which records to set.
            </Text>
            <div style={{ marginTop: 18 }}>
              <Button variant="accent" onClick={connect} disabled={!input.trim() || !!busy}>{busy === "connect" ? "Adding…" : "Connect domain"}</Button>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 20 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: t.color.ink, wordBreak: "break-all" }}>{domain}</span>
              {badge && <Badge tone={badge.tone}>{status === "live" && <Check size={12} />}{badge.label}</Badge>}
              {status === "live" && (
                <a href={`https://${domain}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, color: t.color.accent, textDecoration: "none", fontWeight: 600 }}>Open site</a>
              )}
            </div>

            {status !== "live" && (
              <>
                <Heading level="h3" as="h4" style={{ fontSize: 15, marginBottom: 6 }}>1. Add these records at your domain provider</Heading>
                <Text small muted style={{ marginBottom: 12 }}>
                  Log in where you bought the domain, open its DNS settings, and add the record{records?.length > 1 ? "s" : ""} below.
                  If a record with the same host already exists (often an old A record for “@” or a CNAME for “www”), edit or delete it so only these remain.
                </Text>
                {records ? <RecordsTable records={records} /> : <Text small muted>Loading records…</Text>}

                <details style={{ marginTop: 12 }}>
                  <summary style={{ fontSize: 13, fontWeight: 600, color: t.color.text, cursor: "pointer" }}>Where do I find DNS settings?</summary>
                  <ul style={{ margin: "10px 0 0", paddingLeft: 18 }}>
                    {REGISTRAR_TIPS.map(([name, tip]) => (
                      <li key={name} style={{ fontSize: 13, lineHeight: 1.6, color: t.color.muted, marginBottom: 4 }}><strong style={{ color: t.color.text }}>{name}:</strong> {tip}</li>
                    ))}
                  </ul>
                  <Text small muted style={{ marginTop: 6 }}>“Host” may be called “Name”; leave TTL at its default.</Text>
                </details>

                <Heading level="h3" as="h4" style={{ fontSize: 15, margin: "22px 0 6px" }}>2. Check the connection</Heading>
                <Text small muted style={{ marginBottom: 12 }}>DNS changes usually show up within minutes, but can take up to 48 hours.</Text>
              </>
            )}

            <div style={{ background: t.color.bgAlt, border: `1px solid ${t.color.border}`, borderRadius: t.radius.md, padding: 16, display: "grid", gap: 12 }}>
              {!check ? (
                <Text small muted>{busy === "status" ? "Checking…" : "Not checked yet."}</Text>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 10 }}>
                    <Dot ok={dnsOk} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: t.color.ink }}>DNS {dnsOk ? "points to your site" : "not pointing to your site yet"}</div>
                      {!dnsOk && (
                        <div style={{ fontSize: 13, color: t.color.muted }}>
                          {check.dns?.found?.length ? <>We currently see <code>{check.dns.found.join(", ")}</code>. </> : "We don't see a record yet. "}
                          Double-check the records above.
                        </div>
                      )}
                      {check.dns?.www && !check.dns.www.ok && dnsOk && (
                        <div style={{ fontSize: 13, color: t.color.muted }}>The www version isn't set up yet — add the CNAME for “www” so both work.</div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <Dot ok={check.https === "active"} waiting={check.https === "waiting_for_dns"} />
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: t.color.ink }}>HTTPS certificate</div>
                      <div style={{ fontSize: 13, color: t.color.muted }}>{httpsText}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: t.color.faint }}>Last checked {check.at.toLocaleTimeString()}</div>
                </>
              )}
              <div>
                <Button variant="primary" size="sm" onClick={runCheck} disabled={!!busy}>{busy === "status" ? "Checking…" : "Check connection"}</Button>
              </div>
            </div>

            <div style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {!confirmRemove ? (
                <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(true)} disabled={!!busy} style={{ color: t.color.danger }}>Remove domain</Button>
              ) : (
                <>
                  <Text small>Remove {domain} from this site?</Text>
                  <Button variant="secondary" size="sm" onClick={disconnect} disabled={!!busy} style={{ color: t.color.danger }}>{busy === "disconnect" ? "Removing…" : "Yes, remove"}</Button>
                  <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(false)}>Cancel</Button>
                </>
              )}
            </div>
          </>
        )}

        {error && <Text small style={{ color: t.color.danger, marginTop: 14 }}>{error}</Text>}
      </div>
    </div>
  );
}
