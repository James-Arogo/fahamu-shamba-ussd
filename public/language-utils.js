// Global Language Management System
if (typeof SUPPORTED_LANGUAGES === 'undefined') {
    var SUPPORTED_LANGUAGES = ['english', 'swahili', 'luo'];
}
if (typeof DEFAULT_LANGUAGE === 'undefined') {
    var DEFAULT_LANGUAGE = 'english';
}
if (typeof STORAGE_KEY === 'undefined') {
    var STORAGE_KEY = 'fahamuShamba_language';
}
if (typeof LANGUAGE_STORAGE_KEYS === 'undefined') {
    var LANGUAGE_STORAGE_KEYS = ['fahamuShamba_language', 'fahamuLanguage', 'fahamu_language', 'fs_language'];
}
if (typeof AUTO_TRANSLATION_CACHE_PREFIX === 'undefined') {
    var AUTO_TRANSLATION_CACHE_PREFIX = 'fahamuShamba_autoTranslation_';
}

var autoTranslationOriginalText = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
var autoTranslationOriginalAttrs = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
var autoTranslationTimer = null;
var autoTranslationObserver = null;
var autoTranslationBusy = false;

if (typeof translations === 'undefined') {
    var translations = {
  english: {
    // General
    welcome: 'Welcome',
    select_language: 'Select Language',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    landing_title: 'Fahamu Shamba',
    landing_subtitle: 'Smart Farming Companion',
    landing_tagline: 'Your AI-Powered Guide to Better Farming',
    landing_select_lang: 'Please select your preferred language:',
    get_started: 'Get Started',
    learn_more: 'Learn More',
    
    // Auth Pages
    login: 'Login',
    register: 'Register',
    create_account: 'Create Account',
    full_name: "Full Name",
    enter_full_name: "Enter your full name",
    username: "Username",
    enter_username: "Enter your username",
    phone_number: "Phone Number",
    example_phone: "e.g., 0712345678",
    sub_county: "Sub-County",
    select_sub_county: "Select Sub-County",
    ward: "Ward",
    enter_ward: "Enter your ward",
    farm_size: "Farm Size (Acres)",
    example_farm_size: "e.g., 2",
    main_crop: "Main Crop",
    select_crop: "Select Crop",
    password: "Password",
    create_password: "Create a password",
    confirm_password: "Confirm Password",
    confirm_your_password: "Confirm your password",
    already_have_account: "Already have an account? Login",
    welcome_back: "Welcome Back!",
    dont_have_account: "Don't have an account? Sign Up",
    back_home: "Back to Home",
    
    // Registration Step 2
    profile_setup: 'Profile Setup',
    county: 'County',
    select_county: 'Select County',
    enter_name: 'Enter your full name',
    enter_county: 'Select your county',
    complete_profile: 'Complete Profile',
    
    // Dashboard
    dashboard: 'Dashboard',
    good_morning: 'Good morning',
    good_afternoon: 'Good afternoon',
    good_evening: 'Good evening',
    logout: 'Logout',
    farm_profile: 'Your Farm Profile',
    success_rate: 'Success Rate',
    ready_to_plant: 'Ready to Plant',
    top_crop: 'Top Crop',
    recommended: 'Recommended',
    available: 'Available',
    recommendations: 'Recommendations',
    soil_map: 'Siaya Soil Map',
    updated: 'Last Updated',
    today: 'Today',
    name: 'Name',
    county_label: 'County',
    ward_label: 'Ward',
    farm_size_label: 'Farm Size',
    soil_type: 'Soil Type',
    prediction_result: 'Prediction Result',
    predicted_crop: 'Predicted Crop',
    confidence: 'Confidence',
    reason: 'Reason',
    prediction_history: 'Prediction History',
    suggestions_caption: 'Top suggestions:',
    
    // Tabs
    crops: 'Crop Guide',
    weather: 'Weather',
    market_prices: 'Market Prices',
    community: 'Community',
    feedback: 'Feedback',
    settings: 'Settings',
    my_profile: 'My Profile',
    service_marketplace: 'Service Marketplace',
    
    // Recommendations
    get_recommendations: 'Generate Recommendations',
    select_location: 'Select your location',
    select_soil: 'Select soil type',
    select_season: 'Select season',
    budget: 'Budget (KSh)',
    water_source: 'Water Source',
    long_rains: 'Long Rains (Mar-May)',
    short_rains: 'Short Rains (Oct-Dec)',
    dry_season: 'Dry Season (Jun-Sep)',
    sandy: 'Sandy',
    clay: 'Clay',
    loam: 'Loam',
    rainfall: 'Rainfall',
    well: 'Well',
    borehole: 'Borehole',
    irrigation: 'Irrigation System',
    try_demo: 'Try Demo Data',
    
    // Messages
    registration_success: 'Account created successfully!',
    login_success: 'Logged in successfully!',
    logout_success: 'Logged out successfully!',
    profile_setup_failed: 'Profile setup failed. Please try again.',
    network_error: 'Network error. Please check your connection.',
    all_fields_required: 'All fields are required',
    invalid_credentials: 'Invalid phone or password',
    phone_already_registered: 'Phone number already registered',
  },
  swahili: {
    // General
    welcome: 'Karibu',
    select_language: 'Chagua Lugha',
    loading: 'Inapakia...',
    error: 'Hitilafu',
    success: 'Mafanikio',
    
    // Landing Page
    landing_title: 'Fahamu Shamba',
    landing_subtitle: 'Mwanzo wa Ujifunzaji wa Ukulima',
    landing_tagline: 'Njia ya AI Kuongeza Uzalishaji wa Biashara ya Ukulima',
    landing_select_lang: 'Tafadhali chagua lugha inayopendelea:',
    get_started: 'Anza',
    learn_more: 'Jifunze Zaidi',
    
    // Auth Pages
    login: "Ingia",
    register: 'Jisajili',
    create_account: "Unda Akaunti",
    full_name: "Jina Kamili",
    enter_full_name: "Weka jina lako kamili",
    username: "Jina la mtumiaji",
    enter_username: "Weka jina la mtumiaji",
    phone_number: "Nambari ya Simu",
    example_phone: "mfano, 0712345678",
    sub_county: "Kaunti Ndogo",
    select_sub_county: "Chagua Kaunti Ndogo",
    ward: "Wodi",
    enter_ward: "Weka wodi yako",
    farm_size: "Ukubwa wa Shamba (ekari)",
    example_farm_size: "mfano, 2",
    main_crop: "Mzao Mkuu",
    select_crop: "Chagua Mzao",
    password: "Nenosiri",
    create_password: "Unda nenosiri",
    confirm_password: "Thibitisha Nenosiri",
    confirm_your_password: "Thibitisha nenosiri lako",
    already_have_account: "Tayari una akaunti? Ingia",
    welcome_back: "Karibu Tena!",
    dont_have_account: "Huna akaunti? Jisajili",
    back_home: "Rudi Nyumbani",

    // Registration Step 2
    profile_setup: 'Mipango ya Wasifu',
    county: 'Kaunti',
    select_county: 'Chagua Kaunti',
    enter_name: 'Ingiza jina lako kamili',
    enter_county: 'Chagua kaunti yako',
    complete_profile: 'Kumalizia Wasifu',
    
    // Dashboard
    dashboard: 'Dashibodi',
    good_morning: 'Habari za asubuhi',
    good_afternoon: 'Habari za jioni',
    good_evening: 'Habari za jioni',
    logout: 'Toka',
    farm_profile: 'Wasifu wa Shamba Lako',
    success_rate: 'Kiwango cha Mafanikio',
    ready_to_plant: 'Tayari Kupanda',
    top_crop: 'Zao Bora',
    recommended: 'Linarekomendwa',
    available: 'Ilipatikana',
    recommendations: 'Mapendekezo',
    soil_map: 'Ramani ya Udongo ya Siaya',
    updated: 'Ilisasishwa Mwisho',
    today: 'Leo',
    name: 'Jina',
    county_label: 'Kaunti',
    ward_label: 'Kata',
    farm_size_label: 'Ukubwa wa Shamba',
    soil_type: 'Aina ya Udongo',
    prediction_result: 'Matokeo ya Utabiri',
    predicted_crop: 'Shamba Linalotabiriwa',
    confidence: 'Uaminifu',
    reason: 'Sababu',
    prediction_history: 'Historia ya Makisio',
    suggestions_caption: 'Mapendekezo Bora:',
    
    // Tabs
    crops: 'Mwongozo wa Mazao',
    weather: 'Tabia Nchi',
    market_prices: 'Bei za Soko',
    community: 'Jamii',
    feedback: 'Maoni',
    settings: 'Mipangilio',
    my_profile: 'Wasifu Wangu',
    service_marketplace: 'Soko la Huduma',
    
    // Recommendations
    get_recommendations: 'Pata Mapendekezo',
    select_location: 'Chagua mahali pako',
    select_soil: 'Chagua aina ya udongo',
    select_season: 'Chagua msimu',
    budget: 'Bajeti (KSh)',
    water_source: 'Chanzo cha Maji',
    long_rains: 'Mvua Ndefu (Mar-Mei)',
    short_rains: 'Mvua Fupi (Okt-Des)',
    dry_season: 'Msimu wa Ukame (Jun-Sep)',
    sandy: 'Kumimina',
    clay: 'Udongo',
    loam: 'Udongo Mzuri',
    rainfall: 'Mvua',
    well: 'Kisima',
    borehole: 'Mtoto wa Ardhi',
    irrigation: 'Mfumo wa Kuvia',
    try_demo: 'Jaribu Mifano',
    
    // Messages
    registration_success: 'Akaunti ilitengenezwa kitaifa!',
    login_success: 'Umeingia kitaifa!',
    logout_success: 'Umeingia nje!',
    profile_setup_failed: 'Mipango ya wasifu haikutengenezwa. Tafadhali jaribu tena.',
    network_error: 'Hitilafu ya mtandao. Tafadhali angalia muunganisho wako.',
    all_fields_required: 'Sehemu zote zinahitajika',
    invalid_credentials: 'Nambari ya simu au neno la siri si sahihi',
    phone_already_registered: 'Nambari ya simu tayari imejisajili',
  },
  luo: {
    // General
    welcome: 'Oyawore',
    select_language: 'Rito Holo',
    loading: 'Oyako...',
    error: 'Mapile',
    success: 'Okonyo',
    
    // Landing Page
    landing_title: 'Fahamu Shamba',
    landing_subtitle: 'Jadol Mokwongo',
    landing_tagline: 'AI Manyien Magetiniyamore Puonj',
    landing_select_lang: 'Rito holo moloyo:',
    get_started: 'Chako',
    learn_more: 'Ongo Mak',
    
    // Auth Pages
    login: 'Jothieth',
    register: 'Jothieth Hara',
    create_account: 'Yie Akaunti',
    full_name: "",
    enter_full_name: "",
    username: "",
    enter_username: "",
    phone_number: "",
    example_phone: "",
    sub_county: "",
    select_sub_county: "",
    ward: "",
    enter_ward: "",
    farm_size: "",
    example_farm_size: "",
    main_crop: "",
    select_crop: "",
    password: "",
    create_password: "",
    confirm_password: "",
    confirm_your_password: "",
    already_have_account: "",
    welcome_back: "Oyawore Hara!",
    dont_have_account: "",
    back_home: "Dok Home",

    // Registration Step 2
    profile_setup: 'Setup Ranyisi',
    county: 'County',
    select_county: 'Rito County',
    enter_name: 'Gir nyingʼ moloyo',
    enter_county: 'Rito county moloyo',
    complete_profile: 'Yie akaunti',
    
    // Dashboard
    dashboard: 'Dashboard',
    good_morning: 'Oyawore Ohi',
    good_afternoon: 'Oyawore Ndalo',
    good_evening: 'Oyawore Odhiambo',
    logout: 'Chalogi',
    farm_profile: 'Ranyisi Bonde Moloyo',
    success_rate: 'Ranyisi mar Ber',
    ready_to_plant: 'Oyawore Mundo',
    top_crop: 'Cham Maber',
    recommended: 'Gilaore',
    available: 'Ni nitie',
    recommendations: 'Ranyisi',
    soil_map: 'Ramani mar Udongo e Siaya',
    updated: 'Ilisasishwa Mwisho',
    today: 'Kawuono',
    name: 'Nyingʼ',
    county_label: 'County',
    ward_label: 'Ward',
    farm_size_label: 'Pako Bonde',
    soil_type: 'Moro Lod',
    prediction_result: 'Ranyisi Giko',
    predicted_crop: 'Cham mogik',
    confidence: 'Gogweyo',
    reason: 'Kata',
    prediction_history: 'Ranyisi Mohero',
    suggestions_caption: 'Gem ranyisi ma otwayo:',
    
    // Tabs
    crops: 'Jadol Olum',
    weather: 'Lofta',
    market_prices: 'Tan Sokh',
    community: 'Oganda',
    feedback: 'Duoko',
    settings: 'Ter',
    my_profile: 'Profaila Mara',
    service_marketplace: 'Chiro mar Tich',
    
    // Recommendations
    get_recommendations: 'Kod Gieso',
    select_location: 'Rito puonj moloyo',
    select_soil: 'Rito moro lod',
    select_season: 'Rito dengo',
    budget: 'Pesa (KSh)',
    water_source: 'Chiemo Pi',
    long_rains: 'Pi Mabeche (Mar-Mei)',
    short_rains: 'Pi Magetha (Okt-Des)',
    dry_season: 'Dengo Kumbe (Jun-Sep)',
    sandy: 'Lod Macho',
    clay: 'Lod Moseche',
    loam: 'Lod Mabichgi',
    rainfall: 'Pi',
    well: 'Kisima',
    borehole: 'Bor',
    irrigation: 'Pi System',
    try_demo: 'Tem Demo',
    
    // Messages
    registration_success: 'Akaunti nilikre maigi!',
    login_success: 'Ni jothieth maigi!',
    logout_success: 'Ni chalogi maigi!',
    profile_setup_failed: 'Ranyisi mapile. Jaribu hara.',
    network_error: 'Network mapile. Check muunganisho.',
    all_fields_required: 'Sehemu duto mahitajik',
    invalid_credentials: 'Namba mar simu or nyithindo mag dak mapile',
    phone_already_registered: 'Namba mar simu osejajili',
  }
};
}

