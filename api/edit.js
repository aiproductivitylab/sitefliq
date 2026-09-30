// api/edit.js — AI chat editing of a generated page (Step 2).
//
// Targeted search/replace, not full rewrite: the model returns a small JSON array
// of {find, replace} edits against the current HTML. The server applies them
// (only when `find` matches exactly once), validates the result, and returns the
// new HTML. Same security model as /api/generate: valid Supabase token required,
// per-user rate limited, 1 credit deducted up front and REFUNDED if no edit is
// actually applied or the result is invalid — so a failed edit never costs a
// credit and never destroys the working page.

const SUPABASE_URL = "https://fcajlfdykudsunczdrex.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYWpsZmR5a3Vkc3VuY3pkcmV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTcwMjYsImV4cCI6MjA4ODIzMzAyNn0.ez9ue4RXqAUzFjG9pBk4sra9zDKC-CCBFC4pbelwGg8";

const EDIT_MODEL = "claude-sonnet-4-6";
const EDIT_MAX_TOKENS = 8000;      // edits are small (only the changed strings)
const EDIT_COST = 1;               // 1 credit per applied edit
const EDIT_RATE_LIMIT = 20;
const EDIT_RATE_WINDOW_MIN = 10;
// Max accepted page size (raw, before masking). A generated page with a base64
// logo is well under this; reject anything larger with a clear error.
const MAX_HTML_BYTES = 1_500_000;

const EDIT_SYSTEM_PROMPT = [
  "You are editing an existing single-file HTML landing page. The user gives you the current full HTML and one change request.",
  'Return ONLY a JSON array of edit objects: [{"find": "<exact substring of the current HTML>", "replace": "<new string>"}].',
  "Rules:",
  "- `find` MUST be copied verbatim from the current HTML (exact characters and whitespace) and must be unique — include enough surrounding context that it occurs EXACTLY once.",
  "- Make the SMALLEST change that satisfies the request. Never restate or reformat the whole document.",
  "- Preserve everything unrelated: untouched scripts, styles, markup, and the logo.",
  "- Never invent facts, fake reviews, fake staff/customers, or claims the user did not provide.",
  "- The HTML may contain opaque placeholder tokens like __DATA_0__ in place of image data. Treat them as opaque: never modify, decode, or reproduce their contents. You may keep one inside a `find`/`replace` verbatim if it is part of the surrounding context, but never invent or alter one.",
  "- Output the raw JSON array and NOTHING else — no prose, no markdown code fences.",
  "If the request cannot be satisfied with exact substring edits, return [].",
].join("\n");

// Replace every data: URL (e.g. the base64 logo from the __LOGO__ swap) with a
// short opaque token before the HTML is sent to Claude, and restore them after
// the edits are applied. Claude never sees or edits the raw base64 — this keeps
// the request small/cheap and stops the model from mangling binary data.
// (Assumes base64 data URLs, which contain no spaces/quotes — the logo always is.)
function maskDataUrls(html) {
  const map = [];
  const seen = new Map(); // url -> token (dedupe identical URLs, e.g. logo reused)
  const masked = html.replace(/data:[^\s"'()]+/g, (url) => {
    if (seen.has(url)) return seen.get(url);
    const token = `__DATA_${map.length}__`;
    seen.set(url, token);
    map.push({ token, url });
    return token;
  });
  return { masked, map };
}

function restoreDataUrls(html, map) {
  let out = html;
  for (const { token, url } of map) out = out.split(token).join(url);
  return out;
}

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

async function addCredits(serviceKey, userId, amount) {
  return fetch(SUPABASE_URL + '/rest/v1/rpc/add_credits', {
    method: 'POST', headers: serviceHeaders(serviceKey),
    body: JSON.stringify({ p_user_id: userId, p_amount: amount }),
  });
}

// Extract the first JSON array from the model's text output.
function parseEdits(text) {
  const t = String(text || '').trim();
  const start = t.indexOf('[');
  const end = t.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) return null;
  try {
    const arr = JSON.parse(t.slice(start, end + 1));
    return Array.isArray(arr) ? arr : null;
  } catch { return null; }
}

