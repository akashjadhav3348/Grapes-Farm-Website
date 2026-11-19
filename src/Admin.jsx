import { useState } from 'react';
import { browserChannel, browserContent, contentFile, familyNames, initialContent, parseContent, photoSource, photoTypes } from './content.js';

const input = 'w-full min-w-0 rounded-xl border border-emerald-900/15 bg-white px-3 py-2.5 text-sm';
const action = 'inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-900/15 bg-white px-3 py-2 text-sm font-bold hover:bg-emerald-50';
const primary = 'inline-flex min-h-11 items-center justify-center rounded-xl border-0 bg-emerald-800 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-900';
const card = 'rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm sm:p-6';
const accept = photoTypes.join(',');

function Field({ label, value, onChange, multiline = false }) {
  const Element = multiline ? 'textarea' : 'input';
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-bold">
      {label}
      <Element className={input} rows={multiline ? 3 : undefined} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function Upload({ onUpload, multiple = false, label = 'फोटो बदला' }) {
  return (
    <label className={`${action} cursor-pointer focus-within:outline-2`}>
      {label}
      <input type="file" accept={accept} multiple={multiple} className="sr-only" onChange={(event) => {
        const files = Array.from(event.target.files);
        event.target.value = '';
        if (files.length) onUpload(files);
      }} />
    </label>
  );
}

function Photo({ src, onUpload, alt = '' }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <img className="h-20 w-28 rounded-lg object-cover" src={photoSource(src)} alt={alt} loading="lazy" />
      <Upload onUpload={onUpload} />
    </div>
  );
}

function Remove({ onClick, label = 'काढा' }) {
  return <button className={`${action} text-rose-800`} type="button" onClick={onClick}>{label}</button>;
}

function toDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!photoTypes.includes(file.type) || file.size > 8 * 1024 * 1024) {
      reject(new Error('JPG, PNG, WebP किंवा AVIF फोटो निवडा. प्रत्येक फोटो जास्तीत जास्त ८ MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function replaceAt(items, index, value) {
  return items.map((item, position) => position === index ? value : item);
}

const sections = [
  ['hero', 'मुख्यपृष्ठ'], ['farm', 'शेती'], ['crops', 'पिके'], ['gallery', 'गॅलरी'], ['family', 'कुटुंब'], ['visit', 'संपर्क'],
];

export default function Admin({ content, onChange, ready }) {
  const [section, setSection] = useState('hero');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [folder, setFolder] = useState(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const groupIndex = Math.min(galleryIndex, content.gallery.length - 1);
  const group = content.gallery[groupIndex];
  const patch = (values) => onChange((current) => ({ ...current, ...values }));
  const set = (key, value) => patch({ [key]: value });
  const field = (sectionName, key, value) => onChange((current) => ({
    ...current, [sectionName]: { ...current[sectionName], [key]: value },
  }));

  async function perform(callback) {
    setBusy(true);
    setStatus('');
    try {
      await callback();
    } catch (error) {
      if (error.name !== 'AbortError') setStatus(error.message || 'बदल पूर्ण झाले नाहीत.');
    } finally {
      setBusy(false);
    }
  }

  function upload(files, update) {
    return perform(async () => update(await Promise.all(files.map(toDataURL))));
  }

  async function storeInBrowser() {
    await browserContent(parseContent(content));
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel(browserChannel);
      channel.postMessage('saved');
      channel.close();
    }
  }

  function save() {
    return perform(async () => {
      await storeInBrowser();
      setStatus('या ब्राउझरमध्ये बदल सेव्ह झाले.');
    });
  }

  function saveFolder() {
    return perform(async () => {
      const data = JSON.stringify(parseContent(content), null, 2);
      const directory = folder ?? await window.showDirectoryPicker({ mode: 'readwrite', id: 'aishwary-content' });
      const file = await directory.getFileHandle(contentFile, { create: true });
      const writer = await file.createWritable();
      try {
        await writer.write(data);
        await writer.close();
      } catch (error) {
        await writer.abort().catch(() => {});
        throw error;
      }
      setFolder(directory);
      await storeInBrowser();
      setStatus(`${directory.name}/${contentFile} सेव्ह झाली. अपलोड केलेले फोटो याच फाइलमध्ये आहेत.`);
    });
  }

  function exportFile() {
    return perform(async () => {
      const url = URL.createObjectURL(new Blob([JSON.stringify(parseContent(content), null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = contentFile;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus('content.json डाउनलोड सुरू आहे.');
    });
  }

  function importFile(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (file) void perform(async () => {
      onChange(parseContent(JSON.parse(await file.text())));
      setStatus('फाइल प्रिव्ह्यूमध्ये उघडली. बदल ठेवण्यासाठी Save करा.');
    });
  }

  const editCrop = (index, values) => onChange((current) => ({
    ...current, crops: replaceAt(current.crops, index, { ...current.crops[index], ...values }),
  }));
  const editGroup = (index, update) => onChange((current) => ({
    ...current, gallery: replaceAt(current.gallery, index, update(current.gallery[index])),
  }));
  const editItem = (index, values) => editGroup(groupIndex, (current) => ({
    ...current, items: replaceAt(current.items, index, { ...current.items[index], ...values }),
  }));

  const fields = {
    hero: [['eyebrow', 'वरची ओळ'], ['title', 'मुख्य शीर्षक'], ['accent', 'ठळक शब्द'], ['description', 'वर्णन'], ['caption', 'फोटोखालील मजकूर']],
    farm: [['title', 'शीर्षक'], ['description', 'शेतीची माहिती']],
    visit: [['title', 'शीर्षक'], ['address', 'पत्ता'], ['description', 'भेटीची माहिती'], ['security', 'सुरक्षा माहिती']],
  };

  return (
    <section className="border-b border-emerald-900/10 bg-emerald-50/70 px-3 py-6 sm:px-6 sm:py-10" aria-labelledby="admin-title" id="dashboard">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-emerald-800">ऐश्वर्य फार्म्स</p>
            <h1 id="admin-title" className="text-3xl font-bold sm:text-4xl">Landing Page Editor</h1>
          </div>
          <a className={action} href="#live-preview">Live preview</a>
        </header>
        <fieldset disabled={!ready || busy} className="m-0 min-w-0 border-0 p-0 disabled:opacity-65">
          <div className={`${card} mb-4 flex flex-wrap gap-2`}>
            <button className={primary} type="button" onClick={save}>Save in browser</button>
            {'showDirectoryPicker' in window && <button className={action} type="button" onClick={saveFolder}>Save to folder</button>}
            <button className={action} type="button" onClick={exportFile}>Download JSON</button>
            <label className={`${action} cursor-pointer focus-within:outline-2`}>Import JSON<input className="sr-only" type="file" accept=".json,application/json" onChange={importFile} /></label>
            <p role="status" className="m-0 w-full text-sm text-emerald-950">{!ready ? 'एडिटर लोड होत आहे…' : status}</p>
            <p className="m-0 w-full text-sm text-emerald-950/80">फाइलमधले बदल वेबसाइटवर सर्वांना दाखवण्यासाठी content.json प्रोजेक्टच्या public फोल्डरमध्ये ठेवून साइट पुन्हा प्रकाशित करा.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-[11rem_minmax(0,1fr)]">
            <div className={`${card} flex flex-wrap items-start gap-2 self-start md:grid`} aria-label="एडिटरचे विभाग">
              {sections.map(([id, label]) => (
                <button key={id} aria-pressed={section === id} className={section === id ? primary : action} type="button" onClick={() => setSection(id)}>{label}</button>
              ))}
            </div>
            <div className={`${card} grid min-w-0 gap-4`}>
              {fields[section]?.map(([key, label]) => (
                <Field key={key} label={label} value={content[section][key]} multiline={key === 'description'} onChange={(value) => field(section, key, value)} />
              ))}
              {(section === 'hero' || section === 'farm') && (
                <Photo src={content[section].image} onUpload={(files) => upload(files, ([image]) => field(section, 'image', image))} />
              )}
              {section === 'hero' && <div className="grid gap-3 sm:grid-cols-3">
                {['एकूण एकर', 'द्राक्षबाग', 'इतर पिके'].map((label, index) => (
                  <Field key={label} label={label} value={content.hero.acres[index]} onChange={(value) => field('hero', 'acres', replaceAt(content.hero.acres, index, value))} />
                ))}
              </div>}
              {section === 'farm' && <Field label="द्राक्षांचे वाण (प्रत्येक ओळीत एक)" multiline value={content.farm.varieties.join('\n')} onChange={(value) => field('farm', 'varieties', value.split('\n'))} />}
              {section === 'visit' && <Field label="फोन नंबर (प्रत्येक ओळीत एक)" multiline value={content.visit.phones.join('\n')} onChange={(value) => field('visit', 'phones', value.split('\n'))} />}
              {section === 'family' && <>
                <Field label="वंशवृक्षाचे शीर्षक" value={content.familyTitle} onChange={(value) => set('familyTitle', value)} />
                <div className="grid gap-3 sm:grid-cols-2">
                  {familyNames.map((name) => (
                    <Field key={name} label={name} value={content.familyLabels[name] ?? name} onChange={(label) => onChange((current) => ({
                      ...current, familyLabels: { ...current.familyLabels, [name]: label },
                    }))} />
                  ))}
                </div>
              </>}
              {section === 'crops' && <>
                <Field label="पिके विभागाचे शीर्षक" value={content.cropTitle} onChange={(value) => set('cropTitle', value)} />
                <div className="grid gap-3 xl:grid-cols-2">
                  {content.crops.map((crop, index) => <div className={`${card} grid gap-3`} key={crop.id}>
                    <Field label="पिकाचे नाव" value={crop.name} onChange={(name) => editCrop(index, { name })} />
                    <Field label="English name" value={crop.english} onChange={(english) => editCrop(index, { english })} />
                    <Field label="वर्णन" multiline value={crop.description} onChange={(description) => editCrop(index, { description })} />
                    <Field label="फोटोचे वर्णन" value={crop.alt} onChange={(alt) => editCrop(index, { alt })} />
                    <Photo src={crop.photo} onUpload={(files) => upload(files, ([photo]) => editCrop(index, { photo, illustrative: false }))} />
                    <Remove label="पीक काढा" onClick={() => set('crops', content.crops.filter((item) => item.id !== crop.id))} />
                  </div>)}
                </div>
                <Upload label="फोटोसह नवीन पीक जोडा" onUpload={(files) => upload(files, ([photo]) => onChange((current) => ({
                  ...current, crops: [...current.crops, { id: crypto.randomUUID(), name: '', english: '', alt: '', description: '', photo }],
                })))} />
              </>}
              {section === 'gallery' && <>
                <Field label="गॅलरी शीर्षक" value={content.galleryTitle} onChange={(value) => set('galleryTitle', value)} />
                <Field label="गॅलरी वर्णन" value={content.galleryDescription} onChange={(value) => set('galleryDescription', value)} />
                <div className="flex flex-wrap gap-2">
                  <label className="grid min-w-40 flex-1 gap-1 text-sm font-bold">फोटो गट
                    <select className={input} value={groupIndex} disabled={!group} onChange={(event) => setGalleryIndex(Number(event.target.value))}>
                      {content.gallery.map((item, index) => <option key={item.id} value={index}>{item.label || 'नवीन गट'}</option>)}
                    </select>
                  </label>
                  <button className={`${action} self-end`} type="button" onClick={() => {
                    setGalleryIndex(content.gallery.length);
                    set('gallery', [...content.gallery, { id: crypto.randomUUID(), label: 'नवीन गट', description: '', items: [] }]);
                  }}>गट जोडा</button>
                </div>
                {group && <>
                  <Field label="गटाचे नाव" value={group.label} onChange={(label) => editGroup(groupIndex, (current) => ({ ...current, label }))} />
                  <Field label="गटाचे वर्णन" value={group.description} onChange={(description) => editGroup(groupIndex, (current) => ({ ...current, description }))} />
                  <div className="flex flex-wrap gap-2">
                    <Upload multiple label="फोटो अपलोड करा" onUpload={(files) => upload(files, (photos) => editGroup(groupIndex, (current) => ({
                      ...current, items: [...current.items, ...photos.map((src) => ({ id: crypto.randomUUID(), src, thumb: '', caption: '', video: false }))],
                    })))} />
                    <Remove label="गट काढा" onClick={() => set('gallery', content.gallery.filter((item) => item.id !== group.id))} />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {group.items.map((item, index) => (
                      <div className="grid gap-2 rounded-xl border border-emerald-900/10 p-2" key={item.id}>
                        {item.video ? <p className="text-sm">व्हिडिओ · {index + 1}</p> :
                          <Photo src={item.thumb || item.src} onUpload={(files) => upload(files, ([src]) => editItem(index, { src, thumb: '' }))} />}
                        <Field label={`कॅप्शन · ${index + 1}`} value={item.caption} onChange={(caption) => editItem(index, { caption })} />
                        <Remove label="मीडिया काढा" onClick={() => editGroup(groupIndex, (current) => ({
                          ...current, items: current.items.filter((entry) => entry.id !== item.id),
                        }))} />
                      </div>
                    ))}
                  </div>
                </>}
              </>}
            </div>
          </div>
        </fieldset>
        <button className={`${action} mt-4`} type="button" disabled={!ready || busy} onClick={() => {
          onChange(initialContent);
          setStatus('मूळ मजकूर प्रिव्ह्यूमध्ये आला. तो ठेवण्यासाठी Save करा.');
        }}>मूळ मजकूर प्रिव्ह्यू करा</button>
      </div>
    </section>
  );
}
