/* =========================================================
   dashboardText.js
   Marathi ↔ English lookup for the admin dashboard.
   ========================================================= */

/* CHANGE #1 — original map is Marathi → English */
const toEnglish = new Map([
  ["Netlify वरील घडामोडी", "Netlify activity"],
  ["शेती डॅशबोर्ड", "Farm Dashboard"],
  ["लॉगआउट", "Sign out"],
  ["लॉगआउट झालं नाही. पुन्हा प्रयत्न करा.", "Sign-out failed. Try again."],
  ["साइट व्यवस्थापन", "Site administration"],
  ["प्रशासन", "Admin"],
  ["मुख्यपृष्ठ", "Homepage"],
  ["शेती", "Farm"],
  ["पिके", "Crops"],
  ["गॅलरी", "Gallery"],
  ["कुटुंब", "Family"],
  ["संपर्क", "Contact"],
  ["ऐश्वर्य फार्म्स", "Aishwary Farms"],
  ["विभाग", "Sections"],
  ["एडिटरचे विभाग", "Editor sections"],
  ["मुख्य साइट", "View website"],
  ["गॅलरी गट", "Gallery groups"],
  ["गॅलरी फोटो", "Gallery photos"],
  ["ब्राउझरमध्ये सेव्ह करा", "Save in browser"],
  ["फोल्डरमध्ये सेव्ह करा", "Save to folder"],
  ["JSON डाउनलोड करा", "Download JSON"],
  ["JSON इम्पोर्ट करा", "Import JSON"],
  ["एडिटर लोड होत आहे…", "Loading editor…"],
  ["फाइलमधले बदल वेबसाइटवर सर्वांना दाखवण्यासाठी content.json प्रोजेक्टच्या public फोल्डरमध्ये ठेवून साइट पुन्हा प्रकाशित करा.", "Save content.json in the project’s public folder and redeploy to publish changes for all visitors."],
  ["वरची ओळ", "Eyebrow"],
  ["मुख्य शीर्षक", "Main title"],
  ["ठळक शब्द", "Highlighted words"],
  ["वर्णन", "Description"],
  ["फोटोखालील मजकूर", "Photo caption"],
  ["शीर्षक", "Title"],
  ["शेतीची माहिती", "Farm description"],
  ["पत्ता", "Address"],
  ["भेटीची माहिती", "Visit information"],
  ["सुरक्षा माहिती", "Security information"],
  ["एकूण एकर", "Total acres"],
  ["द्राक्षबाग", "Vineyard acres"],
  ["इतर पिके", "Other crops acreage"],
  ["द्राक्षांचे वाण (प्रत्येक ओळीत एक)", "Grape varieties (one per line)"],
  ["फोन नंबर (प्रत्येक ओळीत एक)", "Phone numbers (one per line)"],
  ["वंशवृक्षाचे शीर्षक", "Family-tree title"],
  ["पिके विभागाचे शीर्षक", "Crops section title"],
  ["पिकाचे नाव", "Crop name"],
  ["इंग्रजी नाव", "English name"],
  ["फोटोचे वर्णन", "Photo alternative text"],
  ["पीक काढा", "Remove crop"],
  ["फोटोसह नवीन पीक जोडा", "Add a crop with photo"],
  ["गॅलरी शीर्षक", "Gallery title"],
  ["गॅलरी वर्णन", "Gallery description"],
  ["फोटो गट", "Photo group"],
  ["नवीन गट", "New group"],
  ["गट जोडा", "Add group"],
  ["गटाचे नाव", "Group name"],
  ["गटाचे वर्णन", "Group description"],
  ["फोटो अपलोड करा", "Upload photos"],
  ["गट काढा", "Remove group"],
  ["व्हिडिओ", "Video"],
  ["कॅप्शन", "Caption"],
  ["मीडिया काढा", "Remove media"],
  ["मूळ मजकूर प्रिव्ह्यू करा", "Preview original content"],
  ["फोटो बदला", "Replace photo"],
  ["या ब्राउझरमध्ये बदल सेव्ह झाले.", "Changes saved in this browser."],
  ["शेवटचे जतन", "Last saved"],
  ["content.json डाउनलोड सुरू आहे.", "Downloading content.json."],
  ["फाइल प्रिव्ह्यूमध्ये उघडली. बदल ठेवण्यासाठी Save करा.", "File opened in preview. Save to keep the changes."],
  ["मूळ मजकूर प्रिव्ह्यूमध्ये आला. तो ठेवण्यासाठी Save करा.", "Original content loaded. Save to keep it."],
  ["बदल पूर्ण झाले नाहीत.", "Changes could not be saved."],
  ["JPG, PNG, WebP किंवा AVIF फोटो निवडा. प्रत्येक फोटो जास्तीत जास्त ८ MB.", "Choose JPG, PNG, WebP or AVIF photos up to 8 MB each."],

  /* CHANGE #2 — section labels that Admin.jsx renders but the map was missing */
  ["आढावा", "Overview"],
  ["संघ निर्देशिका", "Team directory"],
  ["वंशवृक्ष", "Family tree"],
  ["सदस्य", "Members"],
  ["माझी प्रोफाइल", "My profile"],
  ["सेटिंग्ज", "Settings"],
  ["कामे आणि कॅलेंडर", "Tasks & calendar"],
  ["सूचना", "Notifications"],

  /* CHANGE #3 — topbar strings */
  ["साइडबार मेनू शोधा", "Search sidebar menus"],
  ["मेनू शोधा…", "Search menus…"],
  ["कामगिरी विश्लेषण", "Farm Analytics"],
]);

/* CHANGE #4 — dev-time check: every English value must be unique */
if (import.meta.env?.DEV) {
  const seen = new Map();
  for (const [, en] of toEnglish) {
    if (seen.has(en)) {
      console.warn(`[dashboardText] Duplicate English value: "${en}"`);
    }
    seen.set(en, true);
  }
}

/* CHANGE #5 — inverse map built once, with a size sanity check */
const toMarathi = new Map([...toEnglish].map(([mr, en]) => [en, mr]));

if (import.meta.env?.DEV && toMarathi.size !== toEnglish.size) {
  console.warn(
    `[dashboardText] Marathi map has ${toMarathi.size} entries but the source has ${toEnglish.size}; duplicates may have been dropped.`
  );
}

/* CHANGE #6 — type guard so a non-string key doesn't silently vanish */
export function dashboardText(lang, value) {
  if (typeof value !== 'string') return value;
  const table = lang === 'mr' ? toMarathi : toEnglish;
  return table.get(value) ?? value;
}