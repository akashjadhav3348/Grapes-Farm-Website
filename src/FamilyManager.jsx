import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { showDashboardToast, confirmDashboardAction } from './dashboardToast.js';
import './family-admin.css';

const emptyFields = {
  name: '',
  gender: 'unknown',
  birthDate: '',
  photo: '',
  notes: '',
  profession: '',
  status: '',
  fatherId: '',
  motherId: '',
};

/* CHANGE #1 — guards for optional fields */
function parentIds(member) {
  return [member?.fatherId, member?.motherId].filter(Boolean);
}

function spouseIdsOf(member) {
  return Array.isArray(member?.spouseIds) ? member.spouseIds : [];
}

/* CHANGE #2 — guard cycle + missing spouseIds */
export function generationsFor(members) {
  const byId = new Map(members.map((member) => [member.id, member]));
  const levels = new Map();
  function resolve(id, active = new Set()) {
    if (levels.has(id)) return levels.get(id);
    if (active.has(id)) return 0;
    const member = byId.get(id);
    if (!member) return 0;
    const nextActive = new Set(active).add(id);
    const parents = parentIds(member);
    let level = 0;
    if (parents.length) {
      level = 1 + Math.max(...parents.map((parentId) => resolve(parentId, nextActive)));
    } else {
      const spouseWithParents = spouseIdsOf(member)
        .map((spouseId) => byId.get(spouseId))
        .find((spouse) => spouse && parentIds(spouse).length);
      if (spouseWithParents) level = resolve(spouseWithParents.id, nextActive);
    }
    levels.set(id, level);
    return level;
  }
  for (const member of members) resolve(member.id);
  const maximum = Math.max(0, ...levels.values());
  return Array.from({ length: maximum + 1 }, (_, level) =>
    members
      .filter((member) => levels.get(member.id) === level)
      /* CHANGE #3 — stable ordering inside a row */
      .sort((a, b) => a.name.localeCompare(b.name))
  );
}

function initials(name) {
  const parts = String(name ?? '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
  const result = parts.map((part) => part[0] ?? '').join('').toUpperCase();
  return result || '?';                       /* CHANGE #4 — never empty */
}

function genderLabel(gender) {
  return gender === 'male' ? 'Male' : gender === 'female' ? 'Female' : 'Not specified';
}

function escapeSvg(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[character]);
}

