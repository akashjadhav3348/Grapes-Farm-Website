import { useEffect, useMemo, useState } from 'react';
import FamilyAnalytics from './FamilyAnalytics.jsx';
import AdminLayout from './AdminLayout.jsx';
import NetlifyActivity from './NetlifyActivity.jsx';
import AdminOverview, { PhotoDialog, TeamDirectory } from './AdminOverview.jsx';
import { useWorkspace, WorkspacePage, DashboardCharts } from './AdminWorkspace.jsx';
import FamilyManager, { generationsFor } from './FamilyManager.jsx';
import { dashboardText } from './dashboardText.js';
import {
  browserChannel, browserContent, contentFile, familyNames,
  initialContent, parseContent, photoTypes,
} from './content.js';

const input = 'w-full min-w-0 rounded-xl border border-emerald-900/15 bg-white px-3 py-2.5 text-sm';
const action = 'inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-900/15 bg-white px-3 py-2 text-sm font-bold hover:bg-emerald-50';
const primary = 'inline-flex min-h-11 items-center justify-center rounded-xl border-0 bg-indigo-700 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-800';
const card = 'rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm sm:p-6';
const accept = photoTypes.join(',');

const sections = [
  ['overview', 'Overview'], ['team', 'Team directory'],
  ['family-tree', 'Family tree'], ['members', 'Members'],
  ['profile', 'My profile'], ['settings', 'Settings'],
  ['tasks', 'Tasks & calendar'], ['notifications', 'Notifications'],
  ['activity', 'Netlify activity'], ['hero', 'मुख्यपृष्ठ'], ['farm', 'शेती'], ['crops', 'पिके'], ['gallery', 'गॅलरी'], ['family', 'कुटुंब'], ['visit', 'संपर्क'],
];

/* CHANGE #1 — expanded so every section is deep-linkable */
const ROUTES = {
  overview: '/admin',
  'family-tree': '/admin/family-tree',
  members: '/admin/members',
  profile: '/admin/profile',
  settings: '/admin/settings',
  tasks: '/admin/tasks',
  notifications: '/admin/notifications',
  team: '/admin/team',
  activity: '/admin/activity',
  hero: '/admin/hero',
  farm: '/admin/farm',
  crops: '/admin/crops',
  gallery: '/admin/gallery',
  family: '/admin/family',
  visit: '/admin/visit',
};

function sectionFromLocation() {
  const path = window.location.pathname.replace(/\/$/, '') || '/admin';
  const match = Object.entries(ROUTES).find(([, value]) => value === path);
  return match ? match[0] : 'overview';
}

function Field({ label, value, onChange, multiline = false }) {
  const Element = multiline ? 'textarea' : 'input';
  return (
    <label className="grid min-w-0 gap-1.5 text-sm font-bold">
      {label}
      <Element
        className={input}
        rows={multiline ? 3 : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  );
}

function Upload({ onUpload, multiple = false, label = 'फोटो बदला' }) {
  return (
    <label className={`${action} cursor-pointer focus-within:outline-2`}>
      {label}
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        className="sr-only"
        onChange={(event) => {
          const files = Array.from(event.target.files);
          event.target.value = '';
          if (files.length) onUpload(files);
        }}
      />
    </label>
  );
}

function Photo({ src, onUpload, label, alt = '' }) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <PhotoDialog src={src} alt={alt} />
      <Upload label={label} onUpload={onUpload} />
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
  return items.map((item, position) => (position === index ? value : item));
}

