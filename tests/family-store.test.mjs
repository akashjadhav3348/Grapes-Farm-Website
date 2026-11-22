import assert from 'node:assert/strict';
import { createHmac, randomUUID } from 'node:crypto';
import { after, test } from 'node:test';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { seedFamily, validateFamily } from '../netlify/functions/family-store.mjs';
import adminHandler from '../netlify/functions/admin.mjs';

const origin = 'https://family.test';
const secret = 'family-test-session-secret-with-more-than-forty-three-characters';
const tempDir = await mkdtemp(join(tmpdir(), 'aishwary-family-tests-'));
const previous = {
  origin: process.env.ADMIN_ORIGIN,
  secret: process.env.ADMIN_SESSION_SECRET,
  dataFile: process.env.FAMILY_DATA_FILE,
  netlify: process.env.NETLIFY,
  context: process.env.CONTEXT,
};
process.env.ADMIN_ORIGIN = origin;
process.env.ADMIN_SESSION_SECRET = secret;
process.env.FAMILY_DATA_FILE = join(tempDir, 'family.json');
delete process.env.NETLIFY;
delete process.env.CONTEXT;

after(async () => {
  await rm(tempDir, { recursive: true, force: true });
  if (previous.origin === undefined) delete process.env.ADMIN_ORIGIN;
  else process.env.ADMIN_ORIGIN = previous.origin;
  if (previous.secret === undefined) delete process.env.ADMIN_SESSION_SECRET;
  else process.env.ADMIN_SESSION_SECRET = previous.secret;
  if (previous.dataFile === undefined) delete process.env.FAMILY_DATA_FILE;
  else process.env.FAMILY_DATA_FILE = previous.dataFile;
  if (previous.netlify === undefined) delete process.env.NETLIFY;
  else process.env.NETLIFY = previous.netlify;
  if (previous.context === undefined) delete process.env.CONTEXT;
  else process.env.CONTEXT = previous.context;
});

function accessCookie(subject = 'owner') {
  const body = Buffer.from(JSON.stringify({
    kind: 'access',
    exp: Math.floor(Date.now() / 1000) + 60,
    sub: subject,
    role: 'admin',
  })).toString('base64url');
  const signature = createHmac('sha256', secret).update(body).digest('base64url');
  return `af_access=${body}.${signature}`;
}

function apiRequest(method, body, subject = 'owner') {
  const headers = { cookie: accessCookie(subject) };
  if (method !== 'GET') headers.origin = origin;
  if (body) headers['content-type'] = 'application/json';
  return adminHandler(new Request(`${origin}/api/admin/family`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  }));
}

test('existing family data migrates to ID-based links and rejects invalid ancestry', () => {
  const family = seedFamily();
  assert.ok(family.members.length > 10);
  assert.ok(family.members.some((member) => member.name === 'निवृत्ती रखमाजी जाधव'));
  assert.ok(family.members.some((member) => member.name === 'सचिन मधुकर जाधव'));
  assert.ok(family.members.every((member) => member.id && typeof member.id === 'string'));
  assert.equal(validateFamily(family), family);

  const root = family.members.find((member) => !member.fatherId && !member.motherId);
  const child = family.members.find((member) => member.fatherId === root.id);
  const renamed = structuredClone(family);
  renamed.members.find((member) => member.id === root.id).name = 'Renamed family elder';
  assert.equal(validateFamily(renamed).members.find((member) => member.id === child.id).fatherId, root.id);
  const circular = structuredClone(family);
  circular.members.find((member) => member.id === root.id).fatherId = child.id;
  assert.throws(() => validateFamily(circular), /circular ancestry/i);

  const duplicateParents = structuredClone(family);
  const linkedChild = duplicateParents.members.find((member) => member.fatherId && member.motherId);
  linkedChild.motherId = linkedChild.fatherId;
  assert.throws(() => validateFamily(duplicateParents), /both parents/i);
});

