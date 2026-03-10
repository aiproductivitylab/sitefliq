import { useState, useEffect, useRef } from "react";

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_KEY || "";
const SUPABASE_URL = "https://fcajlfdykudsunczdrex.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYWpsZmR5a3Vkc3VuY3pkcmV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTcwMjYsImV4cCI6MjA4ODIzMzAyNn0.ez9ue4RXqAUzFjG9pBk4sra9zDKC-CCBFC4pbelwGg8";

// Supabase helper
const sb = {
  url: SUPABASE_URL,
  key: SUPABASE_ANON,
  async req(path, opts={}) {
    const r = await fetch(SUPABASE_URL + path, {
      ...opts,
      headers: {
        "apikey": SUPABASE_ANON,
        "Authorization": "Bearer " + (sb._token || SUPABASE_ANON),
        "Content-Type": "application/json",
        "Prefer": opts.prefer || "",
        ...(opts.headers||{})
      }
    });
    const text = await r.text();
    try { return {ok: r.ok, status: r.status, data: JSON.parse(text)}; }
    catch { return {ok: r.ok, status: r.status, data: text}; }
  },
  _token: null,
  _user: null,
  async signUp(email, password) {
    const r = await this.req("/auth/v1/signup", {
      method: "POST",
      body: JSON.stringify({email, password})
    });
    if(r.ok && r.data.access_token) {
      this._token = r.data.access_token;
      this._user = r.data.user;
    }
    return r;
  },
  async signIn(email, password) {
    const r = await this.req("/auth/v1/token?grant_type=password", {
      method: "POST",
      body: JSON.stringify({email, password})
    });
    if(r.ok && r.data.access_token) {
      this._token = r.data.access_token;
      this._user = r.data.user;
      localStorage.setItem("sb_token", r.data.access_token);
      localStorage.setItem("sb_user", JSON.stringify(r.data.user));
    }
    return r;
  },
  async signOut() {
    await this.req("/auth/v1/logout", {method: "POST"});
    this._token = null;
    this._user = null;
    localStorage.removeItem("sb_token");
    localStorage.removeItem("sb_user");
  },
  async getCredits() {
    if(!this._token) return 0;
    const r = await this.req("/rest/v1/credits?select=balance&limit=1");
    if(r.ok && r.data && r.data[0]) return r.data[0].balance;
    return 0;
  },
  async deductCredit() {
    if(!this._token) return false;
    const r = await this.req("/rest/v1/rpc/deduct_credit", {
      method: "POST",
      body: JSON.stringify({}),
      prefer: "return=representation"
    });
    return r.ok;
  },
  restoreSession() {
    try {
      const token = localStorage.getItem("sb_token");
      const user = localStorage.getItem("sb_user");
      if(token && user) {
        this._token = token;
        this._user = JSON.parse(user);
        return true;
      }
    } catch {}
    return false;
  }
};

/* ─────────────────────────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────────────────────────── */
const PALETTES = [
  {id:"noir",   label:"Noir",   bg:"#0a0a0a",surface:"#141414",accent:"#f5f500",text:"#fafafa"},
  {id:"slate",  label:"Slate",  bg:"#0f172a",surface:"#1e293b",accent:"#38bdf8",text:"#f1f5f9"},
  {id:"forest", label:"Forest", bg:"#052e16",surface:"#14532d",accent:"#86efac",text:"#f0fdf4"},
  {id:"ember",  label:"Ember",  bg:"#1c0a00",surface:"#431407",accent:"#fb923c",text:"#fff7ed"},
  {id:"gold",   label:"Gold",   bg:"#0c0a00",surface:"#1c1a00",accent:"#eab308",text:"#fefce8"},
  {id:"clean",  label:"Clean",  bg:"#f8fafc", surface:"#ffffff",accent:"#2563eb",text:"#0f172a"},
];
const VIBES = [
  {id:"bold",     label:"Bold & Powerful",   desc:"Big typography, strong contrast"},
  {id:"elegant",  label:"Elegant & Refined",  desc:"Sophisticated, luxury feel"},
  {id:"energetic",label:"Energetic & Modern", desc:"Dynamic, vibrant energy"},
  {id:"minimal",  label:"Pure Minimal",       desc:"Breathing space, quiet confidence"},
  {id:"warm",     label:"Warm & Friendly",    desc:"Human, approachable, local"},
];
const SECTIONS = [
  {id:"hero",        label:"Hero Banner",      icon:"⚡",locked:true},
  {id:"social_proof",label:"Social Proof Bar", icon:"★",locked:true},
  {id:"services",    label:"Services",         icon:"◈"},
  {id:"about",       label:"About / Story",    icon:"◎"},
  {id:"benefits",    label:"Why Choose Us",    icon:"✦"},
  {id:"testimonials",label:"Testimonials",     icon:"❝"},
  {id:"pricing",     label:"Pricing",          icon:"💰"},
  {id:"gallery",     label:"Gallery",          icon:"▦"},
  {id:"faq",         label:"FAQ",              icon:"?"},
  {id:"booking",     label:"Booking Form",     icon:"📅"},
  {id:"contact",     label:"Contact",          icon:"✉"},
  {id:"cta",         label:"CTA Banner",       icon:"→"},
];
const INDUSTRIES = [
  "Yoga & Fitness","Pilates & Barre","Gym & CrossFit","Personal Training",
  "Beauty & Hair Salon","Nail Studio & Spa","Barbershop","Restaurant & Café",
  "Coffee Shop & Bakery","Photography","Videography","Real Estate Agency",
  "Life Coaching","Business Consulting","Healthcare & Wellness","Dental Practice",
  "Clothing Boutique","Online Store","Education & Tutoring","Tech Startup",
  "Law Firm","Accounting","Event Planning","Catering","Interior Design",
  "Cleaning Services","Landscaping","Automotive","Construction","Other",
];

