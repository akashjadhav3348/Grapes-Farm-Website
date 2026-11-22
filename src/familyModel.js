const schemaVersion = 1;

export class FamilyError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export function validateFamily(family) {
  if (!family || family.version !== schemaVersion || !Array.isArray(family.members) || !Array.isArray(family.requests)) {
    throw new FamilyError('Family data is invalid.', 500);
  }
  const byId = new Map();
  for (const member of family.members) {
    if (!member || typeof member.id !== 'string' || !member.id || byId.has(member.id)) {
      throw new FamilyError('Family member IDs must be unique.', 400);
    }
    if (typeof member.name !== 'string' || !member.name.trim()) {
      throw new FamilyError('Every family member needs a full name.', 400);
    }
    if (member.createdAt !== undefined && member.createdAt !== null &&
      (typeof member.createdAt !== 'string' || Number.isNaN(Date.parse(member.createdAt)))) {
      throw new FamilyError('Family member creation dates are invalid.', 400);
    }
    if (!Array.isArray(member.spouseIds) || new Set(member.spouseIds).size !== member.spouseIds.length) {
      throw new FamilyError('Duplicate spouse relationships are not allowed.', 400);
    }
    const parents = [member.fatherId, member.motherId].filter(Boolean);
    if (new Set(parents).size !== parents.length) {
      throw new FamilyError('A person cannot be selected as both parents.', 400);
    }
    for (const parentId of parents) {
      if (parentId === member.id) throw new FamilyError('A person cannot be their own parent.', 400);
      if (!family.members.some((candidate) => candidate.id === parentId)) {
        throw new FamilyError('Selected parent was not found in this family.', 400);
      }
    }
    for (const spouseId of member.spouseIds) {
      if (spouseId === member.id) throw new FamilyError('A person cannot be their own spouse.', 400);
    }
    byId.set(member.id, member);
  }
  for (const member of family.members) {
    for (const spouseId of member.spouseIds) {
      const spouse = byId.get(spouseId);
      if (!spouse || !spouse.spouseIds.includes(member.id)) {
        throw new FamilyError('Spouse relationships must be linked on both members.', 400);
      }
    }
  }

  const ancestry = new Map();
  function visit(id) {
    if (ancestry.get(id) === 1) throw new FamilyError('That parent link would create a circular ancestry.', 400);
    if (ancestry.get(id) === 2) return;
    ancestry.set(id, 1);
    const member = byId.get(id);
    for (const parentId of [member.fatherId, member.motherId].filter(Boolean)) visit(parentId);
    ancestry.set(id, 2);
  }
  for (const id of byId.keys()) visit(id);

  const requestIds = new Set();
  for (const request of family.requests) {
    if (!request || typeof request.id !== 'string' || !byId.has(request.memberId) || requestIds.has(request.id)) {
      throw new FamilyError('Family request history is invalid.', 400);
    }
    requestIds.add(request.id);
  }
  return family;
}

function cleanText(value, label, maxLength, required = false) {
  if (value == null) value = '';
  if (typeof value !== 'string') throw new FamilyError(`${label} must be text.`);
  const result = value.trim();
  if (required && !result) throw new FamilyError('Full name is required.');
  if (result.length > maxLength) throw new FamilyError(`${label} must be ${maxLength} characters or fewer.`);
  return result;
}

function cleanParentId(value, label) {
  if (value == null || value === '') return null;
  if (typeof value !== 'string' || value.length > 100) throw new FamilyError(`${label} is invalid.`);
  return value;
}

function cleanGender(value) {
  const gender = value || 'unknown';
  if (!['male', 'female', 'unknown'].includes(gender)) throw new FamilyError('Choose a valid gender.');
  return gender;
}

function cleanBirthDate(value) {
  const date = cleanText(value, 'Date of birth', 10);
  if (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(`${date}T00:00:00Z`)) || new Date(`${date}T00:00:00Z`).toISOString().slice(0,10) !== date)) {
    throw new FamilyError('Enter a valid date of birth.');
  }
  return date;
}

function cleanPhoto(value) {
  const photo = cleanText(value, 'Photo', 1_400_000);
  if (photo && !/^data:image\/(?:jpeg|png|webp|avif);base64,[A-Za-z0-9+/]+={0,2}$/.test(photo)) {
    throw new FamilyError('Use a JPG, PNG, WebP or AVIF photo.');
  }
  return photo;
}

function cleanFields(input, existing = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new FamilyError('Invalid member details.');
  const field = (name) => Object.hasOwn(input, name) ? input[name] : existing[name];
  return {
    name: cleanText(field('name'), 'Full name', 120, true),
    gender: cleanGender(field('gender')),
    birthDate: cleanBirthDate(field('birthDate')),
    photo: cleanPhoto(field('photo')),
    notes: cleanText(field('notes'), 'Notes', 2_000),
    profession: cleanText(field('profession'), 'Profession', 120),
    status: cleanText(field('status'), 'Status', 100),
    fatherId: cleanParentId(field('fatherId'), 'Father'),
    motherId: cleanParentId(field('motherId'), 'Mother'),
  };
}

