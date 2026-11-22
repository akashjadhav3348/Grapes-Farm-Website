/* =========================================================
   data.js — static content source for the Aishwary Farms site
   ========================================================= */

export const crops = [
  { id: 'grapes',   english: 'Grapes',    name: 'द्राक्षं', photo: 'farm/56.jpg',       alt: 'ऐश्वर्य फार्म्सच्या वेलीवरचे हिरवे द्राक्षांचे घड', description: 'सात एकरांत, वेगवेगळ्या प्लॉट्समध्ये द्राक्षांच्या वाणांची लागवड.' },
  { id: 'wheat',    english: 'Wheat',     name: 'गहू',      photo: 'crops/wheat.jpg',    alt: 'शेतात पिकलेल्या गव्हाच्या ओंब्या',                 description: 'द्राक्षबागेसोबत घेतलं जाणारं आमचं धान्यपीक.', illustrative: true },
  { id: 'tomatoes', english: 'Tomatoes',  name: 'टोमॅटो',   photo: 'crops/tomatoes.jpg', alt: 'झाडावरचे लाल आणि हिरवे टोमॅटो',                    description: 'शेतातील भाजीपाला पिकांपैकी एक.', illustrative: true },
  { id: 'onions',   english: 'Onions',    name: 'कांदा',     photo: 'crops/onions.jpg',   alt: 'शेतात काढलेले लाल कांदे',                          description: 'गहू आणि टोमॅटोसह उरलेल्या क्षेत्रात घेतलं जाणारं पीक.', illustrative: true },
];

export const varieties = ['Thompson Seedless', 'RK', 'SSN', 'ARRA', 'Sahyadri Crimson'];

/* =========================================================
   family
   Three node shapes live here:
     - owner / owner.spouse       → { name, relation, avatar }
     - branch                     → { name, spouse: string, children: [...] }
     - child                      → { name, relation, avatar, spouse?: string,
                                      profession?, status?, children?: [...] }
   `familyNames` in content.js flattens all three into one list.
   ========================================================= */
export const family = {
  owner: { name: 'निवृत्ती रखमाजी जाधव', relation: 'कुटुंबप्रमुख व शेतमालक', avatar: 'elder-man' },
  spouse: { name: 'भीमाबाई निवृत्ती जाधव', relation: 'पत्नी', avatar: 'elder-woman' },
  branches: [
    {
      name: 'मधुकर निवृत्ती जाधव',
      spouse: 'सिंधुबाई मधुकर जाधव',
      children: [
        {
          name: 'विकास मधुकर जाधव', relation: 'मुलगा', avatar: 'man', profession: 'Farmer',
          spouse: 'अनुजा विकास जाधव',
          children: [{ name: 'ऐश्वर्य विकास जाधव', relation: 'मुलगा', avatar: 'boy' }],
        },
        {
          name: 'सचिन मधुकर जाधव', relation: 'मुलगा', avatar: 'man', profession: 'Farmer · Farm Manager',
          spouse: 'अश्विनी सचिन जाधव',
          children: [
            { name: 'सान्वी सचिन जाधव', relation: 'मुलगी', avatar: 'girl' },
            { name: 'शिव सचिन जाधव', relation: 'मुलगा', avatar: 'boy' },
          ],
        },
      ],
    },
    {
      name: 'ज्ञानेश्वर निवृत्ती जाधव',
      spouse: 'मीनाबाई ज्ञानेश्वर जाधव',
      children: [
        { name: 'पूजा ज्ञानेश्वर जाधव',   relation: 'मुलगी', avatar: 'woman', status: 'विवाहित' },
        { name: 'अर्चना ज्ञानेश्वर जाधव', relation: 'मुलगी', avatar: 'woman', status: 'विवाहित' },
        { name: 'आकाश ज्ञानेश्वर जाधव',   relation: 'मुलगा', avatar: 'man', profession: 'Software Developer', status: 'अविवाहित' },
      ],
    },
    {
      name: 'संजय निवृत्ती जाधव',
      spouse: 'लताबाई संजय जाधव',
      children: [
        { name: 'अमोल संजय जाधव',  relation: 'मुलगा', avatar: 'man', profession: 'Automotive Electrical & ECM Specialist', status: 'अविवाहित' },
        { name: 'ऋतुजा संजय जाधव', relation: 'मुलगी', avatar: 'woman', status: 'विवाहित' },
      ],
    },
  ],
};

export const galleryGroups = [
  { label: 'नवी पालवी',       description: 'द्राक्षवेलीची नवी पालवी',        ids: [28, 19, 30, 21, 44, 25] },
  { label: 'वेलींची वाढ',      description: 'द्राक्षबागेतल्या वेलींच्या रांगा',  ids: [22, 57, 72, 13, 17, 20, 27, 58, 62, 63, 66, 69, 71] },
  { label: 'वेलीवरचे घड',      description: 'वेलीवरचे द्राक्षांचे घड',           ids: [67, 45, 56, 42, 51, 70, 6, 7, 11, 14, 15, 18, 31, 34, 36, 37, 38, 40, 46, 47, 48, 49, 50, 52, 53, 54, 59, 60, 61, 64, 65, 73, 75, 76] },
  { label: 'तोडणी व पॅकिंग',   description: 'तोडलेली द्राक्षं आणि क्रेट्स',      ids: [55, 8, 43, 10, 68, 74, 4, 5, 9, 16, 23, 24, 26, 29, 33, 35, 39, 41] },
  { label: 'शेताची दृश्यं',     description: 'ऐश्वर्य फार्म्सवरचं इंद्रधनुष्य',   ids: [78, 77, 79, 80] },
  { label: 'व्हिडिओ',           description: 'शेतातला व्हिडिओ',                  ids: [1, 2, 3, 12, 32], video: true },
];

/* CHANGE #1 — asset() removed: `photoSource` in content.js already does this
   (and also handles `data:` URLs and falsy input). Nothing imported this helper. */

/* =========================================================
   Dev-time sanity checks
   ========================================================= */
if (import.meta.env?.DEV) {
  /* CHANGE #2 — gallery ids must be unique across groups */
  const seenIds = new Map();
  for (const group of galleryGroups) {
    for (const id of group.ids) {
      if (seenIds.has(id)) {
        console.warn(`[data] Gallery id ${id} is used in both "${seenIds.get(id)}" and "${group.label}".`);
      }
      seenIds.set(id, group.label);
    }
  }

  /* CHANGE #3 — crop ids must be unique */
  const cropIds = new Set();
  for (const crop of crops) {
    if (cropIds.has(crop.id)) console.warn(`[data] Duplicate crop id: ${crop.id}`);
    cropIds.add(crop.id);
  }
}