import { crops, family, galleryGroups, varieties } from './data.js';

export const familyNames = [
  family.owner.name, family.spouse.name,
  ...family.branches.flatMap((branch) => [
    branch.name, branch.spouse,
    ...branch.children.flatMap((person) => [
      person.name, ...(person.spouse ? [person.spouse] : []),
      ...(person.children ?? []).map((child) => child.name),
    ]),
  ]),
];

export const initialContent = {
  version: 1,
  hero: {
    eyebrow: 'ऐश्वर्य फार्म्स · कुंभारी, महाराष्ट्र',
    title: 'आमची माती,',
    accent: 'आमचा अभिमान',
    description: 'कुंभारीतली जाधव कुटुंबाची १० एकर शेती. आमच्या द्राक्षबागेची, इतर पिकांची आणि शेती सांभाळणाऱ्या कुटुंबाची ओळख.',
    image: 'farm/73.jpg',
    caption: 'ऐश्वर्य फार्म्सची द्राक्षबाग',
    acres: ['10', '7', '3'],
  },
  farm: {
    title: 'कुंभारीतली आमची शेती',
    description: 'एकूण १० एकरांपैकी ७ एकरांवर द्राक्षबाग आहे. उरलेल्या ३ एकरांत गहू, टोमॅटो आणि कांदा पिकवतो. शेतातील सर्व प्लॉट्सचं व्यवस्थापन सचिन मधुकर जाधव पाहतात.',
    image: 'farm/78.jpg',
    varieties,
  },
  cropTitle: 'आमच्या शेतात काय पिकतं?',
  familyTitle: 'जाधव कुटुंबाचा वंशवृक्ष',
  familyLabels: {},
  crops: crops.map((crop, index) => ({ ...crop, id: `crop-${index}` })),
  galleryTitle: 'पालवीपासून तोडणीपर्यंत',
  galleryDescription: 'नवी पालवी, वेलीवरचे घड आणि तोडणीनंतरची क्रेट्स. शेतातले खरे फोटो आणि व्हिडिओ.',
  gallery: galleryGroups.map(({ label, description, ids, video }, index) => ({
    id: `gallery-${index}`,
    label,
    description,
    items: ids.map((id) => {
      const stem = String(id).padStart(2, '0');
      return { id: stem, src: `farm/${stem}.${video ? 'mp4' : 'jpg'}`, thumb: video ? '' : `thumb/${stem}.jpg`, caption: '', video: !!video };
    }),
  })),
  visit: {
    title: 'कुंभारीत भेटूया',
    address: 'Aishwary Farms · कुंभारी, महाराष्ट्र',
    description: 'शेताला भेट देण्यापूर्वी किंवा पिकांच्या उपलब्धतेसाठी फोन करा.',
    phones: ['79721 22898', '99607 15879', '98229 80339'],
    security: 'शेताच्या सुरक्षेसाठी CCTV कॅमेऱ्यांची व्यवस्था आहे.',
  },
};

export const photoTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export const contentFile = 'content.json';
export const browserChannel = 'aishwary-content';

function strings(object, fields) {
  return object && fields.every((field) => typeof object[field] === 'string');
}

function list(value, test) {
  return Array.isArray(value) && value.every(test);
}

function media(value, video = false) {
  return typeof value === 'string' && (
    (video ? /^(?:farm|thumb|crops)\/[\w.-]+\.(?:mp4|webm)$/i : /^(?:farm|thumb|crops)\/[\w.-]+\.(?:jpe?g|png|webp|avif)$/i).test(value) ||
    (video ? /^data:video\/(?:mp4|webm);base64,[a-z0-9+/]+=*$/i : /^data:image\/(?:jpeg|png|webp|avif);base64,[a-z0-9+/]+=*$/i).test(value)
  );
}

export function parseContent(value) {
  const valid = value?.version === 1 &&
    strings(value.hero, ['eyebrow', 'title', 'accent', 'description', 'caption']) &&
    media(value.hero.image) && value.hero.acres?.length === 3 &&
    list(value.hero.acres, (item) => typeof item === 'string') &&
    strings(value.farm, ['title', 'description']) && media(value.farm.image) &&
    list(value.farm.varieties, (item) => typeof item === 'string') &&
    (value.additionalFarms === undefined || list(value.additionalFarms, f => strings(f, ['id','name','village','description']) && typeof f.visible === 'boolean')) &&
    strings(value, ['cropTitle', 'familyTitle', 'galleryTitle', 'galleryDescription']) &&
    value.familyLabels && !Array.isArray(value.familyLabels) && typeof value.familyLabels === 'object' &&
    Object.entries(value.familyLabels).every(([name, label]) => familyNames.includes(name) && typeof label === 'string') &&
    list(value.crops, (crop) => strings(crop, ['id', 'name', 'english', 'alt', 'description']) && (crop.photo === '' || media(crop.photo))) &&
    list(value.gallery, (group) => strings(group, ['id', 'label', 'description']) &&
      list(group.items, (item) => strings(item, ['id', 'caption']) && typeof item.video === 'boolean' &&
        media(item.src, item.video) && (!item.thumb || media(item.thumb)))) &&
    strings(value.visit, ['title', 'address', 'description', 'security']) &&
    list(value.visit.phones, (phone) => typeof phone === 'string' && (!phone.trim() || /^[+\d ()-]{3,24}$/.test(phone)));
  if (!valid) throw new Error('Invalid Aishwary Farms content.json');
  return value;
}

function database() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(browserChannel, 1);
    request.onupgradeneeded = () => request.result.createObjectStore('content');
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function browserContent(next, savedAt) {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction('content', next ? 'readwrite' : 'readonly');
      const store = transaction.objectStore('content');
      const request = next ? store.put(next, 'current') : store.get('current');
      if (next && savedAt) store.put(savedAt, 'savedAt');
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function browserContentSavedAt() {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction('content', 'readonly');
      const request = transaction.objectStore('content').get('savedAt');
      transaction.oncomplete = () => resolve(request.result);
      transaction.onabort = () => reject(transaction.error);
      transaction.onerror = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function readPublishedContent() {
  const response = await fetch(`${import.meta.env.BASE_URL}${contentFile}`, { cache: 'no-store' });
  if (!response.ok || !response.headers.get('content-type')?.includes('json')) return null;
  return parseContent(await response.json());
}

export function photoSource(path) {
  return path.startsWith('data:') ? path : `${import.meta.env.BASE_URL}assets/${path}`;
}
