// pages/index.js
import React, { useEffect, useState, useRef } from 'react';
import { fetchTopHeadlines } from '../utils/fetchNews';
import NewsCard from '../components/NewsCard';

const INDIAN_STATES = ['All India','Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi'];

export default function Home() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stateFilter, setStateFilter] = useState('All India');
  const intervalRef = useRef(null);

  async function loadNews() {
    try {
      setLoading(true);
      const data = await fetchTopHeadlines({ country: 'in', pageSize: 50 });
      setArticles(data);
    } catch (err) {
      console.error('Fetch error', err);
      setArticles([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNews();
    intervalRef.current = setInterval(loadNews, 60 * 60 * 1000); // 1 hour
    return () => clearInterval(intervalRef.current);
  }, []);

  const filtered = articles.filter(a => {
    if (stateFilter === 'All India') return true;
    const text = (a.title || '') + ' ' + (a.description || '') + ' ' + (a.source?.name || '');
    return text.toLowerCase().includes(stateFilter.toLowerCase());
  });

  return (
    <div style={{padding:20, fontFamily:'Inter, sans-serif'}}>
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20}}>
        <h1 style={{margin:0}}>KBN News</h1>
        <div>
          <label style={{marginRight:8}}>State:</label>
          <select value={stateFilter} onChange={e => setStateFilter(e.target.value)}>
            {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button onClick={loadNews} style={{marginLeft:10}}>Refresh</button>
        </div>
      </header>

      <main>
        {loading && <div>Loading headlines...</div>}
        {!loading && filtered.length === 0 && <div>No headlines found for selected state.</div>}
        {filtered.map((a, idx) => <NewsCard key={a.url || idx} a={a} />)}
      </main>

      <footer style={{marginTop:24, color:'#475569'}}>
        <small>Source: NewsAPI.org • Each card links to original article.</small>
      </footer>
    </div>
  );
}
