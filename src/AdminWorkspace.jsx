import { useEffect, useRef, useState } from 'react';

/* CHANGE #1 — constants */
const STORAGE_KEY = 'farm-workspace-v1';
const NOTIFICATION_LIMIT = 50;
const DEFAULT_STATE = {
  profile: { name: 'Administrator', bio: '' },
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
  function update(nextOrFn) {
    const prev = dataRef.current;
    const next = typeof nextOrFn === 'function' ? nextOrFn(prev) : nextOrFn;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setError('');
      setData(next);
      dataRef.current = next;
    } catch {
      setError('Unable to save to browser storage.');
    }
  }

  function save(values, message) {
    update((prev) => ({
      ...prev,
      ...values,
      notifications: [
        { id: newId(), text: message, time: new Date().toISOString(), read: false },
        ...prev.notifications,
      ].slice(0, NOTIFICATION_LIMIT),
    }));
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
function SettingsPanel() {
  return (
    <div className="settings-summary">
      <article>
        <h3>Family data</h3>
        <p>Member details, photos and relationship links are available only to the signed-in family administrator.</p>
      </article>
      <article>
        <h3>Sign-in</h3>
        <p>This site uses its existing administrator sign-in. Password recovery is not configured for this account.</p>
      </article>
      <article>
        <h3>Profile</h3>
        <p>Update your dashboard display name and profile note in My profile. These settings are saved in this browser.</p>
      </article>
    </div>
  );
}

function ProfileForm({ data, save }) {
  const initial = data.profile?.name?.slice(0, 1).toUpperCase() || 'A';

  function submit(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') ?? '').trim();
    const bio = String(form.get('bio') ?? '').trim();
    if (!name) return;
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
      <button className="admin-btn blue" type="submit">Save profile</button>
      <p>Display settings do not change your login credentials.</p>
    </form>
  );
}

function TasksPanel({ data, save }) {
  function addTask(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const title = String(form.get('title') ?? '').trim();
    const date = String(form.get('date') ?? '');
    if (!title || !date) return;
    save(
      { tasks: [...data.tasks, { id: newId(), title, date, done: false }] },
      'New farm task added'
    );
    event.currentTarget.reset();
  }

  return (
    <>
      <form className="task-form" onSubmit={addTask}>
        <label>
          Task
          <input name="title" required maxLength={200} placeholder="e.g. Photograph the vineyard" />
        </label>
        <label>
          Due date
          <input name="date" type="date" required />
        </label>
        <button className="admin-btn blue" type="submit">Add task</button>
      </form>

      <div className="admin-table-scroll">
        <table className="admin-table">
          <caption className="sr-only">Farm tasks</caption>
          <thead>
            <tr><th>Completed</th><th>Task</th><th>Due date</th><th>Action</th></tr>
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
                      { tasks: data.tasks.map((t) => (t.id === task.id ? { ...t, done: !t.done } : t)) },
                      task.done ? `Task reopened: ${task.title}` : `Task completed: ${task.title}`
                    )}
                  />
                </td>
                <td>{task.title}</td>
                <td>{task.date}</td>
                <td>
                  <button
                    className="admin-btn"
                    type="button"
                    onClick={() => {
                      if (window.confirm(`Delete "${task.title}"?`)) {
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

      <div className="notification-list">
        {data.notifications.map((n) => (
          <article key={n.id} className={n.read ? 'read' : ''}>
            <span className="notification-dot" aria-hidden="true" />
            <div>
              <strong>{n.text}</strong>
              <p>{formatTime(n.time)}</p>
            </div>
          </article>
        ))}
        {!data.notifications.length && (
          <p className="empty-directory">No notifications yet. Profile and task changes appear here.</p>
        )}
      </div>
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

      {section === 'settings' && <SettingsPanel />}
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