// pages/api/proxyNews.js
import axios from 'axios';
import { Redis } from '@upstash/redis';

// Initialize Redis client from environment variables
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

/** Create a unique key for caching */
function makeCacheKey({ mode, country, q, category }) {
  return `news:${mode || 'national'}|${country || ''}|${(q || '').trim()}|${category || ''}`;
}

// Default TTLs for each mode
const TTL = {
  international: 60 * 15, // 15m
  national: 60 * 10,      // 10m
  state: 60 * 15,         // 15m
  default: 60 * 10
};

export default async function handler(req, res) {
  const { q = '', country = '', category = '', mode = 'national' } = req.query;
  const key = process.env.NEWS_KEY;

  if (!key) return res.status(500).json({ error: 'server missing key' });

  const cacheKey = makeCacheKey({ mode, country, q, category });
  const ttl = TTL[mode] ?? TTL.default;

  // -----------------------------
  // 1️⃣ Try to read from Upstash
  // -----------------------------
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      res.setHeader(
        'Cache-Control',
        `public, max-age=${ttl}, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`
      );
      return res.status(200).json(cached);
    }
  } catch (err) {
    console.warn("Upstash read error (continuing without cache):", err);
  }

  // -----------------------------
  // Helper functions for NewsAPI
  // -----------------------------
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

  // -----------------------------
  // 2️⃣ Build the response
  // -----------------------------
  try {
    let data = null;

    // INTERNATIONAL
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
          const dataWithQ = await callTopHeadlines({
            country: country || 'in',
            category,
            q
          });
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
          const dataWithQ = await callTopHeadlines({
            country: 'in',
            category,
            q
          });
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

    // FALLBACK
    else {
      data = await callTopHeadlines({ country: 'in', q, category });
      if ((data.totalResults || 0) === 0)
        data = await callEverything({ q: q || category || 'india' });
    }

    // -------------------------------------------
    // 3️⃣ Save to Upstash with TTL and return it
    // -------------------------------------------
    if (data) {
      try {
        await redis.set(cacheKey, data, { ex: ttl }); // TTL in seconds
      } catch (err) {
        console.warn("Upstash write error (continuing without cache):", err);
      }

      res.setHeader(
        'Cache-Control',
        `public, max-age=${ttl}, s-maxage=${ttl}, stale-while-revalidate=${ttl * 2}`
      );
      return res.status(200).json(data);
    }

    return res.status(200).json({ status: "ok", totalResults: 0, articles: [] });

  } catch (err) {
    const detail = err?.response?.data || err?.message;

    // NewsAPI rate limit → serve cache if possible
    if (detail?.code === 'rateLimited') {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return res.status(200).json(cached);
      }
      return res.status(429).json({
        error: 'rate_limited',
        message: 'News provider rate limit reached.',
        detail
      });
    }

    console.error("proxyNews error:", detail);
    return res.status(500).json({ error: 'fetch failed', detail });
  }
}
