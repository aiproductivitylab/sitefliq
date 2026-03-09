// api/scrape-website.js — scrapes logo, colours, meta info from a URL
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'URL required' });

  // Normalise URL
  let target = url.trim();
  if (!target.startsWith('http')) target = 'https://' + target;

  try {
    const response = await fetch(target, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Sitefliq/1.0; +https://sitefliq.com)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      signal: AbortSignal.timeout(8000),
      redirect: 'follow',
    });

    if (!response.ok) {
      return res.status(200).json({ success: false, error: `Site returned ${response.status}` });
    }

    const html = await response.text();
    const baseUrl = new URL(target).origin;

    // ── EXTRACT META INFO ──
    const getTag = (pattern) => { const m = html.match(pattern); return m ? m[1]?.trim() : null; };

    const title = getTag(/<title[^>]*>([^<]+)<\/title>/i)
      || getTag(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i)
      || null;

    const description = getTag(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i)
      || getTag(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i)
      || null;

    // ── EXTRACT LOGO ──
    let logo = null;

    // Try og:image first
    const ogImage = getTag(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i)
      || getTag(/<meta[^>]*name="og:image"[^>]*content="([^"]+)"/i);

    // Try common logo patterns
    const logoPatterns = [
      /<img[^>]*(?:class|id|alt)="[^"]*logo[^"]*"[^>]*src="([^"]+)"/i,
      /<img[^>]*src="([^"]*logo[^"]*\.(?:png|jpg|jpeg|svg|webp))"/i,
      /<link[^>]*rel="[^"]*icon[^"]*"[^>]*href="([^"]+)"/i,
      /<img[^>]*src="([^"]*\/logo[^"]*)"[^>]*/i,
    ];

    for (const pattern of logoPatterns) {
      const match = html.match(pattern);
      if (match) { logo = match[1]; break; }
    }

    // Fallback to og:image
    if (!logo && ogImage) logo = ogImage;

    // Resolve relative URLs
    if (logo && !logo.startsWith('http')) {
      logo = logo.startsWith('/') ? baseUrl + logo : baseUrl + '/' + logo;
    }

    // Try to fetch logo as base64 (if found)
    let logoBase64 = null;
    if (logo) {
      try {
        const logoRes = await fetch(logo, { signal: AbortSignal.timeout(5000) });
        if (logoRes.ok) {
          const contentType = logoRes.headers.get('content-type') || 'image/png';
          // Only process reasonable sizes
          const buffer = await logoRes.arrayBuffer();
          if (buffer.byteLength < 500000) { // under 500KB
            const base64 = Buffer.from(buffer).toString('base64');
            logoBase64 = `data:${contentType};base64,${base64}`;
          }
        }
      } catch (e) {
        // Logo fetch failed, that's ok
      }
    }

    // ── EXTRACT COLOURS ──
    const colours = [];

    // Extract hex colours from inline styles and CSS
    const hexMatches = html.match(/#[0-9a-fA-F]{6}\b/g) || [];
    const rgbMatches = [...html.matchAll(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/g)];

    // Convert RGB to hex
    const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => parseInt(x).toString(16).padStart(2, '0')).join('');

    const allHex = [
      ...hexMatches,
      ...rgbMatches.map(m => rgbToHex(m[1], m[2], m[3]))
    ];

    // Count frequency and filter out near-white and near-black
    const colourCount = {};
    allHex.forEach(c => {
      const hex = c.toLowerCase();
      // Skip near-white, near-black, greys
      const r = parseInt(hex.slice(1,3), 16);
      const g = parseInt(hex.slice(3,5), 16);
      const b = parseInt(hex.slice(5,7), 16);
      const isNearWhite = r > 230 && g > 230 && b > 230;
      const isNearBlack = r < 30 && g < 30 && b < 30;
      const isGrey = Math.abs(r-g) < 20 && Math.abs(g-b) < 20 && Math.abs(r-b) < 20;
      if (!isNearWhite && !isNearBlack && !isGrey) {
        colourCount[hex] = (colourCount[hex] || 0) + 1;
      }
    });

    // Get top 5 most frequent colours
    const topColours = Object.entries(colourCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([hex]) => hex);

    // Also extract CSS custom properties (brand colours often defined here)
    const cssVarMatches = [...html.matchAll(/--[^:]+:\s*(#[0-9a-fA-F]{6})/g)];
    const cssVarColours = cssVarMatches.map(m => m[1].toLowerCase());

    // Combine, deduplicate, prioritise CSS vars
    const finalColours = [...new Set([...cssVarColours, ...topColours])].slice(0, 6);

    // ── EXTRACT IMAGES ──
    const imageMatches = [...html.matchAll(/<img[^>]*src="([^"]+\.(?:jpg|jpeg|png|webp)(?:\?[^"]*)?)"[^>]*/gi)];
    const images = imageMatches
      .map(m => {
        let src = m[1];
        if (!src.startsWith('http')) src = src.startsWith('/') ? baseUrl + src : baseUrl + '/' + src;
        return src;
      })
      .filter(src => !src.includes('icon') && !src.includes('logo') && !src.includes('avatar'))
      .slice(0, 6);

    return res.status(200).json({
      success: true,
      title,
      description,
      logo: logoBase64 || logo,
      logoUrl: logo,
      colours: finalColours,
      images,
      baseUrl,
    });

  } catch (err) {
    console.error('Scrape error:', err);
    return res.status(200).json({
      success: false,
      error: err.message?.includes('timeout') ? 'Site took too long to respond' : 'Could not reach that website'
    });
  }
}