// Apply each edit only when `find` occurs exactly once in the current text.
function applyEdits(html, edits) {
  let out = html;
  let applied = 0, skipped = 0;
  for (const e of edits) {
    if (!e || typeof e.find !== 'string' || typeof e.replace !== 'string' || e.find === '') { skipped++; continue; }
    const parts = out.split(e.find);
    if (parts.length - 1 === 1) { out = parts.join(e.replace); applied++; }
    else { skipped++; }   // 0 matches (not found) or >1 (ambiguous) → don't guess
  }
  return { out, applied, skipped };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.ANTHROPIC_KEY;
  if (!key) return res.status(500).json({ error: 'API key not configured' });
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) return res.status(500).json({ error: 'Server configuration error' });

  // 1. Auth.
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const userId = await getUserId(token);
  if (!userId) return res.status(401).json({ error: 'Not signed in' });

  // 2. Input.
  const html = req.body?.html;
  const instruction = req.body?.instruction;
  if (typeof html !== 'string' || !html || typeof instruction !== 'string' || !instruction.trim()) {
    return res.status(400).json({ error: 'html and instruction required' });
  }
  if (Buffer.byteLength(html, 'utf8') > MAX_HTML_BYTES) {
    return res.status(413).json({ error: 'page_too_large', message: 'This page is too large to edit by chat. Try removing large embedded images first.' });
  }

  // Mask data: URLs (base64 logo, etc.) so Claude never sees the raw binary.
  const { masked, map } = maskDataUrls(html);

  // 3. Rate limit (before spend).
  const allowed = await underRateLimit(serviceKey, userId, 'edit', EDIT_RATE_LIMIT, EDIT_RATE_WINDOW_MIN);
  if (!allowed) {
    return res.status(429).json({ error: `Too many edits — max ${EDIT_RATE_LIMIT} per ${EDIT_RATE_WINDOW_MIN} minutes.` });
  }

  // 4. Deduct 1 credit up front.
  const deductRes = await fetch(SUPABASE_URL + '/rest/v1/rpc/deduct_credits', {
    method: 'POST', headers: serviceHeaders(serviceKey),
    body: JSON.stringify({ p_user_id: userId, p_amount: EDIT_COST, p_reason: 'edit' }),
  });
  if (!deductRes.ok) {
    const detail = await deductRes.text();
    if (detail.includes('insufficient_credits')) return res.status(402).json({ error: 'insufficient_credits' });
    console.error(`deduct_credits (edit) failed for user ${userId} (HTTP ${deductRes.status}): ${detail}`);
    return res.status(500).json({ error: 'Could not reserve credit' });
  }

  let refunded = false;
  const refund = async () => {
    if (refunded) return;
    refunded = true;
    try { await addCredits(serviceKey, userId, EDIT_COST); }
    catch (e) { console.error(`Edit refund failed for user ${userId}:`, e); }
  };

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: EDIT_MODEL,
        max_tokens: EDIT_MAX_TOKENS,
        system: EDIT_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Current HTML:\n\n${masked}\n\nChange request: ${instruction.trim()}` }],
      }),
    });

    if (!response.ok) {
      await refund();
      const err = await response.json().catch(() => ({ error: 'Upstream error' }));
      return res.status(response.status).json(err);
    }

    const data = await response.json();
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
    const edits = parseEdits(text);
    if (!edits || edits.length === 0) {
      await refund();
      return res.status(422).json({ error: 'no_edits', message: "Couldn't turn that into an edit — try rephrasing." });
    }

    // Apply to the masked HTML (Claude's `find` strings reference what it saw).
    const { out, applied, skipped } = applyEdits(masked, edits);
    // Nothing matched, or the result no longer looks like a full HTML document →
    // preserve the original page and refund.
    if (applied === 0) {
      await refund();
      return res.status(422).json({ error: 'no_match', message: "Couldn't locate that on the page — try naming the section or text to change." });
    }
    if (!out.toLowerCase().includes('<!doctype') || !out.includes('</html>')) {
      await refund();
      return res.status(422).json({ error: 'invalid_result', message: "That edit would have broken the page, so it wasn't applied." });
    }

    // Restore the data: URLs before returning the final HTML.
    const finalHtml = restoreDataUrls(out, map);
    return res.status(200).json({ html: finalHtml, applied, skipped });
  } catch (err) {
    console.error('Edit error:', err);
    await refund();
    return res.status(500).json({ error: 'Internal server error' });
  }
}
