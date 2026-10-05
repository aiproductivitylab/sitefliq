// api/paddle-webhook.js — Vercel serverless function
import crypto from 'crypto';
import { subscriptionByPriceId } from '../src/config/plans.js';

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
    const type = event.event_type;
    const data = event.data || {};

    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
    if (!SUPABASE_SERVICE_KEY) return res.status(500).json({ error: 'Server configuration error' });
    const sh = { apikey: SUPABASE_SERVICE_KEY, Authorization: 'Bearer ' + SUPABASE_SERVICE_KEY, 'Content-Type': 'application/json' };

    const priceIdOf = (o) => o?.items?.[0]?.price?.id;
    const refill = async (userId, credits) => {
      const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/refill_monthly_credits', {
        method: 'POST', headers: sh, body: JSON.stringify({ p_user_id: userId, p_amount: credits }),
      });
      return r.ok;
    };
    const userBySubscription = async (subId) => {
      if (!subId) return null;
      const r = await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?select=user_id&paddle_subscription_id=eq.${encodeURIComponent(subId)}&limit=1`, { headers: sh });
      const rows = await r.json().catch(() => []);
      return (r.ok && Array.isArray(rows) && rows[0]) ? rows[0].user_id : null;
    };

    // ── Subscription lifecycle: keep the subscriptions table in sync ──
    if (type === 'subscription.created' || type === 'subscription.updated') {
      const userId = data.custom_data?.user_id || await userBySubscription(data.id);
      const plan = subscriptionByPriceId(priceIdOf(data));
      if (!userId || !plan) {
        console.error(`${type}: missing user/plan (sub ${data.id}, price ${priceIdOf(data)})`);
        return res.status(200).json({ received: true });
      }
      await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?on_conflict=paddle_subscription_id`, {
        method: 'POST',
        headers: { ...sh, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({
          paddle_subscription_id: data.id,
          user_id: userId,
          paddle_customer_id: data.customer_id || null,
          plan: plan.id,
          status: data.status || null,
          monthly_credits: plan.credits,
          current_period_end: data.current_billing_period?.ends_at || null,
        }),
      });
      // Reflect the (new) allotment now: on create for the first period, and on an
      // active update (e.g. a plan change). refill SETS, so this is idempotent.
      if (data.status === 'active' || data.status === 'trialing') await refill(userId, plan.credits);
      return res.status(200).json({ success: true });
    }

    if (type === 'subscription.canceled') {
      // Keep access until the period ends — only flag status; don't zero credits.
      await fetch(`${SUPABASE_URL}/rest/v1/subscriptions?paddle_subscription_id=eq.${encodeURIComponent(data.id)}`, {
        method: 'PATCH',
        headers: { ...sh, Prefer: 'return=minimal' },
        body: JSON.stringify({ status: 'canceled', current_period_end: data.current_billing_period?.ends_at || null }),
      });
      return res.status(200).json({ success: true });
    }

    // ── Recurring (and first) subscription payment → refill monthly credits ──
    if (type === 'transaction.completed') {
      const plan = subscriptionByPriceId(priceIdOf(data));
      if (!plan) { console.error(`transaction ${data.id}: unknown price ${priceIdOf(data)}`); return res.status(200).json({ received: true }); }
      const userId = data.custom_data?.user_id || await userBySubscription(data.subscription_id);
      if (!userId) { console.error(`transaction ${data.id}: no user match`); return res.status(200).json({ received: true }); }

      // Idempotency: don't double-process the same transaction id.
      const exRes = await fetch(SUPABASE_URL + '/rest/v1/transactions?select=id&limit=1&paddle_transaction_id=eq.' + encodeURIComponent(data.id), { headers: sh });
      if (!exRes.ok) { console.error(`idempotency lookup failed ${data.id}: ${await exRes.text()}`); return res.status(500).json({ error: 'Idempotency lookup failed' }); }
      const ex = await exRes.json();
      if (!Array.isArray(ex)) return res.status(500).json({ error: 'Idempotency lookup failed' });
      if (ex.length > 0) return res.status(200).json({ success: true, already_processed: true });

      const ok = await refill(userId, plan.credits);
      if (!ok) { console.error(`refill failed for ${userId} on transaction ${data.id}`); return res.status(500).json({ error: 'Failed to refill credits' }); }

      const logRes = await fetch(SUPABASE_URL + '/rest/v1/transactions', {
        method: 'POST', headers: sh,
        body: JSON.stringify({ user_id: userId, plan: plan.id, amount: data.details?.totals?.total || 0, credits_added: plan.credits, paddle_transaction_id: data.id }),
      });
      if (!logRes.ok) console.error(`transaction log insert failed ${data.id} (credits already refilled): ${await logRes.text()}`);

      console.log(`Refilled ${plan.credits} monthly credits for ${userId} (${plan.id})`);
      return res.status(200).json({ success: true, credits: plan.credits });
    }

    return res.status(200).json({ received: true });

  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: err.message });
  }
}
