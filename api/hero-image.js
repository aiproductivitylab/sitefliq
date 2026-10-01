// api/hero-image.js — AI hero image via Google "Nano Banana" (Gemini image API).
//
// Default ("clean") mode: Nano Banana 2 (gemini-3.1-flash-image) — a scene/
// atmosphere hero built from the business's industry/description/vibe/palette.
// "branded" mode: Nano Banana Pro (gemini-3-pro-image) with the uploaded logo as
// a reference image, placing branding naturally on signage/vehicle/uniform/pack.
//
// Same security model as the other routes: valid Supabase token required, per-user
// rate limited, 1 credit deducted up front and REFUNDED automatically if the image
// can't be produced/stored (so the caller falls back to the Pexels hero for free).
// The image is uploaded to the public Supabase Storage bucket `hero-images` and the
// returned URL is used for __IMG_0__ — never base64 in the page HTML.
//
// Request format verified against ai.google.dev/gemini-api/docs/image-generation
// (Interactions API). Re-verify if Google changes the shape.

const SUPABASE_URL = "https://fcajlfdykudsunczdrex.supabase.co";
const SUPABASE_ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZjYWpsZmR5a3Vkc3VuY3pkcmV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI2NTcwMjYsImV4cCI6MjA4ODIzMzAyNn0.ez9ue4RXqAUzFjG9pBk4sra9zDKC-CCBFC4pbelwGg8";

const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const MODEL_CLEAN = "gemini-3.1-flash-image";   // Nano Banana 2
const MODEL_BRANDED = "gemini-3-pro-image";     // Nano Banana Pro
const BUCKET = "hero-images";

const HERO_COST = 1;
const HERO_RATE_LIMIT = 10;
const HERO_RATE_WINDOW_MIN = 10;

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

function svcHeaders(serviceKey, extra = {}) {
  return { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey, 'Content-Type': 'application/json', ...extra };
}

async function underRateLimit(serviceKey, userId, action, limit, windowMin) {
  const sinceIso = new Date(Date.now() - windowMin * 60 * 1000).toISOString();
  const q = `${SUPABASE_URL}/rest/v1/rate_events?select=id&user_id=eq.${userId}&action=eq.${action}`
    + `&created_at=gte.${encodeURIComponent(sinceIso)}&limit=${limit}`;
  const r = await fetch(q, { headers: svcHeaders(serviceKey) });
  const rows = await r.json().catch(() => []);
  if (Array.isArray(rows) && rows.length >= limit) return false;
  await fetch(SUPABASE_URL + '/rest/v1/rate_events', {
    method: 'POST', headers: svcHeaders(serviceKey), body: JSON.stringify({ user_id: userId, action }),
  });
  return true;
}

async function addCredits(serviceKey, userId, amount) {
  return fetch(SUPABASE_URL + '/rest/v1/rpc/add_credits', {
    method: 'POST', headers: svcHeaders(serviceKey),
    body: JSON.stringify({ p_user_id: userId, p_amount: amount }),
  });
}

function parseDataUrl(dataUrl) {
  const m = /^data:([^;]+);base64,(.*)$/s.exec(String(dataUrl || ""));
  return m ? { mime: m[1], data: m[2] } : null;
}

// Pull the base64 image + mime out of the (loosely documented) response shape.
function extractImage(resp) {
  if (!resp || typeof resp !== 'object') return null;
  if (resp.output_image?.data) return { data: resp.output_image.data, mime: resp.output_image.mime_type || "image/jpeg" };
  const out = resp.output;
  if (Array.isArray(out)) {
    const img = out.find(x => x && typeof x.data === 'string' && (x.type === 'image' || x.mime_type));
    if (img) return { data: img.data, mime: img.mime_type || "image/jpeg" };
  } else if (out && typeof out.data === 'string') {
    return { data: out.data, mime: out.mime_type || "image/jpeg" };
  }
  // Legacy generateContent fallback, just in case.
  const parts = resp.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    const p = parts.find(x => x?.inline_data?.data || x?.inlineData?.data);
    if (p) { const d = p.inline_data || p.inlineData; return { data: d.data, mime: d.mime_type || d.mimeType || "image/jpeg" }; }
  }
  return null;
}

