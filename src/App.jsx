import { useState, useEffect, useRef, useCallback, memo } from "react";
import { useAppStore, sb } from "./store";
import { usePaddle } from "./hooks/usePaddle";

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────────────────── */
const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_KEY || "";

const PALETTES = [
  { id:"noir",   label:"Noir",   bg:"#0a0a0a", surface:"#141414", accent:"#f5f500", text:"#fafafa" },
  { id:"slate",  label:"Slate",  bg:"#0f172a", surface:"#1e293b", accent:"#38bdf8", text:"#f1f5f9" },
  { id:"forest", label:"Forest", bg:"#052e16", surface:"#14532d", accent:"#86efac", text:"#f0fdf4" },
  { id:"ember",  label:"Ember",  bg:"#1c0a00", surface:"#431407", accent:"#fb923c", text:"#fff7ed" },
  { id:"gold",   label:"Gold",   bg:"#0c0a00", surface:"#1c1a00", accent:"#eab308", text:"#fefce8" },
  { id:"clean",  label:"Clean",  bg:"#f8fafc", surface:"#ffffff", accent:"#2563eb", text:"#0f172a" },
];

const VIBES = [
  { id:"bold",      label:"Bold & Powerful",    desc:"Big typography, strong contrast" },
  { id:"elegant",   label:"Elegant & Refined",   desc:"Sophisticated, luxury feel" },
  { id:"energetic", label:"Energetic & Modern",  desc:"Dynamic, vibrant energy" },
  { id:"minimal",   label:"Pure Minimal",        desc:"Breathing space, quiet confidence" },
  { id:"warm",      label:"Warm & Friendly",     desc:"Human, approachable, local" },
];

const SECTIONS = [
  { id:"hero",         label:"Hero Banner",      icon:"⚡", locked:true },
  { id:"social_proof", label:"Social Proof Bar", icon:"★",  locked:true },
  { id:"services",     label:"Services",         icon:"◈" },
  { id:"about",        label:"About / Story",    icon:"◎" },
  { id:"benefits",     label:"Why Choose Us",    icon:"✦" },
  { id:"testimonials", label:"Testimonials",     icon:"❝" },
  { id:"pricing",      label:"Pricing",          icon:"💰" },
  { id:"gallery",      label:"Gallery",          icon:"▦" },
  { id:"faq",          label:"FAQ",              icon:"?" },
  { id:"booking",      label:"Booking Form",     icon:"📅" },
  { id:"contact",      label:"Contact",          icon:"✉" },
  { id:"cta",          label:"CTA Banner",       icon:"→" },
];

const INDUSTRIES = [
  "Yoga & Fitness","Pilates & Barre","Gym & CrossFit","Personal Training",
  "Beauty & Hair Salon","Nail Studio & Spa","Barbershop","Restaurant & Café",
  "Coffee Shop & Bakery","Photography","Videography","Real Estate Agency",
  "Life Coaching","Business Consulting","Healthcare & Wellness","Dental Practice",
  "Clothing Boutique","Online Store","Education & Tutoring","Tech Startup",
  "Law Firm","Accounting","Event Planning","Catering","Interior Design",
  "Cleaning Services","Landscaping","Automotive","Plumbing","Electrical",
  "Roofing","HVAC","Pest Control","Construction","Other",
];

