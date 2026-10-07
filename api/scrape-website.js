// api/scrape-website.js — scrapes logo, colours, meta info, contact details from a
// URL. Same security model as the other routes now: a valid Supabase login is
// required, the call is per-user rate limited, and — because this route fetches an
// arbitrary user-supplied URL server-side — it is hardened against SSRF: only
// http/https, and the host must resolve ONLY to public IPs (private/internal ranges
// are blocked after DNS resolution). Responses are time- and size-capped.

import dns from 'node:dns/promises';
import net from 'node:net';

const SUPABASE_URL = "https://fcajlfdykudsunczdrex.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYWpsZmR5a3Vkc3VuY3pkcmV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTcwMjYsImV4cCI6MjA4ODIzMzAyNn0.ez9ue4RXqAUzFjG9pBk4sra9zDKC-CCBFC4pbelwGg8";

const SCRAPE_RATE_LIMIT = 20;
const SCRAPE_RATE_WINDOW_MIN = 10;
const PAGE_TIMEOUT_MS = 8000;
const LOGO_TIMEOUT_MS = 5000;
const MAX_HTML_BYTES = 2_000_000;      // cap the page we download + parse
const MAX_LOGO_BYTES = 500_000;        // logo is embedded as base64 — keep it small

// ── Auth + rate limiting (shared pattern with /api/generate, /api/edit) ──────
async function getUserId(token) {
  if (!token) return null;
  try {
    const r = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + token },
    });
    if (!r.ok) return null;
    const user = await r.json();
    return user?.id || null;
  } catch { return null; }
}

function serviceHeaders(serviceKey) {
  return { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey, 'Content-Type': 'application/json' };
}

async function underRateLimit(serviceKey, userId, action, limit, windowMin) {
  const sinceIso = new Date(Date.now() - windowMin * 60 * 1000).toISOString();
  const q = `${SUPABASE_URL}/rest/v1/rate_events?select=id&user_id=eq.${userId}&action=eq.${action}`
    + `&created_at=gte.${encodeURIComponent(sinceIso)}&limit=${limit}`;
  const r = await fetch(q, { headers: serviceHeaders(serviceKey) });
  const rows = await r.json().catch(() => []);
  if (Array.isArray(rows) && rows.length >= limit) return false;
  await fetch(SUPABASE_URL + '/rest/v1/rate_events', {
    method: 'POST', headers: serviceHeaders(serviceKey),
    body: JSON.stringify({ user_id: userId, action }),
  });
  return true;
}

// ── SSRF guard ───────────────────────────────────────────────────────────────
class BlockedUrlError extends Error {}

function ipv4IsPrivate(ip) {
  const p = ip.split('.').map(Number);
  if (p.length !== 4 || p.some(n => Number.isNaN(n) || n < 0 || n > 255)) return true; // malformed → unsafe
  const [a, b] = p;
  if (a === 0) return true;                       // 0.0.0.0/8 "this host"
  if (a === 10) return true;                      // 10.0.0.0/8
  if (a === 127) return true;                     // loopback
  if (a === 169 && b === 254) return true;        // 169.254.0.0/16 link-local
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true;        // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // 100.64.0.0/10 CGNAT
  if (a >= 224) return true;                      // 224+ multicast / reserved
  return false;
}

// Resolve an IPv4-mapped IPv6 tail to dotted IPv4. The tail may be dotted
// ("127.0.0.1") or hex ("7f00:1" / "7f00:0001") depending on how the address was
// written or normalised by the URL parser. Returns null if it can't be read.
function mappedTailToIpv4(tail) {
  if (tail.includes('.')) return tail;
  const groups = tail.split(':').filter(Boolean).map(h => parseInt(h, 16));
  if (groups.some(n => Number.isNaN(n) || n < 0 || n > 0xffff)) return null;
  let hi, lo;
  if (groups.length === 2) { [hi, lo] = groups; }
  else if (groups.length === 1) { hi = 0; lo = groups[0]; }
  else return null;
  return [(hi >> 8) & 255, hi & 255, (lo >> 8) & 255, lo & 255].join('.');
}

