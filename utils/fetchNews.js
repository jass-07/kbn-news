// utils/fetchNews.js
import axios from 'axios';

export async function fetchTopHeadlines({country='in', q='', pageSize=50} = {}) {
  const res = await axios.get('/api/proxyNews', { params: { country, q }});
  return res.data.articles || [];
}
