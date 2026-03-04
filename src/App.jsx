import { useState, useEffect, useRef } from "react";

/* ── FONTS ── */
const Fonts = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Geist:wght@300;400;500;600;700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    html,body{height:100%;font-family:'Geist',sans-serif;-webkit-font-smoothing:antialiased}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes fadeIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
    @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
    @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
    @keyframes blink{0%,100%{opacity:1}50%{opacity:0}}
    @keyframes slideUp{from{opacity:0;transform:translateY(40px)}to{opacity:1;transform:translateY(0)}}
    @keyframes glow{0%,100%{box-shadow:0 0 20px #f97316aa}50%{box-shadow:0 0 50px #f97316ee,0 0 80px #f9731644}}
    textarea:focus,input:focus,select:focus{outline:none}
    ::-webkit-scrollbar{width:4px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:#e5e7eb;border-radius:4px}
  `}</style>
);

/* ── DATA ── */
const PALETTES = [
  {id:"noir",    label:"Noir",   bg:"#0a0a0a", surface:"#111", accent:"#f5f500", text:"#fafafa"},
  {id:"slate",   label:"Slate",  bg:"#0f172a", surface:"#1e293b", accent:"#38bdf8", text:"#f1f5f9"},
  {id:"forest",  label:"Forest", bg:"#052e16", surface:"#14532d", accent:"#86efac", text:"#f0fdf4"},
  {id:"ember",   label:"Ember",  bg:"#1c0a00", surface:"#431407", accent:"#fb923c", text:"#fff7ed"},
  {id:"gold",    label:"Gold",   bg:"#0c0a00", surface:"#1c1a00", accent:"#eab308", text:"#fefce8"},
  {id:"clean",   label:"Clean",  bg:"#f8fafc", surface:"#ffffff", accent:"#2563eb", text:"#0f172a"},
];

const VIBES = [
  {id:"bold",     label:"Bold & Powerful",   desc:"Big typography, strong contrast"},
  {id:"elegant",  label:"Elegant & Refined",  desc:"Sophisticated, luxury feel"},
  {id:"energetic",label:"Energetic & Modern", desc:"Dynamic, vibrant energy"},
  {id:"minimal",  label:"Pure Minimal",       desc:"Breathing space, quiet confidence"},
  {id:"warm",     label:"Warm & Friendly",    desc:"Human, approachable, local"},
];

const SECTIONS = [
  {id:"hero",        label:"Hero",           icon:"⚡", locked:true},
  {id:"social_proof",label:"Social Proof",   icon:"★", locked:true},
  {id:"services",    label:"Services",       icon:"◈"},
  {id:"about",       label:"About / Story",  icon:"◎"},
  {id:"benefits",    label:"Why Choose Us",  icon:"✦"},
  {id:"testimonials",label:"Testimonials",   icon:"❝"},
  {id:"pricing",     label:"Pricing",        icon:"💰"},
  {id:"gallery",     label:"Gallery",        icon:"▦"},
  {id:"faq",         label:"FAQ",            icon:"?"},
  {id:"booking",     label:"Booking Form",   icon:"📅"},
  {id:"contact",     label:"Contact",        icon:"✉"},
  {id:"cta",         label:"CTA Banner",     icon:"→"},
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

/* ── PROMPT ── */
function buildPrompt(f) {
  const pal = PALETTES.find(p=>p.id===f.palette)||PALETTES[0];
  const vib = VIBES.find(v=>v.id===f.vibe)||VIBES[0];
  const secs = f.sections.filter(s=>s!=="hero"&&s!=="social_proof");
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
Palette — bg:${pal.bg}, surface:${pal.surface}, accent:${pal.accent}, text:${pal.text}
Vibe: ${vib.label} — ${vib.desc}
Font: Choose ONE perfect Google Font pair (NOT Inter, NOT Roboto — something distinctive that matches the vibe)

SECTIONS (build in this order):
1. Full SEO <head>: title tag "Name | Keyword | Location", meta description 155 chars, keywords, OG tags, Twitter card, canonical, schema.org LocalBusiness JSON-LD
2. Sticky header: business name/logo left, nav links right, mobile hamburger, smooth scroll
3. Hero: 100vh, H1 with keyword, subheadline, description snippet, 2 CTA buttons, star rating trust line ("★★★★★ Trusted by 500+ clients in Location")
4. Social proof bar: 4 stats like "500+ Clients | 4.9★ Rating | 8 Years | 100% Satisfaction"
${secs.map((s,i)=>{
  const m={
    services:`${i+5}. SERVICES: 3 cards, icon+name+description+price, hover lift effect`,
    about:`${i+5}. ABOUT: 2-col layout — story text left, 4 impressive stats right`,
    benefits:`${i+5}. BENEFITS: 6-item grid, icon+title+desc, niche-specific to this industry`,
    testimonials:`${i+5}. TESTIMONIALS: 3 real-sounding reviews, name+location+stars+3-sentence quote`,
    pricing:`${i+5}. PRICING: 3 tiers, feature lists, "Most Popular" badge on middle tier`,
    gallery:`${i+5}. GALLERY: 6-item CSS grid, gradient placeholder boxes, caption hover overlay`,
    faq:`${i+5}. FAQ: 5 accordion items with click-to-expand JS, industry-specific questions`,
    booking:`${i+5}. BOOKING: styled form — name, email, phone, service, date, message, submit`,
    contact:`${i+5}. CONTACT: split — address/phone/email/hours left, contact form right`,
    cta:`${i+5}. CTA BANNER: full-width, urgent headline, one line, big button`,
  };
  return m[s]||`${i+5}. ${s.toUpperCase()} section`;
}).join("\n")}
- Footer: logo, tagline, 3 link columns, social icons, copyright 2026, "Powered by Sitefliq"

CRITICAL RULES:
1. CSS in <style>, JS in <script> at end of body, one Google Fonts @import only
2. NEVER use IntersectionObserver — ALL content visible on load. No opacity:0 that needs scroll to trigger. CSS keyframe animations that auto-play on load are fine.
3. Write REAL niche-specific copy. Zero lorem ipsum. You know this industry deeply.
4. Hero background: stunning CSS gradient or geometric pattern, NO external images
5. CONVERSION PSYCHOLOGY: urgency/scarcity, social proof, multiple CTAs (5+), trust signals
6. SEO: one H1 with keyword, descriptive H2s per section, proper semantic HTML
7. FAQ accordion: working JS
8. Hamburger menu: working JS
9. Mobile-first responsive
10. Make it look like a $10,000 agency website

OUTPUT: Raw HTML only. First char < of <!DOCTYPE html>. Last char > of </html>. Nothing else.`;
}

/* ── TYPEWRITER ── */
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

/* ── MINI PREVIEW (right panel, before generation) ── */
function LivePreview({form}) {
  const pal = PALETTES.find(p=>p.id===form.palette)||PALETTES[0];
  const filled = form.name||form.industry||form.tagline;
  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:32,background:"#f9fafb"}}>
      {!filled ? (
        <div style={{textAlign:"center",color:"#9ca3af"}}>
          <div style={{fontSize:48,marginBottom:16}}>✦</div>
          <div style={{fontSize:14,fontWeight:500,marginBottom:8,color:"#374151"}}>Your preview will appear here</div>
          <div style={{fontSize:13}}>Fill in your business details on the left</div>
        </div>
      ) : (
        <div style={{width:"100%",maxWidth:520,animation:"fadeIn .4s ease"}}>
          {/* Browser chrome */}
          <div style={{background:"#e5e7eb",borderRadius:"12px 12px 0 0",padding:"10px 16px",display:"flex",alignItems:"center",gap:8}}>
            <div style={{display:"flex",gap:5}}>{["#ef4444","#f59e0b","#22c55e"].map(c=><div key={c} style={{width:10,height:10,borderRadius:"50%",background:c}}/>)}</div>
            <div style={{flex:1,background:"white",borderRadius:20,padding:"4px 12px",fontSize:11,color:"#6b7280",display:"flex",alignItems:"center",gap:6}}>
              <span>🔒</span>{(form.name||"yourbusiness").toLowerCase().replace(/\s+/g,"-")}.com
            </div>
          </div>
          {/* Page mock */}
          <div style={{background:pal.bg,borderRadius:"0 0 12px 12px",overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,.15)"}}>
            {/* Nav */}
            <div style={{padding:"12px 20px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:`1px solid ${pal.accent}22`}}>
              <span style={{fontWeight:800,color:pal.accent,fontSize:13}}>{form.name||"Business Name"}</span>
              <div style={{display:"flex",gap:10,fontSize:8,color:pal.text+"55"}}>
                {["Services","About","Contact"].map(l=><span key={l}>{l}</span>)}
                <span style={{background:pal.accent,color:pal.bg,padding:"2px 8px",borderRadius:3,fontSize:8,fontWeight:700}}>{form.cta||"Get Started"}</span>
              </div>
            </div>
            {/* Hero */}
            <div style={{background:`linear-gradient(135deg,${pal.bg} 0%,${pal.surface} 100%)`,padding:"32px 20px 24px",textAlign:"center"}}>
              <div style={{fontSize:7,letterSpacing:2,color:pal.accent+"88",textTransform:"uppercase",marginBottom:8}}>{form.industry||"Your Industry"}</div>
              <div style={{fontWeight:800,color:pal.accent,fontSize:18,lineHeight:1.1,marginBottom:8}}>{form.name||"Your Business Name"}</div>
              <div style={{fontSize:8,color:pal.text+"55",maxWidth:200,margin:"0 auto 16px",lineHeight:1.5}}>{form.tagline||"Your tagline goes here"}</div>
              <div style={{display:"flex",gap:6,justifyContent:"center"}}>
                <div style={{background:pal.accent,color:pal.bg,padding:"5px 14px",borderRadius:4,fontSize:8,fontWeight:700}}>{form.cta||"Get Started"}</div>
                <div style={{border:`1px solid ${pal.accent}55`,color:pal.accent,padding:"5px 14px",borderRadius:4,fontSize:8}}>Learn More</div>
              </div>
            </div>
            {/* Sections preview */}
            <div style={{background:pal.surface,padding:"12px 20px",display:"flex",flexDirection:"column",gap:6}}>
              {form.sections.filter(s=>s!=="hero").slice(0,5).map(s=>(
                <div key={s} style={{background:pal.accent+"0a",border:`1px solid ${pal.accent}15`,borderRadius:4,padding:"7px 10px",display:"flex",alignItems:"center",gap:8}}>
                  <span style={{fontSize:7,color:pal.accent+"55",textTransform:"uppercase",letterSpacing:1,flex:1}}>{s.replace("_"," ")}</span>
                  <div style={{display:"flex",gap:3}}>{[70,50,85].map((w,i)=><div key={i} style={{height:3,width:w*0.3,background:pal.accent+"20",borderRadius:2}}/>)}</div>
                </div>
              ))}
            </div>
          </div>
          {/* Status */}
          <div style={{marginTop:12,display:"flex",justifyContent:"space-between",fontSize:11,color:"#9ca3af"}}>
            <span>{form.sections.length} sections selected</span>
            <span style={{color: PALETTES.find(p=>p.id===form.palette)?.accent||"#f97316"}}>{form.palette} · {form.vibe}</span>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── BUILDER PANEL ── */
function BuilderPanel({form,up,togSec,onGenerate,ready,genErr,setGenErr}) {
  const [tab,setTab]=useState("info"); // info | style | sections

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:"white"}}>
      {/* Panel header */}
      <div style={{padding:"20px 24px 0",borderBottom:"1px solid #f3f4f6"}}>
        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:16}}>
          <div style={{width:32,height:32,background:"#fff7ed",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>✦</div>
          <div>
            <div style={{fontSize:14,fontWeight:600,color:"#111827"}}>Let's build something amazing</div>
            <div style={{fontSize:12,color:"#9ca3af"}}>Fill in your details and generate your page</div>
          </div>
        </div>
        {/* Feature pills */}
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:16}}>
          {[["⚡","SEO + Conversion Optimised"],["◈","Niche-specific AI copy"],["📱","Mobile responsive HTML"]].map(([ic,t])=>(
            <div key={t} style={{display:"flex",alignItems:"center",gap:8,padding:"7px 12px",background:"#fff7ed",borderRadius:8,fontSize:12,color:"#ea580c"}}>
              <span>{ic}</span><span style={{fontWeight:500}}>{t}</span>
            </div>
          ))}
        </div>
        {/* Tabs */}
        <div style={{display:"flex",gap:0,borderBottom:"1px solid #f3f4f6",marginBottom:-1}}>
          {[["info","Business"],["style","Style"],["sections","Sections"]].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} style={{padding:"8px 16px",fontSize:12,fontWeight:tab===id?600:400,color:tab===id?"#f97316":"#6b7280",background:"transparent",border:"none",borderBottom:tab===id?"2px solid #f97316":"2px solid transparent",cursor:"pointer",transition:"all .2s"}}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{flex:1,overflowY:"auto",padding:"20px 24px"}}>

        {tab==="info" && (
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            <Field label="Business Name *" value={form.name} onChange={v=>up("name",v)} placeholder="e.g. Zen Flow Studio" />
            <div>
              <label style={{fontSize:11,fontWeight:600,color:"#374151",letterSpacing:.5,display:"block",marginBottom:6}}>INDUSTRY *</label>
              <select value={form.industry} onChange={e=>up("industry",e.target.value)} style={{width:"100%",padding:"9px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,color:form.industry?"#111827":"#9ca3af",background:"white",cursor:"pointer"}}>
                <option value="">Select your industry…</option>
                {INDUSTRIES.map(i=><option key={i}>{i}</option>)}
              </select>
            </div>
            <Field label="Tagline" value={form.tagline} onChange={v=>up("tagline",v)} placeholder="e.g. Move. Breathe. Transform." />
            <div>
              <label style={{fontSize:11,fontWeight:600,color:"#374151",letterSpacing:.5,display:"block",marginBottom:6}}>DESCRIBE YOUR BUSINESS * <span style={{color:"#f97316",fontSize:9}}>— more detail = better page</span></label>
              <textarea value={form.description} onChange={e=>up("description",e.target.value)} rows={4} placeholder="What do you offer? Who are your clients? What makes you different? Include services, prices, and unique selling points…" style={{width:"100%",padding:"9px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,color:"#111827",background:"white",resize:"none",lineHeight:1.6}} />
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Field label="Location" value={form.location} onChange={v=>up("location",v)} placeholder="Cape Town, SA" />
              <Field label="CTA Button Text" value={form.cta} onChange={v=>up("cta",v)} placeholder="Get Started Today" />
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              <Field label="Phone" value={form.phone} onChange={v=>up("phone",v)} placeholder="+27 82 123 4567" />
              <Field label="Email" value={form.email} onChange={v=>up("email",v)} placeholder="hello@business.com" />
            </div>
          </div>
        )}

        {tab==="style" && (
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            <div>
              <label style={{fontSize:11,fontWeight:600,color:"#374151",letterSpacing:.5,display:"block",marginBottom:10}}>COLOUR PALETTE</label>
              <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                {PALETTES.map(p=>(
                  <div key={p.id} onClick={()=>up("palette",p.id)} style={{borderRadius:10,overflow:"hidden",cursor:"pointer",border:form.palette===p.id?`2px solid ${p.accent}`:"2px solid #e5e7eb",boxShadow:form.palette===p.id?`0 0 12px ${p.accent}44`:"none",transition:"all .2s"}}>
                    <div style={{height:36,background:`linear-gradient(135deg,${p.bg},${p.surface})`,display:"flex",alignItems:"flex-end",padding:"0 6px 4px"}}>
                      <div style={{width:20,height:3,background:p.accent,borderRadius:2}}/>
                    </div>
                    <div style={{padding:"5px 8px",background:"white",fontSize:10,fontWeight:600,color:form.palette===p.id?"#f97316":"#374151"}}>{p.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <label style={{fontSize:11,fontWeight:600,color:"#374151",letterSpacing:.5,display:"block",marginBottom:10}}>DESIGN VIBE</label>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {VIBES.map(v=>(
                  <div key={v.id} onClick={()=>up("vibe",v.id)} style={{padding:"10px 12px",borderRadius:8,cursor:"pointer",border:form.vibe===v.id?"1px solid #f97316":"1px solid #e5e7eb",background:form.vibe===v.id?"#fff7ed":"white",display:"flex",alignItems:"center",justifyContent:"space-between",transition:"all .15s"}}>
                    <div>
                      <div style={{fontSize:13,fontWeight:600,color:form.vibe===v.id?"#ea580c":"#111827"}}>{v.label}</div>
                      <div style={{fontSize:11,color:"#9ca3af",marginTop:1}}>{v.desc}</div>
                    </div>
                    <div style={{width:16,height:16,borderRadius:"50%",border:`2px solid ${form.vibe===v.id?"#f97316":"#d1d5db"}`,background:form.vibe===v.id?"#f97316":"transparent",flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>
                      {form.vibe===v.id&&<div style={{width:5,height:5,borderRadius:"50%",background:"white"}}/>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab==="sections" && (
          <div>
            <p style={{fontSize:12,color:"#6b7280",marginBottom:12,lineHeight:1.5}}>Select which sections to include. Hero and Social Proof are always included.</p>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {SECTIONS.map(s=>(
                <div key={s.id} onClick={()=>!s.locked&&togSec(s.id)} style={{padding:"9px 12px",borderRadius:8,cursor:s.locked?"default":"pointer",display:"flex",alignItems:"center",gap:10,border:form.sections.includes(s.id)?"1px solid #f97316":"1px solid #e5e7eb",background:form.sections.includes(s.id)?"#fff7ed":"white",transition:"all .15s"}}>
                  <span style={{fontSize:15,width:20,textAlign:"center",flexShrink:0}}>{s.icon}</span>
                  <span style={{flex:1,fontSize:13,fontWeight:500,color:form.sections.includes(s.id)?"#ea580c":"#374151"}}>{s.label}</span>
                  {s.locked
                    ? <span style={{fontSize:10,color:"#d1d5db",background:"#f9fafb",padding:"2px 6px",borderRadius:4,border:"1px solid #e5e7eb"}}>Always on</span>
                    : <div style={{width:16,height:16,borderRadius:4,border:`2px solid ${form.sections.includes(s.id)?"#f97316":"#d1d5db"}`,background:form.sections.includes(s.id)?"#f97316":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,color:"white",fontWeight:900,flexShrink:0}}>
                        {form.sections.includes(s.id)&&"✓"}
                      </div>
                  }
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Generate button */}
      <div style={{padding:"16px 24px",borderTop:"1px solid #f3f4f6",background:"white"}}>
        {genErr && (
          <div style={{marginBottom:10,padding:"9px 12px",background:"#fef2f2",border:"1px solid #fecaca",borderRadius:8,fontSize:12,color:"#dc2626",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span>⚠ {genErr}</span>
            <span onClick={()=>setGenErr(null)} style={{cursor:"pointer",fontSize:16,color:"#9ca3af"}}>×</span>
          </div>
        )}
        <button onClick={onGenerate} disabled={!ready} style={{width:"100%",padding:"13px 20px",background:ready?"#f97316":"#e5e7eb",color:ready?"white":"#9ca3af",border:"none",borderRadius:10,fontSize:14,fontWeight:700,cursor:ready?"pointer":"not-allowed",transition:"all .2s",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:ready?"0 4px 14px #f9731640":"none"}}>
          <span style={{fontSize:16}}>⚡</span>
          {ready ? "Generate Landing Page" : "Fill in required fields first"}
        </button>
        {!ready && (
          <div style={{marginTop:8,fontSize:11,color:"#f97316",textAlign:"center"}}>
            Missing: {[!form.name&&"Name",!form.industry&&"Industry",!form.description&&"Description"].filter(Boolean).join(", ")}
          </div>
        )}
        <div style={{marginTop:10,display:"flex",justifyContent:"center",gap:16,fontSize:11,color:"#9ca3af"}}>
          <span>✓ SEO optimised</span><span>✓ Mobile ready</span><span>✓ Download HTML</span>
        </div>
      </div>
    </div>
  );
}

function Field({label,value,onChange,placeholder}) {
  return (
    <div>
      <label style={{fontSize:11,fontWeight:600,color:"#374151",letterSpacing:.5,display:"block",marginBottom:6}}>{label}</label>
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} style={{width:"100%",padding:"9px 12px",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,color:"#111827",background:"white",transition:"border-color .15s"}}
        onFocus={e=>e.target.style.borderColor="#f97316"}
        onBlur={e=>e.target.style.borderColor="#e5e7eb"}
      />
    </div>
  );
}

/* ── GENERATING SCREEN ── */
function GeneratingScreen({form,onDone,onError}) {
  const [pct,setPct]=useState(0);
  const [si,setSi]=useState(0);
  const stages=["Reading your business…","Researching your niche…","Planning SEO strategy…","Writing headlines & copy…","Designing hero section…","Building all sections…","Adding conversion elements…","Optimising & finalising…"];

  useEffect(()=>{
    let p=0;
    const iv=setInterval(()=>{p=Math.min(p+Math.random()*3+.6,91);setPct(Math.floor(p));setSi(Math.floor(p/100*(stages.length-1)));},800);
    fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:8000,messages:[{role:"user",content:buildPrompt(form)}]})})
      .then(r=>{if(!r.ok)throw new Error(`API error ${r.status}`);return r.json();})
      .then(data=>{
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
      .catch(e=>{clearInterval(iv);onError(e.message);});
    return()=>clearInterval(iv);
  },[]);

  return (
    <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"white",padding:40,textAlign:"center"}}>
      {/* Spinner */}
      <div style={{position:"relative",width:80,height:80,marginBottom:28}}>
        <div style={{position:"absolute",inset:0,borderRadius:"50%",border:"1px solid #f3f4f6"}}/>
        <div style={{position:"absolute",inset:0,borderRadius:"50%",border:"3px solid transparent",borderTopColor:"#f97316",animation:"spin .8s linear infinite"}}/>
        <div style={{position:"absolute",inset:10,borderRadius:"50%",border:"2px solid transparent",borderTopColor:"#f9731640",animation:"spin 1.5s linear infinite reverse"}}/>
        <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:28}}>✦</div>
      </div>
      <div style={{fontSize:18,fontWeight:700,color:"#111827",marginBottom:6}}>{stages[si]}</div>
      <div style={{fontSize:13,color:"#6b7280",marginBottom:28,maxWidth:320,lineHeight:1.6}}>
        Writing SEO-optimised, conversion-focused HTML for <strong style={{color:"#f97316"}}>{form.name}</strong>
      </div>
      {/* Progress bar */}
      <div style={{width:"100%",maxWidth:360,marginBottom:24}}>
        <div style={{height:4,background:"#f3f4f6",borderRadius:2,overflow:"hidden"}}>
          <div style={{height:"100%",background:"linear-gradient(90deg,#f97316,#fb923c)",borderRadius:2,width:`${pct}%`,transition:"width .8s ease"}}/>
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:6,fontSize:11,color:"#9ca3af"}}>
          <span>Building your page…</span><span>{pct}%</span>
        </div>
      </div>
      {/* Business card */}
      <div style={{padding:"14px 20px",background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:12,maxWidth:300}}>
        <div style={{fontSize:10,color:"#f97316",letterSpacing:1.5,textTransform:"uppercase",marginBottom:6}}>Generating for</div>
        <div style={{fontSize:18,fontWeight:800,color:"#111827",marginBottom:2}}>{form.name}</div>
        <div style={{fontSize:12,color:"#ea580c"}}>{form.industry}</div>
      </div>
    </div>
  );
}

/* ── RESULT SCREEN ── */
function ResultScreen({html,form,onReset,onNewBuild}) {
  const [blobUrl,setBlobUrl]=useState(null);
  const [copied,setCopied]=useState(false);
  const [opened,setOpened]=useState(false);
  const pal=PALETTES.find(p=>p.id===form.palette)||PALETTES[0];

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
      {/* Success header */}
      <div style={{padding:"20px 24px",borderBottom:"1px solid #f3f4f6"}}>
        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
          <div style={{width:36,height:36,borderRadius:"50%",background:"#f0fdf4",border:"2px solid #86efac",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16,color:"#16a34a"}}>✓</div>
          <div>
            <div style={{fontSize:15,fontWeight:700,color:"#111827"}}>Your page is ready!</div>
            <div style={{fontSize:12,color:"#6b7280"}}>{html.length.toLocaleString()} characters · {form.sections.length} sections · SEO optimised</div>
          </div>
        </div>
        {/* Action buttons */}
        <button onClick={open} style={{width:"100%",padding:"12px",background:"#f97316",color:"white",border:"none",borderRadius:9,fontSize:14,fontWeight:700,cursor:"pointer",marginBottom:8,display:"flex",alignItems:"center",justifyContent:"center",gap:8,fontFamily:"inherit"}}>
          🔗 Open Preview in New Tab
        </button>
        {opened&&<div style={{fontSize:11,color:"#16a34a",textAlign:"center",marginBottom:8}}>✓ Opened! Allow popups if blocked.</div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>
          <button onClick={dl} style={{padding:"9px",background:"white",color:"#374151",border:"1px solid #e5e7eb",borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>↓ Download HTML</button>
          <button onClick={copy} style={{padding:"9px",background:"white",color:copied?"#16a34a":"#374151",border:`1px solid ${copied?"#86efac":"#e5e7eb"}`,borderRadius:8,fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>{copied?"✓ Copied!":"{ } Copy Code"}</button>
        </div>
      </div>

      {/* What's included */}
      <div style={{flex:1,overflowY:"auto",padding:"16px 24px"}}>
        <div style={{fontSize:11,fontWeight:600,color:"#374151",letterSpacing:.5,marginBottom:12}}>WHAT'S INCLUDED</div>
        <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:20}}>
          {[
            ["🔍","SEO ready","Title, meta, schema, OG tags"],
            ["🎯","Conversion optimised","5+ CTAs, social proof, urgency"],
            ["📱","Mobile responsive","Works on every screen"],
            ["✍️","Niche-specific copy","Written for "+form.industry],
            [SECTIONS.find(s=>s.id===form.sections[0])?.icon||"◈",""+form.sections.length+" sections built","All your selected sections"],
            ["💾","Download & host free","Netlify, cPanel, GitHub Pages"],
          ].map(([ic,t,d])=>(
            <div key={t} style={{display:"flex",gap:10,padding:"9px 12px",background:"#f9fafb",borderRadius:8,border:"1px solid #f3f4f6"}}>
              <span style={{fontSize:16,flexShrink:0}}>{ic}</span>
              <div><div style={{fontSize:12,fontWeight:600,color:"#111827"}}>{t}</div><div style={{fontSize:11,color:"#9ca3af"}}>{d}</div></div>
            </div>
          ))}
        </div>

        {/* Mini page preview */}
        <div style={{fontSize:11,fontWeight:600,color:"#374151",letterSpacing:.5,marginBottom:10}}>PAGE STYLE</div>
        <div style={{borderRadius:10,overflow:"hidden",border:"1px solid #e5e7eb",marginBottom:20}}>
          <div style={{height:6,background:`linear-gradient(90deg,${pal.bg},${pal.surface},${pal.accent})`}}/>
          <div style={{padding:"10px 12px",background:"white",display:"flex",justifyContent:"space-between",fontSize:10,color:"#6b7280"}}>
            <span>Palette: {form.palette}</span><span>Vibe: {form.vibe}</span>
          </div>
        </div>

        <button onClick={onReset} style={{width:"100%",padding:"10px",background:"white",color:"#374151",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer",fontFamily:"inherit"}}>
          ← Build Another Page
        </button>
        <div style={{marginTop:12,fontSize:11,color:"#9ca3af",textAlign:"center",lineHeight:1.6}}>
          Upload your .html file to Netlify (free) and it's live in 30 seconds
        </div>
      </div>
    </div>
  );
}

/* ── HOME PAGE ── */
function HomePage({onBuild,onPricing}) {
  return (
    <div style={{minHeight:"100vh",background:"#fafaf9",color:"#111827",fontFamily:"'Geist',sans-serif"}}>
      <Fonts/>
      {/* Nav */}
      <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:100,height:58,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 48px",background:"rgba(250,250,249,.9)",backdropFilter:"blur(20px)",borderBottom:"1px solid #e5e7eb"}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:28,height:28,background:"#f97316",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"white",fontWeight:800}}>S</div>
          <span style={{fontSize:18,fontWeight:800,color:"#111827"}}>Sitefliq</span>
        </div>
        <div style={{display:"flex",gap:8}}>
          <button onClick={onPricing} style={{padding:"8px 18px",background:"transparent",border:"1px solid #e5e7eb",borderRadius:8,fontSize:13,cursor:"pointer",color:"#374151",fontFamily:"inherit",fontWeight:500}}>Pricing</button>
          <button onClick={onBuild} style={{padding:"9px 20px",background:"#f97316",border:"none",borderRadius:8,fontSize:13,cursor:"pointer",color:"white",fontFamily:"inherit",fontWeight:700}}>Start Building →</button>
        </div>
      </nav>

      {/* Hero */}
      <div style={{paddingTop:58,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",textAlign:"center",padding:"100px 40px 80px",background:"linear-gradient(180deg,#fff7ed 0%,#fafaf9 60%)"}}>
        <div style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 14px",background:"#fff7ed",border:"1px solid #fed7aa",borderRadius:100,marginBottom:24,animation:"slideUp .6s ease"}}>
          <span style={{fontSize:10,color:"#f97316",fontWeight:700,letterSpacing:1.5}}>✦ AI-POWERED LANDING PAGE BUILDER</span>
        </div>
        <h1 style={{fontSize:"clamp(42px,6vw,76px)",fontWeight:800,lineHeight:1.0,marginBottom:20,color:"#111827",letterSpacing:"-2px",maxWidth:860,animation:"slideUp .6s .1s ease both"}}>
          Build websites.{" "}
          <span style={{fontFamily:"'Instrument Serif',serif",fontStyle:"italic",color:"#f97316"}}>
            <TW words={["Get paid.", "Get clients.", "Get noticed.", "Get results."]} color="#f97316"/>
          </span>
        </h1>
        <p style={{fontSize:18,color:"#6b7280",maxWidth:520,margin:"0 auto 40px",lineHeight:1.8,animation:"slideUp .6s .2s ease both"}}>
          Describe your business. AI writes niche-specific copy, builds full SEO meta tags, and delivers a conversion-optimised landing page in 60 seconds.
        </p>
        <div style={{display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap",marginBottom:16,animation:"slideUp .6s .3s ease both"}}>
          <button onClick={onBuild} style={{padding:"15px 36px",background:"#f97316",color:"white",border:"none",borderRadius:10,fontSize:16,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 20px #f9731640"}}>
            Start Building for Free →
          </button>
          <button onClick={onPricing} style={{padding:"15px 24px",background:"white",color:"#374151",border:"1px solid #e5e7eb",borderRadius:10,fontSize:15,cursor:"pointer",fontFamily:"inherit",fontWeight:500}}>
            See Pricing
          </button>
        </div>
        <div style={{fontSize:12,color:"#9ca3af",animation:"slideUp .6s .4s ease both"}}>No credit card · No code · Takes 60 seconds</div>

        {/* Stats */}
        <div style={{display:"flex",gap:48,marginTop:56,animation:"slideUp .6s .5s ease both"}}>
          {[["⚡","60 sec","Average build time"],["★","4.9/5","User rating"],["🏢","500+","Businesses launched"]].map(([ic,n,l])=>(
            <div key={l} style={{textAlign:"center"}}>
              <div style={{fontSize:20,marginBottom:4}}>{ic}</div>
              <div style={{fontSize:24,fontWeight:800,color:"#111827"}}>{n}</div>
              <div style={{fontSize:12,color:"#9ca3af"}}>{l}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Ticker */}
      <div style={{overflow:"hidden",borderTop:"1px solid #e5e7eb",borderBottom:"1px solid #e5e7eb",padding:"13px 0",background:"white"}}>
        <div style={{display:"flex",gap:44,animation:"ticker 25s linear infinite",width:"max-content"}}>
          {[...Array(2)].map((_,r)=>
            ["Yoga Studios","Gyms","Salons","Restaurants","Photographers","Coaches","Real Estate","Boutiques","Clinics","Cafes","Freelancers","Agencies","Dentists","Law Firms"].map((l,i)=>(
              <span key={`${r}-${i}`} style={{fontSize:12,color:"#9ca3af",whiteSpace:"nowrap"}}>
                <span style={{color:"#f97316",marginRight:8}}>✦</span>{l}
              </span>
            ))
          )}
        </div>
      </div>

      {/* How it works */}
      <div style={{maxWidth:960,margin:"80px auto",padding:"0 40px"}}>
        <div style={{textAlign:"center",marginBottom:48}}>
          <div style={{fontSize:10,color:"#f97316",letterSpacing:3,textTransform:"uppercase",fontWeight:700,marginBottom:12}}>HOW IT WORKS</div>
          <h2 style={{fontSize:"clamp(28px,4vw,44px)",fontWeight:800,color:"#111827"}}>Three steps to your first <span style={{color:"#f97316"}}>$1,000</span></h2>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20}}>
          {[
            {n:"01",ic:"💬",t:"Describe it",d:"Tell the AI about your client's business. Industry, services, location. Takes 60 seconds."},
            {n:"02",ic:"✦",t:"AI generates it",d:"Claude writes SEO copy, builds the HTML, adds conversion elements. No coding needed."},
            {n:"03",ic:"💰",t:"Download & get paid",d:"Share the preview link or download the HTML. Host on Netlify free. Charge $500–$5,000."},
          ].map(s=>(
            <div key={s.n} style={{padding:28,borderRadius:14,background:"white",border:"1px solid #f3f4f6",boxShadow:"0 1px 3px rgba(0,0,0,.04)"}}>
              <div style={{width:36,height:36,background:"#fff7ed",borderRadius:9,display:"flex",alignItems:"center",justifyContent:"center",fontSize:18,marginBottom:14}}>{s.ic}</div>
              <div style={{fontSize:11,fontWeight:700,color:"#f97316",letterSpacing:1,marginBottom:8}}>{s.n}</div>
              <div style={{fontSize:16,fontWeight:700,color:"#111827",marginBottom:8}}>{s.t}</div>
              <div style={{fontSize:13,color:"#6b7280",lineHeight:1.65}}>{s.d}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Features grid */}
      <div style={{background:"white",borderTop:"1px solid #f3f4f6",borderBottom:"1px solid #f3f4f6",padding:"70px 40px"}}>
        <div style={{maxWidth:960,margin:"0 auto"}}>
          <h2 style={{fontSize:"clamp(26px,3.5vw,40px)",fontWeight:800,textAlign:"center",color:"#111827",marginBottom:12}}>
            Everything you need to run a <span style={{color:"#f97316"}}>web business</span>
          </h2>
          <p style={{textAlign:"center",color:"#6b7280",marginBottom:48,fontSize:15}}>More powerful than SiteDrop. More affordable than an agency.</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
            {[
              {ic:"🔍",t:"SEO Built-In",d:"Every page gets title, meta description, schema.org markup, and keyword-optimised headings."},
              {ic:"🎯",t:"Conversion Focused",d:"Social proof, urgency copy, 5+ strategically placed CTAs, trust badges — all auto-included."},
              {ic:"✍️",t:"Niche AI Copy",d:"The AI writes copy specific to your client's industry. Not generic. Not lorem ipsum."},
              {ic:"📱",t:"Mobile First",d:"Fully responsive design that works perfectly on phones, tablets, and desktop."},
              {ic:"⚡",t:"60-Second Build",d:"Fill in the form, hit generate. Full HTML landing page ready in under a minute."},
              {ic:"💾",t:"Own Your Code",d:"Download the raw HTML file. Host anywhere for free. No monthly platform fees."},
            ].map(f=>(
              <div key={f.t} style={{padding:24,borderRadius:12,border:"1px solid #f3f4f6",background:"#fafaf9"}}>
                <div style={{fontSize:24,marginBottom:12}}>{f.ic}</div>
                <div style={{fontSize:14,fontWeight:700,color:"#111827",marginBottom:6}}>{f.t}</div>
                <div style={{fontSize:13,color:"#6b7280",lineHeight:1.65}}>{f.d}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Testimonials */}
      <div style={{maxWidth:960,margin:"80px auto",padding:"0 40px"}}>
        <h2 style={{fontSize:34,fontWeight:800,color:"#111827",textAlign:"center",marginBottom:40}}>Loved by business owners</h2>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
          {[
            {q:"My yoga studio page was live in 4 minutes. The AI wrote better copy than I could have. Clients keep asking who designed it.",n:"Thandi M.",r:"Yoga Studio · Cape Town"},
            {q:"Was quoted R8,000 by a web designer. Sitefliq built something better in 60 seconds. The SEO is already driving traffic.",n:"Sipho K.",r:"Personal Trainer · Johannesburg"},
            {q:"The AI understood my pilates studio perfectly. It wrote testimonials that sounded more genuine than anything I'd written myself.",n:"Jessica R.",r:"Pilates Studio · Sandton"},
          ].map((t,i)=>(
            <div key={i} style={{padding:24,borderRadius:14,background:"white",border:"1px solid #f3f4f6",boxShadow:"0 1px 4px rgba(0,0,0,.04)"}}>
              <div style={{color:"#f97316",fontSize:13,marginBottom:12,letterSpacing:2}}>★★★★★</div>
              <p style={{fontSize:13,color:"#374151",lineHeight:1.75,marginBottom:18,fontStyle:"italic"}}>"{t.q}"</p>
              <div style={{fontSize:13,fontWeight:600,color:"#111827"}}>{t.n}</div>
              <div style={{fontSize:11,color:"#9ca3af"}}>{t.r}</div>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div style={{textAlign:"center",padding:"70px 40px 90px",background:"linear-gradient(180deg,#fafaf9,#fff7ed)"}}>
        <h2 style={{fontSize:"clamp(30px,4.5vw,52px)",fontWeight:800,color:"#111827",marginBottom:24}}>Your landing page is waiting.</h2>
        <button onClick={onBuild} style={{padding:"16px 44px",background:"#f97316",color:"white",border:"none",borderRadius:10,fontSize:17,fontWeight:700,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 4px 20px #f9731640"}}>
          Build It Free →
        </button>
      </div>

      <div style={{textAlign:"center",padding:"18px 40px",borderTop:"1px solid #f3f4f6",fontSize:11,color:"#9ca3af",background:"white"}}>
        © 2026 Sitefliq · AI Landing Page Builder · sitefliq.com
      </div>
    </div>
  );
}

/* ── PRICING PAGE ── */
function PricingPage({onBuild,onHome}) {
  return (
    <div style={{minHeight:"100vh",background:"#fafaf9",fontFamily:"'Geist',sans-serif"}}>
      <Fonts/>
      <nav style={{height:58,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 48px",borderBottom:"1px solid #e5e7eb",background:"white"}}>
        <div onClick={onHome} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer"}}>
          <div style={{width:28,height:28,background:"#f97316",borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"white",fontWeight:800}}>S</div>
          <span style={{fontSize:18,fontWeight:800,color:"#111827"}}>Sitefliq</span>
        </div>
        <button onClick={onBuild} style={{padding:"8px 20px",background:"#f97316",border:"none",borderRadius:8,fontSize:13,cursor:"pointer",color:"white",fontFamily:"inherit",fontWeight:700}}>Start Free →</button>
      </nav>
      <div style={{maxWidth:900,margin:"0 auto",padding:"80px 40px"}}>
        <h1 style={{fontSize:50,fontWeight:800,textAlign:"center",color:"#111827",marginBottom:8}}>Simple pricing</h1>
        <p style={{textAlign:"center",color:"#6b7280",marginBottom:56,fontSize:15}}>Start free. Scale when ready.</p>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20}}>
          {[
            {name:"Starter",price:29,color:"#22c55e",features:["5 pages/month","All palettes & styles","Download HTML","SEO included","Email support"]},
            {name:"Pro",price:79,color:"#f97316",popular:true,features:["Unlimited pages","No Sitefliq branding","Priority generation","Client dashboard","Domain guidance","Priority support"]},
            {name:"Agency",price:199,color:"#8b5cf6",features:["Everything in Pro","5 team seats","Reseller licence","API access","Bulk generation","Account manager"]},
          ].map(p=>(
            <div key={p.name} style={{padding:32,borderRadius:16,position:"relative",background:"white",border:p.popular?"2px solid #f97316":"1px solid #e5e7eb",boxShadow:p.popular?"0 4px 30px #f9731618":"0 1px 3px rgba(0,0,0,.04)"}}>
              {p.popular&&<div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:"#f97316",color:"white",padding:"4px 14px",borderRadius:100,fontSize:10,fontWeight:700,letterSpacing:1,whiteSpace:"nowrap"}}>MOST POPULAR</div>}
              <div style={{fontSize:11,fontWeight:700,color:p.color,letterSpacing:2,textTransform:"uppercase",marginBottom:6}}>{p.name}</div>
              <div style={{fontSize:48,fontWeight:800,color:"#111827",marginBottom:24}}>${p.price}<span style={{fontSize:14,fontWeight:400,color:"#9ca3af"}}>/mo</span></div>
              <div style={{display:"flex",flexDirection:"column",gap:10,marginBottom:24}}>
                {p.features.map(f=><div key={f} style={{display:"flex",gap:8,fontSize:13,color:"#374151"}}><span style={{color:p.color,flexShrink:0}}>✓</span>{f}</div>)}
              </div>
              <button onClick={onBuild} style={{width:"100%",padding:12,borderRadius:9,fontFamily:"'Geist',sans-serif",fontSize:14,fontWeight:700,cursor:"pointer",background:p.popular?"#f97316":"transparent",border:p.popular?"none":"1px solid #e5e7eb",color:p.popular?"white":"#374151",transition:"all .2s"}}>
                Get Started
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── MAIN ── */
export default function Sitefliq() {
  const [screen,setScreen]=useState("home"); // home | builder | generating | result
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

  if(screen==="home") return <HomePage onBuild={()=>setScreen("builder")} onPricing={()=>setScreen("pricing")}/>;
  if(screen==="pricing") return <PricingPage onBuild={()=>setScreen("builder")} onHome={()=>setScreen("home")}/>;

  /* Split panel layout for builder / generating / result */
  return (
    <div style={{height:"100vh",display:"flex",flexDirection:"column",fontFamily:"'Geist',sans-serif",background:"#f9fafb"}}>
      <Fonts/>
      {/* Top bar */}
      <div style={{height:50,background:"white",borderBottom:"1px solid #f3f4f6",display:"flex",alignItems:"center",justifyContent:"space-between",padding:"0 20px",flexShrink:0}}>
        <div onClick={()=>setScreen("home")} style={{display:"flex",alignItems:"center",gap:7,cursor:"pointer"}}>
          <span style={{fontSize:16}}>←</span>
          <div style={{width:24,height:24,background:"#f97316",borderRadius:5,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"white",fontWeight:800}}>S</div>
          <span style={{fontSize:14,fontWeight:700,color:"#111827"}}>Landing Page Builder</span>
        </div>
        <div style={{display:"flex",gap:8,fontSize:11,color:"#9ca3af",alignItems:"center"}}>
          {screen==="builder"&&<span>⚡ Powered by Claude AI</span>}
          {screen==="result"&&<><span style={{color:"#16a34a",fontWeight:600}}>✓ Page Ready</span><span>·</span><span>{form.name}</span></>}
        </div>
        <div style={{display:"flex",gap:4}}>
          <button style={{padding:"5px 10px",background:"#f97316",color:"white",border:"none",borderRadius:6,fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"inherit",opacity:.7}}>Preview</button>
          <button style={{padding:"5px 10px",background:"white",color:"#374151",border:"1px solid #e5e7eb",borderRadius:6,fontSize:11,cursor:"pointer",fontFamily:"inherit"}}>&lt;/&gt;</button>
        </div>
      </div>

      {/* Split: left panel + right panel */}
      <div style={{flex:1,display:"grid",gridTemplateColumns:"380px 1fr",overflow:"hidden"}}>
        {/* LEFT PANEL */}
        <div style={{borderRight:"1px solid #e5e7eb",overflow:"hidden",display:"flex",flexDirection:"column"}}>
          {screen==="builder" && <BuilderPanel form={form} up={up} togSec={togSec} ready={ready} genErr={genErr} setGenErr={setGenErr} onGenerate={()=>{setGenErr(null);setScreen("generating");}}/>}
          {screen==="generating" && (
            <div style={{padding:"24px",display:"flex",flexDirection:"column",gap:10,height:"100%",overflowY:"auto"}}>
              <div style={{fontSize:13,fontWeight:600,color:"#374151",marginBottom:4}}>Generating your page…</div>
              {[["✓","SEO meta tags & schema"],["✓","Niche-specific copy"],["✓","Conversion elements"],["✓","Mobile responsive design"],["⏳","Finalising HTML…"]].map(([ic,t],i)=>(
                <div key={t} style={{display:"flex",gap:8,alignItems:"center",fontSize:12,color:ic==="⏳"?"#f97316":"#16a34a",animation:`fadeIn .3s ${i*.1}s ease both`}}>
                  <span style={{fontSize:ic==="⏳"?12:14}}>{ic==="⏳"?<span style={{animation:"spin .8s linear infinite",display:"inline-block"}}>◌</span>:ic}</span>{t}
                </div>
              ))}
            </div>
          )}
          {screen==="result" && <ResultScreen html={resHtml} form={form} onReset={()=>setScreen("builder")} onNewBuild={()=>{setScreen("builder");}} />}
        </div>

        {/* RIGHT PANEL */}
        <div style={{overflow:"hidden",background:"#f1f5f9",display:"flex",flexDirection:"column"}}>
          {screen==="builder" && <LivePreview form={form}/>}
          {screen==="generating" && <GeneratingScreen form={form} onDone={h=>{setResHtml(h);setScreen("result");}} onError={e=>{setGenErr(e);setScreen("builder");}}/>}
          {screen==="result" && (
            <div style={{height:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:40,background:"#f1f5f9",gap:20,textAlign:"center"}}>
              <div style={{fontSize:48,marginBottom:4}}>🎉</div>
              <div style={{fontSize:20,fontWeight:800,color:"#111827"}}>{form.name}</div>
              <div style={{fontSize:13,color:"#6b7280",maxWidth:360,lineHeight:1.7}}>
                Your landing page is built! Click <strong>"Open Preview in New Tab"</strong> on the left to see the full website in your browser.
              </div>
              <div style={{padding:"16px 24px",background:"white",borderRadius:12,border:"1px solid #e5e7eb",maxWidth:400,width:"100%"}}>
                <div style={{fontSize:11,color:"#9ca3af",marginBottom:8}}>PAGE SUMMARY</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,fontSize:12}}>
                  {[["Sections",form.sections.length],["Characters",Math.round(resHtml.length/1000)+"K"],["SEO","✓ Included"],["Mobile","✓ Responsive"]].map(([k,v])=>(
                    <div key={k} style={{padding:"8px 12px",background:"#f9fafb",borderRadius:6}}>
                      <div style={{color:"#9ca3af",fontSize:10}}>{k}</div>
                      <div style={{fontWeight:700,color:"#111827",marginTop:2}}>{v}</div>
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
