export default async function handler(req, res) {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: 'Missing query' });

  const key = process.env.PEXELS_KEY;
  if (!key) return res.status(500).json({ error: 'Pexels key not configured' });

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=5&orientation=landscape`,
      { headers: { Authorization: key } }
    );
    const data = await response.json();
    return res.status(200).json(data);
  } catch (err) {
    console.error('Images error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
