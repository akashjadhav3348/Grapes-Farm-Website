import { useState } from 'react';
import { familyData, isLocalWorkspace, restoreDeviceFamily } from './localFamily.js';
import { validateFamily } from './familyModel.js';

export default function FamilyBackup() {
  const [backup,setBackup] = useState(null);
  const [message,setMessage] = useState('');
  const local = isLocalWorkspace();
  async function download() {
    try {
      const response = await familyData({cache:'no-store'});
      if (!response.ok) throw new Error('Sign in again to export your family.');
      const family = validateFamily(await response.json());
      const blob = new Blob([JSON.stringify({format:'aishwary-family-v1',family})],{type:'application/json'});
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href=url; a.download='aishwary-family.json'; a.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      setMessage('Download started. Keep this file private.');
    } catch(error) { setMessage(error.message); }
  }
  async function preview(file) {
    setBackup(null); setMessage('');
    if (!file) return;
    try {
      const input=JSON.parse(await file.text());
      if(input.format!=='aishwary-family-v1') throw new Error('Choose a family backup exported from Settings.');
      setBackup(validateFamily(input.family));
    } catch(error) { setMessage(error.message); }
  }
  async function restore() {
    if(!window.confirm('Replace the family saved on this browser with the selected backup?')) return;
    try { await restoreDeviceFamily(backup); setBackup(null); setMessage('Family restored on this device.'); }
    catch(error) { setMessage(error.message); }
  }
  return <article><h3>Family backup &amp; migration</h3><p>{local ? 'This browser stores the device family, including photos and relationships. Anyone with access to this browser can open it.' : 'Export the signed-in family, then open the device workspace and import this file in Settings.'}</p>
    <button className="admin-btn" onClick={download}>Download family backup</button>
    {local && <label>Preview family backup<input type="file" accept=".json" onChange={e=>preview(e.target.files[0])}/></label>}
    {backup && <div><p>{backup.members.length} members · {backup.members.filter(m=>m.photo).length} profile photos</p>
      <button className="admin-btn blue" onClick={restore}>Restore family on this device</button> <button className="admin-btn" onClick={()=>setBackup(null)}>Cancel</button></div>}
    <p role="status">{message}</p></article>;
}
