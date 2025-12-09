// pages/api/proxyNews.js
import axios from 'axios';

/**
 * Simple in-memory cache for development / small production usage.
 * key -> { data, expiry }
 */
const cache = new Map();

function makeCacheKey({ mode, country, q, category }) {
  return `${mode || 'national'}|${country || ''}|${(q || '').trim()}|${category || ''}`;
}

function getCached(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCached(key, data, ttlMs) {
  cache.set(key, { data, expiry: Date.now() + ttlMs });
}

// default TTLs (tweak if you like)
const TTL = {
  international: 1000 * 60 * 15, // 15 minutes
  national: 1000 * 60 * 10,      // 10 minutes
  state: 1000 * 60 * 15,         // 15 minutes
  default: 1000 * 60 * 10
};

export default async function handler(req, res) {
  const { q = '', country = '', category = '', mode = 'national' } = req.query;
  const key = process.env.NEWS_KEY;
  if (!key) return res.status(500).json({ error: 'server missing key' });

  const cacheKey = makeCacheKey({ mode, country, q, category });
  const ttl = TTL[mode] ?? TTL.default;

  // If cached and fresh — return immediately (and set cache-control header)
  const cached = getCached(cacheKey);
  if (cached) {
    res.setHeader('Cache-Control', `public, max-age=${Math.floor(ttl/1000)}, s-maxage=${Math.floor(ttl/1000)}, stale-while-revalidate=${Math.floor(ttl/1000*2)}`);
    return res.status(200).json(cached);
  }

  // helpers
  const callTopHeadlines = async (params) => {
    const r = await axios.get('https://newsapi.org/v2/top-headlines', {
      params: { apiKey: key, pageSize: 50, ...params },
    });
    return r.data;
  };

  const callEverything = async (params) => {
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

  try {
    let data = null;

    // INTERNATIONAL (use everything) — include category in q for filtering
    if (mode === 'international') {
      const intlQ = category ? `${category}` : (q || 'world news');
      data = await callEverything({ q: intlQ });
    }

    // NATIONAL
    else if (mode === 'national') {
      if (category) {
        const paramsCatOnly = { country: country || 'in', category };
        const dataCatOnly = await callTopHeadlines(paramsCatOnly);
        if ((dataCatOnly.totalResults || 0) > 0) data = dataCatOnly;
        else if (q) {
          const paramsWithQ = { country: country || 'in', category, q };
          const dataWithQ = await callTopHeadlines(paramsWithQ);
          if ((dataWithQ.totalResults || 0) > 0) data = dataWithQ;
        }
        if (!data) {
          const fallbackQ = q ? `${q} ${category}` : category;
          data = await callEverything({ q: fallbackQ });
        }
      } else {
        const params = { country: country || 'in' };
        if (q) params.q = q;
        const r = await callTopHeadlines(params);
        if ((r.totalResults || 0) > 0) data = r;
        else data = await callEverything({ q: q || 'india' });
      }
    }

    // STATE
    else if (mode === 'state') {
      if (category) {
        const paramsCatOnly = { country: 'in', category };
        const dataCatOnly = await callTopHeadlines(paramsCatOnly);
        if ((dataCatOnly.totalResults || 0) > 0) data = dataCatOnly;
        else if (q) {
          const paramsWithQ = { country: 'in', category, q };
          const dataWithQ = await callTopHeadlines(paramsWithQ);
          if ((dataWithQ.totalResults || 0) > 0) data = dataWithQ;
        }
        if (!data) {
          const fallbackQ = q ? `${q} ${category}` : category;
          data = await callEverything({ q: fallbackQ });
        }
      } else if (q) {
        const r = await callTopHeadlines({ country: 'in', q });
        if ((r.totalResults || 0) > 0) data = r;
        else data = await callEverything({ q });
      } else {
        data = await callTopHeadlines({ country: 'in' });
        if ((data.totalResults || 0) === 0) data = await callEverything({ q: 'india' });
      }
    }

    // default fallback
    else {
      data = await callTopHeadlines({ country: 'in', q, category });
      if ((data.totalResults || 0) === 0) data = await callEverything({ q: q || (category ? category : 'india') });
    }

    // store in cache
    if (data) {
      setCached(cacheKey, data, ttl);
      res.setHeader('Cache-Control', `public, max-age=${Math.floor(ttl/1000)}, s-maxage=${Math.floor(ttl/1000)}, stale-while-revalidate=${Math.floor(ttl/1000*2)}`);
      return res.status(200).json(data);
    }

    // fallback: shouldn't normally reach here
    return res.status(200).json({ status: 'ok', totalResults: 0, articles: [] });
  } catch (err) {
    // detect NewsAPI rate limit
    const detail = err?.response?.data || err?.message || String(err);
    if (detail && detail.code === 'rateLimited') {
      // try to return cached data if we have it
      const cachedAfterErr = getCached(cacheKey);
      if (cachedAfterErr) {
        res.setHeader('Cache-Control', `public, max-age=${Math.floor(ttl/1000)}, s-maxage=${Math.floor(ttl/1000)}, stale-while-revalidate=${Math.floor(ttl/1000*2)}`);
        return res.status(200).json(cachedAfterErr);
      }
      // no cache — return 429 with friendly message
      return res.status(429).json({
        error: 'rate_limited',
        message: 'News provider rate limit reached. Try again later or upgrade your NewsAPI plan.',
        detail
      });
    }

    console.error('proxyNews error:', detail);
    return res.status(500).json({ error: 'fetch failed', detail });
  }
}
