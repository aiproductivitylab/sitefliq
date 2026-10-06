// api/leads/score.js — website quality score (Step 6, F5 scoring half).
//
// Pastes a business URL, runs it through Google PageSpeed Insights (FREE — no
// billing, no credits) and returns a simple sales-oriented report: performance
// score, mobile-friendly, HTTPS, and an overall verdict. Same security model as
// /api/generate and /api/edit: a valid Supabase token is required and the call is
// per-user rate limited. NOTHING is charged — PageSpeed is free, so this is a free
// tool that also seeds the one-click rebuild flow.
//
// PageSpeed Insights needs a GOOGLE_PAGESPEED_KEY to be reliable (25,000 req/day,
// ~240/min with a key; harsh anonymous throttling without one). The key is free
// and needs no billing — see the Lead Finder notes in SUBSCRIPTION_UPGRADE_PLAN.md.
// The call still works keyless for very low volume, so the key is optional here.

const SUPABASE_URL = "https://fcajlfdykudsunczdrex.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYWpsZmR5a3Vkc3VuY3pkcmV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTcwMjYsImV4cCI6MjA4ODIzMzAyNn0.ez9ue4RXqAUzFjG9pBk4sra9zDKC-CCBFC4pbelwGg8";

const SCORE_RATE_LIMIT = 15;        // scores per window, per user (free, but stop abuse)
const SCORE_RATE_WINDOW_MIN = 10;
const PSI_ENDPOINT = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";

// PageSpeed can take 10–30s on a slow site; give the function room on platforms
// that honour it (Vercel Pro). Clamped/ignored elsewhere — harmless.
export const config = { maxDuration: 60 };

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

// Normalise user input to a fetchable https URL. Returns null if it can't.
function normaliseUrl(raw) {
  let u = String(raw || '').trim();
  if (!u) return null;
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try {
    const parsed = new URL(u);
    if (!/^https?:$/.test(parsed.protocol)) return null;
    if (!parsed.hostname.includes('.')) return null; // reject bare words / localhost-ish
    return parsed.toString();
  } catch { return null; }
}

// Turn the three signals into one plain-English verdict for the sales UI.
function verdictFor({ perf, mobileFriendly, https }) {
  const slow = perf !== null && perf < 50;
  const okPerf = perf !== null && perf >= 90;
  if (!https || !mobileFriendly || slow) return 'Needs a new website';
  if (okPerf && mobileFriendly && https) return 'Good';
  return 'Could be improved';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) return res.status(500).json({ error: 'Server configuration error' });

  // 1. Auth — login required.
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const userId = await getUserId(token);
  if (!userId) return res.status(401).json({ error: 'Not signed in' });

  // 2. Input.
  const url = normaliseUrl(req.body?.url);
  if (!url) return res.status(400).json({ error: 'bad_url', message: 'Enter a valid website address, e.g. acmeplumbing.com' });

  // 3. Rate limit (no credits are charged — this is a free tool).
  const allowed = await underRateLimit(serviceKey, userId, 'score', SCORE_RATE_LIMIT, SCORE_RATE_WINDOW_MIN);
  if (!allowed) {
    return res.status(429).json({ error: `Too many checks — max ${SCORE_RATE_LIMIT} per ${SCORE_RATE_WINDOW_MIN} minutes.` });
  }

  // 4. Call PageSpeed Insights (mobile strategy — matches how customers browse).
  const params = new URLSearchParams({ url, strategy: 'mobile' });
  for (const c of ['performance', 'seo', 'best-practices']) params.append('category', c);
  const psiKey = process.env.GOOGLE_PAGESPEED_KEY;
  if (psiKey) params.append('key', psiKey);

  let data;
  try {
    const r = await fetch(`${PSI_ENDPOINT}?${params.toString()}`, { signal: AbortSignal.timeout(55000) });
    data = await r.json().catch(() => null);
    if (!r.ok || !data) {
      const msg = data?.error?.message || '';
      // PSI returns 400/500 when it can't load the page at all.
      return res.status(422).json({
        error: 'unreachable',
        message: msg.includes('Lighthouse') || msg.includes('FAILED')
          ? "We couldn't load that site to analyse it — check the address and try again."
          : "That site couldn't be analysed right now — try again in a moment.",
      });
    }
  } catch (e) {
    const timeout = e?.name === 'TimeoutError' || /timeout/i.test(e?.message || '');
    return res.status(timeout ? 504 : 502).json({
      error: timeout ? 'timeout' : 'upstream',
      message: timeout
        ? "That site took too long to analyse — it may be very slow (which is itself a red flag)."
        : "Couldn't reach the analysis service — try again in a moment.",
    });
  }

  const lh = data.lighthouseResult || {};
  if (lh.runtimeError) {
    return res.status(422).json({ error: 'unreachable', message: "We couldn't load that site to analyse it — check the address and try again." });
  }

  const audits = lh.audits || {};
  const perfRaw = lh.categories?.performance?.score;
  const perf = typeof perfRaw === 'number' ? Math.round(perfRaw * 100) : null;

  // Mobile-friendly proxy: Lighthouse's `viewport` audit (has a responsive
  // <meta name=viewport>). Reliable and free; no separate mobile-friendly API.
  const mobileFriendly = audits.viewport?.score === 1;

  // HTTPS: prefer Lighthouse's is-on-https audit; fall back to the final URL
  // scheme (after any http→https redirect PSI followed).
  const finalUrl = lh.finalUrl || lh.finalDisplayedUrl || url;
  const https = audits['is-on-https']
    ? audits['is-on-https'].score === 1
    : /^https:/i.test(finalUrl);

  const verdict = verdictFor({ perf, mobileFriendly, https });

  return res.status(200).json({
    url,
    finalUrl,
    perf,              // 0–100 or null if PSI couldn't score it
    mobileFriendly,    // bool
    https,             // bool
    verdict,           // "Needs a new website" | "Could be improved" | "Good"
  });
}
