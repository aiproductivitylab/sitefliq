// Homepage — premium B2B redesign (Stage 1), income-focused.
import { useState } from "react";
import { theme as t } from "../ui/theme";
import { Container, Section, Eyebrow, Heading, Text, Button, Card, Check, Arrow, MarketingNav, MarketingFooter } from "../ui/kit";

/* A real product mockup of the builder (form → generated preview), drawn in the
   design-system palette — used instead of a decorative illustration. */
function BuilderMockup() {
  const chip = (label, on) => (
    <span key={label} style={{ padding: "5px 10px", borderRadius: t.radius.pill, fontSize: 11, fontWeight: 600,
      background: on ? t.color.accentSoft : t.color.bgAlt, color: on ? t.color.accent : t.color.muted,
      border: `1px solid ${on ? t.color.accentBorder : t.color.border}` }}>{label}</span>
  );
  const fauxField = (label, value) => (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 10, fontWeight: 600, color: t.color.faint, marginBottom: 4, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</div>
      <div style={{ padding: "8px 10px", background: t.color.bg, border: `1px solid ${t.color.border}`, borderRadius: 8, fontSize: 12, color: t.color.text }}>{value}</div>
    </div>
  );
  return (
    <div style={{ borderRadius: t.radius.xl, border: `1px solid ${t.color.border}`, boxShadow: t.shadow.lg, overflow: "hidden", background: t.color.bg }}>
      <div style={{ height: 38, background: t.color.bgAlt, borderBottom: `1px solid ${t.color.border}`, display: "flex", alignItems: "center", gap: 6, padding: "0 14px" }}>
        {["#e2574c", "#e9b23b", "#4caf68"].map(c => <span key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: .55 }} />)}
        <div style={{ marginLeft: 10, flex: 1, maxWidth: 260, background: t.color.bg, border: `1px solid ${t.color.border}`, borderRadius: 6, padding: "3px 10px", fontSize: 11, color: t.color.faint }}>sitefliq.com/build</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "0.9fr 1.1fr", minHeight: 300 }}>
        <div style={{ padding: 18, borderRight: `1px solid ${t.color.border}`, background: t.color.bg }}>
          {fauxField("Business name", "Northside Dental")}
          {fauxField("Industry", "Dental practice")}
          <div style={{ fontSize: 10, fontWeight: 600, color: t.color.faint, margin: "2px 0 6px", letterSpacing: "0.04em", textTransform: "uppercase" }}>Style</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
            {["Clean", "Bold", "Warm", "Minimal"].map((c, i) => chip(c, i === 0))}
          </div>
          <div style={{ padding: "9px", borderRadius: 9, background: t.color.accent, color: t.color.onAccent, fontSize: 12, fontWeight: 600, textAlign: "center" }}>Generate website</div>
        </div>
        <div style={{ background: t.color.bgInk, padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#fff" }}>Northside Dental</span>
            <span style={{ fontSize: 9, color: t.color.onInkFaint }}>Services · About · Contact</span>
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ height: 11, width: "78%", background: "rgba(255,255,255,.9)", borderRadius: 4, marginBottom: 7 }} />
            <div style={{ height: 11, width: "54%", background: "rgba(255,255,255,.9)", borderRadius: 4, marginBottom: 12 }} />
            <div style={{ height: 7, width: "88%", background: "rgba(255,255,255,.4)", borderRadius: 3, marginBottom: 5 }} />
            <div style={{ height: 7, width: "70%", background: "rgba(255,255,255,.4)", borderRadius: 3, marginBottom: 14 }} />
            <span style={{ display: "inline-block", padding: "6px 14px", background: t.color.accent, color: t.color.onAccent, borderRadius: 7, fontSize: 10, fontWeight: 600 }}>Book an appointment</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginTop: "auto" }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{ background: t.color.bgInkAlt, border: `1px solid ${t.color.borderInk}`, borderRadius: 8, padding: 9 }}>
                <div style={{ width: 16, height: 16, borderRadius: 5, background: t.color.accent, opacity: .4, marginBottom: 7 }} />
                <div style={{ height: 5, width: "80%", background: "rgba(255,255,255,.55)", borderRadius: 3, marginBottom: 4 }} />
                <div style={{ height: 5, width: "60%", background: "rgba(255,255,255,.3)", borderRadius: 3 }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* Interactive earnings calculator (illustration only — see disclaimer). */
function planForVolume(websites) {
  if (websites <= 25) return { name: "Starter", cost: 25 };
  if (websites <= 50) return { name: "Pro", cost: 50 };
  return { name: "Business", cost: 100 };
}
const money = (n) => "$" + Math.round(n).toLocaleString();

function EarningsCalculator() {
  const [websites, setWebsites] = useState(5);
  const [price, setPrice] = useState(500);
  const [care, setCare] = useState(50);

  const oneOff = websites * price;
  const recurring = websites * care;
  const plan = planForVolume(websites);
  const profit = oneOff + recurring - plan.cost;

  const slider = (label, value, display, min, max, step, onChange) => (
    <div style={{ marginBottom: 22 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: t.color.text }}>{label}</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: t.color.ink }}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: t.color.accent, cursor: "pointer" }} />
    </div>
  );

  const row = (label, value, sub) => (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "10px 0", borderBottom: `1px solid ${t.color.borderInk}` }}>
      <span style={{ fontSize: 13, color: t.color.onInkMuted }}>{label}{sub && <span style={{ color: t.color.onInkFaint }}> · {sub}</span>}</span>
      <span style={{ fontSize: 15, fontWeight: 600, color: t.color.onInk }}>{value}</span>
    </div>
  );

  return (
    <Section alt>
      <div style={{ maxWidth: 640, marginBottom: 32 }}>
        <Eyebrow>What you could earn</Eyebrow>
        <Heading level="h2">Charge clients. Keep the difference.</Heading>
        <Text muted style={{ marginTop: 12 }}>
          You pay a flat monthly Sitefliq plan and set your own prices. Move the sliders to estimate the margin.
        </Text>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 20, alignItems: "stretch" }}>
        <Card style={{ padding: 28 }}>
          {slider("Websites sold per month", websites, String(websites), 1, 125, 1, setWebsites)}
          {slider("Price per website", price, money(price), 100, 2000, 50, setPrice)}
          {slider("Monthly care plan per client", care, care === 0 ? "None" : money(care) + "/mo", 0, 200, 10, setCare)}
          <Text small muted>Care plans are optional recurring maintenance you bill each client monthly.</Text>
        </Card>
        <div style={{ background: t.color.bgInk, borderRadius: t.radius.lg, padding: 28, display: "flex", flexDirection: "column" }}>
          <Text small onDark style={{ color: t.color.onInkMuted, marginBottom: 4 }}>Estimated monthly profit</Text>
          <div style={{ fontSize: 46, fontWeight: 700, letterSpacing: "-0.03em", color: t.color.accent, marginBottom: 10 }}>{money(profit)}</div>
          <div>
            {row("One-off from new sites", money(oneOff), `${websites} × ${money(price)}`)}
            {row("Recurring care plans", money(recurring) + "/mo", `${websites} × ${money(care)}`)}
            {row(`Sitefliq ${plan.name} plan`, "−" + money(plan.cost))}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", paddingTop: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: t.color.onInk }}>Estimated monthly profit</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: t.color.onInk }}>{money(profit)}</span>
          </div>
          <Text small style={{ color: t.color.onInkFaint, marginTop: 12 }}>
            Recurring care-plan income stacks each month as you add clients; this shows one month's new cohort.
          </Text>
        </div>
      </div>
      <Text small muted style={{ marginTop: 18, maxWidth: 760 }}>
        Illustration only. Your results depend on your pricing and sales. Sitefliq does not guarantee income.
      </Text>
    </Section>
  );
}

