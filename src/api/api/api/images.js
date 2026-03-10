// api/images.js — secure server-side proxy for Pexels API
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const apiKey = process.env.PEXELS_KEY;
  if (!apiKey) return res.status(500).json({ error: 'Server configuration error' });

  const { query, per_page = 5, orientation = 'landscape' } = req.query;
  if (!query) return res.status(400).json({ error: 'Query required' });

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=${per_page}&orientation=${orientation}`,
      { headers: { Authorization: apiKey } }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Pexels API error' });
    }

    return res.status(200).json(data);

  } catch (err) {
    console.error('Images error:', err);
    return res.status(500).json({ error: 'Failed to fetch images' });
  }
}
