export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { html, name } = req.body;
  if (!html || !name) return res.status(400).json({ error: 'Missing html or name' });

  const token = process.env.VERCEL_DEPLOY_TOKEN;
  if (!token) return res.status(500).json({ error: 'Deploy token not configured' });

  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 40);
  const projectName = `sf-${slug}-${Date.now().toString(36)}`;

  try {
    const deployRes = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName,
        files: [{ file: 'index.html', data: html, encoding: 'utf8' }],
        projectSettings: { framework: null },
        target: 'production',
      }),
    });

    const data = await deployRes.json();

    if (!deployRes.ok) {
      console.error('Vercel deploy error:', data);
      return res.status(500).json({ error: data.error?.message || 'Deploy failed' });
    }

    const deployId = data.id;
    let url = data.url;
    let ready = data.readyState === 'READY';
    let attempts = 0;

    while (!ready && attempts < 15) {
      await new Promise(r => setTimeout(r, 2000));
      const check = await fetch(`https://api.vercel.com/v13/deployments/${deployId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const checkData = await check.json();
      ready = checkData.readyState === 'READY';
      url = checkData.url || url;
      attempts++;
    }

    return res.status(200).json({ url: `https://${url}`, ready });

  } catch (err) {
    console.error('Publish error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
