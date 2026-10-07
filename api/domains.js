// api/domains.js — custom domains for published projects (Step 6, F8).
//
// One function (not two) to stay well inside Vercel's per-deployment function cap.
// POST { action, projectId, domain? }:
//   connect    — add `domain` to the project's Netlify site; returns DNS records
//   status     — check DNS (public resolvers) + HTTPS certificate; returns status
//   disconnect — remove the custom domain from the site and the project
//
// Security: requires a Supabase login; the project is loaded with the service key
// filtered by user_id, so a user can only touch their OWN project's site. The
// Netlify site id always comes from that row, never from the client.
// custom_domain / domain_status are written only here (service role) — the
// client has no column grant for them (migration 0005).

import { Resolver } from 'node:dns/promises';
import { domainToASCII } from 'node:url';
import net from 'node:net';

const SUPABASE_URL = "https://fcajlfdykudsunczdrex.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYWpsZmR5a3Vkc3VuY3pkcmV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTcwMjYsImV4cCI6MjA4ODIzMzAyNn0.ez9ue4RXqAUzFjG9pBk4sra9zDKC-CCBFC4pbelwGg8";

const NETLIFY_API = 'https://api.netlify.com/api/v1';
// Netlify's documented targets for external DNS.
const NETLIFY_APEX_IP = '75.2.60.5';
const NETLIFY_APEX_ALIAS = 'apex-loadbalancer.netlify.com';

const DOMAIN_RATE_LIMIT = 30;
const DOMAIN_RATE_WINDOW_MIN = 10;

// Common multi-label public suffixes, so "joes.co.uk" is treated as an apex
// domain (not a subdomain of co.uk). Not the full Public Suffix List — anything
// unlisted falls back to "two labels = apex".
const MULTI_PART_SUFFIXES = new Set([
  'co.uk', 'org.uk', 'me.uk', 'ltd.uk', 'plc.uk', 'net.uk', 'ac.uk', 'gov.uk',
  'com.au', 'net.au', 'org.au', 'co.nz', 'net.nz', 'org.nz', 'co.za', 'org.za',
  'com.br', 'net.br', 'com.mx', 'com.ar', 'com.co', 'co.in', 'net.in', 'org.in',
  'co.jp', 'or.jp', 'ne.jp', 'co.kr', 'com.sg', 'com.my', 'com.hk', 'com.tw',
  'com.tr', 'co.il', 'com.cn', 'com.ph', 'com.pk', 'co.id', 'com.ng', 'co.ke',
]);

async function getUserId(bearer) {
  if (!bearer) return null;
  try {
    const r = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + bearer },
    });
    if (!r.ok) return null;
    const user = await r.json();
    return user?.id || null;
  } catch {
    return null;
  }
}

async function underRateLimit(serviceKey, userId, action, limit, windowMin) {
  const headers = { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey, 'Content-Type': 'application/json' };
  const sinceIso = new Date(Date.now() - windowMin * 60 * 1000).toISOString();
  const q = `${SUPABASE_URL}/rest/v1/rate_events?select=id&user_id=eq.${userId}&action=eq.${action}`
    + `&created_at=gte.${encodeURIComponent(sinceIso)}&limit=${limit}`;
  const r = await fetch(q, { headers });
  const rows = await r.json().catch(() => []);
  if (Array.isArray(rows) && rows.length >= limit) return false;
  await fetch(SUPABASE_URL + '/rest/v1/rate_events', {
    method: 'POST', headers, body: JSON.stringify({ user_id: userId, action }),
  });
  return true;
}