function storedTheme() {
  try {
    return window.localStorage.getItem('family-admin-theme') === 'dark' ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

function FamilyOverview({ navigate, tasks }) {
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/admin/family', { cache: 'no-store', signal: controller.signal });
        const result = await response.json().catch(() => null);
        if (!response.ok) throw new Error(result?.message || 'Family data could not be loaded.');
        if (active) setFamily(result);
      } catch (loadError) {
        if (active && loadError.name !== 'AbortError') setError(loadError.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [reload]);

  if (loading) return <section className="admin-panel family-overview-loading" aria-live="polite">Loading family dashboard…</section>;
  if (error) return (
    <section className="admin-panel family-overview-error">
      <h2>Family overview unavailable</h2>
      <p role="alert">{error}</p>
      <button className="admin-btn blue" type="button" onClick={() => setReload((value) => value + 1)}>Try again</button>
    </section>
  );

  const members = family?.members ?? [];
  const generations = members.length ? generationsFor(members) : [];
  return <FamilyAnalytics members={members} generations={generations} navigate={navigate} tasks={tasks} />;
}

export default function Admin({ content, onChange, ready, lang, user, onLogout, logoutError }) {
  const t = (value) => dashboardText(lang, value);
  const [section, setSection] = useState(sectionFromLocation);
  const [selectedMemberId, setSelectedMemberId] = useState(
    () => new URLSearchParams(window.location.search).get('member') || ''
  );
  const workspace = useWorkspace();
  const [navSearch, setNavSearch] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState(storedTheme);
  const [themeWarning, setThemeWarning] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [folder, setFolder] = useState(null);
  const [galleryIndex, setGalleryIndex] = useState(0);

  /* CHANGE #2 — safe clamp: -1 only when gallery is empty, and group is checked */
  const groupIndex = content.gallery.length
    ? Math.min(galleryIndex, content.gallery.length - 1)
    : -1;
  const group = groupIndex >= 0 ? content.gallery[groupIndex] : null;

  const patch = (values) => onChange((current) => ({ ...current, ...values }));
  const set = (key, value) => patch({ [key]: value });
  const field = (sectionName, key, value) => onChange((current) => ({
    ...current,
    [sectionName]: { ...current[sectionName], [key]: value },
  }));

  /* CHANGE #3 — route paths sourced from ROUTES map */
  function navigate(nextSection, memberId = '') {
    setSection(nextSection);
    setSelectedMemberId(nextSection === 'members' ? memberId : '');
    const path = ROUTES[nextSection] ?? '/admin';
    const query = nextSection === 'members' && memberId
      ? `?member=${encodeURIComponent(memberId)}`
      : '';
    window.history.pushState({ adminSection: nextSection }, '', `${path}${query}`);
  }

  useEffect(() => {
    function syncRoute() {
      setSection(sectionFromLocation());
      setSelectedMemberId(new URLSearchParams(window.location.search).get('member') || '');
    }
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

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
      setStatus(`${directory.name}/${contentFile} was saved. Uploaded photos are stored in the same file.`);
    });
  }

  function exportFile() {
    return perform(async () => {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(parseContent(content), null, 2)], { type: 'application/json' })
      );
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
    if (file) {
      void perform(async () => {
        onChange(parseContent(JSON.parse(await file.text())));
        setStatus('फाइल प्रिव्ह्यूमध्ये उघडली. बदल ठेवण्यासाठी Save करा.');
      });
    }
  }

  const editCrop = (index, values) => onChange((current) => ({
    ...current,
    crops: replaceAt(current.crops, index, { ...current.crops[index], ...values }),
  }));
  const editGroup = (index, update) => onChange((current) => ({
    ...current,
    gallery: replaceAt(current.gallery, index, update(current.gallery[index])),
  }));
  const editItem = (index, values) => editGroup(groupIndex, (current) => ({
    ...current,
    items: replaceAt(current.items, index, { ...current.items[index], ...values }),
  }));

  const fields = {
    hero: [
      ['eyebrow', 'वरची ओळ'], ['title', 'मुख्य शीर्षक'], ['accent', 'ठळक शब्द'],
      ['description', 'वर्णन'], ['caption', 'फोटोखालील मजकूर'],
    ],
    farm: [['title', 'शीर्षक'], ['description', 'शेतीची माहिती']],
    visit: [
      ['title', 'शीर्षक'], ['address', 'पत्ता'],
      ['description', 'भेटीची माहिती'], ['security', 'सुरक्षा माहिती'],
    ],
  };

  const sectionTitle = t(sections.find(([id]) => id === section)?.[1] ?? 'Overview');

  /* CHANGE #4 — translate metric labels once, not twice */
  const photoCount = content.gallery.reduce(
    (total, entry) => total + entry.items.filter((item) => !item.video).length, 0
  );
  const metrics = useMemo(() => ([
    [t('पिके'), content.crops.length, 'bg-teal-100 text-teal-900'],
    [t('गॅलरी गट'), content.gallery.length, 'bg-sky-100 text-sky-900'],
    [t('गॅलरी फोटो'), photoCount, 'bg-violet-100 text-violet-900'],
  ]), [content.crops.length, content.gallery.length, photoCount, lang]);

  const unreadCount = workspace.data.notifications.filter((n) => !n.read).length;

  function toggleTheme() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try {
      window.localStorage.setItem('family-admin-theme', next);
      setThemeWarning('');
    } catch {
      setThemeWarning('Theme changed, but this browser could not save the preference.');
    }
  }

  /* CHANGE #5 — sidebar filter also matches the raw label */
  const visibleSections = sections.filter(([id, label]) => {
    const needle = navSearch.trim().toLowerCase();
    if (!needle) return true;
    return (
      t(label).toLowerCase().includes(needle) ||
      label.toLowerCase().includes(needle) ||
      id.toLowerCase().includes(needle)
    );
  });

  const headerTitle = section === 'overview' ? 'Family Dashboard' : sectionTitle;

  return (
    <AdminLayout
      lang={lang} theme={theme} section={section} menuOpen={menuOpen} setMenuOpen={setMenuOpen}
      sections={visibleSections} navigate={navigate} search={navSearch} setSearch={setNavSearch}
      unreadCount={unreadCount} toggleTheme={toggleTheme} profileName={workspace.data.profile.name}
      onLogout={onLogout} logoutError={logoutError} themeWarning={themeWarning} title={headerTitle}
      metrics={metrics} showMetrics={!['overview', 'family-tree', 'members', 'settings', 'profile'].includes(section)} t={t}
    >
          {['profile', 'tasks', 'notifications', 'settings'].includes(section) ? (
            <WorkspacePage key={section} section={section} workspace={workspace} />
          ) : ['family-tree', 'members'].includes(section) ? (
            <FamilyManager
              view={section}
              selectedId={selectedMemberId}
              onSelectMember={setSelectedMemberId}
              onNavigate={navigate}
            />
          ) : section === 'overview' ? (
            <>
              <FamilyOverview navigate={navigate} tasks={workspace.data.tasks} />
              <DashboardCharts content={content} />
              <AdminOverview content={content} navigate={navigate} />
            </>
          ) : section === 'team' ? (
            <TeamDirectory />
          ) : section === 'activity' ? (
            <NetlifyActivity lang={lang} />
          ) : (
            <>
              {/* CHANGE #8 — disabled:opacity-60 (opacity-65 is not a default Tailwind step) */}
              <fieldset disabled={!ready || busy} className="m-0 min-w-0 border-0 p-0 disabled:opacity-60">
                <div className={`${card} mb-4 flex flex-wrap gap-2`}>
                  <button className={primary} type="button" onClick={save}>{t('Save in browser')}</button>
                  {'showDirectoryPicker' in window && (
                    <button className={action} type="button" onClick={saveFolder}>{t('Save to folder')}</button>
                  )}
                  <button className={action} type="button" onClick={exportFile}>{t('Download JSON')}</button>
                  <label className={`${action} cursor-pointer focus-within:outline-2`}>
                    {t('Import JSON')}
                    <input className="sr-only" type="file" accept=".json,application/json" onChange={importFile} />
                  </label>
                  <p role="status" className="m-0 w-full text-sm text-emerald-950">
                    {!ready ? t('एडिटर लोड होत आहे…') : t(status)}
                  </p>
                  <p className="m-0 w-full text-sm text-emerald-950/80">
                    {t('फाइलमधले बदल वेबसाइटवर सर्वांना दाखवण्यासाठी content.json प्रोजेक्टच्या public फोल्डरमध्ये ठेवून साइट पुन्हा प्रकाशित करा.')}
                  </p>
                </div>

                <div className={`${card} grid min-w-0 gap-4`}>
                  <h2 className="text-xl font-bold text-slate-900">{sectionTitle}</h2>
                  {fields[section]?.map(([key, label]) => (
                    <Field
                      key={key}
                      label={t(label)}
                      value={content[section][key]}
                      multiline={key === 'description'}
                      onChange={(value) => field(section, key, value)}
                    />
                  ))}

                  {(section === 'hero' || section === 'farm') && (
                    <Photo
                      label={t('फोटो बदला')}
                      src={content[section].image}
                      onUpload={(files) => upload(files, ([image]) => field(section, 'image', image))}
                    />
                  )}

                  {section === 'hero' && (
                    <div className="grid gap-3 sm:grid-cols-3">
                      {['एकूण एकर', 'द्राक्षबाग', 'इतर पिके'].map((label, index) => (
                        <Field
                          key={label}
                          label={t(label)}
                          value={content.hero.acres[index]}
                          onChange={(value) => field('hero', 'acres', replaceAt(content.hero.acres, index, value))}
                        />
                      ))}
                    </div>
                  )}

                  {section === 'farm' && (
                    <Field
                      label={t('द्राक्षांचे वाण (प्रत्येक ओळीत एक)')}
                      multiline
                      value={content.farm.varieties.join('\n')}
                      onChange={(value) => field('farm', 'varieties', value.split('\n'))}
                    />
                  )}

                  {section === 'visit' && (
                    <Field
                      label={t('फोन नंबर (प्रत्येक ओळीत एक)')}
                      multiline
                      value={content.visit.phones.join('\n')}
                      onChange={(value) => field('visit', 'phones', value.split('\n'))}
                    />
                  )}

                  {section === 'family' && (
                    <>
                      <Field
                        label={t('वंशवृक्षाचे शीर्षक')}
                        value={content.familyTitle}
                        onChange={(value) => set('familyTitle', value)}
                      />
                      <div className="grid gap-3 sm:grid-cols-2">
                        {familyNames.map((name) => (
                          <Field
                            key={name}
                            label={name}
                            value={content.familyLabels[name] ?? name}
                            onChange={(label) => onChange((current) => ({
                              ...current,
                              familyLabels: { ...current.familyLabels, [name]: label },
                            }))}
                          />
                        ))}
                      </div>
                    </>
                  )}

                  {section === 'crops' && (
                    <>
                      <Field
                        label={t('पिके विभागाचे शीर्षक')}
                        value={content.cropTitle}
                        onChange={(value) => set('cropTitle', value)}
                      />
                      <div className="grid gap-3 xl:grid-cols-2">
                        {content.crops.map((crop, index) => (
                          <div className={`${card} grid gap-3`} key={crop.id}>
                            <Field label={t('पिकाचे नाव')} value={crop.name} onChange={(name) => editCrop(index, { name })} />
                            <Field label={t('English name')} value={crop.english} onChange={(english) => editCrop(index, { english })} />
                            <Field label={t('वर्णन')} multiline value={crop.description} onChange={(description) => editCrop(index, { description })} />
                            <Field label={t('फोटोचे वर्णन')} value={crop.alt} onChange={(alt) => editCrop(index, { alt })} />
                            <Photo
                              label={t('फोटो बदला')}
                              src={crop.photo}
                              onUpload={(files) => upload(files, ([photo]) => editCrop(index, { photo, illustrative: false }))}
                            />
                            <Remove
                              label={t('पीक काढा')}
                              onClick={() => set('crops', content.crops.filter((item) => item.id !== crop.id))}
                            />
                          </div>
                        ))}
                      </div>
                      <Upload
                        label={t('फोटोसह नवीन पीक जोडा')}
                        onUpload={(files) => upload(files, ([photo]) => onChange((current) => ({
                          ...current,
                          crops: [...current.crops, {
                            id: crypto.randomUUID(), name: '', english: '', alt: '', description: '', photo,
                          }],
                        })))}
                      />
                    </>
                  )}

                  {section === 'gallery' && (
                    <>
                      <Field
                        label={t('गॅलरी शीर्षक')}
                        value={content.galleryTitle}
                        onChange={(value) => set('galleryTitle', value)}
                      />
                      <Field
                        label={t('गॅलरी वर्णन')}
                        value={content.galleryDescription}
                        onChange={(value) => set('galleryDescription', value)}
                      />
                      <div className="flex flex-wrap gap-2">
                        <label className="grid min-w-40 flex-1 gap-1 text-sm font-bold">
                          {t('फोटो गट')}
                          <select
                            className={input}
                            value={groupIndex >= 0 ? groupIndex : ''}
                            disabled={!group}
                            onChange={(event) => setGalleryIndex(Number(event.target.value))}
                          >
                            {content.gallery.map((item, index) => (
                              <option key={item.id} value={index}>{item.label || t('नवीन गट')}</option>
                            ))}
                          </select>
                        </label>
                        <button
                          className={`${action} self-end`}
                          type="button"
                          onClick={() => {
                            /* CHANGE #9 — append first, then point the select at the new entry */
                            onChange((current) => ({
                              ...current,
                              gallery: [...current.gallery, {
                                id: crypto.randomUUID(), label: 'नवीन गट', description: '', items: [],
                              }],
                            }));
                            setGalleryIndex(content.gallery.length);
                          }}
                        >
                          {t('गट जोडा')}
                        </button>
                      </div>

                      {group && (
                        <>
                          <Field
                            label={t('गटाचे नाव')}
                            value={group.label}
                            onChange={(label) => editGroup(groupIndex, (current) => ({ ...current, label }))}
                          />
                          <Field
                            label={t('गटाचे वर्णन')}
                            value={group.description}
                            onChange={(description) => editGroup(groupIndex, (current) => ({ ...current, description }))}
                          />
                          <div className="flex flex-wrap gap-2">
                            <Upload
                              multiple
                              label={t('फोटो अपलोड करा')}
                              onUpload={(files) => upload(files, (photos) => editGroup(groupIndex, (current) => ({
                                ...current,
                                items: [
                                  ...current.items,
                                  ...photos.map((src) => ({
                                    id: crypto.randomUUID(), src, thumb: '', caption: '', video: false,
                                  })),
                                ],
                              })))}
                            />
                            <Remove
                              label={t('गट काढा')}
                              onClick={() => set('gallery', content.gallery.filter((item) => item.id !== group.id))}
                            />
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {group.items.map((item, index) => (
                              <div className="grid gap-2 rounded-xl border border-emerald-900/10 p-2" key={item.id}>
                                {item.video ? (
                                  <p className="text-sm">{t('व्हिडिओ')} · {index + 1}</p>
                                ) : (
                                  <Photo
                                    label={t('फोटो बदला')}
                                    src={item.thumb || item.src}
                                    onUpload={(files) => upload(files, ([src]) => editItem(index, { src, thumb: '' }))}
                                  />
                                )}
                                <Field
                                  label={`${t('कॅप्शन')} · ${index + 1}`}
                                  value={item.caption}
                                  onChange={(caption) => editItem(index, { caption })}
                                />
                                <Remove
                                  label={t('मीडिया काढा')}
                                  onClick={() => editGroup(groupIndex, (current) => ({
                                    ...current,
                                    items: current.items.filter((entry) => entry.id !== item.id),
                                  }))}
                                />
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              </fieldset>

              <button
                className={`${action} mt-4`}
                type="button"
                disabled={!ready || busy}
                onClick={() => {
                  onChange(initialContent);
                  setStatus('मूळ मजकूर प्रिव्ह्यूमध्ये आला. तो ठेवण्यासाठी Save करा.');
                }}
              >
                {t('मूळ मजकूर प्रिव्ह्यू करा')}
              </button>
            </>
          )}
    </AdminLayout>
  );
}
