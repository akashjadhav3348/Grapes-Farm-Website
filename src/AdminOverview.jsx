import { useEffect, useMemo, useRef, useState } from 'react';
import { photoSource } from './content.js';
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

/* =========================================================
   AdminOverview
   ========================================================= */
export default function AdminOverview({ content, navigate }) {
  const [search, setSearch] = useState('');

  /* CHANGE #3 — memoize the flattened photo list */
  const photos = useMemo(
    () => content.gallery.flatMap((group) =>
      group.items
        .filter((item) => !item.video)
        .map((item) => ({ ...item, group: group.label }))
    ),
    [content.gallery]
  );

  /* CHANGE #4 — acreage: preserve 0, guard against NaN */
  const acreage = (index) => {
    const value = Number(content.hero.acres[index]);
    return Number.isFinite(value) && value > 0 ? value : 0;
  };
  const vineyardAcres = acreage(1);
  const otherAcres = acreage(2);
  const totalAcres = vineyardAcres + otherAcres || 1; // avoid /0 in flex math

  /* CHANGE #5 — crop filter guards against undefined fields */
  const needle = search.trim().toLowerCase();
  const visibleCrops = content.crops.filter((c) => {
    if (!needle) return true;
    return `${c.name ?? ''} ${c.english ?? ''}`.toLowerCase().includes(needle);
  });

  return (
    <div className="overview-grid">
      {/* --- Farm at a glance --- */}
      <section className="admin-panel">
        <div className="panel-heading">
          <div>
            <small>YOUR FARM AT A GLANCE</small>
            <h2>Growing together.</h2>
          </div>
          <button className="admin-btn blue" onClick={() => navigate('farm')}>Manage farm</button>
        </div>
        <p>Aishwary Farms · Kumbhari</p>

        <div className="acreage-chart" role="img" aria-label={`Vineyards ${content.hero.acres[1] ?? 0} acres, other crops ${content.hero.acres[2] ?? 0} acres`}>
          <div style={{ flex: vineyardAcres / totalAcres }} />
          <div style={{ flex: otherAcres / totalAcres }} />
        </div>

        <div className="chart-legend">
          <span>● Vineyards · {content.hero.acres[1] ?? 0} acres</span>
          <span>● Other crops · {content.hero.acres[2] ?? 0} acres</span>
        </div>

        <div className="quick-actions">
          {[['hero', 'Homepage'], ['gallery', 'Photo library'], ['family', 'Family tree'], ['visit', 'Contact & security']].map(([id, label]) => (
            <button key={id} onClick={() => navigate(id)}>{label}</button>
          ))}
        </div>
      </section>

      {/* --- Violet highlight --- */}
      <section className="admin-panel violet-panel">
        <small>CONTENT WORKSPACE</small>
        <h2>Your farm.<br />Your story.</h2>
        <p>Keep photographs, crop details and family information together in one place.</p>
        <button className="admin-btn" onClick={() => navigate('gallery')}>Organize photos</button>
      </section>

      {/* --- Crops table --- */}
      <section className="admin-panel wide-panel">
        <div className="panel-heading">
          <div>
            <small>FARM INVENTORY</small>
            <h2>Crops &amp; collections</h2>
          </div>
          <label>
            Search crops
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name…"
            />
          </label>
        </div>

        <div className="admin-table-scroll">
          <table className="admin-table">
            <caption className="sr-only">Crops and collections</caption>
            <thead>
              <tr><th>Crop</th><th>Name</th><th>Description</th><th>Action</th></tr>
            </thead>
            <tbody>
              {visibleCrops.map((c) => (
                <tr key={c.id}>
                  <td><PhotoDialog src={c.photo} alt={c.alt} /></td>
                  <td><strong>{c.english}</strong><br />{c.name}</td>
                  <td>{c.description}</td>
                  <td><button className="admin-btn" onClick={() => navigate('crops')}>Edit crop</button></td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* CHANGE #6 — empty state for search */}
          {!visibleCrops.length && (
            <p className="empty-directory">
              {needle ? `No crops match “${search}”.` : 'No crops yet. Add one from the Crops section.'}
            </p>
          )}
        </div>
      </section>

      {/* --- Photo library --- */}
      <section className="admin-panel wide-panel">
        <div className="panel-heading">
          <div>
            <small>FROM THE FIELDS</small>
            <h2>Photo library</h2>
          </div>
          <button className="admin-btn blue" onClick={() => navigate('gallery')}>Upload &amp; manage</button>
        </div>

        {photos.length ? (
          <div className="photo-strip">
            {photos.slice(0, 8).map((p) => (
              <figure key={p.id}>
                <PhotoDialog src={p.thumb || p.src} alt={p.caption} />
                {p.group && <figcaption>{p.group}</figcaption>}
              </figure>
            ))}
          </div>
        ) : (
          /* CHANGE #7 — empty state */
          <p className="empty-directory">No photos yet. Upload the first ones from the gallery section.</p>
        )}
      </section>
    </div>
  );
}

/* =========================================================
   TeamDirectory
   ========================================================= */
export function TeamDirectory() {
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
      return true;
    } catch {
      setMessage('Could not save. Browser storage may be full.');
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

    const next = editing
      ? members.map((m) => (m.id === editing.id ? { ...m, ...fields, name, email, role } : m))
      : [...members, { ...fields, name, email, role, id: crypto.randomUUID() }];

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

      <div className="admin-table-scroll">
        <table className="admin-table">
          <caption className="sr-only">Team directory</caption>
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role label</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{m.email}</td>
                <td><span className="role-badge">{m.role}</span></td>
                <td>
                  <button className="admin-btn" onClick={() => openEdit(m)}>Edit</button>{' '}
                  <button
                    className="admin-btn"
                    onClick={() => {
                      if (window.confirm(`Remove ${m.name} from the directory?`)) {
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