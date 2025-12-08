// components/NewsCard.js
import React from 'react';

export default function NewsCard({ a }) {
  return (
    <div style={{
      border:'1px solid #e6e6e6',
      borderRadius:10,
      padding:12,
      margin:8,
      width: '90%',
      maxWidth: 900,
      boxShadow: '0 6px 18px rgba(15,23,42,0.04)',
      background: '#fff'
    }}>
      {a.urlToImage && (
        <img src={a.urlToImage} alt={a.title} style={{width:'100%', height:220, objectFit:'cover', borderRadius:8}} />
      )}
      <div style={{paddingTop:10}}>
        <div style={{fontSize:13, color:'#0b1220', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
          <span style={{color:'#0b1220'}}>{a.source?.name}</span>
          <span style={{color:'#6b7280', fontSize:12}}>{new Date(a.publishedAt).toLocaleString()}</span>
        </div>

        <h3 style={{margin:'8px 0', fontSize:18, color:'#0b1220'}}>{a.title}</h3>
        <p style={{color:'#0b1220', marginBottom:8}}>{a.description}</p>

        <div style={{display:'flex', gap:10, alignItems:'center'}}>
          <a href={a.url} target="_blank" rel="noopener noreferrer" style={{color:'#c71717', fontWeight:600}}>Read original →</a>
          <span style={{marginLeft:'auto', color:'#c71717', fontWeight:700}}>{a.author ? a.author.split(' ')[0] : ''}</span>
        </div>
      </div>
    </div>
  );
}
