// api/scrape-website.js — scrapes logo, colours, meta info, contact details from a URL
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'URL required' });

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

    const getTag = (pattern) => { const m = html.match(pattern); return m ? m[1]?.trim() : null; };

    const title = getTag(/<title[^>]*>([^<]+)<\/title>/i)
      || getTag(/<meta[^>]*property="og:title"[^>]*content="([^"]+)"/i)
      || null;

    const description = getTag(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i)
      || getTag(/<meta[^>]*property="og:description"[^>]*content="([^"]+)"/i)
      || null;

    // ── PHONE ──
    const phonePatterns = [
      /<a[^>]*href="tel:([^"]+)"/i,
      /(?:tel:|phone:|call us|phone number|contact us)[^\d+\(]*([+\(]?[\d\s\-\.\(\)]{7,20}\d)/i,
      /(\+?1?[\s.-]?\(?[0-9]{3}\)?[\s.-][0-9]{3}[\s.-][0-9]{4})/,
    ];
    let phone = null;
    for (const p of phonePatterns) {
      const m = html.match(p);
      if (m) { phone = m[1].trim().replace(/^tel:/i, ''); break; }
    }

    // ── EMAIL ──
    let email = null;
    const emailPatterns = [
      /<a[^>]*href="mailto:([^"?]+)"/i,
      /(?:email|e-mail|contact)[^@\n]{0,30}([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/i,
      /([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})/,
    ];
    for (const p of emailPatterns) {
      const m = html.match(p);
      if (m) {
        const e = m[1].trim();
        if (!e.includes('example.com') && !e.includes('yourdomain') && !e.includes('sentry') && !e.includes('wix') && !e.includes('wordpress')) {
          email = e; break;
        }
      }
    }

    // ── ADDRESS ──
    let address = null;
    const schemaStreet = html.match(/"streetAddress"\s*:\s*"([^"]+)"/i);
    const schemaCity = html.match(/"addressLocality"\s*:\s*"([^"]+)"/i);
    const schemaRegion = html.match(/"addressRegion"\s*:\s*"([^"]+)"/i);
    const schemaZip = html.match(/"postalCode"\s*:\s*"([^"]+)"/i);
    if (schemaStreet) {
      address = schemaStreet[1];
      if (schemaCity) address += ', ' + schemaCity[1];
      if (schemaRegion) address += ', ' + schemaRegion[1];
      if (schemaZip) address += ' ' + schemaZip[1];
    } else {
      const addrMatch = html.match(/(\d{1,5}\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s+(?:St|Ave|Rd|Blvd|Dr|Ln|Way|Court|Ct|Place|Pl|Street|Avenue|Road|Boulevard|Drive|Lane)\.?),\s*[A-Za-z\s]+,\s*[A-Z]{2}\s*\d{5})/);
      if (addrMatch) address = addrMatch[1];
    }

    // ── BUSINESS NAME ──
    let businessName = null;
    if (title) {
      businessName = title
        .replace(/\s*[|\-–—]\s*.*/g, '')
        .replace(/\s*::\s*.*/g, '')
        .replace(/\s*»\s*.*/g, '')
        .replace(/home\s*$/i, '')
        .replace(/welcome to\s*/i, '')
        .trim();
    }

    // ── LOGO ──
    let logo = null;
    const ogImage = getTag(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i)
      || getTag(/<meta[^>]*name="og:image"[^>]*content="([^"]+)"/i);
    const logoPatterns = [
      /<img[^>]*(?:class|id|alt)="[^"]*logo[^"]*"[^>]*src="([^"]+)"/i,
      /<img[^>]*src="([^"]*logo[^"]*\.(?:png|jpg|jpeg|svg|webp))"/i,
      /<link[^>]*rel="[^"]*icon[^"]*"[^>]*href="([^"]+)"/i,
      /<img[^>]*src="([^"]*\/logo[^"]*)"/i,
    ];
    for (const pattern of logoPatterns) {
      const match = html.match(pattern);
      if (match) { logo = match[1]; break; }
    }
    if (!logo && ogImage) logo = ogImage;
    if (logo && !logo.startsWith('http')) {
      logo = logo.startsWith('/') ? baseUrl + logo : baseUrl + '/' + logo;
    }
    let logoBase64 = null;
    if (logo) {
      try {
        const logoRes = await fetch(logo, { signal: AbortSignal.timeout(5000) });
        if (logoRes.ok) {
          const contentType = logoRes.headers.get('content-type') || 'image/png';
          const buffer = await logoRes.arrayBuffer();
          if (buffer.byteLength < 500000) {
            const base64 = Buffer.from(buffer).toString('base64');
            logoBase64 = `data:${contentType};base64,${base64}`;
          }
        }
      } catch (e) {}
    }

    // ── COLOURS ──
    const hexMatches = html.match(/#[0-9a-fA-F]{6}\b/g) || [];
    const rgbMatches = [...html.matchAll(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/g)];
    const rgbToHex = (r, g, b) => '#' + [r, g, b].map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
    const allHex = [...hexMatches, ...rgbMatches.map(m => rgbToHex(m[1], m[2], m[3]))];
    const colourCount = {};
    allHex.forEach(c => {
      const hex = c.toLowerCase();
      const r = parseInt(hex.slice(1,3), 16);
      const g = parseInt(hex.slice(3,5), 16);
      const b = parseInt(hex.slice(5,7), 16);
      if (!(r > 230 && g > 230 && b > 230) && !(r < 30 && g < 30 && b < 30) && !(Math.abs(r-g) < 20 && Math.abs(g-b) < 20)) {
        colourCount[hex] = (colourCount[hex] || 0) + 1;
      }
    });
    const topColours = Object.entries(colourCount).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([hex]) => hex);
    const cssVarMatches = [...html.matchAll(/--[^:]+:\s*(#[0-9a-fA-F]{6})/g)];
    const cssVarColours = cssVarMatches.map(m => m[1].toLowerCase());
    const finalColours = [...new Set([...cssVarColours, ...topColours])].slice(0, 6);

    // ── IMAGES ──
    const imageMatches = [...html.matchAll(/<img[^>]*src="([^"]+\.(?:jpg|jpeg|png|webp)(?:\?[^"]*)?)"/gi)];
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
      businessName,
      description,
      phone,
      email,
      address,
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