function getBrowserLanguage() {
  const lang = navigator.language || navigator.userLanguage;
  if (lang.startsWith('sw')) return 'swahili';
  // Assuming 'luo' is the browser code for Dholuo. May need adjustment.
  if (lang.startsWith('luo') || lang.startsWith('dho')) return 'luo'; 
  return 'english';
}

function normalizeLanguageCode(lang) {
  const normalized = String(lang || '').toLowerCase().trim();
  const aliases = {
    english: 'english',
    en: 'english',
    sw: 'swahili',
    swahili: 'swahili',
    kiswahili: 'swahili',
    luo: 'luo',
    dholuo: 'luo'
  };
  return aliases[normalized] || DEFAULT_LANGUAGE;
}

function persistLanguageAcrossProject(lang) {
  const normalized = normalizeLanguageCode(lang);
  const shortCode = normalized === 'english' ? 'en' : normalized === 'swahili' ? 'sw' : 'luo';

  LANGUAGE_STORAGE_KEYS.forEach((key) => {
    const value = key === STORAGE_KEY ? normalized : shortCode;
    localStorage.setItem(key, value);
    sessionStorage.setItem(key, value);
  });
}

// Get current language
function getCurrentLanguage() {
  for (const key of LANGUAGE_STORAGE_KEYS) {
    const stored = localStorage.getItem(key) || sessionStorage.getItem(key);
    const normalized = normalizeLanguageCode(stored);
    if (stored && SUPPORTED_LANGUAGES.includes(normalized)) {
      return normalized;
    }
  }
  
  // If no language is stored, detect from browser settings
  const browserLang = getBrowserLanguage();
  if (SUPPORTED_LANGUAGES.includes(browserLang)) {
      setLanguage(browserLang); // Save the detected language
      return browserLang;
  }

  return DEFAULT_LANGUAGE;
}