function ipv6IsPrivate(ip) {
  let v = ip.toLowerCase();
  const pct = v.indexOf('%'); if (pct !== -1) v = v.slice(0, pct); // strip zone id
  if (v === '::1' || v === '::') return true;                      // loopback / unspecified
  const mapped = v.match(/^::ffff:(.+)$/);                         // IPv4-mapped (dotted or hex)
  if (mapped) { const d = mappedTailToIpv4(mapped[1]); return d ? ipv4IsPrivate(d) : true; }
  const first = v.split(':')[0];
  if (/^f[cd]/.test(first)) return true;          // fc00::/7 unique-local
  if (/^fe[89ab]/.test(first)) return true;       // fe80::/10 link-local
  return false;
}

function isPrivateIp(ip) {
  const fam = net.isIP(ip);
  if (fam === 4) return ipv4IsPrivate(ip);
  if (fam === 6) return ipv6IsPrivate(ip);
  return true; // not a parseable IP → treat as unsafe
}

// Parse + validate a URL and confirm its host resolves ONLY to public addresses.
// Throws BlockedUrlError for anything disallowed. Returns the parsed URL.
async function assertPublicUrl(raw) {
  let target = String(raw || '').trim();
  if (!target) throw new BlockedUrlError('URL required');
  if (!/^https?:\/\//i.test(target)) target = 'https://' + target;

  let u;
  try { u = new URL(target); } catch { throw new BlockedUrlError('Invalid URL'); }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    throw new BlockedUrlError('Only http and https URLs are allowed');
  }

  const host = u.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host === '') {
    throw new BlockedUrlError('That address is not allowed');
  }

  // A literal IPv6 host is bracketed in a URL (e.g. http://[::1]) — strip the
  // brackets so net.isIP recognises it instead of falling through to DNS.
  const hostIp = host.replace(/^\[/, '').replace(/\]$/, '');
  if (net.isIP(hostIp)) {
    // Literal IP in the URL — validate it directly (no DNS needed).
    if (isPrivateIp(hostIp)) throw new BlockedUrlError('That address is not allowed');
  } else {
    // Resolve and validate EVERY address the host maps to.
    let addrs;
    try { addrs = await dns.lookup(host, { all: true }); }
    catch { throw new BlockedUrlError('Could not resolve that address'); }
    if (!addrs.length) throw new BlockedUrlError('Could not resolve that address');
    for (const a of addrs) if (isPrivateIp(a.address)) throw new BlockedUrlError('That address is not allowed');
  }
  return u;
}

const REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS = 5;

// Fetch a URL while re-validating EVERY hop against the SSRF guard. fetch()
// follows redirects transparently by default, so a public URL could 302 to an
// internal address (e.g. 169.254.169.254) and slip past a one-time check. We set
// redirect: 'manual' and re-run assertPublicUrl on each Location before following.
async function ssrfSafeFetch(rawUrl, { timeoutMs, headers = {} }) {
  let current = rawUrl;
  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    const parsed = await assertPublicUrl(current);       // scheme + DNS + private-IP check
    const response = await fetch(parsed.toString(), {
      headers,
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'manual',
    });
    if (!REDIRECT_CODES.has(response.status)) return response;
    const loc = response.headers.get('location');
    if (!loc) return response;                            // redirect without a target — hand it back
    try { await response.body?.cancel?.(); } catch {}     // free the socket before the next hop
    if (redirects === MAX_REDIRECTS) throw new BlockedUrlError('Too many redirects');
    try { current = new URL(loc, parsed).toString(); }
    catch { throw new BlockedUrlError('Invalid redirect'); }
  }
  throw new BlockedUrlError('Too many redirects');
}

export { isPrivateIp, assertPublicUrl, ssrfSafeFetch, BlockedUrlError };