export function applyCreate(family, body) {
  const requestId = body?.requestId;
  if (typeof requestId !== 'string' || !/^[\w-]{16,80}$/.test(requestId)) {
    throw new FamilyError('Please retry the save; its request ID is invalid.');
  }
  const previous = family.requests.find((request) => request.id === requestId);
  if (previous) return family;
  const spouseOfId = cleanParentId(body.spouseOfId, 'Spouse');
  const parentOfId = cleanParentId(body.parentOfId, 'Child');
  const parentRole = body.parentRole;
  if (spouseOfId && parentOfId) throw new FamilyError('Choose one relationship for the new member.');
  if (parentOfId && !['father', 'mother'].includes(parentRole)) {
    throw new FamilyError('Choose whether the new member is the father or mother.');
  }
  const fields = cleanFields(body);
  const member = { id: crypto.randomUUID(), ...fields, spouseIds: [], createdAt: new Date().toISOString() };
  family.members.push(member);
  if (spouseOfId) {
    const spouse = family.members.find((candidate) => candidate.id === spouseOfId);
    if (!spouse || spouse.id === member.id) throw new FamilyError('Selected spouse was not found in this family.');
    member.spouseIds.push(spouse.id);
    spouse.spouseIds.push(member.id);
  }
  if (parentOfId) {
    const child = family.members.find((candidate) => candidate.id === parentOfId);
    const key = parentRole === 'father' ? 'fatherId' : 'motherId';
    if (!child) throw new FamilyError('Selected child was not found in this family.');
    if (child[key]) throw new FamilyError(`This member already has a recorded ${parentRole}.`);
    child[key] = member.id;
  }
  family.requests.push({ id: requestId, memberId: member.id });
  return family;
}

export function applyUpdate(family, body) {
  if (!body || typeof body.id !== 'string') throw new FamilyError('Member ID is required.');
  const spouseFields = ['spouseId', 'linkSpouseId', 'unlinkSpouseId'].filter((field) => Object.hasOwn(body, field));
  if (spouseFields.length > 1) throw new FamilyError('Choose one spouse relationship update at a time.');
  const member = family.members.find((candidate) => candidate.id === body.id);
  if (!member) throw new FamilyError('Family member was not found.', 404);
  Object.assign(member, cleanFields(body, member));
  const linkSpouse = (spouseId) => {
    if (spouseId === member.id) throw new FamilyError('A person cannot be their own spouse.');
    const spouse = spouseId ? family.members.find((candidate) => candidate.id === spouseId) : null;
    if (spouseId && !spouse) throw new FamilyError('Selected spouse was not found in this family.');
    if (spouse && !member.spouseIds.includes(spouse.id)) member.spouseIds.push(spouse.id);
    if (spouse && !spouse.spouseIds.includes(member.id)) spouse.spouseIds.push(member.id);
  };
  const unlinkSpouse = (spouseId) => {
    const spouse = family.members.find((candidate) => candidate.id === spouseId);
    member.spouseIds = member.spouseIds.filter((id) => id !== spouseId);
    if (spouse) spouse.spouseIds = spouse.spouseIds.filter((id) => id !== member.id);
  };
  if (Object.hasOwn(body, 'linkSpouseId')) {
    linkSpouse(cleanParentId(body.linkSpouseId, 'Spouse'));
  } else if (Object.hasOwn(body, 'unlinkSpouseId')) {
    const spouseId = cleanParentId(body.unlinkSpouseId, 'Spouse');
    if (!spouseId) throw new FamilyError('Choose a spouse relationship to remove.');
    unlinkSpouse(spouseId);
  }
  if (Object.hasOwn(body, 'spouseId')) {
    const spouseId = cleanParentId(body.spouseId, 'Spouse');
    for (const previousId of [...member.spouseIds]) unlinkSpouse(previousId);
    if (spouseId) linkSpouse(spouseId);
  }
  return family;
}

export function applyDelete(family, body) {
  if (!body || typeof body.id !== 'string') throw new FamilyError('Member ID is required.');
  const index = family.members.findIndex((member) => member.id === body.id);
  if (index < 0) throw new FamilyError('Family member was not found.', 404);
  const [deletedMember] = family.members.splice(index, 1);
  for (const member of family.members) {
    if (member.fatherId === deletedMember.id) member.fatherId = null;
    if (member.motherId === deletedMember.id) member.motherId = null;
    member.spouseIds = member.spouseIds.filter((id) => id !== deletedMember.id);
  }
  family.requests = family.requests.filter((request) => request.memberId !== deletedMember.id);
  return deletedMember;
}
