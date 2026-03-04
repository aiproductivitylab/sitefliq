import { useState, useEffect } from "react";

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
    checkoutUrl:"https://sitefliq.lemonsqueezy.com/checkout/buy/YOUR_STARTER_LINK",
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
    checkoutUrl:"https://sitefliq.lemonsqueezy.com/checkout/buy/YOUR_PRO_LINK",
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
    checkoutUrl:"https://sitefliq.lemonsqueezy.com/checkout/buy/YOUR_AGENCY_LINK",
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
async function fetchPexelsImages(industry, apiKey) {
  const queries = getSectionKeywords(industry);
  const fetchOne = (q) =>
    fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=5&orientation=landscape`, {
      headers: { Authorization: apiKey }
    })
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
  return `You are a senior CRO expert and world-class web designer. Build a complete, production-ready, single-file HTML landing page.

BUSINESS:
Name: ${f.name}
Industry: ${f.industry}
Tagline: ${f.tagline||"Quality you can trust"}
Description: ${f.description}
Location: ${f.location||""}
Phone: ${f.phone||""}
Email: ${f.email||""}
CTA: ${f.cta||"Get Started Today"}

DESIGN:
Palette bg:${pal.bg} surface:${pal.surface} accent:${pal.accent} text:${pal.text}
Vibe: ${vib.label} — ${vib.desc}
Font: ONE distinctive Google Font pair (NOT Inter/Roboto — something memorable for this vibe)

${hasImages ? `REAL PHOTOS PROVIDED — each was specifically searched for its section. Use EXACTLY as specified:

HERO: background-image: url('${img(0)}') — full viewport, cover, with dark gradient overlay (rgba 0,0,0,0.6) so text is readable
ABOUT SECTION: <img src="${img(1)}" style="width:100%;height:100%;object-fit:cover"> — full height left column, professional/team photo
GALLERY: Use all of these as <img> tags with object-fit:cover:
  - ${img(0)} (hero/wide shot)
  - ${img(1)} (team/people)
  - ${img(2)} (detail/close up)
  - ${img(3)} (lifestyle/action)
  - ${img(4)} (service specific)
  - ${img(5)||img(0)} (service specific 2)
SERVICE CARDS: Each card is a full-bleed image card. Cycle through ALL provided images as background-image per card, with a dark gradient overlay. Use object-fit:cover.
CTA BANNER: background-image: url('${img(2)||img(0)}') — with dark overlay

CRITICAL RULES FOR IMAGES:
1. Use the EXACT URLs provided — do NOT modify, shorten or fake them
2. Every image tag must have object-fit:cover and a defined height
3. Hero and CTA must always have a dark overlay so text is readable
4. Do NOT use placeholder.com, picsum, or any other image service
5. Gallery items must use <img> tags not background-image` : `IMAGES: Use CSS gradients and geometric patterns. No external images.`}

SECTIONS:
1. Full SEO <head>: title, meta description, keywords, OG tags, Twitter card, canonical, schema.org LocalBusiness JSON-LD
2. Sticky header: name left, nav right, mobile hamburger
3. Hero: 100vh, H1 with keyword, subheadline, 2 CTAs, star rating trust line${heroImg ? ` — use hero background image with dark overlay` : ` — stunning CSS gradient/geometric pattern`}
4. Social proof bar: 4 stats
${secs.map((s,i)=>{
  const m={
    services:`${i+5}. SERVICES: 6 cards in a 3-col grid, each with icon, name, description, price, hover glow effect${hasImages?" — subtle image texture in card background":""}`,
    about:`${i+5}. ABOUT: 2-col layout${aboutImg?`, left col = full image (${aboutImg}) with rounded corners, right col = story text + 4 stats`:", story left, 4 stats right"}`,
    benefits:`${i+5}. BENEFITS: 6-item grid, icon+title+desc, niche-specific`,
    testimonials:`${i+5}. TESTIMONIALS: 3 realistic reviews, name+location+stars+quote`,
    pricing:`${i+5}. PRICING: 3 tiers, feature lists, Most Popular badge`,
    gallery:`${i+5}. GALLERY: ${hasImages?`6-item CSS grid using these real images: ${[galleryImg1,galleryImg2,galleryImg3,galleryImg4,heroImg,aboutImg].filter(Boolean).join(", ")} — each as object-fit cover, caption overlay on hover`:"6-item CSS grid, gradient placeholders, caption hover"}`,
    faq:`${i+5}. FAQ: 5 accordion items with JS click-to-expand`,
    booking:`${i+5}. BOOKING: full form with name/email/phone/service/date/message`,
    contact:`${i+5}. CONTACT: split layout, info left, form right`,
    cta:`${i+5}. CTA BANNER: full-width urgent headline + big button${heroImg?` — background image with dark overlay`:""}`,
  };
  return m[s]||`${i+5}. ${s.toUpperCase()}`;
}).join("\n")}
- Footer: logo, tagline, 3 link columns, social icons, copyright 2026

RULES:
1. CSS in <style>, JS in <script> at bottom. One Google Fonts @import only.
2. NEVER use IntersectionObserver. ALL content visible on load. CSS keyframe animations that auto-play are fine.
3. Real niche-specific copy. Zero lorem ipsum.
4. Conversion: urgency, social proof, 5+ CTAs, trust signals throughout.
5. One H1 with keyword, descriptive H2s, semantic HTML.
6. Working JS accordion for FAQ. Working hamburger menu. Mobile-first responsive.
7. All images must use object-fit:cover with appropriate container heights.
8. Hero image overlay: always add a dark semi-transparent overlay so text is readable.

OUTPUT: Raw HTML only. Start with <!DOCTYPE html>. End with </html>. Nothing else.`;
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
              <Field label="Location" value={form.location} onChange={v=>up("location",v)} placeholder="Cape Town, SA"/>
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
          {["🔒 Secure checkout via Lemon Squeezy","⚡ 1 credit = 1 full landing page","💾 Credits never expire","↩ 7-day money back guarantee"].map(t=>(
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

    const PEXELS_KEY = import.meta.env.VITE_PEXELS_KEY;
    // Get section-specific targeted queries for this industry
    const queries = getSectionKeywords(form.industry);

    const fetchImg = (q) =>
      fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=5&orientation=landscape`, {
        headers: { Authorization: PEXELS_KEY }
      })
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
        return fetch("https://api.anthropic.com/v1/messages",{
          method:"POST",
          headers:{
            "Content-Type":"application/json",
            "x-api-key":import.meta.env.VITE_ANTHROPIC_KEY,
            "anthropic-version":"2023-06-01",
            "anthropic-dangerous-direct-browser-access":"true"
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
   HOME PAGE
───────────────────────────────────────────────────────────────────────────── */
function HomePage({onBuild,onPricing,onExample,onHelp}) {
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
              {q:"My yoga studio page was live in 4 minutes. The AI wrote better copy than any agency I've used. Worth every cent.",n:"Thandi M.",r:"Yoga Studio · Cape Town"},
              {q:"Was quoted $2,500 by a web designer. Sitefliq did it better for $59. The SEO is already bringing traffic.",n:"Sipho K.",r:"Personal Trainer · Johannesburg"},
              {q:"I described my pilates studio and it built me an entire professional website. Downloaded it, uploaded to Netlify — live same day.",n:"Jessica R.",r:"Pilates Studio · Sandton"},
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

      <div style={{textAlign:"center",padding:"16px 40px",borderTop:"1px solid #f3f4f6",fontSize:11,color:"#9ca3af",background:"white"}}>
        © 2026 Sitefliq · AI Landing Page Builder · sitefliq.com
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   PRICING PAGE (standalone)
───────────────────────────────────────────────────────────────────────────── */
function PricingPage({onBuild,onHome}) {
  return (
    <div style={{minHeight:"100vh",background:"#fafaf9"}}>
      <GS/>
      <nav style={{height:56,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 48px",borderBottom:"1px solid #e5e7eb",background:"white"}}>
        <div onClick={onHome} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
          <div style={{width:27,height:27,background:"#f97316",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"white",fontWeight:800}}>S</div>
          <span style={{fontSize:17,fontWeight:800,color:"#111827"}}>Sitefliq</span>
        </div>
        <button onClick={onBuild} style={{padding:"8px 18px",background:"#f97316",border:"none",borderRadius:8,fontSize:13,cursor:"pointer",color:"white",fontFamily:"inherit",fontWeight:700}}>Start Free →</button>
      </nav>
      <div style={{maxWidth:860,margin:"0 auto",padding:"70px 40px"}}>
        <h1 style={{fontSize:46,fontWeight:800,textAlign:"center",color:"#111827",marginBottom:8,fontFamily:"'Instrument Serif',serif",fontStyle:"italic"}}>Simple pricing</h1>
        <p style={{textAlign:"center",color:"#6b7280",marginBottom:32,fontSize:14}}>Buy credits once. Use them whenever. 1 credit = 1 complete landing page. No subscriptions, ever.</p>
        {/* Credit explainer */}
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
              {/* Big credit number */}
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
              <button onClick={onBuild} style={{width:"100%",padding:11,borderRadius:9,fontFamily:"'Geist',sans-serif",fontSize:13,fontWeight:700,cursor:"pointer",background:p.badge?p.color:"transparent",border:p.badge?"none":`2px solid ${p.color}`,color:p.badge?"white":p.color,transition:"all .2s"}}>
                Get {p.credits} Credits →
              </button>
            </div>
          ))}
        </div>
        <div style={{marginTop:24,textAlign:"center",fontSize:12,color:"#9ca3af"}}>
          🔒 Secure checkout · Credits never expire · 7-day money back guarantee
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN APP
───────────────────────────────────────────────────────────────────────────── */
/* ─────────────────────────────────────────────────────────────────────────────
   EXAMPLE PAGE — pre-built sample to show clients
───────────────────────────────────────────────────────────────────────────── */
const EXAMPLE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Zenflow Yoga Studio | Yoga Classes Cape Town | Transform Your Practice</title>
<meta name="description" content="Zenflow Yoga Studio offers expert yoga classes in Cape Town. Beginner to advanced. Hot yoga, vinyasa, yin & meditation. Book your free trial class today."/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;0,700;1,400;1,600&family=DM+Sans:wght@300;400;500;600&display=swap" rel="stylesheet"/>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#0a0e0a;--surface:#111811;--accent:#a8e063;--text:#f0f5f0;--muted:#6b7f6b}
body{font-family:'DM Sans',sans-serif;background:var(--bg);color:var(--text);-webkit-font-smoothing:antialiased}
@keyframes fadeUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
@keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
a{color:inherit;text-decoration:none}
.btn-primary{display:inline-block;padding:14px 32px;background:var(--accent);color:var(--bg);font-weight:700;border-radius:50px;font-size:14px;cursor:pointer;border:none;font-family:'DM Sans',sans-serif;transition:all .2s;letter-spacing:.3px}
.btn-primary:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(168,224,99,.3)}
.btn-outline{display:inline-block;padding:14px 32px;border:1.5px solid var(--accent);color:var(--accent);font-weight:600;border-radius:50px;font-size:14px;cursor:pointer;background:transparent;font-family:'DM Sans',sans-serif;transition:all .2s}
.btn-outline:hover{background:var(--accent);color:var(--bg)}
nav{position:fixed;top:0;left:0;right:0;z-index:100;height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 48px;background:rgba(10,14,10,.85);backdrop-filter:blur(20px);border-bottom:1px solid rgba(168,224,99,.1)}
.nav-logo{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:var(--accent);letter-spacing:1px}
.nav-links{display:flex;gap:28px;font-size:13px;color:var(--muted)}
.nav-links a:hover{color:var(--accent)}
.hero{min-height:100vh;display:flex;align-items:center;justify-content:center;text-align:center;padding:100px 40px 60px;position:relative;overflow:hidden}
.hero-bg{position:absolute;inset:0;background:radial-gradient(ellipse 80% 60% at 50% 40%,rgba(168,224,99,.08) 0%,transparent 70%)}
.hero-pattern{position:absolute;inset:0;opacity:.04;background-image:repeating-linear-gradient(0deg,var(--accent) 0,var(--accent) 1px,transparent 1px,transparent 60px),repeating-linear-gradient(90deg,var(--accent) 0,var(--accent) 1px,transparent 1px,transparent 60px)}
.hero-content{position:relative;z-index:1;max-width:800px;animation:fadeUp .8s ease both}
.hero-label{display:inline-flex;align-items:center;gap:8px;padding:6px 16px;background:rgba(168,224,99,.1);border:1px solid rgba(168,224,99,.2);border-radius:100px;font-size:11px;color:var(--accent);letter-spacing:2px;text-transform:uppercase;margin-bottom:24px}
h1{font-family:'Cormorant Garamond',serif;font-size:clamp(48px,7vw,88px);font-weight:700;line-height:1.0;margin-bottom:20px;letter-spacing:-1px}
h1 em{font-style:italic;color:var(--accent)}
.hero-sub{font-size:17px;color:var(--muted);max-width:480px;margin:0 auto 36px;line-height:1.8}
.hero-btns{display:flex;gap:12px;justify-content:center;flex-wrap:wrap;margin-bottom:20px}
.hero-trust{font-size:12px;color:var(--muted)}
.hero-trust span{color:var(--accent)}
.proof-bar{background:var(--surface);border-top:1px solid rgba(168,224,99,.08);border-bottom:1px solid rgba(168,224,99,.08);padding:20px 40px;display:flex;justify-content:center;gap:60px}
.proof-item{text-align:center}
.proof-num{font-size:26px;font-weight:700;color:var(--accent);font-family:'Cormorant Garamond',serif}
.proof-label{font-size:11px;color:var(--muted);margin-top:2px}
section{padding:80px 40px}
.container{max-width:1100px;margin:0 auto}
.section-label{font-size:10px;color:var(--accent);letter-spacing:3px;text-transform:uppercase;font-weight:600;margin-bottom:12px}
h2{font-family:'Cormorant Garamond',serif;font-size:clamp(32px,4.5vw,52px);font-weight:700;line-height:1.1;margin-bottom:16px}
.section-desc{font-size:15px;color:var(--muted);line-height:1.8;max-width:540px}
.services-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:44px}
.service-card{background:var(--surface);border:1px solid rgba(168,224,99,.08);border-radius:16px;padding:32px;transition:all .3s;position:relative;overflow:hidden}
.service-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--accent),transparent);opacity:0;transition:opacity .3s}
.service-card:hover{transform:translateY(-4px);border-color:rgba(168,224,99,.2);box-shadow:0 16px 40px rgba(0,0,0,.3)}
.service-card:hover::before{opacity:1}
.service-icon{font-size:32px;margin-bottom:16px}
.service-name{font-size:17px;font-weight:700;color:var(--text);margin-bottom:8px;font-family:'Cormorant Garamond',serif}
.service-desc{font-size:13px;color:var(--muted);line-height:1.7;margin-bottom:16px}
.service-price{font-size:13px;color:var(--accent);font-weight:600}
.testimonials-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:44px}
.tcard{background:var(--surface);border:1px solid rgba(168,224,99,.08);border-radius:14px;padding:26px}
.tcard-stars{color:var(--accent);font-size:13px;letter-spacing:2px;margin-bottom:12px}
.tcard-quote{font-size:14px;color:rgba(240,245,240,.7);line-height:1.75;margin-bottom:18px;font-style:italic}
.tcard-name{font-size:13px;font-weight:600;color:var(--text)}
.tcard-loc{font-size:11px;color:var(--muted);margin-top:2px}
.benefits-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:44px}
.benefit{padding:24px;border-radius:12px;background:rgba(168,224,99,.04);border:1px solid rgba(168,224,99,.08)}
.benefit-icon{font-size:24px;margin-bottom:10px}
.benefit-title{font-size:14px;font-weight:700;margin-bottom:6px;color:var(--text)}
.benefit-desc{font-size:12px;color:var(--muted);line-height:1.65}
.faq-list{max-width:700px;margin:40px auto 0;display:flex;flex-direction:column;gap:0}
.faq-item{border-bottom:1px solid rgba(168,224,99,.08)}
.faq-q{padding:18px 0;display:flex;justify-content:space-between;align-items:center;cursor:pointer;font-size:15px;font-weight:500;color:var(--text)}
.faq-icon{font-size:18px;color:var(--accent);transition:transform .3s;flex-shrink:0}
.faq-a{font-size:14px;color:var(--muted);line-height:1.75;max-height:0;overflow:hidden;transition:max-height .4s ease,padding .3s}
.faq-a.open{max-height:200px;padding-bottom:16px}
.cta-banner{background:linear-gradient(135deg,rgba(168,224,99,.12),rgba(168,224,99,.04));border-top:1px solid rgba(168,224,99,.15);border-bottom:1px solid rgba(168,224,99,.15);padding:70px 40px;text-align:center}
.cta-banner h2{margin-bottom:24px}
footer{background:var(--surface);border-top:1px solid rgba(168,224,99,.08);padding:50px 40px 24px}
.footer-grid{max-width:1100px;margin:0 auto;display:grid;grid-template-columns:2fr 1fr 1fr 1fr;gap:40px;margin-bottom:40px}
.footer-brand{font-family:'Cormorant Garamond',serif;font-size:22px;font-weight:700;color:var(--accent);margin-bottom:10px}
.footer-tagline{font-size:13px;color:var(--muted);line-height:1.7}
.footer-heading{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--accent);font-weight:600;margin-bottom:12px}
.footer-links{display:flex;flex-direction:column;gap:8px;font-size:13px;color:var(--muted)}
.footer-links a:hover{color:var(--accent)}
.footer-bottom{max-width:1100px;margin:0 auto;padding-top:20px;border-top:1px solid rgba(168,224,99,.06);display:flex;justify-content:space-between;font-size:11px;color:var(--muted)}
@media(max-width:768px){
  nav{padding:0 20px}.nav-links{display:none}
  .hero{padding:80px 20px 40px}
  .proof-bar{gap:24px;flex-wrap:wrap;padding:20px}
  section{padding:60px 20px}
  .services-grid,.testimonials-grid,.benefits-grid{grid-template-columns:1fr}
  .footer-grid{grid-template-columns:1fr 1fr}
  .footer-bottom{flex-direction:column;gap:8px}
}
</style>
</head>
<body>
<nav>
  <div class="nav-logo">Zenflow</div>
  <div class="nav-links">
    <a href="#services">Classes</a>
    <a href="#about">About</a>
    <a href="#testimonials">Reviews</a>
    <a href="#faq">FAQ</a>
  </div>
  <button class="btn-primary" style="padding:10px 22px;font-size:13px">Book Free Trial</button>
