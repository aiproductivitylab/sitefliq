// api/publish.js — publish a generated page to Netlify.
// Locked down (Step 1): requires a valid Supabase login token and is rate limited
// per user, so the Netlify-site-creation endpoint can't be abused anonymously.

const SUPABASE_URL = "https://fcajlfdykudsunczdrex.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYWpsZmR5a3Vkc3VuY3pkcmV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTcwMjYsImV4cCI6MjA4ODIzMzAyNn0.ez9ue4RXqAUzFjG9pBk4sra9zDKC-CCBFC4pbelwGg8";

const PUBLISH_RATE_LIMIT = 10;
const PUBLISH_RATE_WINDOW_MIN = 10;

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

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Require a signed-in user.
  const auth = req.headers.authorization || '';
  const bearer = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const userId = await getUserId(bearer);
  if (!userId) return res.status(401).json({ error: 'Not signed in' });

  const { html, name } = req.body;
  if (!html || !name) return res.status(400).json({ error: 'Missing html or name' });

  // Rate limit (uses the same rate_events table as generate; requires the service key).
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) return res.status(500).json({ error: 'Server configuration error' });
  const allowed = await underRateLimit(serviceKey, userId, 'publish', PUBLISH_RATE_LIMIT, PUBLISH_RATE_WINDOW_MIN);
  if (!allowed) {
    return res.status(429).json({ error: `Too many publishes — max ${PUBLISH_RATE_LIMIT} per ${PUBLISH_RATE_WINDOW_MIN} minutes.` });
  }

  const token = process.env.NETLIFY_TOKEN;
  if (!token) return res.status(500).json({ error: 'Deploy token not configured' });

  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 40);
  const siteName = `sf-${slug}-${Date.now().toString(36)}`;

  try {
    // Create a new Netlify site
    const siteRes = await fetch('https://api.netlify.com/api/v1/sites', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: siteName }),
    });

    const site = await siteRes.json();
    if (!siteRes.ok) return res.status(500).json({ error: site.message || 'Failed to create site' });

    const siteId = site.id;
    const siteUrl = `https://${siteName}.netlify.app`;

    // Deploy the HTML file
    const encoder = new TextEncoder();
    const htmlBytes = encoder.encode(html);

    // Calculate SHA1 of the file for Netlify's digest
    const hashBuffer = await crypto.subtle.digest('SHA-1', htmlBytes);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const sha1 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Create deploy with file digest
    const deployRes = await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        files: { '/index.html': sha1 },
        async: true,
      }),
    });

    const deploy = await deployRes.json();
    if (!deployRes.ok) return res.status(500).json({ error: deploy.message || 'Deploy failed' });

    // Upload the file
    await fetch(`https://api.netlify.com/api/v1/deploys/${deploy.id}/files/index.html`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
      },
      body: html,
    });

    return res.status(200).json({ url: siteUrl, ready: true });

  } catch (err) {
    console.error('Publish error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
