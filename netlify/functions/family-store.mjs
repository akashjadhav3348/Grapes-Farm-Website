import { createHash, randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { family as legacyFamily } from '../../src/data.js';

const schemaVersion = 1;
const bodyLimit = 1_600_000;
const writeQueues = new Map();


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


function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function localFile(userId) {
  const identity = createHash('sha256').update(userId).digest('hex').slice(0, 20);
  return resolve(process.env.FAMILY_DATA_FILE || join(process.cwd(), '.netlify', `family-${identity}.json`));
}

function isNetlifyRuntime() {
  if (process.env.NODE_ENV === 'production' || (process.env.CONTEXT && process.env.CONTEXT !== 'dev')) return true;
  if (process.env.CONTEXT === 'dev' || process.env.NETLIFY_DEV === 'true') return false;
  return process.env.NETLIFY === 'true'
    || Boolean(process.env.CONTEXT)
    || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME)
    || Boolean(process.env.LAMBDA_TASK_ROOT);
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
    if (status >= 500) {
      console.error('Family storage request failed:', error instanceof Error ? error.name : 'UnknownError');
    }
    const message = status < 500
      ? error.message
      : 'Family data is temporarily unavailable. Please try again.';
    return Response.json({
      error: status === 503 ? 'family_storage_unavailable' : 'family_request_failed',
      message,
    }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}

export { seedFamily };
import { FamilyError, validateFamily, applyCreate, applyUpdate, applyDelete } from "../../src/familyModel.js";
export { FamilyError, validateFamily };