</nav>
<section class="hero">
  <div class="hero-bg"></div>
  <div class="hero-pattern"></div>
  <div class="hero-content">
    <div class="hero-label">✦ Yoga Studio · Cape Town</div>
    <h1>Find Your<br/><em>Flow</em></h1>
    <p class="hero-sub">Expert-led yoga classes for every level. Hot yoga, vinyasa, yin & meditation in the heart of Cape Town.</p>
    <div class="hero-btns">
      <button class="btn-primary">Book Your Free Trial Class</button>
      <button class="btn-outline">View Class Schedule</button>
    </div>
    <div class="hero-trust">★★★★★ <span>500+ students</span> · Trusted since 2016 · <span>4.9/5 rating</span></div>
  </div>
</section>
<div class="proof-bar">
  <div class="proof-item"><div class="proof-num">500+</div><div class="proof-label">Happy Students</div></div>
  <div class="proof-item"><div class="proof-num">4.9★</div><div class="proof-label">Google Rating</div></div>
  <div class="proof-item"><div class="proof-num">8 Yrs</div><div class="proof-label">In Business</div></div>
  <div class="proof-item"><div class="proof-num">20+</div><div class="proof-label">Classes Weekly</div></div>
</div>
<section id="services">
  <div class="container">
    <div class="section-label">What We Offer</div>
    <h2>Classes For Every Journey</h2>
    <p class="section-desc">Whether you're stepping onto the mat for the first time or deepening a decades-long practice, we have the perfect class for you.</p>
    <div class="services-grid">
      <div class="service-card"><div class="service-icon">🔥</div><div class="service-name">Hot Yoga</div><div class="service-desc">Practised in a heated room at 37°C. Build strength, flexibility, and mental clarity while detoxifying your body through sweat.</div><div class="service-price">From $18 per class</div></div>
      <div class="service-card"><div class="service-icon">🌊</div><div class="service-name">Vinyasa Flow</div><div class="service-desc">Dynamic, breath-linked movement sequences that build heat and flow. Perfect for those who love a moving meditation.</div><div class="service-price">From $16 per class</div></div>
      <div class="service-card"><div class="service-icon">🌙</div><div class="service-name">Yin & Restore</div><div class="service-desc">Slow, meditative practice targeting deep connective tissue. Ideal for stress relief, flexibility, and deep relaxation.</div><div class="service-price">From $14 per class</div></div>
    </div>
  </div>
