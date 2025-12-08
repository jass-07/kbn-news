// pages/api/proxyNews.js  (temporary test to force results)
import axios from 'axios';

export default async function handler(req, res) {
  const { q } = req.query;
  const key = process.env.NEWS_KEY;
  if (!key) return res.status(500).json({ error: 'server missing key' });

  try {
    // use `everything` to ensure we get results for testing
    const r = await axios.get('https://newsapi.org/v2/everything', {
      params: { apiKey: key, q: q || 'india', pageSize: 20, sortBy: 'publishedAt', language: 'en' }
    });
    res.status(200).json(r.data);
  } catch (err) {
    console.error('proxyNews error:', err?.response?.data || err?.message || err);
    res.status(500).json({ error: 'fetch failed', detail: err?.response?.data || err?.message });
  }
}
