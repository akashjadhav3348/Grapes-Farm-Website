import { useEffect, useRef, useState } from 'react';
import { showDashboardToast, confirmDashboardAction } from './dashboardToast.js';
import FamilyBackup from './FamilyBackup.jsx';

/* CHANGE #1 — constants */
const STORAGE_KEY = 'farm-workspace-v1';
const NOTIFICATION_LIMIT = 50;
const DEFAULT_STATE = {
  profile: { name: 'Akash Jadhav', bio: '' },
  tasks: [],
  notifications: [],
};

/* CHANGE #2 — normalize whatever came out of storage */
function readWorkspace() {
  if (typeof window === 'undefined') return DEFAULT_STATE;
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!parsed || typeof parsed !== 'object') return DEFAULT_STATE;
    return {
      profile: {
        name: typeof parsed.profile?.name === 'string' ? parsed.profile.name : DEFAULT_STATE.profile.name,
        bio: typeof parsed.profile?.bio === 'string' ? parsed.profile.bio : '',
      },
      tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
      notifications: Array.isArray(parsed.notifications) ? parsed.notifications : [],
    };
  } catch {
    return DEFAULT_STATE;
  }
}

/* CHANGE #3 — tiny UUID fallback for insecure contexts */
function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/* =========================================================
   useWorkspace
   ========================================================= */
