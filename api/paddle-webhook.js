// api/paddle-webhook.js — Vercel serverless function
import crypto from 'crypto';

// Paddle signs the RAW request body. Vercel's automatic JSON body parser would
// re-serialize it and change the bytes, breaking the signature — so we turn the
// parser off, read the raw stream ourselves, verify, THEN JSON.parse.
export const config = { api: { bodyParser: false } };

const SUPABASE_URL = "https://fcajlfdykudsunczdrex.supabase.co";

// Read the raw request body as a UTF-8 string (bodyParser is disabled).
async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf8');
}

// Parse a Paddle-Signature header of the form "ts=1700000000;h1=abcdef...".
function parsePaddleSignature(header) {
  const parts = {};
  for (const kv of String(header || '').split(';')) {
    const idx = kv.indexOf('=');
    if (idx === -1) continue;
    parts[kv.slice(0, idx).trim()] = kv.slice(idx + 1).trim();
  }
  return parts; // { ts, h1 }
}

// Constant-time compare of two hex digest strings.
function safeEqualHex(a, b) {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret) {
    console.error('PADDLE_WEBHOOK_SECRET is not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    // 1. Read the raw body and verify the signature BEFORE parsing.
    const rawBody = await readRawBody(req);
    const { ts, h1 } = parsePaddleSignature(req.headers['paddle-signature']);
    if (!ts || !h1) return res.status(401).json({ error: 'Missing signature' });

    // Replay protection: reject signatures older than 5 minutes.
    const tsNum = Number(ts);
    const nowSec = Math.floor(Date.now() / 1000);
    if (!Number.isFinite(tsNum) || (nowSec - tsNum) > 300) {
      return res.status(401).json({ error: 'Signature expired' });
    }

    // HMAC-SHA256 of "${ts}:${rawBody}" with the webhook secret.
    const expected = crypto.createHmac('sha256', secret).update(`${ts}:${rawBody}`).digest('hex');
    if (!safeEqualHex(expected, h1)) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // 2. Signature is valid — now it's safe to parse the body.
    const event = JSON.parse(rawBody);
    if (event.event_type !== 'transaction.completed') return res.status(200).json({ received: true });

    const transaction = event.data;

    // Only the user ID comes from the browser (custom_data). The plan and credit
    // amount are derived server-side from the Paddle price ID so a tampered
    // browser payload can't award the wrong number of credits.
    const customData = transaction.custom_data || {};
    const userId = customData.user_id;
    if (!userId) return res.status(400).json({ error: 'Missing user_id' });

    // Price ID → plan + credits. Source of truth for what each purchase grants.
    const PRICE_TO_PLAN = {
      pri_01kjxa8pggzk3j8hekhsadx0pe: { plan: 'starter', credits: 3 },
      pri_01kjxachhq3afcqc0gj54x2yq7: { plan: 'pro',     credits: 10 },
      pri_01kjxafb31r7g5gc23se78j10a: { plan: 'agency',  credits: 25 },
    };

    const priceId = transaction.items?.[0]?.price?.id;
    const mapped = PRICE_TO_PLAN[priceId];
    if (!mapped) {
      console.error(`Unknown Paddle price ID on transaction ${transaction.id}: ${priceId}`);
      return res.status(400).json({ error: 'Unknown price ID' });
    }
    const { plan, credits: creditsToAdd } = mapped;

    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
    if (!SUPABASE_SERVICE_KEY) return res.status(500).json({ error: 'Server configuration error' });

    const supabaseHeaders = {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
      'Content-Type': 'application/json'
    };

    // Idempotency: Paddle can deliver the same webhook more than once. If we've
    // already recorded this transaction, acknowledge it without double-crediting.
    const existingRes = await fetch(
      SUPABASE_URL + '/rest/v1/transactions?select=id&limit=1&paddle_transaction_id=eq.' + encodeURIComponent(transaction.id),
      { headers: supabaseHeaders }
    );
    if (!existingRes.ok) {
      const detail = await existingRes.text();
      console.error(`Idempotency lookup failed for ${transaction.id} (HTTP ${existingRes.status}): ${detail}`);
      return res.status(500).json({ error: 'Idempotency lookup failed' });
    }
    const existing = await existingRes.json();
    if (!Array.isArray(existing)) {
      console.error(`Idempotency lookup returned unexpected payload for ${transaction.id}: ${JSON.stringify(existing)}`);
      return res.status(500).json({ error: 'Idempotency lookup failed' });
    }
    if (existing.length > 0) {
      console.log(`Transaction ${transaction.id} already processed — skipping`);
      return res.status(200).json({ success: true, already_processed: true });
    }

    // Add credits. This must succeed before we acknowledge — on any non-2xx we
    // log the error and return 500 so Paddle retries the delivery.
    const creditRes = await fetch(SUPABASE_URL + '/rest/v1/rpc/add_credits', {
      method: 'POST',
      headers: supabaseHeaders,
      body: JSON.stringify({ p_user_id: userId, p_amount: creditsToAdd })
    });
    if (!creditRes.ok) {
      const detail = await creditRes.text();
      console.error(`add_credits failed for user ${userId}, transaction ${transaction.id} (HTTP ${creditRes.status}): ${detail}`);
      return res.status(500).json({ error: 'Failed to add credits' });
    }

    // Log the transaction — only after credits were granted. This row is also
    // the idempotency marker. If the insert fails we log loudly but still return
    // 200: the credits are already granted, and returning 500 here would make
    // Paddle retry and double-credit (no marker row exists yet to stop it).
    const logRes = await fetch(SUPABASE_URL + '/rest/v1/transactions', {
      method: 'POST',
      headers: supabaseHeaders,
      body: JSON.stringify({
        user_id: userId,
        plan: plan,
        amount: transaction.details?.totals?.total || 0,
        credits_added: creditsToAdd,
        paddle_transaction_id: transaction.id
      })
    });
    if (!logRes.ok) {
      const detail = await logRes.text();
      console.error(`Transaction log insert failed for ${transaction.id} (HTTP ${logRes.status}) — credits WERE granted: ${detail}`);
    }

    console.log(`Added ${creditsToAdd} credits to user ${userId} for plan ${plan}`);
    return res.status(200).json({ success: true, credits_added: creditsToAdd });

  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: err.message });
  }
}