// 🔑 REPLACE THESE WITH YOUR REAL LEMON SQUEEZY CHECKOUT LINKS
// ── CREDIT PACKS ─────────────────────────────────────────────────────────────
// Your cost per generation: ~$0.25 (Claude API)
// Your profit per credit:   $7–9 after costs
// ─────────────────────────────────────────────────────────────────────────────
const PLANS = [
  {
    id:"starter",
    name:"Starter",
    price:"$19",
    credits:3,
    perPage:"$6.33",
    period:"3 credits · one-time",
    color:"#22c55e",
    badge:null,
    desc:"Try it out, no commitment",
    features:["3 page generations","All styles & colour palettes","Full SEO + conversion copy","Download HTML instantly","Email support","Credits never expire"],
    priceId:"pri_01kjxa8pggzk3j8hekhsadx0pe",
  },
  {
    id:"pro",
    name:"Pro",
    price:"$49",
    credits:10,
    perPage:"$4.90",
    period:"10 credits · one-time",
    color:"#f97316",
    badge:"BEST VALUE",
    desc:"For freelancers & small agencies",
    features:["10 page generations","All styles & colour palettes","Full SEO + conversion copy","Download HTML instantly","No Sitefliq branding","Priority generation speed","Priority support","Credits never expire"],
    priceId:"pri_01kjxachhq3afcqc0gj54x2yq7",
  },
  {
    id:"agency",
    name:"Agency",
    price:"$99",
    credits:25,
    perPage:"$3.96",
    period:"25 credits · one-time",
    color:"#8b5cf6",
    badge:null,
    desc:"Built for agencies & resellers",
    features:["25 page generations","All styles & colour palettes","Full SEO + conversion copy","Download HTML instantly","White-label (no branding)","Priority generation speed","Dedicated support","Credits never expire","Best per-page rate"],
    priceId:"pri_01kjxafb31r7g5gc23se78j10a",
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   PROMPT
───────────────────────────────────────────────────────────────────────────── */
// Unsplash keyword map — niche → best search terms
// Per-section targeted keyword map — each industry has 6 specific searches
// hero, about, gallery1, gallery2, service1, service2
function getSectionKeywords(industry) {
  const map = {
    "Yoga & Fitness":       ["yoga class studio sunlight","yoga instructor teaching","yoga studio interior","woman meditating yoga","yoga pose flexibility","group yoga class"],
    "Pilates & Barre":      ["pilates reformer studio","pilates instructor class","barre workout studio","pilates exercise woman","pilates equipment studio","group pilates class"],
    "Gym & CrossFit":       ["modern gym interior wide","personal trainer coaching","crossfit gym workout","weight lifting gym","gym equipment modern","athletes gym training"],
    "Personal Training":    ["personal trainer client outdoor","fitness trainer coaching","outdoor workout training","personal training session","athlete training park","fitness coaching session"],
    "Beauty & Hair Salon":  ["luxury hair salon interior","hairstylist cutting hair","hair salon modern interior","hair styling professional","salon chair mirror","hair color treatment"],
    "Nail Studio & Spa":    ["nail salon luxury interior","nail technician manicure","spa treatment hands","nail art close up","nail salon modern","manicure pedicure spa"],
    "Barbershop":           ["barber shop interior vintage","barber cutting hair","barbershop chair mirror","barber shave razor","barbershop modern","barber tools scissors"],
    "Restaurant & Café":    ["restaurant interior elegant lighting","chef cooking kitchen","restaurant table setting","fine dining food presentation","restaurant atmosphere candles","waiter serving food"],
    "Coffee Shop & Bakery": ["coffee shop cozy interior","barista making coffee","bakery fresh bread pastries","coffee latte art close up","coffee shop morning light","bakery interior warm"],
    "Photography":          ["photography studio professional lighting","photographer camera shoot","photography studio setup","camera lens close up","photo shoot behind scenes","photographer portrait session"],
    "Videography":          ["video production studio","videographer filming camera","video camera professional","film production set","videography outdoor shoot","video editing studio"],
    "Real Estate Agency":   ["modern luxury home exterior","bright living room interior","luxury kitchen modern","real estate home interior","house architecture modern","luxury property exterior"],
    "Life Coaching":        ["life coaching professional office","coach client meeting","coaching conversation office","professional woman coaching","business coaching session","motivational coaching"],
    "Business Consulting":  ["modern office professional interior","business meeting boardroom","business consulting team","professional office desk","corporate team meeting","business strategy planning"],
    "Healthcare & Wellness":["modern medical clinic interior","doctor patient consultation","healthcare professional clinic","medical office bright","wellness clinic modern","health professional smiling"],
    "Dental Practice":      ["modern dental clinic interior","dentist patient chair","dental office professional","dental equipment modern","dentist smiling professional","dental clinic bright"],
    "Clothing Boutique":    ["fashion boutique interior modern","clothing rack boutique","fashion store interior","clothes shopping boutique","retail fashion store","boutique window display"],
    "Online Store":         ["ecommerce product photography flat lay","product packaging modern","online shopping products","product display minimal","ecommerce flat lay lifestyle","product photography studio"],
    "Education & Tutoring": ["classroom modern bright students","teacher student tutoring","education learning classroom","student studying desk","tutoring session table","school classroom light"],
    "Tech Startup":         ["modern tech office startup","developers coding computers","tech startup office team","open plan office modern","coding laptop coffee","tech team collaboration"],
    "Law Firm":             ["law office professional interior","lawyer desk books","law firm conference room","legal professional office","attorney meeting client","law library books"],
    "Accounting":           ["professional office finance desk","accountant working laptop","business finance office","professional meeting finance","accounting desk documents","financial planning office"],
    "Event Planning":       ["elegant event venue decoration","event planning flowers decor","wedding reception elegant","event styling flowers","gala dinner table setting","event decoration luxury"],
    "Catering":             ["catering food elegant display","chef catering event","catering buffet spread","food catering professional","catering kitchen team","gourmet catering food"],
    "Interior Design":      ["interior design modern living room","interior designer space","luxury home interior design","modern interior architecture","interior design bedroom luxury","designer home open plan"],
    "Cleaning Services":    ["clean modern home interior","professional cleaner working","spotless kitchen clean","cleaning service professional","clean bright home","professional cleaning team"],
    "Landscaping":          ["lush green lawn garden","professional gardener working","beautiful flower garden path","garden landscaping design","garden hedge trimming","manicured lawn outdoor"],
    "Automotive":           ["modern car garage interior","mechanic working on car","car detailing professional","auto repair shop","car service garage","automotive workshop professional"],
    "Construction":         ["construction site professional workers","modern building architecture","construction workers building","architect blueprint planning","new building construction","professional builder site"],
    "Other":                ["professional business office interior","business team meeting","professional workspace modern","business people working","modern office collaboration","professional team workspace"],
  };
  return map[industry] || map["Other"];
}

// Fetch 6 targeted images from Pexels — one per section
async function fetchPexelsImages(industry) {
  const queries = getSectionKeywords(industry);
  const fetchOne = (q) =>
    fetch(`/api/images?query=${encodeURIComponent(q)}&per_page=5&orientation=landscape`)
    .then(r => r.json())
    .then(d => {
      if(d.photos && d.photos.length > 0) {
        // Pick randomly from top 5 for variety across generations
        const pick = d.photos[Math.floor(Math.random() * Math.min(5, d.photos.length))];
        return pick.src.large2x || pick.src.large;
      }
      return null;
    })
    .catch(() => null);

  const results = await Promise.all(queries.map(q => fetchOne(q)));
  return results.filter(Boolean);
}

function buildPrompt(f, images=[]) {
  const pal = PALETTES.find(p=>p.id===f.palette)||PALETTES[0];
  const vib = VIBES.find(v=>v.id===f.vibe)||VIBES[0];
  const secs = f.sections.filter(s=>s!=="hero"&&s!=="social_proof");
  // Images are section-targeted: [hero, about, gallery1, gallery2, service1, service2]
  const [heroImg, aboutImg, galleryImg1, galleryImg2, svcImg1, svcImg2] = images;
  const hasImages = images.length > 0;
  // Fallbacks so every slot has something
  const img = (i) => images[i] || images[0] || null;

  // Build maps HTML as a plain string to avoid nested backtick issues
  const mapsHtml = f.location ? [
    'Address: "' + f.location + '" — you MUST include ALL THREE of these in the contact section:',
    '',
    '1. CLICKABLE MAP IMAGE — a static map image wrapped in a link. Use this exact code:',
    '<a href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(f.location) + '" target="_blank" rel="noopener" style="display:block;border-radius:12px;overflow:hidden;margin-bottom:12px;position:relative;text-decoration:none">',
    '  <img src="https://maps.googleapis.com/maps/api/staticmap?center=' + encodeURIComponent(f.location) + '&zoom=15&size=800x300&scale=2&maptype=roadmap&markers=color:red%7C' + encodeURIComponent(f.location) + '&key=' + GOOGLE_KEY + '" alt="Map of ' + f.location + '" style="width:100%;height:200px;object-fit:cover;display:block;border-radius:12px"/>',
    '  <div style="position:absolute;bottom:10px;right:10px;background:white;border-radius:6px;padding:5px 10px;font-size:12px;font-weight:600;color:#374151;box-shadow:0 2px 8px rgba(0,0,0,.15)">View on Google Maps →</div>',
    '</a>',
    '',
    '2. STREET VIEW LINK:',
    '<a href="https://www.google.com/maps/@?api=1&map_action=pano&query=' + encodeURIComponent(f.location) + '" target="_blank" rel="noopener" style="display:inline-flex;align-items:center;gap:7px;padding:9px 16px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;font-size:13px;font-weight:600;color:#374151;text-decoration:none;margin-bottom:16px">View Street View</a>',
    '',
    '3. PLAIN TEXT ADDRESS:',
    '<a href="https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(f.location) + '" target="_blank" rel="noopener" style="display:flex;align-items:center;gap:8px;color:inherit;text-decoration:none;font-size:14px">📍 ' + f.location + '</a>'
  ].join("\n") : "No address — omit map entirely.";

  // Build prompt as array to avoid nested backtick build errors
  const photosSection = hasImages ? [
    "REAL PHOTOS PROVIDED - each was specifically searched for its section. Use EXACTLY as specified:",
    "",
    "HERO: background-image: url(" + img(0) + ") - full viewport, cover, with dark gradient overlay (rgba 0,0,0,0.6) so text is readable",
    "ABOUT SECTION: <img src=" + img(1) + " style=width:100%;height:100%;object-fit:cover> - full height left column, professional/team photo",
    "GALLERY: Use all of these as <img> tags with object-fit:cover:",
    "  - " + img(0) + " (hero/wide shot)",
    "  - " + img(1) + " (team/people)",
    "  - " + img(2) + " (detail/close up)",
    "  - " + img(3) + " (lifestyle/action)",
    "  - " + img(4) + " (service specific)",
    "  - " + (img(5)||img(0)) + " (service specific 2)",
    "SERVICE CARDS: Each card is a full-bleed image card. Cycle through ALL provided images as background-image per card, with a dark gradient overlay. Use object-fit:cover.",
    "CTA BANNER: background-image: url(" + (img(2)||img(0)) + ") - with dark overlay",
    "",
    "CRITICAL RULES FOR IMAGES:",
    "1. Use the EXACT URLs provided - do NOT modify, shorten or fake them",
    "2. Every image tag must have object-fit:cover and a defined height",
    "3. Hero and CTA must always have a dark overlay so text is readable",
    "4. Do NOT use placeholder.com, picsum, or any other image service",
    "5. Gallery items must use <img> tags not background-image"
  ].join("\n") : "IMAGES: Use CSS gradients and geometric patterns. No external images.";

  const heroNote = heroImg ? " - use hero background image with dark overlay" : " - stunning CSS gradient/geometric pattern";

  const secsPrompt = secs.map((s,i) => {
    const n = i+5;
    const secMap = {
      services: n+". SERVICES: 6 cards in a 3-col grid, each with icon, name, description, price, hover glow effect"+(hasImages?" - subtle image texture in card background":""),
      about: n+". ABOUT: 2-col layout"+(aboutImg?", left col = full image ("+aboutImg+") with rounded corners, right col = story text + 4 stats":", story left, 4 stats right"),
      benefits: n+". BENEFITS: 6-item grid, icon+title+desc, niche-specific",
      testimonials: n+". TESTIMONIALS: 3 realistic reviews, name+location+stars+quote",
      pricing: n+". PRICING: 3 tiers, feature lists, Most Popular badge",
      gallery: n+". GALLERY: "+(hasImages?"6-item CSS grid using these real images: "+[galleryImg1,galleryImg2,galleryImg3,galleryImg4,heroImg,aboutImg].filter(Boolean).join(", ")+" - each as object-fit cover, caption overlay on hover":"6-item CSS grid, gradient placeholders, caption hover"),
      faq: n+". FAQ: 5 accordion items with JS click-to-expand",
      booking: n+". BOOKING: full form with name/email/phone/service/date/message",
      contact: n+". CONTACT: split layout, info left, form right",
      cta: n+". CTA BANNER: full-width urgent headline + big button"+(heroImg?" - background image with dark overlay":""),
    };
    return secMap[s] || (n+". "+s.toUpperCase());
  }).join("\n");

  return [
    "You are a senior CRO expert and world-class web designer. Build a complete, production-ready, single-file HTML landing page.",
    "",
    "BUSINESS:",
    "Name: "+f.name,
    "Industry: "+f.industry,
    "Tagline: "+(f.tagline||"Quality you can trust"),
    "Description: "+f.description,
    "Location: "+(f.location||""),
    "Phone: "+(f.phone||""),
    "Email: "+(f.email||""),
    "CTA: "+(f.cta||"Get Started Today"),
    f.logo ? "LOGO: A base64 logo image is provided. Embed it as <img src=\""+f.logo+"\" alt=\""+f.name+" logo\"> in the header (height:48px, object-fit:contain) AND footer (height:36px). Always show the logo prominently." : "LOGO: No logo provided — use a styled text logo with the business name in the accent colour instead.",
    "",
    "DESIGN:",
    "Palette bg:"+pal.bg+" surface:"+pal.surface+" accent:"+pal.accent+" text:"+pal.text,
    f.importedColours && f.importedColours.length ? "BRAND COLOURS EXTRACTED FROM EXISTING SITE — use these as the primary palette, overriding the default palette above: " + f.importedColours.join(", ") : "",
    "Vibe: "+vib.label+" - "+vib.desc,
    "Font: ONE distinctive Google Font pair (NOT Inter/Roboto - something memorable for this vibe)",
    "",
    photosSection,
    "",
    "SECTIONS:",
    "1. Full SEO <head>: title, meta description, keywords, OG tags, Twitter card, canonical, schema.org LocalBusiness JSON-LD",
    "2. Sticky header: logo/name left, nav right, mobile hamburger",
    "3. Hero: 100vh, H1 with keyword, subheadline, 2 CTAs, star rating trust line"+heroNote,
    "4. Social proof bar: 4 animated counter stats (use JS to count up from 0 on page load)",
    secsPrompt,
    "- Footer: logo, tagline, 3 link columns, social icons, copyright 2026",
    "",
    "GOOGLE MAPS:",
    mapsHtml,
    "",
    "ANIMATIONS — REQUIRED:",
    "1. On page load: fade-up each section as it enters viewport using IntersectionObserver with CSS classes",
    "2. Hero: headline animates in with a typewriter or slide-up effect on load",
    "3. Stats counter: count up from 0 to final value over 2s when section scrolls into view",
    "4. CTA buttons: subtle pulse/glow animation on hover + scale(1.04) transform",
    "5. Cards/service boxes: lift up on hover with box-shadow and translateY(-6px)",
    "6. Nav: smooth scroll to sections, highlight active nav item on scroll",
    "7. Sticky header: add backdrop-blur and subtle shadow after scrolling 80px",
    "8. Images: fade in with a slight zoom effect when they load",
    "9. Mobile menu: slide down smoothly with CSS transition",
    "10. Use CSS @keyframes for all animations — no external libraries",
    "",
    "RULES:",
    "1. CSS in <style>, JS in <script> at bottom. One Google Fonts @import only.",
    "2. Real niche-specific copy. Zero lorem ipsum.",
    "3. Conversion: urgency, social proof, 5+ CTAs, trust signals throughout.",
    "4. One H1 with keyword, descriptive H2s, semantic HTML.",
    "5. Working JS accordion for FAQ. Working hamburger menu. Mobile-first responsive.",
    "6. All images must use object-fit:cover with appropriate container heights.",
    "7. Hero image overlay: always add a dark semi-transparent overlay so text is readable.",
    "8. If address provided, ALWAYS include the static map image (clickable), street view link, and plain text address.",
    "",
    "OUTPUT: Raw HTML only. Start with <!DOCTYPE html>. End with </html>. Nothing else."
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
    @keyframes slideIn{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
    @keyframes shimmer{0%{background-position:-400px 0}100%{background-position:400px 0}}
    @keyframes popIn{from{opacity:0;transform:scale(.94)}to{opacity:1;transform:scale(1)}}
    @keyframes glow{0%,100%{box-shadow:0 0 20px #f9731640}50%{box-shadow:0 0 40px #f9731680}}
    textarea:focus,input:focus,select:focus{outline:none}
    ::-webkit-scrollbar{width:3px}
    ::-webkit-scrollbar-thumb{background:#e5e7eb;border-radius:3px}
  `}</style>
);

/* ─────────────────────────────────────────────────────────────────────────────
   TYPEWRITER
───────────────────────────────────────────────────────────────────────────── */
function TW({words,color="#f97316"}) {
  const [txt,set]=useState(""); const [wi,setWi]=useState(0);
  const [ci,setCi]=useState(0); const [del,setDel]=useState(false);
  useEffect(()=>{
    const w=words[wi];
    const t=setTimeout(()=>{
      if(!del){set(w.slice(0,ci+1));if(ci+1===w.length)setTimeout(()=>setDel(true),2000);else setCi(c=>c+1);}
      else{set(w.slice(0,ci-1));if(ci-1===0){setDel(false);setWi(i=>(i+1)%words.length);setCi(0);}else setCi(c=>c-1);}
    },del?30:75);
    return()=>clearTimeout(t);
  },[ci,del,wi,words]);
  return <span style={{color}}>{txt}<span style={{animation:"blink 1s infinite",color}}>|</span></span>;
}

/* ─────────────────────────────────────────────────────────────────────────────
   FIELD COMPONENT
───────────────────────────────────────────────────────────────────────────── */
function Field({label,value,onChange,placeholder,required}) {
  return (
    <div>
      <label style={{fontSize:11,fontWeight:700,color:"#374151",letterSpacing:.5,display:"block",marginBottom:6,textTransform:"uppercase"}}>{label}{required&&<span style={{color:"#f97316"}}> *</span>}</label>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{width:"100%",padding:"10px 13px",border:"1.5px solid #e5e7eb",borderRadius:9,fontSize:13,color:"#111827",background:"white",transition:"border-color .15s",fontFamily:"inherit"}}
        onFocus={e=>e.target.style.borderColor="#f97316"}
        onBlur={e=>e.target.style.borderColor="#e5e7eb"}
      />
    </div>
  );
}


/* ───────────────────────────────────────────────────────────────────────────────
   WEBSITE IMPORTER
─────────────────────────────────────────────────────────────────────────────── */
function WebsiteImporter({onImport}) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [msg, setMsg] = useState("");

  const handleImport = async () => {
    if(!url.trim()) return;
    setLoading(true); setStatus(null); setMsg("");
    try {
      const r = await fetch("/api/scrape-website", {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({url:url.trim()})
      });
      const data = await r.json();
      if(data.success) {
        onImport(data);
        setStatus("success");
        setMsg("Branding imported! Logo, colours and info auto-filled below.");
      } else {
        setStatus("error");
        setMsg(data.error || "Couldn't extract branding from that site.");
      }
    } catch(e) {
      setStatus("error");
      setMsg("Network error — please try again.");
    }
    setLoading(false);
  };

  return (
    <div style={{background:"linear-gradient(135deg,#fff7ed,#fffbf5)",border:"1.5px solid #fed7aa",borderRadius:12,padding:"14px 16px",marginBottom:4}}>
      <div style={{fontSize:11,fontWeight:700,color:"#f97316",letterSpacing:.5,textTransform:"uppercase",marginBottom:8}}>✨ Import from existing website</div>
      <div style={{display:"flex",gap:8}}>
        <input value={url} onChange={e=>setUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&handleImport()} placeholder="yourwebsite.com"
          style={{flex:1,padding:"9px 12px",border:"1.5px solid #fed7aa",borderRadius:8,fontSize:13,outline:"none",fontFamily:"inherit",background:"white"}}
          onFocus={e=>e.target.style.borderColor="#f97316"} onBlur={e=>e.target.style.borderColor="#fed7aa"}/>
        <button onClick={handleImport} disabled={loading||!url.trim()}
          style={{padding:"9px 16px",background:loading||!url.trim()?"#e5e7eb":"#f97316",color:loading||!url.trim()?"#9ca3af":"white",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:loading||!url.trim()?"not-allowed":"pointer",fontFamily:"inherit",whiteSpace:"nowrap",transition:"background .15s"}}>
          {loading ? "⏳ Scanning…" : "Import →"}
        </button>
      </div>
      {status && <div style={{marginTop:8,fontSize:12,color:status==="success"?"#16a34a":"#dc2626"}}>{status==="success"?"✅":"⚠️"} {msg}</div>}
      {!status && <div style={{marginTop:6,fontSize:11,color:"#9ca3af"}}>Auto-extracts your logo, brand colours & business info</div>}
    </div>
  );
}


/* ───────────────────────────────────────────────────────────────────────────────
   LOGO UPLOAD FIELD
─────────────────────────────────────────────────────────────────────────────── */
function LogoUpload({value, onChange}) {
  const ref = useRef();
  const handleFile = (e) => {
    const file = e.target.files[0];
    if(!file) return;
    if(file.size > 500000) { alert("Logo must be under 500KB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => onChange(ev.target.result);
    reader.readAsDataURL(file);
  };
  return (
    <div>
      <label style={{fontSize:11,fontWeight:700,color:"#374151",letterSpacing:.5,display:"block",marginBottom:6,textTransform:"uppercase"}}>
        Logo <span style={{fontSize:9,color:"#9ca3af",fontWeight:400,textTransform:"none"}}>— optional, embedded in page</span>
      </label>
      <div onClick={()=>ref.current.click()} style={{border:"1.5px dashed #e5e7eb",borderRadius:9,padding:"10px 13px",cursor:"pointer",display:"flex",alignItems:"center",gap:10,background:"#fafaf9",transition:"border-color .15s",minHeight:44}}
        onMouseEnter={e=>e.currentTarget.style.borderColor="#f97316"}
        onMouseLeave={e=>e.currentTarget.style.borderColor="#e5e7eb"}>
        {value ? (
          <>
            <img src={value} alt="logo" style={{height:28,maxWidth:80,objectFit:"contain",borderRadius:4}}/>
            <span style={{fontSize:12,color:"#6b7280",flex:1}}>Logo uploaded</span>
            <span onClick={e=>{e.stopPropagation();onChange("");}} style={{fontSize:11,color:"#ef4444",cursor:"pointer",padding:"2px 6px",border:"1px solid #fecaca",borderRadius:4}}>Remove</span>
          </>
        ) : (
          <>
            <span style={{fontSize:18}}>🖼️</span>
            <span style={{fontSize:12,color:"#9ca3af"}}>Upload logo (PNG, JPG, SVG, max 500KB)</span>
          </>
        )}
      </div>
      <input ref={ref} type="file" accept="image/*" onChange={handleFile} style={{display:"none"}}/>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────────
   ADDRESS FIELD WITH GOOGLE PLACES AUTOCOMPLETE
─────────────────────────────────────────────────────────────────────────────── */
function AddressField({value, onChange}) {
  const [query, setQuery] = useState(value||"");
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const wrapRef = useRef(null);
  const sessionToken = useRef(Math.random().toString(36).substr(2,9));

  useEffect(() => {
    const handler = (e) => { if(wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => { setQuery(value||""); }, [value]);

  // Load Google Places SDK once
  useEffect(() => {
    if(window.google && window.google.maps && window.google.maps.places) return;
    const existing = document.getElementById("google-places-script");
    if(existing) return;
    const script = document.createElement("script");
    script.id = "google-places-script";
    script.src = "https://maps.googleapis.com/maps/api/js?key=" +
      GOOGLE_KEY +
      "&libraries=places&language=en";
    script.async = true;
    document.head.appendChild(script);
  }, []);

  const fetchSuggestions = (input) => {
    if(!input || input.length < 3) { setSuggestions([]); setOpen(false); return; }
    setLoading(true);
    const tryFetch = (attempts=0) => {
      if(window.google && window.google.maps && window.google.maps.places) {
        const svc = new window.google.maps.places.AutocompleteService();
        svc.getPlacePredictions(
          { input, sessionToken: new window.google.maps.places.AutocompleteSessionToken() },
          (preds, status) => {
            setLoading(false);
            if(status === "OK" && preds) {
              setSuggestions(preds.slice(0,5));
              setOpen(true);
            } else {
              setSuggestions([]);
              setOpen(false);
            }
          }
        );
      } else if(attempts < 20) {
        setTimeout(() => tryFetch(attempts+1), 200);
      } else {
        setLoading(false);
      }
    };
    tryFetch();
  };

  const handleInput = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 350);
  };

  const handleSelect = (pred) => {
    const address = pred.description;
    setQuery(address);
    onChange(address);
    setSuggestions([]);
    setOpen(false);
    sessionToken.current = Math.random().toString(36).substr(2,9);
  };

  const highlightText = (text, matches) => {
    if(!matches || matches.length === 0) return text;
    const parts = [];
    let i = 0;
    for(const m of matches) {
      if(m.offset > i) parts.push(text.slice(i, m.offset));
      parts.push(<strong key={"m"+m.offset} style={{color:"#111827",fontWeight:700}}>{text.slice(m.offset, m.offset+m.length)}</strong>);
      i = m.offset + m.length;
    }
    if(i < text.length) parts.push(text.slice(i));
    return parts;
  };

  return (
    <div ref={wrapRef} style={{position:"relative"}}>
      <label style={{fontSize:11,fontWeight:700,color:"#374151",letterSpacing:.5,display:"block",marginBottom:6,textTransform:"uppercase"}}>
        Address{"  "}<span style={{color:"#9ca3af",fontWeight:400,textTransform:"none",fontSize:10,letterSpacing:0}}>adds map + Street View to page</span>
      </label>
      <div style={{position:"relative"}}>
        <input
          value={query}
          onChange={handleInput}
          onFocus={e=>{e.target.style.borderColor="#f97316"; if(suggestions.length>0) setOpen(true);}}
          onBlur={e=>e.target.style.borderColor="#e5e7eb"}
          placeholder="123 Main St, New York, NY"
          autoComplete="off"
          style={{width:"100%",padding:"10px 36px 10px 13px",border:"1.5px solid #e5e7eb",borderRadius:9,fontSize:13,color:"#111827",background:"white",transition:"border-color .15s",fontFamily:"inherit",outline:"none"}}
        />
        <div style={{position:"absolute",right:11,top:"50%",transform:"translateY(-50%)",pointerEvents:"none",fontSize:13,lineHeight:1}}>
          {loading ? <span style={{display:"inline-block",animation:"spin .7s linear infinite",color:"#9ca3af"}}>◌</span> : "📍"}
        </div>
      </div>

      {open && suggestions.length > 0 && (
        <div style={{position:"absolute",top:"calc(100% + 4px)",left:0,right:0,background:"white",border:"1.5px solid #e5e7eb",borderRadius:10,boxShadow:"0 8px 28px rgba(0,0,0,.13)",zIndex:9999,overflow:"hidden"}}>
          {suggestions.map((pred, i) => {
            const main = pred.structured_formatting ? pred.structured_formatting.main_text : pred.description;
            const secondary = pred.structured_formatting ? pred.structured_formatting.secondary_text : "";
            const mainMatches = pred.structured_formatting ? (pred.structured_formatting.main_text_matched_substrings || []) : [];
            return (
              <div
                key={pred.place_id}
                onMouseDown={()=>handleSelect(pred)}
                style={{padding:"10px 14px",cursor:"pointer",borderBottom:i<suggestions.length-1?"1px solid #f9fafb":"none",display:"flex",alignItems:"center",gap:10,background:"white"}}
                onMouseEnter={e=>e.currentTarget.style.background="#fff7ed"}
                onMouseLeave={e=>e.currentTarget.style.background="white"}
              >
                <div style={{width:30,height:30,background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,flexShrink:0}}>📍</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,color:"#6b7280",whiteSpace:"normal",lineHeight:1.3}}>
                    {highlightText(main, mainMatches)}
                  </div>
                  {secondary && <div style={{fontSize:11,color:"#9ca3af",marginTop:2,whiteSpace:"normal",lineHeight:1.3}}>{secondary}</div>}
                </div>
                <div style={{fontSize:11,color:"#d1d5db",flexShrink:0}}>select</div>
              </div>
            );
          })}
          <div style={{padding:"6px 14px",background:"#f9fafb",borderTop:"1px solid #f3f4f6",display:"flex",justifyContent:"flex-end"}}>
            <img src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png" alt="Powered by Google" style={{height:13,opacity:.65}}/>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   LIVE MINI PREVIEW
───────────────────────────────────────────────────────────────────────────── */
function LivePreview({form}) {
  const pal=PALETTES.find(p=>p.id===form.palette)||PALETTES[0];
  const filled=form.name||form.industry;
  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:28,background:"#f1f5f9"}}>
      {!filled ? (
        <div style={{textAlign:"center",color:"#9ca3af"}}>
          <div style={{fontSize:44,marginBottom:14,opacity:.3}}>✦</div>
          <div style={{fontSize:13,fontWeight:600,color:"#6b7280",marginBottom:6}}>Preview appears here</div>
          <div style={{fontSize:12}}>Fill in your business details</div>
        </div>
      ):(
        <div style={{width:"100%",maxWidth:500,animation:"popIn .4s ease"}}>
          <div style={{background:"#e2e8f0",borderRadius:"10px 10px 0 0",padding:"9px 14px",display:"flex",alignItems:"center",gap:8}}>
            <div style={{display:"flex",gap:5}}>{["#ef4444","#f59e0b","#22c55e"].map(c=><div key={c} style={{width:9,height:9,borderRadius:"50%",background:c}}/>)}</div>
            <div style={{flex:1,background:"white",borderRadius:20,padding:"4px 11px",fontSize:10,color:"#6b7280"}}>🔒 {(form.name||"yourbusiness").toLowerCase().replace(/\s+/g,"-")}.com</div>
          </div>
          <div style={{background:pal.bg,borderRadius:"0 0 10px 10px",overflow:"hidden",boxShadow:"0 16px 50px rgba(0,0,0,.12)"}}>
            <div style={{padding:"10px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${pal.accent}22`}}>
              <span style={{fontWeight:800,color:pal.accent,fontSize:12}}>{form.name||"Business"}</span>
              <div style={{display:"flex",gap:8,fontSize:8,color:pal.text+"55",alignItems:"center"}}>
                {["Services","About","Contact"].map(l=><span key={l}>{l}</span>)}
                <span style={{background:pal.accent,color:pal.bg,padding:"2px 8px",borderRadius:3,fontSize:8,fontWeight:700}}>{form.cta||"Get Started"}</span>
              </div>
            </div>
            <div style={{background:`linear-gradient(135deg,${pal.bg},${pal.surface})`,padding:"28px 18px 20px",textAlign:"center"}}>
              <div style={{fontSize:7,letterSpacing:2,color:pal.accent+"77",textTransform:"uppercase",marginBottom:6}}>{form.industry||"Your Industry"}</div>
              <div style={{fontWeight:800,color:pal.accent,fontSize:16,lineHeight:1.1,marginBottom:6}}>{form.name||"Your Business"}</div>
              <div style={{fontSize:8,color:pal.text+"44",maxWidth:180,margin:"0 auto 12px",lineHeight:1.5}}>{form.tagline||"Your tagline here"}</div>
              <div style={{display:"flex",gap:6,justifyContent:"center"}}>
                <div style={{background:pal.accent,color:pal.bg,padding:"4px 12px",borderRadius:4,fontSize:8,fontWeight:700}}>{form.cta||"Get Started"}</div>
                <div style={{border:`1px solid ${pal.accent}44`,color:pal.accent,padding:"4px 12px",borderRadius:4,fontSize:8}}>Learn More</div>
              </div>
            </div>
            <div style={{background:pal.surface,padding:"10px 18px",display:"flex",flexDirection:"column",gap:5}}>
              {form.sections.filter(s=>s!=="hero").slice(0,5).map(s=>(
                <div key={s} style={{background:pal.accent+"08",border:`1px solid ${pal.accent}14`,borderRadius:4,padding:"6px 9px",display:"flex",alignItems:"center",gap:7}}>
                  <span style={{fontSize:6,color:pal.accent+"55",textTransform:"uppercase",letterSpacing:1,flex:1}}>{s.replace("_"," ")}</span>
                  <div style={{display:"flex",gap:2}}>{[70,50,85].map((w,i)=><div key={i} style={{height:2,width:w*0.22,background:pal.accent+"18",borderRadius:2}}/>)}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{marginTop:10,display:"flex",justifyContent:"space-between",fontSize:10,color:"#9ca3af",padding:"0 2px"}}>
            <span>{form.sections.length} sections</span>
            <span style={{color:pal.accent}}>{form.palette} · {form.vibe}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   BUILDER PANEL (left side)
───────────────────────────────────────────────────────────────────────────── */
function BuilderPanel({form,up,togSec,onNext,ready}) {
  const [tab,setTab]=useState("info");
  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:"white"}}>
      <div style={{padding:"18px 22px 0",borderBottom:"1px solid #f3f4f6"}}>
        <div style={{display:"flex",alignItems:"center",gap:9,marginBottom:14}}>
          <div style={{width:30,height:30,background:"#fff7ed",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15}}>✦</div>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:"#111827"}}>Let's build something amazing</div>
            <div style={{fontSize:11,color:"#9ca3af"}}>Fill in your details below</div>
          </div>
        </div>
        <div style={{display:"flex",gap:0}}>
          {[["info","Business"],["style","Style"],["sections","Sections"]].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{padding:"7px 14px",fontSize:12,fontWeight:tab===id?700:400,color:tab===id?"#f97316":"#6b7280",background:"transparent",border:"none",borderBottom:tab===id?"2px solid #f97316":"2px solid transparent",cursor:"pointer",transition:"all .15s",fontFamily:"inherit"}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto",padding:"18px 22px"}}>
        {tab==="info"&&(
          <div style={{display:"flex",flexDirection:"column",gap:13}}>
            <WebsiteImporter onImport={data=>{
              if(data.logo) up("logo", data.logo);
              if(data.title) up("name", data.title.replace(/\s*[|\-–].*/,"").trim());
              if(data.description) up("description", data.description);
              if(data.colours && data.colours.length) up("importedColours", data.colours);
            }}/>
            <LogoUpload value={form.logo} onChange={v=>up("logo",v)}/>
            <Field label="Business Name" required value={form.name} onChange={v=>up("name",v)} placeholder="e.g. Green Haven Garden Services"/>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#374151",letterSpacing:.5,display:"block",marginBottom:6,textTransform:"uppercase"}}>Industry <span style={{color:"#f97316"}}>*</span></label>
              <select value={form.industry} onChange={e=>up("industry",e.target.value)} style={{width:"100%",padding:"10px 13px",border:"1.5px solid #e5e7eb",borderRadius:9,fontSize:13,color:form.industry?"#111827":"#9ca3af",background:"white",cursor:"pointer",fontFamily:"inherit"}}
                onFocus={e=>e.target.style.borderColor="#f97316"}
                onBlur={e=>e.target.style.borderColor="#e5e7eb"}>
                <option value="">Select your industry…</option>
                {INDUSTRIES.map(i=><option key={i}>{i}</option>)}
              </select>
            </div>
            <Field label="Tagline" value={form.tagline} onChange={v=>up("tagline",v)} placeholder="e.g. Beautiful gardens, one yard at a time"/>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#374151",letterSpacing:.5,display:"block",marginBottom:6,textTransform:"uppercase"}}>Describe your business <span style={{color:"#f97316"}}>*</span> <span style={{color:"#f97316",fontSize:9,fontWeight:400}}>— more detail = better page</span></label>
              <textarea value={form.description} onChange={e=>up("description",e.target.value)} rows={4} placeholder="What do you offer? Who are your clients? What makes you different? Include services, prices, unique selling points…"
                style={{width:"100%",padding:"10px 13px",border:"1.5px solid #e5e7eb",borderRadius:9,fontSize:13,color:"#111827",background:"white",resize:"none",lineHeight:1.6,fontFamily:"inherit",transition:"border-color .15s"}}
                onFocus={e=>e.target.style.borderColor="#f97316"}
                onBlur={e=>e.target.style.borderColor="#e5e7eb"}
              />
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <AddressField value={form.location} onChange={v=>up("location",v)}/>
              <Field label="CTA Button" value={form.cta} onChange={v=>up("cta",v)} placeholder="Get Started Today"/>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Field label="Phone" value={form.phone} onChange={v=>up("phone",v)} placeholder="+27 82 123 4567"/>
              <Field label="Email" value={form.email} onChange={v=>up("email",v)} placeholder="hello@business.com"/>
            </div>
          </div>
        )}

        {tab==="style"&&(
          <div style={{display:"flex",flexDirection:"column",gap:22}}>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#374151",letterSpacing:.5,display:"block",marginBottom:10,textTransform:"uppercase"}}>Colour Palette</label>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                {PALETTES.map(p=>(
                  <div key={p.id} onClick={()=>up("palette",p.id)} style={{borderRadius:10,overflow:"hidden",cursor:"pointer",border:form.palette===p.id?`2px solid ${p.accent}`:"2px solid #e5e7eb",boxShadow:form.palette===p.id?`0 0 12px ${p.accent}44`:"none",transition:"all .2s"}}>
                    <div style={{height:32,background:`linear-gradient(135deg,${p.bg},${p.surface})`,display:"flex",alignItems:"flex-end",padding:"0 6px 4px"}}>
                      <div style={{width:18,height:3,background:p.accent,borderRadius:2}}/>
                    </div>
                    <div style={{padding:"4px 8px",background:"white",fontSize:10,fontWeight:600,color:form.palette===p.id?"#f97316":"#374151"}}>{p.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:700,color:"#374151",letterSpacing:.5,display:"block",marginBottom:10,textTransform:"uppercase"}}>Design Vibe</label>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {VIBES.map(v=>(
                  <div key={v.id} onClick={()=>up("vibe",v.id)} style={{padding:"9px 12px",borderRadius:8,cursor:"pointer",border:form.vibe===v.id?"1.5px solid #f97316":"1.5px solid #e5e7eb",background:form.vibe===v.id?"#fff7ed":"white",display:"flex",alignItems:"center",justifyContent:"space-between",transition:"all .15s"}}>
                    <div>
                      <div style={{fontSize:12,fontWeight:600,color:form.vibe===v.id?"#ea580c":"#111827"}}>{v.label}</div>
                      <div style={{fontSize:11,color:"#9ca3af",marginTop:1}}>{v.desc}</div>
                    </div>
                    <div style={{width:15,height:15,borderRadius:"50%",border:`2px solid ${form.vibe===v.id?"#f97316":"#d1d5db"}`,background:form.vibe===v.id?"#f97316":"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {form.vibe===v.id&&<div style={{width:5,height:5,borderRadius:"50%",background:"white"}}/>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab==="sections"&&(
          <div>
            <p style={{fontSize:12,color:"#6b7280",marginBottom:12,lineHeight:1.5}}>Choose which sections to include. Hero & Social Proof always included.</p>
            <div style={{display:"flex",flexDirection:"column",gap:5}}>
              {SECTIONS.map(s=>(
                <div key={s.id} onClick={()=>!s.locked&&togSec(s.id)} style={{padding:"8px 11px",borderRadius:8,cursor:s.locked?"default":"pointer",display:"flex",alignItems:"center",gap:9,border:form.sections.includes(s.id)?"1.5px solid #f97316":"1.5px solid #e5e7eb",background:form.sections.includes(s.id)?"#fff7ed":"white",transition:"all .15s"}}>
                  <span style={{fontSize:14,width:18,textAlign:"center",flexShrink:0}}>{s.icon}</span>
                  <span style={{flex:1,fontSize:12,fontWeight:500,color:form.sections.includes(s.id)?"#ea580c":"#374151"}}>{s.label}</span>
                  {s.locked
                    ? <span style={{fontSize:9,color:"#d1d5db",background:"#f9fafb",padding:"2px 6px",borderRadius:4,border:"1px solid #e5e7eb"}}>Always on</span>
                    : <div style={{width:15,height:15,borderRadius:4,border:`2px solid ${form.sections.includes(s.id)?"#f97316":"#d1d5db"}`,background:form.sections.includes(s.id)?"#f97316":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:9,color:"white",fontWeight:900,flexShrink:0}}>
                        {form.sections.includes(s.id)&&"✓"}
                      </div>
                  }
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CTA */}
      <div style={{padding:"14px 22px",borderTop:"1px solid #f3f4f6",background:"white"}}>
        <button onClick={onNext} disabled={!ready} style={{width:"100%",padding:"13px",background:ready?"#f97316":"#e5e7eb",color:ready?"white":"#9ca3af",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:ready?"pointer":"not-allowed",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"all .2s",animation:ready?"glow 3s ease-in-out infinite":"none"}}>
          <span>✦</span> {ready?"See Pricing & Continue →":"Fill in required fields first"}
        </button>
        {!ready&&<div style={{marginTop:7,fontSize:11,color:"#f97316",textAlign:"center"}}>
          Missing: {[!form.name&&"Name",!form.industry&&"Industry",!form.description&&"Description"].filter(Boolean).join(", ")}
        </div>}
        <div style={{marginTop:9,display:"flex",justifyContent:"center",gap:14,fontSize:10,color:"#9ca3af"}}>
          <span>✓ Real photos included</span><span>✓ SEO optimised</span><span>✓ Mobile ready</span>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   PRICING WALL — shown BEFORE generation
───────────────────────────────────────────────────────────────────────────── */
function PricingWall({form, onBack, onPurchase}) {
  const pal=PALETTES.find(p=>p.id===form.palette)||PALETTES[0];
  return (
    <div style={{minHeight:"100vh",background:"#fafaf9",fontFamily:"'Geist',sans-serif"}}>
      <GS/>
      {/* Top bar */}
      <div style={{height:52,background:"white",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 24px",position:"sticky",top:0,zIndex:10}}>
        <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"transparent",border:"none",cursor:"pointer",fontSize:13,color:"#6b7280",fontFamily:"inherit"}}>
          ← Back to builder
        </button>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <div style={{width:24,height:24,background:"#f97316",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"white",fontWeight:800}}>S</div>
          <span style={{fontSize:14,fontWeight:800,color:"#111827"}}>Sitefliq</span>
        </div>
        <div style={{width:100}}/>
      </div>

      <div style={{maxWidth:900,margin:"0 auto",padding:"40px 24px 60px"}}>

        {/* Page summary */}
        <div style={{background:"white",border:"1px solid #f3f4f6",borderRadius:16,padding:"20px 24px",marginBottom:36,display:"flex",alignItems:"center",gap:16,boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
          <div style={{width:48,height:48,background:`linear-gradient(135deg,${pal.bg},${pal.surface})`,borderRadius:10,border:`2px solid ${pal.accent}33`,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{fontSize:20,color:pal.accent}}>✦</span>
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:16,fontWeight:800,color:"#111827",marginBottom:2}}>{form.name}</div>
            <div style={{fontSize:12,color:"#6b7280"}}>{form.industry} · {form.sections.length} sections · {form.palette} palette · {form.vibe} vibe</div>
          </div>
          <div style={{display:"flex",gap:12,fontSize:11}}>
            {["SEO Ready","Mobile","Niche Copy"].map(t=>(
              <div key={t} style={{display:"flex",alignItems:"center",gap:4,color:"#16a34a"}}>
                <span style={{fontWeight:700}}>✓</span>{t}
              </div>
            ))}
          </div>
        </div>

        {/* Headline */}
        <div style={{textAlign:"center",marginBottom:36}}>
          <div style={{fontSize:11,fontWeight:700,color:"#f97316",letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>ONE LAST STEP</div>
          <h1 style={{fontSize:"clamp(26px,4vw,40px)",fontWeight:800,color:"#111827",marginBottom:10,fontFamily:"'Instrument Serif',serif",fontStyle:"italic"}}>
            Your page is ready to generate
          </h1>
          <p style={{fontSize:15,color:"#6b7280",maxWidth:480,margin:"0 auto",lineHeight:1.7}}>
            Choose a plan below to generate and download your <strong style={{color:"#111827"}}>{form.name}</strong> landing page.
          </p>
        </div>

        {/* Plans */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:18,marginBottom:36}}>
          {PLANS.map(plan=>(
            <div key={plan.id} style={{background:"white",borderRadius:16,padding:"28px 24px",position:"relative",border:plan.badge?`2px solid ${plan.color}`:"1px solid #e5e7eb",boxShadow:plan.badge?`0 4px 30px ${plan.color}18`:"0 1px 3px rgba(0,0,0,.04)",transition:"transform .2s,box-shadow .2s"}}
              onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow=plan.badge?`0 8px 40px ${plan.color}28`:"0 8px 24px rgba(0,0,0,.08)";}}
              onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=plan.badge?`0 4px 30px ${plan.color}18`:"0 1px 3px rgba(0,0,0,.04)";}}>
              {plan.badge&&<div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:plan.color,color:"white",padding:"3px 14px",borderRadius:100,fontSize:9,fontWeight:800,letterSpacing:1.5,whiteSpace:"nowrap"}}>{plan.badge}</div>}

              <div style={{fontSize:10,fontWeight:700,color:plan.color,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>{plan.name}</div>

              {/* Credit counter — big and prominent */}
              <div style={{background:`${plan.color}10`,border:`1px solid ${plan.color}30`,borderRadius:10,padding:"14px 16px",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontSize:11,color:plan.color,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:2}}>Credits included</div>
                  <div style={{fontSize:36,fontWeight:800,color:"#111827",lineHeight:1,fontFamily:"'Instrument Serif',serif"}}>{plan.credits}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:11,color:"#9ca3af",marginBottom:2}}>per page</div>
                  <div style={{fontSize:16,fontWeight:700,color:plan.color}}>{plan.perPage}</div>
                </div>
              </div>

              <div style={{marginBottom:4,display:"flex",alignItems:"baseline",gap:6}}>
                <span style={{fontSize:38,fontWeight:800,color:"#111827",fontFamily:"'Instrument Serif',serif"}}>{plan.price}</span>
                <span style={{fontSize:12,color:"#9ca3af"}}>one-time · no subscription</span>
              </div>
              <div style={{fontSize:11,color:"#6b7280",marginBottom:16}}>{plan.desc}</div>

              <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:20}}>
                {plan.features.map(f=>(
                  <div key={f} style={{display:"flex",gap:8,fontSize:12,color:"#374151",alignItems:"flex-start"}}>
                    <span style={{color:plan.color,flexShrink:0,fontWeight:700}}>✓</span>{f}
                  </div>
                ))}
              </div>

              <button onClick={()=>onPurchase(plan)} style={{width:"100%",padding:"12px",borderRadius:10,fontFamily:"'Geist',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",background:plan.badge?plan.color:"transparent",border:plan.badge?"none":`2px solid ${plan.color}`,color:plan.badge?"white":plan.color,transition:"all .2s"}}>
                {plan.badge?"Get "+plan.credits+" Credits →":"Get "+plan.credits+" Credits →"}
              </button>
            </div>
          ))}
        </div>

        {/* Trust signals */}
        <div style={{display:"flex",justifyContent:"center",gap:32,fontSize:12,color:"#9ca3af",flexWrap:"wrap"}}>
          {["🔒 Secure checkout via Paddle","⚡ 1 credit = 1 full landing page","💾 Credits never expire","↩ 14-day money back guarantee"].map(t=>(
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   GENERATING SCREEN
───────────────────────────────────────────────────────────────────────────── */
function GeneratingScreen({form,onDone,onError}) {
  const [pct,setPct]=useState(0);
  const [si,setSi]=useState(0);
  const [imgStatus,setImgStatus]=useState("Sourcing photos for your industry…");
  const stages=[
    "Sourcing photos for your industry…",
    "Reading your business details…",
    "Researching your niche…",
    "Planning SEO strategy…",
    "Writing headlines & copy…",
    "Designing hero with your images…",
    "Building all sections…",
    "Adding conversion elements…",
    "Finalising your page…",
  ];

  useEffect(()=>{
    let p=0;
    let cancelled=false;
    const iv=setInterval(()=>{
      p=Math.min(p+Math.random()*2.5+.5,91);
      setPct(Math.floor(p));
      setSi(Math.floor(p/100*(stages.length-1)));
    },800);

    // Get section-specific targeted queries for this industry
    const queries = getSectionKeywords(form.industry);

    const fetchImg = (q) =>
      fetch(`/api/images?query=${encodeURIComponent(q)}&per_page=5&orientation=landscape`)
        .then(r=>r.json())
        .then(d=>{
          if(d.photos&&d.photos.length>0){
            const pick = d.photos[Math.floor(Math.random()*Math.min(5,d.photos.length))];
            return pick.src.large2x||pick.src.large;
          }
          return null;
        })
        .catch(()=>null);

    setImgStatus("Sourcing photos for your industry…");

    Promise.all(queries.map(q=>fetchImg(q)))
      .then(images=>{
        const validImages = images.filter(Boolean);
        if(!cancelled) setImgStatus(validImages.length>0 ? `Found ${validImages.length} photos ✓`:"Using styled design…");
        // Now generate the page with the images
        return fetch("/api/generate",{
          method:"POST",
          headers:{
            "Content-Type":"application/json",
          },
          body:JSON.stringify({
            model:"claude-sonnet-4-20250514",
            max_tokens:8000,
            messages:[{role:"user",content:buildPrompt(form,validImages)}]
          })
        });
      })
      .then(r=>{if(!r.ok)throw new Error(`API ${r.status}`);return r.json();})
      .then(data=>{
        if(cancelled)return;
        clearInterval(iv);setPct(100);
        let raw=(data.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");
        let html=raw.trim();
        const idx=html.search(/<(!DOCTYPE|html)/i);
        if(idx>0)html=html.slice(idx);
        const end=html.lastIndexOf("</html>");
        if(end!==-1)html=html.slice(0,end+7);
        if(!html.toLowerCase().includes("<!doctype"))throw new Error("Invalid HTML. Please try again.");
        setTimeout(()=>onDone(html),400);
      })
      .catch(e=>{if(!cancelled){clearInterval(iv);onError(e.message);}});

    return()=>{cancelled=true;clearInterval(iv);};
  },[]);

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"white",padding:40,textAlign:"center"}}>
      <div style={{position:"relative",width:80,height:80,marginBottom:28}}>
        <div style={{position:"absolute",inset:0,borderRadius:"50%",border:"1px solid #f3f4f6"}}/>
        <div style={{position:"absolute",inset:0,borderRadius:"50%",border:"3px solid transparent",borderTopColor:"#f97316",animation:"spin .8s linear infinite"}}/>
        <div style={{position:"absolute",inset:10,borderRadius:"50%",border:"2px solid transparent",borderTopColor:"#f9731640",animation:"spin 1.5s linear infinite reverse"}}/>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>✦</div>
      </div>
      <div style={{fontSize:18,fontWeight:700,color:"#111827",marginBottom:6,minHeight:28}}>{stages[si]}</div>
      {si===0&&<div style={{fontSize:12,color:"#f97316",marginBottom:8,fontWeight:600}}>{imgStatus}</div>}
      <div style={{fontSize:13,color:"#6b7280",marginBottom:28,maxWidth:300,lineHeight:1.6}}>
        Building your SEO-optimised landing page for <strong style={{color:"#f97316"}}>{form.name}</strong>
      </div>
      <div style={{width:"100%",maxWidth:360,marginBottom:20}}>
        <div style={{height:4,background:"#f3f4f6",borderRadius:2,overflow:"hidden"}}>
          <div style={{height:"100%",background:"linear-gradient(90deg,#f97316,#fb923c)",borderRadius:2,width:`${pct}%`,transition:"width .8s ease"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:11,color:"#9ca3af"}}>
          <span>{si===0?"Fetching industry photos…":"Writing niche-specific copy…"}</span><span>{pct}%</span>
        </div>
      </div>
      <div style={{padding:"14px 20px",background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:12}}>
        <div style={{fontSize:10,color:"#f97316",letterSpacing:1.5,textTransform:"uppercase",marginBottom:4}}>Generating for</div>
        <div style={{fontSize:17,fontWeight:800,color:"#111827",marginBottom:2}}>{form.name}</div>
        <div style={{fontSize:12,color:"#ea580c"}}>{form.industry}</div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   RESULT SCREEN
───────────────────────────────────────────────────────────────────────────── */
function ResultScreen({html,form,onReset}) {
  const [blobUrl,setBlobUrl]=useState(null);
  const [copied,setCopied]=useState(false);
  const [opened,setOpened]=useState(false);

  useEffect(()=>{
    const b=new Blob([html],{type:"text/html"});
    const u=URL.createObjectURL(b);
    setBlobUrl(u);
    return()=>URL.revokeObjectURL(u);
  },[html]);

  const open=()=>{if(blobUrl){window.open(blobUrl,"_blank");setOpened(true);}};
  const dl=()=>{const a=document.createElement("a");a.href=blobUrl;a.download=`${form.name.replace(/\s+/g,"-").toLowerCase()}-landing-page.html`;a.click();};
  const copy=()=>navigator.clipboard.writeText(html).then(()=>{setCopied(true);setTimeout(()=>setCopied(false),2500);});

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",background:"white"}}>
      <div style={{padding:"18px 22px",borderBottom:"1px solid #f3f4f6"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
          <div style={{width:34,height:34,borderRadius:"50%",background:"#f0fdf4",border:"2px solid #86efac",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>✓</div>
          <div>
            <div style={{fontSize:14,fontWeight:700,color:"#111827"}}>Your page is ready!</div>
            <div style={{fontSize:11,color:"#6b7280"}}>{html.length.toLocaleString()} chars · {form.sections.length} sections</div>
          </div>
        </div>
        <button onClick={open} style={{width:"100%",padding:"12px",background:"#f97316",color:"white",border:"none",borderRadius:9,fontSize:14,fontWeight:700,cursor:"pointer",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit"}}>
          🔗 Open Preview in New Tab
        </button>
        {opened&&<div style={{fontSize:11,color:"#16a34a",textAlign:"center",marginBottom:8}}>✓ Opened! Allow popups if blocked.</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <button onClick={dl} style={{padding:"9px",background:"white",color:"#374151",border:"1px solid #e5e7eb",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>↓ Download HTML</button>
          <button onClick={copy} style={{padding:"9px",background:"white",color:copied?"#16a34a":"#374151",border:`1px solid ${copied?"#86efac":"#e5e7eb"}`,borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{copied?"✓ Copied!":"{ } Copy Code"}</button>
        </div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"16px 22px"}}>
        <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:18}}>
          {[["🔍","SEO + Schema Markup"],["🎯","5+ Conversion CTAs"],["📱","Mobile Responsive"],["🖼️","Real photos for "+form.industry],["✍️","Niche-specific copy"]].map(([ic,t])=>(
            <div key={t} style={{display:"flex",gap:9,padding:"8px 11px",background:"#f9fafb",borderRadius:7,fontSize:12,color:"#374151",alignItems:"center"}}>
              <span>{ic}</span><span>{t}</span>
            </div>
          ))}
        </div>
        <button onClick={onReset} style={{width:"100%",padding:"10px",background:"white",color:"#374151",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>
          ← Build Another Page
        </button>
        <div style={{marginTop:12,fontSize:11,color:"#9ca3af",textAlign:"center",lineHeight:1.6}}>
          Upload your .html file to Netlify (free) — live in 30 seconds
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   AUTH COMPONENTS
───────────────────────────────────────────────────────────────────────────── */
function AuthModal({mode="signin", onSuccess, onClose}) {
  const [tab, setTab] = useState(mode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");

  const handle = async () => {
    setErr(""); setMsg(""); setLoading(true);
    try {
      if(tab === "signup") {
        const r = await sb.signUp(email, password);
        if(!r.ok) { setErr(r.data?.msg || r.data?.error_description || "Sign up failed"); }
        else { setMsg("Check your email to confirm your account, then sign in!"); setTab("signin"); }
      } else {
        const r = await sb.signIn(email, password);
        if(!r.ok) { setErr(r.data?.error_description || "Invalid email or password"); }
        else { onSuccess && onSuccess(); }
      }
    } catch(e) { setErr("Network error. Please try again."); }
    setLoading(false);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,fontFamily:"'Geist',sans-serif"}}>
      <div style={{background:"white",borderRadius:16,padding:36,width:"100%",maxWidth:400,position:"relative"}}>
        <button onClick={onClose} style={{position:"absolute",top:16,right:16,background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#9ca3af"}}>×</button>
        <div style={{textAlign:"center",marginBottom:24}}>
          <div style={{fontSize:28,fontWeight:800,color:"#111827",marginBottom:4}}>
            {tab==="signin" ? "Welcome back" : "Create account"}
          </div>
          <p style={{fontSize:13,color:"#6b7280"}}>{tab==="signin" ? "Sign in to access your credits" : "Start building landing pages with AI"}</p>
        </div>
        <div style={{display:"flex",gap:0,marginBottom:24,background:"#f3f4f6",borderRadius:8,padding:3}}>
          {["signin","signup"].map(t=>(
            <button key={t} onClick={()=>{setTab(t);setErr("");setMsg("");}} style={{flex:1,padding:"8px 0",border:"none",borderRadius:6,fontSize:13,fontWeight:600,cursor:"pointer",background:tab===t?"white":"transparent",color:tab===t?"#111827":"#6b7280",boxShadow:tab===t?"0 1px 3px rgba(0,0,0,.1)":"none",transition:"all .15s"}}>
              {t==="signin"?"Sign In":"Sign Up"}
            </button>
          ))}
        </div>
        {err && <div style={{background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#dc2626",marginBottom:16}}>{err}</div>}
        {msg && <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:8,padding:"10px 14px",fontSize:13,color:"#16a34a",marginBottom:16}}>{msg}</div>}
        <div style={{marginBottom:14}}>
          <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:5}}>EMAIL</label>
          <input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="you@example.com"
            style={{width:"100%",padding:"10px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:14,outline:"none",boxSizing:"border-box"}}
            onKeyDown={e=>e.key==="Enter"&&handle()}/>
        </div>
        <div style={{marginBottom:20}}>
          <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:5}}>PASSWORD</label>
          <input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="••••••••"
            style={{width:"100%",padding:"10px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:14,outline:"none",boxSizing:"border-box"}}
            onKeyDown={e=>e.key==="Enter"&&handle()}/>
        </div>
        <button onClick={handle} disabled={loading||!email||!password}
          style={{width:"100%",padding:"13px",background: loading||!email||!password?"#e5e7eb":"#f97316",color:loading||!email||!password?"#9ca3af":"white",border:"none",borderRadius:10,fontSize:15,fontWeight:700,cursor:loading||!email||!password?"not-allowed":"pointer",transition:"background .15s"}}>
          {loading ? "Please wait…" : tab==="signin" ? "Sign In →" : "Create Account →"}
        </button>
        <p style={{textAlign:"center",marginTop:16,fontSize:12,color:"#9ca3af"}}>🔒 Secure · Your data is never shared</p>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   LEGAL PAGES
───────────────────────────────────────────────────────────────────────────── */
function LegalPage({title, onHome, children}) {
  const goHome = () => { window.location.hash = ""; onHome(); };
  return (
    <div style={{minHeight:"100vh",background:"#fafaf9",fontFamily:"'Geist',sans-serif"}}>
      <GS/>
      <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:100,height:56,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 48px",background:"rgba(250,250,249,.95)",backdropFilter:"blur(20px)",borderBottom:"1px solid #e5e7eb"}}>
        <div onClick={goHome} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
          <div style={{width:28,height:28,background:"#f97316",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"white",fontWeight:800}}>S</div>
          <span style={{fontSize:18,fontWeight:800,color:"#111827"}}>Sitefliq</span>
        </div>
        <button onClick={goHome} style={{padding:"7px 16px",background:"transparent",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,cursor:"pointer",color:"#374151",fontFamily:"inherit"}}>← Back to Home</button>
      </nav>
      <div style={{maxWidth:780,margin:"0 auto",padding:"100px 40px 80px"}}>
        <h1 style={{fontSize:36,fontWeight:800,color:"#111827",marginBottom:8}}>{title}</h1>
        <p style={{fontSize:13,color:"#9ca3af",marginBottom:48}}>Last updated: March 2026</p>
        <div style={{fontSize:15,color:"#374151",lineHeight:1.9}}>
          {children}
        </div>
      </div>
      <footer style={{borderTop:"1px solid #e5e7eb",padding:"24px 48px",display:"flex",justifyContent:"space-between",alignItems:"center",background:"white"}}>
        <span style={{fontSize:12,color:"#9ca3af"}}>© 2026 Sitefliq. All rights reserved.</span>
        <div style={{display:"flex",gap:20}}>
          <span onClick={onHome} style={{fontSize:12,color:"#9ca3af",cursor:"pointer",textDecoration:"underline"}}>Home</span>
        </div>
      </footer>
    </div>
  );
}

function Section({title, children}) {
  return (
    <div style={{marginBottom:36}}>
      <h2 style={{fontSize:20,fontWeight:700,color:"#111827",marginBottom:12,marginTop:0}}>{title}</h2>
      {children}
    </div>
  );
}

function TermsPage({onHome}) {
  return (
    <LegalPage title="Terms of Service" onHome={onHome}>
      <Section title="1. Acceptance of Terms">
        <p>By accessing or using Sitefliq ("Service", "we", "us", or "our") at sitefliq.com, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service. These terms apply to all visitors, users, and others who access or use the Service.</p>
      </Section>
      <Section title="2. Description of Service">
        <p>Sitefliq is an AI-powered landing page generation tool. Users purchase credits which can be used to generate HTML landing pages. Each credit entitles the user to one (1) landing page generation. Generated pages are delivered as downloadable HTML files for use on any web hosting platform.</p>
      </Section>
      <Section title="3. User Accounts">
        <p>You must create an account to use the Service. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to provide accurate and complete information when creating your account and to update it as necessary. You must be at least 18 years old to use this Service.</p>
      </Section>
      <Section title="4. Credits and Payments">
        <p style={{marginBottom:10}}>Credits are purchased on a one-time, non-subscription basis. The following terms apply to all purchases:</p>
        <ul style={{paddingLeft:20,margin:0}}>
          <li style={{marginBottom:8}}>Credits are non-refundable once used to generate a landing page.</li>
          <li style={{marginBottom:8}}>Unused credits do not expire and remain in your account indefinitely.</li>
          <li style={{marginBottom:8}}>Credits are non-transferable and may not be sold or gifted to other users.</li>
          <li style={{marginBottom:8}}>All prices are in USD and inclusive of applicable taxes where required by law.</li>
          <li style={{marginBottom:8}}>Payments are processed securely by Paddle.com, our authorised reseller and Merchant of Record.</li>
        </ul>
      </Section>
      <Section title="5. Refund Policy">
        <p>We offer a full 14-day money-back guarantee on all purchases. If you are not satisfied for any reason, contact us within 14 days of your purchase and we will issue a full refund — no questions asked. Refunds are processed through Paddle within 5–10 business days.</p>
      </Section>
      <Section title="6. AI-Generated Content">
        <p style={{marginBottom:10}}>Our Service uses artificial intelligence to generate landing page content. You acknowledge and agree that:</p>
        <ul style={{paddingLeft:20,margin:0}}>
          <li style={{marginBottom:8}}>AI-generated content may not always be accurate, complete, or suitable for your specific needs.</li>
          <li style={{marginBottom:8}}>You are solely responsible for reviewing, editing, and verifying all generated content before publishing.</li>
          <li style={{marginBottom:8}}>Sitefliq does not guarantee that generated content will be free from errors, plagiarism, or legal issues.</li>
          <li style={{marginBottom:8}}>You own the generated HTML output and may use it for any lawful commercial purpose.</li>
          <li style={{marginBottom:8}}>We reserve the right to use anonymised, aggregated usage data to improve our AI models.</li>
        </ul>
      </Section>
      <Section title="7. Intellectual Property">
        <p>The Sitefliq platform, including its design, code, branding, and underlying technology, is owned by Sitefliq and protected by intellectual property laws. You retain ownership of the content you provide as input and the HTML pages generated from your inputs. You grant Sitefliq a limited licence to process your inputs solely for the purpose of generating your requested output.</p>
      </Section>
      <Section title="8. Prohibited Uses">
        <p style={{marginBottom:10}}>You agree not to use the Service to generate content that:</p>
        <ul style={{paddingLeft:20,margin:0}}>
          <li style={{marginBottom:8}}>Is fraudulent, misleading, or deceptive</li>
          <li style={{marginBottom:8}}>Violates any applicable laws or regulations</li>
          <li style={{marginBottom:8}}>Infringes any third-party intellectual property rights</li>
          <li style={{marginBottom:8}}>Contains spam, malware, or malicious code</li>
          <li style={{marginBottom:8}}>Promotes illegal products, services, or activities</li>
        </ul>
      </Section>
      <Section title="9. Disclaimer of Warranties">
        <p>THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED. SITEFLIQ DOES NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF VIRUSES. YOUR USE OF THE SERVICE IS AT YOUR SOLE RISK.</p>
      </Section>
      <Section title="10. Limitation of Liability">
        <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, SITEFLIQ SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES ARISING FROM YOUR USE OF THE SERVICE. OUR TOTAL LIABILITY TO YOU FOR ANY CLAIM ARISING FROM THESE TERMS SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE 30 DAYS PRECEDING THE CLAIM.</p>
      </Section>
      <Section title="11. Governing Law">
        <p>These Terms are governed by the laws of the Republic of South Africa. Any disputes arising from these Terms or your use of the Service shall be subject to the exclusive jurisdiction of the courts of South Africa.</p>
      </Section>
      <Section title="12. Changes to Terms">
        <p>We reserve the right to modify these Terms at any time. We will notify users of significant changes via email or a prominent notice on our website. Continued use of the Service after changes constitutes acceptance of the new Terms.</p>
      </Section>
      <Section title="13. Contact">
        <p>For any questions regarding these Terms, please contact us at: <strong>hello@sitefliq.com</strong></p>
      </Section>
    </LegalPage>
  );
}

function PrivacyPage({onHome}) {
  return (
    <LegalPage title="Privacy Policy" onHome={onHome}>
      <Section title="1. Introduction">
        <p>Sitefliq ("we", "us", or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your personal information when you use our Service at sitefliq.com. By using Sitefliq, you consent to the practices described in this policy.</p>
      </Section>
      <Section title="2. Information We Collect">
        <p style={{marginBottom:10}}>We collect the following types of information:</p>
        <ul style={{paddingLeft:20,margin:0}}>
          <li style={{marginBottom:8}}><strong>Account information:</strong> email address and password (stored securely via Supabase)</li>
          <li style={{marginBottom:8}}><strong>Payment information:</strong> billing details processed by Paddle (we never store card details)</li>
          <li style={{marginBottom:8}}><strong>Usage data:</strong> pages generated, credits used, and feature interactions</li>
          <li style={{marginBottom:8}}><strong>Input data:</strong> business name, description, and other information you provide to generate pages</li>
          <li style={{marginBottom:8}}><strong>Technical data:</strong> IP address, browser type, and device information via standard web logs</li>
        </ul>
      </Section>
      <Section title="3. How We Use Your Information">
        <p style={{marginBottom:10}}>We use your information to:</p>
        <ul style={{paddingLeft:20,margin:0}}>
          <li style={{marginBottom:8}}>Provide and improve the Service</li>
          <li style={{marginBottom:8}}>Process payments and manage your credit balance</li>
          <li style={{marginBottom:8}}>Send transactional emails (receipts, account confirmations)</li>
          <li style={{marginBottom:8}}>Respond to support requests</li>
          <li style={{marginBottom:8}}>Detect and prevent fraud or abuse</li>
          <li style={{marginBottom:8}}>Comply with legal obligations</li>
        </ul>
      </Section>
      <Section title="4. Data Sharing">
        <p style={{marginBottom:10}}>We do not sell your personal data. We share data only with:</p>
        <ul style={{paddingLeft:20,margin:0}}>
          <li style={{marginBottom:8}}><strong>Supabase:</strong> for authentication and database storage</li>
          <li style={{marginBottom:8}}><strong>Paddle:</strong> for payment processing (subject to their privacy policy)</li>
          <li style={{marginBottom:8}}><strong>Anthropic:</strong> input data is sent to Claude AI for page generation (subject to their privacy policy)</li>
          <li style={{marginBottom:8}}><strong>Vercel:</strong> for website hosting and serverless functions</li>
          <li style={{marginBottom:8}}><strong>Legal authorities:</strong> where required by law</li>
        </ul>
      </Section>
      <Section title="5. Data Retention">
        <p>We retain your account data for as long as your account is active. You may request deletion of your account and associated data at any time by contacting us. Payment records are retained for 7 years as required by financial regulations.</p>
      </Section>
      <Section title="6. Security">
        <p>We implement industry-standard security measures including encrypted data storage, secure HTTPS connections, and row-level security on our database. However, no method of transmission over the internet is 100% secure and we cannot guarantee absolute security.</p>
      </Section>
      <Section title="7. Your Rights">
        <p style={{marginBottom:10}}>Under applicable data protection laws, you have the right to:</p>
        <ul style={{paddingLeft:20,margin:0}}>
          <li style={{marginBottom:8}}>Access the personal data we hold about you</li>
          <li style={{marginBottom:8}}>Request correction of inaccurate data</li>
          <li style={{marginBottom:8}}>Request deletion of your data</li>
          <li style={{marginBottom:8}}>Object to processing of your data</li>
          <li style={{marginBottom:8}}>Request a copy of your data in a portable format</li>
        </ul>
        <p style={{marginTop:10}}>To exercise any of these rights, contact us at hello@sitefliq.com.</p>
      </Section>
      <Section title="8. Cookies">
        <p>We use minimal cookies necessary for authentication (session tokens stored in localStorage). We do not use advertising or tracking cookies. You can clear these at any time through your browser settings.</p>
      </Section>
      <Section title="9. Contact">
        <p>For privacy-related enquiries, contact us at: <strong>hello@sitefliq.com</strong></p>
      </Section>
    </LegalPage>
  );
}

function RefundPage({onHome}) {
  return (
    <LegalPage title="Refund Policy" onHome={onHome}>
      <Section title="Our Commitment">
        <p>We want you to be completely satisfied with Sitefliq. If for any reason you are not happy with your purchase, we offer a straightforward, no-questions-asked refund policy.</p>
      </Section>
      <Section title="14-Day Money-Back Guarantee">
        <p>You may request a full refund on any Sitefliq purchase within <strong>14 days of the original transaction date</strong>, no questions asked. Simply contact us within this window and we will process your refund promptly.</p>
      </Section>
      <Section title="How Refunds Work">
        <p>Refunds are processed through Paddle, our payment provider and Merchant of Record. Once approved, the full amount will be returned to the original payment method used at checkout. Processing typically takes 5–10 business days depending on your bank or card issuer.</p>
        <p style={{marginTop:10}}>Please note: Paddle acts as the Merchant of Record for all Sitefliq transactions. All refund requests are handled in accordance with <a href="https://www.paddle.com/legal/checkout-buyer-terms" target="_blank" style={{color:"#f97316"}}>Paddle's Buyer Terms</a>, which grant consumers the right to cancel within 14 days of purchase.</p>
      </Section>
      <Section title="How to Request a Refund">
        <p>To request a refund, email us at <strong>hello@sitefliq.com</strong> with the subject line "Refund Request" and include your account email address and transaction date. We will respond within 1 business day and process your refund within 5–10 business days.</p>
      </Section>
      <Section title="Contact">
        <p>For any questions about our refund policy, contact us at: <strong>hello@sitefliq.com</strong></p>
      </Section>
    </LegalPage>
  );
}

function HomePage({onBuild,onPricing,onExample,onHelp,user,credits,onSignIn,onSignOut}) {
  return (
    <div style={{minHeight:"100vh",background:"#fafaf9",color:"#111827"}}>
      <GS/>
      <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:100,height:56,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 48px",background:"rgba(250,250,249,.92)",backdropFilter:"blur(20px)",borderBottom:"1px solid #e5e7eb"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:28,height:28,background:"#f97316",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,color:"white",fontWeight:800}}>S</div>
          <span style={{fontSize:18,fontWeight:800,color:"#111827"}}>Sitefliq</span>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onPricing} style={{padding:"7px 16px",background:"transparent",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,cursor:"pointer",color:"#374151",fontFamily:"inherit",fontWeight:500}}>Pricing</button>
          <button onClick={onExample} style={{padding:"7px 16px",background:"transparent",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,cursor:"pointer",color:"#374151",fontFamily:"inherit",fontWeight:500}}>See Example</button>
          <button onClick={onHelp} style={{padding:"7px 16px",background:"transparent",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,cursor:"pointer",color:"#6b7280",fontFamily:"inherit",fontWeight:500}}>🛟 Help</button>
          {user ? (
            <>
              <span style={{padding:"7px 14px",background:"#fff7ed",color:"#f97316",border:"1px solid #fed7aa",borderRadius:8,fontSize:13,fontWeight:700}}>⚡ {credits} credits</span>
              <button onClick={onSignOut} style={{padding:"7px 16px",background:"transparent",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,cursor:"pointer",color:"#6b7280",fontFamily:"inherit"}}>Sign out</button>
            </>
          ) : (
            <button onClick={onSignIn} style={{padding:"7px 16px",background:"transparent",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,cursor:"pointer",color:"#374151",fontFamily:"inherit",fontWeight:500}}>Sign In</button>
          )}
          <button onClick={onBuild} style={{padding:"8px 20px",background:"#f97316",border:"none",borderRadius:8,fontSize:13,cursor:"pointer",color:"white",fontFamily:"inherit",fontWeight:700}}>Start Building →</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"100px 40px 80px",background:"linear-gradient(180deg,#fff7ed 0%,#fafaf9 55%)"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"5px 14px",background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:100,marginBottom:22,animation:"fadeUp .6s ease"}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:"#f97316",animation:"pulse 2s infinite"}}/>
          <span style={{fontSize:10,color:"#f97316",fontWeight:700,letterSpacing:1.5}}>AI LANDING PAGE BUILDER</span>
        </div>
        <h1 style={{fontSize:"clamp(40px,6vw,74px)",fontWeight:800,lineHeight:1.0,marginBottom:20,color:"#111827",letterSpacing:"-2px",maxWidth:820,animation:"fadeUp .6s .1s ease both"}}>
          Build websites.{" "}
          <span style={{fontFamily:"'Instrument Serif',serif",fontStyle:"italic"}}>
            <TW words={["Get paid.", "Get clients.", "Get noticed.", "Grow faster."]} color="#f97316"/>
          </span>
        </h1>
        <p style={{fontSize:17,color:"#6b7280",maxWidth:500,margin:"0 auto 36px",lineHeight:1.8,animation:"fadeUp .6s .2s ease both"}}>
          Describe your business. AI writes niche-specific copy, builds full SEO meta tags, and delivers a stunning landing page in 60 seconds.
        </p>
        <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap",marginBottom:14,animation:"fadeUp .6s .3s ease both"}}>
          <button onClick={onBuild} style={{padding:"14px 34px",background:"#f97316",color:"white",border:"none",borderRadius:10,fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 20px #f9731640"}}>
            Start Building for Free →
          </button>
          <button onClick={onExample} style={{padding:"14px 22px",background:"white",color:"#374151",border:"1px solid #e5e7eb",borderRadius:10,fontSize:14,cursor:"pointer",fontFamily:"inherit"}}>
            👁 See Example
          </button>
        </div>
        <div style={{fontSize:12,color:"#9ca3af",animation:"fadeUp .6s .4s ease both"}}>No credit card to preview · Pay only when you're ready to download</div>
        <div style={{display:"flex",gap:40,marginTop:48,animation:"fadeUp .6s .5s ease both"}}>
          {[["⚡","60 sec","Average build time"],["★","4.9/5","User rating"],["🏢","500+","Pages generated"]].map(([ic,n,l])=>(
            <div key={l} style={{textAlign:"center"}}>
              <div style={{fontSize:18,marginBottom:3}}>{ic}</div>
              <div style={{fontSize:22,fontWeight:800,color:"#111827"}}>{n}</div>
              <div style={{fontSize:11,color:"#9ca3af"}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ticker */}
      <div style={{overflow:"hidden",borderTop:"1px solid #e5e7eb",borderBottom:"1px solid #e5e7eb",padding:"12px 0",background:"white"}}>
        <div style={{display:"flex",gap:40,animation:"ticker 24s linear infinite",width:"max-content"}}>
          {[...Array(2)].map((_,r)=>
            ["Yoga Studios","Gyms","Salons","Restaurants","Photographers","Coaches","Real Estate","Boutiques","Clinics","Cafes","Freelancers","Agencies"].map((l,i)=>(
              <span key={`${r}-${i}`} style={{fontSize:12,color:"#9ca3af",whiteSpace:"nowrap"}}>
                <span style={{color:"#f97316",marginRight:7}}>✦</span>{l}
              </span>
            ))
          )}
        </div>
      </div>

      {/* How it works */}
      <div style={{maxWidth:920,margin:"80px auto",padding:"0 40px"}}>
        <div style={{textAlign:"center",marginBottom:44}}>
          <div style={{fontSize:10,color:"#f97316",letterSpacing:3,textTransform:"uppercase",fontWeight:700,marginBottom:10}}>HOW IT WORKS</div>
          <h2 style={{fontSize:"clamp(26px,4vw,42px)",fontWeight:800,color:"#111827"}}>From idea to live in minutes</h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
          {[
            {n:"01",ic:"📝",t:"Describe it",d:"Tell us about your business. 60 seconds of input."},
            {n:"02",ic:"🎨",t:"Choose style",d:"Pick your colours, vibe and sections."},
            {n:"03",ic:"💳",t:"Choose a plan",d:"Pay once. No subscriptions. Cancel anytime."},
            {n:"04",ic:"⚡",t:"Get your page",d:"AI generates. You download. Go live today."},
          ].map(s=>(
            <div key={s.n} style={{padding:22,borderRadius:14,background:"white",border:"1px solid #f3f4f6",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
              <div style={{width:32,height:32,background:"#fff7ed",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,marginBottom:12}}>{s.ic}</div>
              <div style={{fontSize:10,fontWeight:700,color:"#f97316",letterSpacing:1,marginBottom:6}}>{s.n}</div>
              <div style={{fontSize:14,fontWeight:700,color:"#111827",marginBottom:5}}>{s.t}</div>
              <div style={{fontSize:12,color:"#6b7280",lineHeight:1.6}}>{s.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Reviews */}
      <div style={{background:"white",borderTop:"1px solid #f3f4f6",borderBottom:"1px solid #f3f4f6",padding:"60px 40px"}}>
        <div style={{maxWidth:920,margin:"0 auto"}}>
          <h2 style={{fontSize:32,fontWeight:800,color:"#111827",textAlign:"center",marginBottom:36}}>Loved by business owners</h2>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
            {[
              {q:"My yoga studio page was live in 4 minutes. The AI wrote better copy than any agency I've used. Worth every cent.",n:"Ashley M.",r:"Yoga Studio · Austin, TX"},
              {q:"Was quoted $2,500 by a web designer. Sitefliq did it better for $59. The SEO is already bringing traffic.",n:"James T.",r:"Personal Trainer · Chicago, IL"},
              {q:"I described my pilates studio and it built me an entire professional website. Downloaded it, uploaded to Netlify — live same day.",n:"Jessica R.",r:"Pilates Studio · Brooklyn, NY"},
            ].map((t,i)=>(
              <div key={i} style={{padding:22,borderRadius:14,background:"#fafaf9",border:"1px solid #f3f4f6"}}>
                <div style={{color:"#f97316",fontSize:12,marginBottom:10,letterSpacing:2}}>★★★★★</div>
                <p style={{fontSize:13,color:"#374151",lineHeight:1.75,marginBottom:16,fontStyle:"italic"}}>"{t.q}"</p>
                <div style={{fontSize:13,fontWeight:600,color:"#111827"}}>{t.n}</div>
                <div style={{fontSize:11,color:"#9ca3af"}}>{t.r}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{textAlign:"center",padding:"70px 40px 90px"}}>
        <h2 style={{fontSize:"clamp(28px,4vw,48px)",fontWeight:800,color:"#111827",marginBottom:24}}>Your landing page is waiting.</h2>
        <button onClick={onBuild} style={{padding:"15px 42px",background:"#f97316",color:"white",border:"none",borderRadius:10,fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 20px #f9731640"}}>
          Build It Now →
        </button>
        <div style={{marginTop:12,fontSize:12,color:"#9ca3af"}}>See your page before you pay</div>
      </div>

      <div style={{textAlign:"center",padding:"16px 40px",borderTop:"1px solid #f3f4f6",fontSize:11,color:"#9ca3af",background:"white",display:"flex",alignItems:"center",justifyContent:"center",gap:20,flexWrap:"wrap"}}>
        <span>© 2026 Sitefliq · AI Landing Page Builder</span>
        <a href="#terms" style={{cursor:"pointer",textDecoration:"underline",color:"#9ca3af"}}>Terms of Service</a>
        <a href="#privacy" style={{cursor:"pointer",textDecoration:"underline",color:"#9ca3af"}}>Privacy Policy</a>
        <a href="#refund" style={{cursor:"pointer",textDecoration:"underline",color:"#9ca3af"}}>Refund Policy</a>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   PRICING PAGE (standalone)
───────────────────────────────────────────────────────────────────────────── */
function PricingPage({onBuild,onHome,user,credits,onSignIn,onSignOut,onPurchase}) {
  return (
    <div style={{minHeight:"100vh",background:"#fafaf9"}}>
      <GS/>
      <nav style={{height:56,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 48px",borderBottom:"1px solid #e5e7eb",background:"white"}}>
        <div onClick={onHome} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
          <div style={{width:27,height:27,background:"#f97316",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"white",fontWeight:800}}>S</div>
          <span style={{fontSize:17,fontWeight:800,color:"#111827"}}>Sitefliq</span>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          {user ? (
            <>
              <span style={{fontSize:12,background:"#fff7ed",color:"#f97316",border:"1px solid #fed7aa",borderRadius:20,padding:"3px 10px",fontWeight:700}}>⚡ {credits} credits</span>
              <button onClick={onSignOut} style={{padding:"7px 14px",background:"transparent",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,cursor:"pointer",color:"#6b7280",fontFamily:"inherit"}}>Sign out</button>
              <button onClick={onBuild} style={{padding:"8px 18px",background:"#f97316",border:"none",borderRadius:8,fontSize:13,cursor:"pointer",color:"white",fontFamily:"inherit",fontWeight:700}}>Build Page →</button>
            </>
          ) : (
            <>
              <button onClick={onSignIn} style={{padding:"8px 16px",background:"transparent",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,cursor:"pointer",color:"#374151",fontFamily:"inherit"}}>Sign In</button>
              <button onClick={onBuild} style={{padding:"8px 18px",background:"#f97316",border:"none",borderRadius:8,fontSize:13,cursor:"pointer",color:"white",fontFamily:"inherit",fontWeight:700}}>Start Free →</button>
            </>
          )}
        </div>
      </nav>
      <div style={{maxWidth:860,margin:"0 auto",padding:"70px 40px"}}>
        <h1 style={{fontSize:46,fontWeight:800,textAlign:"center",color:"#111827",marginBottom:8,fontFamily:"'Instrument Serif',serif",fontStyle:"italic"}}>Simple pricing</h1>
        <p style={{textAlign:"center",color:"#6b7280",marginBottom:32,fontSize:14}}>Buy credits once. Use them whenever. 1 credit = 1 complete landing page. No subscriptions, ever.</p>
        <div style={{display:"flex",justifyContent:"center",gap:32,marginBottom:40,flexWrap:"wrap"}}>
          {[["⚡","1 credit = 1 full page","Complete SEO-optimised HTML"],["💾","Credits never expire","Use them whenever you need"],["🔒","One-time payment","No subscriptions, ever"]].map(([ic,t,d])=>(
            <div key={t} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 18px",background:"white",border:"1px solid #f3f4f6",borderRadius:10,boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
              <span style={{fontSize:20}}>{ic}</span>
              <div><div style={{fontSize:12,fontWeight:700,color:"#111827"}}>{t}</div><div style={{fontSize:11,color:"#9ca3af"}}>{d}</div></div>
            </div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:18}}>
          {PLANS.map(p=>(
            <div key={p.id} style={{padding:30,borderRadius:16,position:"relative",background:"white",border:p.badge?`2px solid ${p.color}`:"1px solid #e5e7eb",boxShadow:p.badge?`0 4px 30px ${p.color}18`:"0 1px 3px rgba(0,0,0,.04)"}}>
              {p.badge&&<div style={{position:"absolute",top:-11,left:"50%",transform:"translateX(-50%)",background:p.color,color:"white",padding:"3px 13px",borderRadius:100,fontSize:9,fontWeight:800,letterSpacing:1.5,whiteSpace:"nowrap"}}>{p.badge}</div>}
              <div style={{fontSize:10,fontWeight:700,color:p.color,letterSpacing:2,textTransform:"uppercase",marginBottom:10}}>{p.name}</div>
              <div style={{background:`${p.color}10`,border:`1px solid ${p.color}25`,borderRadius:10,padding:"14px 16px",marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div>
                  <div style={{fontSize:10,color:p.color,fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:2}}>Credits</div>
                  <div style={{fontSize:40,fontWeight:800,color:"#111827",lineHeight:1,fontFamily:"'Instrument Serif',serif"}}>{p.credits}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:10,color:"#9ca3af",marginBottom:2}}>per page</div>
                  <div style={{fontSize:15,fontWeight:700,color:p.color}}>{p.perPage}</div>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"baseline",gap:6,marginBottom:2}}>
                <span style={{fontSize:36,fontWeight:800,color:"#111827",fontFamily:"'Instrument Serif',serif"}}>{p.price}</span>
              </div>
              <div style={{fontSize:11,color:"#9ca3af",marginBottom:16}}>one-time · no subscription</div>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:22}}>
                {p.features.map(f=><div key={f} style={{display:"flex",gap:8,fontSize:12,color:"#374151"}}><span style={{color:p.color,flexShrink:0,fontWeight:700}}>✓</span>{f}</div>)}
              </div>
              <button onClick={()=>onPurchase(p)} style={{width:"100%",padding:11,borderRadius:9,fontFamily:"'Geist',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",background:p.badge?p.color:"transparent",border:p.badge?"none":`2px solid ${p.color}`,color:p.badge?"white":p.color,transition:"all .2s"}}>
                Get {p.credits} Credits →
              </button>
            </div>
          ))}
        </div>
        <div style={{marginTop:24,textAlign:"center",fontSize:12,color:"#9ca3af"}}>
          🔒 Secure checkout via Paddle · Credits never expire · 14-day money back guarantee
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   EXAMPLE PAGE — pre-built sample to show clients
───────────────────────────────────────────────────────────────────────────── */
const EXAMPLE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>IronForge Gym | Personal Training NYC | Transform Your Body in 90 Days</title>
<meta name="description" content="IronForge Gym in Manhattan offers elite personal training, group classes, and nutrition coaching. Results guaranteed or your money back. Book a free session today."/>
<meta property="og:title" content="IronForge Gym | NYC's #1 Personal Training Studio"/>
<meta property="og:description" content="Transform your body in 90 days with NYC's most results-driven personal training studio. First session free."/>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"LocalBusiness","name":"IronForge Gym","description":"Elite personal training and fitness studio in Manhattan, NYC","address":{"@type":"PostalAddress","streetAddress":"247 W 35th Street","addressLocality":"New York","addressRegion":"NY","postalCode":"10001"},"telephone":"+12125550182","aggregateRating":{"@type":"AggregateRating","ratingValue":"4.9","reviewCount":"428"}}</script>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;600;700&display=swap" rel="stylesheet"/>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#0d0d0d;--surface:#141414;--surface2:#1c1c1c;--accent:#e63946;--text:#f5f5f5;--muted:#888;--border:rgba(230,57,70,.12)}
html{scroll-behavior:smooth}
body{background:var(--bg);color:var(--text);font-family:'DM Sans',sans-serif;overflow-x:hidden}
@keyframes fadeUp{from{opacity:0;transform:translateY(32px)}to{opacity:1;transform:translateY(0)}}
@keyframes fadeIn{from{opacity:0}to{opacity:1}}
@keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(230,57,70,.4)}50%{box-shadow:0 0 0 14px rgba(230,57,70,0)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes scaleIn{from{opacity:0;transform:scale(1.05)}to{opacity:1;transform:scale(1)}}
.reveal{opacity:0;transform:translateY(32px);transition:opacity .7s ease,transform .7s ease}
.reveal.visible{opacity:1;transform:translateY(0)}
.reveal-left{opacity:0;transform:translateX(-30px);transition:opacity .7s ease,transform .7s ease}
.reveal-left.visible{opacity:1;transform:translateX(0)}
.reveal-scale{opacity:0;transform:scale(0.93);transition:opacity .6s ease,transform .6s ease}
.reveal-scale.visible{opacity:1;transform:scale(1)}
nav{position:fixed;top:0;left:0;right:0;z-index:100;padding:22px 56px;display:flex;align-items:center;justify-content:space-between;transition:all .3s}
nav.scrolled{background:rgba(13,13,13,.95);backdrop-filter:blur(20px);padding:14px 56px;border-bottom:1px solid var(--border);box-shadow:0 4px 30px rgba(0,0,0,.5)}
.logo{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:2px;color:var(--text)}
.logo span{color:var(--accent)}
.nav-links{display:flex;gap:36px;align-items:center}
.nav-links a{color:var(--muted);text-decoration:none;font-size:14px;font-weight:500;transition:color .2s}
.nav-links a:hover{color:var(--text)}
.nav-cta{background:var(--accent);color:white;padding:11px 24px;border-radius:6px;font-size:14px;font-weight:700;text-decoration:none;transition:all .2s;animation:pulse 3s infinite}
.nav-cta:hover{transform:scale(1.05);background:#c1121f}
.hamburger{display:none;flex-direction:column;gap:5px;cursor:pointer;background:none;border:none;padding:4px}
.hamburger span{display:block;width:24px;height:2px;background:var(--text);transition:all .3s}
.mobile-menu{display:none;position:fixed;inset:0;background:var(--bg);z-index:99;padding:100px 40px;flex-direction:column;gap:32px}
.mobile-menu.open{display:flex;animation:fadeIn .3s ease}
.mobile-menu a{font-family:'Bebas Neue',sans-serif;font-size:36px;letter-spacing:2px;color:var(--text);text-decoration:none}
.hero{min-height:100vh;display:flex;align-items:center;padding:120px 56px 80px;position:relative;overflow:hidden}
.hero-bg{position:absolute;inset:0;background:url('https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=1600') center/cover;filter:brightness(.25);animation:scaleIn 1.5s ease forwards}
.hero-bg::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,rgba(13,13,13,.8) 50%,transparent)}
.hero-content{position:relative;z-index:2;max-width:680px}
.hero-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(230,57,70,.15);border:1px solid rgba(230,57,70,.3);border-radius:4px;padding:6px 14px;font-size:11px;color:var(--accent);font-weight:700;letter-spacing:2px;margin-bottom:24px;animation:fadeIn .8s .2s both}
.hero h1{font-family:'Bebas Neue',sans-serif;font-size:clamp(60px,8vw,110px);line-height:.95;margin-bottom:22px;letter-spacing:2px;animation:fadeUp .9s .1s both}
.hero h1 span{color:var(--accent)}
.hero p{font-size:18px;color:rgba(245,245,245,.7);max-width:480px;margin-bottom:36px;line-height:1.8;animation:fadeUp .9s .2s both}
.hero-btns{display:flex;gap:14px;flex-wrap:wrap;animation:fadeUp .9s .3s both}
.btn-primary{background:var(--accent);color:white;padding:16px 38px;border-radius:6px;font-size:15px;font-weight:700;text-decoration:none;display:inline-flex;align-items:center;gap:8px;transition:all .25s;animation:pulse 3s 1s infinite}
.btn-primary:hover{transform:translateY(-3px) scale(1.04);background:#c1121f;box-shadow:0 12px 36px rgba(230,57,70,.4)}
.btn-secondary{border:1px solid rgba(245,245,245,.2);color:var(--text);padding:16px 38px;border-radius:6px;font-size:15px;font-weight:500;text-decoration:none;transition:all .25s}
.btn-secondary:hover{border-color:var(--accent);color:var(--accent);transform:translateY(-3px)}
.hero-trust{margin-top:28px;font-size:13px;color:var(--muted);animation:fadeIn 1s .5s both}
.stars{color:var(--accent)}
.stats{background:var(--accent);padding:48px 56px;display:grid;grid-template-columns:repeat(4,1fr)}
.stat{text-align:center;padding:16px;border-right:1px solid rgba(255,255,255,.2)}
.stat:last-child{border-right:none}
.stat-num{font-family:'Bebas Neue',sans-serif;font-size:56px;color:white;line-height:1;margin-bottom:4px;letter-spacing:2px}
.stat-label{font-size:12px;color:rgba(255,255,255,.8);font-weight:600;letter-spacing:1px;text-transform:uppercase}
.section{padding:100px 56px;max-width:1280px;margin:0 auto}
.section-label{font-size:11px;color:var(--accent);font-weight:700;letter-spacing:3px;text-transform:uppercase;margin-bottom:10px}
.section-title{font-family:'Bebas Neue',sans-serif;font-size:clamp(44px,5vw,72px);font-weight:400;line-height:1;margin-bottom:18px;letter-spacing:2px}
.section-sub{font-size:16px;color:var(--muted);max-width:520px;line-height:1.8}
.programs-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;margin-top:52px}
.program-card{position:relative;overflow:hidden;cursor:pointer}
.program-card img{width:100%;height:380px;object-fit:cover;display:block;transition:transform .6s ease;filter:brightness(.6)}
.program-card:hover img{transform:scale(1.06);filter:brightness(.4)}
.program-overlay{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:flex-end;padding:28px;background:linear-gradient(to top,rgba(0,0,0,.85) 0%,transparent 60%)}
.program-tag{font-size:10px;color:var(--accent);font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:6px}
.program-name{font-family:'Bebas Neue',sans-serif;font-size:28px;letter-spacing:1px;margin-bottom:8px}
.program-desc{font-size:13px;color:rgba(245,245,245,.75);line-height:1.6;max-height:0;overflow:hidden;transition:max-height .4s ease}
.program-card:hover .program-desc{max-height:80px}
.about-grid{display:grid;grid-template-columns:1fr 1fr;gap:80px;align-items:center;padding:100px 56px;max-width:1280px;margin:0 auto}
.about-img{position:relative}
.about-img img{width:100%;height:580px;object-fit:cover}
.about-accent{position:absolute;top:-20px;left:-20px;width:160px;height:160px;border:3px solid var(--accent);z-index:-1;animation:float 4s ease-in-out infinite}
.about-year{position:absolute;bottom:28px;right:-28px;background:var(--accent);color:white;padding:20px 24px;text-align:center}
.about-year .num{font-family:'Bebas Neue',sans-serif;font-size:48px;line-height:1;letter-spacing:2px}
.about-year .lbl{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase}
.about h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(44px,4vw,64px);line-height:1;margin-bottom:20px;letter-spacing:2px}
.about p{font-size:15px;color:var(--muted);line-height:1.9;margin-bottom:14px}
.about-features{display:flex;flex-direction:column;gap:14px;margin-top:28px}
.feature-row{display:flex;align-items:center;gap:14px;font-size:14px;color:var(--text);font-weight:500}
.feature-check{width:28px;height:28px;background:var(--accent);border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:13px;flex-shrink:0}
.testimonials{background:var(--surface);padding:100px 56px;border-top:1px solid #1f1f1f}
.testi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;margin-top:52px;max-width:1280px;margin-left:auto;margin-right:auto}
.testi-card{background:var(--surface2);padding:32px;transition:all .3s;border-left:3px solid transparent}
.testi-card:hover{border-left-color:var(--accent);transform:translateY(-4px)}
.testi-stars{color:var(--accent);font-size:14px;margin-bottom:16px}
.testi-text{font-size:15px;color:var(--text);line-height:1.8;margin-bottom:20px;font-style:italic}
.testi-author{display:flex;align-items:center;gap:12px}
.testi-avatar{width:44px;height:44px;border-radius:4px;background:var(--accent);display:flex;align-items:center;justify-content:center;font-family:'Bebas Neue',sans-serif;font-size:18px;letter-spacing:1px;color:white}
.testi-name{font-size:14px;font-weight:700;letter-spacing:.3px}
.testi-role{font-size:12px;color:var(--muted)}
.testi-result{font-size:11px;color:var(--accent);font-weight:700;letter-spacing:1px;text-transform:uppercase;margin-top:2px}
.pricing-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2px;margin-top:52px}
.price-card{background:var(--surface);padding:36px;transition:all .3s;position:relative;border-top:3px solid transparent}
.price-card.featured{border-top-color:var(--accent);background:var(--surface2)}
.price-card:hover{transform:translateY(-6px)}
.price-badge{display:inline-block;background:var(--accent);color:white;font-size:10px;font-weight:700;padding:4px 10px;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:16px}
.price-name{font-family:'Bebas Neue',sans-serif;font-size:22px;letter-spacing:2px;color:var(--muted);margin-bottom:12px}
.price-amount{font-family:'Bebas Neue',sans-serif;font-size:64px;color:var(--text);line-height:1;letter-spacing:2px}
.price-period{font-size:13px;color:var(--muted);margin-bottom:28px}
.price-features{list-style:none;display:flex;flex-direction:column;gap:10px;margin-bottom:28px}
.price-features li{display:flex;align-items:center;gap:10px;font-size:14px;color:var(--muted)}
.price-features li::before{content:"→";color:var(--accent);font-weight:700}
.price-btn{display:block;text-align:center;padding:14px;font-size:14px;font-weight:700;text-decoration:none;transition:all .25s;letter-spacing:1px;text-transform:uppercase}
.price-btn.main{background:var(--accent);color:white}
.price-btn.main:hover{background:#c1121f;transform:scale(1.03)}
.price-btn.outline{border:1px solid #333;color:var(--muted)}
.price-btn.outline:hover{border-color:var(--accent);color:var(--accent)}
.faq-list{max-width:760px;margin:52px auto 0}
.faq-item{border-bottom:1px solid #1f1f1f}
.faq-q{display:flex;justify-content:space-between;align-items:center;padding:22px 0;cursor:pointer;font-size:16px;font-weight:600;transition:color .2s}
.faq-q:hover{color:var(--accent)}
.faq-icon{width:28px;height:28px;border:1px solid #333;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;transition:all .3s;color:var(--muted)}
.faq-a{display:none;padding:0 0 20px;font-size:14px;color:var(--muted);line-height:1.9}
.faq-item.open .faq-icon{background:var(--accent);border-color:var(--accent);color:white;transform:rotate(45deg)}
.faq-item.open .faq-a{display:block}
.cta-section{padding:120px 56px;text-align:center;position:relative;overflow:hidden}
.cta-bg{position:absolute;inset:0;background:url('https://images.pexels.com/photos/1552249/pexels-photo-1552249.jpeg?auto=compress&cs=tinysrgb&w=1600') center/cover;filter:brightness(.15)}
.cta-content{position:relative;z-index:2}
.cta-section h2{font-family:'Bebas Neue',sans-serif;font-size:clamp(52px,7vw,96px);line-height:.95;margin-bottom:20px;letter-spacing:3px}
.cta-section h2 span{color:var(--accent)}
.cta-section p{font-size:18px;color:rgba(245,245,245,.7);margin-bottom:36px;max-width:480px;margin-left:auto;margin-right:auto;line-height:1.8}
footer{background:#080808;border-top:1px solid #1a1a1a;padding:72px 56px 32px}
.footer-grid{display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:48px;max-width:1280px;margin:0 auto 48px}
.footer-brand p{font-size:13px;color:var(--muted);line-height:1.8;margin-top:12px;max-width:260px}
.footer-col h4{font-size:11px;font-weight:700;letter-spacing:2px;color:var(--accent);text-transform:uppercase;margin-bottom:18px}
.footer-col a{display:block;font-size:13px;color:var(--muted);text-decoration:none;margin-bottom:10px;transition:color .2s}
.footer-col a:hover{color:var(--text)}
.footer-bottom{border-top:1px solid #1a1a1a;padding-top:28px;display:flex;justify-content:space-between;align-items:center;max-width:1280px;margin:0 auto;font-size:12px;color:#444}
.map-section{padding:80px 56px;max-width:1280px;margin:0 auto}
.map-wrap{border-radius:4px;overflow:hidden;border:1px solid #1f1f1f}
.map-wrap img{width:100%;display:block;transition:transform .4s;filter:grayscale(.8) contrast(1.1)}
.map-wrap:hover img{transform:scale(1.02);filter:grayscale(.3)}
@media(max-width:768px){
  nav,nav.scrolled{padding:16px 24px}
  .nav-links{display:none}
  .hamburger{display:flex}
  .stats{grid-template-columns:repeat(2,1fr)}
  .stat{border-right:none;border-bottom:1px solid rgba(255,255,255,.2)}
  .programs-grid,.testi-grid,.pricing-grid{grid-template-columns:1fr}
  .about-grid{grid-template-columns:1fr;gap:40px;padding:72px 24px}
  .section,.map-section,.testimonials,.cta-section{padding:72px 24px}
  .footer-grid{grid-template-columns:1fr 1fr}
  .hero{padding:120px 24px 80px}
}
</style>
</head>
<body>
<nav id="nav">
  <div class="logo">Iron<span>Forge</span></div>
  <div class="nav-links">
    <a href="#programs">Programs</a>
    <a href="#about">About</a>
    <a href="#pricing">Pricing</a>
    <a href="#faq">FAQ</a>
    <a href="#contact" class="nav-cta">FREE SESSION</a>
  </div>
  <button class="hamburger" id="burger" aria-label="Menu">
    <span></span><span></span><span></span>
  </button>
</nav>
<div class="mobile-menu" id="mobileMenu">
  <a href="#programs" onclick="closeMobile()">Programs</a>
  <a href="#about" onclick="closeMobile()">About</a>
  <a href="#pricing" onclick="closeMobile()">Pricing</a>
  <a href="#faq" onclick="closeMobile()">FAQ</a>
  <a href="#contact" onclick="closeMobile()" style="color:var(--accent)">Free Session →</a>
</div>
<section class="hero" id="home">
  <div class="hero-bg"></div>
  <div class="hero-content">
    <div class="hero-badge">⚡ NYC'S #1 RESULTS-DRIVEN GYM</div>
    <h1>BUILD YOUR<br/><span>STRONGEST</span><br/>BODY YET.</h1>
    <p>Elite personal training, group classes & nutrition coaching in the heart of Manhattan. Results guaranteed in 90 days or your money back.</p>
    <div class="hero-btns">
      <a href="#contact" class="btn-primary">CLAIM FREE SESSION →</a>
      <a href="#programs" class="btn-secondary">VIEW PROGRAMS</a>
    </div>
    <div class="hero-trust">
      <span class="stars">★★★★★</span> &nbsp;4.9/5 from 428 reviews · Open 7 days · Est. 2015
    </div>
  </div>
</section>
<div class="stats">
  <div class="stat reveal"><div class="stat-num" data-target="2400">0</div><div class="stat-label">Members Transformed</div></div>
  <div class="stat reveal"><div class="stat-num" data-target="90">0</div><div class="stat-label">Day Guarantee</div></div>
  <div class="stat reveal"><div class="stat-num" data-target="12">0</div><div class="stat-label">Expert Trainers</div></div>
  <div class="stat reveal"><div class="stat-num" data-target="428">0</div><div class="stat-label">5-Star Reviews</div></div>
</div>
<section class="section" id="programs">
  <div class="section-label reveal">Our Programs</div>
  <h2 class="section-title reveal">TRAIN WITH PURPOSE</h2>
  <p class="section-sub reveal">Every program is built around real results — not just showing up. We track your progress every single week.</p>
  <div class="programs-grid">
    <div class="program-card reveal-scale">
      <img src="https://images.pexels.com/photos/1552242/pexels-photo-1552242.jpeg?auto=compress&cs=tinysrgb&w=600" alt="Personal Training" loading="lazy"/>
      <div class="program-overlay">
        <div class="program-tag">1-on-1 · 60 min</div>
        <div class="program-name">PERSONAL TRAINING</div>
        <div class="program-desc">Fully customized workouts built around your goals, schedule, and fitness level.</div>
      </div>
    </div>
    <div class="program-card reveal-scale">
      <img src="https://images.pexels.com/photos/1552249/pexels-photo-1552249.jpeg?auto=compress&cs=tinysrgb&w=600" alt="HIIT Classes" loading="lazy"/>
      <div class="program-overlay">
        <div class="program-tag">Group · 45 min</div>
        <div class="program-name">HIIT & STRENGTH</div>
        <div class="program-desc">High-intensity interval training combined with strength work. Burns up to 800 calories per session.</div>
      </div>
    </div>
    <div class="program-card reveal-scale">
      <img src="https://images.pexels.com/photos/3253501/pexels-photo-3253501.jpeg?auto=compress&cs=tinysrgb&w=600" alt="Nutrition Coaching" loading="lazy"/>
      <div class="program-overlay">
        <div class="program-tag">Online + In-Person</div>
        <div class="program-name">NUTRITION COACHING</div>
        <div class="program-desc">Custom meal plans, weekly check-ins, and macro tracking.</div>
      </div>
    </div>
  </div>
</section>
<div class="about-grid" id="about">
  <div class="about-img reveal-left">
    <img src="https://images.pexels.com/photos/1552252/pexels-photo-1552252.jpeg?auto=compress&cs=tinysrgb&w=800" alt="IronForge Gym NYC"/>
    <div class="about-accent"></div>
    <div class="about-year"><div class="num">9+</div><div class="lbl">Years Strong</div></div>
  </div>
  <div class="reveal">
    <div class="section-label">Our Story</div>
    <h2 class="section-title">WE DON'T DO AVERAGE.</h2>
    <p>IronForge was founded in 2015 with one mission: build a gym where every single member gets real, measurable results.</p>
    <p>Located in the heart of Midtown Manhattan, we've helped over 2,400 New Yorkers lose weight, build muscle, and completely transform how they feel about their bodies.</p>
    <div class="about-features">
      <div class="feature-row"><div class="feature-check">✓</div>90-day transformation guarantee — results or full refund</div>
      <div class="feature-row"><div class="feature-check">✓</div>NASM & NSCA certified trainers only</div>
      <div class="feature-row"><div class="feature-check">✓</div>State-of-the-art 8,000 sq ft facility</div>
      <div class="feature-row"><div class="feature-check">✓</div>Open 5am–11pm, 7 days a week</div>
    </div>
  </div>
</div>
<section class="testimonials" id="testimonials">
  <div style="max-width:1280px;margin:0 auto">
    <div class="section-label reveal">Results</div>
    <h2 class="section-title reveal">REAL PEOPLE. REAL RESULTS.</h2>
    <div class="testi-grid">
      <div class="testi-card reveal-scale">
        <div class="testi-stars">★★★★★</div>
        <div class="testi-text">"I lost 34 lbs in 90 days and genuinely feel like a different person. My trainer Jake pushed me harder than I've ever been pushed while still making every session fun."</div>
        <div class="testi-author"><div class="testi-avatar">MR</div><div><div class="testi-name">Marcus R.</div><div class="testi-role">Member since 2023</div><div class="testi-result">↓ 34 lbs in 90 days</div></div></div>
      </div>
      <div class="testi-card reveal-scale">
        <div class="testi-stars">★★★★★</div>
        <div class="testi-text">"As a busy NYC professional I needed a gym that works with my schedule. IronForge opens at 5am and the trainers actually remember your name."</div>
        <div class="testi-author"><div class="testi-avatar">SC</div><div><div class="testi-name">Sarah C.</div><div class="testi-role">Member since 2022</div><div class="testi-result">↑ 18 lbs muscle gained</div></div></div>
      </div>
      <div class="testi-card reveal-scale">
        <div class="testi-stars">★★★★★</div>
        <div class="testi-text">"The 90-day guarantee is real. I ended up losing 28 lbs. The accountability here is unlike anything else."</div>
        <div class="testi-author"><div class="testi-avatar">DK</div><div><div class="testi-name">Derek K.</div><div class="testi-role">Member since 2024</div><div class="testi-result">↓ 28 lbs in 11 weeks</div></div></div>
      </div>
    </div>
  </div>
</section>
<section class="section" id="pricing">
  <div class="section-label reveal">Pricing</div>
  <h2 class="section-title reveal">STRAIGHT TALK ON PRICE.</h2>
  <p class="section-sub reveal">No hidden fees, no lock-in contracts. Cancel anytime. Your first session is always free.</p>
  <div class="pricing-grid">
    <div class="price-card reveal-scale">
      <div class="price-name">Drop-In Pass</div>
      <div class="price-amount">$35</div>
      <div class="price-period">single class</div>
      <ul class="price-features"><li>Any group class</li><li>All equipment access</li><li>Locker room included</li></ul>
      <a href="#contact" class="price-btn outline">BOOK A CLASS</a>
    </div>
    <div class="price-card featured reveal-scale">
      <div class="price-badge">MOST POPULAR</div>
      <div class="price-name">Unlimited Monthly</div>
      <div class="price-amount">$149</div>
      <div class="price-period">per month · cancel anytime</div>
      <ul class="price-features"><li>Unlimited group classes</li><li>2 PT sessions/month</li><li>Nutrition check-in</li><li>Guest pass included</li><li>90-day guarantee</li></ul>
      <a href="#contact" class="price-btn main">START FREE TRIAL</a>
    </div>
    <div class="price-card reveal-scale">
      <div class="price-name">Elite 1-on-1</div>
      <div class="price-amount">$299</div>
      <div class="price-period">per month · 8 sessions</div>
      <ul class="price-features"><li>8 personal training sessions</li><li>Custom meal plan</li><li>Weekly progress tracking</li><li>Priority scheduling</li><li>90-day guarantee</li></ul>
      <a href="#contact" class="price-btn outline">GET STARTED</a>
    </div>
  </div>
</section>
<section class="section" id="faq">
  <div class="section-label reveal">FAQ</div>
  <h2 class="section-title reveal" style="text-align:center">GOT QUESTIONS?</h2>
  <div class="faq-list">
    <div class="faq-item reveal"><div class="faq-q">What is the 90-day guarantee exactly? <div class="faq-icon">+</div></div><div class="faq-a">If you complete all scheduled sessions, follow your nutrition plan, and don't see measurable results in 90 days, we give you a full refund — no questions asked.</div></div>
    <div class="faq-item reveal"><div class="faq-q">Do I need experience to join? <div class="faq-icon">+</div></div><div class="faq-a">Zero experience needed. We work with complete beginners every day. Your first session is an assessment where we learn where you are and build your program from there.</div></div>
    <div class="faq-item reveal"><div class="faq-q">How early/late are you open? <div class="faq-icon">+</div></div><div class="faq-a">Monday–Friday 5am–11pm. Saturday 7am–9pm. Sunday 8am–8pm.</div></div>
    <div class="faq-item reveal"><div class="faq-q">Can I cancel my membership anytime? <div class="faq-icon">+</div></div><div class="faq-a">Yes — no lock-in contracts, ever. Cancel with 30 days notice at any time.</div></div>
  </div>
</section>
<section class="cta-section" id="contact">
  <div class="cta-bg"></div>
  <div class="cta-content">
    <div class="section-label reveal">Get Started</div>
    <h2 class="reveal">YOUR FIRST<br/><span>SESSION IS FREE.</span></h2>
    <p class="reveal">No commitment. No credit card. Just show up and let us show you what IronForge can do for you.</p>
    <div class="reveal" style="display:flex;gap:14px;justify-content:center;flex-wrap:wrap">
      <a href="tel:+12125550182" class="btn-primary">📞 CALL TO BOOK FREE SESSION</a>
      <a href="mailto:hello@ironforgegym.com" class="btn-secondary">EMAIL US</a>
    </div>
    <p class="reveal" style="margin-top:20px;font-size:13px;color:var(--muted)">📍 247 W 35th St, New York, NY · Mon–Fri 5am–11pm · Sat–Sun 7am–9pm</p>
  </div>
</section>
<footer>
  <div class="footer-grid">
    <div class="footer-brand"><div class="logo" style="font-size:22px">Iron<span>Forge</span></div><p>NYC's most results-driven personal training studio. Transforming bodies and lives since 2015.</p></div>
    <div class="footer-col"><h4>Programs</h4><a href="#programs">Personal Training</a><a href="#programs">HIIT & Strength</a><a href="#programs">Nutrition Coaching</a></div>
    <div class="footer-col"><h4>Studio</h4><a href="#about">Our Story</a><a href="#pricing">Pricing</a><a href="#faq">FAQ</a></div>
    <div class="footer-col"><h4>Contact</h4><a href="tel:+12125550182">(212) 555-0182</a><a href="mailto:hello@ironforgegym.com">hello@ironforgegym.com</a><a href="#location">247 W 35th St, NYC</a></div>
  </div>
  <div class="footer-bottom"><span>© 2026 IronForge Gym. All rights reserved.</span><span>Built with Sitefliq AI ⚡</span></div>
</footer>
<script>
const nav = document.getElementById('nav');
window.addEventListener('scroll', () => nav.classList.toggle('scrolled', window.scrollY > 80));
document.getElementById('burger').addEventListener('click', () => document.getElementById('mobileMenu').classList.toggle('open'));
function closeMobile() { document.getElementById('mobileMenu').classList.remove('open'); }
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => { if(entry.isIntersecting) { entry.target.classList.add('visible'); const num = entry.target.querySelector('[data-target]'); if(num) animateCounter(num); } });
}, {threshold: 0.15});
document.querySelectorAll('.reveal, .reveal-left, .reveal-scale').forEach(el => observer.observe(el));
function animateCounter(el) {
  if(el.dataset.animated) return; el.dataset.animated = true;
  const target = parseInt(el.dataset.target); const start = performance.now(); const duration = 2000;
  const update = now => { const progress = Math.min((now - start) / duration, 1); const ease = 1 - Math.pow(1 - progress, 3); el.textContent = Math.floor(ease * target).toLocaleString() + (progress < 1 ? '' : '+'); if(progress < 1) requestAnimationFrame(update); };
  requestAnimationFrame(update);
}
document.querySelectorAll('[data-target]').forEach(el => { new IntersectionObserver(entries => { if(entries[0].isIntersecting) animateCounter(el); }, {threshold: 0.5}).observe(el); });
document.querySelectorAll('.faq-q').forEach(q => { q.addEventListener('click', () => { const item = q.parentElement; const wasOpen = item.classList.contains('open'); document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open')); if(!wasOpen) item.classList.add('open'); }); });
document.querySelectorAll('a[href^="#"]').forEach(a => { a.addEventListener('click', e => { const target = document.querySelector(a.getAttribute('href')); if(target) { e.preventDefault(); target.scrollIntoView({behavior:'smooth'}); } }); });
</script>
</body>
</html>
`;

/* ─────────────────────────────────────────────────────────────────────────────
   HELP PAGE
───────────────────────────────────────────────────────────────────────────── */
function HelpPage({onHome}) {
  const [category, setCategory] = useState(null);
  const [form, setForm] = useState({name:"",email:"",subject:"",message:""});
  const [charCount, setCharCount] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);

  const categories = [
    {id:"feature", icon:"💡", label:"Feature Request"},
    {id:"bug",     icon:"🐛", label:"Bug / Issue"},
    {id:"question",icon:"❓", label:"General Question"},
    {id:"other",   icon:"💬", label:"Other"},
  ];

  const faqs = [
    {q:"My page didn't generate — what happened?", a:"Usually a network timeout or very short description. Try again with a longer business description (3–5 sentences). If you see 'API 401' contact us immediately."},
    {q:"I paid but nothing happened", a:"After paying, return to Sitefliq and click 'I've Paid — Generate My Page'. If credits aren't showing, email us your payment receipt and we'll sort it within the hour."},
    {q:"The images don't match my business", a:"Make sure you select the correct industry from the dropdown — this controls which photos are sourced."},
    {q:"How do I host my downloaded HTML file?", a:"Go to netlify.com, create a free account, and drag-and-drop your HTML file onto the dashboard. Your site goes live instantly at a free URL."},
    {q:"Do my credits expire?", a:"Never. Credits are yours to use whenever you're ready — no time pressure, no subscription."},
    {q:"Can I edit the page after downloading?", a:"Yes — open the file in any text editor (VS Code, Notepad) and edit the text between HTML tags directly."},
    {q:"What does 'No Sitefliq branding' mean?", a:"Starter pages include a small 'Built with Sitefliq' link in the footer. Pro and Agency plans remove this completely."},
  ];

  const handleSubmit = () => {
    if(!form.name||!form.email||!form.message||!category) return;
    const subject = encodeURIComponent(`[Sitefliq ${categories.find(c=>c.id===category)?.label}] ${form.subject||"Support Request"}`);
    const body = encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\nCategory: ${categories.find(c=>c.id===category)?.label}\nSubject: ${form.subject}\n\nMessage:\n${form.message}`);
    window.open(`mailto:hello@sitefliq.com?subject=${subject}&body=${body}`,"_blank");
    setSubmitted(true);
  };

  const inp = {width:"100%",padding:"11px 14px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,fontFamily:"'Geist',sans-serif",outline:"none",color:"#111827",background:"white",transition:"border-color .2s"};

  return (
    <div style={{minHeight:"100vh",background:"#fafaf9",fontFamily:"'Geist',sans-serif"}}>
      <GS/>
      <div style={{height:52,background:"white",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 28px",position:"sticky",top:0,zIndex:10}}>
        <button onClick={onHome} style={{display:"flex",alignItems:"center",gap:6,background:"transparent",border:"none",cursor:"pointer",fontSize:13,color:"#6b7280",fontFamily:"inherit",fontWeight:500}}>← Back</button>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <div style={{width:24,height:24,background:"#f97316",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"white",fontWeight:800}}>S</div>
          <span style={{fontSize:14,fontWeight:800,color:"#111827"}}>Sitefliq</span>
          <span style={{fontSize:13,color:"#9ca3af",marginLeft:4}}>Help</span>
        </div>
        <div style={{width:80}}/>
      </div>
      <div style={{maxWidth:680,margin:"0 auto",padding:"44px 24px 80px"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <h1 style={{fontSize:28,fontWeight:800,color:"#111827",marginBottom:10,fontFamily:"'Instrument Serif',serif",letterSpacing:"-.5px"}}>Help Center</h1>
          <p style={{fontSize:14,color:"#6b7280",lineHeight:1.6}}>Have a question, found a bug, or want a new feature? Let us know!</p>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:28}}>
          {categories.map(c=>(
            <div key={c.id} onClick={()=>setCategory(c.id)} style={{background:"white",border:`1.5px solid ${category===c.id?"#f97316":"#e5e7eb"}`,borderRadius:12,padding:"18px 12px",textAlign:"center",cursor:"pointer",transition:"all .15s",boxShadow:category===c.id?"0 0 0 3px rgba(249,115,22,.1)":"none"}}>
              <div style={{fontSize:22,marginBottom:8}}>{c.icon}</div>
              <div style={{fontSize:12,fontWeight:600,color:category===c.id?"#f97316":"#374151"}}>{c.label}</div>
            </div>
          ))}
        </div>
        <div style={{background:"white",border:"1px solid #e5e7eb",borderRadius:14,padding:"28px 28px 24px",marginBottom:40,boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
          {submitted ? (
            <div style={{textAlign:"center",padding:"32px 0"}}>
              <div style={{fontSize:44,marginBottom:16}}>✅</div>
              <div style={{fontSize:18,fontWeight:800,color:"#111827",marginBottom:8}}>Query Submitted!</div>
              <p style={{fontSize:13,color:"#6b7280",lineHeight:1.7}}>Your email client opened with your message pre-filled. We'll respond within 24 hours.</p>
              <button onClick={()=>setSubmitted(false)} style={{marginTop:20,padding:"10px 22px",background:"#f97316",border:"none",borderRadius:8,fontSize:13,fontWeight:700,color:"white",cursor:"pointer",fontFamily:"inherit"}}>Submit Another</button>
            </div>
          ) : (
            <>
              <h2 style={{fontSize:17,fontWeight:800,color:"#111827",marginBottom:4}}>Submit a Query</h2>
              <p style={{fontSize:12,color:"#9ca3af",marginBottom:22}}>Fill out the form below and we'll respond via email.</p>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                <div><label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:6}}>Your Name</label><input style={inp} placeholder="John Doe" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
                <div><label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:6}}>Email Address</label><input style={inp} placeholder="john@email.com" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/></div>
              </div>
              <div style={{marginBottom:14}}>
                <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:6}}>Subject</label>
                <input style={inp} placeholder="Brief summary of your query" value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))}/>
              </div>
              <div style={{marginBottom:8}}>
                <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:6}}>Message</label>
                <textarea style={{...inp,resize:"vertical",minHeight:130,lineHeight:1.6}} placeholder="Describe your query in detail..." maxLength={500} value={form.message} onChange={e=>{setForm(f=>({...f,message:e.target.value}));setCharCount(e.target.value.length);}}/>
              </div>
              <div style={{display:"flex",justifyContent:"flex-end",marginBottom:18,fontSize:11,color:"#9ca3af"}}><span>{charCount}/500</span></div>
              <button onClick={handleSubmit} disabled={!form.name||!form.email||!form.message||!category} style={{width:"100%",padding:"13px",background:(!form.name||!form.email||!form.message||!category)?"#fde8d8":"#f97316",border:"none",borderRadius:10,fontSize:14,fontWeight:700,color:"white",cursor:(!form.name||!form.email||!form.message||!category)?"not-allowed":"pointer",fontFamily:"inherit",transition:"background .2s"}}>
                ✈️ Submit Query
              </button>
            </>
          )}
        </div>
        <div>
          <h2 style={{fontSize:17,fontWeight:800,color:"#111827",marginBottom:16}}>Frequently Asked Questions</h2>
          <div style={{borderRadius:12,overflow:"hidden",border:"1px solid #e5e7eb",background:"white"}}>
            {faqs.map((faq,i)=>(
              <div key={i} style={{borderBottom:i<faqs.length-1?"1px solid #f3f4f6":"none"}}>
                <div onClick={()=>setOpenFaq(openFaq===i?null:i)} style={{padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",gap:12}}>
                  <span style={{fontSize:13,fontWeight:600,color:"#111827",lineHeight:1.4}}>{faq.q}</span>
                  <span style={{color:"#f97316",fontSize:18,fontWeight:300,flexShrink:0,transition:"transform .25s",display:"inline-block",transform:openFaq===i?"rotate(45deg)":"rotate(0)"}}>+</span>
                </div>
                {openFaq===i&&(<div style={{padding:"0 20px 16px",fontSize:13,color:"#6b7280",lineHeight:1.75}}>{faq.a}</div>)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function ExamplePage({onBack,onBuild}) {
  const [blobUrl,setBlobUrl]=useState(null);
  useEffect(()=>{
    const b=new Blob([EXAMPLE_HTML],{type:"text/html"});
    const u=URL.createObjectURL(b);
    setBlobUrl(u);
    return()=>URL.revokeObjectURL(u);
  },[]);
  return (
    <div style={{minHeight:"100vh",background:"#fafaf9",fontFamily:"'Geist',sans-serif"}}>
      <GS/>
      <div style={{height:54,background:"white",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 28px",position:"sticky",top:0,zIndex:10}}>
        <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"transparent",border:"none",cursor:"pointer",fontSize:13,color:"#6b7280",fontFamily:"inherit"}}>← Back</button>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:24,height:24,background:"#f97316",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"white",fontWeight:800}}>S</div>
          <span style={{fontSize:14,fontWeight:800,color:"#111827"}}>Example Output</span>
        </div>
        <button onClick={onBuild} style={{padding:"8px 18px",background:"#f97316",border:"none",borderRadius:8,fontSize:13,cursor:"pointer",color:"white",fontFamily:"inherit",fontWeight:700}}>Build Mine →</button>
      </div>
      <div style={{background:"#fff7ed",borderBottom:"1px solid #fed7aa",padding:"12px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10,fontSize:13}}>
          <span style={{fontSize:16}}>✦</span>
          <span style={{fontWeight:600,color:"#111827"}}>IronForge Gym NYC</span>
          <span style={{color:"#9ca3af"}}>— Sample page generated by Sitefliq AI</span>
          <span style={{background:"#f97316",color:"white",padding:"2px 8px",borderRadius:4,fontSize:10,fontWeight:700}}>EXAMPLE</span>
        </div>
        <div style={{display:"flex",gap:8}}>
          {blobUrl&&<button onClick={()=>window.open(blobUrl,"_blank")} style={{padding:"7px 14px",background:"white",border:"1px solid #e5e7eb",borderRadius:7,fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>🔗 Open Full Page</button>}
          <button onClick={onBuild} style={{padding:"7px 16px",background:"#f97316",border:"none",borderRadius:7,fontSize:12,cursor:"pointer",color:"white",fontFamily:"inherit",fontWeight:700}}>Build Your Page →</button>
        </div>
      </div>
      <div style={{background:"white",borderBottom:"1px solid #f3f4f6",padding:"12px 28px",display:"flex",gap:20,flexWrap:"wrap"}}>
        {[["🔍","Full SEO meta tags"],["🎯","5+ Conversion CTAs"],["📱","Mobile responsive"],["✍️","Niche-specific copy"],["⚡","FAQ accordion"],["🌙","Dark luxury theme"]].map(([ic,t])=>(
          <div key={t} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#374151"}}><span>{ic}</span><span style={{fontWeight:500}}>{t}</span></div>
        ))}
      </div>
      <div style={{padding:"24px 28px"}}>
        <div style={{borderRadius:14,overflow:"hidden",boxShadow:"0 4px 30px rgba(0,0,0,.1)",border:"1px solid #e5e7eb"}}>
          <div style={{background:"#f1f5f9",padding:"10px 16px",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid #e5e7eb"}}>
            <div style={{display:"flex",gap:5}}>{["#ef4444","#f59e0b","#22c55e"].map(c=><div key={c} style={{width:10,height:10,borderRadius:"50%",background:c}}/>)}</div>
            <div style={{flex:1,background:"white",borderRadius:20,padding:"5px 14px",fontSize:11,color:"#6b7280",display:"flex",alignItems:"center",gap:6,maxWidth:400,margin:"0 auto"}}><span>🔒</span> ironforgegym.com</div>
          </div>
          {blobUrl
            ? <iframe src={blobUrl} style={{width:"100%",height:"85vh",border:"none",display:"block"}} title="Example landing page"/>
            : <div style={{height:"85vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f9fafb"}}><div style={{textAlign:"center",color:"#9ca3af"}}><div style={{fontSize:32,marginBottom:8,animation:"spin 1s linear infinite",display:"inline-block"}}>◌</div><div style={{fontSize:13}}>Loading example…</div></div></div>
          }
        </div>
      </div>
      <div style={{textAlign:"center",padding:"32px 28px 48px"}}>
        <div style={{fontSize:14,color:"#6b7280",marginBottom:16}}>Ready to build your own version? It takes 60 seconds.</div>
        <button onClick={onBuild} style={{padding:"14px 40px",background:"#f97316",color:"white",border:"none",borderRadius:10,fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 20px #f9731640"}}>Build My Landing Page →</button>
      </div>
    </div>
  );
}

export default function Sitefliq() {
  const [screen,setScreen]=useState("home");
  const [resHtml,setResHtml]=useState("");
  const [genErr,setGenErr]=useState(null);
  const [user,setUser]=useState(null);
  const [credits,setCredits]=useState(0);
  const [showAuth,setShowAuth]=useState(false);
  const [authMode,setAuthMode]=useState("signin");
  const [legalScreen,setLegalScreen]=useState(null);

  useEffect(()=>{
    const handler = (e) => setLegalScreen(e.detail);
    window.addEventListener("sitefliq-legal", handler);
    const hash = window.location.hash.replace("#","");
    if(["terms","privacy","refund"].includes(hash)) setLegalScreen(hash);
    const hashHandler = () => {
      const h = window.location.hash.replace("#","");
      if(["terms","privacy","refund"].includes(h)) setLegalScreen(h);
      else setLegalScreen(null);
    };
    window.addEventListener("hashchange", hashHandler);
    return () => {
      window.removeEventListener("sitefliq-legal", handler);
      window.removeEventListener("hashchange", hashHandler);
    };
  },[]);

  useEffect(()=>{
    if(sb.restoreSession()){
      setUser(sb._user);
      sb.getCredits().then(setCredits);
    }
    const params = new URLSearchParams(window.location.search);
    if(params.get("payment")==="success"){
      setTimeout(()=>{
        sb.getCredits().then(c=>{
          setCredits(c);
          window.history.replaceState({},document.title,window.location.pathname);
        });
      }, 2000);
    }
  },[]);

  const handleSignOut = async () => {
    await sb.signOut();
    setUser(null);
    setCredits(0);
    setScreen("home");
  };

  const refreshCredits = async () => {
    const c = await sb.getCredits();
    setCredits(c);
    return c;
  };

  const [form,setForm]=useState({
    name:"",industry:"",tagline:"",description:"",
    location:"",phone:"",email:"",cta:"Get Started Today",
    palette:"noir",vibe:"bold",logo:"",importedColours:[],
    sections:["hero","social_proof","services","about","testimonials","contact"],
  });
  const up=(k,v)=>setForm(p=>({...p,[k]:v}));
  const togSec=id=>{
    if(id==="hero"||id==="social_proof")return;
    setForm(p=>({...p,sections:p.sections.includes(id)?p.sections.filter(s=>s!==id):[...p.sections,id]}));
  };
  const ready=form.name.trim()&&form.industry.trim()&&form.description.trim();

  useEffect(()=>{
    if(window.Paddle) return;
    const s=document.createElement("script");
    s.src="https://cdn.paddle.com/paddle/v2/paddle.js";
    s.onload=()=>{ window.Paddle.Setup({token:"live_b719e178798ff8d1da2e0d42565"}); };
    document.head.appendChild(s);
  },[]);

  const handlePurchase=(plan)=>{
    if(!user){
      setAuthMode("signup");
      setShowAuth(true);
      return;
    }
    sessionStorage.setItem("sitefliq_form",JSON.stringify(form));
    sessionStorage.setItem("sitefliq_plan",plan.id);
    if(window.Paddle){
      window.Paddle.Checkout.open({
        items:[{priceId:plan.priceId, quantity:1}],
        successUrl: window.location.origin + "?payment=success",
        customData:{plan:plan.id, user_id: user.id},
        customer: {email: user.email},
      });
    }
    setScreen("waiting_payment");
  };

  if(legalScreen==="terms") return <TermsPage onHome={()=>setLegalScreen(null)}/>;
  if(legalScreen==="privacy") return <PrivacyPage onHome={()=>setLegalScreen(null)}/>;
  if(legalScreen==="refund") return <RefundPage onHome={()=>setLegalScreen(null)}/>;
  if(screen==="home") return <><HomePage onBuild={()=>setScreen("builder")} onPricing={()=>setScreen("pricing_standalone")} onExample={()=>setScreen("example")} onHelp={()=>setScreen("help")} user={user} credits={credits} onSignIn={()=>{setAuthMode("signin");setShowAuth(true);}} onSignOut={handleSignOut}/>{showAuth&&<AuthModal mode={authMode} onSuccess={()=>{setUser(sb._user);sb.getCredits().then(setCredits);setShowAuth(false);}} onClose={()=>setShowAuth(false)}/>}</>;
  if(screen==="help") return <HelpPage onHome={()=>setScreen("home")}/>;
  if(screen==="example") return <ExamplePage onBack={()=>setScreen("home")} onBuild={()=>setScreen("builder")}/>;
  if(screen==="pricing_standalone") return <><PricingPage onBuild={()=>setScreen("builder")} onHome={()=>setScreen("home")} user={user} credits={credits} onSignIn={()=>{setAuthMode("signin");setShowAuth(true);}} onSignOut={handleSignOut} onPurchase={handlePurchase}/>{showAuth&&<AuthModal mode={authMode} onSuccess={()=>{setUser(sb._user);sb.getCredits().then(setCredits);setShowAuth(false);}} onClose={()=>setShowAuth(false)}/>}</>;
  if(screen==="pricing_wall") return <><PricingWall form={form} onBack={()=>setScreen("builder")} onPurchase={handlePurchase} user={user} credits={credits} onSignIn={()=>{setAuthMode("signin");setShowAuth(true);}}/>{showAuth&&<AuthModal mode={authMode} onSuccess={()=>{setUser(sb._user);sb.getCredits().then(setCredits);setShowAuth(false);}} onClose={()=>setShowAuth(false)}/>}</>;

  if(screen==="waiting_payment") return (
    <div style={{minHeight:"100vh",background:"#fafaf9",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Geist',sans-serif"}}>
      <GS/>
      <div style={{textAlign:"center",maxWidth:480,padding:40}}>
        <div style={{fontSize:48,marginBottom:20}}>💳</div>
        <h2 style={{fontSize:26,fontWeight:800,color:"#111827",marginBottom:12}}>Complete your payment</h2>
        <p style={{fontSize:14,color:"#6b7280",marginBottom:28,lineHeight:1.7}}>Complete your payment in the Paddle window. Once paid your credits will be added automatically.</p>
        <button onClick={async()=>{await refreshCredits();setScreen("pricing_wall");}} style={{width:"100%",padding:"14px",background:"#f97316",color:"white",border:"none",borderRadius:10,fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginBottom:12}}>
          ✓ I've Paid — Check Credits & Continue →
        </button>
        <button onClick={()=>setScreen("pricing_wall")} style={{width:"100%",padding:"12px",background:"white",color:"#6b7280",border:"1px solid #e5e7eb",borderRadius:10,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>← Go back</button>
        <p style={{marginTop:16,fontSize:11,color:"#9ca3af"}}>🔒 Payments secured by Paddle · 14-day money back guarantee</p>
      </div>
    </div>
  );

  return (
    <div style={{height:"100vh",display:"flex",flexDirection:"column",fontFamily:"'Geist',sans-serif",background:"#f1f5f9"}}>
      <GS/>
      <div style={{height:50,background:"white",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px",flexShrink:0}}>
        {showAuth&&<AuthModal mode={authMode} onSuccess={()=>{setUser(sb._user);sb.getCredits().then(setCredits);setShowAuth(false);}} onClose={()=>setShowAuth(false)}/>}
        <div onClick={()=>setScreen("home")} style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer"}}>
          <span style={{fontSize:15,color:"#9ca3af"}}>←</span>
          <div style={{width:23,height:23,background:"#f97316",borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"white",fontWeight:800}}>S</div>
          <span style={{fontSize:13,fontWeight:700,color:"#111827"}}>Landing Page Builder</span>
        </div>
        <div style={{fontSize:11,color:"#9ca3af",display:"flex",alignItems:"center",gap:10}}>
          {screen==="builder"&&"⚡ Powered by Claude AI"}
          {screen==="result"&&<span style={{color:"#16a34a",fontWeight:600}}>✓ Page Ready — {form.name}</span>}
          {screen==="generating"&&<span style={{color:"#f97316"}}>⚡ Generating…</span>}
          {user ? (
            <>
              <span style={{fontSize:12,background:"#fff7ed",color:"#f97316",border:"1px solid #fed7aa",borderRadius:20,padding:"3px 10px",fontWeight:700}}>⚡ {credits} credits</span>
              <button onClick={handleSignOut} style={{fontSize:12,background:"none",border:"1px solid #e5e7eb",borderRadius:6,padding:"4px 10px",cursor:"pointer",color:"#6b7280"}}>Sign out</button>
            </>
          ) : (
            <button onClick={()=>{setAuthMode("signin");setShowAuth(true);}} style={{fontSize:12,background:"#f97316",color:"white",border:"none",borderRadius:6,padding:"5px 12px",cursor:"pointer",fontWeight:600}}>Sign In</button>
          )}
        </div>
        <div style={{width:80}}/>
      </div>

      <div style={{flex:1,display:"grid",gridTemplateColumns:"360px 1fr",overflow:"hidden"}}>
        <div style={{borderRight:"1px solid #e5e7eb",overflow:"hidden",display:"flex",flexDirection:"column",background:"white"}}>
          {screen==="builder"&&<BuilderPanel form={form} up={up} togSec={togSec} ready={ready} onNext={()=>setScreen("pricing_wall")}/>}
          {screen==="generating"&&(
            <div style={{padding:"22px",display:"flex",flexDirection:"column",gap:9,height:"100%",overflowY:"auto",background:"white"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:4}}>Building your page…</div>
              {[["✓","SEO meta tags & schema"],["✓","Niche-specific copy"],["✓","Conversion CTAs"],["✓","Mobile responsive"],["⏳","Finalising HTML…"]].map(([ic,t],i)=>(
                <div key={t} style={{display:"flex",gap:8,alignItems:"center",fontSize:12,color:ic==="⏳"?"#f97316":"#16a34a"}}>
                  <span>{ic==="⏳"?<span style={{animation:"spin .8s linear infinite",display:"inline-block"}}>◌</span>:"✓"}</span>{t}
                </div>
              ))}
            </div>
          )}
          {screen==="result"&&<ResultScreen html={resHtml} form={form} onReset={()=>setScreen("builder")}/>}
        </div>
        <div style={{overflow:"hidden",display:"flex",flexDirection:"column"}}>
          {screen==="builder"&&<LivePreview form={form}/>}
          {screen==="generating"&&<GeneratingScreen form={form} onDone={async h=>{await sb.deductCredit();await refreshCredits();setResHtml(h);setScreen("result");}} onError={e=>{setGenErr(e);setScreen("builder");}}/>}
          {screen==="result"&&(
            <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40,background:"#f1f5f9",gap:18,textAlign:"center"}}>
              <div style={{fontSize:44}}>🎉</div>
              <div style={{fontSize:20,fontWeight:800,color:"#111827"}}>{form.name}</div>
              <p style={{fontSize:13,color:"#6b7280",maxWidth:340,lineHeight:1.7}}>Click <strong>"Open Preview in New Tab"</strong> on the left to see your full website in the browser.</p>
              <div style={{padding:"14px 22px",background:"white",borderRadius:12,border:"1px solid #e5e7eb",maxWidth:380,width:"100%"}}>
                <div style={{fontSize:10,color:"#9ca3af",marginBottom:8,textTransform:"uppercase",letterSpacing:1}}>Page Summary</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:12}}>
                  {[["Sections",form.sections.length],["Size",Math.round(resHtml.length/1000)+"KB"],["SEO","✓ Included"],["Mobile","✓ Ready"]].map(([k,v])=>(
                    <div key={k} style={{padding:"8px 11px",background:"#f9fafb",borderRadius:7}}>
                      <div style={{color:"#9ca3af",fontSize:10}}>{k}</div>
                      <div style={{fontWeight:700,color:"#111827",marginTop:1}}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
