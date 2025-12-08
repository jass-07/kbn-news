// utils/fetchNews.js
import axios from 'axios';

export async function fetchTopHeadlines({ mode = 'national', country = 'in', q = '', category = '' } = {}) {
  const res = await axios.get('/api/proxyNews', { params: { mode, country, q, category }});
  return res.data.articles || [];
}