const FEATURES = [
  { title: "Niche-specific copy", body: "The AI writes industry-specific headlines, services, and calls to action — not generic filler." },
  { title: "SEO built in", body: "Every page ships with full meta tags, Open Graph, and LocalBusiness schema markup." },
  { title: "Real industry photography", body: "Relevant professional photos are sourced per industry and placed automatically." },
  { title: "Edit in plain English", body: "Refine any section by typing what you want changed — the page updates live." },
  { title: "Publish in one click", body: "Push the finished site to a live URL instantly, or download the HTML and host it anywhere." },
  { title: "You own the code", body: "Export clean, self-contained HTML at any time. No lock-in, no page builder to learn." },
];

const STEPS = [
  { n: "01", t: "Describe it", d: "Enter the business name, industry, and a short description." },
  { n: "02", t: "Choose a style", d: "Pick a palette, tone, and the sections to include." },
  { n: "03", t: "Generate", d: "The AI writes the copy, sources photos, and builds the page." },
  { n: "04", t: "Refine & publish", d: "Edit by chat, then publish live or download the HTML." },
];

export default function HomePage({ onBuild, onPricing, onExample, onHelp, onMarketing, user, credits, onSignIn, onSignOut }) {
  return (
    <div style={{ background: t.color.bg, color: t.color.text, fontFamily: t.font.sans }}>
      <div style={{ borderBottom: `1px solid ${t.color.border}`, background: "rgba(255,255,255,.85)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100 }}>
        <MarketingNav
          onHome={() => {}} onBuild={onBuild} onSignIn={onSignIn} onSignOut={onSignOut}
          user={user} credits={credits}
          links={[{ label: "Pricing", onClick: onPricing }, { label: "Example", onClick: onExample }, { label: "Help", onClick: onHelp }]}
        />
      </div>

      {/* Hero — income focused */}
      <Container style={{ padding: "clamp(56px,8vw,96px) 24px clamp(32px,4vw,48px)", textAlign: "center" }}>
        <div style={{ animation: "fadeUp .6s ease both" }}>
          <Eyebrow>AI website builder for agencies & freelancers</Eyebrow>
          <Heading as="h1" level="display" style={{ maxWidth: 840, margin: "0 auto 20px" }}>
            Build websites for local businesses. <span style={{ color: t.color.accent }}>Get paid.</span>
          </Heading>
          <Text style={{ maxWidth: 580, margin: "0 auto", fontSize: 18 }}>
            Sitefliq builds client-ready websites in minutes. Describe the business, let the AI do the
            work, then charge your clients whatever you like — you keep the difference.
          </Text>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", margin: "32px 0 14px" }}>
            <Button variant="accent" size="lg" onClick={onBuild}>Start building <Arrow /></Button>
            <Button variant="secondary" size="lg" onClick={onExample}>See an example</Button>
          </div>
          <Text small muted>Preview your site for free — pay only when you are ready to publish.</Text>
        </div>
        <div style={{ marginTop: 48, animation: "fadeUp .7s .15s ease both" }}>
          <BuilderMockup />
        </div>
      </Container>

      {/* Built for */}
      <Container style={{ padding: "8px 24px 16px", textAlign: "center" }}>
        <Text small muted style={{ marginBottom: 14 }}>Built for local businesses and the agencies that serve them</Text>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px 26px", justifyContent: "center" }}>
          {["Gyms & studios", "Salons & spas", "Restaurants & cafés", "Clinics & dental", "Real estate", "Trades & home services"].map(x => (
            <span key={x} style={{ fontSize: 14, fontWeight: 600, color: t.color.faint }}>{x}</span>
          ))}
        </div>
      </Container>

      <EarningsCalculator />

      {/* Features */}
      <Section>
        <div style={{ maxWidth: 640, marginBottom: 44 }}>
          <Eyebrow>What you get</Eyebrow>
          <Heading level="h2">Everything a landing page needs, done for you</Heading>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: 18 }}>
          {FEATURES.map(f => (
            <Card key={f.title} hover style={{ padding: 24 }}>
              <div style={{ width: 34, height: 34, borderRadius: 9, background: t.color.accentSoft, border: `1px solid ${t.color.accentBorder}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
                <Check size={16} />
              </div>
              <Heading level="h3" style={{ marginBottom: 7 }}>{f.title}</Heading>
              <Text small muted>{f.body}</Text>
            </Card>
          ))}
        </div>
      </Section>

      {/* How it works */}
      <Section alt>
        <div style={{ maxWidth: 640, marginBottom: 44 }}>
          <Eyebrow>How it works</Eyebrow>
          <Heading level="h2">From brief to live site in four steps</Heading>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 18 }}>
          {STEPS.map(s => (
            <div key={s.n} style={{ padding: "4px 0" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: t.color.accent, marginBottom: 12 }}>{s.n}</div>
              <Heading level="h3" style={{ marginBottom: 7 }}>{s.t}</Heading>
              <Text small muted>{s.d}</Text>
            </div>
          ))}
        </div>
      </Section>

      {/* CTA band */}
      <Section dark style={{ textAlign: "center" }}>
        <Heading level="h1" onDark style={{ maxWidth: 680, margin: "0 auto 14px" }}>Start building your first website today</Heading>
        <Text onDark style={{ maxWidth: 480, margin: "0 auto 28px" }}>No credit card to start. See the finished page before you decide to publish.</Text>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Button variant="accent" size="lg" onClick={onBuild}>Start building <Arrow /></Button>
          <Button variant="onInk" size="lg" onClick={onPricing}>View pricing</Button>
        </div>
      </Section>

      <MarketingFooter onMarketing={onMarketing} />
    </div>
  );
}