export function useWorkspace() {
  const [data, setData] = useState(readWorkspace);
  const [error, setError] = useState('');
  const dataRef = useRef(data);
  dataRef.current = data;

  /* CHANGE #4 — cross-tab sync */
  useEffect(() => {
    function onStorage(event) {
      if (event.key === STORAGE_KEY) setData(readWorkspace());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  /* CHANGE #5 — read the latest state via ref so back-to-back calls don't clobber */
  function update(nextOrFn, successTitle = 'Changes saved') {
    const prev = dataRef.current;
    const next = typeof nextOrFn === 'function' ? nextOrFn(prev) : nextOrFn;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setError('');
      setData(next);
      dataRef.current = next;
      void showDashboardToast('success', successTitle);
      return true;
    } catch {
      setError('Unable to save to browser storage.');
      void showDashboardToast('error', 'Unable to save changes');
      return false;
    }
  }

  function save(values, message) {
    return update((prev) => ({
      ...prev,
      ...values,
      notifications: [
        { id: newId(), text: message, actor: prev.profile.name, time: new Date().toISOString(), read: false },
        ...prev.notifications,
      ].slice(0, NOTIFICATION_LIMIT),
    }), message === 'Profile updated' ? 'Profile updated' : 'Changes saved');
  }

  return { data, update, save, error };
}

/* =========================================================
   Shared headings
   ========================================================= */
const TITLES = {
  profile: 'My profile',
  tasks: 'Farm tasks',
  settings: 'Settings',
  notifications: 'Notifications',
};

/* CHANGE #6 — small formatter that tolerates bad timestamps */
function formatTime(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown time';
  return date.toLocaleString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/* =========================================================
   Subcomponents — split for readability (CHANGE #7)
   ========================================================= */
function SettingsPanel({workspace}) {
  const [preview,setPreview] = useState(null);
  const [error,setError] = useState('');
  async function previewFile(file) {
    setPreview(null); setError('');
    if (!file) return;
    try {
      const backup = JSON.parse(await file.text());
      const data = backup.workspace;
      if (backup.format !== 'aishwary-workspace-v1' || typeof data?.profile?.name !== 'string' ||
        typeof data.profile.bio !== 'string' || !Array.isArray(data.tasks) || !Array.isArray(data.notifications) ||
        !data.tasks.every(t => typeof t?.id === 'string' && typeof t.title === 'string' && typeof t.date === 'string' && typeof t.done === 'boolean') ||
        !data.notifications.every(n => typeof n?.id === 'string' && typeof n.text === 'string' && typeof n.read === 'boolean' && Number.isFinite(Date.parse(n.time)))) throw Error();
      setPreview(data);
    } catch { setError('Select a valid Aishwary workspace backup.'); }
  }
  function download() {
    const url=URL.createObjectURL(new Blob([JSON.stringify({format:'aishwary-workspace-v1',workspace:workspace.data},null,2)],{type:'application/json'}));
    const link=document.createElement('a'); link.href=url; link.download='aishwary-workspace.json'; link.click(); setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  return (
    <div className="settings-summary">
      <article><h3>Workspace backup</h3><p>Export this browser’s profile, tasks and notifications. Public website content has a separate JSON export in its editor.</p><button className="admin-btn" onClick={download}>Download workspace backup</button>
      <label>Preview a backup<input type="file" accept=".json,application/json" onChange={e=>previewFile(e.target.files[0])}/></label>
      {error && <p role="alert">{error}</p>}
      {preview && <div><p>{preview.profile.name} · {preview.tasks.length} tasks · {preview.notifications.length} notifications</p>
      <button className="admin-btn blue" onClick={()=>{if(window.confirm('Replace the profile, tasks and notifications in this browser?') && workspace.update(preview,'Workspace restored'))setPreview(null);}}>Restore this backup</button> <button className="admin-btn" onClick={()=>setPreview(null)}>Cancel</button></div>}</article>
      <FamilyBackup />
      <article>
        <h3>Sign-in</h3>
        <p>This site uses its existing administrator sign-in. Password recovery is not configured for this account.</p>
      </article>
      <article>
        <h3>Profile</h3>
        <p>Update your dashboard display name and profile note in My profile. These settings are saved in this browser.</p>
      </article>
      <article>
        <h3>Browser saves &amp; publishing</h3>
        <p>Homepage, farm, crop and gallery edits are stored for this browser. Download content.json from a content editor and redeploy it to publish changes for visitors.</p>
      </article>
    </div>
  );
}

function ProfileForm({ data, save }) {
  const [error,setError] = useState('');
  const initial = data.profile?.name?.slice(0, 1).toUpperCase() || 'A';

  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    const bio = String(form.get('bio') ?? '').trim();
    if (!name) { setError('Enter your display name.'); return; }
    setError('');
    save({ profile: { name, bio } }, 'Profile updated');
  }

  return (
    <form className="profile-form" onSubmit={submit}>
      <div className="profile-avatar" aria-hidden="true">{initial}</div>
      <label>
        Display name
        <input name="name" required maxLength={80} defaultValue={data.profile?.name ?? ''} />
      </label>
      <label>
        About you
        <textarea name="bio" maxLength={500} defaultValue={data.profile?.bio ?? ''} />
      </label>
      {error && <p role="alert">{error}</p>}
      <button className="admin-btn blue" type="submit">Save profile</button>
      <p>Display settings do not change your login credentials.</p>
    </form>
  );
}

function TasksPanel({ data, save }) {
  const [error,setError] = useState('');
  function addTask(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') ?? '').trim();
    const date = String(form.get('date') ?? '');
    if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) { setError('Enter a task title and valid due date.'); return; }
    setError('');
    const saved = save(
      { tasks: [...data.tasks, { id: newId(), title, date, done: form.get('status') === 'completed', status:form.get('status'), priority:form.get('priority'), assignee:String(form.get('assignee') || '').trim() }] },
      'New farm task added'
    );
    if (saved) event.currentTarget.reset();
  }

  return (
    <>
      {error && <p role="alert">{error}</p>}
      <form className="task-form" onSubmit={addTask}>
        <label>
          Task
          <input name="title" required maxLength={200} placeholder="e.g. Photograph the vineyard" />
        </label>
        <label>
          Due date
          <input name="date" type="date" required />
        </label>
        <label>Assigned to<input name="assignee" maxLength={100} placeholder="Optional name"/></label>
        <label>Priority<select name="priority" defaultValue="Normal"><option>Low</option><option>Normal</option><option>High</option></select></label>
        <label>Status<select name="status" defaultValue="pending"><option value="pending">Pending</option><option value="in-progress">In progress</option><option value="completed">Completed</option></select></label>
        <button className="admin-btn blue" type="submit">Add task</button>
      </form>

      <div className="admin-table-scroll">
        <table className="admin-table">
          <caption className="sr-only">Farm tasks</caption>
          <thead>
            <tr><th>Completed</th><th>Task</th><th>Assigned to</th><th>Priority</th><th>Status</th><th>Due date</th><th>Action</th></tr>
          </thead>
          <tbody>
            {data.tasks.map((task) => (
              <tr key={task.id}>
                <td>
                  <input
                    type="checkbox"
                    checked={task.done}
                    aria-label={task.done ? `Mark "${task.title}" incomplete` : `Mark "${task.title}" complete`}
                    onChange={() => save(
                      { tasks: data.tasks.map((t) => (t.id === task.id ? { ...t, done: !t.done, status:!t.done ? 'completed' : 'pending' } : t)) },
                      task.done ? `Task reopened: ${task.title}` : `Task completed: ${task.title}`
                    )}
                  />
                </td>
                <td>{task.title}</td>
                <td>{task.assignee || 'Unassigned'}</td><td><span className="role-badge">{task.priority || 'Normal'}</span></td>
                <td><select aria-label={`Status for ${task.title}`} value={task.done ? 'completed' : task.status === 'in-progress' ? 'in-progress' : 'pending'} onChange={event => {
                  const status = event.target.value;
                  save({tasks:data.tasks.map(item => item.id === task.id ? {...item,status,done:status === 'completed'} : item)}, 'Task status updated');
                }}><option value="pending">Pending</option><option value="in-progress">In progress</option><option value="completed">Completed</option></select></td>
                <td>{task.date}</td>
                <td>
                  <button
                    className="admin-btn"
                    type="button"
                    onClick={async () => {
                      if (await confirmDashboardAction(`Delete "${task.title}"?`)) {
                        save({ tasks: data.tasks.filter((t) => t.id !== task.id) }, 'Task removed');
                      }
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!data.tasks.length && (
          <p className="empty-directory">No tasks yet. Add your first farm task above.</p>
        )}
      </div>
    </>
  );
}

function NotificationsPanel({ data, update }) {
  const [filter,setFilter] = useState('All');
  const rows = data.notifications.filter(n=>filter==='All' || n.read===(filter==='Read')).sort((a,b)=>Date.parse(b.time)-Date.parse(a.time));
  return (
    <>
      <button
        className="admin-btn"
        type="button"
        onClick={() => update((prev) => ({
          ...prev,
          notifications: prev.notifications.map((n) => ({ ...n, read: true })),
        }))}
      >
        Mark all read
      </button>

      <label className="directory-search">Filter notifications<select value={filter} onChange={e=>setFilter(e.target.value)}><option>All</option><option>Unread</option><option>Read</option></select></label>
      <div className="admin-table-scroll"><table className="admin-table"><caption className="sr-only">Workspace notifications</caption><thead><tr><th>Notification</th><th>User</th><th>Date &amp; time</th><th>Status</th><th>Action</th></tr></thead>
        <tbody>{rows.map(n=><tr key={n.id}><td>{n.text}</td><td>{n.actor || '—'}</td><td>{formatTime(n.time)}</td><td>{n.read?'Read':'Unread'}</td><td><button className="admin-btn" onClick={()=>update(prev=>({...prev,notifications:prev.notifications.map(item=>item.id===n.id?{...item,read:!item.read}:item)}))}>Mark {n.read?'unread':'read'}</button></td></tr>)}
        {!rows.length && <tr><td colSpan={5}>No notifications to show.</td></tr>}</tbody></table></div>
    </>
  );
}

/* =========================================================
   WorkspacePage
   ========================================================= */
export function WorkspacePage({ section, workspace }) {
  const { data, save, update, error } = workspace;
  const title = TITLES[section] ?? 'Workspace';

  return (
    <section className="admin-panel">
      <h2>{title}</h2>
      {section !== 'settings' && <p className="workspace-note">Saved on this browser.</p>}
      {error && <p role="alert">{error}</p>}

      {section === 'settings' && <SettingsPanel workspace={workspace} />}
      {section === 'profile' && <ProfileForm data={data} save={save} />}
      {section === 'tasks' && <TasksPanel data={data} save={save} />}
      {section === 'notifications' && <NotificationsPanel data={data} update={update} />}
    </section>
  );
}

/* =========================================================
   DashboardCharts
   ========================================================= */
/* CHANGE #8 — colors pulled from CSS variables so the new palette flows through */
const RING_COLORS = { vineyard: 'var(--brand, #4f46e5)', other: 'var(--accent, #14b8a6)' };
const BAR_COLORS = [
  'var(--brand, #4f46e5)',
  'var(--violet, #7c3aed)',
  'var(--accent, #14b8a6)',
  'var(--coral, #f97316)',
];

export function DashboardCharts({ content }) {
  const total = Number(content.hero.acres[0]) || 0;
  const grapes = Number(content.hero.acres[1]) || 0;
  const other = Number(content.hero.acres[2]) || 0;
  const denominator = total || grapes + other;
  const percentage = denominator
    ? Math.min(100, Math.max(0, (grapes / denominator) * 100))
    : 0;

  const maxItems = Math.max(1, ...content.gallery.map((g) => g.items.length));

  return (
    <div className="dashboard-charts">
      <section className="admin-panel">
        <div className="panel-heading">
          <h2>Land distribution</h2>
          <span className="role-badge">Farm overview</span>
        </div>
        <div className="land-content">
          <div
            className="land-ring"
            role="img"
            aria-label={`Vineyard ${grapes} acres, other crops ${other} acres, total ${total} acres`}
            style={{ background: `conic-gradient(${RING_COLORS.vineyard} 0 ${percentage}%, ${RING_COLORS.other} ${percentage}% 100%)` }}
          >
            <div>
              <strong>{total}</strong>
              <span>Total acres</span>
            </div>
          </div>
          <div>
            <p><i className="blue-dot" aria-hidden="true" />Vineyard <b>{grapes} acres</b></p>
            <p><i className="green-dot" aria-hidden="true" />Other crops <b>{other} acres</b></p>
          </div>
        </div>
      </section>

      <section className="admin-panel">
        <h2>Media by collection</h2>
        <p className="workspace-note">Actual photos and videos in each collection</p>
        {content.gallery.length ? (
          <div className="collection-bars" role="img" aria-label="Media count by collection">
            {content.gallery.map((g, i) => (
              <div key={g.id}>
                <strong>{g.items.length}</strong>
                <div
                  style={{
                    height: `${Math.max(3, (g.items.length / maxItems) * 130)}px`,
                    background: BAR_COLORS[i % BAR_COLORS.length],
                  }}
                />
                <span>{g.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-directory">No collections yet. Add one from the gallery section.</p>
        )}
      </section>
    </div>
  );
}
