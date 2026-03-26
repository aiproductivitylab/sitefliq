export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { html, name } = req.body;
  if (!html || !name) return res.status(400).json({ error: 'Missing html or name' });

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
