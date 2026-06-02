/* Build-time prerender for the static marketing/SEO routes.
 *
 * Runs after `vite build`. For each marketing route it takes the built
 * dist/index.html as a template, swaps in the page's own <title>, meta
 * description, Open Graph/Twitter tags and canonical, injects a
 * BreadcrumbList JSON-LD block and the page's visible content into #root,
 * then writes dist/<slug>/index.html.
 *
 * Result: each URL ships fully-formed HTML (correct social previews +
 * crawlable content) instead of an empty SPA shell. The client bundle still
 * boots and re-renders the interactive version (createRoot replaces #root),
 * so there are no hydration mismatches.
 *
 * Pure Node — no headless browser — so it runs safely in any build env.
 */
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { MARKETING_PAGES } from "../src/seo-pages.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "..", "dist");
const ORIGIN = "https://sitefliq.com";

const escAttr = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// Replace the content="" of a specific meta/link tag, matched by a leading
// attribute. Uses a replacement function so $-sequences in values (e.g. "$19")
// are never treated as regex backreferences.
function setAttrContent(html, matchAttr, attr, value) {
  const re = new RegExp(`(${matchAttr}[^>]*?${attr}=")[^"]*(")`);
  return html.replace(re, (_m, pre, post) => pre + escAttr(value) + post);
}

function renderBody(slug, p) {
  const url = `${ORIGIN}/${slug}`;
  const btn = "padding:13px 30px;background:#f97316;color:white;border:none;border-radius:10px;font-size:15px;font-weight:700;text-decoration:none;display:inline-block;box-shadow:0 4px 20px #f9731640";

  const table = p.rows
    ? `<div style="max-width:860px;margin:0 auto;padding:0 24px 16px"><div style="overflow-x:auto;border:1px solid #e5e7eb;border-radius:14px;background:white"><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#fff7ed"><th style="padding:12px 16px;text-align:left">&nbsp;</th><th style="padding:12px 16px;text-align:left;color:#f97316;font-weight:800">Sitefliq</th><th style="padding:12px 16px;text-align:left;font-weight:800">${esc(p.competitor)}</th></tr></thead><tbody>${p.rows
        .map(
          (r) =>
            `<tr style="border-top:1px solid #f3f4f6"><td style="padding:12px 16px;font-weight:700">${esc(r[0])}</td><td style="padding:12px 16px;background:#fffaf5">${esc(r[1])}</td><td style="padding:12px 16px;color:#6b7280">${esc(r[2])}</td></tr>`
        )
        .join("")}</tbody></table></div></div>`
    : "";

  const benefits = p.benefits
    ? `<div style="max-width:860px;margin:0 auto;padding:8px 24px 16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px">${p.benefits
        .map(
          (b) =>
            `<div style="background:white;border:1px solid #f3f4f6;border-radius:12px;padding:18px 20px"><div style="font-size:22px;margin-bottom:8px">${esc(b.icon)}</div><div style="font-size:14px;font-weight:700;margin-bottom:5px">${esc(b.title)}</div><div style="font-size:13px;color:#6b7280;line-height:1.6">${esc(b.desc)}</div></div>`
        )
        .join("")}</div>`
    : "";

  return `<div style="min-height:100vh;background:#fafaf9;color:#111827;font-family:'Geist',sans-serif">
<nav style="height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(20px,5vw,48px);background:rgba(250,250,249,.92);border-bottom:1px solid #e5e7eb"><a href="/" style="display:flex;align-items:center;gap:8px;text-decoration:none"><div style="width:28px;height:28px;background:#f97316;border-radius:7px;display:flex;align-items:center;justify-content:center;font-size:13px;color:white;font-weight:800">S</div><span style="font-size:18px;font-weight:800;color:#111827">Sitefliq</span></a><a href="/" style="${btn};padding:8px 20px;font-size:13px">Start Building →</a></nav>
<div style="max-width:860px;margin:0 auto;padding:clamp(48px,8vw,88px) 24px 32px"><div style="font-size:11px;font-weight:700;color:#f97316;letter-spacing:2px;text-transform:uppercase;margin-bottom:14px">${esc(p.eyebrow)}</div><h1 style="font-size:clamp(30px,5vw,52px);font-weight:800;line-height:1.1;margin-bottom:20px;letter-spacing:-1px">${esc(p.h1)}</h1><p style="font-size:17px;color:#374151;line-height:1.8;margin-bottom:28px">${esc(p.intro)}</p><a href="/" style="${btn}">Start Building for Free →</a></div>
${table}
${benefits}
<div style="text-align:center;padding:clamp(40px,7vw,72px) 24px"><h2 style="font-size:clamp(24px,4vw,38px);font-weight:800;margin-bottom:16px;font-family:'Instrument Serif',serif;font-style:italic">${esc(p.ctaHeading)}</h2><a href="/" style="${btn};padding:15px 40px;font-size:16px">Build My Page →</a></div>
<div style="text-align:center;padding:16px 40px;border-top:1px solid #f3f4f6;font-size:11px;color:#9ca3af;background:white"><span>© 2026 Sitefliq</span> · <a href="/" style="color:#9ca3af">Home</a> · hello@sitefliq.com</div>
</div>`;
}

const template = readFileSync(join(DIST, "index.html"), "utf8");
let count = 0;

for (const [slug, p] of Object.entries(MARKETING_PAGES)) {
  const url = `${ORIGIN}/${slug}`;
  let html = template;

  html = html.replace(/<title>[\s\S]*?<\/title>/, () => `<title>${esc(p.metaTitle)}</title>`);
  html = setAttrContent(html, '<meta name="description"', "content", p.metaDesc);
  html = setAttrContent(html, '<link rel="canonical"', "href", url);
  html = setAttrContent(html, '<meta property="og:url"', "content", url);
  html = setAttrContent(html, '<meta property="og:title"', "content", p.metaTitle);
  html = setAttrContent(html, '<meta property="og:description"', "content", p.metaDesc);
  html = setAttrContent(html, '<meta name="twitter:url"', "content", url);
  html = setAttrContent(html, '<meta name="twitter:title"', "content", p.metaTitle);
  html = setAttrContent(html, '<meta name="twitter:description"', "content", p.metaDesc);

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${ORIGIN}/` },
      { "@type": "ListItem", position: 2, name: p.h1, item: url },
    ],
  };
  html = html.replace(
    "</head>",
    () => `    <script type="application/ld+json">${JSON.stringify(breadcrumb)}</script>\n  </head>`
  );

  html = html.replace('<div id="root"></div>', () => `<div id="root">${renderBody(slug, p)}</div>`);

  mkdirSync(join(DIST, slug), { recursive: true });
  writeFileSync(join(DIST, slug, "index.html"), html, "utf8");
  count++;
}

console.log(`✓ prerendered ${count} marketing pages`);
