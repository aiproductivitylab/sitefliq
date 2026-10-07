// My Projects dashboard (Step 4) — lists the user's saved sites.
import { useEffect, useState } from "react";
import { sb } from "../store";
import { theme as t } from "../ui/theme";
import { Container, Eyebrow, Heading, Text, Button, Card, Badge, MarketingNav } from "../ui/kit";
import ConnectDomainModal from "./ConnectDomain";

function fmtDate(iso) {
  try { return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); }
  catch { return ""; }
}

export default function ProjectsDashboard({ onHome, onBuild, onOpen, onCheck, onInvoices, user, credits, onSignOut }) {
  const [projects, setProjects] = useState(null); // null = loading
  const [copiedId, setCopiedId] = useState(null);
  const [domainFor, setDomainFor] = useState(null); // project whose domain modal is open

  useEffect(() => {
    let alive = true;
    sb.listProjects().then(list => { if (alive) setProjects(list); });
    return () => { alive = false; };
  }, []);

  const copyLink = (p) => {
    const url = `${window.location.origin}/p/${p.share_token}`;
    navigator.clipboard?.writeText(url);
    setCopiedId(p.id);
    setTimeout(() => setCopiedId(c => (c === p.id ? null : c)), 2000);
  };

  return (
    <div style={{ background: t.color.bg, color: t.color.text, fontFamily: t.font.sans, minHeight: "100vh" }}>
      <div style={{ borderBottom: `1px solid ${t.color.border}` }}>
        <MarketingNav onHome={onHome} onBuild={onBuild} onSignOut={onSignOut} user={user} credits={credits}
          links={[{ label: "Home", onClick: onHome }, { label: "Check a site", onClick: onCheck }, { label: "Invoices", onClick: onInvoices }]} />
      </div>

      <Container style={{ padding: "clamp(40px,6vw,72px) 24px 64px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 32 }}>
          <div>
            <Eyebrow>Your work</Eyebrow>
            <Heading level="h1">My projects</Heading>
          </div>
          <Button variant="accent" onClick={onBuild}>New website</Button>
        </div>

        {projects === null ? (
          <Text muted>Loading…</Text>
        ) : projects.length === 0 ? (
          <Card style={{ padding: 40, textAlign: "center" }}>
            <Heading level="h3" style={{ marginBottom: 8 }}>No projects yet</Heading>
            <Text muted style={{ marginBottom: 20 }}>Every website you generate is saved here automatically.</Text>
            <Button variant="accent" onClick={onBuild}>Build your first website</Button>
          </Card>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
            {projects.map(p => (
              <Card key={p.id} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: t.color.ink, lineHeight: 1.3 }}>{p.business_name || "Untitled site"}</span>
                    {p.published_url
                      ? <Badge tone="accent">Live</Badge>
                      : <Badge>Draft</Badge>}
                  </div>
                  <Text small muted style={{ marginTop: 4 }}>{p.industry || "—"} · {fmtDate(p.created_at)}</Text>
                </div>

                {/* Custom domain shows as connected only once the server confirmed DNS. */}
                {p.custom_domain && (p.domain_status === "live" || p.domain_status === "verifying") && (
                  <a href={`https://${p.custom_domain}`} target="_blank" rel="noreferrer" style={{ fontSize: 13, fontWeight: 600, color: t.color.accent, textDecoration: "none", wordBreak: "break-all" }}>
                    {p.custom_domain}
                  </a>
                )}
                {p.custom_domain && p.domain_status === "pending" && (
                  <Text small muted>{p.custom_domain} · waiting for DNS</Text>
                )}

                {p.published_url && (
                  <a href={p.published_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: t.color.accent, textDecoration: "none", wordBreak: "break-all" }}>
                    {p.published_url.replace(/^https?:\/\//, "")}
                  </a>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: "auto", flexWrap: "wrap" }}>
                  <Button variant="primary" size="sm" onClick={() => onOpen(p)}>Open</Button>
                  <Button variant="secondary" size="sm" onClick={() => copyLink(p)}>{copiedId === p.id ? "Link copied" : "Copy client link"}</Button>
                  {p.netlify_site_id && (
                    <Button variant="ghost" size="sm" onClick={() => setDomainFor(p)}>{p.custom_domain ? "Domain settings" : "Connect your domain"}</Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </Container>

      {domainFor && (
        <ConnectDomainModal
          project={domainFor}
          onClose={() => setDomainFor(null)}
          onChange={(fields) => setProjects(list => list.map(x => (x.id === domainFor.id ? { ...x, ...fields } : x)))}
        />
      )}
    </div>
  );
}
