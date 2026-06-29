/**
 * navigationRegistry.js — Single source of truth for ALL voice navigation.
 *
 * Add a new voice-navigable page = add ONE entry to NAV_REGISTRY. The three
 * maps the rest of the app consumes are derived automatically:
 *   - INTENT_TO_PATH   (intentRouter / conversationManager) → where to go
 *   - NAV_RESPONSES    (conversationManager)                 → what to say
 *   - INTENT_EXAMPLES  (semanticIntentMatcher)               → how to match
 *
 * Languages: English (en) + Hindi (hi) + Assamese (as), native script +
 * Romanized. Matching is max-similarity per example, so every phrase is an
 * independent anchor — add more phrasings to widen recall.
 *
 * CONTEXT_ACTIONS handle page-relative commands: "new connection" while on the
 * Gas page means a gas connection, on Electricity means an electricity one.
 */

// ── Explicit destinations ──────────────────────────────────────────────────────
// Each entry: { intent, path, response, en[], hi[], as[] }
const NAV_REGISTRY = [
  // ── Global / top-level ──
  { intent: 'navigate_home', path: '/home', response: 'Returning to Home.',
    en: ['home', 'main menu', 'go back', 'start over', 'restart', 'home page', 'go to home', 'main page'],
    hi: ['मुख्य मेनू', 'होम', 'घर', 'वापस', 'mukhya menu'],
    as: ['মূল মেনু', 'ঘৰ', 'হোম', 'ঘূৰি যাওক', 'মুখ্য পৃষ্ঠা'] },

  { intent: 'navigate_login', path: '/login', response: 'Taking you to Login.',
    en: ['login', 'sign in', 'log in', 'consumer id', 'account number', 'authenticate', 'go to login'],
    hi: ['लॉगिन', 'साइन इन', 'प्रवेश', 'login'],
    as: ['লগিন', 'প্ৰৱেশ', 'ছাইন ইন', 'একাউণ্ট নম্বৰ'] },

  { intent: 'navigate_dashboard', path: '/dashboard', response: 'Opening your Dashboard.',
    en: ['dashboard', 'my dashboard', 'my account', 'overview', 'go to dashboard'],
    hi: ['डैशबोर्ड', 'मेरा डैशबोर्ड', 'मेरा खाता'],
    as: ['ডেছবৰ্ড', 'মোৰ ডেছবৰ্ড', 'মোৰ একাউণ্ট'] },

  { intent: 'navigate_office_locator', path: '/office-locator', response: 'Opening Office Locator.',
    en: ['office', 'nearby office', 'where is office', 'location', 'address', 'find office', 'go to office locator'],
    hi: ['कार्यालय', 'नजदीकी कार्यालय', 'पता', 'karyalay'],
    as: ['কাৰ্যালয়', 'ওচৰৰ কাৰ্যালয়', 'ঠিকনা', 'কাৰ্যালয় বিচাৰক'] },

  { intent: 'navigate_schemes', path: '/schemes', response: 'Opening Government Schemes.',
    en: ['scheme', 'government scheme', 'benefit', 'subsidy', 'welfare', 'eligibility', 'go to schemes', 'yojana'],
    hi: ['योजना', 'सरकारी योजना', 'लाभ', 'सब्सिडी'],
    as: ['আঁচনি', 'চৰকাৰী আঁচনি', 'সুবিধা', 'অনুদান'] },

  { intent: 'navigate_track', path: '/track-status', response: 'Opening Request Tracking.',
    en: ['track', 'track status', 'check status', 'application status', 'ticket status', 'request status', 'where is my application', 'pending request', 'go to track status'],
    hi: ['स्थिति', 'आवेदन की स्थिति', 'स्थिति जांचें', 'sthiti'],
    as: ['অৱস্থা', 'আবেদনৰ অৱস্থা', 'স্থিতি চাওক', 'টিকটৰ অৱস্থা'] },

  { intent: 'navigate_receipt', path: '/receipt', response: 'Opening your Receipt.',
    en: ['receipt', 'my receipt', 'payment receipt', 'transaction receipt', 'download receipt', 'show receipt'],
    hi: ['रसीद', 'मेरी रसीद', 'भुगतान रसीद', 'रसीद दिखाओ'],
    as: ['ৰচিদ', 'মোৰ ৰচিদ', 'পৰিশোধ ৰচিদ', 'ৰচিদ দেখুৱাওক'] },

  { intent: 'navigate_complaints', path: '/complaints', response: 'Opening Complaint Registration.',
    en: ['complaint', 'grievance', 'register complaint', 'report problem', 'go to complaints', 'file a complaint'],
    hi: ['शिकायत', 'शिकायत दर्ज करें', 'समस्या', 'shikayat'],
    as: ['অভিযোগ', 'অভিযোগ দাখিল', 'সমস্যা', 'নালিচ'] },

  { intent: 'navigate_consumer_profile', path: '/consumer-profile', response: 'Opening your Consumer Profile.',
    en: ['consumer profile', 'my account details', 'consumer details', 'my connection details', 'account profile'],
    hi: ['उपभोक्ता प्रोफाइल', 'उपभोक्ता विवरण', 'मेरा खाता विवरण'],
    as: ['গ্ৰাহক প্ৰোফাইল', 'গ্ৰাহক বিৱৰণ', 'মোৰ সংযোগৰ বিৱৰণ'] },

  { intent: 'navigate_family_profile', path: '/family-profile', response: 'Opening your Family Profile.',
    en: ['family profile', 'my family', 'family members', 'family details', 'dependents', 'add family member'],
    hi: ['परिवार प्रोफाइल', 'मेरा परिवार', 'परिवार के सदस्य', 'परिवार विवरण'],
    as: ['পৰিয়াল প্ৰোফাইল', 'মোৰ পৰিয়াল', 'পৰিয়ালৰ সদস্য', 'পৰিয়ালৰ বিৱৰণ'] },

  // ── Electricity ──
  { intent: 'navigate_electricity', path: '/electricity-menu', response: 'Taking you to Electricity services.',
    en: ['electricity', 'power', 'light', 'meter', 'current supply', 'electricity bill', 'go to electricity', 'open electricity', 'electricity services'],
    hi: ['बिजली', 'बिजली विभाग', 'बिजली का बिल', 'बिजली सेवाएं', 'bijli'],
    as: ['বিদ্যুৎ', 'বিজুলী', 'বিদ্যুৎ সেৱা', 'বিদ্যুৎ বিল', 'bidyut'] },

  { intent: 'navigate_electricity_new_connection', path: '/electricity?category=newConnection', response: 'Opening new electricity connection application.',
    en: ['new electricity connection', 'electricity new connection', 'apply for electricity', 'load extension'],
    hi: ['नया बिजली कनेक्शन', 'बिजली कनेक्शन के लिए आवेदन', 'लोड बढ़ाना'],
    as: ['নতুন বিদ্যুৎ সংযোগ', 'বিদ্যুৎ সংযোগৰ বাবে আবেদন'] },

  { intent: 'navigate_electricity_meter_issue', path: '/electricity?category=meterIssue', response: 'Opening electricity meter issue.',
    en: ['electricity meter issue', 'meter problem', 'meter not working', 'meter reading issue', 'replace meter'],
    hi: ['बिजली मीटर की समस्या', 'मीटर खराब', 'मीटर रीडिंग'],
    as: ['বিদ্যুৎ মিটাৰ সমস্যা', 'মিটাৰ বেয়া', 'মিটাৰ ৰিডিং'] },

  { intent: 'navigate_electricity_complaint', path: '/electricity/complaint', response: 'Opening Electricity Complaint.',
    en: ['electricity complaint', 'power complaint', 'report power cut', 'no electricity', 'power outage', 'light gone'],
    hi: ['बिजली की शिकायत', 'बिजली नहीं है', 'बिजली गुल', 'पावर कट'],
    as: ['বিদ্যুৎ অভিযোগ', 'বিজুলী নাই', 'বিদ্যুৎ কটা', 'কাৰেণ্ট নাই'] },

  // ── Gas ──
  { intent: 'navigate_gas', path: '/gas-menu', response: 'Taking you to Gas services.',
    en: ['gas', 'gas connection', 'cylinder', 'piped gas', 'gas meter', 'go to gas', 'gas services'],
    hi: ['गैस', 'गैस कनेक्शन', 'गैस सिलेंडर', 'gais'],
    as: ['গেছ', 'গেছ সংযোগ', 'গেছ চিলিণ্ডাৰ'] },

  { intent: 'navigate_gas_new_connection', path: '/gas?category=newConnection', response: 'Opening new gas connection application.',
    en: ['new gas connection', 'gas new connection', 'apply for gas connection'],
    hi: ['नया गैस कनेक्शन', 'गैस कनेक्शन के लिए आवेदन'],
    as: ['নতুন গেছ সংযোগ', 'গেছ সংযোগৰ বাবে আবেদন'] },

  { intent: 'navigate_gas_reconnect', path: '/gas?category=reconnect', response: 'Opening gas reconnection.',
    en: ['gas reconnection', 'reconnect gas', 'restore gas connection'],
    hi: ['गैस पुनः कनेक्शन', 'गैस फिर से चालू'],
    as: ['গেছ পুনঃসংযোগ', 'গেছ পুনৰ সংযোগ'] },

  { intent: 'navigate_gas_disconnect', path: '/gas?category=disconnect', response: 'Opening gas disconnection.',
    en: ['gas disconnection', 'disconnect gas', 'surrender gas connection', 'close gas connection'],
    hi: ['गैस कनेक्शन बंद', 'गैस डिस्कनेक्ट'],
    as: ['গেছ সংযোগ বন্ধ', 'গেছ ডিছকনেক্ট'] },

  { intent: 'navigate_gas_prepaid', path: '/gas?category=prepaidConversion', response: 'Opening prepaid gas conversion.',
    en: ['prepaid gas', 'gas prepaid conversion', 'convert to prepaid gas'],
    hi: ['प्रीपेड गैस', 'गैस प्रीपेड'],
    as: ['প্ৰিপেইড গেছ', 'গেছ প্ৰিপেইড'] },

  { intent: 'navigate_gas_pipeline_inspection', path: '/gas?category=pipelineInspection', response: 'Opening gas pipeline inspection.',
    en: ['gas pipeline inspection', 'inspect gas pipeline', 'pipeline check'],
    hi: ['गैस पाइपलाइन निरीक्षण', 'पाइपलाइन जांच'],
    as: ['গেছ পাইপলাইন পৰিদৰ্শন', 'পাইপলাইন পৰীক্ষা'] },

  { intent: 'navigate_gas_maintenance', path: '/gas?category=maintenance', response: 'Opening gas maintenance.',
    en: ['gas maintenance', 'gas servicing', 'service gas connection'],
    hi: ['गैस रखरखाव', 'गैस सर्विसिंग'],
    as: ['গেছ ৰক্ষণাবেক্ষণ', 'গেছ চাৰ্ভিচিং'] },

  { intent: 'navigate_gas_meter_damage', path: '/gas?category=meterDamage', response: 'Opening gas meter damage report.',
    en: ['gas meter damage', 'gas meter broken', 'damaged gas meter'],
    hi: ['गैस मीटर खराब', 'गैस मीटर टूटा'],
    as: ['গেছ মিটাৰ বেয়া', 'গেছ মিটাৰ ভঙা'] },

  { intent: 'navigate_gas_bills', path: '/gas/bills', response: 'Opening Gas Bills.',
    en: ['gas bill', 'pay gas bill', 'gas bill payment', 'view gas bill', 'gas dues'],
    hi: ['गैस का बिल', 'गैस बिल भुगतान', 'गैस बिल देखें'],
    as: ['গেছ বিল', 'গেছ বিল পৰিশোধ', 'গেছ বিল চাওক'] },

  { intent: 'navigate_gas_complaint', path: '/gas/complaint', response: 'Opening Gas Complaint.',
    en: ['gas complaint', 'gas leak', 'report gas problem', 'gas not working', 'no gas'],
    hi: ['गैस की शिकायत', 'गैस लीक', 'गैस नहीं आ रही'],
    as: ['গেছ অভিযোগ', 'গেছ লিক', 'গেছ নাই'] },

  // ── Water ──
  { intent: 'navigate_water', path: '/water', response: 'Taking you to Water services.',
    en: ['water', 'water supply', 'water connection', 'pipe leak', 'tap water', 'water disruption', 'go to water'],
    hi: ['पानी', 'पानी की आपूर्ति', 'पानी कनेक्शन', 'नल का पानी', 'pani'],
    as: ['পানী', 'পানী যোগান', 'পানীৰ সংযোগ', 'নলৰ পানী'] },

  // ── Sanitation ──
  { intent: 'navigate_sanitation', path: '/sanitation', response: 'Taking you to Sanitation services.',
    en: ['sanitation', 'cleanliness', 'garbage', 'waste', 'toilet', 'drainage', 'sewage', 'go to sanitation', 'swachhata'],
    hi: ['सफाई', 'स्वच्छता', 'कचरा', 'शौचालय', 'नाली'],
    as: ['পৰিচ্ছন্নতা', 'চাফাই', 'আৱৰ্জনা', 'শৌচাগাৰ', 'নলা'] },

  // ── Municipal ──
  { intent: 'navigate_municipal', path: '/municipal-menu', response: 'Taking you to Municipal services.',
    en: ['municipal', 'municipality', 'panchayat', 'ward', 'nagar palika', 'street light', 'road damage', 'go to municipal', 'municipal services'],
    hi: ['नगरपालिका', 'नगर पालिका', 'पंचायत', 'nagarpalika'],
    as: ['পৌৰসভা', 'পৌৰ নিগম', 'পঞ্চায়ত', 'ৱাৰ্ড'] },

  { intent: 'navigate_municipal_water_connection', path: '/municipal?category=waterConnection', response: 'Opening municipal water connection.',
    en: ['municipal water connection', 'new water connection', 'apply for water connection'],
    hi: ['नगरपालिका पानी कनेक्शन', 'नया पानी कनेक्शन'],
    as: ['পৌৰসভা পানী সংযোগ', 'নতুন পানী সংযোগ'] },

  { intent: 'navigate_municipal_grievance', path: '/municipal/grievance', response: 'Opening Municipal Grievance.',
    en: ['municipal grievance', 'municipal complaint', 'civic complaint', 'garbage complaint', 'street light complaint'],
    hi: ['नगरपालिका शिकायत', 'नगर निगम शिकायत', 'कचरा शिकायत'],
    as: ['পৌৰসভা অভিযোগ', 'পৌৰ নিগম অভিযোগ', 'আৱৰ্জনা অভিযোগ'] },

  { intent: 'navigate_property_tax', path: '/municipal/property-tax', response: 'Opening Property Tax Payment.',
    en: ['property tax', 'house tax', 'pay property tax', 'land tax', 'building tax'],
    hi: ['संपत्ति कर', 'गृह कर', 'संपत्ति कर भुगतान', 'मकान टैक्स'],
    as: ['সম্পত্তি কৰ', 'ঘৰ কৰ', 'সম্পত্তি কৰ পৰিশোধ', 'ভূমি কৰ'] },

  // ── Transport ──
  { intent: 'navigate_transport', path: '/transport', response: 'Taking you to Transport services.',
    en: ['transport', 'bus', 'vehicle', 'driving license', 'rto', 'permit', 'vehicle registration', 'go to transport'],
    hi: ['परिवहन', 'बस', 'वाहन', 'ड्राइविंग लाइसेंस', 'वाहन पंजीकरण'],
    as: ['পৰিবহণ', 'বাছ', 'বাহন', 'ড্ৰাইভিং লাইচেন্স', 'বাহন পঞ্জীয়ন'] },

  // ── Healthcare ──
  { intent: 'navigate_healthcare', path: '/healthcare', response: 'Taking you to Healthcare services.',
    en: ['healthcare', 'health', 'hospital', 'doctor', 'medical', 'clinic', 'medicine', 'go to healthcare'],
    hi: ['स्वास्थ्य', 'अस्पताल', 'डॉक्टर', 'दवा', 'चिकित्सा'],
    as: ['স্বাস্থ্য', 'স্বাস্থ্যসেৱা', 'চিকিৎসালয়', 'চিকিৎসক', 'ঔষধ'] },
];

