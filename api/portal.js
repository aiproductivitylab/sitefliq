// api/portal.js — returns a Paddle customer-portal URL so a subscriber can manage
// or cancel their subscription. Requires a Supabase login and PADDLE_API_KEY.

const SUPABASE_URL = "https://fcajlfdykudsunczdrex.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYWpsZmR5a3Vkc3VuY3pkcmV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTcwMjYsImV4cCI6MjA4ODIzMzAyNn0.ez9ue4RXqAUzFjG9pBk4sra9zDKC-CCBFC4pbelwGg8";
const PADDLE_API = "https://api.paddle.com";   // production (live_ tokens)

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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const paddleKey = process.env.PADDLE_API_KEY;
  if (!paddleKey) return res.status(500).json({ error: 'Billing not configured' });
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) return res.status(500).json({ error: 'Server configuration error' });

  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const userId = await getUserId(token);
  if (!userId) return res.status(401).json({ error: 'Not signed in' });

  // Look up this user's subscription (service key) to get the Paddle customer id.
  const sh = { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey };
  const subRes = await fetch(
    `${SUPABASE_URL}/rest/v1/subscriptions?select=paddle_customer_id,paddle_subscription_id&user_id=eq.${userId}&order=updated_at.desc&limit=1`,
    { headers: sh }
  );
  const rows = await subRes.json().catch(() => []);
  const sub = Array.isArray(rows) && rows[0];
  if (!sub?.paddle_customer_id) return res.status(404).json({ error: 'No subscription found' });

  try {
    const pRes = await fetch(`${PADDLE_API}/customers/${sub.paddle_customer_id}/portal-sessions`, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + paddleKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(sub.paddle_subscription_id ? { subscription_ids: [sub.paddle_subscription_id] } : {}),
    });
    const pData = await pRes.json().catch(() => ({}));
    if (!pRes.ok) {
      console.error(`Paddle portal-session failed (HTTP ${pRes.status}):`, JSON.stringify(pData).slice(0, 300));
      return res.status(502).json({ error: 'Could not open the billing portal' });
    }
    const url = pData?.data?.urls?.general?.overview;
    if (!url) return res.status(502).json({ error: 'Could not open the billing portal' });
    return res.status(200).json({ url });
  } catch (err) {
    console.error('Portal error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
