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

// Get current language
function getCurrentLanguage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED_LANGUAGES.includes(stored)) {
    return stored;
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
  if (SUPPORTED_LANGUAGES.includes(lang)) {
    localStorage.setItem(STORAGE_KEY, lang);
    // Dispatch custom event so pages can listen for language changes
    window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
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

// Translate all elements with data-i18n attribute
function translatePage(lang = null) {
  const language = lang || getCurrentLanguage();
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const translation = t(key, language);
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
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      el.placeholder = translation;
    }
  });
  
  // Update document language
  document.documentElement.lang = language === 'luo' ? 'luo' : (language === 'swahili' ? 'sw' : 'en');
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
}

// Export for use in scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getCurrentLanguage, setLanguage, t, translatePage, initializeLanguage, SUPPORTED_LANGUAGES };
}