// Read a response body but abort once it exceeds maxBytes.
async function readCappedText(response, maxBytes) {
  const len = Number(response.headers.get('content-length'));
  if (Number.isFinite(len) && len > maxBytes) throw new BlockedUrlError('Response too large');
  const reader = response.body?.getReader?.();
  if (!reader) {
    const buf = Buffer.from(await response.arrayBuffer());
    if (buf.byteLength > maxBytes) throw new BlockedUrlError('Response too large');
    return buf.toString('utf8');
  }
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > maxBytes) { try { await reader.cancel(); } catch {} throw new BlockedUrlError('Response too large'); }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks).toString('utf8');
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) return res.status(500).json({ success: false, error: 'Server configuration error' });

  // 1. Auth — login required.
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const userId = await getUserId(token);
  if (!userId) return res.status(401).json({ success: false, error: 'Please sign in to import from a website.' });

  // 2. Rate limit (before any outbound fetch).
  const allowed = await underRateLimit(serviceKey, userId, 'scrape', SCRAPE_RATE_LIMIT, SCRAPE_RATE_WINDOW_MIN);
  if (!allowed) {
    return res.status(429).json({ success: false, error: `Too many imports — max ${SCRAPE_RATE_LIMIT} per ${SCRAPE_RATE_WINDOW_MIN} minutes.` });
  }

  // 3. Validate + SSRF-check the target URL.
  const { url } = req.body || {};
  let targetUrl;
  try {
    targetUrl = await assertPublicUrl(url);
  } catch (e) {
    if (e instanceof BlockedUrlError) return res.status(400).json({ success: false, error: e.message });
    return res.status(400).json({ success: false, error: 'Invalid URL' });
  }
  const target = targetUrl.toString();

  try {
    const response = await ssrfSafeFetch(target, {
      timeoutMs: PAGE_TIMEOUT_MS,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Sitefliq/1.0; +https://sitefliq.com)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!response.ok) {
      return res.status(200).json({ success: false, error: `Site returned ${response.status}` });
    }

    const html = await readCappedText(response, MAX_HTML_BYTES);
    const baseUrl = new URL(target).origin;

    const getTag = (pattern) => { const m = html.match(pattern); return m ? m[1]?.trim() : null; };

    const title = getTag(/<title[^>]*>([^<]+)<\/title>/i)
      || getTag(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i)
      || null;

    // og:site_name is usually the cleanest business name
    const siteName = getTag(/<meta[^>]*property="og:site_name"[^>]*content="([^"]+)"/i);

    const description = getTag(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i)
      || getTag(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i)
      || null;

    // ── PHONE ──
    const phonePatterns = [
      /<a[^>]*href="tel:([^"]+)"/i,
      /(?:tel:|phone:|call us|phone number|contact us)[^\d+\(]*([+\(]?[\d\s\-\.\(\)]{7,20}\d)/i,
      /(\+?1?[\s.-]?\(?[0-9]{3}\)?[\s.-][0-9]{3}[\s.-][0-9]{4})/,
    ];
    let phone = null;
    for (const p of phonePatterns) {
      const m = html.match(p);
      if (m) { phone = m[1].trim().replace(/^tel:/i, ''); break; }
    }

    // ── EMAIL ──
    let email = null;
    const emailPatterns = [
      /<a[^>]*href="mailto:([^"?]+)"/i,
      /(?:email|e-mail|contact)[^@\n]{0,30}([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i,
      /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/,
    ];
    for (const p of emailPatterns) {
      const m = html.match(p);
      if (m) {
        const e = m[1].trim();
        if (!e.includes('example.com') && !e.includes('yourdomain') && !e.includes('sentry') && !e.includes('wix') && !e.includes('wordpress')) {
          email = e; break;
        }
      }
    }

    // ── ADDRESS ──
    let address = null;
    const schemaStreet = html.match(/"streetAddress"\s*:\s*"([^"]+)"/i);
    const schemaCity = html.match(/"addressLocality"\s*:\s*"([^"]+)"/i);
    const schemaRegion = html.match(/"addressRegion"\s*:\s*"([^"]+)"/i);
    const schemaZip = html.match(/"postalCode"\s*:\s*"([^"]+)"/i);
    if (schemaStreet) {
      address = schemaStreet[1];
      if (schemaCity) address += ', ' + schemaCity[1];
      if (schemaRegion) address += ', ' + schemaRegion[1];
      if (schemaZip) address += ' ' + schemaZip[1];
    } else {
      const addrMatch = html.match(/(\d{1,5}\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:St|Ave|Rd|Blvd|Dr|Ln|Way|Court|Ct|Place|Pl|Street|Avenue|Road|Boulevard|Drive|Lane)\.?),\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5})/);
      if (addrMatch) address = addrMatch[1];
    }

    // ── BUSINESS NAME ──
    let businessName = null;
    if (siteName) {
      // og:site_name is cleanest — use directly
      businessName = siteName.trim();
    } else if (title) {
      businessName = title
        .replace(/&#8211;/g, '-').replace(/&#8212;/g, '-').replace(/&amp;/g, '&')
        .replace(/&#\d+;/g, ' ').replace(/&[a-z]+;/g, ' ')
        .replace(/\s*[|\-–—]\s*.*/g, '')
        .replace(/\s*::\s*.*/g, '')
        .replace(/\s*»\s*.*/g, '')
        .replace(/^(?:home|about|contact|services|welcome to)\s*/i, '')
        .replace(/\s*(?:home|about|contact|services)$/i, '')
        .trim();
    }

    // ── LOGO ──
    let logo = null;
    const ogImage = getTag(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i)
      || getTag(/<meta[^>]*name="og:image"[^>]*content="([^"]+)"/i);
    const logoPatterns = [
      /<img[^>]*(?:class|id|alt)="[^"]*logo[^"]*"[^>]*src="([^"]+)"/i,
      /<img[^>]*src="([^"]*logo[^"]*\.(?:png|jpg|jpeg|svg|webp))"/i,
      /<link[^>]*rel="[^"]*icon[^"]*"[^>]*href="([^"]+)"/i,
      /<img[^>]*src="([^"]*\/logo[^"]*)"/i,
    ];
    for (const pattern of logoPatterns) {
      const match = html.match(pattern);
      if (match) { logo = match[1]; break; }
    }
    if (!logo && ogImage) logo = ogImage;
    if (logo && !logo.startsWith('http')) {
      logo = logo.startsWith('/') ? baseUrl + logo : baseUrl + '/' + logo;
    }
    let logoBase64 = null;
    if (logo) {
      try {
        // The logo URL comes from the scraped page — SSRF-check it (and every
        // redirect hop) too before fetching.
        const logoRes = await ssrfSafeFetch(logo, { timeoutMs: LOGO_TIMEOUT_MS });
        if (logoRes.ok) {
          const contentType = logoRes.headers.get('content-type') || 'image/png';
          const declaredLen = Number(logoRes.headers.get('content-length'));
          if (!Number.isFinite(declaredLen) || declaredLen <= MAX_LOGO_BYTES) {
            const buffer = await logoRes.arrayBuffer();
            if (buffer.byteLength < MAX_LOGO_BYTES) {
              const base64 = Buffer.from(buffer).toString('base64');
              logoBase64 = `data:${contentType};base64,${base64}`;
            }
          }
        }
      } catch (e) { /* blocked or failed logo fetch — fall back to the URL */ }
    }

    // ── COLOURS ──
    const hexMatches = html.match(/#[0-9a-fA-F]{6}\b/g) || [];
    const rgbMatches = [...html.matchAll(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/g)];
    const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
    const allHex = [...hexMatches, ...rgbMatches.map(m => rgbToHex(m[1], m[2], m[3]))];
    const colourCount = {};
    allHex.forEach(c => {
      const hex = c.toLowerCase();
      const r = parseInt(hex.slice(1,3), 16);
      const g = parseInt(hex.slice(3,5), 16);
      const b = parseInt(hex.slice(5,7), 16);
      if (!(r > 230 && g > 230 && b > 230) && !(r < 30 && g < 30 && b < 30) && !(Math.abs(r-g) < 20 && Math.abs(g-b) < 20)) {
        colourCount[hex] = (colourCount[hex] || 0) + 1;
      }
    });
    const topColours = Object.entries(colourCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([hex]) => hex);
    const cssVarMatches = [...html.matchAll(/--[^:]+:\s*(#[0-9a-fA-F]{6})/g)];
    const cssVarColours = cssVarMatches.map(m => m[1].toLowerCase());
    const finalColours = [...new Set([...cssVarColours, ...topColours])].slice(0, 6);

    // ── IMAGES ──
    const imageMatches = [...html.matchAll(/<img[^>]*src="([^"]+\.(?:jpg|jpeg|png|webp)(?:\?[^"]*)?)"/gi)];
    const images = imageMatches
      .map(m => {
        let src = m[1];
        if (!src.startsWith('http')) src = src.startsWith('/') ? baseUrl + src : baseUrl + '/' + src;
        return src;
      })
      .filter(src => !src.includes('icon') && !src.includes('logo') && !src.includes('avatar'))
      .slice(0, 6);

    return res.status(200).json({
      success: true,
      title,
      businessName,
      description,
      phone,
      email,
      address,
      logo: logoBase64 || logo,
      logoUrl: logo,
      colours: finalColours,
      images,
      baseUrl,
    });

  } catch (err) {
    if (err instanceof BlockedUrlError) {
      return res.status(200).json({ success: false, error: err.message });
    }
    console.error('Scrape error:', err);
    return res.status(200).json({
      success: false,
      error: err.name === 'TimeoutError' || err.message?.includes('timeout') ? 'Site took too long to respond' : 'Could not reach that website'
    });
  }
}