</section>
<section id="benefits" style="background:var(--surface)">
  <div class="container">
    <div class="section-label">Why Zenflow</div>
    <h2>More Than Just Yoga</h2>
    <div class="benefits-grid">
      <div class="benefit"><div class="benefit-icon">👩‍🏫</div><div class="benefit-title">Expert Instructors</div><div class="benefit-desc">All teachers are 200hr+ certified with 5+ years experience in their speciality.</div></div>
      <div class="benefit"><div class="benefit-icon">🏛️</div><div class="benefit-title">Beautiful Studio Space</div><div class="benefit-desc">Thoughtfully designed spaces with natural wood, plants and calming lighting.</div></div>
      <div class="benefit"><div class="benefit-icon">📱</div><div class="benefit-title">Easy Online Booking</div><div class="benefit-desc">Book, cancel or reschedule any class from your phone in seconds.</div></div>
      <div class="benefit"><div class="benefit-icon">🧘</div><div class="benefit-title">All Levels Welcome</div><div class="benefit-desc">We never make beginners feel lost. Every class has modifications for every body.</div></div>
      <div class="benefit"><div class="benefit-icon">🤝</div><div class="benefit-title">Vibrant Community</div><div class="benefit-desc">Join 500+ students who support, inspire and grow together both on and off the mat.</div></div>
      <div class="benefit"><div class="benefit-icon">💚</div><div class="benefit-title">First Class Free</div><div class="benefit-desc">New students get their first class completely free. No strings attached.</div></div>
    </div>
  </div>
