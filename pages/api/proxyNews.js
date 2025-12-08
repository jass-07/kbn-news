// pages/api/proxyNews.js
import axios from 'axios';

export default async function handler(req, res) {
  const { q = '', country = '', category = '', mode = 'national' } = req.query;
  const key = process.env.NEWS_KEY;
  if (!key) return res.status(500).json({ error: 'server missing key' });

  try {
    const callTopHeadlines = async (params) => {
      const r = await axios.get('https://newsapi.org/v2/top-headlines', { params: { apiKey: key, pageSize: 50, ...params }});
      return r.data;
    };

    const callEverything = async (params) => {
      const safeQ = (params.q && String(params.q).trim()) ? params.q : 'news';
      const p = { apiKey: key, pageSize: 50, q: safeQ, language: 'en', sortBy: 'publishedAt', ...params };
      const r = await axios.get('https://newsapi.org/v2/everything', { params: p });
      return r.data;
    };

    if (mode === 'international') {
      const data = await callEverything({});
      return res.status(200).json(data);
    }

    if (mode === 'national') {
      const params = { country: country || 'in' };
      if (category) params.category = category;
      if (q) params.q = q;
      const data = await callTopHeadlines(params);
      if ((data.totalResults || 0) === 0) {
        const fallback = await callEverything({ q: q || 'india' });
        return res.status(200).json(fallback);
      }
      return res.status(200).json(data);
    }

    // state mode
    if (mode === 'state') {
      const params = { country: 'in' };
      if (category) params.category = category;
      if (q) params.q = q;
      const data = await callTopHeadlines(params);
      if ((data.totalResults || 0) === 0) {
        const fallback = await callEverything({ q: q || 'india' });
        return res.status(200).json(fallback);
      }
      return res.status(200).json(data);
    }

    // default
    const data = await callTopHeadlines({ country: 'in', q, category });
    if ((data.totalResults || 0) === 0) {
      const fallback = await callEverything({ q: q || 'india' });
      return res.status(200).json(fallback);
    }
    return res.status(200).json(data);

  } catch (err) {
    console.error('proxyNews error:', err?.response?.data || err?.message || err);
    return res.status(500).json({ error: 'fetch failed', detail: err?.response?.data || err?.message });
  }
}
