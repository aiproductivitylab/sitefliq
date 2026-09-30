// api/generate.js — Anthropic proxy with server-side credit enforcement.
//
// Security model (Step 1): the browser can no longer generate for free, cannot
// choose the model/token ceiling, and is rate limited. Every request must carry
// the caller's Supabase access token; the server verifies it, rate-limits it,
// deducts credits, forces the model + max_tokens (taking ONLY `messages` from the
// body), then calls Anthropic. The credit is refunded if Anthropic fails OR if
// the generated output is truncated (stop_reason max_tokens) or missing </html>.

const SUPABASE_URL = "https://fcajlfdykudsunczdrex.supabase.co";
// Public anon key (same value shipped in the browser bundle) — used only as the
// apikey header when asking Supabase to resolve a user from their bearer token.
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYWpsZmR5a3Vkc3VuY3pkcmV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTcwMjYsImV4cCI6MjA4ODIzMzAyNn0.ez9ue4RXqAUzFjG9pBk4sra9zDKC-CCBFC4pbelwGg8";

// Forced generation parameters — NOT taken from the browser.
const GEN_MODEL = "claude-sonnet-4-6";
const GEN_MAX_TOKENS = 24000;

// Credits charged per full generation. Stays at 1 for now (one credit = one page,
// matching today's 3/10/25 packs). Becomes 4 in Step 5 alongside the ×4 balance
// migration — this single constant is the only thing that changes then.
// See docs/SUBSCRIPTION_UPGRADE_PLAN.md §2.
const GENERATION_COST = 1;

// Rate limit: max generations per window, per user.
const GEN_RATE_LIMIT = 5;
const GEN_RATE_WINDOW_MIN = 10;

async function getUserId(token) {
  if (!token) return null;
  try {
    const r = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + token },
    });
    if (!r.ok) return null;
    const user = await r.json();
    return user?.id || null;
  } catch {
    return null;
  }
}

function serviceHeaders(serviceKey, extra = {}) {
  return {
    apikey: serviceKey,
    Authorization: 'Bearer ' + serviceKey,
    'Content-Type': 'application/json',
    ...extra,
  };
}

// Durable per-user rate limit. Returns true if allowed (and records the event).
async function underRateLimit(serviceKey, userId, action, limit, windowMin) {
  const sinceIso = new Date(Date.now() - windowMin * 60 * 1000).toISOString();
  const q = `${SUPABASE_URL}/rest/v1/rate_events?select=id&user_id=eq.${userId}&action=eq.${action}`
    + `&created_at=gte.${encodeURIComponent(sinceIso)}&limit=${limit}`;
  const r = await fetch(q, { headers: serviceHeaders(serviceKey) });
  const rows = await r.json().catch(() => []);
  if (Array.isArray(rows) && rows.length >= limit) return false;
  await fetch(SUPABASE_URL + '/rest/v1/rate_events', {
    method: 'POST',
    headers: serviceHeaders(serviceKey),
    body: JSON.stringify({ user_id: userId, action }),
  });
  return true;
}

async function addCredits(serviceKey, userId, amount) {
  return fetch(SUPABASE_URL + '/rest/v1/rpc/add_credits', {
    method: 'POST',
    headers: serviceHeaders(serviceKey),
    body: JSON.stringify({ p_user_id: userId, p_amount: amount }),
  });
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const key = process.env.ANTHROPIC_KEY;
  if (!key) return res.status(500).json({ error: 'API key not configured' });

  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) return res.status(500).json({ error: 'Server configuration error' });

  // 1. Authenticate the caller.
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const userId = await getUserId(token);
  if (!userId) return res.status(401).json({ error: 'Not signed in' });

  // 2. Take ONLY the messages from the body; the model + max_tokens are forced
  //    server-side so the browser can't request a different (pricier) model.
  const messages = req.body?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'messages required' });
  }

  // 3. Rate limit (before any spend).
  const allowed = await underRateLimit(serviceKey, userId, 'generate', GEN_RATE_LIMIT, GEN_RATE_WINDOW_MIN);
  if (!allowed) {
    return res.status(429).json({ error: `Too many generations — max ${GEN_RATE_LIMIT} per ${GEN_RATE_WINDOW_MIN} minutes.` });
  }

  // 4. Deduct credits atomically BEFORE generating. If the balance is too low the
  //    RPC raises 'insufficient_credits' and nothing is charged.
  const deductRes = await fetch(SUPABASE_URL + '/rest/v1/rpc/deduct_credits', {
    method: 'POST',
    headers: serviceHeaders(serviceKey),
    body: JSON.stringify({ p_user_id: userId, p_amount: GENERATION_COST, p_reason: 'generation' }),
  });
  if (!deductRes.ok) {
    const detail = await deductRes.text();
    if (detail.includes('insufficient_credits')) {
      return res.status(402).json({ error: 'insufficient_credits' });
    }
    console.error(`deduct_credits failed for user ${userId} (HTTP ${deductRes.status}): ${detail}`);
    return res.status(500).json({ error: 'Could not reserve credits' });
  }

  // A credit has now been spent — refund it on any failure or bad output.
  let refunded = false;
  const refund = async () => {
    if (refunded) return;
    refunded = true;
    try { await addCredits(serviceKey, userId, GENERATION_COST); }
    catch (e) { console.error(`Refund failed for user ${userId}:`, e); }
  };

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: GEN_MODEL,
        max_tokens: GEN_MAX_TOKENS,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      await refund();
      const err = await response.json().catch(() => ({ error: 'Upstream error' }));
      return res.status(response.status).json(err);
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    // Stream to the client while ALSO collecting the text + stop reason so we can
    // detect a truncated or malformed page and refund automatically.
    let fullText = '';
    let stopReason = null;
    let buffer = '';
    const handleLine = (line) => {
      if (!line.startsWith('data: ')) return;
      const payload = line.slice(6);
      if (payload === '[DONE]') return;
      try {
        const parsed = JSON.parse(payload);
        if (parsed.type === 'content_block_delta' && parsed.delta?.text) fullText += parsed.delta.text;
        if (parsed.type === 'message_delta' && parsed.delta?.stop_reason) stopReason = parsed.delta.stop_reason;
      } catch {}
    };

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      res.write(chunk);
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop();
      for (const line of lines) handleLine(line);
    }
    buffer += decoder.decode();
    for (const line of buffer.split('\n')) handleLine(line);

    // Auto-refund a truncated or non-terminated page. The client also surfaces
    // this as an error; the refund makes the credit come back either way.
    if (stopReason === 'max_tokens' || !fullText.includes('</html>')) {
      await refund();
    }

    res.end();
  } catch (err) {
    console.error('Generate error:', err);
    if (!res.headersSent) {
      await refund();
      res.status(500).json({ error: 'Internal server error' });
    } else {
      // Stream already started and then broke — refund the incomplete page.
      await refund();
      try { res.end(); } catch {}
    }
  }
}
