// components/NewsCard.js
import React from 'react';

export default function NewsCard({ a }) {
  return (
    <div style={{border:'1px solid #e2e8f0', borderRadius:8, padding:12, margin:8, maxWidth:900}}>
      {a.urlToImage && (
        <img src={a.urlToImage} alt={a.title} style={{width:'100%', height:220, objectFit:'cover', borderRadius:6}} />
      )}
      <div style={{paddingTop:8}}>
        <div style={{fontSize:13, color:'#475569'}}>{a.source?.name} • {new Date(a.publishedAt).toLocaleString()}</div>
        <h3 style={{margin:'8px 0'}}>{a.title}</h3>
        <p style={{color:'#334155'}}>{a.description}</p>
        <a href={a.url} target="_blank" rel="noopener noreferrer" style={{display:'inline-block', marginTop:8, color:'#0ea5a4'}}>Read original →</a>
      </div>
    </div>
  );
}
