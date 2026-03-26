export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { html, name } = req.body;
  if (!html || !name) return res.status(400).json({ error: 'Missing html or name' });

  const token = process.env.VERCEL_DEPLOY_TOKEN;
  if (!token) return res.status(500).json({ error: 'Deploy token not configured' });

  const slug = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').substring(0, 40);
  const projectName = `sf-${slug}-${Date.now().toString(36)}`;

  try {
    // First create the project with protection disabled
    const projectRes = await fetch('https://api.vercel.com/v10/projects', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName,
        framework: null,
        ssoProtection: null,
        passwordProtection: null,
      }),
    });

    const project = await projectRes.json();
    const projectId = project.id;

    // Disable deployment protection on the project
    if (projectId) {
      await fetch(`https://api.vercel.com/v9/projects/${projectId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ssoProtection: null,
          passwordProtection: null,
        }),
      });
    }

    // Deploy to the project
    const deployRes = await fetch('https://api.vercel.com/v13/deployments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: projectName,
        files: [{ file: 'index.html', data: html, encoding: 'utf-8' }],
        projectSettings: { framework: null },
        target: 'production',
        public: true,
      }),
    });

    const data = await deployRes.json();

    if (!deployRes.ok) {
      return res.status(500).json({ error: data.error?.message || 'Deploy failed' });
    }

    const url = data.url ? `https://${data.url}` : null;
    return res.status(200).json({ url, ready: false, id: data.id });

  } catch (err) {
    console.error('Publish error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
