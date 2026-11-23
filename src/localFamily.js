import seed from './familySeed.json';
import { applyCreate, applyUpdate, applyDelete, validateFamily } from './familyModel.js';

const flag = 'aishwary-local-session';
export const isLocalWorkspace = () => sessionStorage.getItem(flag) === 'open';
export const leaveDeviceMode = () => sessionStorage.removeItem(flag);
export function openLocalWorkspace() {
  sessionStorage.setItem(flag, 'open');
  location.assign('/admin');
}
export function closeLocalWorkspace() {
  sessionStorage.removeItem(flag);
  location.replace('/login');
}

// A read/write transaction serializes edits from different tabs, including photos.
async function transaction(write, operation) {
  const db = await new Promise((resolve,reject) => {
    const request = indexedDB.open('aishwary-private-device', 1);
    request.onupgradeneeded = () => request.result.createObjectStore('families');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  try {
    return await new Promise((resolve,reject) => {
      const tx = db.transaction('families', write ? 'readwrite' : 'readonly');
      const store = tx.objectStore('families');
      const request = store.get('family-v1');
      let result;
      tx.oncomplete = () => resolve(result);
      tx.onabort = () => reject(tx.error || new Error('Family changes could not be stored.'));
      request.onsuccess = () => {
        try {
          const family = validateFamily(request.result ?? structuredClone(seed));
          result = operation(family, request.result !== undefined);
          if (write) store.put(validateFamily(result.family), 'family-v1');
        } catch (error) { tx.abort(); reject(error); }
      };
    });
  } finally { db.close(); }
}

let initialization;
async function initializeFamily() {
  if (!initialization) {
    initialization = (async () => {
      const exists = await transaction(false, (_family, stored) => stored);
      if (exists) return;
      let family = structuredClone(seed);
      if (!isLocalWorkspace()) {
        // Import the existing authorized records once before switching to device storage.
        const response = await fetch('/api/admin/family', {cache:'no-store'});
        if (!response.ok) throw new Error('Existing family records could not be loaded. Retry before editing.');
        family = validateFamily(await response.json());
      }
      await transaction(true, (current, stored) => ({family: stored ? current : family}));
    })().catch(error => { initialization = undefined; throw error; });
  }
  await initialization;
}

export async function familyData(options = {}) {
  await initializeFamily();
  const method = options.method || 'GET';
  const body = options.body ? JSON.parse(options.body) : {};
  const result = await transaction(method !== 'GET', family => {
    if (method === 'GET') return family;
    let id = body.id;
    let deletedMember;
    if (method === 'POST') {
      applyCreate(family, body);
      id = family.requests.find(entry => entry.id === body.requestId).memberId;
    } else if (method === 'PATCH') applyUpdate(family, body);
    else if (method === 'DELETE') deletedMember = applyDelete(family, body);
    else throw new Error('Unsupported family operation.');
    return { family, member: family.members.find(person => person.id === id), deletedMember };
  });
  if (method !== 'GET') {
    const channel = new BroadcastChannel('aishwary-family');
    channel.postMessage('updated');
    channel.close();
  }
  return Response.json(result);
}

export async function restoreDeviceFamily(family) {
  await transaction(true, () => ({family:validateFamily(family)}));
}