// Normalise what the user typed ("https://www.Joes.com/" → "www.joes.com") and
// validate it. Returns { domain } or { error }.
export function normaliseDomain(raw) {
  let s = String(raw || '').trim().toLowerCase();
  s = s.replace(/^[a-z]+:\/\//, '');      // scheme
  s = s.split(/[/?#]/)[0];                 // path / query
  s = s.replace(/:\d+$/, '');              // port
  s = s.replace(/\.$/, '');                // trailing dot
  if (!s) return { error: 'Enter a domain, like www.yourbusiness.com' };
  const ascii = domainToASCII(s);          // IDN → punycode; '' if invalid
  if (!ascii) return { error: "That doesn't look like a valid domain." };
  if (ascii.length > 253) return { error: 'That domain is too long.' };
  if (net.isIP(ascii)) return { error: 'Enter a domain name, not an IP address.' };
  const labels = ascii.split('.');
  if (labels.length < 2) return { error: 'Include the ending, like .com — e.g. yourbusiness.com' };
  const labelOk = (l) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(l);
  if (!labels.every(labelOk)) return { error: "That doesn't look like a valid domain." };
  if (!/^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/.test(labels[labels.length - 1])) {
    return { error: "That domain's ending doesn't look right." };
  }
  if (/(^|\.)(netlify\.app|netlify\.com|sitefliq\.com|vercel\.app|localhost)$/.test(ascii)) {
    return { error: 'Use a domain you own (not a netlify.app or sitefliq address).' };
  }
  return { domain: ascii };
}

// Split a domain into its registrable root and the subdomain part.
// "www.joes.co.uk" → { root: "joes.co.uk", sub: "www", isApex: false }
export function splitDomain(domain) {
  const labels = domain.split('.');
  const lastTwo = labels.slice(-2).join('.');
  const rootLen = MULTI_PART_SUFFIXES.has(lastTwo) ? 3 : 2;
  const root = labels.slice(-rootLen).join('.');
  const sub = labels.slice(0, -rootLen).join('.');
  return { root, sub, isApex: !sub };
}

// The exact records the user must add at their registrar.
function dnsRecordsFor(domain, siteHost) {
  const { root, sub, isApex } = splitDomain(domain);
  if (isApex) {
    return [
      { type: 'A', host: '@', value: NETLIFY_APEX_IP, note: `Points ${root} at your site.`,
        alt: `If your DNS provider supports ALIAS, ANAME or CNAME flattening, you can use that instead, pointing @ to ${NETLIFY_APEX_ALIAS}.` },
      { type: 'CNAME', host: 'www', value: siteHost, note: `Makes www.${root} work too.` },
    ];
  }
  return [{ type: 'CNAME', host: sub, value: siteHost, note: `Points ${domain} at your site.` }];
}

const strip = (h) => String(h || '').toLowerCase().replace(/\.$/, '');

function makeResolver() {
  // Ask public resolvers directly so the answer reflects what the internet sees,
  // not a stale cache on the function host.
  const r = new Resolver({ timeout: 3000, tries: 2 });
  r.setServers(['1.1.1.1', '8.8.8.8']);
  return r;
}

async function safe(p) {
  try { return await p; } catch { return []; }
}

// Does `host` resolve to the Netlify site? Accepts a CNAME to the site's
// netlify.app host, an A record to Netlify's apex IP, or A records shared with
// the site host / apex load balancer (covers ALIAS/ANAME/flattened CNAMEs).
async function checkHostDns(resolver, host, siteHost) {
  const [cnames, addrs, siteAddrs, lbAddrs] = await Promise.all([
    safe(resolver.resolveCname(host)),
    safe(resolver.resolve4(host)),
    safe(resolver.resolve4(siteHost)),
    safe(resolver.resolve4(NETLIFY_APEX_ALIAS)),
  ]);
  const cnameList = cnames.map(strip);
  if (cnameList.includes(strip(siteHost))) return { ok: true, found: cnameList };
  const netlifyIps = new Set([NETLIFY_APEX_IP, ...siteAddrs, ...lbAddrs]);
  if (addrs.length && addrs.every(a => netlifyIps.has(a))) return { ok: true, found: addrs };
  return { ok: false, found: cnameList.length ? cnameList : addrs };
}

async function netlify(path, token, opts = {}) {
  const r = await fetch(NETLIFY_API + path, {
    ...opts,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  const text = await r.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }
  return { ok: r.ok, status: r.status, data };
}

// Turn a Netlify error body into one readable sentence.
function netlifyError(data, fallback) {
  if (!data) return fallback;
  const fieldErrs = data.errors && typeof data.errors === 'object'
    ? Object.values(data.errors).flat().filter(Boolean) : [];
  const msg = fieldErrs[0] || data.message || fallback;
  if (/taken|already|in use|exists/i.test(msg)) {
    return 'That domain is already connected to another Netlify site. If it\'s yours, remove it there first.';
  }
  return msg;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const auth = req.headers.authorization || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const userId = await getUserId(bearer);
  if (!userId) return res.status(401).json({ error: 'Not signed in' });

  const { action, projectId, domain: rawDomain } = req.body || {};
  if (!['connect', 'status', 'disconnect'].includes(action)) return res.status(400).json({ error: 'Unknown action' });
  if (!projectId) return res.status(400).json({ error: 'Missing project' });

  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  const token = process.env.NETLIFY_TOKEN;
  if (!serviceKey || !token) return res.status(500).json({ error: 'Server configuration error' });

  if (!(await underRateLimit(serviceKey, userId, 'domain', DOMAIN_RATE_LIMIT, DOMAIN_RATE_WINDOW_MIN))) {
    return res.status(429).json({ error: `Too many requests — try again in a few minutes.` });
  }

  const svc = { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey };
  const saveProject = (fields) => fetch(`${SUPABASE_URL}/rest/v1/projects?id=eq.${encodeURIComponent(projectId)}&user_id=eq.${userId}`, {
    method: 'PATCH',
    headers: { ...svc, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(fields),
  });

  // Ownership: the project must belong to the caller AND be published.
  const pr = await fetch(`${SUPABASE_URL}/rest/v1/projects?select=id,netlify_site_id,published_url,custom_domain,domain_status`
    + `&id=eq.${encodeURIComponent(projectId)}&user_id=eq.${userId}&limit=1`, { headers: svc });
  const rows = await pr.json().catch(() => []);
  if (!pr.ok || !Array.isArray(rows) || rows.length === 0) {
    return res.status(403).json({ error: 'That project is not linked to your account.' });
  }
  const project = rows[0];
  if (!project.netlify_site_id) {
    return res.status(400).json({ error: 'Publish this site first, then connect your domain.' });
  }
  const siteId = project.netlify_site_id;

  try {
    if (action === 'disconnect') {
      if (project.custom_domain) {
        const r = await netlify(`/sites/${siteId}`, token, { method: 'PATCH', body: JSON.stringify({ custom_domain: null }) });
        if (!r.ok) return res.status(502).json({ error: netlifyError(r.data, 'Could not remove the domain. Please try again.') });
      }
      await saveProject({ custom_domain: null, domain_status: null, domain_checked_at: null });
      return res.status(200).json({ domain: null, status: null });
    }

    if (action === 'connect') {
      const { domain, error } = normaliseDomain(rawDomain);
      if (error) return res.status(400).json({ error });

      // Our own uniqueness check first (clear message; also backed by a DB index).
      const dup = await fetch(`${SUPABASE_URL}/rest/v1/projects?select=id&custom_domain=ilike.${encodeURIComponent(domain)}&id=neq.${encodeURIComponent(projectId)}&limit=1`, { headers: svc });
      const dupRows = await dup.json().catch(() => []);
      if (Array.isArray(dupRows) && dupRows.length) {
        return res.status(409).json({ error: 'That domain is already connected to another Sitefliq site.' });
      }

      const r = await netlify(`/sites/${siteId}`, token, { method: 'PATCH', body: JSON.stringify({ custom_domain: domain }) });
      if (!r.ok) return res.status(r.status === 422 ? 400 : 502).json({ error: netlifyError(r.data, 'Could not add the domain. Please try again.') });

      const siteHost = r.data?.default_domain || `${r.data?.name}.netlify.app`;
      const saved = await saveProject({ custom_domain: domain, domain_status: 'pending', domain_checked_at: null });
      if (!saved.ok) return res.status(500).json({ error: 'Domain added, but saving it failed. Please try again.' });

      return res.status(200).json({ domain, status: 'pending', siteHost, records: dnsRecordsFor(domain, siteHost) });
    }

    // action === 'status'
    if (!project.custom_domain) return res.status(200).json({ domain: null, status: null });
    const domain = project.custom_domain;

    const site = await netlify(`/sites/${siteId}`, token);
    if (!site.ok) return res.status(502).json({ error: netlifyError(site.data, 'Could not reach the hosting provider.') });
    const siteHost = site.data?.default_domain || `${site.data?.name}.netlify.app`;

    const resolver = makeResolver();
    const { root, isApex } = splitDomain(domain);
    const [main, www] = await Promise.all([
      checkHostDns(resolver, domain, siteHost),
      isApex ? checkHostDns(resolver, `www.${root}`, siteHost) : Promise.resolve(null),
    ]);

    // HTTPS: only meaningful once DNS points at Netlify. Netlify provisions the
    // Let's Encrypt cert itself; we nudge it if no cert covers the domain yet.
    let https = 'waiting_for_dns';
    if (main.ok) {
      const cert = await netlify(`/sites/${siteId}/ssl`, token);
      const covers = cert.ok && cert.data?.state === 'issued'
        && (!Array.isArray(cert.data.domains) || cert.data.domains.map(strip).includes(domain));
      if (covers) {
        https = 'active';
      } else {
        https = 'provisioning';
        await netlify(`/sites/${siteId}/ssl`, token, { method: 'POST' }).catch(() => {});
      }
    }

    const status = !main.ok ? 'pending' : https === 'active' ? 'live' : 'verifying';
    await saveProject({ domain_status: status, domain_checked_at: new Date().toISOString() });

    return res.status(200).json({
      domain, status, siteHost,
      records: dnsRecordsFor(domain, siteHost),
      dns: { ok: main.ok, found: main.found, www: www && { ok: www.ok, found: www.found } },
      https,
    });
  } catch (err) {
    console.error('Domains error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
