import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { family as legacyFamily } from '../../src/data.js';

const schemaVersion = 1;
const bodyLimit = 1_600_000;
const writeQueues = new Map();

export class FamilyError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

function stableId(index, name) {
  return `legacy-${createHash('sha256').update(`${index}:${name}`).digest('hex').slice(0, 16)}`;
}

function seedFamily() {
  const members = [];
  const add = (person, gender, fatherId = null, motherId = null) => {
    const member = {
      id: stableId(members.length, person.name),
      name: person.name,
      gender,
      birthDate: '',
      photo: '',
      notes: '',
      profession: person.profession ?? '',
      status: person.status ?? '',
      createdAt: null,
      fatherId,
      motherId,
      spouseIds: [],
    };
    members.push(member);
    return member;
  };
  const joinSpouses = (person, spouse) => {
    person.spouseIds.push(spouse.id);
    spouse.spouseIds.push(person.id);
  };
  const owner = add(legacyFamily.owner, 'male');
  const ownerSpouse = add(legacyFamily.spouse, 'female');
  joinSpouses(owner, ownerSpouse);

  for (const branch of legacyFamily.branches) {
    const father = add({ name: branch.name }, 'male', owner.id, ownerSpouse.id);
    const mother = add({ name: branch.spouse }, 'female');
    joinSpouses(father, mother);
    for (const person of branch.children) {
      const gender = person.relation === 'मुलगी' ? 'female' : 'male';
      const child = add(person, gender, father.id, mother.id);
      if (person.spouse) {
        const spouse = add({ name: person.spouse }, 'female');
        joinSpouses(child, spouse);
      }
      for (const descendant of person.children ?? []) {
        add(descendant, descendant.relation === 'मुलगी' ? 'female' : 'male', child.id, child.spouseIds[0] ?? null);
      }
    }
  }
  const result = { version: schemaVersion, members, requests: [] };
  validateFamily(result);
  return result;
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

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function localFile(userId) {
  const identity = createHash('sha256').update(userId).digest('hex').slice(0, 20);
  return resolve(process.env.FAMILY_DATA_FILE || join(process.cwd(), '.netlify', `family-${identity}.json`));
}

function isNetlifyRuntime() {
  return process.env.NETLIFY === 'true' || Boolean(process.env.CONTEXT);
}

async function localRead(userId) {
  const file = localFile(userId);
  try {
    const family = JSON.parse(await readFile(file, 'utf8'));
    return validateFamily(family);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    const family = seedFamily();
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify(family), { flag: 'wx' }).catch(async (writeError) => {
      if (writeError.code !== 'EEXIST') throw writeError;
    });
    return family;
  }
}

async function localMutate(userId, mutate) {
  const previous = writeQueues.get(userId) ?? Promise.resolve();
  const current = previous.then(async () => {
    const before = await localRead(userId);
    const after = validateFamily(mutate(clone(before)));
    const file = localFile(userId);
    await mkdir(dirname(file), { recursive: true });
    const temp = `${file}.${randomUUID()}.tmp`;
    await writeFile(temp, JSON.stringify(after), { flag: 'wx' });
    await rename(temp, file);
    return after;
  });
  const queued = current.catch(() => {});
  writeQueues.set(userId, queued);
  try {
    return await current;
  } finally {
    if (writeQueues.get(userId) === queued) writeQueues.delete(userId);
  }
}

async function blobStore() {
  const { getStore } = await import('@netlify/blobs');
  return getStore('aishwary-family-v1');
}

async function cloudRead(userId) {
  const store = await blobStore();
  const key = `families/${createHash('sha256').update(userId).digest('hex')}`;
  const current = await store.get(key, { type: 'json', consistency: 'strong' });
  if (current) return validateFamily(current);
  const seeded = seedFamily();
  const result = await store.setJSON(key, seeded, { onlyIfNew: true });
  if (result.modified) return seeded;
  const initialized = await store.get(key, { type: 'json', consistency: 'strong' });
  if (!initialized) throw new Error('Family store could not be initialized.');
  return validateFamily(initialized);
}

async function cloudMutate(userId, mutate) {
  const store = await blobStore();
  const key = `families/${createHash('sha256').update(userId).digest('hex')}`;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const current = await store.getWithMetadata(key, { type: 'json', consistency: 'strong' });
    const before = current?.data ?? seedFamily();
    const after = validateFamily(mutate(clone(before)));
    const result = await store.setJSON(key, after, current?.etag ? { onlyIfMatch: current.etag } : { onlyIfNew: true });
    if (result.modified) return after;
  }
  throw new FamilyError('Family data changed in another session. Reload and try again.', 409);
}

async function readFamily(userId) {
  return isNetlifyRuntime() ? cloudRead(userId) : localRead(userId);
}

async function mutateFamily(userId, mutate) {
  return isNetlifyRuntime() ? cloudMutate(userId, mutate) : localMutate(userId, mutate);
}

async function parseBody(request) {
  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > bodyLimit) throw new FamilyError('The request is too large.', 413);
  const reader = request.body?.getReader();
  const chunks = [];
  let size = 0;
  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > bodyLimit) {
      await reader.cancel();
      throw new FamilyError('The request is too large.', 413);
    }
    chunks.push(Buffer.from(value));
  }
  const text = Buffer.concat(chunks).toString('utf8');
  try {
    return JSON.parse(text);
  } catch {
    throw new FamilyError('The request must contain valid JSON.');
  }
}

function applyCreate(family, body) {
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
  const member = { id: randomUUID(), ...fields, spouseIds: [], createdAt: new Date().toISOString() };
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

function applyUpdate(family, body) {
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

function applyDelete(family, body) {
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

export async function familyRequest(request, user) {
  try {
    if (user?.role !== 'admin' || user?.sub !== 'owner') throw new FamilyError('You are not authorized for this family.', 403);
    if (new URL(request.url).searchParams.has('familyId')) throw new FamilyError('Family selection is controlled by your signed-in account.', 403);
    if (request.method === 'GET') return Response.json(await readFamily(user.sub), { headers: { 'Cache-Control': 'no-store' } });
    const body = await parseBody(request);
    let deletedMember;
    const family = await mutateFamily(user.sub, (current) => {
      if (request.method === 'POST') return applyCreate(current, body);
      if (request.method === 'PATCH') return applyUpdate(current, body);
      if (request.method === 'DELETE') {
        deletedMember = applyDelete(current, body);
        return current;
      }
      throw new FamilyError('Method not allowed.', 405);
    });
    const memberId = request.method === 'POST'
      ? family.requests.find((entry) => entry.id === body.requestId)?.memberId
      : request.method === 'DELETE' ? null : body.id;
    const member = family.members.find((candidate) => candidate.id === memberId);
    return Response.json({ family, member, ...(deletedMember ? { deletedMember } : {}) }, {
      status: request.method === 'POST' ? 201 : 200,
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const status = error instanceof FamilyError ? error.status : 503;
    if (!(error instanceof FamilyError)) console.error('Family storage request failed:', error);
    return Response.json({
      error: status === 503 ? 'family_storage_unavailable' : 'family_request_failed',
      message: error.message || 'Family data could not be saved.',
    }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}

export { seedFamily };
