// Global Language Management System
const SUPPORTED_LANGUAGES = ['english', 'swahili', 'luo'];
const DEFAULT_LANGUAGE = 'english';
const STORAGE_KEY = 'fahamuShamba_language';

// All UI strings in all languages
const translations = {
  english: {
    // General
    welcome: 'Welcome',
    select_language: 'Select Language',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    
    // Landing Page
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
    username: 'Username',
    phone: 'Phone Number',
    password: 'Password',
    confirm_password: 'Confirm Password',
    enter_username: 'Enter your username',
    enter_phone: 'Enter your phone number',
    enter_password: 'Enter your password',
    username_or_phone: 'Username or Phone Number',
    enter_username_or_phone: 'Enter your username or phone number',
    already_have_account: 'Already have an account?',
    no_account: "Don't have an account?",
    next: 'Next',
    submit: 'Submit',
    login_button: 'Login',
    signup_button: 'Sign Up',
    
    // Registration Step 2
    profile_setup: 'Profile Setup',
    full_name: 'Full Name',
    county: 'County',
    ward: 'Ward',
    farm_size: 'Farm Size (hectares)',
    select_county: 'Select County',
    select_ward: 'Select Ward',
    enter_name: 'Enter your full name',
    enter_county: 'Select your county',
    enter_ward: 'Select your ward',
    enter_farm_size: 'Enter farm size',
    complete_profile: 'Complete Profile',
    
    // Dashboard
    dashboard: 'Dashboard',
    welcome_back: 'Welcome back',
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
    phone_number: 'Phone Number',
    county_label: 'County',
    ward_label: 'Ward',
    farm_size_label: 'Farm Size',
    soil_type: 'Soil Type',
    
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
    login: 'Ingia',
    register: 'Jisajili',
    create_account: 'Tengeneza Akaunti',
    phone: 'Nambari ya Simu',
    password: 'Neno la Siri',
    confirm_password: 'Thibitisha Neno la Siri',
    enter_phone: 'Ingiza nambari ya simu yako',
    enter_password: 'Ingiza neno la siri lako',
    username_or_phone: 'Jina Mtumiaji au Nambari ya Simu',
    enter_username_or_phone: 'Ingiza jina mtumiaji au nambari ya simu',
    username: 'Jina Mtumiaji',
    enter_username: 'Ingiza jina mtumiaji',
    already_have_account: 'Tayari una akaunti?',
    no_account: 'Huna akaunti?',
    next: 'Inayofuata',
    submit: 'Tuma',
    login_button: 'Ingia',
    signup_button: 'Jisajili',
    
    // Registration Step 2
    profile_setup: 'Mipango ya Wasifu',
    full_name: 'Jina Kamili',
    county: 'Kaunti',
    ward: 'Kata',
    farm_size: 'Ukubwa wa Shamba (hectares)',
    select_county: 'Chagua Kaunti',
    select_ward: 'Chagua Kata',
    enter_name: 'Ingiza jina lako kamili',
    enter_county: 'Chagua kaunti yako',
    enter_ward: 'Chagua kata yako',
    enter_farm_size: 'Ingiza ukubwa wa shamba',
    complete_profile: 'Kumalizia Wasifu',
    
    // Dashboard
    dashboard: 'Dashibodi',
    welcome_back: 'Karibu tena',
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
    phone_number: 'Nambari ya Simu',
    county_label: 'Kaunti',
    ward_label: 'Kata',
    farm_size_label: 'Ukubwa wa Shamba',
    soil_type: 'Aina ya Udongo',
    
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
    phone: 'Namba mar simu',
    password: 'Nyithindo mag dak',
    confirm_password: 'Keto dwoko mar nyithindo',
    enter_phone: 'Gir namba mar simu moloyo',
    enter_password: 'Gir nyithindo mag dak moloyo',
    username_or_phone: 'Nyathi Seche kata Namba mar simu',
    enter_username_or_phone: 'Gir nyathi seche kata namba mar simu moloyo',
    username: 'Nyathi Seche',
    enter_username: 'Gir nyathi seche moloyo',
    already_have_account: 'Oyawore ne akaunti?',
    no_account: 'Ok oyawore akaunti?',
    next: 'Dhiyo mbele',
    submit: 'Dircho',
    login_button: 'Jothieth',
    signup_button: 'Jothieth Hara',
    back: 'Dok chiengʼ',
    
    // Registration Step 2
    profile_setup: 'Setup Ranyisi',
    full_name: 'Nyingʼ',
    county: 'County',
    ward: 'Ward',
    farm_size: 'Pako Bonde (hectares)',
    select_county: 'Rito County',
    select_ward: 'Rito Ward',
    enter_name: 'Gir nyingʼ moloyo',
    enter_county: 'Rito county moloyo',
    enter_ward: 'Rito ward moloyo',
    enter_farm_size: 'Gir pako bonde',
    complete_profile: 'Yie akaunti',
    
    // Dashboard
    dashboard: 'Dashboard',
    welcome_back: 'Oyawore Hara',
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
    phone_number: 'Namba mar simu',
    county_label: 'County',
    ward_label: 'Ward',
    farm_size_label: 'Pako Bonde',
    soil_type: 'Moro Lod',
    
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

// Get current language
function getCurrentLanguage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && SUPPORTED_LANGUAGES.includes(stored)) {
    return stored;
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

// Get translated string
function t(key, lang = null) {
  const language = lang || getCurrentLanguage();
  return translations[language]?.[key] || translations[DEFAULT_LANGUAGE]?.[key] || key;
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
  
  // Listen for language changes
  document.addEventListener('languageChanged', (e) => {
    translatePage(e.detail.language);
  });
}

// Export for use in scripts
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { getCurrentLanguage, setLanguage, t, translatePage, initializeLanguage, SUPPORTED_LANGUAGES };
}
