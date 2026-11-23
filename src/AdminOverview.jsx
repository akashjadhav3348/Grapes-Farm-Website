import { useEffect, useMemo, useRef, useState } from 'react';
import { showDashboardToast, confirmDashboardAction } from './dashboardToast.js';
import { photoSource } from './content.js';
import FamilyAnalytics from './FamilyAnalytics.jsx';
import FarmTrend from './FarmTrend.jsx';
import NetlifyActivity from './NetlifyActivity.jsx';
import './admin-theme.css';

/* CHANGE #1 — constant for the storage key */
const TEAM_KEY = 'farm-team-directory';
const TEAM_ROLES = ['User', 'Admin'];

/* =========================================================
   PhotoDialog
   ========================================================= */
export function PhotoDialog({ src, alt = '' }) {
  const dialog = useRef(null);
  const resolved = photoSource(src);

  return (
    <>
      <button
        className="photo-preview"
        type="button"
        onClick={() => dialog.current?.showModal()}
        /* CHANGE #2 — richer label when alt exists */
        aria-label={alt ? `Enlarge ${alt}` : 'Enlarge photo'}
      >
        {resolved ? (
          <img src={resolved} alt={alt} loading="lazy" />
        ) : (
          <span className="photo-preview-empty" aria-hidden="true">—</span>
        )}
      </button>
      <dialog ref={dialog} className="admin-dialog" aria-label={alt || 'Photo preview'}>
        <form method="dialog">
          <button className="admin-btn">Close preview</button>
        </form>
        {resolved && <img className="expanded-photo" src={resolved} alt={alt} />}
      </dialog>
    </>
  );
}

function localDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isUpcoming(date, today, end) {
  return date && date >= today && date <= end;
}

function nextBirthdayWithinMonth(birthDate, today, end) {
  const date = localDate(birthDate);
  if (!date) return false;
  const next = new Date(today.getFullYear(), date.getMonth(), date.getDate());
  if (next < today) next.setFullYear(next.getFullYear() + 1);
  return next <= end;
}

function relativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  const minutes = Math.max(0, Math.floor((Date.now() - date.getTime()) / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} d ago`;
}

function taskState(task, today) {
  if (task.done || task.status === 'done' || task.status === 'completed') return 'completed';
  if (['in-progress', 'in_progress', 'running'].includes(task.status)) return 'inProgress';
  const due = localDate(task.date);
  return due && due < today ? 'overdue' : 'pending';
}

/* =========================================================
   AdminOverview
   ========================================================= */
export default function AdminOverview({
  content, navigate, members = [], tasks = [], notifications = [],
  generations = [], profileName = 'Administrator', lang = 'en',
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monthEnd = new Date(today);
  monthEnd.setDate(monthEnd.getDate() + 30);
  const photoCount = useMemo(
    () => content.gallery.reduce((total, group) => total + group.items.filter((item) => !item.video).length, 0),
    [content.gallery],
  );
  const pendingTasks = tasks.filter((task) => taskState(task, today) !== 'completed').length;
  const upcomingEvents = tasks.filter((task) => {
    const date = localDate(task.date);
    return taskState(task, today) !== 'completed' && isUpcoming(date, today, monthEnd);
  }).length + members.filter((member) => nextBirthdayWithinMonth(member.birthDate, today, monthEnd)).length;
  const taskStates = [
    { key: 'completed', label: 'Completed', color: '#188653', value: tasks.filter((task) => taskState(task, today) === 'completed').length },
    { key: 'inProgress', label: 'In progress', color: '#1687ef', value: tasks.filter((task) => taskState(task, today) === 'inProgress').length },
    { key: 'pending', label: 'Pending', color: '#f5a623', value: tasks.filter((task) => taskState(task, today) === 'pending').length },
    { key: 'overdue', label: 'Overdue', color: '#d65d56', value: tasks.filter((task) => taskState(task, today) === 'overdue').length },
  ];
  let cursor = 0;
  const taskGradient = taskStates.map((state) => {
    const start = cursor;
    cursor += tasks.length ? state.value / tasks.length * 100 : 0;
    return `${state.color} ${start}% ${cursor}%`;
  }).join(', ');
  const activity = [...notifications].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 5);
  const unread = activity.filter((item) => !item.read);
  const upcomingTaskList = tasks
    .filter((task) => {
      const date = localDate(task.date);
      return taskState(task, today) !== 'completed' && isUpcoming(date, today, monthEnd);
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 3);

  const metrics = [
    { label: 'Family Members', value: members.length, icon: 'bi-people', detail: 'Private family records' },
    { label: 'Farms', value: 1 + (content.additionalFarms?.length ?? 0), icon: 'bi-flower1', detail: 'Registered farms' },
    { label: 'Crops', value: content.crops.length, icon: 'bi-basket2', detail: 'Crop types listed' },
    { label: 'Gallery Images', value: photoCount, icon: 'bi-images', detail: 'Photos, excluding video' },
    { label: 'Pending Tasks', value: pendingTasks, icon: 'bi-list-check', detail: 'Tasks not completed' },
    { label: 'Upcoming Events', value: upcomingEvents, icon: 'bi-calendar-event', detail: 'Next 30 days' },
  ];

  return <div className="dashboard-overview-layout">
    <div className="dashboard-overview-main">
      <header className="overview-welcome">
        <div>
          <h1 id="admin-title">Welcome back, {profileName} 👋</h1>
          <p>Aishwary Farms — Your family, your heritage, your digital home.</p>
        </div>
        <time className="overview-live">{today.toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'})}</time>
      </header>

      <section className="overview-hero" aria-label="Farm homepage preview">
        <img src={photoSource(content.hero.image)} alt={content.hero.caption} />
        <div className="overview-hero-copy">
          <i className="bi bi-flower1" aria-hidden="true" />
          <h2>Aishwary Farms</h2>
          <p>Family • Farming • Heritage</p>
        </div>
      </section>

      <dl className="overview-kpis">
        {metrics.map((metric) => <div className="overview-kpi" key={metric.label}>
          <span className="overview-kpi-icon"><i className={`bi ${metric.icon}`} aria-hidden="true" /></span>
          <div><dt>{metric.label}</dt><dd>{metric.value}</dd><small>{metric.detail}</small></div>
          <svg className="overview-kpi-wave" viewBox="0 0 300 48" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 25 C48 4 83 42 135 26 S219 4 300 25 V48 H0Z" />
          </svg>
        </div>)}
      </dl>

      <div className="reference-charts"><FarmTrend farms={metrics[1].value} crops={content.crops.length}/>

      <section className="overview-card"><h2>Task Status</h2><div className="task-status-content"><div className="task-status-donut" style={{background:tasks.length ? `conic-gradient(${taskGradient})` : '#e3eaf1'}}><div><strong>{tasks.length}</strong><span>Total tasks</span></div></div><ul className="task-status-legend">{taskStates.map(s=><li key={s.key}><span><i style={{background:s.color}}/>{s.label}</span><strong>{s.value}</strong></li>)}</ul></div></section></div>
      <div className="overview-bottom-grid">
        <section className="overview-card recent-activity-card">
          <div className="overview-card-heading"><div><span className="overview-eyebrow">LATEST CHANGES</span><h2>Recent Activities</h2></div></div>
          {activity.length ? <div className="admin-table-scroll"><table className="admin-table"><thead><tr><th>Activity</th><th>User</th><th>Date &amp; time</th></tr></thead><tbody>
            {activity.map(item=><tr key={item.id}><td>{item.text}</td><td>{item.actor || 'Unrecorded'}</td><td><time dateTime={item.time}>{new Date(item.time).toLocaleString('en-IN')}</time></td></tr>)}
          </tbody></table></div> : <p className="overview-empty">Saved workspace changes will appear here.</p>}
        </section>

        <section className="overview-card quick-actions-card">
          <div className="overview-card-heading"><div><span className="overview-eyebrow">SHORTCUTS</span><h2>Quick Actions</h2></div></div>
          <div className="overview-quick-actions">
            {[
              ['family-tree', 'Add Family Member', 'bi-person-plus'],
              ['farm', 'Add Farm', 'bi-plus-square'],
              ['crops', 'Add Crop', 'bi-basket2'],
              ['gallery', 'Upload Photo', 'bi-cloud-arrow-up'],
              ['tasks', 'Create Task', 'bi-calendar-plus'],
              ['hero', 'Manage Homepage', 'bi-house-gear'],
            ].map(([section, label, icon]) => <button key={section} type="button" onClick={() => navigate(section, '', section === 'hero' ? '' : 'add')}>
              <i className={`bi ${icon}`} aria-hidden="true" /><span>{label}</span><i className="bi bi-arrow-up-right action-arrow" aria-hidden="true" />
            </button>)}
          </div>
        </section>
      </div>

      <FamilyAnalytics members={members} generations={generations} navigate={navigate} tasks={tasks} mode="dashboard" />

      {upcomingTaskList.length > 0 && <section className="overview-card upcoming-list">
        <div className="overview-card-heading"><div><span className="overview-eyebrow">NEXT 30 DAYS</span><h2>Upcoming Tasks</h2></div><button type="button" className="overview-link" onClick={() => navigate('tasks')}>Open calendar <i className="bi bi-arrow-right" aria-hidden="true" /></button></div>
        {upcomingTaskList.map((task) => <div className="upcoming-task" key={task.id}><strong>{task.title}</strong><time dateTime={task.date}>{localDate(task.date)?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</time></div>)}
      </section>}
    </div>

    <aside className="dashboard-overview-rail">
      <section className="overview-card overview-netlify">
        <NetlifyActivity lang={lang} compact onViewAll={() => navigate('activity')} />
      </section>
      <section className="overview-card overview-notifications">
        <div className="overview-card-heading"><div><span className="overview-eyebrow">WORKSPACE UPDATES</span><h2>Recent Notifications</h2></div><span className="notification-count">{unread.length}</span></div>
        {activity.length ? <ul className="overview-notification-list">
          {activity.slice(0, 5).map((item) => <li key={item.id}><span className="notification-unread-dot" style={item.read ? {background:'#a4b3ad'} : undefined} /><div><strong>{item.text}</strong><time dateTime={item.time}>{relativeTime(item.time)}</time></div></li>)}
        </ul> : <p className="overview-empty">You’re all caught up. New workspace notifications will appear here.</p>}
        <button type="button" className="overview-link" onClick={() => navigate('notifications')}>View all notifications <i className="bi bi-arrow-right" aria-hidden="true" /></button>
      </section>
    </aside>

  </div>;
}

/* =========================================================
   TeamDirectory
   ========================================================= */
export function TeamDirectory() {
  const [query,setQuery] = useState('');
  /* CHANGE #8 — SSR-safe initial read */
  const [members, setMembers] = useState(() => readTeam());
  const [message, setMessage] = useState('');
  const dialog = useRef(null);
  const [editing, setEditing] = useState(null);

  /* CHANGE #9 — sync across tabs */
  useEffect(() => {
    function onStorage(event) {
      if (event.key === TEAM_KEY) setMembers(readTeam());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  function persist(next) {
    try {
      localStorage.setItem(TEAM_KEY, JSON.stringify(next));
      setMembers(next);
      setMessage('Team directory saved in this browser.');
      void showDashboardToast('success', 'Team directory saved');
      return true;
    } catch {
      setMessage('Could not save. Browser storage may be full.');
      void showDashboardToast('error', 'Unable to save team directory');
      return false;
    }
  }

  function openNew() {
    setEditing(null);
    setMessage('');            // CHANGE #10 — clear stale message
    dialog.current?.showModal();
  }

  function openEdit(member) {
    setEditing(member);
    setMessage('');
    dialog.current?.showModal();
  }

  function save(event) {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    /* CHANGE #11 — trim + lowercase both sides */
    const email = String(fields.email ?? '').trim().toLowerCase();
    const name = String(fields.name ?? '').trim();
    const role = TEAM_ROLES.includes(fields.role) ? fields.role : 'User';

    if (!name || !email) {
      setMessage('Name and email are required.');
      return;
    }
    if (members.some((m) => m.id !== editing?.id && m.email.toLowerCase() === email)) {
      setMessage('That email already exists.');
      return;
    }
    const mobile = String(fields.mobile ?? '').trim();
    if (mobile && !/^[+\d ()-]{7,24}$/.test(mobile)) {
      setMessage('Enter a valid mobile number.');
      return;
    }

    const next = editing
      ? members.map((m) => (m.id === editing.id ? { ...m, ...fields, name, email, role, mobile } : m))
      : [...members, { ...fields, name, email, role, mobile, id: crypto.randomUUID(), createdAt: new Date().toISOString() }];

    if (persist(next)) dialog.current?.close();
  }

  return (
    <section className="admin-panel">
      <div className="panel-heading">
        <div>
          <small>PEOPLE &amp; RESPONSIBILITIES</small>
          <h2>Team directory</h2>
        </div>
        <button className="admin-btn blue" onClick={openNew}>Add member</button>
      </div>

      <p>Directory records only. Assigning an Admin label here does not grant login access. Additional sign-in accounts require a shared server-side account store.</p>
      <p role="status">{message}</p>
      <label className="directory-search">Search team<input type="search" placeholder="Name, email or role" value={query} onChange={e=>setQuery(e.target.value)}/></label>

      <div className="admin-table-scroll">
        <table className="admin-table">
          <caption className="sr-only">Team directory</caption>
          <thead>
            <tr><th>Member</th><th>Contact</th><th>Role</th><th>Status</th><th>Added</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {members.filter(m=>[m.name,m.email,m.role].join(' ').toLowerCase().includes(query.trim().toLowerCase())).map((m) => (
              <tr key={m.id}>
                <td><div className="directory-person"><span aria-hidden="true">{m.name.slice(0,1)}</span><strong>{m.name}</strong></div></td>
                <td>{m.email}{m.mobile && <small className="directory-mobile">{m.mobile}</small>}</td>
                <td><span className="role-badge">{m.role}</span></td>
                <td>{m.status || 'Active'}</td><td>{m.createdAt ? new Date(m.createdAt).toLocaleDateString('en-IN') : '—'}</td>
                <td>
                  <button className="admin-btn" onClick={() => openEdit(m)}>Edit</button>{' '}
                  <button
                    className="admin-btn"
                    onClick={async () => {
                      if (await confirmDashboardAction(`Remove ${m.name} from the directory?`)) {
                        persist(members.filter((x) => x.id !== m.id));
                      }
                    }}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!members.length && (
          <p className="empty-directory">Your team directory is empty. Add your first member.</p>
        )}
      </div>

      <dialog className="admin-dialog" ref={dialog} aria-labelledby="team-dialog-title">
        <form key={editing?.id || 'new'} onSubmit={save}>
          <h2 id="team-dialog-title">{editing ? 'Edit member' : 'Add team member'}</h2>
          <label>Full name
            <input name="name" required maxLength={100} defaultValue={editing?.name || ''} />
          </label>
          <label>Email
            <input name="email" type="email" required defaultValue={editing?.email || ''} />
          </label>
          <label>Mobile number<input type="tel" name="mobile" maxLength={24} defaultValue={editing?.mobile || ''}/></label>
          <label>Status<select name="status" defaultValue={editing?.status || 'Active'}><option>Active</option><option>Inactive</option></select></label>
          <label>Role label
            <select name="role" defaultValue={TEAM_ROLES.includes(editing?.role) ? editing.role : 'User'}>
              {TEAM_ROLES.map((role) => <option key={role}>{role}</option>)}
            </select>
          </label>
          {/* CHANGE #12 — status only inside the dialog so there's no double announcement */}
          {message && <p role="status">{message}</p>}
          <div className="quick-actions">
            <button type="submit" className="admin-btn blue">Save member</button>
            <button type="button" className="admin-btn" onClick={() => dialog.current?.close()}>Cancel</button>
          </div>
        </form>
      </dialog>
    </section>
  );
}

/* CHANGE #13 — single source of truth for reading team data */
function readTeam() {
  if (typeof window === 'undefined') return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(TEAM_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