// ── Derived maps (do not hand-edit — change NAV_REGISTRY instead) ───────────────
export const INTENT_TO_PATH = Object.fromEntries(NAV_REGISTRY.map(e => [e.intent, e.path]));
export const NAV_RESPONSES  = Object.fromEntries(NAV_REGISTRY.map(e => [e.intent, e.response]));
export const INTENT_EXAMPLES = Object.fromEntries(
  NAV_REGISTRY.map(e => [e.intent, [...e.en, ...e.hi, ...e.as]])
);

// ── Page-context resolution ─────────────────────────────────────────────────────
// Maps the current route to a service key, so bare action words resolve to the
// right service ("new connection" on /gas → gas connection).
const SERVICE_BY_PATH_PREFIX = [
  ['/electricity', 'electricity'],
  ['/gas',         'gas'],
  ['/water',       'water'],
  ['/sanitation',  'sanitation'],
  ['/municipal',   'municipal'],
  ['/transport',   'transport'],
  ['/healthcare',  'healthcare'],
];

export function serviceFromPath(path = '') {
  for (const [prefix, service] of SERVICE_BY_PATH_PREFIX) {
    if (path.startsWith(prefix)) return service;
  }
  return null;
}

// Service words used to detect when the user explicitly names a *different*
// service than the page they're on (then we defer to the semantic matcher).
const SERVICE_KEYWORDS = {
  electricity: ['electricity', 'power', 'bijli', 'बिजली', 'বিদ্যুৎ', 'বিজুলী'],
  gas:         ['gas', 'gais', 'गैस', 'গেছ'],
  water:       ['water', 'pani', 'पानी', 'পানী'],
  municipal:   ['municipal', 'municipality', 'nagarpalika', 'नगरपालिका', 'পৌৰসভা'],
  sanitation:  ['sanitation', 'garbage', 'सफाई', 'स्वच्छता', 'পৰিচ্ছন্নতা'],
  transport:   ['transport', 'परिवहन', 'পৰিবহণ'],
  healthcare:  ['healthcare', 'health', 'स्वास्थ्य', 'স্বাস্থ্য'],
};