</section>
<section id="testimonials">
  <div class="container">
    <div class="section-label">Student Love</div>
    <h2>What Our Community Says</h2>
    <div class="testimonials-grid">
      <div class="tcard"><div class="tcard-stars">★★★★★</div><div class="tcard-quote">"I walked in knowing nothing about yoga and left feeling like I'd found something I'd been missing my whole life. The instructors are warm, knowledgeable and never make you feel out of place."</div><div class="tcard-name">Sarah K.</div><div class="tcard-loc">Member since 2022 · Cape Town</div></div>
      <div class="tcard"><div class="tcard-stars">★★★★★</div><div class="tcard-quote">"The hot yoga classes have completely transformed my flexibility and stress levels. I've tried 6 studios in this city and Zenflow is on another level. Worth every cent of the membership."</div><div class="tcard-name">Marcus T.</div><div class="tcard-loc">Member since 2021 · Camps Bay</div></div>
      <div class="tcard"><div class="tcard-stars">★★★★★</div><div class="tcard-quote">"Yin yoga on Thursday evenings is my non-negotiable. After 18 months of attending, my chronic back pain is practically gone. The teachers genuinely care about your progress and wellbeing."</div><div class="tcard-name">Priya N.</div><div class="tcard-loc">Member since 2023 · Sea Point</div></div>
    </div>
  </div>
