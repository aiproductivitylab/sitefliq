// Pricing — premium B2B redesign.
// Monthly subscription plans come from src/config/plans.js (the single source of
// truth for the Paddle price IDs). One-time credit top-ups stay as a small
// secondary section and keep working through the existing onPurchase/Paddle flow.
import { theme as t } from "../ui/theme";
import { Container, Eyebrow, Heading, Text, Button, Card, Badge, Check, MarketingNav, MarketingFooter } from "../ui/kit";
import { SUBSCRIPTION_PLANS as SUBSCRIPTIONS } from "../config/plans";

export default function PricingPage({ onBuild, onHome, onMarketing, user, credits, onSignIn, onSignOut, onPurchase, onSubscribe, topupPlans = [] }) {
  return (
    <div style={{ background: t.color.bg, color: t.color.text, fontFamily: t.font.sans, minHeight: "100vh" }}>
      <div style={{ borderBottom: `1px solid ${t.color.border}` }}>
        <MarketingNav
          onHome={onHome} onBuild={onBuild} onSignIn={onSignIn} onSignOut={onSignOut}
          user={user} credits={credits}
          links={[{ label: "Home", onClick: onHome }]}
        />
      </div>

      {/* Header */}
      <Container style={{ padding: "clamp(48px,6vw,80px) 24px 8px", textAlign: "center" }}>
        <Eyebrow>Pricing</Eyebrow>
        <Heading as="h1" level="h1" style={{ maxWidth: 680, margin: "0 auto 14px" }}>Plans that scale with your agency</Heading>
        <Text style={{ maxWidth: 520, margin: "0 auto 10px" }}>
          A monthly website allowance with every feature included. One website uses 4 credits; a chat edit uses 1.
        </Text>
        <Text small muted>Billed monthly. Cancel anytime.</Text>
      </Container>

      {/* Subscription cards */}
      <Container style={{ padding: "32px 24px 8px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 20, alignItems: "start" }}>
          {SUBSCRIPTIONS.map(p => (
            <Card key={p.id} style={{ padding: 28, position: "relative", border: p.popular ? `1.5px solid ${t.color.accent}` : undefined, boxShadow: p.popular ? t.shadow.lg : undefined }}>
              {p.popular && (
                <div style={{ position: "absolute", top: -11, left: 28 }}>
                  <Badge tone="accent" style={{ fontWeight: 700 }}>Most popular</Badge>
                </div>
              )}
              <div style={{ fontSize: 14, fontWeight: 700, color: t.color.ink, marginBottom: 4 }}>{p.name}</div>
              <Text small muted style={{ marginBottom: 18, minHeight: 38 }}>{p.tagline}</Text>
              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 2 }}>
                <span style={{ fontSize: 44, fontWeight: 700, letterSpacing: "-0.03em", color: t.color.ink }}>${p.price}</span>
                <span style={{ fontSize: 15, color: t.color.muted }}>/mo</span>
              </div>
              <Text small muted style={{ marginBottom: 20 }}>{p.credits} credits per month</Text>
              <Button variant={p.popular ? "accent" : "secondary"} size="md" style={{ width: "100%" }} onClick={() => onSubscribe && onSubscribe(p)}>
                Choose {p.name}
              </Button>
              <div style={{ display: "flex", flexDirection: "column", gap: 11, marginTop: 22 }}>
                {p.features.map(f => (
                  <div key={f} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ marginTop: 2 }}><Check size={15} /></span>
                    <span style={{ fontSize: 14, color: t.color.text, lineHeight: 1.45 }}>{f}</span>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
        <Text small muted style={{ textAlign: "center", marginTop: 20 }}>
          Coming soon to every plan: Lead Finder, client invoicing, and custom domains.
        </Text>
      </Container>

      {/* One-time top-ups (secondary) */}
      {topupPlans.length > 0 && (
        <Container style={{ padding: "48px 24px 16px" }}>
          <div style={{ borderTop: `1px solid ${t.color.border}`, paddingTop: 40 }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <Heading level="h3" style={{ marginBottom: 6 }}>Prefer to pay as you go?</Heading>
              <Text small muted>One-time credit packs. Credits never expire. 1 credit = 1 website.</Text>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: 14, maxWidth: 760, margin: "0 auto" }}>
              {topupPlans.map(p => (
                <Card key={p.id} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: t.color.ink }}>{p.credits} credits</span>
                    <span style={{ fontSize: 20, fontWeight: 700, color: t.color.ink }}>{p.price}</span>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => onPurchase(p)} style={{ width: "100%" }}>Buy pack</Button>
                </Card>
              ))}
            </div>
          </div>
        </Container>
      )}

      <Container style={{ padding: "16px 24px 64px", textAlign: "center" }}>
        <Text small muted>Secure checkout via Paddle. Credits never expire.</Text>
      </Container>

      <MarketingFooter onMarketing={onMarketing || onHome} />
    </div>
  );
}
