// api/paddle-webhook.js — Vercel serverless function
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const event = req.body;
    if (event.event_type !== 'transaction.completed') return res.status(200).json({ received: true });

    const transaction = event.data;
    const customData = transaction.custom_data || {};
    const userId = customData.user_id;
    const plan = customData.plan;

    if (!userId || !plan) return res.status(400).json({ error: 'Missing custom data' });

    const creditMap = { starter: 3, pro: 10, agency: 25 };
    const creditsToAdd = creditMap[plan] || 0;
    if (!creditsToAdd) return res.status(400).json({ error: 'Unknown plan' });

    const SUPABASE_URL = "https://fcajlfdykudsunczdrex.supabase.co";
    const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

    if (!SUPABASE_SERVICE_KEY) return res.status(500).json({ error: 'Server configuration error' });

    // Add credits
    await fetch(SUPABASE_URL + '/rest/v1/rpc/add_credits', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ p_user_id: userId, p_amount: creditsToAdd })
    });

    // Log transaction
    await fetch(SUPABASE_URL + '/rest/v1/transactions', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_SERVICE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId,
        plan: plan,
        amount: transaction.details?.totals?.total || 0,
        credits_added: creditsToAdd,
        paddle_transaction_id: transaction.id
      })
    });

    console.log(`Added ${creditsToAdd} credits to user ${userId} for plan ${plan}`);
    return res.status(200).json({ success: true, credits_added: creditsToAdd });

  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: err.message });
  }
}