</section>
<section id="faq" style="background:var(--surface)">
  <div class="container" style="text-align:center">
    <div class="section-label">Got Questions?</div>
    <h2>Frequently Asked Questions</h2>
    <div class="faq-list">
      <div class="faq-item"><div class="faq-q" onclick="this.nextElementSibling.classList.toggle('open');this.querySelector('.faq-icon').style.transform=this.nextElementSibling.classList.contains('open')?'rotate(45deg)':'rotate(0)'"><span>Do I need any experience to start?</span><span class="faq-icon">+</span></div><div class="faq-a">Not at all! We welcome complete beginners in every class. Our instructors offer modifications for all poses so you can practice at your own level. We recommend starting with our Foundations class if you're brand new.</div></div>
      <div class="faq-item"><div class="faq-q" onclick="this.nextElementSibling.classList.toggle('open');this.querySelector('.faq-icon').style.transform=this.nextElementSibling.classList.contains('open')?'rotate(45deg)':'rotate(0)'"><span>What should I bring to my first class?</span><span class="faq-icon">+</span></div><div class="faq-a">Bring a water bottle, comfortable workout clothes, and an open mind. We provide mats, blocks and straps. For hot yoga, bring a small towel. Arrive 10 minutes early so we can show you around.</div></div>
      <div class="faq-item"><div class="faq-q" onclick="this.nextElementSibling.classList.toggle('open');this.querySelector('.faq-icon').style.transform=this.nextElementSibling.classList.contains('open')?'rotate(45deg)':'rotate(0)'"><span>How much does a membership cost?</span><span class="faq-icon">+</span></div><div class="faq-a">We offer a casual class pass from $14, a 10-class pack for $120, and unlimited monthly memberships from $89/month. Your first class is completely free — no commitment needed.</div></div>
      <div class="faq-item"><div class="faq-q" onclick="this.nextElementSibling.classList.toggle('open');this.querySelector('.faq-icon').style.transform=this.nextElementSibling.classList.contains('open')?'rotate(45deg)':'rotate(0)'"><span>Can I cancel or reschedule a booking?</span><span class="faq-icon">+</span></div><div class="faq-a">Yes! You can cancel or reschedule up to 2 hours before class through our app or website. Late cancellations within 2 hours may use one class credit.</div></div>
      <div class="faq-item"><div class="faq-q" onclick="this.nextElementSibling.classList.toggle('open');this.querySelector('.faq-icon').style.transform=this.nextElementSibling.classList.contains('open')?'rotate(45deg)':'rotate(0)'"><span>Is hot yoga safe for beginners?</span><span class="faq-icon">+</span></div><div class="faq-a">Yes, with proper preparation. Stay well-hydrated before class, eat lightly 2 hours before, and listen to your body. Our hot yoga teachers are trained to guide beginners safely. Many of our most dedicated hot yoga students started as complete beginners.</div></div>
    </div>
  </div>
</section>
<div class="cta-banner">
  <div class="container">
    <div class="section-label">Limited Spots Available</div>
    <h2>Your First Class is <em style="color:var(--accent);font-family:'Cormorant Garamond',serif">Free</em></h2>
    <p style="color:var(--muted);margin-bottom:28px;font-size:15px">Join 500+ students who've transformed their bodies, minds and lives at Zenflow.</p>
    <button class="btn-primary" style="font-size:16px;padding:16px 40px">Book My Free Trial Class →</button>
  </div>
</div>
<footer>
  <div class="footer-grid">
    <div><div class="footer-brand">Zenflow</div><div class="footer-tagline">Expert yoga classes for every level. Find your flow in the heart of Cape Town.</div></div>
    <div><div class="footer-heading">Classes</div><div class="footer-links"><a href="#">Hot Yoga</a><a href="#">Vinyasa Flow</a><a href="#">Yin & Restore</a><a href="#">Meditation</a></div></div>
    <div><div class="footer-heading">Studio</div><div class="footer-links"><a href="#">About Us</a><a href="#">Our Teachers</a><a href="#">Pricing</a><a href="#">Contact</a></div></div>
    <div><div class="footer-heading">Connect</div><div class="footer-links"><a href="#">Instagram</a><a href="#">Facebook</a><a href="#">hello@zenflow.com</a><a href="#">+1 (555) 234-5678</a></div></div>
  </div>
  <div class="footer-bottom"><span>© 2026 Zenflow Yoga Studio. All rights reserved.</span><span>Built with Sitefliq</span></div>
