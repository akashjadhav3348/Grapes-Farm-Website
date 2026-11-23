import { useState } from 'react';

export default function CropCreate({ onCreate }) {
  const [name, setName] = useState('');
  const [english, setEnglish] = useState('');
  const [error, setError] = useState('');
  function add() {
    if (!name.trim()) {
      setError('Enter a crop name.');
      return;
    }
    onCreate({
      id: crypto.randomUUID(), name: name.trim(), english: english.trim(),
      description: '', alt: name.trim(), photo: '', visible: true,
    });
    setName('');
    setEnglish('');
    setError('');
  }
  return <section className="admin-panel" id="create-crop">
    <h3>Add crop</h3>
    <div className="row g-3">
      <label className="col-md-6">Crop name *<input value={name} maxLength={120} aria-invalid={Boolean(error)} onChange={event => { setName(event.target.value); setError(''); }} /></label>
      <label className="col-md-6">English name<input value={english} maxLength={120} onChange={event => setEnglish(event.target.value)} /></label>
    </div>
    {error && <p role="alert">{error}</p>}
    <button type="button" className="admin-btn blue" onClick={add}>Add crop to draft</button>
  </section>;
}