test('family API protects records, accepts one known parent and prevents duplicate creates', async () => {
  const unauthorized = await adminHandler(new Request(`${origin}/api/admin/family`));
  assert.equal(unauthorized.status, 401);
  const otherFamily = await apiRequest('GET', undefined, 'another-owner');
  assert.equal(otherFamily.status, 401);
  const forbiddenEdit = await apiRequest('PATCH', { id: 'someone-elses-member', name: 'Changed' }, 'another-owner');
  assert.equal(forbiddenEdit.status, 401);

  const loaded = await apiRequest('GET');
  assert.equal(loaded.status, 200);
  const initial = await loaded.json();
  const root = initial.members.find((member) => !member.fatherId && !member.motherId);
  const child = initial.members.find((member) => member.fatherId === root.id);

  const requestId = randomUUID();
  const person = {
    requestId,
    name: 'Rohan Jadhav',
    gender: 'male',
    fatherId: root.id,
    motherId: '',
    birthDate: '',
    photo: '',
    notes: '',
  };
  const createdResponse = await apiRequest('POST', person);
  assert.equal(createdResponse.status, 201);
  const created = await createdResponse.json();
  assert.equal(created.member.fatherId, root.id);
  assert.equal(created.member.motherId, null);
  assert.ok(Number.isFinite(Date.parse(created.member.createdAt)));

  const duplicateResponse = await apiRequest('POST', person);
  const duplicate = await duplicateResponse.json();
  assert.equal(duplicateResponse.status, 201);
  assert.equal(duplicate.member.id, created.member.id);
  assert.equal(duplicate.family.members.length, initial.members.length + 1);

  const sameNameResponse = await apiRequest('POST', {
    ...person,
    requestId: randomUUID(),
    fatherId: child.id,
  });
  const sameName = await sameNameResponse.json();
  assert.equal(sameNameResponse.status, 201);
  assert.notEqual(sameName.member.id, created.member.id);
  assert.equal(sameName.family.members.filter((member) => member.name === 'Rohan Jadhav').length, 2);

  const spouseResponse = await apiRequest('POST', {
    requestId: randomUUID(),
    name: 'Amira Jadhav',
  });
  const spouse = await spouseResponse.json();
  const selfSpouse = await apiRequest('PATCH', { id: spouse.member.id, spouseId: spouse.member.id });
  assert.equal(selfSpouse.status, 400);
  assert.match((await selfSpouse.json()).message, /own spouse/i);
  const linkedSpouse = await apiRequest('PATCH', { id: spouse.member.id, spouseId: created.member.id });
  const linked = await linkedSpouse.json();
  assert.equal(linkedSpouse.status, 200);
  assert.deepEqual(linked.member.spouseIds, [created.member.id]);
  assert.deepEqual(linked.family.members.find((member) => member.id === created.member.id).spouseIds, [spouse.member.id]);
  const secondSpouseResponse = await apiRequest('POST', {
    requestId: randomUUID(),
    name: 'Nina Jadhav',
  });
  const secondSpouse = await secondSpouseResponse.json();
  const additionalSpouseResponse = await apiRequest('PATCH', {
    id: created.member.id,
    linkSpouseId: secondSpouse.member.id,
  });
  const withMultipleSpouses = await additionalSpouseResponse.json();
  assert.equal(additionalSpouseResponse.status, 200);
  assert.deepEqual(
    withMultipleSpouses.member.spouseIds.sort(),
    [spouse.member.id, secondSpouse.member.id].sort()
  );
  assert.deepEqual(secondSpouseResponse.status, 201);
  const thirdSpouseResponse = await apiRequest('POST', {
    requestId: randomUUID(),
    name: 'Leela Jadhav',
    spouseOfId: created.member.id,
  });
  assert.equal(thirdSpouseResponse.status, 201);
  const thirdSpouse = (await thirdSpouseResponse.json()).member;
  const removedSpouseLink = await apiRequest('PATCH', {
    id: created.member.id,
    unlinkSpouseId: spouse.member.id,
  });
  const afterUnlink = await removedSpouseLink.json();
  assert.equal(removedSpouseLink.status, 200);
  assert.equal(afterUnlink.member.spouseIds.includes(spouse.member.id), false);
  assert.equal(afterUnlink.family.members.find((member) => member.id === spouse.member.id).spouseIds.includes(created.member.id), false);
  assert.equal(afterUnlink.member.spouseIds.includes(secondSpouse.member.id), true);
  assert.equal(afterUnlink.member.spouseIds.includes(thirdSpouse.id), true);

  const circularResponse = await apiRequest('PATCH', { id: root.id, fatherId: child.id });
  assert.equal(circularResponse.status, 400);
  assert.match((await circularResponse.json()).message, /circular ancestry/i);

  const invalidParents = await apiRequest('POST', {
    ...person,
    requestId: randomUUID(),
    name: 'Invalid Child',
    fatherId: root.id,
    motherId: root.id,
  });
  assert.equal(invalidParents.status, 400);
  assert.match((await invalidParents.json()).message, /both parents/i);

  const descendantResponse = await apiRequest('POST', {
    requestId: randomUUID(),
    name: 'Maya Jadhav',
    fatherId: created.member.id,
  });
  assert.equal(descendantResponse.status, 201);
  const descendant = (await descendantResponse.json()).member;
  const addedMotherResponse = await apiRequest('POST', {
    requestId: randomUUID(),
    name: 'Sita Jadhav',
    parentOfId: descendant.id,
    parentRole: 'mother',
  });
  assert.equal(addedMotherResponse.status, 201);
  const addedMother = (await addedMotherResponse.json()).member;
  const deleteResponse = await apiRequest('DELETE', { id: created.member.id });
  assert.equal(deleteResponse.status, 200);
  const deleted = await deleteResponse.json();
  assert.equal(deleted.deletedMember.id, created.member.id);
  assert.equal(deleted.family.members.find((member) => member.id === descendant.id).fatherId, null);
  assert.equal(deleted.family.members.find((member) => member.id === descendant.id).motherId, addedMother.id);
  assert.equal(deleted.family.members.find((member) => member.id === spouse.member.id).spouseIds.includes(created.member.id), false);
  assert.equal(deleted.family.members.find((member) => member.id === secondSpouse.member.id).spouseIds.includes(created.member.id), false);
  assert.equal(deleted.family.members.find((member) => member.id === thirdSpouse.id).spouseIds.includes(created.member.id), false);

  const after = await apiRequest('GET');
  assert.equal((await after.json()).members.find((member) => member.id === root.id).fatherId, null);
});