// Set language preference
function setLanguage(lang) {
  const normalized = normalizeLanguageCode(lang);
  if (SUPPORTED_LANGUAGES.includes(normalized)) {
    persistLanguageAcrossProject(normalized);
    // Dispatch custom event so pages can listen for language changes
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: normalized } }));
    return true;
  }
  return false;
}

// Get translated string (supports nested keys like "instructions.new")
function t(key, lang = null) {
  const language = lang || getCurrentLanguage();
  
  // Handle nested keys with dot notation (e.g., "instructions.new")
  const keys = key.split('.');
  let value = translations[language];
  
  for (const k of keys) {
    value = value?.[k];
  }
  
  // Fallback to English if not found
  if (!value) {
    value = translations[DEFAULT_LANGUAGE];
    for (const k of keys) {
      value = value?.[k];
    }
  }
  
  // Return the value or the original key if not found
  return value || key;
}

function shouldAutoTranslateText(text) {
  const normalized = String(text || '').replace(/\s+/g, ' ').trim();
  if (normalized.length < 2 || normalized.length > 220) return false;
  if (!/[A-Za-z]/.test(normalized)) return false;
  if (/^[\d\s.,:;/%()+#-]+$/.test(normalized)) return false;
  return true;
}

function shouldSkipAutoTranslateElement(element) {
  if (!element || element.nodeType !== 1) return true;
  const tagName = element.tagName;
  if (['SCRIPT', 'STYLE', 'NOSCRIPT', 'CODE', 'PRE', 'SVG', 'CANVAS'].includes(tagName)) return true;
  return !!element.closest('[data-no-translate], [data-i18n], .fa, .fas, .far, .fab, .material-icons');
}

function getAutoTranslationCache(language) {
  try {
    return JSON.parse(sessionStorage.getItem(AUTO_TRANSLATION_CACHE_PREFIX + language) || '{}');
  } catch (error) {
    return {};
  }
}

function setAutoTranslationCache(language, cache) {
  try {
    sessionStorage.setItem(AUTO_TRANSLATION_CACHE_PREFIX + language, JSON.stringify(cache));
  } catch (error) {
    // Storage can be unavailable in private browser modes; translation still works for the page.
  }
}

function collectAutoTranslationTargets() {
  const targets = [];
  const seen = new Set();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.parentElement || shouldSkipAutoTranslateElement(node.parentElement)) {
        return NodeFilter.FILTER_REJECT;
      }
      const original = autoTranslationOriginalText?.get(node) || node.nodeValue;
      return shouldAutoTranslateText(original) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });

  let node;
  while ((node = walker.nextNode())) {
    if (!autoTranslationOriginalText?.has(node)) {
      autoTranslationOriginalText?.set(node, node.nodeValue);
    }
    const original = autoTranslationOriginalText?.get(node).replace(/\s+/g, ' ').trim();
    if (!seen.has(original)) {
      targets.push({ type: 'text', value: original, nodes: [node] });
      seen.add(original);
    } else {
      targets.find(target => target.value === original)?.nodes.push(node);
    }
  }

  document.querySelectorAll('input[placeholder], textarea[placeholder], [title], [aria-label]').forEach(el => {
    if (shouldSkipAutoTranslateElement(el)) return;
    const attrs = autoTranslationOriginalAttrs?.get(el) || {};
    ['placeholder', 'title', 'aria-label'].forEach(attr => {
      const value = attrs[attr] || el.getAttribute(attr);
      if (!shouldAutoTranslateText(value)) return;
      if (!attrs[attr]) {
        attrs[attr] = value;
        autoTranslationOriginalAttrs?.set(el, attrs);
      }
      const normalized = value.replace(/\s+/g, ' ').trim();
      const existing = targets.find(target => target.value === normalized);
      if (existing) {
        existing.attrs = existing.attrs || [];
        existing.attrs.push({ el, attr });
      } else {
        targets.push({ type: 'attr', value: normalized, attrs: [{ el, attr }] });
      }
    });
  });

  return targets;
}

