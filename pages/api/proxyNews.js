// pages/api/proxyNews.js
import axios from 'axios';

export default async function handler(req, res) {
  const { q = '', country = '', category = '', mode = 'national' } = req.query;
  const key = process.env.NEWS_KEY;
  if (!key) return res.status(500).json({ error: 'server missing key' });

  try {
    const callTopHeadlines = async (params) => {
      const r = await axios.get('https://newsapi.org/v2/top-headlines', {
        params: { apiKey: key, pageSize: 50, ...params },
      });
      return r.data;
    };

    const callEverything = async (params) => {
      // everything doesn't take a category param, so merge category into the q if present
      const safeQ = (params.q && String(params.q).trim()) ? params.q : 'news';
      const p = {
        apiKey: key,
        pageSize: 50,
        q: safeQ,
        language: 'en',
        sortBy: 'publishedAt',
      };
      const r = await axios.get('https://newsapi.org/v2/everything', { params: p });
      return r.data;
    };

    // International mode: use everything (global news)
    if (mode === 'international') {
      const data = await callEverything({});
      return res.status(200).json(data);
    }

    // National: prefer top-headlines(country=in), with category if provided; fallback to everything
    if (mode === 'national') {
      const params = { country: country || 'in' };
      if (category) params.category = category;
      if (q) params.q = q;

      const data = await callTopHeadlines(params);
      if ((data.totalResults || 0) === 0) {
        // fallback to everything: include category keyword in q if category present
        const fallbackQ = q || (category ? category : 'india');
        const fallback = await callEverything({ q: fallbackQ });
        return res.status(200).json(fallback);
      }
      return res.status(200).json(data);
    }

    // State mode: prioritize accurate state + category handling
    if (mode === 'state') {
      // Build params for top-headlines. If category specified, include it (top-headlines supports country+category).
      // If we have a q (stateQuery), include it too; but some combinations may return sparse results,
      // so we fallback to everything with state+category merged into q.
      const params = { country: 'in' };
      if (category) params.category = category;
      if (q) params.q = q;

      const data = await callTopHeadlines(params);
      if ((data.totalResults || 0) === 0) {
        // fallback: craft a q merging state phrase and category keyword (everything ignores category param)
        let fallbackQ = q || 'india';
        if (category) fallbackQ = `${fallbackQ} ${category}`;
        const fallback = await callEverything({ q: fallbackQ });
        return res.status(200).json(fallback);
      }
      return res.status(200).json(data);
    }

    // default: try top-headlines then fallback
    const data = await callTopHeadlines({ country: 'in', q, category });
    if ((data.totalResults || 0) === 0) {
      const fallbackQ = q || (category ? category : 'india');
      const fallback = await callEverything({ q: fallbackQ });
      return res.status(200).json(fallback);
    }
    return res.status(200).json(data);
  } catch (err) {
    console.error('proxyNews error:', err?.response?.data || err?.message || err);
    return res.status(500).json({ error: 'fetch failed', detail: err?.response?.data || err?.message });
  }
}
