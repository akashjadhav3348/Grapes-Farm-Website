import { useState } from 'react';
import { photoSource } from './content.js';
import { confirmDashboardAction } from './dashboardToast.js';

export function FarmRegister({ content, change }) {
  const [draft, setDraft] = useState(() => new URLSearchParams(location.search).get('action') === 'add'
    ? {id:crypto.randomUUID(),name:'',village:'',description:'',visible:true} : null);
  const farms = content.additionalFarms ?? [];
  const [error,setError] = useState('');
  function save() {
    if (!draft.name.trim() || !draft.village.trim()) {
      setError('Farm name and village are required.');
      return;
    }
    const record = { ...draft, name: draft.name.trim(), village: draft.village.trim() };
    change(farms.some(f => f.id === record.id) ? farms.map(f => f.id === record.id ? record : f) : [...farms, record]);
    setDraft(null);
    setError('');
  }
  return <section className="admin-panel farm-register"><h3>Additional farms</h3>
    {farms.map(f => <p key={f.id}><strong>{f.name}</strong> · {f.village} <button type="button" className="admin-btn" onClick={() => setDraft({...f})}>Edit</button> <button type="button" className="admin-btn" onClick={async () => { if (await confirmDashboardAction('Remove this farm from the draft?')) change(farms.filter(x => x.id !== f.id)); }}>Remove</button></p>)}
    {!draft ? <button type="button" className="admin-btn blue" onClick={() => setDraft({ id:crypto.randomUUID(), name:'', village:'', description:'', visible:true })}>Add farm</button> : <div>
      {['name','village','description'].map(key => <label key={key}>{key === 'name' ? 'Farm name *' : key === 'village' ? 'Village *' : 'Description'}<input maxLength={key === 'description' ? 2000 : 120} value={draft[key]} onChange={e => setDraft({...draft,[key]:e.target.value})}/></label>)}
      <label><input type="checkbox" checked={draft.visible} onChange={e=>setDraft({...draft,visible:e.target.checked})}/> Show on website</label>
      {error && <p role="alert">{error}</p>}
      <button type="button" className="admin-btn blue" onClick={save}>Apply to draft</button> <button type="button" className="admin-btn" onClick={()=>{setDraft(null);setError('');}}>Cancel</button>
    </div>}
  </section>;
}

export function FarmingStory({content}) {
  const groups = content.gallery.filter(g => g.items.some(i => !i.video && i.visible !== false));
  return <section className="container section farming-story" id="story"><h2>Our farming story</h2><p>{content.farm.description}</p>
    <div className="story-photos">{groups.slice(0,3).map(group => {
      const item = group.items.find(i => !i.video && i.visible !== false);
      return <figure key={group.id}><img loading="lazy" src={photoSource(item.thumb || item.src)} alt={item.caption || group.label}/><figcaption><strong>{group.label}</strong><p>{group.description}</p></figcaption></figure>;
    })}</div>
    {(content.additionalFarms ?? []).filter(f => f.visible).map(f => <article key={f.id}><h3>{f.name}</h3><p>{f.village} · {f.description}</p></article>)}
  </section>;
}