function restoreAutoTranslatedText() {
  if (!autoTranslationOriginalText || !autoTranslationOriginalAttrs) return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (autoTranslationOriginalText.has(node)) {
      node.nodeValue = autoTranslationOriginalText.get(node);
    }
  }
  document.querySelectorAll('input[placeholder], textarea[placeholder], [title], [aria-label]').forEach(el => {
    const attrs = autoTranslationOriginalAttrs.get(el);
    if (!attrs) return;
    Object.keys(attrs).forEach(attr => el.setAttribute(attr, attrs[attr]));
  });
}

async function runAutoTranslation(language) {
  language = normalizeLanguageCode(language);
  if (!document.body || language === DEFAULT_LANGUAGE || autoTranslationBusy) {
    if (language === DEFAULT_LANGUAGE) restoreAutoTranslatedText();
    return;
  }

  const targets = collectAutoTranslationTargets();
  if (!targets.length) return;

  const cache = getAutoTranslationCache(language);
  const missing = targets
    .map(target => target.value)
    .filter(value => !cache[value])
    .slice(0, 80);

  if (missing.length) {
    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetLanguage: language, texts: missing })
      });
      const payload = await response.json();
      if (response.ok && payload.success && payload.translations) {
        Object.assign(cache, payload.translations);
        setAutoTranslationCache(language, cache);
      }
    } catch (error) {
      console.warn('Automatic translation unavailable:', error.message);
    }
  }

  autoTranslationBusy = true;
  targets.forEach(target => {
    const translated = cache[target.value];
    if (!translated || translated === target.value) return;
    target.nodes?.forEach(node => {
      const original = autoTranslationOriginalText?.get(node) || node.nodeValue;
      const leading = original.match(/^\s*/)?.[0] || '';
      const trailing = original.match(/\s*$/)?.[0] || '';
      node.nodeValue = `${leading}${translated}${trailing}`;
    });
    target.attrs?.forEach(({ el, attr }) => {
      el.setAttribute(attr, translated);
    });
  });
  autoTranslationBusy = false;
}