function familyTreeSvg(members, generations) {
  const cardWidth = 218;
  const cardHeight = 118;
  const width = Math.max(800, ...generations.map((row) => row.length * 244 + 64));
  const height = Math.max(220, generations.length * 250 + 70);
  const positions = new Map();
  generations.forEach((row, generationIndex) => {
    const gap = (width - row.length * cardWidth) / (row.length + 1);
    row.forEach((member, index) => positions.set(member.id, {
      x: gap * (index + 1) + cardWidth * index,
      y: 28 + generationIndex * 250,
    }));
  });
  const links = [];
  for (const member of members) {
    const child = positions.get(member.id);
    if (!child) continue;
    for (const parentId of parentIds(member)) {
      const parent = positions.get(parentId);
      if (!parent) continue;
      const middle = (parent.y + cardHeight + child.y) / 2;
      links.push(`<path d="M ${parent.x + cardWidth / 2} ${parent.y + cardHeight} V ${middle} H ${child.x + cardWidth / 2} V ${child.y}" />`);
    }
    for (const spouseId of spouseIdsOf(member)) {
      if (member.id > spouseId) continue;
      const spouse = positions.get(spouseId);
      if (!spouse) continue;
      const left = Math.min(child.x, spouse.x);
      const right = Math.max(child.x, spouse.x);
      links.push(`<path class="spouse" d="M ${left + cardWidth} ${child.y + cardHeight / 2} H ${right}" />`);
    }
  }
  const cards = generations.flatMap((row, generationIndex) => row.map((member) => {
    const { x, y } = positions.get(member.id);
    const details = `${genderLabel(member.gender)}${member.birthDate ? ` · ${member.birthDate.slice(0, 4)}` : ''} · Generation ${generationIndex + 1}`;
    return `<g><rect x="${x}" y="${y}" width="${cardWidth}" height="${cardHeight}" rx="12" fill="#fff" stroke="#e2e8f0"/><circle cx="${x + 34}" cy="${y + 35}" r="22" fill="#eff6ff"/><text x="${x + 34}" y="${y + 40}" text-anchor="middle" class="initials">${escapeSvg(initials(member.name))}</text><text x="${x + 66}" y="${y + 31}" class="name">${escapeSvg(String(member.name).slice(0, 25))}</text><text x="${x + 66}" y="${y + 51}" class="detail">${escapeSvg(details)}</text><text x="${x + 18}" y="${y + 88}" class="detail">${escapeSvg(member.profession || member.status || 'Family member')}</text></g>`;
  })).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><title>Family tree</title><style>text{font-family:Arial,sans-serif}.name{font-size:13px;font-weight:700;fill:#17365d}.detail{font-size:10px;fill:#64748b}.initials{font-size:12px;font-weight:700;fill:#2563eb}path{fill:none;stroke:#8c9add;stroke-width:2}.spouse{stroke:#edaa6a;stroke-dasharray:6 5}</style>${links.join('')}${cards}</svg>`;
}

/* CHANGE #5 — guard id */
function memberLabel(member) {
  const id = String(member.id ?? '');
  const details = [genderLabel(member.gender), member.birthDate, id ? `ID ${id.slice(-6)}` : ''].filter(Boolean);
  return `${member.name} · ${details.join(' · ')}`;
}

import { familyData } from './localFamily.js';
async function requestFamily(method = 'GET', body) {
  try {
    const response = await familyData({
      method,
      cache: 'no-store',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    /* CHANGE #6 — 401 is a re-auth signal, not a data error */
    if (response.status === 401) {
      const error = new Error('Your session expired. Please sign in again.');
      error.status = 401;
      throw error;
    }
    const result = await response.json().catch(() => null);
    if (!response.ok) throw new Error(result?.message || 'Family data could not be loaded.');
    if (method !== 'GET') {
      const successTitle = {
        POST: 'Family member added',
        PATCH: 'Family member updated',
        DELETE: 'Family member deleted',
      }[method] || 'Family changes saved';
      void showDashboardToast('success', successTitle);
    }
    return result;
  } catch (error) {
    if (method !== 'GET') {
      void showDashboardToast('error', error.message || 'Family changes could not be saved.');
    }
    throw error;
  }
}

function fileAsDataURL(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type) || file.size > 900_000) {
      reject(new Error('Choose a JPG, PNG, WebP or AVIF photo up to 900 KB.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('Photo could not be read.'));
    reader.readAsDataURL(file);
  });
}

function ParentPicker({ label, members, value, onChange, excludeId }) {
  const [query, setQuery] = useState('');
  const options = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const candidates = members.filter((member) => member.id !== excludeId);
    const matches = needle
      ? candidates.filter((member) => String(member.name ?? '').toLowerCase().includes(needle))
      : candidates;
    const selected = candidates.find((member) => member.id === value);
    return selected && !matches.some((member) => member.id === selected.id)
      ? [selected, ...matches]
      : matches;
  }, [excludeId, members, query, value]);
  const selected = members.find((member) => member.id === value);
  return (
    <div className="family-parent-picker">
      <label>{label} search
        <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${label.toLowerCase()} by name`} />
      </label>
      <label>{label}
        <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
          <option value="">No {label.toLowerCase()} selected</option>
          {options.map((member) => <option key={member.id} value={member.id}>{memberLabel(member)}</option>)}
        </select>
      </label>
      {query && !options.length && <p className="family-selected-parent">No matches for “{query}”.</p>}
      {selected && <p className="family-selected-parent">Selected: {memberLabel(selected)}</p>}
    </div>
  );
}

function Parents({ member, members }) {
  const father = members.find((candidate) => candidate.id === member.fatherId);
  const mother = members.find((candidate) => candidate.id === member.motherId);
  return (
    <dl className="family-detail-relations">
      <div><dt>Father</dt><dd>{father ? memberLabel(father) : 'Not recorded'}</dd></div>
      <div><dt>Mother</dt><dd>{mother ? memberLabel(mother) : 'Not recorded'}</dd></div>
    </dl>
  );
}

function AddMemberDialog({ open, onClose, family, initialParentId, initialGender, relationTarget, onSaved }) {
  const dialog = useRef(null);
  const [fields, setFields] = useState(emptyFields);
  const [mode, setMode] = useState('parents');
  const [existingId, setExistingId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const requestId = useRef('');
  const members = family?.members ?? [];
  const existing = members.find((member) => member.id === existingId);
  const father = members.find((member) => member.id === fields.fatherId);
  const mother = members.find((member) => member.id === fields.motherId);
  const duplicates = fields.name.trim()
    ? members.filter((member) => String(member.name ?? '').trim().toLowerCase() === fields.name.trim().toLowerCase())
    : [];
  const memberName = existing?.name || fields.name.trim() || 'The new member';
  const relationship = fields.gender === 'male' ? 'son' : fields.gender === 'female' ? 'daughter' : 'child';
  const previewParents = [
    mode === 'parents' && father ? father.name : '',
    mode === 'parents' && mother ? mother.name : '',
  ].filter(Boolean);
  const relationMember = members.find((member) => member.id === relationTarget?.id);
  const preview = relationTarget?.type === 'spouse'
    ? `${memberName} will be linked as a spouse of ${relationMember?.name ?? 'the selected member'}.`
    : relationTarget?.type === 'parent'
      ? `${memberName} will be recorded as the ${relationTarget.role} of ${relationMember?.name ?? 'the selected member'}.`
      : previewParents.length
        ? `${memberName} is the ${relationship} of ${previewParents.join(' and ')}.`
        : `${memberName} will be added without known parents.`;

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  /* CHANGE #8 — drop `members` from deps so a background reload doesn't wipe input */
  useEffect(() => {
    if (!open) return;
    setFields({
      ...emptyFields,
      gender: initialGender,
      ...(initialParentId ? {
        [members.find((person) => person.id === initialParentId)?.gender === 'female' ? 'motherId' : 'fatherId']: initialParentId,
      } : {}),
    });
    setMode('parents');
    setExistingId('');
    setError('');
    requestId.current = '';
  }, [initialGender, initialParentId, open]);

  function update(key, value) {
    if (fields[key] !== value) requestId.current = '';
    if (key === 'name') setExistingId('');
    setFields((current) => ({ ...current, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    try {
      if (existing) {
        const relation = relationTarget?.type === 'spouse'
          ? { id: relationTarget.id, linkSpouseId: existing.id }
          : relationTarget?.type === 'parent'
            ? { id: relationTarget.id, [relationTarget.role === 'father' ? 'fatherId' : 'motherId']: existing.id }
            : {
              id: existing.id,
              fatherId: mode === 'parents' && fields.fatherId ? fields.fatherId : existing.fatherId ?? '',
              motherId: mode === 'parents' && fields.motherId ? fields.motherId : existing.motherId ?? '',
            };
        const result = await requestFamily('PATCH', relation);
        onSaved(result);
      } else {
        if (!requestId.current) requestId.current = crypto.randomUUID();
        const result = await requestFamily('POST', {
          ...fields,
          fatherId: mode === 'parents' ? fields.fatherId : '',
          motherId: mode === 'parents' ? fields.motherId : '',
          ...(relationTarget?.type === 'spouse' ? { spouseOfId: relationTarget.id } : {}),
          ...(relationTarget?.type === 'parent' ? { parentOfId: relationTarget.id, parentRole: relationTarget.role } : {}),
          requestId: requestId.current,
        });
        requestId.current = '';
        onSaved(result);
      }
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <dialog ref={dialog} className="family-dialog" onClose={onClose} aria-labelledby="family-dialog-title">
      <form onSubmit={submit}>
        <div className="family-dialog-heading">
          <div><p className="family-eyebrow">Family directory</p><h2 id="family-dialog-title">{relationTarget?.type === 'spouse'
            ? `Add spouse for ${relationMember?.name ?? 'member'}`
            : relationTarget?.type === 'parent'
              ? `Add ${relationTarget.role} for ${relationMember?.name ?? 'member'}`
              : initialParentId
                ? `Add child to ${members.find((member) => member.id === initialParentId)?.name ?? 'member'}`
                : 'Add family member'}</h2></div>
          <button type="button" className="family-icon-button" aria-label="Close dialog" onClick={onClose}>×</button>
        </div>
        <label>Full name
          <input required autoFocus maxLength={120} value={fields.name} onChange={(event) => update('name', event.target.value)} placeholder="Enter the person's full name" />
        </label>
        {duplicates.length > 0 && (
          <fieldset className="family-duplicate-list">
            <legend>People with this name already exist</legend>
            <p>Choose an existing person to link their parent records instead of creating a duplicate.</p>
            {duplicates.map((member) => (
              <label className="family-duplicate-option" key={member.id}>
                <input type="radio" name="existing-member" checked={existingId === member.id} onChange={() => { setExistingId(member.id); setMode('parents'); }} />
                <span><strong>{member.name}</strong><small>{memberLabel(member)}</small></span>
              </label>
            ))}
            {existingId && <button className="family-text-button" type="button" onClick={() => { requestId.current = ''; setExistingId(''); }}>Create a new person instead</button>}
          </fieldset>
        )}
        {!existing && <>
          <label>Gender for family wording
            <select value={fields.gender} onChange={(event) => update('gender', event.target.value)}>
              <option value="unknown">Not specified</option><option value="male">Male</option><option value="female">Female</option>
            </select>
          </label>
          <fieldset className="family-mode">
            <legend>Parent information</legend>
            <label><input type="radio" name="parent-mode" checked={mode === 'parents'} onChange={() => { requestId.current = ''; setMode('parents'); }} /> Link to existing parent(s)</label>
            <label><input type="radio" name="parent-mode" checked={mode === 'unknown'} onChange={() => { requestId.current = ''; setMode('unknown'); }} /> Add without known parents</label>
          </fieldset>
        </>}
        {mode === 'parents' && <>
          {initialParentId && <p className="family-parent-hint">
            Selected family member: <strong>{members.find((member) => member.id === initialParentId)?.name ?? 'Unknown member'}</strong>.
            This person is preselected below. You can correct the parent field; the other parent stays blank until you select someone.
          </p>}
          <div className="family-parent-grid">
          <ParentPicker label="Father" members={members} value={fields.fatherId} excludeId={existing?.id} onChange={(value) => update('fatherId', value)} />
          <ParentPicker label="Mother" members={members} value={fields.motherId} excludeId={existing?.id} onChange={(value) => update('motherId', value)} />
          </div>
        </>}
        {!existing && <>
          <div className="family-parent-grid">
            <label>Date of birth<input type="date" value={fields.birthDate} onChange={(event) => update('birthDate', event.target.value)} /></label>
            <label>Profession<input maxLength={120} value={fields.profession} onChange={(event) => update('profession', event.target.value)} /></label>
          </div>
          <label>Photo (optional)<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={async (event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            try { update('photo', await fileAsDataURL(file)); setError(''); } catch (photoError) { setError(photoError.message); }
          }} /></label>
          {fields.photo && <div className="family-photo-control"><img src={fields.photo} alt="Selected member" /><button className="family-text-button" type="button" onClick={() => update('photo', '')}>Remove photo</button></div>}
          <label>Notes<textarea maxLength={2000} rows="3" value={fields.notes} onChange={(event) => update('notes', event.target.value)} /></label>
        </>}
        {existing && <div className="family-preview"><strong>Linking existing member</strong><p>{memberLabel(existing)}</p><Parents member={existing} members={members} /><p>Existing parent links are kept unless you choose a different parent above.</p></div>}
        <div className="family-preview"><strong>Relationship preview</strong><p>{existing && !relationTarget ? `${existing.name} is the ${existing.gender === 'male' ? 'son' : existing.gender === 'female' ? 'daughter' : 'child'} of ${[fields.fatherId || existing.fatherId, fields.motherId || existing.motherId].filter(Boolean).map(id => members.find(p => p.id === id)?.name).join(' and ') || 'parents not yet recorded'}.` : preview}</p></div>
        {error && <p className="family-error" role="alert">{error}</p>}
        <div className="family-dialog-actions">
          <button className="family-button family-button-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : existing ? 'Link existing member' : 'Save member'}</button>
          <button className="family-button" type="button" onClick={onClose} disabled={saving}>Cancel</button>
        </div>
      </form>
    </dialog>
  );
}

/* CHANGE #10 — a dedicated PATCH helper that whitelists editable fields */
function editableDetails(member) {
  return {
    id: member.id,
    name: member.name,
    gender: member.gender,
    birthDate: member.birthDate,
    profession: member.profession,
    notes: member.notes,
    photo: member.photo,
  };
}

function MemberDetails({ member, members, onBack, onOpen, onUpdate, onDelete, onAddRelative, onAddChild }) {
  const [editing, setEditing] = useState('');
  const [fields, setFields] = useState(() => ({ ...member }));
  const [spouseId, setSpouseId] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  /* CHANGE #11 — only reset when the member actually changes (by id) */
  useEffect(() => {
    setFields({ ...member });
    setSpouseId('');
    setEditing('');
    setError('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [member]);

  const related = (ids) => (ids ?? []).map((id) => members.find((candidate) => candidate.id === id)).filter(Boolean);
  const father = members.find((candidate) => candidate.id === member.fatherId);
  const mother = members.find((candidate) => candidate.id === member.motherId);
  const children = members.filter((candidate) => candidate.fatherId === member.id || candidate.motherId === member.id);
  const spouses = related(member.spouseIds);

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await requestFamily('PATCH', editableDetails(fields));
      onUpdate(result);
      setEditing('');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveParents(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const result = await requestFamily('PATCH', {
        id: member.id,
        fatherId: fields.fatherId ?? '',
        motherId: fields.motherId ?? '',
      });
      onUpdate(result);
      setEditing('');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function saveSpouse(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      if (!spouseId) throw new Error('Choose a spouse before saving.');
      const result = await requestFamily('PATCH', { id: member.id, linkSpouseId: spouseId });
      onUpdate(result);
      setSpouseId('');
      setEditing('');
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function unlinkSpouse(person) {
    setSaving(true);
    setError('');
    try {
      const result = await requestFamily('PATCH', { id: member.id, unlinkSpouseId: person.id });
      onUpdate(result);
    } catch (saveError) {
      setError(saveError.message);
    } finally {
      setSaving(false);
    }
  }

  async function removeMember() {
    if (!await confirmDashboardAction(`Delete ${member.name}? Parent and spouse links to this member will be removed.`)) return;
    setSaving(true);
    setError('');
    try {
      const result = await requestFamily('DELETE', { id: member.id });
      onDelete(result);
    } catch (deleteError) {
      setError(deleteError.message);
      setSaving(false);
    }
  }

  return (
    <section className="family-panel family-member-details">
      <div className="family-panel-heading">
        <button className="family-text-button" type="button" onClick={onBack}>← All members</button>
        <div className="family-detail-actions">
          <button className="family-button family-button-primary" type="button" onClick={() => onAddChild(member.id)}>Add Child</button>
          <button className="family-button" type="button" onClick={() => setEditing(editing === 'details' ? '' : 'details')}>{editing === 'details' ? 'Cancel edit' : 'Edit details'}</button>
          <button className="family-button family-button-danger" type="button" onClick={removeMember} disabled={saving}>Delete member</button>
        </div>
      </div>
      <div className="family-detail-hero">
        {member.photo ? <img src={member.photo} alt={member.name} /> : <span aria-hidden="true">{initials(member.name)}</span>}
        <div><p className="family-eyebrow">Member details</p><h2>{member.name}</h2><p>{genderLabel(member.gender)}{member.birthDate ? ` · Born ${member.birthDate}` : ''}</p></div>
      </div>
      {editing === 'details' ? <form className="family-detail-form" onSubmit={save}>
        <label>Full name<input required maxLength={120} value={fields.name} onChange={(event) => setFields({ ...fields, name: event.target.value })} /></label>
        <label>Gender<select value={fields.gender} onChange={(event) => setFields({ ...fields, gender: event.target.value })}><option value="unknown">Not specified</option><option value="male">Male</option><option value="female">Female</option></select></label>
        <label>Date of birth<input type="date" value={fields.birthDate ?? ''} onChange={(event) => setFields({ ...fields, birthDate: event.target.value })} /></label>
        <label>Profession<input maxLength={120} value={fields.profession ?? ''} onChange={(event) => setFields({ ...fields, profession: event.target.value })} /></label>
        <label>Notes<textarea rows="4" maxLength={2000} value={fields.notes ?? ''} onChange={(event) => setFields({ ...fields, notes: event.target.value })} /></label>
        <label>Replace photo<input type="file" accept="image/jpeg,image/png,image/webp,image/avif" onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (!file) return;
          try { setFields({ ...fields, photo: await fileAsDataURL(file) }); setError(''); } catch (photoError) { setError(photoError.message); }
        }} /></label>
        <button className="family-button family-button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save details'}</button>
      </form> : <dl className="family-detail-facts">
        <div><dt><i className="bi bi-briefcase" aria-hidden="true" /> Profession</dt><dd>{member.profession || 'Not recorded'}</dd></div>
        <div><dt><i className="bi bi-journal-text" aria-hidden="true" /> Notes</dt><dd>{member.notes || 'No notes yet.'}</dd></div>
      </dl>}
      <section className="family-relationships" aria-labelledby="family-relations-title">
        <div className="family-panel-heading">
          <h3 id="family-relations-title">Family relationships</h3>
          <div className="family-detail-actions">
            <button className="family-button" type="button" onClick={() => setEditing(editing === 'parents' ? '' : 'parents')}>{editing === 'parents' ? 'Cancel' : 'Edit parents'}</button>
            <button className="family-button" type="button" onClick={() => onAddRelative('parent', member.id, 'father')}>Add father</button>
            <button className="family-button" type="button" onClick={() => onAddRelative('parent', member.id, 'mother')}>Add mother</button>
          </div>
        </div>
        {editing === 'parents' ? <form className="family-detail-form" onSubmit={saveParents}>
          <ParentPicker label="Father" members={members} value={fields.fatherId ?? ''} excludeId={member.id} onChange={(value) => setFields({ ...fields, fatherId: value })} />
          <ParentPicker label="Mother" members={members} value={fields.motherId ?? ''} excludeId={member.id} onChange={(value) => setFields({ ...fields, motherId: value })} />
          <button className="family-button family-button-primary" disabled={saving}>{saving ? 'Saving…' : 'Save parent links'}</button>
        </form> : <Parents member={member} members={members} />}
        {error && <p className="family-error" role="alert">{error}</p>}
        <div className="family-relationship-group member-spouses"><h4><i className="bi bi-heart" aria-hidden="true" /> Spouses</h4><div>
          {editing === 'spouse' ? <form className="family-spouse-form" onSubmit={saveSpouse}>
            <ParentPicker label="Spouse" members={members} value={spouseId} excludeId={member.id} onChange={setSpouseId} />
            <button className="family-button family-button-primary" disabled={saving || !spouseId}>{saving ? 'Saving…' : 'Add spouse relationship'}</button>
            <button className="family-text-button" type="button" onClick={() => setEditing('')}>Cancel</button>
          </form> : <>
            {spouses.length ? spouses.map((person) => <div className="family-spouse-item" key={person.id}>
              <button type="button" onClick={() => onOpen(person.id)}>{person.name}</button>
              <button className="family-text-button" type="button" disabled={saving} onClick={() => void unlinkSpouse(person)}>Remove link</button>
            </div>) : <p>Not recorded</p>}
            <div className="family-detail-actions">
              <button className="family-text-button" type="button" onClick={() => setEditing('spouse')}>Link existing spouse</button>
              <button className="family-text-button" type="button" onClick={() => onAddRelative('spouse', member.id)}>Add new spouse</button>
            </div>
          </>}
        </div></div>
        <div className="family-relationship-group member-children"><h4><i className="bi bi-diagram-3" aria-hidden="true" /> Children</h4><div className="member-child-links">{children.length ? children.map((person) => <button key={person.id} type="button" onClick={() => onOpen(person.id)}>{person.name}</button>) : <p>No children linked</p>}</div></div>
      </section>
    </section>
  );
}

function MemberCard({ member, generation, onOpen, onAddChild, highlighted, cardRef }) {
  return (
    <article className={`family-tree-card${highlighted ? ' is-highlighted' : ''}`} ref={cardRef} data-member-id={member.id}>
      <button className="family-tree-card-open" type="button" onClick={() => onOpen(member.id)} aria-label={`View details for ${member.name}`}>
        {member.photo ? <img src={member.photo} alt="" /> : <span className="family-initials" aria-hidden="true">{initials(member.name)}</span>}
        <span className="family-card-copy">
          <strong>{member.name}</strong>
          <small>{genderLabel(member.gender)}{member.birthDate ? ` · ${member.birthDate.slice(0, 4)}` : ''}</small>
          <small>Generation {generation}{member.status ? ` · ${member.status}` : ''}</small>
        </span>
      </button>
      <div className="family-add-actions">
        <button className="family-add-child" type="button" onClick={() => onAddChild(member.id, 'unknown')}>Add Child</button>
        <button className="family-add-child" type="button" onClick={() => onAddChild(member.id, 'male')}>+ Son</button>
        <button className="family-add-child" type="button" onClick={() => onAddChild(member.id, 'female')}>+ Daughter</button>
      </div>
    </article>
  );
}

export default function FamilyManager({ view, selectedId, onSelectMember, onNavigate }) {
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('all');
  const [memberSort, setMemberSort] = useState({ key: 'name', direction: 'asc' });
  const [memberPage, setMemberPage] = useState(1);
  const [addOpen, setAddOpen] = useState(() => new URLSearchParams(location.search).get('action') === 'add');
  const [initialParentId, setInitialParentId] = useState('');
  const [initialGender, setInitialGender] = useState('unknown');
  const [relationTarget, setRelationTarget] = useState(null);
  const [highlightedId, setHighlightedId] = useState('');
  const [listView, setListView] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [fullscreenError, setFullscreenError] = useState('');
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 24, y: 24 });
  const [viewportSize, setViewportSize] = useState({ width: 900, height: 600 });
  const [links, setLinks] = useState([]);
  const viewport = useRef(null);
  const stage = useRef(null);
  const cardRefs = useRef(new Map());
  const drag = useRef(null);
  const listViewChosen = useRef(false);
  const initialLayout = useRef(false);
  const members = family?.members ?? [];
  const generations = useMemo(() => generationsFor(members), [members]);
  const generationById = useMemo(
    () => new Map(generations.flatMap((row, index) => row.map((member) => [member.id, index + 1]))),
    [generations]
  );
  const filteredMembers = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return members
      .filter((member) => (!needle || member.name.toLowerCase().includes(needle)))
      .filter((member) => genderFilter === 'all' || member.gender === genderFilter)
      .sort((left, right) => {
        const leftValue = memberSort.key === 'generation'
          ? generationById.get(left.id) ?? 0
          : String(left[memberSort.key] ?? '').toLocaleLowerCase();
        const rightValue = memberSort.key === 'generation'
          ? generationById.get(right.id) ?? 0
          : String(right[memberSort.key] ?? '').toLocaleLowerCase();
        const comparison = typeof leftValue === 'number'
          ? leftValue - rightValue
          : leftValue.localeCompare(rightValue);
        return memberSort.direction === 'asc' ? comparison : -comparison;
      });
  }, [genderFilter, generationById, memberSort, members, search]);
  const maxRowSize = Math.max(1, ...generations.map((row) => row.length));
  const stageSize = {
    width: Math.max(viewportSize.width - 48, maxRowSize * 244 + 64),
    height: Math.max(280, generations.length * 250 + 70),
  };
  const selectedMember = members.find((member) => member.id === selectedId);
  const memberPageCount = Math.max(1, Math.ceil(filteredMembers.length / 10));
  const visibleMembers = filteredMembers.slice((Math.min(memberPage, memberPageCount) - 1) * 10, Math.min(memberPage, memberPageCount) * 10);

  function sortMembers(key) {
    setMemberSort((current) => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc',
    }));
    setMemberPage(1);
  }

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const result = await requestFamily();
      setFamily(result);
    } catch (error) {
      setLoadError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const channel = new BroadcastChannel('aishwary-family');
    channel.onmessage = () => void load();
    return () => channel.close();
  }, [load]);

  useEffect(() => {
    function syncFullscreen() {
      setIsFullscreen(document.fullscreenElement === viewport.current);
    }
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  useEffect(() => {
    const element = viewport.current;
    if (!element) return undefined;
    const measure = () => {
      setViewportSize({ width: element.clientWidth, height: element.clientHeight });
      if (!listViewChosen.current) setListView(window.matchMedia('(max-width: 760px)').matches);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [view, loading, listView]);

  useEffect(() => {
    if (!family || listView || initialLayout.current || !viewport.current) return;
    initialLayout.current = true;
    const width = viewport.current.clientWidth;
    const initialScale = Math.max(0.08, Math.min(1, (width - 48) / stageSize.width));
    setScale(initialScale);
    setPan({ x: (width - stageSize.width * initialScale) / 2, y: 24 });
  }, [family, listView, stageSize.width]);

  const measureLinks = useCallback(() => {
    if (view !== 'family-tree' || listView || !stage.current || !family) return;
    const stageRect = stage.current.getBoundingClientRect();
    const elements = new Map(Array.from(stage.current.querySelectorAll('.family-tree-card'))
      .map((element) => [element.dataset.memberId, element]));
    const point = (id) => {
      const element = elements.get(id);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        left: (rect.left - stageRect.left) / scale,
        right: (rect.right - stageRect.left) / scale,
        top: (rect.top - stageRect.top) / scale,
        bottom: (rect.bottom - stageRect.top) / scale,
        x: (rect.left + rect.width / 2 - stageRect.left) / scale,
        y: (rect.top + rect.height / 2 - stageRect.top) / scale,
      };
    };
    const next = [];
    for (const member of members) {
      const child = point(member.id);
      if (!child) continue;
      for (const parentId of parentIds(member)) {
        const parent = point(parentId);
        if (!parent) continue;
        const middle = (parent.bottom + child.top) / 2;
        next.push({ type: 'parent', d: `M ${parent.x} ${parent.bottom} V ${middle} H ${child.x} V ${child.top}` });
      }
      for (const spouseId of spouseIdsOf(member)) {
        if (member.id > spouseId) continue;
        const spouse = point(spouseId);
        if (!spouse) continue;
        const from = child.x < spouse.x ? child.right : child.left;
        const to = child.x < spouse.x ? spouse.left : spouse.right;
        next.push({ type: 'spouse', d: `M ${from} ${child.y} C ${(child.x + spouse.x) / 2} ${child.y}, ${(child.x + spouse.x) / 2} ${spouse.y}, ${to} ${spouse.y}` });
      }
    }
    setLinks(next);
  }, [family, listView, members, scale, view]);

  /* CHANGE #12 — drop `pan` from deps: links are in stage coordinates, so panning
     doesn't change them. This removes a full link recompute per drag frame. */
  useLayoutEffect(() => {
    measureLinks();
    window.addEventListener('resize', measureLinks);
    const observer = new ResizeObserver(measureLinks);
    if (stage.current) {
      observer.observe(stage.current);
      stage.current.querySelectorAll('.family-tree-card').forEach((element) => observer.observe(element));
    }
    return () => {
      window.removeEventListener('resize', measureLinks);
      observer.disconnect();
    };
  }, [measureLinks, generations, stageSize.width, stageSize.height]);

  const focusMember = useCallback((id) => {
    const element = cardRefs.current.get(id);
    const container = viewport.current;
    const canvas = stage.current;
    if (!element) return;
    if (!container || !canvas) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      setHighlightedId(id);
      return;
    }
    const cardRect = element.getBoundingClientRect();
    const stageRect = canvas.getBoundingClientRect();
    const centerX = (cardRect.left + cardRect.width / 2 - stageRect.left) / scale;
    const centerY = (cardRect.top + cardRect.height / 2 - stageRect.top) / scale;
    const focusScale = scale < 0.5 ? 0.65 : scale;
    setScale(focusScale);
    setPan({
      x: container.clientWidth / 2 - centerX * focusScale,
      y: container.clientHeight / 2 - centerY * focusScale,
    });
    setHighlightedId(id);
  }, [scale]);

  useEffect(() => {
    if (!highlightedId || view !== 'family-tree' || listView) return undefined;
    const frame = requestAnimationFrame(() => focusMember(highlightedId));
    return () => cancelAnimationFrame(frame);
    /* CHANGE #13 — eslint-disable-next-line: focusMember depends on scale,
       which changes when we zoom; we don't want to re-focus on every zoom. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [family, highlightedId, listView, view]);

  function fitToScreen() {
    const container = viewport.current;
    if (!container) return;
    const nextScale = Math.min(1, (container.clientWidth - 48) / stageSize.width, (container.clientHeight - 48) / stageSize.height);
    const fittedScale = Math.max(0.08, nextScale);
    setScale(fittedScale);
    setPan({
      x: (container.clientWidth - stageSize.width * fittedScale) / 2,
      y: (container.clientHeight - stageSize.height * fittedScale) / 2,
    });
  }

  function exportTreeImage() {
    try {
      const file = new Blob([familyTreeSvg(members, generations)], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'family-tree.svg';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setFullscreenError('');
    } catch (error) {
      setFullscreenError(error.message || 'Family tree image could not be exported.');
    }
  }

  async function exportTreePng() {
    const source = URL.createObjectURL(new Blob([familyTreeSvg(members, generations)], {type:'image/svg+xml'}));
    try {
      const image = new Image();
      image.src = source;
      await image.decode();
      const width = image.naturalWidth * 2;
      const height = image.naturalHeight * 2;
      if (width * height > 48000000 || Math.max(width,height)>16384) throw new Error('This tree exceeds the PNG size limit. Use the vector SVG export for the full tree.');
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      context.fillStyle = '#ffffff';
      context.fillRect(0,0,width,height);
      context.drawImage(image,0,0,width,height);
      const blob = await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
      if (!blob) throw new Error('PNG export failed. Try the SVG export.');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href=url; link.download='family-tree-2x.png'; link.click();
      setTimeout(()=>URL.revokeObjectURL(url),1000);
      setFullscreenError('');
    } catch(error) { setFullscreenError(error.message); }
    finally { URL.revokeObjectURL(source); }
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement === viewport.current) await document.exitFullscreen();
      else if (viewport.current?.requestFullscreen) await viewport.current.requestFullscreen();
      else throw new Error('Full-screen mode is not supported by this browser.');
      setFullscreenError('');
    } catch (error) {
      setFullscreenError(error.message || 'Full-screen mode could not be opened.');
    }
  }

  function openAdd(parentId = '', gender = 'unknown') {
    setInitialParentId(parentId);
    setInitialGender(gender);
    setRelationTarget(null);
    setAddOpen(true);
  }

  function openRelative(type, id, role = '') {
    setInitialParentId('');
    setInitialGender('unknown');
    setRelationTarget({ type, id, role });
    setAddOpen(true);
  }

  function openDetails(id) {
    onNavigate('members', id);
  }

  function handleSaved(result) {
    if (!result?.family || !result?.member) { void load(); setAddOpen(false); return; }
    const target = relationTarget;
    setFamily(result.family);
    setAddOpen(false);
    setRelationTarget(null);
    setHighlightedId(result.member.id);
    setInitialParentId('');
    if (target) {
      onSelectMember(target.id);
      onNavigate('members', target.id);
    } else {
      onSelectMember(result.member.id);
      onNavigate('family-tree');
    }
  }

  function updateFromDetails(result) {
    if (!result?.family || !result?.member) { void load(); return; }
    setFamily(result.family);
    onSelectMember(result.member.id);
  }

  function handleDeleted(result) {
    if (!result?.family) { void load(); return; }
    setFamily(result.family);
    onNavigate('members');
  }

  function startPan(event) {
    if (event.button !== 0 || event.target.closest('button')) return;
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, pan };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function movePan(event) {
    if (!drag.current || drag.current.id !== event.pointerId) return;
    setPan({
      x: drag.current.pan.x + event.clientX - drag.current.x,
      y: drag.current.pan.y + event.clientY - drag.current.y,
    });
  }

  if (loading) return <section className="family-panel" aria-live="polite"><p>Loading family data…</p></section>;
  if (loadError) return <section className="family-panel"><h2>Family tree unavailable</h2><p className="family-error" role="alert">{loadError}</p><button className="family-button family-button-primary" type="button" onClick={() => void load()}>Try again</button></section>;
  if (!family) return null;

  const matches = search.trim()
    ? members.filter((member) => String(member.name ?? '').toLowerCase().includes(search.trim().toLowerCase()))
    : [];
  return (
    <div className="family-manager">
      {view === 'family-tree' ? <>
        <section className="family-panel family-tree-panel">
          <div className="family-panel-heading family-tree-heading">
            <div><p className="family-eyebrow">Your family, connected</p><h2>Family Tree</h2><p>Explore {members.length} members across {generations.length} generations.</p></div>
            <button className="family-button family-button-primary" type="button" onClick={() => openAdd()}>+ Add Member</button>
          </div>
          <div className="family-tree-toolbar">
            <label className="family-search">Search family
              <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search by name…" />
            </label>
            <div className="family-zoom-controls" aria-label="Tree view controls">
              {!listView && <>
                <button className="family-button" type="button" aria-label="Zoom out" onClick={() => setScale((value) => Math.max(0.08, value - 0.1))}>−</button>
                <span aria-live="polite">{Math.round(scale * 100)}%</span>
                <button className="family-button" type="button" aria-label="Zoom in" onClick={() => setScale((value) => Math.min(1.6, value + 0.1))}>+</button>
                <button className="family-button" type="button" onClick={fitToScreen}>Fit to screen</button>
                <button className="family-button" type="button" onClick={() => void toggleFullscreen()}>{isFullscreen ? 'Exit full screen' : 'Full screen'}</button>
              </>}
              <button className="family-button" type="button" onClick={exportTreeImage}>Export image</button>
              <button className="family-button" type="button" onClick={exportTreePng}>Download PNG (2×)</button>
              <button className="family-button" type="button" onClick={() => window.print()}>Print</button>
            </div>
          </div>
          {fullscreenError && <p className="family-error" role="alert">{fullscreenError}</p>}
          {matches.length > 0 && <div className="family-search-results" role="list" aria-label="Matching family members">
            {matches.slice(0, 12).map((member) => <button key={member.id} role="listitem" type="button" onClick={() => focusMember(member.id)}>{member.name}<small>{memberLabel(member)}</small></button>)}
          </div>}
          {search && !matches.length && <p className="family-empty-result">No members match “{search}”.</p>}
          <div className="family-view-switch" aria-label="Family tree display">
            <button type="button" aria-pressed={!listView} onClick={() => { listViewChosen.current = true; setListView(false); }}>Interactive tree</button>
            <button type="button" aria-pressed={listView} onClick={() => { listViewChosen.current = true; setListView(true); }}>List view</button>
          </div>
          {members.length === 0 ? <div className="family-empty"><h3>Your family tree is ready to grow.</h3><p>Add a member, with parents or without known parents.</p><button className="family-button family-button-primary" type="button" onClick={() => openAdd()}>Add first member</button></div> :
            listView ? <div className="family-list-view">{members.filter((member) => !search || String(member.name ?? '').toLowerCase().includes(search.toLowerCase())).map((member) => <MemberCard key={member.id} member={member} generation={generationById.get(member.id)} onOpen={openDetails} onAddChild={openAdd} highlighted={highlightedId === member.id} cardRef={(element) => {
              if (element) cardRefs.current.set(member.id, element);
              else cardRefs.current.delete(member.id);
            }} />)}</div> :
              <div className="family-tree-viewport" ref={viewport} role="region" tabIndex={0} onKeyDown={(event) => {
                const step = event.shiftKey ? 80 : 35;
                if (event.key === 'ArrowLeft') { event.preventDefault(); setPan((value) => ({ ...value, x: value.x + step })); }
                else if (event.key === 'ArrowRight') { event.preventDefault(); setPan((value) => ({ ...value, x: value.x - step })); }
                else if (event.key === 'ArrowUp') { event.preventDefault(); setPan((value) => ({ ...value, y: value.y + step })); }
                else if (event.key === 'ArrowDown') { event.preventDefault(); setPan((value) => ({ ...value, y: value.y - step })); }
                else if (event.key === 'Home') { event.preventDefault(); fitToScreen(); }
              }} onPointerDown={startPan} onPointerMove={movePan} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} aria-label="Interactive family tree. Drag to pan, use arrow keys to pan and zoom buttons to zoom.">
                <div className="family-tree-stage" ref={stage} style={{ width: stageSize.width, height: stageSize.height, transform: `translate(${pan.x}px, ${pan.y}px) scale(${scale})` }}>
                  <svg className="family-tree-links" width={stageSize.width} height={stageSize.height} aria-hidden="true">
                    {links.map((link, index) => <path key={`${link.type}-${index}`} className={`family-link-${link.type}`} d={link.d} />)}
                  </svg>
                  {generations.map((row, index) => <section className="family-generation" key={index} style={{ top: 28 + index * 250, width: stageSize.width }}>
                    <h3>Generation {index + 1}</h3>
                    <div className="family-generation-members">
                      {row.map((member) => <MemberCard key={member.id} member={member} generation={index + 1} onOpen={openDetails} onAddChild={openAdd} highlighted={highlightedId === member.id} cardRef={(element) => {
                        if (element) cardRefs.current.set(member.id, element);
                        else cardRefs.current.delete(member.id);
                      }} />)}
                    </div>
                  </section>)}
                </div>
              </div>}
          <div className="family-tree-legend"><span><i className="family-legend-parent" />Parent &amp; child</span><span><i className="family-legend-spouse" />Spouse</span><span>Drag to pan · Zoom with controls</span></div>
        </section>
      </> : selectedMember ? <MemberDetails member={selectedMember} members={members} onBack={() => onNavigate('members')} onOpen={openDetails} onUpdate={updateFromDetails} onDelete={handleDeleted} onAddRelative={openRelative} onAddChild={openAdd} /> :
        <section className="family-panel family-members-panel">
          <div className="family-panel-heading"><div><p className="family-eyebrow">People in your family</p><h2>Members</h2><p>{members.length} members</p></div><button className="family-button family-button-primary" type="button" onClick={() => openAdd()}>+ Add Member</button></div>
          <div className="family-member-controls">
            <label className="family-search">Search members<input type="search" value={search} onChange={(event) => { setSearch(event.target.value); setMemberPage(1); }} placeholder="Search by name…" /></label>
            <label className="family-gender-filter">Gender
              <select value={genderFilter} onChange={(event) => { setGenderFilter(event.target.value); setMemberPage(1); }}>
                <option value="all">All members</option><option value="male">Male</option><option value="female">Female</option><option value="unknown">Not specified</option>
              </select>
            </label>
          </div>
          <div className="family-members-table-wrap">
            <table className="family-members-table">
              <caption className="sr-only">Family members and relationships</caption>
              <thead><tr>
                <th scope="col" aria-sort={memberSort.key === 'name' ? (memberSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" onClick={() => sortMembers('name')}>Member{memberSort.key === 'name' ? (memberSort.direction === 'asc' ? ' ↑' : ' ↓') : ''}</button>
                </th>
                <th scope="col" aria-sort={memberSort.key === 'gender' ? (memberSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" onClick={() => sortMembers('gender')}>Gender{memberSort.key === 'gender' ? (memberSort.direction === 'asc' ? ' ↑' : ' ↓') : ''}</button>
                </th>
                <th scope="col" aria-sort={memberSort.key === 'birthDate' ? (memberSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" onClick={() => sortMembers('birthDate')}>Date of birth{memberSort.key === 'birthDate' ? (memberSort.direction === 'asc' ? ' ↑' : ' ↓') : ''}</button>
                </th>
                <th scope="col">Father</th><th scope="col">Mother</th><th scope="col">Spouse</th>
                <th scope="col" aria-sort={memberSort.key === 'generation' ? (memberSort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" onClick={() => sortMembers('generation')}>Generation{memberSort.key === 'generation' ? (memberSort.direction === 'asc' ? ' ↑' : ' ↓') : ''}</button>
                </th>
                <th scope="col">Status</th><th scope="col">Action</th>
              </tr></thead>
              <tbody>
                {visibleMembers.map((member) => {
                  const father = members.find((person) => person.id === member.fatherId);
                  const mother = members.find((person) => person.id === member.motherId);
                  const spouses = members.filter((person) => member.spouseIds?.includes(person.id)).map((person) => person.name);
                  return <tr key={member.id}>
                    <td><button className="family-member-table-person" type="button" onClick={() => onNavigate('members', member.id)}>
                      {member.photo ? <img src={member.photo} alt="" /> : <span aria-hidden="true">{initials(member.name)}</span>}
                      <strong>{member.name}</strong>
                    </button></td>
                    <td>{genderLabel(member.gender)}</td><td>{member.birthDate || 'Not recorded'}</td>
                    <td>{father?.name || '—'}</td><td>{mother?.name || '—'}</td><td>{spouses.join(', ') || '—'}</td>
                    <td>{generationById.get(member.id) ? `Generation ${generationById.get(member.id)}` : '—'}</td>
                    <td>{member.status || 'Not recorded'}</td>
                    <td><button className="family-text-button" type="button" onClick={() => onNavigate('members', member.id)}>View profile</button></td>
                  </tr>;
                })}
              </tbody>
            </table>
            {!filteredMembers.length && <p className="family-empty-result">No members match these filters.</p>}
          </div>
          {filteredMembers.length > 10 && <nav className="family-pagination" aria-label="Member list pages">
            <button type="button" className="family-button" disabled={memberPage <= 1} onClick={() => setMemberPage((page) => page - 1)}>Previous</button>
            <span>Page {Math.min(memberPage, memberPageCount)} of {memberPageCount}</span>
            <button type="button" className="family-button" disabled={memberPage >= memberPageCount} onClick={() => setMemberPage((page) => page + 1)}>Next</button>
          </nav>}
          {!members.length && <p className="family-empty">No members yet. Add the first family member.</p>}
        </section>}
      <AddMemberDialog open={addOpen} onClose={() => { setAddOpen(false); setRelationTarget(null); }} family={family} initialParentId={initialParentId} initialGender={initialGender} relationTarget={relationTarget} onSaved={handleSaved} />
    </div>
  );
}
