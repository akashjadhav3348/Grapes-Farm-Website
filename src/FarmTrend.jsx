import { useEffect, useState } from 'react';

const key = 'aishwary-farm-monthly-v1';
function read() {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    return Array.isArray(data) ? data.filter(d => /^\d{4}-\d{2}$/.test(d?.month) && [d.farms,d.crops].every(n => Number.isInteger(n) && n >= 0)) : [];
  } catch { return []; }
}
export default function FarmTrend({farms,crops}) {
  const [history,setHistory] = useState(read);
  const now = new Date();
  const month = [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0')].join('-');
  useEffect(() => {
    const next = [...read().filter(d => d.month !== month),{month,farms,crops}].sort((a,b)=>a.month.localeCompare(b.month)).slice(-12);
    setHistory(next);
    try { localStorage.setItem(key,JSON.stringify(next)); } catch { /* Current observation remains visible. */ }
  },[month,farms,crops]);
  const max = Math.max(1,...history.flatMap(d => [d.crops,d.farms]));
  const x = i => history.length === 1 ? 210 : 35 + 350*i/Math.max(1,history.length-1);
  const y = n => 126 - 100*n/max;
  return <section className="overview-card"><h2>Farm &amp; Crop Overview</h2><p>Monthly counts observed in this browser</p>
    <svg viewBox="0 0 420 150" width="100%" role="img" aria-label={history.map(d=>d.month+': '+d.crops+' crops, '+d.farms+' farms').join('; ')}>
      {[0,.5,1].map(t=><line key={t} x1="24" x2="396" y1={y(t*max)} y2={y(t*max)} stroke="#dce5df"/>)}
      {[['crops','#07883e'],['farms','#d28a13']].map(([field,color])=><g key={field}><polyline fill="none" stroke={color} strokeWidth="3" points={history.map((d,i)=>x(i)+','+y(d[field])).join(' ')}/>{history.map((d,i)=><circle key={d.month} cx={x(i)} cy={y(d[field])} r="5" fill={color}><title>{d.month} · {field}: {d[field]}</title></circle>)}</g>)}
      {history.filter((_,i)=>i===0 || i===history.length-1).map(d=><text key={d.month} x={x(history.indexOf(d))} y="147" textAnchor="middle" fill="currentColor" fontSize="12">{d.month}</text>)}
    </svg><p><strong style={{color:'#07883e'}}>● Crops {crops}</strong>　<strong style={{color:'#99640e'}}>● Farms {farms}</strong></p>
  </section>;
}
