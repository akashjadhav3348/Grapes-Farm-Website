import { useEffect, useId, useState } from 'react';
import './family-analytics.css';

const palette = ['#6176fa', '#aa69ec', '#28bba0', '#f4ac50'];
const dateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
function Count({ value }) {
  const [count, setCount] = useState(value);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setCount(value); return; }
    let frame;
    const start = performance.now();
    const tick = (now) => { const progress = Math.min(1, (now - start) / 850); setCount(Math.round(value * (1 - (1 - progress) ** 3))); if (progress < 1) frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <strong aria-label={String(value)}>{count}</strong>;
}
function Avatar({ member }) {
  return <span className="fa-avatar">{member.photo ? <img src={member.photo} alt="" /> : member.name.trim().slice(0, 1)}</span>;
}

export default function FamilyAnalytics({ members, generations, navigate, tasks = [], mode = 'full' }) {
  const gradient = useId().replaceAll(':', '');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState('name');
  const [page, setPage] = useState(0);
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(() => dateKey(new Date()));
  const today = dateKey(new Date());
  const male = members.filter(m => m.gender === 'male').length;
  const female = members.filter(m => m.gender === 'female').length;
  const unknown = members.length - male - female;
  const generation = (member) => generations.findIndex(row => row.some(m => m.id === member.id)) + 1;
  const rows = members.filter(m => `${m.name} ${m.profession || ''} ${m.id}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).sort((a, b) => sort === 'generation' ? generation(a) - generation(b) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name));
  const pages = Math.max(1, Math.ceil(rows.length / 5));
  const safePage = Math.min(page, pages - 1);
  const eventsFor = (key) => [
    ...members.filter(m => m.birthDate && m.birthDate.slice(5) === key.slice(5)).map(m => ({ id: m.id, title: `${m.name} · Birthday`, member: m })),
    ...tasks.filter(t => t.date === key).map(t => ({ id: t.id, title: t.title, done: t.done })),
  ];
  const events = eventsFor(selected);
  const days = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const max = Math.max(1, ...generations.map(row => row.length));
  const points = generations.map((row, i) => [45 + i * 510 / Math.max(1, generations.length - 1), 175 - row.length / max * 135]);
  let curve = points.length ? `M ${points[0].join(' ')}` : '';
  points.slice(1).forEach(([x, y], i) => { const [px, py] = points[i]; const mid = (px + x) / 2; curve += ` C ${mid} ${py}, ${mid} ${y}, ${x} ${y}`; });
  const shiftMonth = (offset) => { const next = new Date(month.getFullYear(), month.getMonth() + offset, 1); setMonth(next); setSelected(dateKey(next)); };
  return <section className="fa-overview" aria-label={mode === 'directory' ? 'Family member directory' : 'Family analytics overview'}>
    {mode === 'full' && <>
      <div className="fa-welcome">
      <div><span className="fa-eyebrow">CONNECTED BY ROOTS. GROWING TOGETHER.</span><h2>Every generation, one family.</h2><p>A little closer to your people, your stories and your farm.</p><button type="button" onClick={() => navigate('family-tree')}>Explore family tree <i className="bi bi-arrow-up-right" /></button></div>
      <div className="fa-welcome-people"><div className="fa-avatar-stack">{members.slice(0, 5).map(member => <Avatar key={member.id} member={member} />)}</div><strong>{members.length} members · {generations.length} generations</strong><span>Aishwary Farms · Kumbhari</span></div>
      <svg className="fa-waves" viewBox="0 0 1000 130" preserveAspectRatio="none" aria-hidden="true"><path d="M0 80 Q250 0 500 80 T1000 80 V130 H0Z" /><path d="M0 100 Q250 30 500 100 T1000 100 V130 H0Z" /></svg>
      </div>
      <div className="fa-stats">{[[members.length, 'Family members', 'people', 'blue'], [generations.length, 'Generations', 'layers', 'purple'], [male, 'Male members', 'gender-male', 'teal'], [female, 'Female members', 'gender-female', 'orange']].map(([value, label, icon, color], i) => <article className={`fa-stat ${color}`} key={label} style={{ animationDelay: `${i * 65}ms` }}><div><span>{label}</span><Count value={value} /><small>From your family records</small></div><i className={`bi bi-${icon}`} aria-hidden="true" /><svg viewBox="0 0 200 45" preserveAspectRatio="none" aria-hidden="true"><path d="M0 35 Q35 0 70 25 T140 20 T200 10 V45 H0Z" /></svg></article>)}</div>
    </>}
    {mode !== 'directory' && <div className="fa-charts">
      <article className="fa-panel fa-growth"><div className="fa-panel-title"><div><span className="fa-eyebrow">THE FAMILY STORY</span><h3>Generations at a glance</h3></div><span className="fa-pill">{members.length} people</span></div><p>Members in each generation</p>
        {points.length ? <svg className="fa-area-chart" viewBox="0 0 600 225" role="img" aria-label={`Members by generation: ${generations.map((r, i) => `Generation ${i + 1}: ${r.length}`).join(', ')}`}><defs><linearGradient id={gradient} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7584ff" stopOpacity=".45" /><stop offset="100%" stopColor="#7584ff" stopOpacity=".02" /></linearGradient></defs>{[40, 85, 130, 175].map(y => <line key={y} x1="35" x2="570" y1={y} y2={y} stroke="currentColor" strokeOpacity=".12" strokeDasharray="4 6" />)}<path d={`${curve} L ${points.at(-1)[0]} 185 L45 185 Z`} fill={`url(#${gradient})`} /><path className="fa-curve" d={curve} fill="none" stroke="#7880fa" strokeWidth="4" />{points.map(([x, y], i) => <g key={i}><circle cx={x} cy={y} r="6" fill="#7880fa" stroke="white" strokeWidth="3" /><text x={x} y={y - 15} textAnchor="middle">{generations[i].length}</text><text x={x} y="215" textAnchor="middle">Gen {i + 1}</text></g>)}</svg> : <p>No members yet. Add your first member to begin.</p>}
        <button className="fa-text-link" onClick={() => navigate('family-tree')}>Discover your family connections →</button>
      </article>
      <article className="fa-panel"><div className="fa-panel-title"><div><span className="fa-eyebrow">OUR PEOPLE</span><h3>Family composition</h3></div><i className="bi bi-pie-chart" /></div><div className="fa-donut" role="img" aria-label={`${male} male, ${female} female, ${unknown} unspecified`} style={{ background: members.length ? `conic-gradient(#6176fa 0 ${male / members.length * 100}%, #aa69ec 0 ${(male + female) / members.length * 100}%, #28bba0 0)` : '#e4e8ef' }}><div><strong>{members.length}</strong><span>Total members</span></div></div><div className="fa-legend">{[['Male', male], ['Female', female], ['Unspecified', unknown]].map(([label, value], i) => <div key={label}><span><i style={{ background: palette[i] }} />{label}</span><strong>{value}</strong></div>)}</div></article>
      <article className="fa-panel fa-calendar"><div className="fa-panel-title"><div><span className="fa-eyebrow">DATES THAT MATTER</span><h3>Family calendar</h3></div><button className="fa-text-link" onClick={() => { const now = new Date(); setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); setSelected(dateKey(now)); }}>Today</button></div><div className="fa-month"><button aria-label="Previous month" onClick={() => shiftMonth(-1)}>‹</button><strong aria-live="polite">{month.toLocaleDateString('en', { month: 'long', year: 'numeric' })}</strong><button aria-label="Next month" onClick={() => shiftMonth(1)}>›</button></div><div className="fa-days">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <span key={d}>{d}</span>)}{Array.from({ length: month.getDay() }, (_, i) => <span key={`empty-${i}`} />)}{Array.from({ length: days }, (_, i) => { const key = dateKey(new Date(month.getFullYear(), month.getMonth(), i + 1)); const count = eventsFor(key).length; return <button key={key} className={`${key === today ? 'is-today' : ''} ${count ? 'has-event' : ''}`} aria-label={`${key}${count ? `, ${count} events` : ''}`} aria-pressed={selected === key} onClick={() => setSelected(key)}>{i + 1}</button>; })}</div><div className="fa-agenda" aria-live="polite"><strong>{new Date(`${selected}T12:00:00`).toLocaleDateString('en', { month: 'short', day: 'numeric' })} · Schedule</strong>{events.length ? events.map(e => <div key={e.id}>{e.member ? <button className="fa-text-link" onClick={() => navigate('members', e.id)}>{e.title}</button> : <span>{e.done ? '✓ ' : '• '}{e.title}</span>}</div>) : <p>No birthdays or tasks on this day.</p>}<button className="fa-text-link" onClick={() => navigate('tasks')}>Manage tasks & calendar →</button></div></article>
    </div>}
    {mode !== 'summary' && <article className="fa-panel fa-directory"><div className="fa-panel-title"><div><span className="fa-eyebrow">FACES OF OUR FAMILY</span><h3>Member directory <span className="fa-pill">{members.length}</span></h3></div><button className="admin-btn blue" onClick={() => navigate('members')}>Manage members</button></div><div className="fa-table-tools"><label><span>Search members</span><input type="search" placeholder="Search name, role or member ID…" value={query} onChange={e => { setQuery(e.target.value); setPage(0); }} /></label><label><span>Sort members</span><select value={sort} onChange={e => { setSort(e.target.value); setPage(0); }}><option value="name">Name A–Z</option><option value="generation">Generation</option></select></label></div><div className="fa-table-scroll"><table><thead><tr><th>Member</th><th>Generation</th><th>Role / profession</th><th>Date of birth</th><th>Details</th></tr></thead><tbody>{rows.slice(safePage * 5, safePage * 5 + 5).map(m => <tr key={m.id}><td><div className="fa-member"><Avatar member={m} /><div><strong>{m.name}</strong><small>ID: {m.id}</small></div></div></td><td><span className="fa-pill">Generation {generation(m)}</span></td><td>{m.profession || 'Not recorded'}</td><td>{m.birthDate ? new Date(`${m.birthDate}T12:00:00`).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Not recorded'}</td><td><button className="fa-text-link" aria-label={`View profile of ${m.name}`} onClick={() => navigate('members', m.id)}>View profile ↗</button></td></tr>)}{!rows.length && <tr><td colSpan="5">No members match your search.</td></tr>}</tbody></table></div><div className="fa-pagination"><span aria-live="polite">{rows.length ? `${safePage * 5 + 1}–${Math.min(rows.length, safePage * 5 + 5)} of ${rows.length} members` : '0 members'}</span><div><button disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>Previous</button><span>Page {safePage + 1} of {pages}</span><button disabled={safePage + 1 >= pages} onClick={() => setPage(safePage + 1)}>Next</button></div></div></article>}
  </section>;
}
