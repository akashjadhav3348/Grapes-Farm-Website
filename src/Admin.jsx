import { useEffect, useMemo, useState } from 'react';
import AdminLayout from './AdminLayout.jsx';
import CropCreate from './CropCreate.jsx';
import { readMedia, videoTypes } from './mediaUpload.js';
import { familyData } from './localFamily.js';
import { FarmRegister } from './FarmRegister.jsx';
import NetlifyActivity from './NetlifyActivity.jsx';
import AdminOverview, { PhotoDialog, TeamDirectory } from './AdminOverview.jsx';
import { useWorkspace, WorkspacePage } from './AdminWorkspace.jsx';
import FamilyManager, { generationsFor } from './FamilyManager.jsx';
import { dashboardText } from './dashboardText.js';
import { showDashboardToast, confirmDashboardAction } from './dashboardToast.js';
import {
  browserChannel, browserContent, browserContentSavedAt, contentFile, familyNames,
  initialContent, parseContent, photoTypes,
} from './content.js';

const input = 'w-full min-w-0 rounded-xl border border-emerald-900/15 bg-white px-3 py-2.5 text-sm';
const action = 'inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-900/15 bg-white px-3 py-2 text-sm font-bold hover:bg-emerald-50';
const primary = 'inline-flex min-h-11 items-center justify-center rounded-xl border-0 bg-indigo-700 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-800';
const card = 'rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-sm sm:p-6';
const accept = photoTypes.join(',');

