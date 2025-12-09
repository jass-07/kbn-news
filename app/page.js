// app/page.js
'use client';

import React, { useEffect, useRef, useState } from 'react';
import { fetchTopHeadlines } from '../utils/fetchNews';
import NewsCard from '../components/NewsCard';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana',
  'Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya',
  'Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura',
  'Uttar Pradesh','Uttarakhand','West Bengal','Delhi'
];

const STATE_QUERIES = {
  'Andhra Pradesh': 'Andhra Pradesh OR Hyderabad',
  'Arunachal Pradesh': 'Arunachal Pradesh',
  'Assam': 'Assam OR Guwahati',
  'Bihar': 'Bihar OR Patna',
  'Chhattisgarh': 'Chhattisgarh OR Raipur',
  'Goa': 'Goa',
  'Gujarat': 'Gujarat OR Ahmedabad OR Surat',
  'Haryana': 'Haryana OR Gurugram OR Faridabad',
  'Himachal Pradesh': 'Himachal Pradesh',
  'Jharkhand': 'Jharkhand OR Ranchi',
  'Karnataka': 'Karnataka OR Bengaluru OR Bangalore',
  'Kerala': 'Kerala OR Thiruvananthapuram OR Kochi',
  'Madhya Pradesh': 'Madhya Pradesh OR Bhopal OR Indore',
  'Maharashtra': 'Maharashtra OR Mumbai OR Pune',
  'Manipur': 'Manipur OR Imphal',
  'Meghalaya': 'Meghalaya',
  'Mizoram': 'Mizoram',
  'Nagaland': 'Nagaland',
  'Odisha': 'Odisha OR Bhubaneswar',
  'Punjab': 'Punjab OR Chandigarh',
  'Rajasthan': 'Rajasthan OR Jaipur',
  'Sikkim': 'Sikkim',
  'Tamil Nadu': 'Tamil Nadu OR Chennai OR Madurai',
  'Telangana': 'Telangana OR Hyderabad',
  'Tripura': 'Tripura OR Agartala',
  'Uttar Pradesh': 'Uttar Pradesh OR Lucknow OR Kanpur',
  'Uttarakhand': 'Uttarakhand OR Dehradun',
  'West Bengal': 'West Bengal OR Kolkata',
  'Delhi': 'Delhi OR New Delhi'
};

export default function HomePage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [scope, setScope] = useState('national'); // 'national' | 'international' | 'state'
  const [stateFilter, setStateFilter] = useState(''); // empty => show placeholder "Select a state"
  const [category, setCategory] = useState('');
  const intervalRef = useRef(null);

  async function loadNews() {
    try {
      setLoading(true);

      // If user selected "State" scope but hasn't chosen a state, don't fetch
      if (scope === 'state' && !stateFilter) {
        setArticles([]);
        setLoading(false);
        return;
      }

      let mode = scope;
      let q = '';
      let country = '';

      if (mode === 'national') country = 'in';
      if (mode === 'state') {
        q = STATE_QUERIES[stateFilter] || stateFilter;
        country = 'in';
      }
      // international: proxy uses everything

      const data = await fetchTopHeadlines({ mode, country, q, category });
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
    intervalRef.current = setInterval(loadNews, 60 * 60 * 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { loadNews(); }, [scope, stateFilter, category]);

  // ensure when user switches to state scope, stateFilter becomes '' (so placeholder appears)
  useEffect(() => {
    if (scope === 'state') setStateFilter('');
    // we intentionally do not set a default state to force the user to choose
  }, [scope]);

  const containerStyle = {
    background: '#ffffff',
    minHeight: '100vh',
    padding: 24,
    fontFamily: 'Inter, sans-serif',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    color: '#0b1220'
  };

  const mainStyle = { width: '100%', maxWidth: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center' };
  const labelStyle = { color: '#0b1220', fontWeight: 600, marginRight: 6 };
  const selectStyle = { padding: '6px 8px', borderRadius: 6, border: '1px solid #e2e8f0', color: '#0b1220' };

  return (
    <div style={containerStyle}>
      <header style={{ width: '100%', maxWidth: 1000, textAlign: 'center', marginBottom: 20 }}>
        <h1
          className="site-title"
          style={{
            fontFamily: 'var(--font-montserrat), Montserrat, sans-serif',
          }}
        >
          KBN NEWS
        </h1>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label style={labelStyle}>Scope:</label>
            <select style={selectStyle} value={scope} onChange={e => setScope(e.target.value)}>
              <option value='national'>National (India)</option>
              <option value='international'>International</option>
              <option value='state'>State</option>
            </select>
          </div>

          {scope === 'state' && (
            <div>
              <label style={labelStyle}>State:</label>
              <select style={selectStyle} value={stateFilter} onChange={e => setStateFilter(e.target.value)}>
                <option value='' disabled>Select a state</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          )}

          <div>
            <label style={labelStyle}>Category:</label>
            <select style={selectStyle} value={category} onChange={e => setCategory(e.target.value)}>
              <option value=''>All</option>
              <option value='business'>Business</option>
              <option value='entertainment'>Entertainment</option>
              <option value='health'>Health</option>
              <option value='science'>Science</option>
              <option value='sports'>Sports</option>
              <option value='technology'>Technology</option>
            </select>
          </div>

          <button onClick={loadNews} style={{
            background: '#c71717', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6, cursor: 'pointer'
          }}>Refresh</button>
        </div>
      </header>

      <main style={mainStyle}>
        {scope === 'state' && !stateFilter && (
          <div style={{ padding: 14, color: '#334155' }}>Please select a state to view state-specific news.</div>
        )}

        {loading && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
            <div style={{ width: '90%', height: 220, background: '#f8fafb', borderRadius: 8 }} />
            <div style={{ width: '90%', height: 220, background: '#f8fafb', borderRadius: 8 }} />
            <div style={{ width: '90%', height: 220, background: '#f8fafb', borderRadius: 8 }} />
          </div>
        )}

        {!loading && articles.length === 0 && (
          <div style={{ padding: 20, color: '#334155' }}>
            No headlines found for selected scope/state/category. Try another selection or click Refresh.
          </div>
        )}

        {!loading && articles.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', alignItems: 'center' }}>
            {articles.map((a, idx) => <NewsCard key={a.url || idx} a={a} />)}
          </div>
        )}
      </main>
    </div>
  );
}