const PLANS = [
  {
    id:"starter", name:"Starter", price:"$19", credits:3, perPage:"$6.33",
    color:"#22c55e", badge:null, desc:"Try it out, no commitment",
    features:["3 page generations","All styles & colour palettes","Full SEO + conversion copy","Download HTML instantly","Email support","Credits never expire"],
    priceId:"pri_01kjxa8pggzk3j8hekhsadx0pe",
  },
  {
    id:"pro", name:"Pro", price:"$49", credits:10, perPage:"$4.90",
    color:"#f97316", badge:"BEST VALUE", desc:"For freelancers & small agencies",
    features:["10 page generations","All styles & colour palettes","Full SEO + conversion copy","Download HTML instantly","No Sitefliq branding","Priority generation speed","Priority support","Credits never expire"],
    priceId:"pri_01kjxachhq3afcqc0gj54x2yq7",
  },
  {
    id:"agency", name:"Agency", price:"$99", credits:25, perPage:"$3.96",
    color:"#8b5cf6", badge:null, desc:"Built for agencies & resellers",
    features:["25 page generations","All styles & colour palettes","Full SEO + conversion copy","Download HTML instantly","White-label (no branding)","Priority generation speed","Dedicated support","Credits never expire","Best per-page rate"],
    priceId:"pri_01kjxafb31r7g5gc23se78j10a",
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   PEXELS IMAGE KEYWORDS
───────────────────────────────────────────────────────────────────────────── */
function getSectionKeywords(industry) {
  const map = {
    "Yoga & Fitness":       ["woman yoga pose studio sunlight","yoga class group instructor","yoga studio interior calm","woman meditating floor","yoga flexibility stretch","yoga instructor teaching students"],
    "Pilates & Barre":      ["pilates reformer machine studio","pilates class instructor women","barre workout ballet studio","pilates exercise core woman","pilates equipment studio bright","group pilates class women"],
    "Gym & CrossFit":       ["crossfit gym athlete barbell","gym weight room equipment","personal trainer coaching client","crossfit workout athletes","modern gym interior wide","powerlifting gym athlete"],
    "Personal Training":    ["personal trainer coaching client gym","fitness trainer outdoor workout","one on one training session","personal training weights","trainer motivating client","fitness coaching session"],
    "Beauty & Hair Salon":  ["hairstylist cutting hair salon","luxury hair salon interior modern","hair color treatment professional","salon mirror styling chair","hairdresser blonde highlights","hair salon modern interior bright"],
    "Nail Studio & Spa":    ["nail technician manicure close up","luxury nail salon interior","spa hands manicure treatment","nail art professional close up","nail salon modern bright","pedicure spa treatment feet"],
    "Barbershop":           ["barber cutting hair clippers","barbershop interior vintage leather","barber straight razor shave","barbershop chair mirror professional","barber tools scissors comb","classic barbershop neon sign"],
    "Restaurant & Café":    ["elegant restaurant interior lighting candles","chef plating food kitchen","restaurant table setting fine dining","food presentation gourmet plate","waiter serving restaurant","restaurant atmosphere dinner"],
    "Coffee Shop & Bakery": ["barista latte art espresso machine","cozy coffee shop interior morning","fresh bakery pastries bread display","coffee cup close up foam art","coffee shop wooden tables","baker kneading dough bakery"],
    "Photography":          ["photographer camera portrait studio","professional photo studio lighting","photographer outdoor shoot model","camera lens close up bokeh","photo shoot behind scenes","professional photographer equipment"],
    "Videography":          ["videographer filming camera shoulder","video production studio professional","filmmaker outdoor shoot camera","video camera close up professional","film production set crew","video editing suite screens"],
    "Real Estate Agency":   ["modern luxury home exterior architecture","bright open plan living room","luxury kitchen marble island","real estate house front driveway","home interior natural light","luxury property pool exterior"],
    "Life Coaching":        ["life coach professional meeting office","coaching conversation smiling woman","coach client session bright office","professional woman coaching whiteboard","business coaching motivational","coaching session confident people"],
    "Business Consulting":  ["business meeting boardroom professionals","consultant presenting strategy","corporate team discussion office","business consulting whiteboard","professional office meeting table","executive team planning strategy"],
    "Healthcare & Wellness":["doctor patient consultation clinic","modern medical clinic interior","healthcare professional smiling","medical office bright clean","wellness clinic reception","health professional equipment"],
    "Dental Practice":      ["dentist patient chair treatment","modern dental clinic interior","dentist smiling professional white","dental equipment tools close up","dental clinic bright clean","dentist examining patient"],
    "Clothing Boutique":    ["clothing boutique interior modern racks","fashion store window display","boutique clothes rack bright","fashion retail interior minimal","clothing store shopping woman","boutique interior elegant lighting"],
    "Online Store":         ["product photography flat lay minimal","ecommerce packaging modern clean","product display lifestyle photography","online shopping product close up","product photography studio white","flat lay product photography"],
    "Education & Tutoring": ["teacher student tutoring table","classroom students learning bright","tutoring session one on one","student studying desk books","education learning modern classroom","tutor helping student homework"],
    "Tech Startup":         ["developers coding laptops office","modern tech startup open office","software team collaboration meeting","coding screens multiple monitors","tech office modern bright","startup team working together"],
    "Law Firm":             ["lawyer professional office desk books","law firm conference room table","attorney client meeting professional","legal books library office","lawyer suit professional confident","law office interior dark wood"],
    "Accounting":           ["accountant laptop calculator desk","financial advisor client meeting","accounting office professional","business finance spreadsheet laptop","financial planning documents desk","accountant professional office"],
    "Event Planning":       ["elegant wedding reception flowers","event venue decoration flowers luxury","wedding table setting floral","gala dinner elegant decoration","event styling flowers candles","luxury event venue interior"],
    "Catering":             ["catering food buffet elegant spread","chef catering event plating","gourmet catering food display","catering team serving event","food catering professional presentation","catering kitchen team cooking"],
    "Interior Design":      ["luxury interior design living room","interior designer space modern","designer home open plan bright","modern bedroom interior design","interior design kitchen luxury","designer living space minimal"],
    "Cleaning Services":    ["professional cleaner mop floor","cleaning service team uniform","spotless kitchen sparkling clean","cleaner wiping surface professional","cleaning team commercial building","domestic cleaner working bright"],
    "Landscaping":          ["professional landscaper mowing lawn","beautiful garden landscaping design","gardener planting flowers beds","manicured lawn hedge trimming","garden design lush green","landscaping team outdoor work"],
    "Automotive":           ["mechanic repairing car engine lift","auto technician under car garage","car repair workshop professional","mechanic diagnostic computer car","auto service garage inspection","car mechanic tools professional"],
    "Plumbing":             ["plumber fixing pipe under sink","plumber working bathroom pipes","plumbing repair tools professional","plumber installing bathroom fitting","pipe repair plumbing work","plumber kitchen sink repair"],
    "Electrical":           ["electrician wiring electrical panel","electrician installing outlet wall","electrical contractor tools professional","electrician safety equipment working","electrical wiring installation","electrician working ceiling light"],
    "Roofing":              ["roofer installing roof tiles shingles","roofing contractor team working","roof replacement installation professional","roofer safety harness roof","new roof installation shingles","roofing work aerial view"],
    "HVAC":                 ["hvac technician air conditioning unit","hvac installation professional tools","air conditioning repair technician","hvac system ductwork installation","heating cooling technician","hvac professional outdoor unit"],
    "Pest Control":         ["pest control technician spraying house","exterminator professional uniform","pest inspection professional tools","pest control equipment sprayer","exterminator working residential","pest control team professional"],
    "Construction":         ["construction workers building site","building construction progress aerial","construction team workers hard hats","architect blueprint site planning","new building construction frame","construction professional site manager"],
    "Other":                ["professional business team meeting","modern office workspace bright","business professional working desk","team collaboration modern office","professional workspace minimal","business people working together"],
  };
  return map[industry] || map["Other"];
}

/* ─────────────────────────────────────────────────────────────────────────────
   PROMPT BUILDER
───────────────────────────────────────────────────────────────────────────── */
function buildPrompt(f, images = []) {
  const pal = PALETTES.find(p => p.id === f.palette) || PALETTES[0];
  const vib = VIBES.find(v => v.id === f.vibe) || VIBES[0];
  // Pricing only appears when the user explicitly selected it AND filled in tier data.
  const hasPricingData = f.pricingTiers?.some(t => t && (t.name || t.price));
  const secs = f.sections.filter(s =>
    s !== "hero" && s !== "social_proof" &&
    !(s === "pricing" && !hasPricingData)
  );
  const img = (i) => images[i] || images[0] || null;

  const mapsHtml = f.location
    ? `Include in contact section: 1) Static map image: <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(f.location)}" target="_blank"><img src="https://maps.googleapis.com/maps/api/staticmap?center=${encodeURIComponent(f.location)}&zoom=15&size=800x300&scale=2&markers=color:red%7C${encodeURIComponent(f.location)}&key=${GOOGLE_KEY}" style="width:100%;height:200px;object-fit:cover;border-radius:12px"/></a> 2) Plain text address: ${f.location}`
    : "No address provided.";

  const hasImages = images.length > 0;
  const photosSection = hasImages ? [
    "REAL PHOTOS PROVIDED — use EXACTLY as specified:",
    `HERO: background-image: url(${img(0)}) — full viewport, cover, dark gradient overlay rgba(0,0,0,0.6)`,
    `ABOUT SECTION: <img src=${img(1)} style=width:100%;height:100%;object-fit:cover> — full height left column`,
    "GALLERY: Use all as <img> tags with object-fit:cover:",
    `  ${img(0)}, ${img(1)}, ${img(2)}, ${img(3)}, ${img(4)}, ${img(5)||img(0)}`,
    "SERVICE CARDS: Full-bleed image background per card, cycle through all images, dark gradient overlay.",
    `CTA BANNER: background-image: url(${img(2)||img(0)}) — dark overlay`,
    "RULES: Use EXACT URLs. Every img tag needs object-fit:cover and defined height. No placeholder.com or picsum.",
  ].join("\n") : "IMAGES: Use CSS gradients and geometric patterns only.";

  const secsPrompt = secs.map((s, i) => {
    const n = i + 5;
   const m = {
  services:     `${n}. SERVICES: CRITICAL — generate EXACTLY 6 service cards in a 3-column grid. Each card MUST have: a relevant emoji icon, a service name, a 2-sentence description, and a price range. Do NOT leave this section empty. Use real services for ${f.industry}.`,
  about:        `${n}. ABOUT: 2-col layout${img(1) ? ", left col real image ("+img(1)+"), right col story + 4 stats" : ", story left, 4 stats right"}`,
  benefits:     `${n}. BENEFITS: 6-item grid, icon+title+desc, niche-specific`,
  testimonials: `${n}. TESTIMONIALS: CRITICAL — generate EXACTLY 3 customer review cards. Each MUST have: a 5-star rating display, a quote of at least 2 sentences, a customer name, and a location. Do NOT leave this section empty.`,
 pricing:      `${n}. PRICING: 3 tiers in a grid, feature lists, Most Popular badge on middle tier. Currency symbol: ${f.pricingCurrency||"$"}. ${f.pricingTiers?.filter(t=>t.name||t.price).length ? "Use these exact pricing tiers: " + f.pricingTiers.filter(t=>t.name||t.price).map(t=>`${t.name||"Tier"} at ${f.pricingCurrency||"$"}${t.price||"TBD"} — ${t.description||""}`).join(" | ") : "Generate realistic pricing tiers for "+f.industry+"."}`,
  gallery:      `${n}. GALLERY: CRITICAL — generate EXACTLY 6 gallery items in a CSS grid. Each item MUST be a div with a background image or colored gradient placeholder, a hover overlay with a caption, and fixed height of 250px. Do NOT leave this section empty.`,
  faq:          `${n}. FAQ: 5 accordion items with JS click-to-expand`,
  booking:      `${n}. BOOKING: full form name/email/phone/service/date/message`,
  contact: `${n}. CONTACT: split layout, info left, form right. The form must have: Name, Email, Phone, Service (dropdown with relevant services), Message fields, and a Submit button. The form must submit via fetch POST to 'https://sitefliq.com/api/send-contact' with JSON body: {name, email, phone, service, message, businessEmail: '${f.email||""}', businessName: '${f.name||""}'}. On success show a green thank you message replacing the form. On error show a red error message. Use vanilla JS fetch, no libraries.`,
  cta:          `${n}. CTA BANNER: full-width urgent headline + big button${img(2) ? " — background image with dark overlay" : ""}`,
};
    return m[s] || `${n}. ${s.toUpperCase()}`;
  }).join("\n");

  return [
    "You are a senior CRO expert and world-class web designer. Build a complete, production-ready, single-file HTML landing page.",
    "",
    "BUSINESS:",
    `Name: ${f.name}`,
    `Industry: ${f.industry}`,
    `Tagline: ${f.tagline || "Quality you can trust"}`,
    `Description: ${f.description}`,
    f.location ? `Location: ${f.location} — use THIS EXACT location everywhere (copy, contact section, schema). Never use any other city, state or country.` : `Location: NONE PROVIDED — do NOT invent or mention any city, state, region or country anywhere on the page. Keep all location wording generic like "your area" or "locally". Do NOT add a map. Never write "Austin" or any placeholder city.`,
    `Phone: ${f.phone || ""}`,
    `Email: ${f.email || ""}`,
    `CTA: ${f.cta || "Get Started Today"}`,
    f.logo ? `LOGO: Embed exactly: <img src="__LOGO__" alt="${f.name}" style="height:44px;object-fit:contain">` : "LOGO: Text logo using business name in accent colour.",
    "",
"DESIGN — follow this EXACT system. This is what separates a premium agency site from a cheap one:",
    `Palette: bg:${pal.bg} surface:${pal.surface} accent:${pal.accent} text:${pal.text}`,
    f.importedColours?.length ? `BRAND COLOURS from existing site — use as primary palette: ${f.importedColours.join(", ")}` : "",
    `Vibe: ${vib.label} — ${vib.desc}`,
    "",
    "FONTS — load TWO Google Fonts with one @import. Pick a pairing that matches the industry:",
    "- Trades (plumbing/roofing/electrical/construction/HVAC): heading 'Oswald' or 'Anton', body 'DM Sans' or 'Roboto Slab'",
    "- Fitness/gym: heading 'Oswald', body 'Montserrat'",
    "- Beauty/salon/spa/nails: heading 'Playfair Display' or 'Cormorant Garamond', body 'Lato'",
    "- Restaurant/cafe: heading 'Playfair Display', body 'Lato'",
    "- Professional (law/accounting/consulting/tech/real estate): heading 'Montserrat' (700), body 'Inter' or 'DM Sans'",
    "- Everything else: heading 'Montserrat' (700+800), body 'DM Sans'",
    "Apply heading font to h1,h2,h3,nav logo,stat numbers. Apply body font to body,p,button,input,select,a.",
    "",
    photosSection,
    "",
    "DESIGN TOKENS — put these :root variables at the top of <style> and use them everywhere:",
    ":root{--space-1:8px;--space-2:16px;--space-3:24px;--space-4:32px;--space-6:48px;--space-8:64px;--space-10:80px;--radius-sm:8px;--radius-md:12px;--radius-lg:16px;--radius-pill:999px;--shadow-sm:0 1px 2px rgba(0,0,0,.07),0 2px 4px rgba(0,0,0,.07);--shadow-md:0 1px 2px rgba(0,0,0,.06),0 4px 8px rgba(0,0,0,.07),0 12px 24px rgba(0,0,0,.07);--shadow-lg:0 2px 4px rgba(0,0,0,.06),0 8px 16px rgba(0,0,0,.08),0 24px 48px rgba(0,0,0,.10);--container:1200px}",
    "",
    "LAYOUT RULES — these are mandatory:",
    "- Every section: padding-block clamp(56px,8vw,96px), inner content max-width var(--container) centred with padding-inline 24px.",
    "- Headings: h1 clamp(40px,5vw,72px) line-height 1.1; h2 clamp(30px,4vw,46px). Generous spacing below headings.",
    "- Cards (services/pricing/testimonials/gallery): use grid-template-columns repeat(auto-fit,minmax(280px,1fr)) with gap 28px. Cards have background var(--surface) or white, border-radius var(--radius-lg), padding var(--space-4), box-shadow var(--shadow-md).",
    "- Card hover: transition transform .25s,box-shadow .25s; on hover translateY(-6px) and box-shadow var(--shadow-lg). Wrap hover in @media(hover:hover).",
    "- Service cards: icon in a 56px coloured circle, bold name 20px, description, price badge. NEVER plain text — always proper cards in a grid.",
    "- Pricing: 3 tiers in a grid, middle tier scale(1.05) with accent border + 'Most Popular' ribbon. Tick-list of features.",
    "- Testimonials: cards with big quote mark, star rating in accent colour, italic quote, avatar circle with initials + name + location.",
    "- Gallery: grid repeat(auto-fit,minmax(220px,1fr)), each tile aspect-ratio 1, object-fit cover, hover zoom scale(1.05) with overflow hidden.",
    "- Buttons: padding 14px 32px, border-radius var(--radius-pill), bold, box-shadow var(--shadow-sm); hover translateY(-3px) + deeper shadow.",
    "- Mobile (max-width 768px): all grids collapse to 1 column, hero text centres, nav becomes hamburger.",
    "",
    "CONTRAST RULE — CRITICAL: never put accent-colour text on an accent-colour background. Light/yellow backgrounds always get dark text (#111827); dark backgrounds always get white text (#ffffff). Every piece of text must be clearly readable.",
    "",
    "ANIMATIONS — add these, all vanilla CSS/JS, no libraries:",
    "- Scroll reveal: elements start opacity:0 translateY(24px), add .in-view class via IntersectionObserver (threshold .15) to fade+slide in over .6s. Stagger grid children by 80ms.",
    "- Hero entrance: headline, subtext and buttons fade up staggered (animation-delay .1s/.25s/.4s) using @keyframes with animation-fill-mode forwards.",
    "- Stat counters: count up from 0 to target over 2s using requestAnimationFrame when scrolled into view. Add font-variant-numeric:tabular-nums.",
    "- Sticky nav: transparent over hero, after 80px scroll add solid background + backdrop-filter blur + subtle shadow.",
    "- Wrap all motion in @media(prefers-reduced-motion:no-preference).",
    "",
    "SECTIONS — build EXACTLY these, in this order, and NOTHING else:",
    "1. Full SEO <head>: title, meta description, keywords, OG tags, Twitter card, canonical, schema.org LocalBusiness JSON-LD.",
    "2. Sticky header: logo/name left, nav right, mobile hamburger.",
    "3. Hero: min-height:100vh, position:relative, content z-index:2 centred." + (img(0) ? " Use the provided hero image as a full-bleed background with a dark overlay." : " Use a CSS gradient background."),
    "4. Social proof bar: 4 animated counter stats (JS count-up from 0 on scroll).",
    secsPrompt,
    "- Footer: dark background, logo, tagline, 3 link columns (Services, Company, Contact), copyright 2026. Do NOT add social media icons or links unless handles were provided in the business description.",
    "CRITICAL: Do NOT add any section that is not listed above. In particular, do NOT include a pricing, plans, packages or membership-tiers section unless it appears explicitly in the list above.",
    "",
    "GOOGLE MAPS:",
    mapsHtml,
    "",
    "RULES: CSS in <style>, JS in <script> at end. Real niche-specific copy, no lorem ipsum. 5+ CTAs throughout. Working FAQ accordion and mobile hamburger menu. All images object-fit:cover with defined heights.",
    "",
"OUTPUT: Raw HTML only. Start with <!DOCTYPE html>. End with </html>. Nothing else.",
  ].join("\n");
}

/* ─────────────────────────────────────────────────────────────────────────────
   GLOBAL STYLES
───────────────────────────────────────────────────────────────────────────── */
const GS = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700;800&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html,body{height:100%;font-family:'Geist',sans-serif;-webkit-font-smoothing:antialiased;background:#fafaf9}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(24px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes slideIn{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
    @keyframes popIn{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}
    @keyframes glow{0%,100%{box-shadow:0 0 20px #f9731640}50%{box-shadow:0 0 40px #f9731680}}
    @keyframes slideDown{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
    @keyframes confettiFall{0%{transform:translateY(-20px) rotate(0deg);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}
    textarea:focus,input:focus,select:focus{outline:none}
    ::-webkit-scrollbar{width:3px}
    ::-webkit-scrollbar-thumb{background:#e5e7eb;border-radius:3px}
  `}</style>
);

/* ─────────────────────────────────────────────────────────────────────────────
   TOAST SYSTEM (lightweight, no library)
───────────────────────────────────────────────────────────────────────────── */
let _toastId = 0;
let _toastSetter = null;

export function toast(msg, type = "info", duration = 3500) {
  if (!_toastSetter) return;
  const id = ++_toastId;
  _toastSetter(prev => [...prev, { id, msg, type }]);
  setTimeout(() => _toastSetter(prev => prev.filter(t => t.id !== id)), duration);
}

function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  useEffect(() => { _toastSetter = setToasts; return () => { _toastSetter = null; }; }, []);
  if (!toasts.length) return null;
  const colors = { success:"#16a34a", error:"#dc2626", info:"#f97316", warning:"#d97706" };
  const icons  = { success:"✓", error:"✕", info:"⚡", warning:"⚠" };
  return (
    <div style={{ position:"fixed", bottom:24, right:24, zIndex:99999, display:"flex", flexDirection:"column", gap:8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{ background:"white", border:`1.5px solid ${colors[t.type]}33`, borderLeft:`3px solid ${colors[t.type]}`, borderRadius:10, padding:"11px 16px", fontSize:13, color:"#111827", boxShadow:"0 4px 20px rgba(0,0,0,.12)", display:"flex", alignItems:"center", gap:9, animation:"slideDown .25s ease", maxWidth:340 }}>
          <span style={{ color:colors[t.type], fontWeight:700, flexShrink:0 }}>{icons[t.type]}</span>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   CONFETTI (canvas-free, pure CSS/DOM)
───────────────────────────────────────────────────────────────────────────── */
function ConfettiBurst({ active }) {
  if (!active) return null;
  const pieces = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    color: ["#f97316","#22c55e","#3b82f6","#f59e0b","#8b5cf6","#ec4899"][i % 6],
    left: Math.random() * 100,
    delay: Math.random() * 1.2,
    size: 6 + Math.random() * 6,
    duration: 2 + Math.random() * 2,
  }));
  return (
    <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:9998, overflow:"hidden" }}>
      {pieces.map(p => (
        <div key={p.id} style={{ position:"absolute", top:0, left:`${p.left}%`, width:p.size, height:p.size, background:p.color, borderRadius:p.id % 3 === 0 ? "50%" : 2, animation:`confettiFall ${p.duration}s ${p.delay}s ease-in forwards` }}/>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ANIMATED COUNTER (IntersectionObserver + rAF)
───────────────────────────────────────────────────────────────────────────── */
function AnimatedCounter({ target, suffix = "", prefix = "", duration = 2000, style = {} }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const animated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !animated.current) {
        animated.current = true;
        const start = performance.now();
        const tick = (now) => {
          const progress = Math.min((now - start) / duration, 1);
          const ease = 1 - Math.pow(1 - progress, 3);
          setCount(Math.floor(ease * target));
          if (progress < 1) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }
    }, { threshold: 0.5 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [target, duration]);

  return <span ref={ref} style={style}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

/* ─────────────────────────────────────────────────────────────────────────────
   LOW CREDIT BANNER
───────────────────────────────────────────────────────────────────────────── */
function LowCreditBanner({ credits, onBuyCredits }) {
  if (credits > 1) return null;
  return (
    <div style={{ background: credits === 0 ? "#fef2f2" : "#fff7ed", border:`1px solid ${credits === 0 ? "#fecaca" : "#fed7aa"}`, borderRadius:8, padding:"10px 14px", marginBottom:12, display:"flex", alignItems:"center", justifyContent:"space-between", gap:10 }}>
      <div style={{ fontSize:12, color: credits === 0 ? "#dc2626" : "#d97706", fontWeight:600 }}>
        {credits === 0 ? "⚠ No credits remaining" : "⚡ Only 1 credit left"}
      </div>
      <button onClick={onBuyCredits} style={{ padding:"5px 12px", background: credits === 0 ? "#dc2626" : "#f97316", color:"white", border:"none", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
        Buy Credits →
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   EXIT INTENT POPUP
───────────────────────────────────────────────────────────────────────────── */
function ExitIntentPopup({ onClose, onBuild }) {
  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.55)", zIndex:9990, display:"flex", alignItems:"center", justifyContent:"center", animation:"fadeIn .25s ease" }}>
      <div style={{ background:"white", borderRadius:20, padding:"40px 36px", maxWidth:440, width:"90%", textAlign:"center", position:"relative", boxShadow:"0 20px 60px rgba(0,0,0,.2)", animation:"popIn .3s ease" }}>
        <button onClick={onClose} style={{ position:"absolute", top:14, right:16, background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#9ca3af" }}>×</button>
        <div style={{ fontSize:44, marginBottom:12 }}>✋</div>
        <h2 style={{ fontSize:22, fontWeight:800, color:"#111827", marginBottom:8 }}>Wait — your page is almost ready!</h2>
        <p style={{ fontSize:14, color:"#6b7280", lineHeight:1.7, marginBottom:24 }}>
          You're 60 seconds away from a professional landing page. Don't leave without seeing what your business could look like.
        </p>
        <button onClick={onBuild} style={{ width:"100%", padding:"13px", background:"#f97316", color:"white", border:"none", borderRadius:10, fontSize:15, fontWeight:700, cursor:"pointer", marginBottom:10, animation:"glow 3s ease-in-out infinite" }}>
          ✦ Build My Page Now →
        </button>
        <button onClick={onClose} style={{ background:"none", border:"none", fontSize:12, color:"#9ca3af", cursor:"pointer" }}>
          No thanks, I'll leave
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MOBILE / DESKTOP PREVIEW TOGGLE (result screen)
───────────────────────────────────────────────────────────────────────────── */
function PreviewFrame({ html, businessName }) {
  const iframeRef = useRef(null);
  const [ready, setReady] = useState(false);

  // Set up the shell ONCE — never change srcDoc again
  const SHELL = `<!doctype html><html><head><meta charset="utf-8">
    <style>*{box-sizing:border-box}body{margin:0}</style>
    </head><body><div id="sf-root"></div></body></html>`;

  // Write HTML into the iframe without reloading it
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || !ready || !html) return;
    try {
      const win = iframe.contentWindow;
      const doc = iframe.contentDocument;
      const root = doc?.getElementById("sf-root");
      if (!root) return;
      const sx = win.scrollX, sy = win.scrollY;
      root.innerHTML = html;
      win.scrollTo(sx, sy);
    } catch(e) {
      console.warn("iframe write error:", e);
    }
  }, [html, ready]);

  const [mode, setMode] = useState("desktop");
  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", background:"#f1f5f9" }}>
      <div style={{ padding:"10px 16px", background:"white", borderBottom:"1px solid #e5e7eb", display:"flex", alignItems:"center", gap:8 }}>
        <div style={{ display:"flex", gap:5 }}>
          {["#ef4444","#f59e0b","#22c55e"].map(c => <div key={c} style={{ width:10, height:10, borderRadius:"50%", background:c }}/>)}
        </div>
        <div style={{ flex:1, background:"#f3f4f6", borderRadius:6, padding:"4px 12px", fontSize:11, color:"#9ca3af", marginLeft:8 }}>
          {(businessName||"preview").toLowerCase().replace(/\s+/g,"-")}.netlify.app
        </div>
        <div style={{ display:"flex", gap:2, background:"#f3f4f6", borderRadius:7, padding:3 }}>
          {[["desktop","🖥","Desktop"],["mobile","📱","Mobile"]].map(([m,ic,label]) => (
            <button key={m} onClick={() => setMode(m)} style={{ padding:"4px 10px", fontSize:11, background:mode===m?"white":"transparent", border:"none", borderRadius:5, cursor:"pointer", fontWeight:mode===m?700:400, color:mode===m?"#111827":"#6b7280" }}>
              {ic} {label}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex:1, display:"flex", justifyContent:"center", overflow:"auto", padding:mode==="mobile"?"16px 0":0, background:mode==="mobile"?"#e5e7eb":"transparent" }}>
        <iframe
          ref={iframeRef}
          srcDoc={SHELL}
          onLoad={() => setReady(true)}
          style={{ width:mode==="mobile"?"375px":"100%", height:mode==="mobile"?667:"100%", border:"none", display:"block", borderRadius:mode==="mobile"?12:0, boxShadow:mode==="mobile"?"0 8px 32px rgba(0,0,0,.2)":"none" }}
          title="Page Preview"
          sandbox="allow-scripts allow-same-origin"
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   TYPEWRITER
───────────────────────────────────────────────────────────────────────────── */
function TW({ words, color = "#f97316" }) {
  const [txt, set] = useState("");
  const [wi, setWi] = useState(0);
  const [ci, setCi] = useState(0);
  const [del, setDel] = useState(false);

  useEffect(() => {
    const w = words[wi];
    const t = setTimeout(() => {
      if (!del) {
        set(w.slice(0, ci + 1));
        if (ci + 1 === w.length) setTimeout(() => setDel(true), 2000);
        else setCi(c => c + 1);
      } else {
        set(w.slice(0, ci - 1));
        if (ci - 1 === 0) { setDel(false); setWi(i => (i + 1) % words.length); setCi(0); }
        else setCi(c => c - 1);
      }
    }, del ? 30 : 75);
    return () => clearTimeout(t);
  }, [ci, del, wi, words]);

  return <span style={{ color }}>{txt}<span style={{ animation:"blink 1s infinite", color }}>|</span></span>;
}

/* ─────────────────────────────────────────────────────────────────────────────
   REUSABLE FIELD
───────────────────────────────────────────────────────────────────────────── */
const Field = memo(function Field({ label, value, onChange, placeholder, required, hint }) {
  return (
    <div>
      <label style={{ fontSize:11, fontWeight:700, color:"#374151", letterSpacing:.5, display:"block", marginBottom:6, textTransform:"uppercase" }}>
        {label}{required && <span style={{ color:"#f97316" }}> *</span>}
        {hint && <span style={{ fontSize:9, color:"#9ca3af", fontWeight:400, textTransform:"none", marginLeft:6 }}>{hint}</span>}
      </label>
      <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        style={{ width:"100%", padding:"10px 13px", border:"1.5px solid #e5e7eb", borderRadius:9, fontSize:13, color:"#111827", background:"white", transition:"border-color .15s", fontFamily:"inherit" }}
        onFocus={e => e.target.style.borderColor = "#f97316"}
        onBlur={e => e.target.style.borderColor = "#e5e7eb"}
      />
    </div>
  );
});

/* ─────────────────────────────────────────────────────────────────────────────
   WEBSITE IMPORTER
───────────────────────────────────────────────────────────────────────────── */
function WebsiteImporter({ onImport }) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [msg, setMsg] = useState("");

  const handleImport = async () => {
    if (!url.trim()) return;
    setLoading(true); setStatus(null); setMsg("");
    try {
      const r = await fetch("/api/scrape-website", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await r.json();
      if (data.success) {
        onImport(data);
        setStatus("success");
        setMsg("Branding imported! Logo, colours and info auto-filled below.");
        toast("✓ Website imported successfully!", "success");
      } else {
        setStatus("error");
        setMsg(data.error || "Couldn't extract branding from that site.");
      }
    } catch {
      setStatus("error");
      setMsg("Network error — please try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{ background:"linear-gradient(135deg,#fff7ed,#fffbf5)", border:"1.5px solid #fed7aa", borderRadius:12, padding:"14px 16px", marginBottom:4 }}>
      <div style={{ fontSize:11, fontWeight:700, color:"#f97316", letterSpacing:.5, textTransform:"uppercase", marginBottom:8 }}>✨ Import from existing website</div>
      <div style={{ display:"flex", gap:8 }}>
        <input value={url} onChange={e => setUrl(e.target.value)} onKeyDown={e => e.key === "Enter" && handleImport()}
          placeholder="yourwebsite.com"
          style={{ flex:1, padding:"9px 12px", border:"1.5px solid #fed7aa", borderRadius:8, fontSize:13, outline:"none", fontFamily:"inherit", background:"white" }}
          onFocus={e => e.target.style.borderColor = "#f97316"}
          onBlur={e => e.target.style.borderColor = "#fed7aa"}
        />
        <button onClick={handleImport} disabled={loading || !url.trim()}
          style={{ padding:"9px 16px", background:loading || !url.trim() ? "#e5e7eb" : "#f97316", color:loading || !url.trim() ? "#9ca3af" : "white", border:"none", borderRadius:8, fontSize:12, fontWeight:700, cursor:loading || !url.trim() ? "not-allowed" : "pointer", fontFamily:"inherit", whiteSpace:"nowrap" }}>
          {loading ? "⏳ Scanning…" : "Import →"}
        </button>
      </div>
      {status && <div style={{ marginTop:8, fontSize:12, color:status==="success" ? "#16a34a" : "#dc2626" }}>{status==="success" ? "✅" : "⚠️"} {msg}</div>}
      {!status && <div style={{ marginTop:6, fontSize:11, color:"#9ca3af" }}>Auto-extracts logo, brand colours & business info</div>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   LOGO UPLOAD
───────────────────────────────────────────────────────────────────────────── */
function LogoUpload({ value, onChange }) {
  const ref = useRef();
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 500000) { toast("Logo must be under 500KB", "error"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => onChange(ev.target.result);
    reader.readAsDataURL(file);
  };
  return (
    <div>
      <label style={{ fontSize:11, fontWeight:700, color:"#374151", letterSpacing:.5, display:"block", marginBottom:6, textTransform:"uppercase" }}>
        Logo <span style={{ fontSize:9, color:"#9ca3af", fontWeight:400, textTransform:"none" }}>— optional, embedded in page</span>
      </label>
      <div onClick={() => ref.current.click()}
        style={{ border:"1.5px dashed #e5e7eb", borderRadius:9, padding:"10px 13px", cursor:"pointer", display:"flex", alignItems:"center", gap:10, background:"#fafaf9", transition:"border-color .15s", minHeight:44 }}
        onMouseEnter={e => e.currentTarget.style.borderColor = "#f97316"}
        onMouseLeave={e => e.currentTarget.style.borderColor = "#e5e7eb"}>
        {value ? (
          <>
            <img src={value} alt="logo" style={{ height:28, maxWidth:80, objectFit:"contain", borderRadius:4 }}/>
            <span style={{ fontSize:12, color:"#6b7280", flex:1 }}>Logo uploaded</span>
            <span onClick={e => { e.stopPropagation(); onChange(""); }} style={{ fontSize:11, color:"#ef4444", cursor:"pointer", padding:"2px 6px", border:"1px solid #fecaca", borderRadius:4 }}>Remove</span>
          </>
        ) : (
          <>
            <span style={{ fontSize:18 }}>🖼️</span>
            <span style={{ fontSize:12, color:"#9ca3af" }}>Upload logo (PNG, JPG, SVG, max 500KB)</span>
          </>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" onChange={handleFile} style={{ display:"none" }}/>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   ADDRESS AUTOCOMPLETE
───────────────────────────────────────────────────────────────────────────── */
function AddressField({ value, onChange }) {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { setQuery(value || ""); }, [value]);

  useEffect(() => {
    if (window.google?.maps?.places) return;
    if (document.getElementById("gps")) return;
    const s = document.createElement("script");
    s.id = "gps";
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&libraries=places&language=en`;
    s.async = true;
    document.head.appendChild(s);
  }, []);

  const fetchSuggestions = (input) => {
    if (!input || input.length < 3) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    const tryFetch = (attempts = 0) => {
      if (window.google?.maps?.places) {
        const svc = new window.google.maps.places.AutocompleteService();
        svc.getPlacePredictions({ input, sessionToken: new window.google.maps.places.AutocompleteSessionToken() }, (preds, status) => {
          setLoading(false);
          if (status === "OK" && preds) { setSuggestions(preds.slice(0, 5)); setOpen(true); }
          else { setSuggestions([]); setOpen(false); }
        });
      } else if (attempts < 20) {
        setTimeout(() => tryFetch(attempts + 1), 200);
      } else {
        setLoading(false);
      }
    };
    tryFetch();
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val); onChange(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 350);
  };

  const handleSelect = (pred) => {
    const address = pred.description;
    setQuery(address); onChange(address);
    setSuggestions([]); setOpen(false);
  };

  const highlight = (text, matches) => {
    if (!matches?.length) return text;
    const parts = []; let i = 0;
    for (const m of matches) {
      if (m.offset > i) parts.push(text.slice(i, m.offset));
      parts.push(<strong key={m.offset} style={{ color:"#111827", fontWeight:700 }}>{text.slice(m.offset, m.offset + m.length)}</strong>);
      i = m.offset + m.length;
    }
    if (i < text.length) parts.push(text.slice(i));
    return parts;
  };

  return (
    <div ref={wrapRef} style={{ position:"relative" }}>
      <label style={{ fontSize:11, fontWeight:700, color:"#374151", letterSpacing:.5, display:"block", marginBottom:6, textTransform:"uppercase" }}>
        Address <span style={{ color:"#9ca3af", fontWeight:400, textTransform:"none", fontSize:10 }}>adds map to page</span>
      </label>
      <div style={{ position:"relative" }}>
        <input value={query} onChange={handleInput}
          onFocus={e => { e.target.style.borderColor = "#f97316"; if (suggestions.length > 0) setOpen(true); }}
          onBlur={e => e.target.style.borderColor = "#e5e7eb"}
          placeholder="123 Main St, New York, NY"
          autoComplete="off"
          style={{ width:"100%", padding:"10px 36px 10px 13px", border:"1.5px solid #e5e7eb", borderRadius:9, fontSize:13, color:"#111827", background:"white", fontFamily:"inherit", outline:"none" }}
        />
        <div style={{ position:"absolute", right:11, top:"50%", transform:"translateY(-50%)", pointerEvents:"none", fontSize:13 }}>
          {loading ? <span style={{ display:"inline-block", animation:"spin .7s linear infinite", color:"#9ca3af" }}>◌</span> : "📍"}
        </div>
      </div>
      {open && suggestions.length > 0 && (
        <div style={{ position:"absolute", top:"calc(100% + 4px)", left:0, right:0, background:"white", border:"1.5px solid #e5e7eb", borderRadius:10, boxShadow:"0 8px 28px rgba(0,0,0,.13)", zIndex:9999, overflow:"hidden" }}>
          {suggestions.map((pred, i) => {
            const main = pred.structured_formatting?.main_text || pred.description;
            const secondary = pred.structured_formatting?.secondary_text || "";
            const mainMatches = pred.structured_formatting?.main_text_matched_substrings || [];
            return (
              <div key={pred.place_id} onMouseDown={() => handleSelect(pred)}
                style={{ padding:"10px 14px", cursor:"pointer", borderBottom:i < suggestions.length-1 ? "1px solid #f9fafb" : "none", display:"flex", alignItems:"center", gap:10, background:"white" }}
                onMouseEnter={e => e.currentTarget.style.background = "#fff7ed"}
                onMouseLeave={e => e.currentTarget.style.background = "white"}>
                <div style={{ width:30, height:30, background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>📍</div>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:13, color:"#6b7280", lineHeight:1.3 }}>{highlight(main, mainMatches)}</div>
                  {secondary && <div style={{ fontSize:11, color:"#9ca3af", marginTop:2 }}>{secondary}</div>}
                </div>
                <div style={{ fontSize:11, color:"#d1d5db", flexShrink:0 }}>select</div>
              </div>
            );
          })}
          <div style={{ padding:"6px 14px", background:"#f9fafb", borderTop:"1px solid #f3f4f6", display:"flex", justifyContent:"flex-end" }}>
            <img src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png" alt="Powered by Google" style={{ height:13, opacity:.65 }}/>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   LIVE PREVIEW
───────────────────────────────────────────────────────────────────────────── */
const LivePreview = memo(function LivePreview({ form }) {
  const pal = PALETTES.find(p => p.id === form.palette) || PALETTES[0];
  const filled = form.name || form.industry;
  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:28, background:"#f1f5f9" }}>
      {!filled ? (
        <div style={{ textAlign:"center", color:"#9ca3af" }}>
          <div style={{ fontSize:44, marginBottom:14, opacity:.3 }}>✦</div>
          <div style={{ fontSize:13, fontWeight:600, color:"#6b7280", marginBottom:6 }}>Preview appears here</div>
          <div style={{ fontSize:12 }}>Fill in your business details</div>
        </div>
      ) : (
        <div style={{ width:"100%", maxWidth:500, animation:"popIn .4s ease" }}>
          <div style={{ background:"#e2e8f0", borderRadius:"10px 10px 0 0", padding:"9px 14px", display:"flex", alignItems:"center", gap:8 }}>
            <div style={{ display:"flex", gap:5 }}>{["#ef4444","#f59e0b","#22c55e"].map(c => <div key={c} style={{ width:9, height:9, borderRadius:"50%", background:c }}/>)}</div>
            <div style={{ flex:1, background:"white", borderRadius:20, padding:"4px 11px", fontSize:10, color:"#6b7280" }}>🔒 {(form.name || "yourbusiness").toLowerCase().replace(/\s+/g, "-")}.netlify.app</div>
          </div>
          <div style={{ background:pal.bg, borderRadius:"0 0 10px 10px", overflow:"hidden", boxShadow:"0 16px 50px rgba(0,0,0,.12)" }}>
            <div style={{ padding:"10px 18px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:`1px solid ${pal.accent}22` }}>
              <span style={{ fontWeight:800, color:pal.accent, fontSize:12 }}>{form.name || "Business"}</span>
              <div style={{ display:"flex", gap:8, fontSize:8, color:`${pal.text}55`, alignItems:"center" }}>
                {["Services","About","Contact"].map(l => <span key={l}>{l}</span>)}
                <span style={{ background:pal.accent, color:pal.bg, padding:"2px 8px", borderRadius:3, fontSize:8, fontWeight:700 }}>{form.cta || "Get Started"}</span>
              </div>
            </div>
            <div style={{ background:`linear-gradient(135deg,${pal.bg},${pal.surface})`, padding:"28px 18px 20px", textAlign:"center" }}>
              <div style={{ fontSize:7, letterSpacing:2, color:`${pal.accent}77`, textTransform:"uppercase", marginBottom:6 }}>{form.industry || "Your Industry"}</div>
              <div style={{ fontWeight:800, color:pal.accent, fontSize:16, lineHeight:1.1, marginBottom:6 }}>{form.name || "Your Business"}</div>
              <div style={{ fontSize:8, color:`${pal.text}44`, maxWidth:180, margin:"0 auto 12px", lineHeight:1.5 }}>{form.tagline || "Your tagline here"}</div>
              <div style={{ display:"flex", gap:6, justifyContent:"center" }}>
                <div style={{ background:pal.accent, color:pal.bg, padding:"4px 12px", borderRadius:4, fontSize:8, fontWeight:700 }}>{form.cta || "Get Started"}</div>
                <div style={{ border:`1px solid ${pal.accent}44`, color:pal.accent, padding:"4px 12px", borderRadius:4, fontSize:8 }}>Learn More</div>
              </div>
            </div>
            <div style={{ background:pal.surface, padding:"10px 18px", display:"flex", flexDirection:"column", gap:5 }}>
              {form.sections.filter(s => s !== "hero").slice(0, 5).map(s => (
                <div key={s} style={{ background:`${pal.accent}08`, border:`1px solid ${pal.accent}14`, borderRadius:4, padding:"6px 9px", display:"flex", alignItems:"center", gap:7 }}>
                  <span style={{ fontSize:6, color:`${pal.accent}55`, textTransform:"uppercase", letterSpacing:1, flex:1 }}>{s.replace("_"," ")}</span>
                  <div style={{ display:"flex", gap:2 }}>{[70,50,85].map((w,i) => <div key={i} style={{ height:2, width:w*0.22, background:`${pal.accent}18`, borderRadius:2 }}/>)}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ marginTop:10, display:"flex", justifyContent:"space-between", fontSize:10, color:"#9ca3af", padding:"0 2px" }}>
            <span>{form.sections.length} sections</span>
            <span style={{ color:pal.accent }}>{form.palette} · {form.vibe}</span>
          </div>
        </div>
      )}
    </div>
  );
});

/* ─────────────────────────────────────────────────────────────────────────────
   GENERATION PROGRESS STEPPER
───────────────────────────────────────────────────────────────────────────── */
function ProgressStepper({ stage }) {
  const steps = [
    { label:"Reading your business", icon:"📋" },
    { label:"Choosing palette & fonts", icon:"🎨" },
    { label:"Writing niche copy", icon:"✍️" },
    { label:"Sourcing images", icon:"🖼️" },
    { label:"Building your page", icon:"⚡" },
  ];
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:8, padding:"16px 0" }}>
      {steps.map((s, i) => {
        const done = i < stage;
        const active = i === stage;
        return (
          <div key={i} style={{ display:"flex", alignItems:"center", gap:10, padding:"8px 12px", borderRadius:8, background:active?"#fff7ed":done?"#f0fdf4":"#f9fafb", border:`1px solid ${active?"#fed7aa":done?"#bbf7d0":"#f3f4f6"}`, transition:"all .3s" }}>
            <div style={{ width:28, height:28, borderRadius:"50%", background:active?"#f97316":done?"#16a34a":"#e5e7eb", display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, flexShrink:0 }}>
              {done ? "✓" : active ? <span style={{ animation:"spin .8s linear infinite", display:"inline-block" }}>◌</span> : s.icon}
            </div>
            <span style={{ fontSize:12, fontWeight:active?700:done?500:400, color:active?"#ea580c":done?"#16a34a":"#9ca3af" }}>{s.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   BUILDER PANEL
───────────────────────────────────────────────────────────────────────────── */
function BuilderPanel({ form, up, togSec, onNext, ready, credits, user, onBuyCredits }) {
  const [tab, setTab] = useState("info");

  const handleImport = (data) => {
    if (data.logo) up("logo", data.logo);
    if (data.businessName || data.title) up("name", (data.businessName || data.title.replace(/\s*[|\-–].*/,"")).trim());
    if (data.description) up("description", data.description);
    if (data.phone) up("phone", data.phone);
    if (data.email) up("email", data.email);
    if (data.address) up("location", data.address);
    if (data.colours?.length) {
      up("importedColours", data.colours);
      const getSat = (hex) => {
        const r=parseInt(hex.slice(1,3),16)/255, g=parseInt(hex.slice(3,5),16)/255, b=parseInt(hex.slice(5,7),16)/255;
        const max=Math.max(r,g,b), min=Math.min(r,g,b);
        return max === 0 ? 0 : (max-min)/max;
      };
      const sorted = [...data.colours].sort((a,b) => getSat(b)-getSat(a));
      const dom = sorted[0] || "#000000";
      const r=parseInt(dom.slice(1,3),16), g=parseInt(dom.slice(3,5),16), b=parseInt(dom.slice(5,7),16);
      let palette = "clean";
      if (r>150&&g<100&&b<100) palette="ember";
      else if (r>180&&g>80&&g<160&&b<80) palette="ember";
      else if (b>120&&r<120&&b>g) palette="slate";
      else if (g>120&&r<120&&g>b) palette="forest";
      else if (r>180&&g>150&&b<80) palette="gold";
      up("palette", palette);
      const desc = (data.description||"").toLowerCase();
      let vibe = "warm";
      if (/luxury|premium|elite|exclusive|high.end/.test(desc)) vibe="elegant";
      else if (/fast|quick|energy|power|sport|gym|fit/.test(desc)) vibe="energetic";
      else if (/tech|software|saas|digital|minimal/.test(desc)) vibe="minimal";
      else if (/bold|strong|industrial|auto|roofing|construct/.test(desc)) vibe="bold";
      up("vibe", vibe);
    }
  };

  return (
    <div style={{ display:"flex", flexDirection:"column", height:"100%", background:"white" }}>
      {/* Header */}
      <div style={{ padding:"18px 22px 0", borderBottom:"1px solid #f3f4f6" }}>
        <div style={{ display:"flex", alignItems:"center", gap:9, marginBottom:14 }}>
          <div style={{ width:30, height:30, background:"#fff7ed", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>✦</div>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:"#111827" }}>Let's build something amazing</div>
            <div style={{ fontSize:11, color:"#9ca3af" }}>Fill in your details below</div>
          </div>
        </div>
        <div style={{ display:"flex", gap:0 }}>
          {[["info","Business"],["style","Style"],["sections","Sections"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} style={{ padding:"7px 14px", fontSize:12, fontWeight:tab===id?700:400, color:tab===id?"#f97316":"#6b7280", background:"transparent", border:"none", borderBottom:tab===id?"2px solid #f97316":"2px solid transparent", cursor:"pointer", transition:"all .15s", fontFamily:"inherit" }}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable content */}
      <div style={{ flex:1, overflowY:"auto", padding:"18px 22px" }}>
        {/* Low credit banner */}
        {user && <LowCreditBanner credits={credits} onBuyCredits={onBuyCredits} />}

        {tab === "info" && (
          <div style={{ display:"flex", flexDirection:"column", gap:13 }}>
            <WebsiteImporter onImport={handleImport}/>
            <LogoUpload value={form.logo} onChange={v => up("logo", v)}/>
            <Field label="Business Name" required value={form.name} onChange={v => up("name",v)} placeholder="e.g. Peak Ridge Roofing"/>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:"#374151", letterSpacing:.5, display:"block", marginBottom:6, textTransform:"uppercase" }}>Industry <span style={{ color:"#f97316" }}>*</span></label>
              <select value={form.industry} onChange={e => up("industry",e.target.value)}
                style={{ width:"100%", padding:"10px 13px", border:"1.5px solid #e5e7eb", borderRadius:9, fontSize:13, color:form.industry?"#111827":"#9ca3af", background:"white", cursor:"pointer", fontFamily:"inherit" }}
                onFocus={e => e.target.style.borderColor="#f97316"}
                onBlur={e => e.target.style.borderColor="#e5e7eb"}>
                <option value="">Select your industry…</option>
                {INDUSTRIES.map(i => <option key={i}>{i}</option>)}
              </select>
            </div>
            <Field label="Tagline" value={form.tagline} onChange={v => up("tagline",v)} placeholder="e.g. Beautiful gardens, one yard at a time"/>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:"#374151", letterSpacing:.5, display:"block", marginBottom:6, textTransform:"uppercase" }}>
                Describe your business <span style={{ color:"#f97316" }}>*</span>
                <span style={{ color:"#9ca3af", fontSize:9, fontWeight:400, marginLeft:6 }}>more detail = better page</span>
              </label>
              <textarea value={form.description} onChange={e => up("description",e.target.value)} rows={4}
                placeholder="What do you offer? Who are your clients? What makes you different? Include services, prices, unique selling points…"
                style={{ width:"100%", padding:"10px 13px", border:"1.5px solid #e5e7eb", borderRadius:9, fontSize:13, color:"#111827", background:"white", resize:"none", lineHeight:1.6, fontFamily:"inherit", transition:"border-color .15s" }}
                onFocus={e => e.target.style.borderColor="#f97316"}
                onBlur={e => e.target.style.borderColor="#e5e7eb"}
              />
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <AddressField value={form.location} onChange={v => up("location",v)}/>
              <Field label="CTA Button" value={form.cta} onChange={v => up("cta",v)} placeholder="Get Started Today"/>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
              <Field label="Phone" value={form.phone} onChange={v => up("phone",v)} placeholder="+1 555 123 4567"/>
              <Field label="Email" value={form.email} onChange={v => up("email",v)} placeholder="hello@business.com"/>
            </div>
          </div>
        )}

        {tab === "style" && (
          <div style={{ display:"flex", flexDirection:"column", gap:22 }}>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:"#374151", letterSpacing:.5, display:"block", marginBottom:10, textTransform:"uppercase" }}>Colour Palette</label>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
                {PALETTES.map(p => (
                  <div key={p.id} onClick={() => up("palette",p.id)} style={{ borderRadius:10, overflow:"hidden", cursor:"pointer", border:form.palette===p.id?`2px solid ${p.accent}`:"2px solid #e5e7eb", boxShadow:form.palette===p.id?`0 0 12px ${p.accent}44`:"none", transition:"all .2s" }}>
                    <div style={{ height:32, background:`linear-gradient(135deg,${p.bg},${p.surface})`, display:"flex", alignItems:"flex-end", padding:"0 6px 4px" }}>
                      <div style={{ width:18, height:3, background:p.accent, borderRadius:2 }}/>
                    </div>
                    <div style={{ padding:"4px 8px", background:"white", fontSize:10, fontWeight:600, color:form.palette===p.id?"#f97316":"#374151" }}>{p.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label style={{ fontSize:11, fontWeight:700, color:"#374151", letterSpacing:.5, display:"block", marginBottom:10, textTransform:"uppercase" }}>Design Vibe</label>
              <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                {VIBES.map(v => (
                  <div key={v.id} onClick={() => up("vibe",v.id)} style={{ padding:"9px 12px", borderRadius:8, cursor:"pointer", border:form.vibe===v.id?"1.5px solid #f97316":"1.5px solid #e5e7eb", background:form.vibe===v.id?"#fff7ed":"white", display:"flex", alignItems:"center", justifyContent:"space-between", transition:"all .15s" }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:600, color:form.vibe===v.id?"#ea580c":"#111827" }}>{v.label}</div>
                      <div style={{ fontSize:11, color:"#9ca3af", marginTop:1 }}>{v.desc}</div>
                    </div>
                    <div style={{ width:15, height:15, borderRadius:"50%", border:`2px solid ${form.vibe===v.id?"#f97316":"#d1d5db"}`, background:form.vibe===v.id?"#f97316":"transparent", flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      {form.vibe===v.id && <div style={{ width:5, height:5, borderRadius:"50%", background:"white" }}/>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "sections" && (
  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
    <p style={{ fontSize:12, color:"#6b7280", marginBottom:4, lineHeight:1.5 }}>Choose sections to include. Hero & Social Proof always included.</p>
    {SECTIONS.map(s => (
      <div key={s.id}>
        {/* Section toggle row */}
        <div onClick={() => !s.locked && togSec(s.id)}
          style={{ padding:"8px 11px", borderRadius:8, cursor:s.locked?"default":"pointer", display:"flex", alignItems:"center", gap:9, border:form.sections.includes(s.id)?"1.5px solid #f97316":"1.5px solid #e5e7eb", background:form.sections.includes(s.id)?"#fff7ed":"white", transition:"all .15s" }}>
          <span style={{ fontSize:14, width:18, textAlign:"center", flexShrink:0 }}>{s.icon}</span>
          <span style={{ flex:1, fontSize:12, fontWeight:500, color:form.sections.includes(s.id)?"#ea580c":"#374151" }}>{s.label}</span>
          {s.locked
            ? <span style={{ fontSize:9, color:"#d1d5db", background:"#f9fafb", padding:"2px 6px", borderRadius:4, border:"1px solid #e5e7eb" }}>Always on</span>
            : <div style={{ width:15, height:15, borderRadius:4, border:`2px solid ${form.sections.includes(s.id)?"#f97316":"#d1d5db"}`, background:form.sections.includes(s.id)?"#f97316":"transparent", display:"flex", alignItems:"center", justifyContent:"center", fontSize:9, color:"white", fontWeight:900, flexShrink:0 }}>
                {form.sections.includes(s.id) && "✓"}
              </div>
          }
        </div>

        {/* SERVICES inputs */}
        {s.id === "services" && form.sections.includes("services") && (
          <div style={{ background:"#fafaf9", border:"1px solid #f3f4f6", borderRadius:8, padding:"12px", marginTop:4 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#374151", marginBottom:8, textTransform:"uppercase", letterSpacing:.5 }}>Your Services (optional)</div>
            <div style={{ fontSize:11, color:"#9ca3af", marginBottom:10 }}>Add up to 6 services. Leave blank to let AI generate them.</div>
            {[0,1,2,3,4,5].map(i => (
              <div key={i} style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:6, marginBottom:6 }}>
                <input
                  value={form.services?.[i]?.name || ""}
                  onChange={e => {
                    const services = [...(form.services || [{},{},{},{},{},{}])];
                    services[i] = { ...services[i], name: e.target.value };
                    up("services", services);
                  }}
                  placeholder={`Service ${i+1} name`}
                  style={{ padding:"7px 10px", border:"1px solid #e5e7eb", borderRadius:6, fontSize:12, fontFamily:"inherit", outline:"none" }}
                  onFocus={e => e.target.style.borderColor="#f97316"}
                  onBlur={e => e.target.style.borderColor="#e5e7eb"}
                />
                <input
                  value={form.services?.[i]?.price || ""}
                  onChange={e => {
                    const services = [...(form.services || [{},{},{},{},{},{}])];
                    services[i] = { ...services[i], price: e.target.value };
                    up("services", services);
                  }}
                  placeholder="Price e.g. $99"
                  style={{ padding:"7px 10px", border:"1px solid #e5e7eb", borderRadius:6, fontSize:12, fontFamily:"inherit", outline:"none" }}
                  onFocus={e => e.target.style.borderColor="#f97316"}
                  onBlur={e => e.target.style.borderColor="#e5e7eb"}
                />
              </div>
            ))}
          </div>
        )}

        {/* PRICING inputs */}
        {s.id === "pricing" && form.sections.includes("pricing") && (
          <div style={{ background:"#fafaf9", border:"1px solid #f3f4f6", borderRadius:8, padding:"12px", marginTop:4 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#374151", marginBottom:8, textTransform:"uppercase", letterSpacing:.5 }}>Pricing Tiers <span style={{ color:"#f97316" }}>*</span></div>
            <div style={{ fontSize:11, color:"#9ca3af", marginBottom:10 }}>Add at least 1 pricing tier or remove the Pricing section.</div>
            {[0,1,2].map(i => (
              <div key={i} style={{ background:"white", border:"1px solid #e5e7eb", borderRadius:8, padding:"10px", marginBottom:8 }}>
                <div style={{ fontSize:11, fontWeight:600, color:"#374151", marginBottom:6 }}>Tier {i+1}{i===0?" (Basic)":i===1?" (Standard — recommended)":"  (Premium)"}</div>
                <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:6, marginBottom:6 }}>
                  <input
                    value={form.pricingTiers?.[i]?.name || ""}
                    onChange={e => {
                      const tiers = [...(form.pricingTiers || [{},{},{}])];
                      tiers[i] = { ...tiers[i], name: e.target.value };
                      up("pricingTiers", tiers);
                    }}
                    placeholder={`Tier name e.g. ${i===0?"Basic":i===1?"Standard":"Premium"}`}
                    style={{ padding:"7px 10px", border:"1px solid #e5e7eb", borderRadius:6, fontSize:12, fontFamily:"inherit", outline:"none" }}
                    onFocus={e => e.target.style.borderColor="#f97316"}
                    onBlur={e => e.target.style.borderColor="#e5e7eb"}
                  />
                  <div style={{ display:"flex", gap:4 }}>
  <select value={form.pricingCurrency||"$"} onChange={e=>up("pricingCurrency",e.target.value)}
    style={{ padding:"7px 6px", border:"1px solid #e5e7eb", borderRadius:6, fontSize:12, fontFamily:"inherit", outline:"none", background:"white", cursor:"pointer" }}
    onFocus={e=>e.target.style.borderColor="#f97316"} onBlur={e=>e.target.style.borderColor="#e5e7eb"}>
    {["$","£","€","R","A$","C$","AED","SGD"].map(c=><option key={c}>{c}</option>)}
  </select>
  <input value={form.pricingTiers?.[i]?.price||""} onChange={e=>{const t=[...(form.pricingTiers||[{},{},{}])];t[i]={...t[i],price:e.target.value};up("pricingTiers",t);}}
    placeholder="e.g. 99"
    style={{ flex:1, padding:"7px 10px", border:"1px solid #e5e7eb", borderRadius:6, fontSize:12, fontFamily:"inherit", outline:"none" }}
    onFocus={e=>e.target.style.borderColor="#f97316"} onBlur={e=>e.target.style.borderColor="#e5e7eb"}/>
</div>
                </div>
                <input
                  value={form.pricingTiers?.[i]?.description || ""}
                  onChange={e => {
                    const tiers = [...(form.pricingTiers || [{},{},{}])];
                    tiers[i] = { ...tiers[i], description: e.target.value };
                    up("pricingTiers", tiers);
                  }}
                  placeholder="What's included e.g. Basic inspection, 30-day warranty"
                  style={{ width:"100%", padding:"7px 10px", border:"1px solid #e5e7eb", borderRadius:6, fontSize:12, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }}
                  onFocus={e => e.target.style.borderColor="#f97316"}
                  onBlur={e => e.target.style.borderColor="#e5e7eb"}
                />
              </div>
            ))}
          </div>
        )}

        {/* GALLERY inputs */}
        {s.id === "gallery" && form.sections.includes("gallery") && (
          <div style={{ background:"#fafaf9", border:"1px solid #f3f4f6", borderRadius:8, padding:"12px", marginTop:4 }}>
            <div style={{ fontSize:11, fontWeight:700, color:"#374151", marginBottom:8, textTransform:"uppercase", letterSpacing:.5 }}>Gallery Images (optional)</div>
            <div style={{ fontSize:11, color:"#9ca3af", marginBottom:10 }}>Upload your own photos. Leave blank to use AI-sourced industry photos.</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:8 }}>
              {[0,1,2,3,4,5].map(i => (
                <div key={i}>
                  {form.galleryImages?.[i] ? (
                    <div style={{ position:"relative", borderRadius:8, overflow:"hidden", height:72 }}>
                      <img src={form.galleryImages[i]} alt="" style={{ width:"100%", height:"100%", objectFit:"cover" }}/>
                      <button
                        onClick={() => {
                          const imgs = [...(form.galleryImages || [])];
                          imgs[i] = null;
                          up("galleryImages", imgs.filter(Boolean).length ? imgs : null);
                        }}
                        style={{ position:"absolute", top:3, right:3, width:18, height:18, background:"rgba(0,0,0,.6)", color:"white", border:"none", borderRadius:"50%", fontSize:10, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
                    </div>
                  ) : (
                    <label style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:72, border:"1.5px dashed #e5e7eb", borderRadius:8, cursor:"pointer", background:"white", fontSize:10, color:"#9ca3af", gap:4 }}
                      onMouseEnter={e => e.currentTarget.style.borderColor="#f97316"}
                      onMouseLeave={e => e.currentTarget.style.borderColor="#e5e7eb"}>
                      <span style={{ fontSize:18 }}>+</span>
                      Photo {i+1}
                      <input type="file" accept="image/*" style={{ display:"none" }} onChange={e => {
                        const file = e.target.files[0];
                        if (!file) return;
                        if (file.size > 2000000) { toast("Image must be under 2MB", "error"); return; }
                        const reader = new FileReader();
                        reader.onload = ev => {
                          const imgs = [...(form.galleryImages || [null,null,null,null,null,null])];
                          imgs[i] = ev.target.result;
                          up("galleryImages", imgs);
                        };
                        reader.readAsDataURL(file);
                      }}/>
                    </label>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    ))}
  </div>
)}
      </div>

      {/* CTA */}
      <div style={{ padding:"14px 22px", borderTop:"1px solid #f3f4f6", background:"white" }}>
        <button onClick={onNext} disabled={!ready}
          style={{ width:"100%", padding:"13px", background:ready?"#f97316":"#e5e7eb", color:ready?"white":"#9ca3af", border:"none", borderRadius:10, fontSize:14, fontWeight:700, cursor:ready?"pointer":"not-allowed", fontFamily:"inherit", display:"flex", alignItems:"center", justifyContent:"center", gap:8, transition:"all .2s", animation:ready?"glow 3s ease-in-out infinite":"none" }}>
          <span>✦</span> {ready ? (user && credits > 0 ? "Generate My Page →" : "See Pricing & Continue →") : "Fill in required fields first"}
        </button>
        {!ready && (
          <div style={{ marginTop:7, fontSize:11, color:"#f97316", textAlign:"center" }}>
            Missing: {[!form.name&&"Name", !form.industry&&"Industry", !form.description&&"Description"].filter(Boolean).join(", ")}
          </div>
        )}
        <div style={{ marginTop:9, display:"flex", justifyContent:"center", gap:14, fontSize:10, color:"#9ca3af" }}>
          <span>✓ Real photos included</span><span>✓ SEO optimised</span><span>✓ Mobile ready</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   PRICING WALL
───────────────────────────────────────────────────────────────────────────── */
function PricingWall({ form, onBack, onPurchase }) {
  const pal = PALETTES.find(p => p.id === form.palette) || PALETTES[0];
  return (
    <div style={{ minHeight:"100vh", background:"#fafaf9", fontFamily:"'Geist',sans-serif" }}>
      <GS/>
      <div style={{ height:52, background:"white", borderBottom:"1px solid #f3f4f6", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 24px", position:"sticky", top:0, zIndex:10 }}>
        <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:6, background:"transparent", border:"none", cursor:"pointer", fontSize:13, color:"#6b7280", fontFamily:"inherit" }}>← Back to builder</button>
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          <div style={{ width:24, height:24, background:"#f97316", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:"white", fontWeight:800 }}>S</div>
          <span style={{ fontSize:14, fontWeight:800, color:"#111827" }}>Sitefliq</span>
        </div>
        <div style={{ width:100 }}/>
      </div>
      <div style={{ maxWidth:900, margin:"0 auto", padding:"40px 24px 60px" }}>
        {/* Page summary */}
        <div style={{ background:"white", border:"1px solid #f3f4f6", borderRadius:16, padding:"20px 24px", marginBottom:36, display:"flex", alignItems:"center", gap:16, boxShadow:"0 1px 4px rgba(0,0,0,.04)" }}>
          <div style={{ width:48, height:48, background:`linear-gradient(135deg,${pal.bg},${pal.surface})`, borderRadius:10, border:`2px solid ${pal.accent}33`, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <span style={{ fontSize:20, color:pal.accent }}>✦</span>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:16, fontWeight:800, color:"#111827", marginBottom:2 }}>{form.name}</div>
            <div style={{ fontSize:12, color:"#6b7280" }}>{form.industry} · {form.sections.length} sections · {form.palette} palette</div>
          </div>
          <div style={{ display:"flex", gap:12, fontSize:11 }}>
            {["SEO Ready","Mobile","Niche Copy"].map(t => (
              <div key={t} style={{ display:"flex", alignItems:"center", gap:4, color:"#16a34a" }}>
                <span style={{ fontWeight:700 }}>✓</span>{t}
              </div>
            ))}
          </div>
        </div>
        <div style={{ textAlign:"center", marginBottom:36 }}>
          <div style={{ fontSize:11, fontWeight:700, color:"#f97316", letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>ONE LAST STEP</div>
          <h1 style={{ fontSize:"clamp(26px,4vw,40px)", fontWeight:800, color:"#111827", marginBottom:10, fontFamily:"'Instrument Serif',serif", fontStyle:"italic" }}>Your page is ready to generate</h1>
          <p style={{ fontSize:15, color:"#6b7280", maxWidth:480, margin:"0 auto", lineHeight:1.7 }}>
            Choose a plan to generate and download your <strong style={{ color:"#111827" }}>{form.name}</strong> landing page.
          </p>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:18, marginBottom:36 }}>
          {PLANS.map(plan => (
            <div key={plan.id} style={{ background:"white", borderRadius:16, padding:"28px 24px", position:"relative", border:plan.badge?`2px solid ${plan.color}`:"1px solid #e5e7eb", boxShadow:plan.badge?`0 4px 30px ${plan.color}18`:"0 1px 3px rgba(0,0,0,.04)", transition:"transform .2s,box-shadow .2s" }}
              onMouseEnter={e => { e.currentTarget.style.transform="translateY(-3px)"; e.currentTarget.style.boxShadow=plan.badge?`0 8px 40px ${plan.color}28`:"0 8px 24px rgba(0,0,0,.08)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow=plan.badge?`0 4px 30px ${plan.color}18`:"0 1px 3px rgba(0,0,0,.04)"; }}>
              {plan.badge && <div style={{ position:"absolute", top:-12, left:"50%", transform:"translateX(-50%)", background:plan.color, color:"white", padding:"3px 14px", borderRadius:100, fontSize:9, fontWeight:800, letterSpacing:1.5, whiteSpace:"nowrap" }}>{plan.badge}</div>}
              <div style={{ fontSize:10, fontWeight:700, color:plan.color, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>{plan.name}</div>
              <div style={{ background:`${plan.color}10`, border:`1px solid ${plan.color}30`, borderRadius:10, padding:"14px 16px", marginBottom:14, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div>
                  <div style={{ fontSize:11, color:plan.color, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:2 }}>Credits</div>
                  <div style={{ fontSize:36, fontWeight:800, color:"#111827", lineHeight:1, fontFamily:"'Instrument Serif',serif" }}>{plan.credits}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:11, color:"#9ca3af", marginBottom:2 }}>per page</div>
                  <div style={{ fontSize:16, fontWeight:700, color:plan.color }}>{plan.perPage}</div>
                </div>
              </div>
              <div style={{ marginBottom:4, display:"flex", alignItems:"baseline", gap:6 }}>
                <span style={{ fontSize:38, fontWeight:800, color:"#111827", fontFamily:"'Instrument Serif',serif" }}>{plan.price}</span>
                <span style={{ fontSize:12, color:"#9ca3af" }}>one-time · no subscription</span>
              </div>
              <div style={{ fontSize:11, color:"#6b7280", marginBottom:16 }}>{plan.desc}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:7, marginBottom:20 }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display:"flex", gap:8, fontSize:12, color:"#374151", alignItems:"flex-start" }}>
                    <span style={{ color:plan.color, flexShrink:0, fontWeight:700 }}>✓</span>{f}
                  </div>
                ))}
              </div>
              <button onClick={() => onPurchase(plan)} style={{ width:"100%", padding:"12px", borderRadius:10, fontFamily:"'Geist',sans-serif", fontSize:13, fontWeight:700, cursor:"pointer", background:plan.badge?plan.color:"transparent", border:plan.badge?"none":`2px solid ${plan.color}`, color:plan.badge?"white":plan.color, transition:"all .2s" }}>
                Get {plan.credits} Credits →
              </button>
            </div>
          ))}
        </div>
        <div style={{ display:"flex", justifyContent:"center", gap:32, fontSize:12, color:"#9ca3af", flexWrap:"wrap" }}>
          {["🔒 Secure checkout via Paddle","⚡ 1 credit = 1 full landing page","💾 Credits never expire","↩ 14-day money back guarantee"].map(t => <span key={t}>{t}</span>)}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   GENERATING SCREEN
───────────────────────────────────────────────────────────────────────────── */
function GeneratingScreen({ form, onDone, onError }) {
  const [pct, setPct] = useState(0);
  const [stage, setStage] = useState(0);
  const [imgStatus, setImgStatus] = useState("Sourcing photos…");

  const stageLabels = [
    "Reading your business details…",
    "Choosing palette & typography…",
    "Writing niche-specific copy…",
    "Sourcing industry photos…",
    "Building all sections…",
    "Adding SEO & conversion elements…",
    "Finalising your page…",
  ];

  useEffect(() => {
    let cancelled = false;
    let p = 0;
    const iv = setInterval(() => {
      p = Math.min(p + Math.random() * 2.5 + 0.5, 91);
      setPct(Math.floor(p));
      setStage(Math.min(Math.floor(p / 100 * (stageLabels.length - 1)), stageLabels.length - 1));
    }, 800);

    const queries = getSectionKeywords(form.industry);
    const fetchImg = (q) =>
      fetch(`/api/images?query=${encodeURIComponent(q)}`)
        .then(r => r.ok ? r.text() : null)
        .then(text => {
          if (!text) return null;
          try {
            const d = JSON.parse(text);
            if (d.photos?.length) {
              const pick = d.photos[Math.floor(Math.random() * Math.min(5, d.photos.length))];
              return pick.src.large2x || pick.src.large;
            }
          } catch {}
          return null;
        })
        .catch(() => null);

    Promise.all(queries.map(q => fetchImg(q)))
      .then(images => {
        const valid = images.filter(Boolean);
        if (!cancelled) setImgStatus(valid.length > 0 ? `Found ${valid.length} photos ✓` : "Using styled design…");
        return fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type":"application/json" },
          body: JSON.stringify({
            model: "claude-sonnet-4-20250514",
            max_tokens: 16000,
            messages: [{ role:"user", content:buildPrompt(form, valid) }],
          }),
        });
      })
      .then(async r => {
        if (!r.ok) throw new Error(`API ${r.status}`);
        const reader = r.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream:true });
          for (const line of chunk.split("\n")) {
            if (line.startsWith("data: ") && line.slice(6) !== "[DONE]") {
              try {
                const parsed = JSON.parse(line.slice(6));
                if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                  fullText += parsed.delta.text;
                }
              } catch {}
            }
          }
        }
        return { content:[{ type:"text", text:fullText }] };
      })
      .then(data => {
        if (cancelled) return;
        clearInterval(iv); setPct(100);
        let raw = (data.content || []).filter(b => b.type==="text").map(b => b.text).join("");
        let html = raw.trim();
        const idx = html.search(/<(!DOCTYPE|html)/i);
        if (idx > 0) html = html.slice(idx);
        const end = html.lastIndexOf("</html>");
        if (end !== -1) html = html.slice(0, end + 7);
        if (form.logo) html = html.replace(/__LOGO__/g, form.logo);
        if (!html.toLowerCase().includes("<!doctype")) throw new Error("Invalid HTML received. Please try again.");
        setTimeout(() => onDone(html), 400);
      })
      .catch(e => {
        if (!cancelled) { clearInterval(iv); onError(e.message); }
      });

    return () => { cancelled = true; clearInterval(iv); };
  }, []);

  return (
    <div style={{ height:"100%", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"white", padding:40, textAlign:"center" }}>
      <div style={{ position:"relative", width:80, height:80, marginBottom:28 }}>
        <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:"1px solid #f3f4f6" }}/>
        <div style={{ position:"absolute", inset:0, borderRadius:"50%", border:"3px solid transparent", borderTopColor:"#f97316", animation:"spin .8s linear infinite" }}/>
        <div style={{ position:"absolute", inset:10, borderRadius:"50%", border:"2px solid transparent", borderTopColor:"#f9731640", animation:"spin 1.5s linear infinite reverse" }}/>
        <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>✦</div>
      </div>
      <div style={{ fontSize:18, fontWeight:700, color:"#111827", marginBottom:6, minHeight:28 }}>{stageLabels[stage]}</div>
      {stage === 3 && <div style={{ fontSize:12, color:"#f97316", marginBottom:8, fontWeight:600 }}>{imgStatus}</div>}
      <div style={{ fontSize:13, color:"#6b7280", marginBottom:28, maxWidth:300, lineHeight:1.6 }}>
        Building your SEO-optimised page for <strong style={{ color:"#f97316" }}>{form.name}</strong>
      </div>
      <div style={{ width:"100%", maxWidth:360, marginBottom:20 }}>
        <div style={{ height:4, background:"#f3f4f6", borderRadius:2, overflow:"hidden" }}>
          <div style={{ height:"100%", background:"linear-gradient(90deg,#f97316,#fb923c)", borderRadius:2, width:`${pct}%`, transition:"width .8s ease" }}/>
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", marginTop:6, fontSize:11, color:"#9ca3af" }}>
          <span>{stageLabels[stage]}</span><span>{pct}%</span>
        </div>
      </div>
      <div style={{ padding:"14px 20px", background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:12 }}>
        <div style={{ fontSize:10, color:"#f97316", letterSpacing:1.5, textTransform:"uppercase", marginBottom:4 }}>Generating for</div>
        <div style={{ fontSize:17, fontWeight:800, color:"#111827", marginBottom:2 }}>{form.name}</div>
        <div style={{ fontSize:12, color:"#ea580c" }}>{form.industry}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   RESULT SCREEN — left panel
───────────────────────────────────────────────────────────────────────────── */
function ResultScreen({ html, form, onReset, onBuyMoreCredits }) {
  const [blobUrl, setBlobUrl] = useState(null);
  const [copied, setCopied] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishedUrl, setPublishedUrl] = useState(null);
  const [publishErr, setPublishErr] = useState(null);
  const [urlCopied, setUrlCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    const b = new Blob([html], { type:"text/html" });
    const u = URL.createObjectURL(b);
    setBlobUrl(u);
    setTimeout(() => setShowConfetti(false), 4000);
    return () => URL.revokeObjectURL(u);
  }, [html]);

  const open = () => {
    const blob = new Blob([html], { type:"text/html" });
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  };

  const dl = () => {
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = `${form.name.replace(/\s+/g,"-").toLowerCase()}-landing-page.html`;
    a.click();
    toast("HTML downloaded!", "success");
  };

  const copy = () => navigator.clipboard.writeText(html).then(() => {
    setCopied(true);
    toast("HTML copied to clipboard!", "success");
    setTimeout(() => setCopied(false), 2500);
  });

  const publish = async () => {
    setPublishing(true); setPublishErr(null);
    try {
      const r = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type":"application/json" },
        body: JSON.stringify({ html, name:form.name }),
      });
      const d = await r.json();
      if (!r.ok || d.error) {
        setPublishErr(d.error || "Publish failed. Please try again.");
        toast("Publish failed — please try again", "error");
      } else {
        setPublishedUrl(d.url);
        toast("🚀 Page is live!", "success");
      }
    } catch {
      setPublishErr("Network error. Please try again.");
      toast("Network error", "error");
    }
    setPublishing(false);
  };

  const copyUrl = () => navigator.clipboard.writeText(publishedUrl).then(() => {
    setUrlCopied(true);
    toast("URL copied!", "success");
    setTimeout(() => setUrlCopied(false), 2500);
  });

  const shareTwitter = () => {
    if (!publishedUrl) return;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Just built my landing page in 60 seconds with @sitefliq ⚡\n${publishedUrl}`)}`, "_blank");
  };

  const shareLinkedIn = () => {
    if (!publishedUrl) return;
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(publishedUrl)}`, "_blank");
  };

  return (
    <>
      <ConfettiBurst active={showConfetti}/>
      <div style={{ height:"100%", display:"flex", flexDirection:"column", background:"white" }}>
        <div style={{ padding:"18px 22px", borderBottom:"1px solid #f3f4f6", overflowY:"auto", flex:1 }}>
          {/* Success header */}
          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:16, padding:"12px 14px", background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:12 }}>
            <div style={{ width:34, height:34, borderRadius:"50%", background:"#dcfce7", border:"2px solid #86efac", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>✓</div>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:"#111827" }}>Your page is ready!</div>
              <div style={{ fontSize:11, color:"#6b7280" }}>{html.length.toLocaleString()} chars · {form.sections.length} sections</div>
            </div>
          </div>

          <button onClick={open} style={{ width:"100%", padding:"10px", background:"white", color:"#374151", border:"1px solid #e5e7eb", borderRadius:9, fontSize:13, fontWeight:600, cursor:"pointer", marginBottom:8, display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:"inherit" }}>
            🔗 Open in New Tab
          </button>

          {/* Publish */}
          {!publishedUrl ? (
            <button onClick={publish} disabled={publishing} style={{ width:"100%", padding:"12px", background:publishing?"#e5e7eb":"#111827", color:publishing?"#9ca3af":"white", border:"none", borderRadius:9, fontSize:14, fontWeight:700, cursor:publishing?"not-allowed":"pointer", marginBottom:8, display:"flex", alignItems:"center", justifyContent:"center", gap:8, fontFamily:"inherit", transition:"all .2s" }}>
              {publishing ? <><span style={{ width:14, height:14, border:"2px solid #9ca3af", borderTopColor:"transparent", borderRadius:"50%", animation:"spin .7s linear infinite", display:"inline-block" }}/> Publishing…</> : "🚀 Publish Live"}
            </button>
          ) : (
            <div style={{ background:"#f0fdf4", border:"1px solid #86efac", borderRadius:9, padding:"12px 14px", marginBottom:8 }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#16a34a", marginBottom:6 }}>✓ Live at:</div>
              <div style={{ display:"flex", gap:6, alignItems:"center", marginBottom:10 }}>
                <a href={publishedUrl} target="_blank" rel="noreferrer" style={{ fontSize:11, color:"#0369a1", flex:1, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", textDecoration:"none", fontWeight:600 }}>{publishedUrl}</a>
                <button onClick={copyUrl} style={{ padding:"4px 10px", background:"white", border:"1px solid #86efac", borderRadius:6, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", color:urlCopied?"#16a34a":"#374151", whiteSpace:"nowrap" }}>{urlCopied?"✓ Copied":"Copy"}</button>
                <button onClick={() => window.open(publishedUrl,"_blank")} style={{ padding:"4px 10px", background:"#16a34a", border:"none", borderRadius:6, fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit", color:"white", whiteSpace:"nowrap" }}>Open</button>
              </div>
              {/* Share buttons */}
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={shareTwitter} style={{ flex:1, padding:"6px", background:"#000", color:"white", border:"none", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>𝕏 Share</button>
                <button onClick={shareLinkedIn} style={{ flex:1, padding:"6px", background:"#0077b5", color:"white", border:"none", borderRadius:6, fontSize:11, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>in Share</button>
              </div>
            </div>
          )}
          {publishErr && <div style={{ fontSize:11, color:"#dc2626", marginBottom:8, textAlign:"center" }}>{publishErr}</div>}

          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
            <button onClick={dl} style={{ padding:"9px", background:"white", color:"#374151", border:"1px solid #e5e7eb", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>↓ Download HTML</button>
            <button onClick={copy} style={{ padding:"9px", background:"white", color:copied?"#16a34a":"#374151", border:`1px solid ${copied?"#86efac":"#e5e7eb"}`, borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer", fontFamily:"inherit" }}>{copied?"✓ Copied!":"{ } Copy Code"}</button>
          </div>

          {/* Buy more credits */}
          <button onClick={onBuyMoreCredits} style={{ width:"100%", padding:"10px", background:"#fff7ed", color:"#f97316", border:"1px solid #fed7aa", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit", marginBottom:14 }}>
            ⚡ Buy More Credits
          </button>

          {/* Included features */}
          <div style={{ display:"flex", flexDirection:"column", gap:6, marginBottom:16 }}>
            {[["🔍","SEO + Schema Markup"],["🎯","5+ Conversion CTAs"],["📱","Mobile Responsive"],["🖼️",`Real photos for ${form.industry}`],["✍️","Niche-specific copy"]].map(([ic,t]) => (
              <div key={t} style={{ display:"flex", gap:9, padding:"7px 10px", background:"#f9fafb", borderRadius:7, fontSize:12, color:"#374151", alignItems:"center" }}>
                <span>{ic}</span><span>{t}</span>
              </div>
            ))}
          </div>

          <button onClick={onReset} style={{ width:"100%", padding:"10px", background:"white", color:"#374151", border:"1px solid #e5e7eb", borderRadius:8, fontSize:13, fontWeight:500, cursor:"pointer", fontFamily:"inherit" }}>
            ← Build Another Page
          </button>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   AUTH MODAL
───────────────────────────────────────────────────────────────────────────── */
function AuthModal({ mode = "signin", onSuccess, onClose }) {
  const [tab, setTab] = useState(mode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [forgot, setForgot] = useState(false);

  const handle = async () => {
    setErr(""); setMsg(""); setLoading(true);
    try {
      if (forgot) {
        const r = await sb.resetPassword(email);
        if (!r.ok) setErr("Could not send reset email. Please check the address.");
        else setMsg("Reset email sent! Check your inbox.");
      } else if (tab === "signup") {
        const r = await sb.signUp(email, password);
        if (!r.ok) setErr(r.data?.msg || r.data?.error_description || "Sign up failed");
        else { setMsg("Check your email to confirm your account, then sign in!"); setTab("signin"); }
      } else {
        const r = await sb.signIn(email, password);
        if (!r.ok) setErr(r.data?.error_description || "Invalid email or password");
        else { toast("Welcome back!", "success"); onSuccess?.(); }
      }
    } catch { setErr("Network error. Please try again."); }
    setLoading(false);
  };

  const inp = { width:"100%", padding:"10px 12px", border:"1px solid #e5e7eb", borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }}>
      <div style={{ background:"white", borderRadius:16, padding:36, width:"100%", maxWidth:400, position:"relative", animation:"popIn .25s ease" }}>
        <button onClick={onClose} style={{ position:"absolute", top:16, right:16, background:"none", border:"none", fontSize:20, cursor:"pointer", color:"#9ca3af" }}>×</button>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:28, fontWeight:800, color:"#111827", marginBottom:4 }}>
            {forgot ? "Reset Password" : tab==="signin" ? "Welcome back" : "Create account"}
          </div>
          <p style={{ fontSize:13, color:"#6b7280" }}>
            {forgot ? "Enter your email for a reset link" : tab==="signin" ? "Sign in to access your credits" : "Start building landing pages with AI"}
          </p>
        </div>
        {!forgot && (
          <div style={{ display:"flex", gap:0, marginBottom:24, background:"#f3f4f6", borderRadius:8, padding:3 }}>
            {["signin","signup"].map(t => (
              <button key={t} onClick={() => { setTab(t); setErr(""); setMsg(""); }} style={{ flex:1, padding:"8px 0", border:"none", borderRadius:6, fontSize:13, fontWeight:600, cursor:"pointer", background:tab===t?"white":"transparent", color:tab===t?"#111827":"#6b7280", boxShadow:tab===t?"0 1px 3px rgba(0,0,0,.1)":"none", transition:"all .15s" }}>
                {t==="signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>
        )}
        {err && <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#dc2626", marginBottom:16 }}>{err}</div>}
        {msg && <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#16a34a", marginBottom:16 }}>{msg}</div>}
        <form onSubmit={e => { e.preventDefault(); handle(); }} autoComplete="on">
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:5 }}>EMAIL</label>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" name="email" autoComplete="email" placeholder="you@example.com" style={inp}/>
          </div>
          {!forgot && (
            <div style={{ marginBottom:8 }}>
              <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:5 }}>PASSWORD</label>
              <input value={password} onChange={e => setPassword(e.target.value)} type="password" name={tab==="signin"?"current-password":"new-password"} autoComplete={tab==="signin"?"current-password":"new-password"} placeholder="••••••••" style={inp}/>
            </div>
          )}
          {tab==="signin" && !forgot && (
            <div style={{ textAlign:"right", marginBottom:16 }}>
              <button type="button" onClick={() => { setForgot(true); setErr(""); setMsg(""); }} style={{ background:"none", border:"none", fontSize:12, color:"#f97316", cursor:"pointer", fontFamily:"inherit", padding:0 }}>Forgot password?</button>
            </div>
          )}
          <button type="submit" disabled={loading || !email || (!forgot && !password)}
            style={{ width:"100%", padding:"13px", background:loading||!email||(!forgot&&!password)?"#e5e7eb":"#f97316", color:loading||!email||(!forgot&&!password)?"#9ca3af":"white", border:"none", borderRadius:10, fontSize:15, fontWeight:700, cursor:"pointer", transition:"background .15s", marginBottom:12, fontFamily:"inherit" }}>
            {loading ? "Please wait…" : forgot ? "Send Reset Email →" : tab==="signin" ? "Sign In →" : "Create Account →"}
          </button>
        </form>
        {forgot && <button onClick={() => { setForgot(false); setErr(""); setMsg(""); }} style={{ width:"100%", padding:"10px", background:"none", border:"1px solid #e5e7eb", borderRadius:10, fontSize:13, color:"#6b7280", cursor:"pointer", fontFamily:"inherit" }}>← Back to Sign In</button>}
        <p style={{ textAlign:"center", marginTop:12, fontSize:12, color:"#9ca3af" }}>🔒 Secure · Your data is never shared</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   RESET PASSWORD MODAL
───────────────────────────────────────────────────────────────────────────── */
function ResetPasswordModal({ token, onDone }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [done, setDone] = useState(false);

  const handle = async () => {
    if (password.length < 6) { setErr("Password must be at least 6 characters."); return; }
    if (password !== confirm) { setErr("Passwords don't match."); return; }
    setLoading(true); setErr("");
    const r = await sb.updatePassword(token, password);
    if (r.ok) { setDone(true); toast("Password updated!", "success"); setTimeout(onDone, 2000); }
    else setErr("Failed to update password. Please request a new reset link.");
    setLoading(false);
  };

  const inp = { width:"100%", padding:"10px 12px", border:"1px solid #e5e7eb", borderRadius:8, fontSize:14, outline:"none", boxSizing:"border-box", fontFamily:"inherit" };

  return (
    <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:9999 }}>
      <div style={{ background:"white", borderRadius:16, padding:36, width:"100%", maxWidth:400, position:"relative" }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:28, fontWeight:800, color:"#111827", marginBottom:4 }}>Set New Password</div>
          <p style={{ fontSize:13, color:"#6b7280" }}>Choose a strong password for your account</p>
        </div>
        {done ? (
          <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:8, padding:"16px", textAlign:"center", fontSize:14, color:"#16a34a", fontWeight:600 }}>
            ✓ Password updated! Redirecting…
          </div>
        ) : (
          <form onSubmit={e => { e.preventDefault(); handle(); }}>
            {err && <div style={{ background:"#fef2f2", border:"1px solid #fecaca", borderRadius:8, padding:"10px 14px", fontSize:13, color:"#dc2626", marginBottom:16 }}>{err}</div>}
            <div style={{ marginBottom:14 }}>
              <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:5 }}>NEW PASSWORD</label>
              <input value={password} onChange={e => setPassword(e.target.value)} type="password" autoComplete="new-password" placeholder="Min. 6 characters" style={inp}/>
            </div>
            <div style={{ marginBottom:20 }}>
              <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:5 }}>CONFIRM PASSWORD</label>
              <input value={confirm} onChange={e => setConfirm(e.target.value)} type="password" autoComplete="new-password" placeholder="Repeat password" style={inp}/>
            </div>
            <button type="submit" disabled={loading || !password || !confirm}
              style={{ width:"100%", padding:"13px", background:loading||!password||!confirm?"#e5e7eb":"#f97316", color:loading||!password||!confirm?"#9ca3af":"white", border:"none", borderRadius:10, fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"inherit" }}>
              {loading ? "Updating…" : "Set New Password →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   HOME PAGE
───────────────────────────────────────────────────────────────────────────── */
function HomePage({ onBuild, onPricing, onExample, onHelp, user, credits, onSignIn, onSignOut }) {
  const [showExitIntent, setShowExitIntent] = useState(false);

  useEffect(() => {
    let shown = false;
    let timer = null;
    const handleMouseLeave = (e) => {
      if (e.clientY <= 5 && !shown && !sessionStorage.getItem("sf_exit_shown")) {
        shown = true;
        clearTimeout(timer);
        timer = setTimeout(() => setShowExitIntent(true), 0);
      }
    };
    // Only show after 5s on page
    setTimeout(() => {
      document.addEventListener("mouseleave", handleMouseLeave);
    }, 5000);
    return () => {
      document.removeEventListener("mouseleave", handleMouseLeave);
      clearTimeout(timer);
    };
  }, []);

  const closeExit = () => {
    setShowExitIntent(false);
    sessionStorage.setItem("sf_exit_shown", "1");
  };

  return (
    <div style={{ minHeight:"100vh", background:"#fafaf9", color:"#111827" }}>
      <GS/>
      {showExitIntent && <ExitIntentPopup onClose={closeExit} onBuild={() => { closeExit(); onBuild(); }}/>}

      {/* Nav */}
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, height:56, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 48px", background:"rgba(250,250,249,.92)", backdropFilter:"blur(20px)", borderBottom:"1px solid #e5e7eb" }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:28, height:28, background:"#f97316", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color:"white", fontWeight:800 }}>S</div>
          <span style={{ fontSize:18, fontWeight:800, color:"#111827" }}>Sitefliq</span>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button onClick={onPricing} style={{ padding:"7px 16px", background:"transparent", border:"1px solid #e5e7eb", borderRadius:8, fontSize:13, cursor:"pointer", color:"#374151", fontFamily:"inherit", fontWeight:500 }}>Pricing</button>
          <button onClick={onExample} style={{ padding:"7px 16px", background:"transparent", border:"1px solid #e5e7eb", borderRadius:8, fontSize:13, cursor:"pointer", color:"#374151", fontFamily:"inherit", fontWeight:500 }}>See Example</button>
          <button onClick={onHelp} style={{ padding:"7px 16px", background:"transparent", border:"1px solid #e5e7eb", borderRadius:8, fontSize:13, cursor:"pointer", color:"#6b7280", fontFamily:"inherit", fontWeight:500 }}>🛟 Help</button>
          {user ? (
            <>
              <span style={{ padding:"7px 14px", background:"#fff7ed", color:credits <= 1 ? "#dc2626" : "#f97316", border:`1px solid ${credits <= 1 ? "#fecaca" : "#fed7aa"}`, borderRadius:8, fontSize:13, fontWeight:700 }}>⚡ {credits} credits</span>
              <button onClick={onSignOut} style={{ padding:"7px 16px", background:"transparent", border:"1px solid #e5e7eb", borderRadius:8, fontSize:13, cursor:"pointer", color:"#6b7280", fontFamily:"inherit" }}>Sign out</button>
            </>
          ) : (
            <button onClick={onSignIn} style={{ padding:"7px 16px", background:"transparent", border:"1px solid #e5e7eb", borderRadius:8, fontSize:13, cursor:"pointer", color:"#374151", fontFamily:"inherit", fontWeight:500 }}>Sign In</button>
          )}
          <button onClick={onBuild} style={{ padding:"8px 20px", background:"#f97316", border:"none", borderRadius:8, fontSize:13, cursor:"pointer", color:"white", fontFamily:"inherit", fontWeight:700 }}>Start Building →</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{ minHeight:"100vh", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", textAlign:"center", padding:"100px 40px 80px", background:"linear-gradient(180deg,#fff7ed 0%,#fafaf9 55%)" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"5px 14px", background:"#fff7ed", border:"1px solid #fed7aa", borderRadius:100, marginBottom:22, animation:"fadeUp .6s ease" }}>
          <div style={{ width:6, height:6, borderRadius:"50%", background:"#f97316", animation:"pulse 2s infinite" }}/>
          <span style={{ fontSize:10, color:"#f97316", fontWeight:700, letterSpacing:1.5 }}>AI LANDING PAGE BUILDER</span>
        </div>
        <h1 style={{ fontSize:"clamp(40px,6vw,74px)", fontWeight:800, lineHeight:1.0, marginBottom:20, color:"#111827", letterSpacing:"-2px", maxWidth:820, animation:"fadeUp .6s .1s ease both" }}>
          Build websites.{" "}
          <span style={{ fontFamily:"'Instrument Serif',serif", fontStyle:"italic" }}>
            <TW words={["Get paid.", "Get clients.", "Get noticed.", "Grow faster."]} color="#f97316"/>
          </span>
        </h1>
        <p style={{ fontSize:17, color:"#6b7280", maxWidth:500, margin:"0 auto 36px", lineHeight:1.8, animation:"fadeUp .6s .2s ease both" }}>
          Describe your business. AI writes niche-specific copy, builds full SEO meta tags, and delivers a stunning landing page in 60 seconds.
        </p>
        <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap", marginBottom:14, animation:"fadeUp .6s .3s ease both" }}>
          <button onClick={onBuild} style={{ padding:"14px 34px", background:"#f97316", color:"white", border:"none", borderRadius:10, fontSize:16, fontWeight:700, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 20px #f9731640" }}>
            Start Building for Free →
          </button>
          <button onClick={onExample} style={{ padding:"14px 22px", background:"white", color:"#374151", border:"1px solid #e5e7eb", borderRadius:10, fontSize:14, cursor:"pointer", fontFamily:"inherit" }}>
            👁 See Example
          </button>
        </div>
        <div style={{ fontSize:12, color:"#9ca3af", animation:"fadeUp .6s .4s ease both" }}>No credit card to preview · Pay only when you're ready to download</div>

        {/* Animated stats */}
        <div style={{ display:"flex", gap:40, marginTop:48, animation:"fadeUp .6s .5s ease both" }}>
          {[{ target:500, suffix:"+", label:"Pages generated", icon:"⚡" }, { target:60, suffix:"s", label:"Average build time", icon:"⏱" }, { target:49, prefix:"$", suffix:"", label:"Per 10 credits", icon:"💰" }].map(s => (
            <div key={s.label} style={{ textAlign:"center" }}>
              <div style={{ fontSize:18, marginBottom:3 }}>{s.icon}</div>
              <div style={{ fontSize:22, fontWeight:800, color:"#111827" }}>
                <AnimatedCounter target={s.target} suffix={s.suffix} prefix={s.prefix||""}/>
              </div>
              <div style={{ fontSize:11, color:"#9ca3af" }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ticker */}
      <div style={{ overflow:"hidden", borderTop:"1px solid #e5e7eb", borderBottom:"1px solid #e5e7eb", padding:"12px 0", background:"white" }}>
        <div style={{ display:"flex", gap:40, animation:"ticker 24s linear infinite", width:"max-content" }}>
          {[...Array(2)].map((_, r) =>
            ["Yoga Studios","Gyms","Salons","Restaurants","Photographers","Coaches","Real Estate","Boutiques","Clinics","Cafes","Freelancers","Agencies"].map((l, i) => (
              <span key={`${r}-${i}`} style={{ fontSize:12, color:"#9ca3af", whiteSpace:"nowrap" }}>
                <span style={{ color:"#f97316", marginRight:7 }}>✦</span>{l}
              </span>
            ))
          )}
        </div>
      </div>

      {/* How it works */}
      <div style={{ maxWidth:920, margin:"80px auto", padding:"0 40px" }}>
        <div style={{ textAlign:"center", marginBottom:44 }}>
          <div style={{ fontSize:10, color:"#f97316", letterSpacing:3, textTransform:"uppercase", fontWeight:700, marginBottom:10 }}>HOW IT WORKS</div>
          <h2 style={{ fontSize:"clamp(26px,4vw,42px)", fontWeight:800, color:"#111827" }}>From idea to live in minutes</h2>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16 }}>
          {[
            { n:"01", ic:"📝", t:"Describe it",   d:"Tell us your business name, industry and description." },
            { n:"02", ic:"🎨", t:"Choose style",  d:"Pick colours, vibe and which sections to include." },
            { n:"03", ic:"💳", t:"Choose a plan", d:"Pay once. No subscriptions. Credits never expire." },
            { n:"04", ic:"⚡", t:"Get your page", d:"AI generates. You download. Go live today." },
          ].map(s => (
            <div key={s.n} style={{ padding:22, borderRadius:14, background:"white", border:"1px solid #f3f4f6", boxShadow:"0 1px 3px rgba(0,0,0,.04)" }}>
              <div style={{ width:32, height:32, background:"#fff7ed", borderRadius:8, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, marginBottom:12 }}>{s.ic}</div>
              <div style={{ fontSize:10, fontWeight:700, color:"#f97316", letterSpacing:1, marginBottom:6 }}>{s.n}</div>
              <div style={{ fontSize:14, fontWeight:700, color:"#111827", marginBottom:5 }}>{s.t}</div>
              <div style={{ fontSize:12, color:"#6b7280", lineHeight:1.6 }}>{s.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews */}
      <div style={{ background:"white", borderTop:"1px solid #f3f4f6", borderBottom:"1px solid #f3f4f6", padding:"60px 40px" }}>
        <div style={{ maxWidth:920, margin:"0 auto" }}>
          <h2 style={{ fontSize:32, fontWeight:800, color:"#111827", textAlign:"center", marginBottom:36 }}>Loved by business owners</h2>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:16 }}>
            {[
              { q:"My yoga studio page was live in 4 minutes. The AI wrote better copy than any agency I've used. Worth every cent.", n:"Ashley M.", r:"Yoga Studio · Austin, TX" },
              { q:"Was quoted $2,500 by a web designer. Sitefliq did it better for $49. The SEO is already bringing traffic.", n:"James T.", r:"Personal Trainer · Chicago, IL" },
              { q:"I described my pilates studio and it built me an entire professional website. Downloaded it, uploaded to Netlify — live same day.", n:"Jessica R.", r:"Pilates Studio · Brooklyn, NY" },
            ].map((t, i) => (
              <div key={i} style={{ padding:22, borderRadius:14, background:"#fafaf9", border:"1px solid #f3f4f6" }}>
                <div style={{ color:"#f97316", fontSize:12, marginBottom:10, letterSpacing:2 }}>★★★★★</div>
                <p style={{ fontSize:13, color:"#374151", lineHeight:1.75, marginBottom:16, fontStyle:"italic" }}>"{t.q}"</p>
                <div style={{ fontSize:13, fontWeight:600, color:"#111827" }}>{t.n}</div>
                <div style={{ fontSize:11, color:"#9ca3af" }}>{t.r}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ textAlign:"center", padding:"70px 40px 90px" }}>
        <h2 style={{ fontSize:"clamp(28px,4vw,48px)", fontWeight:800, color:"#111827", marginBottom:24 }}>Your landing page is waiting.</h2>
        <button onClick={onBuild} style={{ padding:"15px 42px", background:"#f97316", color:"white", border:"none", borderRadius:10, fontSize:16, fontWeight:700, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 20px #f9731640" }}>
          Build It Now →
        </button>
        <div style={{ marginTop:12, fontSize:12, color:"#9ca3af" }}>See your page before you pay</div>
      </div>

      <div style={{ textAlign:"center", padding:"16px 40px", borderTop:"1px solid #f3f4f6", fontSize:11, color:"#9ca3af", background:"white", display:"flex", alignItems:"center", justifyContent:"center", gap:20, flexWrap:"wrap" }}>
        <span>© 2026 Sitefliq · AI Landing Page Builder</span>
        <a href="#terms" style={{ cursor:"pointer", textDecoration:"underline", color:"#9ca3af" }}>Terms</a>
        <a href="#privacy" style={{ cursor:"pointer", textDecoration:"underline", color:"#9ca3af" }}>Privacy</a>
        <a href="#refund" style={{ cursor:"pointer", textDecoration:"underline", color:"#9ca3af" }}>Refund Policy</a>
        <span>hello@sitefliq.com</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   PRICING PAGE (standalone)
───────────────────────────────────────────────────────────────────────────── */
function PricingPage({ onBuild, onHome, user, credits, onSignIn, onSignOut, onPurchase }) {
  return (
    <div style={{ minHeight:"100vh", background:"#fafaf9" }}>
      <GS/>
      <nav style={{ height:56, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 48px", borderBottom:"1px solid #e5e7eb", background:"white" }}>
        <div onClick={onHome} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
          <div style={{ width:27, height:27, background:"#f97316", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:"white", fontWeight:800 }}>S</div>
          <span style={{ fontSize:17, fontWeight:800, color:"#111827" }}>Sitefliq</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {user ? (
            <>
              <span style={{ fontSize:12, background:"#fff7ed", color:credits <= 1 ? "#dc2626" : "#f97316", border:`1px solid ${credits <= 1 ? "#fecaca" : "#fed7aa"}`, borderRadius:20, padding:"3px 10px", fontWeight:700 }}>⚡ {credits} credits</span>
              <button onClick={onSignOut} style={{ padding:"7px 14px", background:"transparent", border:"1px solid #e5e7eb", borderRadius:8, fontSize:13, cursor:"pointer", color:"#6b7280", fontFamily:"inherit" }}>Sign out</button>
              <button onClick={onBuild} style={{ padding:"8px 18px", background:"#f97316", border:"none", borderRadius:8, fontSize:13, cursor:"pointer", color:"white", fontFamily:"inherit", fontWeight:700 }}>Build Page →</button>
            </>
          ) : (
            <>
              <button onClick={onSignIn} style={{ padding:"8px 16px", background:"transparent", border:"1px solid #e5e7eb", borderRadius:8, fontSize:13, cursor:"pointer", color:"#374151", fontFamily:"inherit" }}>Sign In</button>
              <button onClick={onBuild} style={{ padding:"8px 18px", background:"#f97316", border:"none", borderRadius:8, fontSize:13, cursor:"pointer", color:"white", fontFamily:"inherit", fontWeight:700 }}>Start Free →</button>
            </>
          )}
        </div>
      </nav>
      <div style={{ maxWidth:860, margin:"0 auto", padding:"70px 40px" }}>
        <h1 style={{ fontSize:46, fontWeight:800, textAlign:"center", color:"#111827", marginBottom:8, fontFamily:"'Instrument Serif',serif", fontStyle:"italic" }}>Simple pricing</h1>
        <p style={{ textAlign:"center", color:"#6b7280", marginBottom:32, fontSize:14 }}>Buy credits once. Use them whenever. 1 credit = 1 complete landing page.</p>
        <div style={{ display:"flex", justifyContent:"center", gap:24, marginBottom:40, flexWrap:"wrap" }}>
          {[["⚡","1 credit = 1 full page"],["💾","Credits never expire"],["🔒","One-time payment, no subscription"]].map(([ic,t]) => (
            <div key={t} style={{ display:"flex", alignItems:"center", gap:8, padding:"10px 16px", background:"white", border:"1px solid #f3f4f6", borderRadius:10, boxShadow:"0 1px 3px rgba(0,0,0,.04)", fontSize:12, fontWeight:600, color:"#111827" }}>
              <span style={{ fontSize:18 }}>{ic}</span>{t}
            </div>
          ))}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:18 }}>
          {PLANS.map(p => (
            <div key={p.id} style={{ padding:30, borderRadius:16, position:"relative", background:"white", border:p.badge?`2px solid ${p.color}`:"1px solid #e5e7eb", boxShadow:p.badge?`0 4px 30px ${p.color}18`:"0 1px 3px rgba(0,0,0,.04)" }}>
              {p.badge && <div style={{ position:"absolute", top:-11, left:"50%", transform:"translateX(-50%)", background:p.color, color:"white", padding:"3px 13px", borderRadius:100, fontSize:9, fontWeight:800, letterSpacing:1.5, whiteSpace:"nowrap" }}>{p.badge}</div>}
              <div style={{ fontSize:10, fontWeight:700, color:p.color, letterSpacing:2, textTransform:"uppercase", marginBottom:10 }}>{p.name}</div>
              <div style={{ background:`${p.color}10`, border:`1px solid ${p.color}25`, borderRadius:10, padding:"14px 16px", marginBottom:14, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                <div>
                  <div style={{ fontSize:10, color:p.color, fontWeight:700, letterSpacing:1, textTransform:"uppercase", marginBottom:2 }}>Credits</div>
                  <div style={{ fontSize:40, fontWeight:800, color:"#111827", lineHeight:1, fontFamily:"'Instrument Serif',serif" }}>{p.credits}</div>
                </div>
                <div style={{ textAlign:"right" }}>
                  <div style={{ fontSize:10, color:"#9ca3af", marginBottom:2 }}>per page</div>
                  <div style={{ fontSize:15, fontWeight:700, color:p.color }}>{p.perPage}</div>
                </div>
              </div>
              <div style={{ display:"flex", alignItems:"baseline", gap:6, marginBottom:2 }}>
                <span style={{ fontSize:36, fontWeight:800, color:"#111827", fontFamily:"'Instrument Serif',serif" }}>{p.price}</span>
              </div>
              <div style={{ fontSize:11, color:"#9ca3af", marginBottom:16 }}>one-time · no subscription</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8, marginBottom:22 }}>
                {p.features.map(f => <div key={f} style={{ display:"flex", gap:8, fontSize:12, color:"#374151" }}><span style={{ color:p.color, flexShrink:0, fontWeight:700 }}>✓</span>{f}</div>)}
              </div>
              <button onClick={() => onPurchase(p)} style={{ width:"100%", padding:11, borderRadius:9, fontFamily:"'Geist',sans-serif", fontSize:13, fontWeight:700, cursor:"pointer", background:p.badge?p.color:"transparent", border:p.badge?"none":`2px solid ${p.color}`, color:p.badge?"white":p.color, transition:"all .2s" }}>
                Get {p.credits} Credits →
              </button>
            </div>
          ))}
        </div>
        <div style={{ marginTop:24, textAlign:"center", fontSize:12, color:"#9ca3af" }}>
          🔒 Secure checkout via Paddle · Credits never expire · 14-day money back guarantee
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   LEGAL PAGES
───────────────────────────────────────────────────────────────────────────── */
function LegalPage({ title, onHome, children }) {
  return (
    <div style={{ minHeight:"100vh", background:"#fafaf9", fontFamily:"'Geist',sans-serif" }}>
      <GS/>
      <nav style={{ position:"fixed", top:0, left:0, right:0, zIndex:100, height:56, display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 48px", background:"rgba(250,250,249,.95)", backdropFilter:"blur(20px)", borderBottom:"1px solid #e5e7eb" }}>
        <div onClick={onHome} style={{ display:"flex", alignItems:"center", gap:8, cursor:"pointer" }}>
          <div style={{ width:28, height:28, background:"#f97316", borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center", fontSize:13, color:"white", fontWeight:800 }}>S</div>
          <span style={{ fontSize:18, fontWeight:800, color:"#111827" }}>Sitefliq</span>
        </div>
        <button onClick={onHome} style={{ padding:"7px 16px", background:"transparent", border:"1px solid #e5e7eb", borderRadius:8, fontSize:13, cursor:"pointer", color:"#374151", fontFamily:"inherit" }}>← Back to Home</button>
      </nav>
      <div style={{ maxWidth:780, margin:"0 auto", padding:"100px 40px 80px" }}>
        <h1 style={{ fontSize:36, fontWeight:800, color:"#111827", marginBottom:8 }}>{title}</h1>
        <p style={{ fontSize:13, color:"#9ca3af", marginBottom:48 }}>Last updated: March 2026</p>
        <div style={{ fontSize:15, color:"#374151", lineHeight:1.9 }}>{children}</div>
      </div>
      <footer style={{ borderTop:"1px solid #e5e7eb", padding:"24px 48px", display:"flex", justifyContent:"space-between", alignItems:"center", background:"white" }}>
        <span style={{ fontSize:12, color:"#9ca3af" }}>© 2026 Sitefliq. All rights reserved.</span>
        <span onClick={onHome} style={{ fontSize:12, color:"#9ca3af", cursor:"pointer", textDecoration:"underline" }}>Home</span>
      </footer>
    </div>
  );
}

function LS({ title, children }) {
  return <div style={{ marginBottom:36 }}><h2 style={{ fontSize:20, fontWeight:700, color:"#111827", marginBottom:12 }}>{title}</h2>{children}</div>;
}

function TermsPage({ onHome }) {
  return (
    <LegalPage title="Terms of Service" onHome={onHome}>
      <LS title="1. Acceptance"><p>By using Sitefliq at sitefliq.com you agree to these Terms. If you do not agree, please do not use our Service.</p></LS>
      <LS title="2. Service"><p>Sitefliq is an AI-powered landing page generator. Credits are purchased one-time and each credit generates one HTML landing page.</p></LS>
      <LS title="3. Accounts"><p>You must be 18+ to use this Service. You are responsible for maintaining the confidentiality of your account credentials.</p></LS>
      <LS title="4. Credits & Payments"><p>Credits are non-refundable once used, never expire, and are non-transferable. All prices are in USD. Payments are processed by Paddle.com, our Merchant of Record.</p></LS>
      <LS title="5. Refund Policy"><p>We offer a full 14-day money-back guarantee on all purchases. Contact hello@sitefliq.com within 14 days for a no-questions-asked refund processed within 5–10 business days.</p></LS>
      <LS title="6. AI-Generated Content"><p>AI content may not always be accurate. You are responsible for reviewing and verifying all content before publishing. You own the generated HTML output.</p></LS>
      <LS title="7. Prohibited Uses"><p>You may not use the Service to generate fraudulent, illegal, or harmful content, or content that infringes third-party intellectual property rights.</p></LS>
      <LS title="8. Disclaimer"><p>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. YOUR USE IS AT YOUR SOLE RISK.</p></LS>
      <LS title="9. Limitation of Liability"><p>SITEFLIQ SHALL NOT BE LIABLE FOR INDIRECT OR CONSEQUENTIAL DAMAGES. OUR TOTAL LIABILITY SHALL NOT EXCEED YOUR LAST 30 DAYS OF PAYMENTS.</p></LS>
      <LS title="10. Governing Law"><p>These Terms are governed by the laws of the Republic of South Africa.</p></LS>
      <LS title="11. Contact"><p>Questions? Email <strong>hello@sitefliq.com</strong></p></LS>
    </LegalPage>
  );
}

function PrivacyPage({ onHome }) {
  return (
    <LegalPage title="Privacy Policy" onHome={onHome}>
      <LS title="1. Introduction"><p>Sitefliq is committed to protecting your privacy. This policy explains how we collect, use, and safeguard your personal information.</p></LS>
      <LS title="2. Information We Collect"><p>We collect: account info (email, password via Supabase), payment info (processed by Paddle — we never store card details), usage data, input data you provide, and standard web log data.</p></LS>
      <LS title="3. How We Use It"><p>To provide the Service, process payments, send transactional emails, respond to support, detect fraud, and comply with legal obligations. We do not sell your data.</p></LS>
      <LS title="4. Data Sharing"><p>We share data only with: Supabase (auth/database), Paddle (payments), Anthropic (AI generation), and Vercel (hosting). All are subject to their own privacy policies.</p></LS>
      <LS title="5. Security"><p>We use encrypted storage, HTTPS, and row-level security. No method is 100% secure but we take all reasonable precautions.</p></LS>
      <LS title="6. Your Rights"><p>You may access, correct, delete, or export your data at any time. Contact hello@sitefliq.com to exercise these rights.</p></LS>
      <LS title="7. Cookies"><p>We use minimal session cookies for authentication only. No advertising or tracking cookies.</p></LS>
      <LS title="8. Contact"><p>Privacy questions? Email <strong>hello@sitefliq.com</strong></p></LS>
    </LegalPage>
  );
}

function RefundPage({ onHome }) {
  return (
    <LegalPage title="Refund Policy" onHome={onHome}>
      <LS title="14-Day Money-Back Guarantee"><p>You may request a full refund on any Sitefliq purchase within <strong>14 days of the original transaction date</strong>, no questions asked. Simply contact us and we will process your refund promptly.</p></LS>
      <LS title="How It Works"><p>Refunds are processed through Paddle, our payment provider. The full amount will be returned to your original payment method within 5–10 business days.</p></LS>
      <LS title="How to Request"><p>Email <strong>hello@sitefliq.com</strong> with subject "Refund Request" and include your account email and transaction date. We respond within 1 business day.</p></LS>
    </LegalPage>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   EXAMPLE PAGE
───────────────────────────────────────────────────────────────────────────── */
const EXAMPLE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Peak Ridge Roofing | Roof Repair & Replacement | Austin, TX</title>
<meta name="description" content="Peak Ridge Roofing in Austin TX — expert roof repair, replacement and storm damage restoration. Licensed & insured. Free estimates. Call (512) 555-0198."/>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"RoofingContractor","name":"Peak Ridge Roofing","address":{"@type":"PostalAddress","streetAddress":"4821 Burnet Road","addressLocality":"Austin","addressRegion":"TX","postalCode":"78756"},"telephone":"+15125550198","aggregateRating":{"@type":"AggregateRating","ratingValue":"4.9","reviewCount":"312"}}</script>
<link href="https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;600;700&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#f8f7f4;--surface:#fff;--accent:#c8410a;--text:#1a1a1a;--muted:#6b6b6b;--border:#e2ddd6}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;overflow-x:hidden}
@keyframes fadeUp{from{opacity:0;transform:translateY(28px)}to{opacity:1;transform:translateY(0)}}
@keyframes scaleIn{from{opacity:0;transform:scale(1.04)}to{opacity:1;transform:scale(1)}}
.reveal{opacity:0;transform:translateY(28px);transition:opacity .7s ease,transform .7s ease}
.reveal.visible{opacity:1;transform:translateY(0)}
nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:20px 56px;display:flex;align-items:center;justify-content:space-between;transition:all .3s;background:transparent}
nav.scrolled{background:rgba(26,26,26,.97);padding:14px 56px;box-shadow:0 2px 20px rgba(0,0,0,.15)}
.logo{font-family:'Oswald',sans-serif;font-size:24px;font-weight:700;letter-spacing:1px;color:#fff}
.logo span{color:var(--accent)}
.nav-links{display:flex;gap:32px;align-items:center}
.nav-links a{color:rgba(255,255,255,.8);text-decoration:none;font-size:14px;font-weight:500;transition:color .2s}
.nav-cta{background:var(--accent);color:white!important;padding:11px 22px;border-radius:4px;font-size:13px;font-weight:700;text-decoration:none;transition:all .2s}
.hero{min-height:100vh;display:flex;align-items:center;padding:120px 56px 80px;position:relative;overflow:hidden}
.hero-bg{position:absolute;inset:0;background:url('https://images.pexels.com/photos/8159657/pexels-photo-8159657.jpeg?auto=compress&cs=tinysrgb&w=1600') center/cover;filter:brightness(.32);animation:scaleIn 1.5s ease forwards}
.hero-bg::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(26,26,26,.75) 50%,transparent)}
.hero-content{position:relative;z-index:2;max-width:660px}
.hero h1{font-family:'Oswald',sans-serif;font-size:clamp(52px,7vw,96px);line-height:1;margin-bottom:20px;letter-spacing:1px;color:#fff;animation:fadeUp .9s .1s both;font-weight:700}
.hero h1 span{color:var(--accent)}
.hero p{font-size:17px;color:rgba(255,255,255,.75);max-width:480px;margin-bottom:32px;line-height:1.8;animation:fadeUp .9s .2s both}
.hero-btns{display:flex;gap:14px;flex-wrap:wrap;animation:fadeUp .9s .3s both}
.btn-primary{background:var(--accent);color:white;padding:16px 34px;border-radius:4px;font-size:15px;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:8px;transition:all .25s}
.btn-primary:hover{background:#a33208;transform:translateY(-2px)}
.btn-secondary{border:2px solid rgba(255,255,255,.3);color:#fff;padding:16px 34px;border-radius:4px;font-size:15px;font-weight:500;text-decoration:none;transition:all .25s}
.stats-bar{background:var(--accent);padding:40px 56px;display:grid;grid-template-columns:repeat(4,1fr)}
.stat{text-align:center;padding:12px;border-right:1px solid rgba(255,255,255,.2)}
.stat:last-child{border-right:none}
.stat-num{font-family:'Oswald',sans-serif;font-size:48px;color:#fff;line-height:1;margin-bottom:4px;font-weight:700}
.stat-label{font-size:11px;color:rgba(255,255,255,.85);font-weight:600;letter-spacing:1px;text-transform:uppercase}
.section{padding:96px 56px;max-width:1280px;margin:0 auto}
.services-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:52px}
.service-card{background:var(--surface);border:1px solid var(--border);border-radius:6px;overflow:hidden;transition:all .3s;cursor:pointer}
.service-card:hover{transform:translateY(-6px);box-shadow:0 16px 40px rgba(0,0,0,.1);border-color:var(--accent)}
.service-img{width:100%;height:220px;object-fit:cover;display:block}
.service-body{padding:24px}
.service-name{font-family:'Oswald',sans-serif;font-size:22px;font-weight:600;margin-bottom:8px}
.service-desc{font-size:13px;color:var(--muted);line-height:1.7}
.testi-section{background:#f1ede6;padding:96px 56px;border-top:1px solid var(--border)}
.testi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:52px;max-width:1280px;margin-left:auto;margin-right:auto}
.testi-card{background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:28px}
.testi-stars{color:var(--accent);font-size:14px;margin-bottom:14px}
.testi-text{font-size:14px;color:var(--text);line-height:1.8;margin-bottom:20px;font-style:italic}
.faq-section{padding:96px 56px;max-width:800px;margin:0 auto}
.faq-item{border-bottom:1px solid var(--border)}
.faq-q{display:flex;justify-content:space-between;align-items:center;padding:20px 0;cursor:pointer;font-size:15px;font-weight:600}
.faq-q:hover{color:var(--accent)}
.faq-icon{width:28px;height:28px;border:1px solid var(--border);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;transition:all .3s;color:var(--muted)}
.faq-a{display:none;padding:0 0 18px;font-size:14px;color:var(--muted);line-height:1.9}
.faq-item.open .faq-icon{background:var(--accent);border-color:var(--accent);color:white;transform:rotate(45deg)}
.faq-item.open .faq-a{display:block}
.cta-section{padding:112px 56px;text-align:center;position:relative;overflow:hidden}
.cta-bg{position:absolute;inset:0;background:url('https://images.pexels.com/photos/8159657/pexels-photo-8159657.jpeg?auto=compress&cs=tinysrgb&w=1600') center/cover;filter:brightness(.2)}
.cta-content{position:relative;z-index:2}
.cta-section h2{font-family:'Oswald',sans-serif;font-size:clamp(44px,6vw,80px);line-height:1;margin-bottom:18px;color:#fff;font-weight:700}
.cta-section h2 span{color:#f4a07a}
footer{background:#1a1a1a;padding:64px 56px 28px}
.footer-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:48px;max-width:1280px;margin:0 auto 48px}
.footer-brand p{font-size:13px;color:#888;line-height:1.8;margin-top:12px}
.footer-col h4{font-size:11px;font-weight:700;letter-spacing:2px;color:var(--accent);text-transform:uppercase;margin-bottom:16px}
.footer-col a{display:block;font-size:13px;color:#888;text-decoration:none;margin-bottom:9px;transition:color .2s}
.footer-col a:hover{color:#fff}
.footer-bottom{border-top:1px solid #2a2a2a;padding-top:24px;display:flex;justify-content:space-between;align-items:center;max-width:1280px;margin:0 auto;font-size:12px;color:#555}
@media(max-width:768px){nav{padding:16px 24px}.nav-links{display:none}.stats-bar{grid-template-columns:repeat(2,1fr)}.services-grid,.testi-grid{grid-template-columns:1fr}.section,.testi-section,.faq-section,.cta-section{padding:72px 24px}.footer-grid{grid-template-columns:1fr 1fr}.hero{padding:120px 24px 80px}}
</style>
</head>
<body>
<nav id="nav"><div class="logo">Peak<span>Ridge</span></div><div class="nav-links"><a href="#services">Services</a><a href="#testimonials">Reviews</a><a href="#faq">FAQ</a><a href="#contact" class="nav-cta">FREE ESTIMATE</a></div></nav>
<section class="hero" id="home"><div class="hero-bg"></div><div class="hero-content"><div style="display:inline-flex;align-items:center;gap:8px;background:rgba(200,65,10,.2);border:1px solid rgba(200,65,10,.4);border-radius:3px;padding:6px 14px;font-size:11px;color:#f4a07a;font-weight:700;letter-spacing:2px;margin-bottom:22px">🏆 AUSTIN'S MOST TRUSTED ROOFER SINCE 2008</div><h1>YOUR ROOF.<br/><span>DONE RIGHT.</span><br/>GUARANTEED.</h1><p>Expert roof repair, full replacements, and storm damage restoration in Austin, TX. Licensed, bonded & insured. Free same-day estimates.</p><div class="hero-btns"><a href="#contact" class="btn-primary">📞 Get Free Estimate</a><a href="#services" class="btn-secondary">Our Services →</a></div></div></section>
<div class="stats-bar"><div class="stat"><div class="stat-num" data-target="1400">0</div><div class="stat-label">Roofs Replaced</div></div><div class="stat"><div class="stat-num" data-target="16">0</div><div class="stat-label">Years in Austin</div></div><div class="stat"><div class="stat-num" data-target="312">0</div><div class="stat-label">5-Star Reviews</div></div><div class="stat"><div class="stat-num" data-target="100">0</div><div class="stat-label">% Satisfaction</div></div></div>
<div class="section" id="services"><div style="font-size:11px;color:var(--accent);font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px">What We Do</div><h2 class="reveal" style="font-family:'Oswald',sans-serif;font-size:clamp(40px,4.5vw,64px);font-weight:700;line-height:1.05;margin-bottom:16px">Complete Roofing Solutions</h2><p class="reveal" style="font-size:16px;color:var(--muted);max-width:520px;line-height:1.8">From minor repairs to full replacements — we handle every roofing job in Austin and surrounding areas.</p><div class="services-grid"><div class="service-card reveal"><img src="https://images.pexels.com/photos/8159657/pexels-photo-8159657.jpeg?auto=compress&cs=tinysrgb&w=600" alt="Roof Replacement" class="service-img"/><div class="service-body"><div style="font-size:28px;margin-bottom:12px">🏠</div><div class="service-name">Full Roof Replacement</div><div class="service-desc">Complete tear-off and replacement using premium shingles, metal, or tile. Built to last 30+ years in Texas weather.</div></div></div><div class="service-card reveal"><img src="https://images.pexels.com/photos/7218524/pexels-photo-7218524.jpeg?auto=compress&cs=tinysrgb&w=600" alt="Roof Repair" class="service-img"/><div class="service-body"><div style="font-size:28px;margin-bottom:12px">🔧</div><div class="service-name">Roof Repair</div><div class="service-desc">Leaks, missing shingles, damaged flashing — we fix it fast and right the first time. No job too small.</div></div></div><div class="service-card reveal"><img src="https://images.pexels.com/photos/1446948/pexels-photo-1446948.jpeg?auto=compress&cs=tinysrgb&w=600" alt="Storm Damage" class="service-img"/><div class="service-body"><div style="font-size:28px;margin-bottom:12px">⛈️</div><div class="service-name">Storm Damage Restoration</div><div class="service-desc">Hail, wind, fallen trees — we work directly with your insurance and handle the entire claim process.</div></div></div></div></div>
<div class="testi-section" id="testimonials"><div style="max-width:1280px;margin:0 auto"><div style="font-size:11px;color:var(--accent);font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px">Reviews</div><h2 class="reveal" style="font-family:'Oswald',sans-serif;font-size:clamp(40px,4.5vw,64px);font-weight:700">What Austin Homeowners Say</h2><div class="testi-grid"><div class="testi-card reveal"><div class="testi-stars">★★★★★</div><div class="testi-text">"After the hail storm in April our roof was destroyed. Peak Ridge came out the next morning, handled everything with State Farm, and had our new roof on in two days."</div><div style="font-size:13px;font-weight:700">Jennifer M.</div><div style="font-size:12px;color:var(--muted)">Round Rock, TX</div></div><div class="testi-card reveal"><div class="testi-stars">★★★★★</div><div class="testi-text">"Three other roofers quoted me $18,000. Peak Ridge came in at $11,400 with better shingles and a lifetime warranty. I've referred them to four neighbors already."</div><div style="font-size:13px;font-weight:700">Tom R.</div><div style="font-size:12px;color:var(--muted)">South Austin, TX</div></div><div class="testi-card reveal"><div class="testi-stars">★★★★★</div><div class="testi-text">"Had a bad leak for two years. Two companies couldn't find it. Peak Ridge found it in 20 minutes, fixed it in an hour, and charged less than expected."</div><div style="font-size:13px;font-weight:700">Sandra C.</div><div style="font-size:12px;color:var(--muted)">Cedar Park, TX</div></div></div></div></div>
<div class="faq-section" id="faq"><div style="font-size:11px;color:var(--accent);font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px">FAQ</div><h2 class="reveal" style="font-family:'Oswald',sans-serif;font-size:clamp(40px,4.5vw,64px);font-weight:700;margin-bottom:32px">Common Questions</h2><div class="faq-item"><div class="faq-q">How long does a full roof replacement take?<span class="faq-icon">+</span></div><div class="faq-a">Most full replacements take 1–2 days depending on the size of your roof and the materials chosen.</div></div><div class="faq-item"><div class="faq-q">Do you work with all insurance companies?<span class="faq-icon">+</span></div><div class="faq-a">Yes — we work with all major insurers including State Farm, Allstate, USAA, and Farmers.</div></div><div class="faq-item"><div class="faq-q">What materials do you offer?<span class="faq-icon">+</span></div><div class="faq-a">We install asphalt shingles (including GAF Timberline), metal roofing, tile, and flat roofing systems.</div></div><div class="faq-item"><div class="faq-q">Is your work guaranteed?<span class="faq-icon">+</span></div><div class="faq-a">Every replacement comes with a lifetime workmanship warranty plus manufacturer's material warranty (up to 50 years).</div></div><div class="faq-item"><div class="faq-q">How much does a new roof cost in Austin?<span class="faq-icon">+</span></div><div class="faq-a">An average Austin home typically runs $8,000–$14,000. We'll give you an exact quote at no charge.</div></div></div>
<section class="cta-section" id="contact"><div class="cta-bg"></div><div class="cta-content"><h2 class="reveal">GET YOUR <span>FREE</span><br/>ESTIMATE TODAY</h2><p class="reveal" style="font-size:17px;color:rgba(255,255,255,.75);margin-bottom:32px;max-width:480px;margin-left:auto;margin-right:auto;line-height:1.8">No pressure. No obligation. Just an honest assessment from Austin's most trusted roofing team.</p><div style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap" class="reveal"><a href="tel:5125550198" class="btn-primary" style="font-size:16px">📞 (512) 555-0198</a><a href="mailto:info@peakridgeroofing.com" class="btn-secondary" style="color:#fff;border-color:rgba(255,255,255,.4)">Email Us →</a></div></div></section>
<footer><div class="footer-grid"><div class="footer-brand"><div class="logo" style="color:#fff">Peak<span style="color:var(--accent)">Ridge</span></div><p>Austin's trusted roofing contractor since 2008. Licensed, bonded, insured, backed by a lifetime warranty.</p></div><div class="footer-col"><h4>Services</h4><a href="#services">Roof Replacement</a><a href="#services">Roof Repair</a><a href="#services">Storm Damage</a></div><div class="footer-col"><h4>Company</h4><a href="#testimonials">Reviews</a><a href="#faq">FAQ</a></div><div class="footer-col"><h4>Contact</h4><a href="tel:5125550198">(512) 555-0198</a><a href="mailto:info@peakridgeroofing.com">info@peakridge.com</a></div></div><div class="footer-bottom"><span>© 2026 Peak Ridge Roofing. All rights reserved.</span><span>Built with Sitefliq AI ⚡</span></div></footer>
<script>
const nav=document.getElementById('nav');
window.addEventListener('scroll',()=>nav.classList.toggle('scrolled',window.scrollY>80));
const obs=new IntersectionObserver(entries=>entries.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');const n=e.target.querySelector('[data-target]');if(n)animateCounter(n);}}),{threshold:0.15});
document.querySelectorAll('.reveal').forEach(el=>obs.observe(el));
function animateCounter(el){if(el.dataset.animated)return;el.dataset.animated=true;const target=parseInt(el.dataset.target);const start=performance.now();const update=now=>{const p=Math.min((now-start)/2000,1);const ease=1-Math.pow(1-p,3);el.textContent=Math.floor(ease*target).toLocaleString()+(p<1?'':'+');if(p<1)requestAnimationFrame(update);};requestAnimationFrame(update);}
document.querySelectorAll('[data-target]').forEach(el=>new IntersectionObserver(entries=>{if(entries[0].isIntersecting)animateCounter(el);},{threshold:0.5}).observe(el));
document.querySelectorAll('.faq-q').forEach(q=>q.addEventListener('click',()=>{const item=q.parentElement;const wasOpen=item.classList.contains('open');document.querySelectorAll('.faq-item').forEach(i=>i.classList.remove('open'));if(!wasOpen)item.classList.add('open');}));
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',e=>{const t=document.querySelector(a.getAttribute('href'));if(t){e.preventDefault();t.scrollIntoView({behavior:'smooth'});}}));
</script>
</body>
</html>`;

/* ─────────────────────────────────────────────────────────────────────────────
   EXAMPLE PAGE
───────────────────────────────────────────────────────────────────────────── */
function ExamplePage({ onBack, onBuild }) {
  const [blobUrl, setBlobUrl] = useState(null);
  useEffect(() => {
    const b = new Blob([EXAMPLE_HTML], { type:"text/html" });
    const u = URL.createObjectURL(b);
    setBlobUrl(u);
    return () => URL.revokeObjectURL(u);
  }, []);
  return (
    <div style={{ minHeight:"100vh", background:"#fafaf9", fontFamily:"'Geist',sans-serif" }}>
      <GS/>
      <div style={{ height:54, background:"white", borderBottom:"1px solid #f3f4f6", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 28px", position:"sticky", top:0, zIndex:10 }}>
        <button onClick={onBack} style={{ display:"flex", alignItems:"center", gap:6, background:"transparent", border:"none", cursor:"pointer", fontSize:13, color:"#6b7280", fontFamily:"inherit" }}>← Back</button>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:24, height:24, background:"#f97316", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:"white", fontWeight:800 }}>S</div>
          <span style={{ fontSize:14, fontWeight:800, color:"#111827" }}>Example Output</span>
        </div>
        <button onClick={onBuild} style={{ padding:"8px 18px", background:"#f97316", border:"none", borderRadius:8, fontSize:13, cursor:"pointer", color:"white", fontFamily:"inherit", fontWeight:700 }}>Build Mine →</button>
      </div>
      <div style={{ background:"#fff7ed", borderBottom:"1px solid #fed7aa", padding:"12px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:10 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, fontSize:13 }}>
          <span style={{ fontSize:16 }}>✦</span>
          <span style={{ fontWeight:600, color:"#111827" }}>Peak Ridge Roofing — Austin TX</span>
          <span style={{ color:"#9ca3af" }}>Sample page generated by Sitefliq AI</span>
          <span style={{ background:"#f97316", color:"white", padding:"2px 8px", borderRadius:4, fontSize:10, fontWeight:700 }}>EXAMPLE</span>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          {blobUrl && <button onClick={() => window.open(blobUrl,"_blank")} style={{ padding:"7px 14px", background:"white", border:"1px solid #e5e7eb", borderRadius:7, fontSize:12, cursor:"pointer", fontFamily:"inherit", fontWeight:600 }}>🔗 Open Full Page</button>}
          <button onClick={onBuild} style={{ padding:"7px 16px", background:"#f97316", border:"none", borderRadius:7, fontSize:12, cursor:"pointer", color:"white", fontFamily:"inherit", fontWeight:700 }}>Build Your Page →</button>
        </div>
      </div>
      <div style={{ background:"white", borderBottom:"1px solid #f3f4f6", padding:"12px 28px", display:"flex", gap:20, flexWrap:"wrap" }}>
        {[["🔍","Full SEO meta"],["🎯","5+ CTAs"],["📱","Mobile responsive"],["✍️","Niche copy"],["⚡","FAQ accordion"]].map(([ic,t]) => (
          <div key={t} style={{ display:"flex", alignItems:"center", gap:6, fontSize:12, color:"#374151" }}>
            <span>{ic}</span><span style={{ fontWeight:500 }}>{t}</span>
          </div>
        ))}
      </div>
      <div style={{ padding:"24px 28px" }}>
        <div style={{ borderRadius:14, overflow:"hidden", boxShadow:"0 4px 30px rgba(0,0,0,.1)", border:"1px solid #e5e7eb" }}>
          <div style={{ background:"#f1f5f9", padding:"10px 16px", display:"flex", alignItems:"center", gap:10, borderBottom:"1px solid #e5e7eb" }}>
            <div style={{ display:"flex", gap:5 }}>{["#ef4444","#f59e0b","#22c55e"].map(c => <div key={c} style={{ width:10, height:10, borderRadius:"50%", background:c }}/>)}</div>
            <div style={{ flex:1, background:"white", borderRadius:20, padding:"5px 14px", fontSize:11, color:"#6b7280", display:"flex", alignItems:"center", gap:6, maxWidth:400, margin:"0 auto" }}>
              <span>🔒</span> peakridgeroofing.netlify.app
            </div>
          </div>
          {blobUrl
            ? <iframe src={blobUrl} style={{ width:"100%", height:"85vh", border:"none", display:"block" }} title="Example landing page" scrolling="yes"/>
            : <div style={{ height:"85vh", display:"flex", alignItems:"center", justifyContent:"center", background:"#f9fafb" }}>
                <div style={{ textAlign:"center", color:"#9ca3af" }}>
                  <div style={{ fontSize:32, marginBottom:8, animation:"spin 1s linear infinite", display:"inline-block" }}>◌</div>
                  <div style={{ fontSize:13 }}>Loading example…</div>
                </div>
              </div>
          }
        </div>
      </div>
      <div style={{ textAlign:"center", padding:"32px 28px 48px" }}>
        <div style={{ fontSize:14, color:"#6b7280", marginBottom:16 }}>Ready to build your own? It takes 60 seconds.</div>
        <button onClick={onBuild} style={{ padding:"14px 40px", background:"#f97316", color:"white", border:"none", borderRadius:10, fontSize:15, fontWeight:700, cursor:"pointer", fontFamily:"inherit", boxShadow:"0 4px 20px #f9731640" }}>
          Build My Landing Page →
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   HELP PAGE
───────────────────────────────────────────────────────────────────────────── */
function HelpPage({ onHome }) {
  const [category, setCategory] = useState(null);
  const [form, setForm] = useState({ name:"", email:"", subject:"", message:"" });
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const categories = [
    { id:"feature", icon:"💡", label:"Feature Request" },
    { id:"bug",     icon:"🐛", label:"Bug / Issue" },
    { id:"question",icon:"❓", label:"General Question" },
    { id:"other",   icon:"💬", label:"Other" },
  ];

  const faqs = [
    { q:"My page didn't generate — what happened?", a:"Usually a network timeout or very short description. Try again with a longer business description (3–5 sentences). If you see 'API 401' contact us immediately." },
    { q:"I paid but nothing happened", a:"After paying, return to Sitefliq and click 'I've Paid — Generate My Page'. If credits aren't showing, email us your payment receipt and we'll sort it within the hour." },
    { q:"The images don't match my business", a:"Make sure you select the correct industry from the dropdown — this controls which photos are sourced." },
    { q:"How do I host my downloaded HTML file?", a:"Go to netlify.com, create a free account, and drag-and-drop your HTML file onto the dashboard. Your site goes live instantly at a free URL." },
    { q:"Do my credits expire?", a:"Never. Credits are yours to use whenever you're ready — no time pressure, no subscription." },
    { q:"Can I edit the page after downloading?", a:"Yes — open the file in VS Code or any text editor and edit the text between HTML tags directly." },
    { q:"What does 'No Sitefliq branding' mean?", a:"Starter pages include a small 'Built with Sitefliq' link in the footer. Pro and Agency plans remove this completely." },
  ];

  const handleSubmit = () => {
    if (!form.name || !form.email || !form.message || !category) return;
    const subject = encodeURIComponent(`[Sitefliq ${categories.find(c => c.id===category)?.label}] ${form.subject || "Support Request"}`);
    const body = encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\nCategory: ${categories.find(c => c.id===category)?.label}\nSubject: ${form.subject}\n\nMessage:\n${form.message}`);
    window.open(`mailto:hello@sitefliq.com?subject=${subject}&body=${body}`, "_blank");
    setSubmitted(true);
  };

  const inp = { width:"100%", padding:"11px 14px", border:"1px solid #e5e7eb", borderRadius:8, fontSize:13, fontFamily:"'Geist',sans-serif", outline:"none", color:"#111827", background:"white", transition:"border-color .2s" };

  return (
    <div style={{ minHeight:"100vh", background:"#fafaf9", fontFamily:"'Geist',sans-serif" }}>
      <GS/>
      <div style={{ height:52, background:"white", borderBottom:"1px solid #f3f4f6", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 28px", position:"sticky", top:0, zIndex:10 }}>
        <button onClick={onHome} style={{ display:"flex", alignItems:"center", gap:6, background:"transparent", border:"none", cursor:"pointer", fontSize:13, color:"#6b7280", fontFamily:"inherit", fontWeight:500 }}>← Back</button>
        <div style={{ display:"flex", alignItems:"center", gap:7 }}>
          <div style={{ width:24, height:24, background:"#f97316", borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:"white", fontWeight:800 }}>S</div>
          <span style={{ fontSize:14, fontWeight:800, color:"#111827" }}>Sitefliq Help</span>
        </div>
        <div style={{ width:80 }}/>
      </div>
      <div style={{ maxWidth:680, margin:"0 auto", padding:"44px 24px 80px" }}>
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <h1 style={{ fontSize:28, fontWeight:800, color:"#111827", marginBottom:10 }}>Help Center</h1>
          <p style={{ fontSize:14, color:"#6b7280", lineHeight:1.6 }}>Have a question, found a bug, or want a new feature? We'd love to hear from you.</p>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10, marginBottom:28 }}>
          {categories.map(c => (
            <div key={c.id} onClick={() => setCategory(c.id)} style={{ background:"white", border:`1.5px solid ${category===c.id?"#f97316":"#e5e7eb"}`, borderRadius:12, padding:"18px 12px", textAlign:"center", cursor:"pointer", transition:"all .15s", boxShadow:category===c.id?"0 0 0 3px rgba(249,115,22,.1)":"none" }}>
              <div style={{ fontSize:22, marginBottom:8 }}>{c.icon}</div>
              <div style={{ fontSize:12, fontWeight:600, color:category===c.id?"#f97316":"#374151" }}>{c.label}</div>
            </div>
          ))}
        </div>
        <div style={{ background:"white", border:"1px solid #e5e7eb", borderRadius:14, padding:"28px", marginBottom:40, boxShadow:"0 1px 4px rgba(0,0,0,.04)" }}>
          {submitted ? (
            <div style={{ textAlign:"center", padding:"32px 0" }}>
              <div style={{ fontSize:44, marginBottom:16 }}>✅</div>
              <div style={{ fontSize:18, fontWeight:800, color:"#111827", marginBottom:8 }}>Query Submitted!</div>
              <p style={{ fontSize:13, color:"#6b7280", lineHeight:1.7 }}>Your email client opened with your message pre-filled. We'll respond to <strong>{form.email}</strong> within 24 hours.</p>
              <button onClick={() => setSubmitted(false)} style={{ marginTop:20, padding:"10px 22px", background:"#f97316", border:"none", borderRadius:8, fontSize:13, fontWeight:700, color:"white", cursor:"pointer", fontFamily:"inherit" }}>Submit Another</button>
            </div>
          ) : (
            <>
              <h2 style={{ fontSize:17, fontWeight:800, color:"#111827", marginBottom:4 }}>Submit a Query</h2>
              <p style={{ fontSize:12, color:"#9ca3af", marginBottom:22 }}>We'll respond via email within 24 hours.</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Your Name</label>
                  <input style={inp} placeholder="John Doe" value={form.name} onChange={e => setForm(f => ({...f, name:e.target.value}))}/>
                </div>
                <div>
                  <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Email Address</label>
                  <input style={inp} placeholder="john@email.com" type="email" value={form.email} onChange={e => setForm(f => ({...f, email:e.target.value}))}/>
                </div>
              </div>
              <div style={{ marginBottom:14 }}>
                <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Subject</label>
                <input style={inp} placeholder="Brief summary of your query" value={form.subject} onChange={e => setForm(f => ({...f, subject:e.target.value}))}/>
              </div>
              <div style={{ marginBottom:18 }}>
                <label style={{ fontSize:12, fontWeight:600, color:"#374151", display:"block", marginBottom:6 }}>Message</label>
                <textarea style={{...inp, resize:"vertical", minHeight:120, lineHeight:1.6}} placeholder="Describe your query in detail..." maxLength={500} value={form.message} onChange={e => setForm(f => ({...f, message:e.target.value}))}/>
              </div>
              <button onClick={handleSubmit} disabled={!form.name||!form.email||!form.message||!category}
                style={{ width:"100%", padding:"13px", background:!form.name||!form.email||!form.message||!category?"#e5e7eb":"#f97316", border:"none", borderRadius:10, fontSize:14, fontWeight:700, color:"white", cursor:!form.name||!form.email||!form.message||!category?"not-allowed":"pointer", fontFamily:"inherit" }}>
                ✈️ Submit Query
              </button>
            </>
          )}
        </div>
        <div>
          <h2 style={{ fontSize:17, fontWeight:800, color:"#111827", marginBottom:16 }}>Frequently Asked Questions</h2>
          <div style={{ borderRadius:12, overflow:"hidden", border:"1px solid #e5e7eb", background:"white" }}>
            {faqs.map((faq, i) => (
              <div key={i} style={{ borderBottom:i < faqs.length-1 ? "1px solid #f3f4f6" : "none" }}>
                <div onClick={() => setOpenFaq(openFaq===i ? null : i)} style={{ padding:"16px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", cursor:"pointer", gap:12 }}>
                  <span style={{ fontSize:13, fontWeight:600, color:"#111827", lineHeight:1.4 }}>{faq.q}</span>
                  <span style={{ color:"#f97316", fontSize:18, fontWeight:300, flexShrink:0, transition:"transform .25s", display:"inline-block", transform:openFaq===i?"rotate(45deg)":"rotate(0)" }}>+</span>
                </div>
                {openFaq===i && <div style={{ padding:"0 20px 16px", fontSize:13, color:"#6b7280", lineHeight:1.75 }}>{faq.a}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   DEFAULT FORM
───────────────────────────────────────────────────────────────────────────── */
const DEFAULT_FORM = {
  name:"", industry:"", tagline:"", description:"",
  location:"", phone:"", email:"", cta:"Get Started Today",
  palette:"noir", vibe:"bold", logo:"", importedColours:[],
  sections:["hero","social_proof","services","about","testimonials","contact"],
  services:[{},{},{},{},{},{}],
  pricingTiers:[{},{},{}],pricingCurrency:"$",
  galleryImages:[null,null,null,null,null,null],
};

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN APP
───────────────────────────────────────────────────────────────────────────── */
export default function Sitefliq() {
  // Store selectors
  const screen      = useAppStore(s => s.screen);
  const setScreen   = useAppStore(s => s.setScreen);
  const user        = useAppStore(s => s.user);
  const setUser     = useAppStore(s => s.setUser);
  const credits     = useAppStore(s => s.credits);
  const setCredits  = useAppStore(s => s.setCredits);
  const refreshCredits = useAppStore(s => s.refreshCredits);
  const signOut     = useAppStore(s => s.signOut);
  const form        = useAppStore(s => s.form);
  const updateForm  = useAppStore(s => s.updateForm);
  const resetForm   = useAppStore(s => s.resetForm);
  const toggleSection = useAppStore(s => s.toggleSection);
  const generatedHtml = useAppStore(s => s.generatedHtml);
  const setGeneratedHtml = useAppStore(s => s.setGeneratedHtml);
  const showAuth    = useAppStore(s => s.showAuth);
  const authMode    = useAppStore(s => s.authMode);
  const setShowAuth = useAppStore(s => s.setShowAuth);
  const legalScreen = useAppStore(s => s.legalScreen);
  const setLegalScreen = useAppStore(s => s.setLegalScreen);
  const showReset   = useAppStore(s => s.showReset);
  const resetToken  = useAppStore(s => s.resetToken);
  const setResetFlow = useAppStore(s => s.setResetFlow);
  const clearResetFlow = useAppStore(s => s.clearResetFlow);

  // Paddle hook
  const { openCheckout, isReady: paddleReady } = usePaddle();

  const ready = form.name.trim() && form.industry.trim() && form.description.trim();

  // Session restore & URL token detection
  useEffect(() => {
    if (sb.restoreSession()) {
      setUser(sb._user);
      sb.getCredits().then(setCredits);
    }

    // Detect Supabase recovery token
    const fullHash = window.location.hash;
    const fullSearch = window.location.search;
    if ((fullHash + fullSearch).includes("type=recovery")) {
      const hashParams = new URLSearchParams(fullHash.replace(/^#/, ""));
      const searchParams = new URLSearchParams(fullSearch.replace(/^\?/, ""));
      const token = hashParams.get("access_token") || searchParams.get("access_token");
      if (token) {
        setResetFlow(token);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }

    // Hash-based legal routing
    const routeHash = () => {
      const h = window.location.hash.replace("#", "");
      if (["terms","privacy","refund"].includes(h)) setLegalScreen(h);
    };
    routeHash();
    window.addEventListener("hashchange", routeHash);
    return () => window.removeEventListener("hashchange", routeHash);
  }, []);

  // Handle purchase via Paddle
  const handlePurchase = (plan) => {
    if (!user) { setShowAuth(true, "signup"); return; }
    if (!paddleReady) { toast("Payment system loading, please try again in a moment", "warning"); return; }
    openCheckout(plan.priceId, user.id, user.email);
  };

  const handleSignOut = async () => {
    await signOut();
    toast("Signed out", "info");
  };

  const handleAuthSuccess = () => {
    setUser(sb._user);
    sb.getCredits().then(setCredits);
    setShowAuth(false);
    toast("Welcome back!", "success");
  };

  // Legal pages
  if (legalScreen === "terms")   return <TermsPage   onHome={() => { setLegalScreen(null); window.location.hash=""; }}/>;
  if (legalScreen === "privacy") return <PrivacyPage onHome={() => { setLegalScreen(null); window.location.hash=""; }}/>;
  if (legalScreen === "refund")  return <RefundPage  onHome={() => { setLegalScreen(null); window.location.hash=""; }}/>;

  // Reset password modal
  if (showReset) return <ResetPasswordModal token={resetToken} onDone={() => { clearResetFlow(); setScreen("home"); }}/>;

  /* ── STANDALONE PAGES ── */
  if (screen === "home") return (
    <>
      <GS/>
      <ToastContainer/>
      <HomePage
        onBuild={() => setScreen("builder")}
        onPricing={() => setScreen("pricing_standalone")}
        onExample={() => setScreen("example")}
        onHelp={() => setScreen("help")}
        user={user} credits={credits}
        onSignIn={() => setShowAuth(true, "signin")}
        onSignOut={handleSignOut}
      />
      {showAuth && <AuthModal mode={authMode} onSuccess={handleAuthSuccess} onClose={() => setShowAuth(false)}/>}
    </>
  );

  if (screen === "help") return (
    <>
      <GS/>
      <ToastContainer/>
      <HelpPage onHome={() => setScreen("home")}/>
    </>
  );

  if (screen === "example") return (
    <>
      <GS/>
      <ToastContainer/>
      <ExamplePage onBack={() => setScreen("home")} onBuild={() => setScreen("builder")}/>
    </>
  );

  if (screen === "pricing_standalone") return (
    <>
      <GS/>
      <ToastContainer/>
      <PricingPage
        onBuild={() => setScreen("builder")}
        onHome={() => setScreen("home")}
        user={user} credits={credits}
        onSignIn={() => setShowAuth(true, "signin")}
        onSignOut={handleSignOut}
        onPurchase={handlePurchase}
      />
      {showAuth && <AuthModal mode={authMode} onSuccess={handleAuthSuccess} onClose={() => setShowAuth(false)}/>}
    </>
  );

  if (screen === "pricing_wall") return (
    <>
      <GS/>
      <ToastContainer/>
      <PricingWall form={form} onBack={() => setScreen("builder")} onPurchase={handlePurchase}/>
      {showAuth && <AuthModal mode={authMode} onSuccess={handleAuthSuccess} onClose={() => setShowAuth(false)}/>}
    </>
  );

  /* ── SPLIT PANEL (builder / generating / result) ── */
  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column", fontFamily:"'Geist',sans-serif", background:"#f1f5f9" }}>
      <GS/>
      <ToastContainer/>
      {showAuth && <AuthModal mode={authMode} onSuccess={handleAuthSuccess} onClose={() => setShowAuth(false)}/>}

      {/* Top bar */}
      <div style={{ height:50, background:"white", borderBottom:"1px solid #f3f4f6", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 20px", flexShrink:0 }}>
        <div onClick={() => setScreen("home")} style={{ display:"flex", alignItems:"center", gap:7, cursor:"pointer" }}>
          <span style={{ fontSize:15, color:"#9ca3af" }}>←</span>
          <div style={{ width:23, height:23, background:"#f97316", borderRadius:5, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:"white", fontWeight:800 }}>S</div>
          <span style={{ fontSize:13, fontWeight:700, color:"#111827" }}>Landing Page Builder</span>
        </div>
        <div style={{ fontSize:11, color:"#9ca3af" }}>
          {screen==="builder"    && "⚡ Powered by Claude AI"}
          {screen==="generating" && <span style={{ color:"#f97316" }}>⚡ Generating…</span>}
          {screen==="result"     && <span style={{ color:"#16a34a", fontWeight:600 }}>✓ Page Ready — {form.name}</span>}
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          {user ? (
            <>
              <span style={{ fontSize:12, background:"#fff7ed", color:credits<=1?"#dc2626":"#f97316", border:`1px solid ${credits<=1?"#fecaca":"#fed7aa"}`, borderRadius:20, padding:"3px 10px", fontWeight:700 }}>⚡ {credits} credits</span>
              <button onClick={handleSignOut} style={{ fontSize:12, background:"none", border:"1px solid #e5e7eb", borderRadius:6, padding:"4px 10px", cursor:"pointer", color:"#6b7280" }}>Sign out</button>
            </>
          ) : (
            <button onClick={() => setShowAuth(true, "signin")} style={{ fontSize:12, background:"#f97316", color:"white", border:"none", borderRadius:6, padding:"5px 12px", cursor:"pointer", fontWeight:600 }}>Sign In</button>
          )}
        </div>
      </div>

      {/* Split panel */}
      <div style={{ flex:1, display:"grid", gridTemplateColumns:"360px 1fr", overflow:"hidden" }}>
        {/* Left panel */}
        <div style={{ borderRight:"1px solid #e5e7eb", overflow:"hidden", display:"flex", flexDirection:"column", background:"white" }}>
          {screen === "builder" && (
            <BuilderPanel
              form={form}
              up={updateForm}
              togSec={toggleSection}
              ready={!!ready}
              credits={credits}
              user={user}
              onBuyCredits={() => setScreen("pricing_wall")}
              onNext={() => {
                if (user && credits > 0) setScreen("generating");
                else setScreen("pricing_wall");
              }}
            />
          )}
          {screen === "generating" && (
            <div style={{ padding:"22px", display:"flex", flexDirection:"column", height:"100%", overflowY:"auto", background:"white" }}>
              <div style={{ fontSize:12, fontWeight:700, color:"#374151", marginBottom:8 }}>Building your page…</div>
              <ProgressStepper stage={Math.floor(Math.random() * 3)}/>
            </div>
          )}
          {screen === "result" && (
            <ResultScreen
              html={generatedHtml}
              form={form}
              onBuyMoreCredits={() => setScreen("pricing_wall")}
              onReset={() => {
                resetForm();
                setGeneratedHtml("");
                setScreen("builder");
              }}
            />
          )}
        </div>

        {/* Right panel */}
        <div style={{ overflow:"hidden", display:"flex", flexDirection:"column" }}>
          {screen === "builder" && <LivePreview form={form}/>}
          {screen === "generating" && (
            <GeneratingScreen
              form={form}
              onDone={async (html) => {
                await sb.deductCredit();
                await refreshCredits();
                setGeneratedHtml(html);
                setScreen("result");
                toast("🎉 Your page is ready!", "success");
              }}
              onError={(err) => {
                toast(err || "Generation failed — please try again", "error");
                setScreen("builder");
              }}
            />
          )}
          {screen === "result" && (
            <PreviewFrame html={generatedHtml} businessName={form.name}/>
          )}
        </div>
      </div>
    </div>
  );
}