function buildHeroPrompt({ mode, industry, description, vibe, colors }) {
  const ctx = description ? ` Business context: ${description}.` : "";
  const tone = vibe ? ` Overall mood: ${vibe}.` : "";
  const palette = colors ? ` Colour atmosphere inspired by ${colors.bg || ""} with ${colors.accent || ""} accents.` : "";
  const base = `A professional, photorealistic wide hero/establishing scene for a ${industry || "local business"}.${ctx}${tone}${palette} Cinematic, premium, uncluttered composition with natural flattering light.`;
  const guard = " Show ONLY the environment, space, tools or objects. Absolutely NO people, NO staff, NO customers, NO posed figures, and NO fabricated 'finished job' or completed-work results.";
  if (mode === "branded") {
    return base + " Use the provided logo image as a brand reference and place the branding NATURALLY within the scene — on signage, a vehicle wrap, a uniform patch, or product packaging — so it looks authentic and integrated. Keep the logo accurate and legible. Do not invent any other text beyond the brand name on that branding element."
      + guard;
  }
  return base + guard + " No text, words, letters, logos or watermarks anywhere in the image.";
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const geminiKey = process.env.GEMINI_API_KEY;
  // If the key isn't configured, don't charge — let the client fall back to Pexels.
  if (!geminiKey) return res.status(503).json({ error: 'hero_images_unavailable' });
  const serviceKey = process.env.SUPABASE_SERVICE_KEY;
  if (!serviceKey) return res.status(500).json({ error: 'Server configuration error' });

  // 1. Auth.
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const userId = await getUserId(token);
  if (!userId) return res.status(401).json({ error: 'Not signed in' });

  // 2. Input.
  const mode = req.body?.mode === 'branded' ? 'branded' : 'clean';
  const industry = req.body?.industry;
  if (typeof industry !== 'string' || !industry.trim()) {
    return res.status(400).json({ error: 'industry required' });
  }
  let logo = null;
  if (mode === 'branded') {
    logo = parseDataUrl(req.body?.logo);
    if (!logo) return res.status(400).json({ error: 'logo required for branded mode' });
  }

  // 3. Rate limit (before spend).
  const allowed = await underRateLimit(serviceKey, userId, 'hero', HERO_RATE_LIMIT, HERO_RATE_WINDOW_MIN);
  if (!allowed) return res.status(429).json({ error: `Too many hero images — max ${HERO_RATE_LIMIT} per ${HERO_RATE_WINDOW_MIN} minutes.` });

  // 4. Deduct 1 credit up front.
  const deductRes = await fetch(SUPABASE_URL + '/rest/v1/rpc/deduct_credits', {
    method: 'POST', headers: svcHeaders(serviceKey),
    body: JSON.stringify({ p_user_id: userId, p_amount: HERO_COST, p_reason: 'hero_image' }),
  });
  if (!deductRes.ok) {
    const detail = await deductRes.text();
    if (detail.includes('insufficient_credits')) return res.status(402).json({ error: 'insufficient_credits' });
    console.error(`deduct_credits (hero) failed for ${userId} (HTTP ${deductRes.status}): ${detail}`);
    return res.status(500).json({ error: 'Could not reserve credit' });
  }

  let refunded = false;
  const refund = async () => {
    if (refunded) return;
    refunded = true;
    try { await addCredits(serviceKey, userId, HERO_COST); }
    catch (e) { console.error(`Hero refund failed for ${userId}:`, e); }
  };

  try {
    const input = [{ type: 'text', text: buildHeroPrompt({ mode, industry, description: req.body?.description, vibe: req.body?.vibe, colors: req.body?.colors }) }];
    if (mode === 'branded') input.push({ type: 'image', mime_type: logo.mime, data: logo.data });

    const gRes = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
      body: JSON.stringify({
        model: mode === 'branded' ? MODEL_BRANDED : MODEL_CLEAN,
        input,
        response_format: { type: 'image', mime_type: 'image/jpeg', aspect_ratio: '16:9', image_size: '2K' },
      }),
    });

    if (!gRes.ok) {
      const detail = await gRes.text().catch(() => '');
      console.error(`Gemini image failed (HTTP ${gRes.status}): ${detail.slice(0, 500)}`);
      await refund();
      return res.status(502).json({ error: 'generation_failed', message: 'Could not generate the hero image.' });
    }

    const data = await gRes.json().catch(() => null);
    const img = extractImage(data);
    if (!img?.data) {
      console.error('Gemini returned no image data');
      await refund();
      return res.status(502).json({ error: 'generation_failed', message: 'Could not generate the hero image.' });
    }

    // Upload to Supabase Storage (service key bypasses RLS). Bucket must exist and
    // be public-read. Unique per-user path so POST never collides.
    const bytes = Buffer.from(img.data, 'base64');
    const ext = img.mime.includes('png') ? 'png' : 'jpg';
    const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const upRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
      method: 'POST',
      headers: { apikey: serviceKey, Authorization: 'Bearer ' + serviceKey, 'Content-Type': img.mime, 'x-upsert': 'true' },
      body: bytes,
    });
    if (!upRes.ok) {
      const detail = await upRes.text().catch(() => '');
      console.error(`Storage upload failed (HTTP ${upRes.status}): ${detail.slice(0, 300)}`);
      await refund();
      return res.status(502).json({ error: 'storage_failed', message: 'Could not save the hero image.' });
    }

    const url = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
    return res.status(200).json({ url, mode });
  } catch (err) {
    console.error('Hero image error:', err);
    await refund();
    return res.status(500).json({ error: 'Internal server error' });
  }
}