function formatSavedAt(value, lang) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(lang === 'mr' ? 'mr-IN' : 'en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const sections = [
  ['overview', 'Overview'], ['hero', 'Homepage'], ['farm', 'Farm'],
  ['crops', 'Crops'], ['gallery', 'Gallery'], ['family-tree', 'Family tree'],
  ['members', 'Members'], ['team', 'Team directory'], ['tasks', 'Tasks & calendar'],
  ['notifications', 'Notifications'], ['activity', 'Netlify activity'],
  ['profile', 'My profile'], ['settings', 'Settings'],
  ['family', 'Family'], ['visit', 'Contact'],
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

function Field({ label, value, onChange, multiline = false, className = '', required = false, type = 'text' }) {
  const Element = multiline ? 'textarea' : 'input';
  return (
    <label className={`grid min-w-0 gap-1.5 text-sm font-bold ${className}`}>
      {label}
      <Element
        className={input}
        rows={multiline ? 3 : undefined}
        required={required}
        type={multiline ? undefined : type}
        min={type === 'number' ? 0 : undefined}
        step={type === 'number' ? 'any' : undefined}
        maxLength={multiline ? 5000 : 200}
        value={value}
        onChange={(event) => {
          event.target.setCustomValidity(required && !event.target.value.trim() ? 'Enter a value.' : '');
          onChange(event.target.value);
        }}
      />
    </label>
  );
}

function Upload({ onUpload, multiple = false, label = 'फोटो बदला', allowVideo = false }) {
  return (
    <label className={`${action} cursor-pointer focus-within:outline-2`}>
      {label}
      <input
        type="file"
        accept={allowVideo ? [...photoTypes, ...videoTypes].join(',') : accept}
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
  return <button className={`${action} text-rose-800`} type="button" onClick={async () => {
    if (await confirmDashboardAction('Remove this item from the current draft? Save the editor to keep this change.')) onClick();
  }}>{label}</button>;
}

const toDataURL = file => readMedia(file);

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

let hasDisplayedFamilyOverview = false;

function FamilyOverview({ content, navigate, tasks, notifications, profileName, lang }) {
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    let delayTimer;
    const shouldDelay = !hasDisplayedFamilyOverview;
    const started = performance.now();

    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await familyData({ cache: 'no-store', signal: controller.signal });
        const result = await response.json().catch(() => null);
        if (!response.ok) throw new Error(result?.message || 'Family data could not be loaded.');
        if (active) setFamily(result);
      } catch (loadError) {
        if (active && loadError.name !== 'AbortError') setError(loadError.message);
      } finally {
        if (!active) return;
        const remaining = shouldDelay ? Math.max(0, 2000 - (performance.now() - started)) : 0;
        delayTimer = window.setTimeout(() => {
          if (!active) return;
          hasDisplayedFamilyOverview = true;
          setLoading(false);
        }, remaining);
      }
    }
    void load();
    return () => {
      active = false;
      window.clearTimeout(delayTimer);
      controller.abort();
    };
  }, [reload]);

  if (loading) return <section className="dashboard-loading" aria-live="polite">
    <header className="overview-welcome">
      <div><span className="overview-eyebrow">CONTROL CENTER</span><h1 id="admin-title">Welcome back, {profileName}</h1><p>Loading your live farm and family data…</p></div>
      <span className="overview-live"><i /> Live workspace</span>
    </header>
    <div className="dashboard-loading-hero" />
    <div className="dashboard-loading-kpis">{Array.from({ length: 6 }, (_, index) => <span key={index} />)}</div>
    <div className="dashboard-loading-panels"><span /><span /></div>
  </section>;
  if (error) return (
    <section className="admin-panel family-overview-error">
      <h1 id="admin-title">Welcome back, {profileName}</h1>
      <h2>Family overview unavailable</h2>
      <p role="alert">{error}</p>
      <button className="admin-btn blue" type="button" onClick={() => setReload((value) => value + 1)}>Try again</button>
    </section>
  );

  const members = family?.members ?? [];
  const generations = members.length ? generationsFor(members) : [];
  return <AdminOverview
    content={content}
    navigate={navigate}
    members={members}
    generations={generations}
    tasks={tasks}
    notifications={notifications}
    profileName={profileName}
    lang={lang}
  />;
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [theme, setTheme] = useState(storedTheme);
  const [themeWarning, setThemeWarning] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState('');
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
  function navigate(nextSection, memberId = '', action = '') {
    setSection(nextSection);
    setSelectedMemberId(nextSection === 'members' ? memberId : '');
    const path = ROUTES[nextSection] ?? '/admin';
    const query = nextSection === 'members' && memberId
      ? `?member=${encodeURIComponent(memberId)}`
      : action ? '?action=' + encodeURIComponent(action) : '';
    window.history.pushState({ adminSection: nextSection }, '', `${path}${query}`);
  }

  useEffect(() => {
    if (new URLSearchParams(location.search).get('action') !== 'add') return;
    const target = section === 'crops' ? '#create-crop input'
      : section === 'gallery' ? '#gallery-upload input'
      : section === 'tasks' ? '.task-form input'
      : section === 'farm' ? '.farm-register input' : '';
    if (!target) return;
    const field = document.querySelector(target);
    field?.scrollIntoView({ block:'center' });
    field?.focus({preventScroll:true});
  }, [section]);

  useEffect(() => {
    function syncRoute() {
      setSection(sectionFromLocation());
      setSelectedMemberId(new URLSearchParams(window.location.search).get('member') || '');
    }
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, []);

  useEffect(() => {
    let active = true;
    browserContentSavedAt().then((value) => {
      if (active && typeof value === 'string') setSavedAt(value);
    }).catch((error) => {
      if (active) setStatus(error.message || 'Saved time could not be loaded.');
    });
    return () => {
      active = false;
    };
  }, []);

  async function perform(callback) {
    setBusy(true);
    setStatus('');
    try {
      await callback();
      return true;
    } catch (error) {
      if (error.name === 'AbortError') return null;
      setStatus(error.message || 'बदल पूर्ण झाले नाहीत.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  function upload(files, update) {
    return perform(async () => update(await Promise.all(files.map(toDataURL))));
  }

  function validatedContent() {
    const controls = document.querySelectorAll('.admin-page-content > fieldset input, .admin-page-content > fieldset textarea');
    for (const control of controls) {
      if (!control.reportValidity()) throw new Error('Complete the highlighted field before saving.');
    }
    if (content.crops.some(crop => !crop.name.trim())) throw new Error('Every crop needs a name.');
    if (content.gallery.some(group => !group.label.trim())) throw new Error('Every gallery group needs a name.');
    return parseContent(content);
  }

  async function storeInBrowser() {
    const timestamp = new Date().toISOString();
    await browserContent(validatedContent(), timestamp);
    setSavedAt(timestamp);
    if ('BroadcastChannel' in window) {
      const channel = new BroadcastChannel(browserChannel);
      channel.postMessage('saved');
      channel.close();
    }
  }

  async function save() {
    const result = await perform(async () => {
      await storeInBrowser();
      setStatus('या ब्राउझरमध्ये बदल सेव्ह झाले.');
    });
    if (result !== null) {
      void showDashboardToast(result ? 'success' : 'error', result ? 'Changes saved' : 'Unable to save changes');
    }
    return result;
  }

  async function saveFolder() {
    const result = await perform(async () => {
      const data = JSON.stringify(validatedContent(), null, 2);
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
    if (result !== null) {
      void showDashboardToast(result ? 'success' : 'error', result ? 'Folder saved' : 'Unable to save folder');
    }
    return result;
  }

  async function exportFile() {
    const result = await perform(async () => {
      const url = URL.createObjectURL(
        new Blob([JSON.stringify(validatedContent(), null, 2)], { type: 'application/json' })
      );
      const link = document.createElement('a');
      link.href = url;
      link.download = contentFile;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setStatus('content.json डाउनलोड सुरू आहे.');
    });
    if (result !== null) {
      void showDashboardToast(result ? 'success' : 'error', result ? 'JSON download started' : 'Unable to download JSON');
    }
    return result;
  }

  function importFile(event) {
    const file = event.target.files[0];
    event.target.value = '';
    if (file) {
      void perform(async () => {
        onChange(parseContent(JSON.parse(await file.text())));
        setStatus('फाइल प्रिव्ह्यूमध्ये उघडली. बदल ठेवण्यासाठी Save करा.');
      }).then((result) => {
        if (result !== null) {
          void showDashboardToast(result ? 'info' : 'error', result ? 'JSON opened for preview' : 'Unable to import JSON');
        }
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
      sidebarCollapsed={sidebarCollapsed} setSidebarCollapsed={setSidebarCollapsed}
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
            <FamilyOverview
              content={content}
              navigate={navigate}
              tasks={workspace.data.tasks}
              notifications={workspace.data.notifications}
              profileName={workspace.data.profile.name}
              lang={lang}
            />
          ) : section === 'team' ? (
            <TeamDirectory />
          ) : section === 'activity' ? (
            <NetlifyActivity lang={lang} />
          ) : (
            <>
              {/* CHANGE #8 — disabled:opacity-60 (opacity-65 is not a default Tailwind step) */}
              <fieldset disabled={!ready || busy} className="m-0 min-w-0 border-0 p-0 disabled:opacity-60">
                <div className={`${card} grid min-w-0 gap-4 ${section === 'hero' ? 'homepage-editor-form' : ''}`}>
                  <h2 className="text-xl font-bold text-slate-900">{sectionTitle}</h2>
                  {fields[section]?.map(([key, label]) => (
                    <Field
                      key={key}
                      label={t(label)}
                      value={content[section][key]}
                      multiline={key === 'description'}
                      required={['title','description','address'].includes(key)}
                      className={section === 'hero' && key === 'description' ? 'homepage-field-span-all' : ''}
                      onChange={(value) => field(section, key, value)}
                    />
                  ))}

                  {(section === 'hero' || section === 'farm') && (
                    <div className={section === 'hero' ? 'homepage-photo-field homepage-field-span-all' : ''}>
                      <Photo
                        label={t('फोटो बदला')}
                        src={content[section].image}
                        onUpload={(files) => upload(files, ([image]) => field(section, 'image', image))}
                      />
                    </div>
                  )}

                  {section === 'hero' && (
                    <div className="homepage-field-span-all grid gap-3 sm:grid-cols-3">
                      {['एकूण एकर', 'द्राक्षबाग', 'इतर पिके'].map((label, index) => (
                        <Field
                          key={label}
                          label={t(label)}
                          value={content.hero.acres[index]}
                          type="number"
                          required
                          onChange={(value) => field('hero', 'acres', replaceAt(content.hero.acres, index, value))}
                        />
                      ))}
                    </div>
                  )}

                  {section === 'farm' && <FarmRegister content={content} change={farms => set('additionalFarms', farms)} />}
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
                      <CropCreate onCreate={crop => onChange(current => ({...current,crops:[...current.crops,crop]}))} />
                      <Field
                        label={t('पिके विभागाचे शीर्षक')}
                        value={content.cropTitle}
                        onChange={(value) => set('cropTitle', value)}
                      />
                      <div className="grid gap-3 xl:grid-cols-2">
                        {content.crops.map((crop, index) => (
                          <div className={`${card} grid gap-3`} key={crop.id}>
                            <Field required label={t('पिकाचे नाव')} value={crop.name} onChange={(name) => editCrop(index, { name })} />
                            <Field label={t('English name')} value={crop.english} onChange={(english) => editCrop(index, { english })} />
                            <Field label="Growing season" value={crop.season || ''} onChange={season => editCrop(index, { season })} />
                            <label><input type="checkbox" checked={crop.visible !== false} onChange={e => editCrop(index,{visible:e.target.checked})}/> Show crop on website</label>
                            <Field label={t('वर्णन')} multiline value={crop.description} onChange={(description) => editCrop(index, { description })} />
                            <Remove
                              label={t('पीक काढा')}
                              onClick={() => set('crops', content.crops.filter((item) => item.id !== crop.id))}
                            />
                          </div>
                        ))}
                      </div>
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
                            required
                            value={group.label}
                            onChange={(label) => editGroup(groupIndex, (current) => ({ ...current, label }))}
                          />
                          <Field
                            label={t('गटाचे वर्णन')}
                            value={group.description}
                            onChange={(description) => editGroup(groupIndex, (current) => ({ ...current, description }))}
                          />
                          <div className="flex flex-wrap gap-2">
                            <span id="gallery-upload"><Upload
                              multiple
                              allowVideo
                              label="Upload photos / videos"
                              onUpload={files => perform(async () => {
                                const media = await Promise.all(files.map(async file => ({
                                  id: crypto.randomUUID(), src: await readMedia(file, true),
                                  thumb:'', caption:file.name, video:videoTypes.includes(file.type),
                                })));
                                editGroup(groupIndex, (current) => ({
                                ...current,
                                items: [...current.items, ...media],
                              }));
                              })}
                            /></span>
                            <Remove
                              label={t('गट काढा')}
                              onClick={() => set('gallery', content.gallery.filter((item) => item.id !== group.id))}
                            />
                          </div>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {group.items.map((item, index) => (
                              <div className="grid gap-2 rounded-xl border border-emerald-900/10 p-2" key={item.id}>
                                <label><input type="checkbox" checked={item.visible !== false} onChange={e => editItem(index,{visible:e.target.checked})}/> Show in public gallery</label>
                                <div className="flex gap-2">{[-1,1].map(step => <button key={step} className={action} type="button" disabled={!group.items[index+step]} onClick={()=>editGroup(groupIndex,current=>{
                                  const items = [...current.items];
                                  [items[index],items[index+step]] = [items[index+step],items[index]];
                                  return {...current,items};
                                })}>{step<0?'Move earlier':'Move later'}</button>)}</div>
                                {item.video ? (
                                  <video src={item.src.startsWith('data:') ? item.src : `${import.meta.env.BASE_URL}assets/${item.src}`} controls preload="metadata" aria-label={item.caption || 'Video preview'} style={{width:'100%',maxHeight:220}} />
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

                <div className={`editor-save-panel mt-4 grid gap-3 ${section === 'hero' ? 'homepage-field-span-all' : ''}`}>
                  <div className="editor-save-actions flex flex-wrap gap-2">
                    <button className={`${primary} editor-save-primary`} type="button" onClick={save}>{t('Save in browser')}</button>
                    {'showDirectoryPicker' in window && (
                      <button className={`${action} editor-save-secondary`} type="button" onClick={saveFolder}>{t('Save to folder')}</button>
                    )}
                    <button className={`${action} editor-save-secondary`} type="button" onClick={exportFile}>{t('Download JSON')}</button>
                    <label className={`${action} editor-save-secondary cursor-pointer focus-within:outline-2`}>
                      {t('Import JSON')}
                      <input className="sr-only" type="file" accept=".json,application/json" onChange={importFile} />
                    </label>
                    <button
                      className={`${action} editor-save-secondary`}
                      type="button"
                      onClick={() => {
                        onChange(initialContent);
                        setStatus('मूळ मजकूर प्रिव्ह्यूमध्ये आला. तो ठेवण्यासाठी Save करा.');
                      }}
                    >
                      {t('मूळ मजकूर प्रिव्ह्यू करा')}
                    </button>
                  </div>
                  <p role="status" className="m-0 text-sm text-emerald-950">
                    {!ready ? t('एडिटर लोड होत आहे…') : t(status)}
                  </p>
                  {savedAt && (
                    <p className="m-0 text-sm text-emerald-950/80">
                      <time dateTime={savedAt}>{t('शेवटचे जतन')}: {formatSavedAt(savedAt, lang)}</time>
                    </p>
                  )}
                  <p className="m-0 text-sm text-emerald-950/80">
                    {t('फाइलमधले बदल वेबसाइटवर सर्वांना दाखवण्यासाठी content.json प्रोजेक्टच्या public फोल्डरमध्ये ठेवून साइट पुन्हा प्रकाशित करा.')}
                  </p>
                </div>
                </div>
              </fieldset>
            </>
          )}
    </AdminLayout>
  );
}