function serviceFromUtterance(lower) {
  for (const [service, words] of Object.entries(SERVICE_KEYWORDS)) {
    if (words.some(w => lower.includes(w.toLowerCase()))) return service;
  }
  return null;
}

// Generic, page-relative actions. Keyword-matched (not embeddings) so they are
// deterministic and fast. `byService` picks the concrete path from the current
// page; `fallback` is used when not on a service page.
const CONTEXT_ACTIONS = [
  {
    key: 'new_connection',
    response: 'Opening new connection application.',
    phrases: ['new connection', 'apply for connection', 'apply connection', 'get a connection', 'i want a connection',
              'नया कनेक्शन', 'कनेक्शन के लिए आवेदन', 'নতুন সংযোগ', 'সংযোগৰ বাবে আবেদন'],
    byService: {
      electricity: '/electricity?category=newConnection',
      gas:         '/gas?category=newConnection',
      municipal:   '/municipal?category=waterConnection',
      water:       '/municipal?category=waterConnection',
    },
  },
  {
    key: 'meter_issue',
    response: 'Opening meter issue.',
    phrases: ['meter issue', 'meter problem', 'meter not working', 'report meter', 'meter reading',
              'मीटर की समस्या', 'मीटर खराब', 'মিটাৰ সমস্যা', 'মিটাৰ বেয়া'],
    byService: {
      electricity: '/electricity?category=meterIssue',
      gas:         '/gas?category=meterDamage',
    },
  },
  {
    key: 'pay_bill',
    response: 'Opening bill payment.',
    phrases: ['pay bill', 'pay my bill', 'bill payment', 'pay the bill',
              'बिल भुगतान', 'बिल भरना', 'বিল পৰিশোধ', 'বিল ভৰোৱা'],
    byService: {
      gas:       '/gas/bills',
      municipal: '/municipal/property-tax',
    },
  },
  {
    key: 'register_complaint',
    response: 'Opening complaint registration.',
    phrases: ['complaint', 'grievance', 'register complaint', 'file complaint', 'make a complaint', 'register a complaint', 'report problem',
              'शिकायत', 'अभियोग दाखिल', 'অভিযোগ', 'নালিচ'],
    byService: {
      electricity: '/electricity/complaint',
      gas:         '/gas/complaint',
      municipal:   '/municipal/grievance',
    },
    fallback: '/complaints',
  },
];

/**
 * Resolve a page-relative generic action.
 * @param {string} utterance   raw transcript
 * @param {string} currentPath current route (window-relative path)
 * @returns {{intent, path, response, confidence, source} | null}
 */
export function resolveContextAction(utterance, currentPath = '/') {
  if (!utterance?.trim()) return null;
  const lower = utterance.toLowerCase();
  const currentService = serviceFromPath(currentPath);
  const mentioned = serviceFromUtterance(lower);

  // User explicitly named a different service → let the semantic matcher handle
  // the explicit destination instead of forcing the current page's action.
  if (mentioned && mentioned !== currentService) return null;

  for (const action of CONTEXT_ACTIONS) {
    const hit = action.phrases.some(p => lower.includes(p.toLowerCase()));
    if (!hit) continue;
    const path = (currentService && action.byService[currentService]) || action.fallback || null;
    if (path) {
      return {
        intent: `action_${action.key}`,
        path,
        response: action.response,
        confidence: 0.99,
        source: 'context',
      };
    }
  }
  return null;
}

export default { INTENT_TO_PATH, NAV_RESPONSES, INTENT_EXAMPLES, resolveContextAction, serviceFromPath };