function scheduleAutoTranslation(language) {
  clearTimeout(autoTranslationTimer);
  autoTranslationTimer = setTimeout(() => runAutoTranslation(normalizeLanguageCode(language)), 250);
}

// Translate all elements with data-i18n attribute
function translatePage(lang = null) {
  const language = normalizeLanguageCode(lang || getCurrentLanguage());
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = t(key, language);
    if (translation === key) return;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = translation;
    } else if (el.tagName === 'OPTION') {
      el.textContent = translation;
    } else {
      el.textContent = translation;
    }
  });
  
  // Also translate placeholders for elements with data-i18n-placeholder
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const translation = t(key, language);
    if (translation === key) return;
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = translation;
    }
  });
  
  // Update document language
  document.documentElement.lang = language === 'luo' ? 'luo' : (language === 'swahili' ? 'sw' : 'en');
  scheduleAutoTranslation(language);
}

// Initialize language on page load
function initializeLanguage() {
  const lang = getCurrentLanguage();
  translatePage(lang);
  
  // Update language selector if it exists
  const selector = document.getElementById('languageSelect');
  if (selector) {
    selector.value = lang;
  }
  
  const selectorTop = document.getElementById('languageSelectTop');
  if (selectorTop) {
    selectorTop.value = lang;
  }
  
  // Listen for language changes
  document.addEventListener('languageChanged', (e) => {
    translatePage(e.detail.language);
  });
  window.addEventListener('languageChanged', (e) => {
    translatePage(e.detail.language);
  });

  if ('MutationObserver' in window && !autoTranslationObserver) {
    autoTranslationObserver = new MutationObserver(() => {
      if (!autoTranslationBusy) {
        scheduleAutoTranslation(getCurrentLanguage());
      }
    });
    autoTranslationObserver.observe(document.body, { childList: true, subtree: true });
  }
}

// Export for use in scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getCurrentLanguage, setLanguage, t, translatePage, initializeLanguage, SUPPORTED_LANGUAGES };
}
