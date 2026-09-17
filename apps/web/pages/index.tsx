import { useEffect, useState } from 'react';
export default function Home() {
  const [events, setEvents] = useState<any[]>([]);
  useEffect(() => { fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/events`, { credentials: 'include' }).then(r => r.json()).then(setEvents).catch(() => setEvents([])); }, []);
  return <main style={{maxWidth:900,margin:'40px auto',fontFamily:'system-ui',padding:20}}><h1>Project Casino App</h1><p>Production-oriented sandbox. Mock odds and payments only.</p><h2>Open events</h2>{events.length ? events.map(e => <article key={e.id} style={{padding:16,border:'1px solid #ddd',marginBottom:12}}><strong>{e.home} vs {e.away}</strong><div>{new Date(e.startsAt).toLocaleString()}</div>{e.markets?.map((m:any) => <div key={m.id}><b>{m.name}</b>: {m.selections.map((s:any) => <span key={s.id} style={{marginLeft:10}}>{s.name} ({s.odds})</span>)}</div>)}</article>) : <p>No seeded events yet. Run the database seed when added.</p>}</main>;
}
