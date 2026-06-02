/* Marketing / SEO page data — shared by the app (App.jsx) and the
   build-time prerender script (scripts/prerender.mjs). Pure data, no imports. */
export const COMPARISONS = {
  "vs-durable": {
    eyebrow: "Comparison", h1: "Sitefliq vs Durable", competitor: "Durable",
    metaTitle: "Sitefliq vs Durable — AI Landing Page Builder Compared | Sitefliq",
    metaDesc: "Sitefliq vs Durable: how the two AI website builders compare on pricing, code ownership, SEO and setup. See which one fits your business.",
    intro: "Sitefliq and Durable are both AI website builders, but they solve different problems. Sitefliq generates a single, self-contained, SEO-optimised landing page that you fully own and can host anywhere for a one-time credit — while Durable builds a multi-page site that lives on its own monthly subscription platform.",
    rows: [
      ["Pricing", "One-time credits from $19 — no subscription", "Monthly subscription"],
      ["What you get", "One high-converting landing page", "A multi-page hosted website"],
      ["Code ownership", "Download the full HTML and host anywhere", "Site stays on Durable's platform"],
      ["SEO", "Meta tags + LocalBusiness schema built in", "Platform-managed basics"],
      ["Setup", "~60 seconds from a short description", "A few minutes of guided setup"],
      ["Best for", "Local businesses & freelancers who need one strong page", "Owners who want an all-in-one hosted site"],
    ],
    ctaHeading: "Build a page you actually own.",
  },
  "vs-carrd": {
    eyebrow: "Comparison", h1: "Sitefliq vs Carrd", competitor: "Carrd",
    metaTitle: "Sitefliq vs Carrd — AI Landing Page Builder Compared | Sitefliq",
    metaDesc: "Sitefliq vs Carrd: AI-written copy and instant design versus a manual one-page editor. Compare pricing, SEO and hosting to pick the right tool.",
    intro: "Sitefliq and Carrd both make one-page sites, but the workflow is the opposite. With Sitefliq you describe your business and AI writes the conversion copy and builds the page in about a minute; with Carrd you lay out and write everything yourself in a manual editor.",
    rows: [
      ["Pricing", "One-time credits from $19 — no subscription", "Annual subscription for Pro features"],
      ["How it's built", "Describe your business; AI writes copy & builds it", "Manual drag-and-arrange editor"],
      ["Copywriting", "AI writes niche-specific conversion copy", "You write all the copy yourself"],
      ["Hosting", "Download the HTML — host on Netlify or anywhere", "Hosted on Carrd"],
      ["SEO", "Meta tags + LocalBusiness schema generated", "Basic meta controls"],
      ["Best for", "Owners who want the copy & design done for them", "Hands-on users building simple one-pagers"],
    ],
    ctaHeading: "Let AI write and build it for you.",
  },
  "vs-wix": {
    eyebrow: "Comparison", h1: "Sitefliq vs Wix", competitor: "Wix",
    metaTitle: "Sitefliq vs Wix — AI Landing Page Builder Compared | Sitefliq",
    metaDesc: "Sitefliq vs Wix: a fast, lightweight AI landing page you own versus a full hosted website builder. Compare pricing, speed, SEO and ownership.",
    intro: "Sitefliq and Wix sit at different ends of the spectrum. Sitefliq generates one fast, lightweight landing page from a short description and hands you the code to host anywhere; Wix is a full drag-and-drop platform for building larger, feature-rich websites hosted on a monthly plan.",
    rows: [
      ["Pricing", "One-time credits from $19", "Monthly subscription (ads on free tier)"],
      ["How it's built", "AI generates a finished page in ~60s", "You build it in a drag-and-drop editor"],
      ["Output", "One lightweight, self-contained HTML file", "A heavier hosted multi-page site"],
      ["Code ownership", "Own and download the code", "Site stays on the Wix platform"],
      ["SEO", "Clean SEO markup + schema out of the box", "Configurable, but heavier pages"],
      ["Best for", "A fast, focused landing page", "Large, feature-rich websites"],
    ],
    ctaHeading: "Skip the builder. Get the page.",
  },
};
export const INDUSTRY_PAGES = {
  "for-plumbers": {
    eyebrow: "For Plumbers", h1: "AI Website Builder for Plumbers",
    metaTitle: "AI Website Builder for Plumbers — Landing Page in 60s | Sitefliq",
    metaDesc: "AI website builder for plumbers. Generate a fast, mobile-ready landing page with click-to-call and local SEO in 60 seconds. No coding needed.",
    intro: "Sitefliq is an AI website builder for plumbers: describe your services and service area, and it generates a fast, mobile-ready landing page with click-to-call buttons, your services, and local SEO in about a minute — no design or coding needed.",
    benefits: [
      { icon:"🚿", title:"Built for plumbing jobs", desc:"Service sections for repairs, installs, drain cleaning and emergencies — written in plumbing language, not generic filler." },
      { icon:"📞", title:"Click-to-call everywhere", desc:"Prominent call and quote buttons so a customer with a burst pipe can reach you in one tap." },
      { icon:"📍", title:"Local SEO baked in", desc:"Your town in the title, headings and LocalBusiness schema so you show up for 'plumber near me' searches." },
      { icon:"⚡", title:"Live the same day", desc:"Generate, download the HTML, and host it free on Netlify — online in minutes, not weeks." },
    ],
    ctaHeading: "Get your plumbing page online today.",
  },
  "for-electricians": {
    eyebrow: "For Electricians", h1: "AI Website Builder for Electricians",
    metaTitle: "AI Website Builder for Electricians — Landing Page in 60s | Sitefliq",
    metaDesc: "AI website builder for electricians. Get a professional landing page with your services, contact buttons and local SEO in about 60 seconds.",
    intro: "Sitefliq is an AI website builder for electricians: tell it what you do and where you work, and it builds a professional landing page with your services, trust-building copy, and local SEO in about 60 seconds.",
    benefits: [
      { icon:"💡", title:"Electrical services, done right", desc:"Sections for rewiring, panel upgrades, lighting, fault-finding and emergency call-outs in proper trade language." },
      { icon:"📞", title:"One-tap contact", desc:"Call and quote buttons throughout so homeowners and contractors can reach you instantly." },
      { icon:"📍", title:"Found locally", desc:"Your area in the title, H1 and schema so you rank for local electrician searches." },
      { icon:"⚡", title:"Online in minutes", desc:"Download the page and host it anywhere — no monthly platform fees." },
    ],
    ctaHeading: "Power up your online presence.",
  },
  "for-gyms": {
    eyebrow: "For Gyms", h1: "AI Website Builder for Gyms & Fitness Studios",
    metaTitle: "AI Website Builder for Gyms — Landing Page in 60s | Sitefliq",
    metaDesc: "AI website builder for gyms and fitness studios. Generate a high-energy landing page with classes, social proof and join CTAs in 60 seconds.",
    intro: "Sitefliq is an AI website builder for gyms and fitness studios: describe your classes, coaches and vibe, and it generates a high-energy landing page with your offerings, social proof and a clear join CTA in about a minute.",
    benefits: [
      { icon:"🏋️", title:"Built for fitness", desc:"Sections for classes, memberships, personal training and your timetable — in motivating, on-brand copy." },
      { icon:"🔥", title:"Bold, energetic design", desc:"Big type and strong imagery that match a gym's energy, fully mobile-ready." },
      { icon:"📍", title:"Local discovery", desc:"Your city in the title and schema so nearby members find you when they search." },
      { icon:"📅", title:"Drive sign-ups", desc:"Clear join and free-trial CTAs throughout to turn visitors into members." },
    ],
    ctaHeading: "Fill your classes — start free.",
  },
  "for-salons": {
    eyebrow: "For Salons", h1: "AI Website Builder for Salons & Spas",
    metaTitle: "AI Website Builder for Salons — Landing Page in 60s | Sitefliq",
    metaDesc: "AI website builder for salons and spas. Build an elegant landing page with your treatments, gallery and booking CTA in about 60 seconds.",
    intro: "Sitefliq is an AI website builder for salons and spas: describe your treatments and style, and it builds an elegant landing page with your services, gallery and booking CTA in about 60 seconds.",
    benefits: [
      { icon:"💇", title:"Made for beauty", desc:"Sections for hair, nails, skincare and spa treatments with elegant, polished copy." },
      { icon:"🖼️", title:"Show your work", desc:"A built-in gallery to showcase styles and results that win new clients." },
      { icon:"📍", title:"Local clients find you", desc:"Your town in the title, headings and schema so you appear for nearby salon searches." },
      { icon:"📅", title:"Easy to book", desc:"Prominent booking and contact buttons so clients reserve in a tap." },
    ],
    ctaHeading: "Look the part online too.",
  },
};
export const MARKETING_PAGES = { ...COMPARISONS, ...INDUSTRY_PAGES };