</footer>
</body>
</html>`;

/* ─────────────────────────────────────────────────────────────────────────────
   HELP PAGE
───────────────────────────────────────────────────────────────────────────── */
function HelpPage({onHome}) {
  const [category, setCategory] = React.useState(null);
  const [form, setForm] = React.useState({name:"",email:"",subject:"",message:""});
  const [charCount, setCharCount] = React.useState(0);
  const [submitted, setSubmitted] = React.useState(false);
  const [openFaq, setOpenFaq] = React.useState(null);

  const categories = [
    {id:"feature", icon:"💡", label:"Feature Request"},
    {id:"bug",     icon:"🐛", label:"Bug / Issue"},
    {id:"question",icon:"❓", label:"General Question"},
    {id:"other",   icon:"💬", label:"Other"},
  ];

  const faqs = [
    {q:"My page didn't generate — what happened?", a:"Usually a network timeout or very short description. Try again with a longer business description (3–5 sentences). If you see 'API 401' contact us immediately."},
    {q:"I paid but nothing happened", a:"After paying, return to Sitefliq and click 'I've Paid — Generate My Page'. If credits aren't showing, email us your payment receipt and we'll sort it within the hour."},
    {q:"The images don't match my business", a:"Make sure you select the correct industry from the dropdown — this controls which photos are sourced. If matches are still poor for your industry, let us know and we'll improve the search terms."},
    {q:"How do I host my downloaded HTML file?", a:"Go to netlify.com, create a free account, and drag-and-drop your HTML file onto the dashboard. Your site goes live instantly at a free URL. You can connect a custom domain anytime."},
    {q:"Do my credits expire?", a:"Never. Credits are yours to use whenever you're ready — no time pressure, no subscription."},
    {q:"Can I edit the page after downloading?", a:"Yes — open the file in any text editor (VS Code, Notepad) and edit the text between HTML tags directly. For major redesigns, it's faster to regenerate with new settings."},
    {q:"What does 'No Sitefliq branding' mean?", a:"Starter pages include a small 'Built with Sitefliq' link in the footer. Pro and Agency plans remove this completely so your clients see a clean, unbranded page."},
  ];

  const handleSubmit = () => {
    if(!form.name||!form.email||!form.message||!category) return;
    const subject = encodeURIComponent(`[Sitefliq ${categories.find(c=>c.id===category)?.label}] ${form.subject||"Support Request"}`);
    const body = encodeURIComponent(`Name: ${form.name}\nEmail: ${form.email}\nCategory: ${categories.find(c=>c.id===category)?.label}\nSubject: ${form.subject}\n\nMessage:\n${form.message}`);
    window.open(`mailto:ai.productivitylab95@gmail.com?subject=${subject}&body=${body}`,"_blank");
    setSubmitted(true);
  };

  const inp = {width:"100%",padding:"11px 14px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,fontFamily:"'Geist',sans-serif",outline:"none",color:"#111827",background:"white",transition:"border-color .2s"};

  return (
    <div style={{minHeight:"100vh",background:"#fafaf9",fontFamily:"'Geist',sans-serif"}}>
      <GS/>

      {/* Top bar */}
      <div style={{height:52,background:"white",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 28px",position:"sticky",top:0,zIndex:10}}>
        <button onClick={onHome} style={{display:"flex",alignItems:"center",gap:6,background:"transparent",border:"none",cursor:"pointer",fontSize:13,color:"#6b7280",fontFamily:"inherit",fontWeight:500}}>
          ← Back
        </button>
        <div style={{display:"flex",alignItems:"center",gap:7}}>
          <div style={{width:24,height:24,background:"#f97316",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"white",fontWeight:800}}>S</div>
          <span style={{fontSize:14,fontWeight:800,color:"#111827"}}>Sitefliq</span>
          <span style={{fontSize:13,color:"#9ca3af",marginLeft:4}}>Help</span>
        </div>
        <div style={{width:80}}/>
      </div>

      <div style={{maxWidth:680,margin:"0 auto",padding:"44px 24px 80px"}}>

        {/* Hero */}
        <div style={{textAlign:"center",marginBottom:40}}>
          <h1 style={{fontSize:28,fontWeight:800,color:"#111827",marginBottom:10,fontFamily:"'Instrument Serif',serif",letterSpacing:"-.5px"}}>Help Center</h1>
          <p style={{fontSize:14,color:"#6b7280",lineHeight:1.6}}>Have a question, found a bug, or want a new feature? Let us know!</p>
        </div>

        {/* Category picker */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:10,marginBottom:28}}>
          {categories.map(c=>(
            <div
              key={c.id}
              onClick={()=>setCategory(c.id)}
              style={{
                background:"white",border:`1.5px solid ${category===c.id?"#f97316":"#e5e7eb"}`,
                borderRadius:12,padding:"18px 12px",textAlign:"center",cursor:"pointer",
                transition:"all .15s",boxShadow:category===c.id?"0 0 0 3px rgba(249,115,22,.1)":"none"
              }}
            >
              <div style={{fontSize:22,marginBottom:8}}>{c.icon}</div>
              <div style={{fontSize:12,fontWeight:600,color:category===c.id?"#f97316":"#374151"}}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Submit form */}
        <div style={{background:"white",border:"1px solid #e5e7eb",borderRadius:14,padding:"28px 28px 24px",marginBottom:40,boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
          {submitted ? (
            <div style={{textAlign:"center",padding:"32px 0"}}>
              <div style={{fontSize:44,marginBottom:16}}>✅</div>
              <div style={{fontSize:18,fontWeight:800,color:"#111827",marginBottom:8}}>Query Submitted!</div>
              <p style={{fontSize:13,color:"#6b7280",lineHeight:1.7}}>Your email client opened with your message pre-filled. We'll respond to <strong>{form.email}</strong> within 24 hours.</p>
              <button onClick={()=>setSubmitted(false)} style={{marginTop:20,padding:"10px 22px",background:"#f97316",border:"none",borderRadius:8,fontSize:13,fontWeight:700,color:"white",cursor:"pointer",fontFamily:"inherit"}}>Submit Another</button>
            </div>
          ) : (
            <>
              <h2 style={{fontSize:17,fontWeight:800,color:"#111827",marginBottom:4}}>Submit a Query</h2>
              <p style={{fontSize:12,color:"#9ca3af",marginBottom:22}}>Fill out the form below and we'll respond via email.</p>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
                <div>
                  <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:6}}>Your Name</label>
                  <input style={inp} placeholder="John Doe" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/>
                </div>
                <div>
                  <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:6}}>Email Address</label>
                  <input style={inp} placeholder="john@email.com" type="email" value={form.email} onChange={e=>setForm(f=>({...f,email:e.target.value}))}/>
                </div>
              </div>

              <div style={{marginBottom:14}}>
                <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:6}}>Category</label>
                <select style={{...inp,appearance:"none",backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,backgroundRepeat:"no-repeat",backgroundPosition:"right 14px center",paddingRight:36}} value={category||""} onChange={e=>setCategory(e.target.value)}>
                  <option value="">Select a category</option>
                  {categories.map(c=><option key={c.id} value={c.id}>{c.icon} {c.label}</option>)}
                </select>
              </div>

              <div style={{marginBottom:14}}>
                <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:6}}>Subject</label>
                <input style={inp} placeholder="Brief summary of your query" value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))}/>
              </div>

              <div style={{marginBottom:8}}>
                <label style={{fontSize:12,fontWeight:600,color:"#374151",display:"block",marginBottom:6}}>Message</label>
                <textarea
                  style={{...inp,resize:"vertical",minHeight:130,lineHeight:1.6}}
                  placeholder="Describe your query in detail..."
                  maxLength={500}
                  value={form.message}
                  onChange={e=>{setForm(f=>({...f,message:e.target.value}));setCharCount(e.target.value.length);}}
                />
              </div>

              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18,fontSize:11,color:"#9ca3af"}}>
                <span>{new Date().toLocaleDateString("en-US",{month:"numeric",day:"numeric",year:"numeric"})+", "+new Date().toLocaleTimeString()}</span>
                <span>{charCount}/500</span>
              </div>

              <button
                onClick={handleSubmit}
                disabled={!form.name||!form.email||!form.message||!category}
                style={{width:"100%",padding:"13px",background:(!form.name||!form.email||!form.message||!category)?"#fde8d8":"#f97316",border:"none",borderRadius:10,fontSize:14,fontWeight:700,color:"white",cursor:(!form.name||!form.email||!form.message||!category)?"not-allowed":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,transition:"background .2s"}}
              >
                ✈️ Submit Query
              </button>
            </>
          )}
        </div>

        {/* FAQ */}
        <div>
          <h2 style={{fontSize:17,fontWeight:800,color:"#111827",marginBottom:16}}>Frequently Asked Questions</h2>
          <div style={{borderRadius:12,overflow:"hidden",border:"1px solid #e5e7eb",background:"white"}}>
            {faqs.map((faq,i)=>(
              <div key={i} style={{borderBottom:i<faqs.length-1?"1px solid #f3f4f6":"none"}}>
                <div onClick={()=>setOpenFaq(openFaq===i?null:i)} style={{padding:"16px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",cursor:"pointer",gap:12}}>
                  <span style={{fontSize:13,fontWeight:600,color:"#111827",lineHeight:1.4}}>{faq.q}</span>
                  <span style={{color:"#f97316",fontSize:18,fontWeight:300,flexShrink:0,transition:"transform .25s",display:"inline-block",transform:openFaq===i?"rotate(45deg)":"rotate(0)"}}>+</span>
                </div>
                {openFaq===i&&(
                  <div style={{padding:"0 20px 16px",fontSize:13,color:"#6b7280",lineHeight:1.75}}>{faq.a}</div>
                )}
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
      {/* Top bar */}
      <div style={{height:54,background:"white",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 28px",position:"sticky",top:0,zIndex:10}}>
        <button onClick={onBack} style={{display:"flex",alignItems:"center",gap:6,background:"transparent",border:"none",cursor:"pointer",fontSize:13,color:"#6b7280",fontFamily:"inherit"}}>← Back</button>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:24,height:24,background:"#f97316",borderRadius:6,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"white",fontWeight:800}}>S</div>
          <span style={{fontSize:14,fontWeight:800,color:"#111827"}}>Example Output</span>
        </div>
        <button onClick={onBuild} style={{padding:"8px 18px",background:"#f97316",border:"none",borderRadius:8,fontSize:13,cursor:"pointer",color:"white",fontFamily:"inherit",fontWeight:700}}>Build Mine →</button>
      </div>
      {/* Info banner */}
      <div style={{background:"#fff7ed",borderBottom:"1px solid #fed7aa",padding:"12px 28px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:10}}>
        <div style={{display:"flex",alignItems:"center",gap:10,fontSize:13}}>
          <span style={{fontSize:16}}>✦</span>
          <span style={{fontWeight:600,color:"#111827"}}>Zenflow Yoga Studio</span>
          <span style={{color:"#9ca3af"}}>— Sample page generated by Sitefliq AI</span>
          <span style={{background:"#f97316",color:"white",padding:"2px 8px",borderRadius:4,fontSize:10,fontWeight:700}}>EXAMPLE</span>
        </div>
        <div style={{display:"flex",gap:8}}>
          {blobUrl&&<button onClick={()=>window.open(blobUrl,"_blank")} style={{padding:"7px 14px",background:"white",border:"1px solid #e5e7eb",borderRadius:7,fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:600}}>🔗 Open Full Page</button>}
          <button onClick={onBuild} style={{padding:"7px 16px",background:"#f97316",border:"none",borderRadius:7,fontSize:12,cursor:"pointer",color:"white",fontFamily:"inherit",fontWeight:700}}>Build Your Page →</button>
        </div>
      </div>
      {/* What's included callouts */}
      <div style={{background:"white",borderBottom:"1px solid #f3f4f6",padding:"12px 28px",display:"flex",gap:20,flexWrap:"wrap"}}>
        {[["🔍","Full SEO meta tags"],["🎯","5+ Conversion CTAs"],["📱","Mobile responsive"],["✍️","Niche-specific copy"],["⚡","FAQ accordion"],["🌙","Dark luxury theme"]].map(([ic,t])=>(
          <div key={t} style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:"#374151"}}>
            <span>{ic}</span><span style={{fontWeight:500}}>{t}</span>
          </div>
        ))}
      </div>
      {/* Iframe preview */}
      <div style={{padding:"24px 28px"}}>
        <div style={{borderRadius:14,overflow:"hidden",boxShadow:"0 4px 30px rgba(0,0,0,.1)",border:"1px solid #e5e7eb"}}>
          {/* Browser chrome */}
          <div style={{background:"#f1f5f9",padding:"10px 16px",display:"flex",alignItems:"center",gap:10,borderBottom:"1px solid #e5e7eb"}}>
            <div style={{display:"flex",gap:5}}>{["#ef4444","#f59e0b","#22c55e"].map(c=><div key={c} style={{width:10,height:10,borderRadius:"50%",background:c}}/>)}</div>
            <div style={{flex:1,background:"white",borderRadius:20,padding:"5px 14px",fontSize:11,color:"#6b7280",display:"flex",alignItems:"center",gap:6,maxWidth:400,margin:"0 auto"}}>
              <span>🔒</span> zenflow-yoga-studio.com
            </div>
          </div>
          {blobUrl
            ? <iframe src={blobUrl} style={{width:"100%",height:"85vh",border:"none",display:"block"}} title="Example landing page"/>
            : <div style={{height:"85vh",display:"flex",alignItems:"center",justifyContent:"center",background:"#f9fafb"}}>
                <div style={{textAlign:"center",color:"#9ca3af"}}>
                  <div style={{fontSize:32,marginBottom:8,animation:"spin 1s linear infinite",display:"inline-block"}}>◌</div>
                  <div style={{fontSize:13}}>Loading example…</div>
                </div>
              </div>
          }
        </div>
      </div>
      {/* Bottom CTA */}
      <div style={{textAlign:"center",padding:"32px 28px 48px"}}>
        <div style={{fontSize:14,color:"#6b7280",marginBottom:16}}>Ready to build your own version? It takes 60 seconds.</div>
        <button onClick={onBuild} style={{padding:"14px 40px",background:"#f97316",color:"white",border:"none",borderRadius:10,fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 20px #f9731640"}}>
          Build My Landing Page →
        </button>
      </div>
    </div>
  );
}

export default function Sitefliq() {
  // screens: home | builder | pricing_wall | generating | result
  const [screen,setScreen]=useState("home");
  const [resHtml,setResHtml]=useState("");
  const [genErr,setGenErr]=useState(null);
  const [form,setForm]=useState({
    name:"",industry:"",tagline:"",description:"",
    location:"",phone:"",email:"",cta:"Get Started Today",
    palette:"noir",vibe:"bold",
    sections:["hero","social_proof","services","about","testimonials","contact"],
  });
  const up=(k,v)=>setForm(p=>({...p,[k]:v}));
  const togSec=id=>{
    if(id==="hero"||id==="social_proof")return;
    setForm(p=>({...p,sections:p.sections.includes(id)?p.sections.filter(s=>s!==id):[...p.sections,id]}));
  };
  const ready=form.name.trim()&&form.industry.trim()&&form.description.trim();

  // When user clicks a plan — redirect to Lemon Squeezy with their details in URL
  const handlePurchase=(plan)=>{
    // Store form in sessionStorage so we can retrieve after payment
    sessionStorage.setItem("sitefliq_form",JSON.stringify(form));
    sessionStorage.setItem("sitefliq_plan",plan.id);
    // Open checkout in new tab
    window.open(plan.checkoutUrl,"_blank");
    // Show a "waiting for payment" state
    setScreen("waiting_payment");
  };

  if(screen==="home") return <HomePage onBuild={()=>setScreen("builder")} onPricing={()=>setScreen("pricing_standalone")} onExample={()=>setScreen("example")} onHelp={()=>setScreen("help")}/>;
  if(screen==="help") return <HelpPage onHome={()=>setScreen("home")}/>;
  if(screen==="example") return <ExamplePage onBack={()=>setScreen("home")} onBuild={()=>setScreen("builder")}/>;
  if(screen==="pricing_standalone") return <PricingPage onBuild={()=>setScreen("builder")} onHome={()=>setScreen("home")}/>;
  if(screen==="pricing_wall") return <PricingWall form={form} onBack={()=>setScreen("builder")} onPurchase={handlePurchase}/>;

  // Waiting for payment confirmation
  if(screen==="waiting_payment") return (
    <div style={{minHeight:"100vh",background:"#fafaf9",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"'Geist',sans-serif"}}>
      <GS/>
      <div style={{textAlign:"center",maxWidth:480,padding:40}}>
        <div style={{fontSize:48,marginBottom:20}}>💳</div>
        <h2 style={{fontSize:26,fontWeight:800,color:"#111827",marginBottom:12}}>Complete your payment</h2>
        <p style={{fontSize:14,color:"#6b7280",marginBottom:28,lineHeight:1.7}}>
          A Lemon Squeezy checkout tab has opened. Complete your payment there, then come back here and click the button below.
        </p>
        <button onClick={()=>setScreen("generating")} style={{width:"100%",padding:"14px",background:"#f97316",color:"white",border:"none",borderRadius:10,fontSize:15,fontWeight:700,cursor:"pointer",fontFamily:"inherit",marginBottom:12}}>
          ✓ I've Paid — Generate My Page →
        </button>
        <button onClick={()=>setScreen("pricing_wall")} style={{width:"100%",padding:"12px",background:"white",color:"#6b7280",border:"1px solid #e5e7eb",borderRadius:10,fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>
          ← Go back
        </button>
        <p style={{marginTop:16,fontSize:11,color:"#9ca3af"}}>
          🔒 Payments secured by Lemon Squeezy · 7-day money back guarantee
        </p>
      </div>
    </div>
  );

  /* Split panel layout */
  return (
    <div style={{height:"100vh",display:"flex",flexDirection:"column",fontFamily:"'Geist',sans-serif",background:"#f1f5f9"}}>
      <GS/>
      {/* Top bar */}
      <div style={{height:50,background:"white",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px",flexShrink:0}}>
        <div onClick={()=>setScreen("home")} style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer"}}>
          <span style={{fontSize:15,color:"#9ca3af"}}>←</span>
          <div style={{width:23,height:23,background:"#f97316",borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"white",fontWeight:800}}>S</div>
          <span style={{fontSize:13,fontWeight:700,color:"#111827"}}>Landing Page Builder</span>
        </div>
        <div style={{fontSize:11,color:"#9ca3af"}}>
          {screen==="builder"&&"⚡ Powered by Claude AI"}
          {screen==="result"&&<span style={{color:"#16a34a",fontWeight:600}}>✓ Page Ready — {form.name}</span>}
          {screen==="generating"&&<span style={{color:"#f97316"}}>⚡ Generating…</span>}
        </div>
        <div style={{width:80}}/>
      </div>

      {/* Split */}
      <div style={{flex:1,display:"grid",gridTemplateColumns:"360px 1fr",overflow:"hidden"}}>
        {/* Left */}
        <div style={{borderRight:"1px solid #e5e7eb",overflow:"hidden",display:"flex",flexDirection:"column",background:"white"}}>
          {screen==="builder"&&<BuilderPanel form={form} up={up} togSec={togSec} ready={ready} onNext={()=>setScreen("pricing_wall")}/>}
          {screen==="generating"&&(
            <div style={{padding:"22px",display:"flex",flexDirection:"column",gap:9,height:"100%",overflowY:"auto",background:"white"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#374151",marginBottom:4}}>Building your page…</div>
              {[["✓","SEO meta tags & schema"],["✓","Niche-specific copy"],["✓","Conversion CTAs"],["✓","Mobile responsive"],["⏳","Finalising HTML…"]].map(([ic,t],i)=>(
                <div key={t} style={{display:"flex",gap:8,alignItems:"center",fontSize:12,color:ic==="⏳"?"#f97316":"#16a34a",animation:`slideIn .3s ${i*.08}s ease both`}}>
                  <span>{ic==="⏳"?<span style={{animation:"spin .8s linear infinite",display:"inline-block"}}>◌</span>:"✓"}</span>{t}
                </div>
              ))}
            </div>
          )}
          {screen==="result"&&<ResultScreen html={resHtml} form={form} onReset={()=>setScreen("builder")}/>}
        </div>

        {/* Right */}
        <div style={{overflow:"hidden",display:"flex",flexDirection:"column"}}>
          {screen==="builder"&&<LivePreview form={form}/>}
          {screen==="generating"&&<GeneratingScreen form={form} onDone={h=>{setResHtml(h);setScreen("result");}} onError={e=>{setGenErr(e);setScreen("builder");}}/>}
          {screen==="result"&&(
            <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40,background:"#f1f5f9",gap:18,textAlign:"center"}}>
              <div style={{fontSize:44}}>🎉</div>
              <div style={{fontSize:20,fontWeight:800,color:"#111827"}}>{form.name}</div>
              <p style={{fontSize:13,color:"#6b7280",maxWidth:340,lineHeight:1.7}}>
                Click <strong>"Open Preview in New Tab"</strong> on the left to see your full website in the browser.
              </p>
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
