// Load the real recommendation engine
import recommendationEngine from './recommendation-engine.js';

/**
 * USSD Service for Fahamu Shamba
 * Allows farmers to access crop recommendations via USSD on feature phones
 * 
 * GLOBAL USSD CODE: *123# (ONLY access method)
 * 
 * USSD Flow:
 * 1. User dials *123# (only valid code)
 * 2. Language selection (English/Swahili/Dholuo)
 * 3. Main menu (Get Advice, Register, Check Profile)
 * 4. Sub-menus based on selection
 * 5. Display recommendations
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const USSD_SESSIONS = new Map(); // In-memory session storage
const SESSION_TIMEOUT = 5 * 60 * 1000; // 5 minutes
const VALID_USSD_CODE = '*123#'; // ONE AND ONLY VALID CODE

// Load translations from JSON file
let translationsData = {};
try {
  const translationsPath = path.join(__dirname, 'ussd-translations.json');
  translationsData = JSON.parse(fs.readFileSync(translationsPath, 'utf-8'));
  console.log('✅ USSD translations loaded successfully');
} catch (error) {
  console.warn('⚠️ Could not load translations.json, using embedded translations', error.message);
  // Load from file system as fallback - use synchronous import workaround
  try {
    const fallbackPath = path.join(__dirname, 'ussd-translations.json');
    if (fs.existsSync(fallbackPath)) {
      translationsData = JSON.parse(fs.readFileSync(fallbackPath, 'utf-8'));
      console.log('✅ USSD translations loaded from fallback');
    }
  } catch (fallbackError) {
    console.warn('⚠️ Translation file not found at:', error.message);
  }
}

// Helper function to get translation
function getText(key, language = 'en') {
  const langMap = { 'english': 'en', 'swahili': 'sw', 'luo': 'luo', 'en': 'en', 'sw': 'sw' };
  const lang = langMap[language] || 'en';
  
  if (translationsData[key] && translationsData[key][lang]) {
    return translationsData[key][lang];
  }
  
  // Fallback to English if translation not found
  if (translationsData[key] && translationsData[key]['en']) {
    return translationsData[key]['en'];
  }
  
  console.warn(`⚠️ Translation missing: ${key} in language ${lang}`);
  return key;
}

// Session states
const SESSION_STATES = {
  LANGUAGE_SELECT: 'language_select',
  MAIN_MENU: 'main_menu',
  GET_ADVICE_LOCATION: 'get_advice_location',
  GET_ADVICE_WARD: 'get_advice_ward',
  GET_ADVICE_SOIL: 'get_advice_soil',
  GET_ADVICE_SEASON: 'get_advice_season',
  GET_ADVICE_SIZE: 'get_advice_size',
  GET_ADVICE_BUDGET: 'get_advice_budget',
  GET_ADVICE_RESULT: 'get_advice_result',
  REGISTER_PHONE: 'register_phone',
  REGISTER_NAME: 'register_name',
  REGISTER_CONFIRM: 'register_confirm',
  VIEW_PROFILE: 'view_profile',
  MARKET_PRICES: 'market_prices',
};

/**
 * Get recommendation - NOW USES REAL ML ENGINE WITH BUDGET AND FARM SIZE
 */
function getRecommendation(location, soilType, season, farmSize = '1-2', budget = '5000-10000') {
  // Parse farm size to numeric
  let farmSizeNum = 1.5; // default
  if (farmSize === '0-1') farmSizeNum = 0.5;
  else if (farmSize === '1-2') farmSizeNum = 1.5;
  else if (farmSize === '2-5') farmSizeNum = 3.5;
  else if (farmSize === '5+') farmSizeNum = 7;

  // Parse budget to numeric - NOW AFFECTS RECOMMENDATION
  let budgetNum = 7500; // default (high budget)
  if (budget === '<2000') budgetNum = 1500;      // Very low - should get Kales, Cowpeas
  else if (budget === '2000-5000') budgetNum = 3500;  // Low - Beans, Sorghum
  else if (budget === '5000-10000') budgetNum = 7500; // Medium - Maize OK
  else if (budget === '10000+') budgetNum = 15000;    // High - any crop

  console.log(`[USSD] Calling ML Engine: location=${location}, soil=${soilType}, season=${season}, budget=${budgetNum}, farmSize=${farmSizeNum}`);

  try {
    // Use the real recommendation engine
    const result = recommendationEngine.getRecommendations({
      subCounty: location,
      soilType: soilType,
      season: season,
      budget: budgetNum,
      farmSize: farmSizeNum,
      waterSource: 'Rainfall'
    });

    if (result.recommendations && result.recommendations.length > 0) {
      const topCrop = result.recommendations[0];
      console.log(`[USSD] ML Engine returned: ${topCrop.name} (score: ${topCrop.score})`);
      return {
        crop: topCrop.name,
        score: topCrop.score,
        reason: topCrop.reasons?.english || `Suitable for ${soilType} soil in ${season} season`,
        alternatives: result.recommendations.slice(1, 3).map(c => c.name)
      };
    }
  } catch (error) {
    console.error('[USSD] Recommendation engine error:', error.message);
  }

  // Fallback only if engine fails completely
  return {
    crop: 'Sorghum',
    score: 75,
    reason: 'Drought-tolerant crop suitable for Siaya County',
    alternatives: ['Beans', 'Cowpeas']
  };
}

/**
 * Initialize USSD session
 */
function initializeSession(sessionId, phoneNumber) {
  const session = {
    sessionId,
    phoneNumber,
    language: 'english', // Default language
    state: SESSION_STATES.LANGUAGE_SELECT,
    data: {
      location: null,
      ward: null,
      soilType: null,
      season: null,
      farmSize: null,
      budget: null,
    },
    createdAt: Date.now(),
  };

  USSD_SESSIONS.set(sessionId, session);

  // Auto-cleanup after timeout
  setTimeout(() => {
    USSD_SESSIONS.delete(sessionId);
  }, SESSION_TIMEOUT);

  return session;
}

/**
 * Get or create session
 */
function getSession(sessionId) {
  if (USSD_SESSIONS.has(sessionId)) {
    return USSD_SESSIONS.get(sessionId);
  }
  return null;
}

/**
 * Get translation (backward compatible wrapper)
 */
function t(key, language = 'english') {
  return getText(key, language);
}

/**
 * Main USSD handler - STRICT VALIDATION
 * Only accepts *123# as valid USSD code
 */
export function handleUSSD(sessionId, phoneNumber, text, serviceCode) {
  // CRITICAL: Validate USSD code - MUST be *123# ONLY
  const normalizedCode = (serviceCode || '').trim().toUpperCase();

  // Strict enforcement: only the fixed global code is accepted.
  if (normalizedCode !== VALID_USSD_CODE) {
    // Reject any other USSD code - security measure
    console.log(`[USSD] REJECTED: Invalid service code "${serviceCode}" from phone ${phoneNumber}`);
    return {
      sessionId,
      response: 'Invalid USSD code. Please dial *123# to access Fahamu Shamba.',
      endSession: true,
    };
  }
  
  console.log(`[USSD] ACCEPTED: Valid service code ${VALID_USSD_CODE} from phone ${phoneNumber}`);

  // Initialize new session if first interaction (empty text = initial dial)
  if (!text || text === '') {
    const session = initializeSession(sessionId, phoneNumber);
    console.log(`[USSD] New session created: ${sessionId} for phone: ${phoneNumber}`);
    return {
      sessionId,
      response: getText('LANGUAGE_SELECT', session.language),
      endSession: false,
    };
  }

  let session = getSession(sessionId);

  // If session expired, create new one
  if (!session) {
    console.log(`[USSD] Session expired, creating new one: ${sessionId}`);
    session = initializeSession(sessionId, phoneNumber);
    return {
      sessionId,
      response: getText('LANGUAGE_SELECT', session.language),
      endSession: false,
    };
  }

  // Extract only the LAST input line (USSD simulator sends cumulative text)
  const lines = text.trim().split('\n').filter(line => line.trim());
  const input = lines.length > 0 ? lines[lines.length - 1].trim() : '';
  let response = '';
  let endSession = false;

  console.log(`[USSD] Processing: sessionId=${sessionId}, state=${session.state}, input=${input}`);

  // Handle based on current state
  switch (session.state) {
    case SESSION_STATES.LANGUAGE_SELECT:
      response = handleLanguageSelect(session, input);
      console.log(`[USSD] Language selected: ${session.language}`);
      break;

    case SESSION_STATES.MAIN_MENU:
      response = handleMainMenu(session, input);
      if (session.state === SESSION_STATES.VIEW_PROFILE || session.state === SESSION_STATES.MARKET_PRICES) {
        endSession = true;
      }
      break;

    case SESSION_STATES.GET_ADVICE_LOCATION:
      response = handleLocationSelect(session, input);
      break;

    case SESSION_STATES.GET_ADVICE_WARD:
      response = handleWardSelect(session, input);
      break;

    case SESSION_STATES.GET_ADVICE_SOIL:
      response = handleSoilSelect(session, input);
      break;

    case SESSION_STATES.GET_ADVICE_SEASON:
      response = handleSeasonSelect(session, input);
      break;

    case SESSION_STATES.GET_ADVICE_SIZE:
      response = handleSizeSelect(session, input);
      break;

    case SESSION_STATES.GET_ADVICE_BUDGET:
      response = handleBudgetSelect(session, input);
      // Budget is the last input before recommendation; end immediately after response.
      endSession = true;
      break;

    case SESSION_STATES.GET_ADVICE_RESULT:
      response = getText('GOODBYE', session.language);
      endSession = true;
      break;

    case SESSION_STATES.REGISTER_PHONE:
      response = handleRegisterPhone(session, input);
      break;

    case SESSION_STATES.REGISTER_NAME:
      response = handleRegisterName(session, input);
      endSession = true;
      break;

    case SESSION_STATES.VIEW_PROFILE:
      response = t('goodbye', session.language);
      endSession = true;
      break;

    case SESSION_STATES.MARKET_PRICES:
      response = t('goodbye', session.language);
      endSession = true;
      break;

    default:
      response = t('invalid', session.language);
      session.state = SESSION_STATES.MAIN_MENU;
  }

  // Update session
  if (session) {
    USSD_SESSIONS.set(sessionId, session);
  }

  return {
    sessionId,
    response,
    endSession,
  };
}

/**
 * Handle language selection
 */
function handleLanguageSelect(session, input) {
  const choice = input.trim();

  if (choice === '1') {
    session.language = 'en';
  } else if (choice === '2') {
    session.language = 'sw';
  } else if (choice === '3') {
    session.language = 'luo';
  } else {
    return `${getText('INVALID_INPUT', session.language)}\n\n${getText('LANGUAGE_SELECT', session.language)}`;
  }

  session.state = SESSION_STATES.MAIN_MENU;
  console.log(`[USSD] Language set to: ${session.language}, moving to MAIN_MENU`);
  
  return getText('MAIN_MENU', session.language);
}

/**
 * Handle main menu
 */
function handleMainMenu(session, input) {
  const choice = input.trim();

  if (choice === '1') {
    session.state = SESSION_STATES.GET_ADVICE_LOCATION;
    console.log(`[USSD] User selected: Get Advice, moving to LOCATION selection`);
    return getText('COUNTY_SELECT', session.language);
  } else if (choice === '2') {
    const marketResponse = displayMarketPrices(session) + '\n\n' + getText('GOODBYE', session.language);
    session.state = SESSION_STATES.MARKET_PRICES;
    console.log(`[USSD] User selected: Market Prices, ending session`);
    return marketResponse;
  } else if (choice === '3') {
    const profileResponse = getText('PROFILE_HEADER', session.language) + session.phoneNumber + '\n\n' + getText('PROFILE_FOOTER', session.language) + '\n\n' + getText('GOODBYE', session.language);
    session.state = SESSION_STATES.VIEW_PROFILE;
    console.log(`[USSD] User selected: View Profile, ending session`);
    return profileResponse;
  } else if (choice === '4') {
    session.state = SESSION_STATES.REGISTER_PHONE;
    console.log(`[USSD] User selected: Register, asking for phone`);
    return getText('REGISTER_PROMPT', session.language);
  } else {
    console.log(`[USSD] Invalid choice in main menu: ${choice}`);
    return getText('INVALID_INPUT', session.language) + '\n\n' + getText('MAIN_MENU', session.language);
  }
}

/**
 * Handle location/county selection
 */
function handleLocationSelect(session, input) {
  const choice = input.trim();
  const locations = ['siaya', 'kisumu', 'migori'];

  if (choice < '1' || choice > '3' || !choice.match(/^[1-3]$/)) {
    console.log(`[USSD] Invalid location choice: ${choice}`);
    return `${getText('INVALID_INPUT', session.language)}\n\n${getText('COUNTY_SELECT', session.language)}`;
  }

  session.data.location = locations[parseInt(choice) - 1];
  session.state = SESSION_STATES.GET_ADVICE_WARD;
  console.log(`[USSD] Location selected: ${session.data.location}, moving to WARD selection`);
  return getText('WARD_SELECT', session.language);
}

/**
 * Handle ward selection
 */
function handleWardSelect(session, input) {
  const choice = input.trim();
  const wards = ['bondo', 'ugunja', 'yala', 'gem', 'alego'];

  if (!choice.match(/^[1-5]$/) || choice < '1' || choice > '5') {
    console.log(`[USSD] Invalid ward choice: ${choice}`);
    return `${getText('INVALID_INPUT', session.language)}\n\n${getText('WARD_SELECT', session.language)}`;
  }

  session.data.ward = wards[parseInt(choice) - 1];
  session.state = SESSION_STATES.GET_ADVICE_SOIL;
  console.log(`[USSD] Ward selected: ${session.data.ward}, moving to SOIL selection`);
  return getText('SOIL_SELECT', session.language);
}

/**
 * Handle soil type selection
 */
function handleSoilSelect(session, input) {
  const choice = input.trim();
  const soils = ['sandy', 'clay', 'loam'];

  if (!choice.match(/^[1-3]$/) || choice < '1' || choice > '3') {
    console.log(`[USSD] Invalid soil choice: ${choice}`);
    return `${getText('INVALID_INPUT', session.language)}\n\n${getText('SOIL_SELECT', session.language)}`;
  }

  session.data.soilType = soils[parseInt(choice) - 1];
  session.state = SESSION_STATES.GET_ADVICE_SEASON;
  console.log(`[USSD] Soil selected: ${session.data.soilType}, moving to SEASON selection`);
  return getText('SEASON_SELECT', session.language);
}

/**
 * Handle season selection
 */
function handleSeasonSelect(session, input) {
  const choice = input.trim();
  const seasons = ['long_rains', 'short_rains', 'dry'];

  if (!choice.match(/^[1-3]$/) || choice < '1' || choice > '3') {
    console.log(`[USSD] Invalid season choice: ${choice}`);
    return `${getText('INVALID_INPUT', session.language)}\n\n${getText('SEASON_SELECT', session.language)}`;
  }

  session.data.season = seasons[parseInt(choice) - 1];
  session.state = SESSION_STATES.GET_ADVICE_SIZE;
  console.log(`[USSD] Season selected: ${session.data.season}, moving to SIZE selection`);
  return getText('SIZE_SELECT', session.language);
}

/**
 * Handle farm size selection
 */
function handleSizeSelect(session, input) {
  const choice = input.trim();
  const sizes = ['0-1', '1-2', '2-5', '5+'];

  if (!choice.match(/^[1-4]$/) || choice < '1' || choice > '4') {
    console.log(`[USSD] Invalid size choice: ${choice}`);
    return `${getText('INVALID_INPUT', session.language)}\n\n${getText('SIZE_SELECT', session.language)}`;
  }

  session.data.farmSize = sizes[parseInt(choice) - 1];
  session.state = SESSION_STATES.GET_ADVICE_BUDGET;
  console.log(`[USSD] Size selected: ${session.data.farmSize}, moving to BUDGET selection`);
  return getText('BUDGET_SELECT', session.language);
}

/**
 * Handle budget selection
 */
function handleBudgetSelect(session, input) {
  const choice = input.trim();
  const budgets = ['<2000', '2000-5000', '5000-10000', '10000+'];

  if (!choice.match(/^[1-4]$/) || choice < '1' || choice > '4') {
    console.log(`[USSD] Invalid budget choice: ${choice}`);
    return `${getText('INVALID_INPUT', session.language)}\n\n${getText('BUDGET_SELECT', session.language)}`;
  }

  session.data.budget = budgets[parseInt(choice) - 1];
  session.state = SESSION_STATES.GET_ADVICE_RESULT;
  console.log(`[USSD] Budget selected: ${session.data.budget}, generating recommendation`);
  return displayRecommendation(session);
}

/**
 * Display recommendation - NOW USES REAL ML ENGINE WITH ALL PARAMS
 */
function displayRecommendation(session) {
  const { location, soilType, season, farmSize, budget } = session.data;

  if (!location || !soilType || !season) {
    return getText('INVALID_INPUT', session.language);
  }

  // Use real ML engine with ALL parameters including farmSize and budget
  const recommendation = getRecommendation(location, soilType, season, farmSize, budget);

  let response = `${getText('RECOMMENDATION_TITLE', session.language)}
${getText('CROP_LABEL', session.language)}${recommendation.crop}

${getText('CONFIDENCE_LABEL', session.language)}${recommendation.score}%

${recommendation.reason}

${getText('PRICE_LABEL', session.language)}${getMarketPrice(recommendation.crop)}`;

  // Show alternatives if available
  if (recommendation.alternatives && recommendation.alternatives.length > 0) {
    response += `\n\nOther options: ${recommendation.alternatives.join(', ')}`;
  }

  response += `\n\n${getText('THANK_YOU', session.language)}`;

  // Save to database
  try {
    const db = new Database('./fahamu_shamba.db');
    const stmt = db.prepare(`
      INSERT INTO predictions (phone_number, sub_county, soil_type, season, predicted_crop, confidence, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(session.phoneNumber, location, soilType, season, recommendation.crop, recommendation.score, recommendation.reason);
    db.close();
  } catch (error) {
    console.error('Error saving prediction:', error);
  }

  return response;
}

/**
 * Display market prices
 */
function displayMarketPrices(session) {
  const prices = {
    'Maize': 'KSh 65/kg',
    'Beans': 'KSh 85/kg',
    'Rice': 'KSh 125/kg',
    'Sorghum': 'KSh 95/kg',
    'Groundnuts': 'KSh 110/kg',
    'Kales': 'KSh 50/kg',
    'Cowpeas': 'KSh 70/kg',
  };

  let response = getText('MARKET_PRICES_HEADER', session.language) + '\n\n';
  let i = 1;
  for (const [crop, price] of Object.entries(prices)) {
    response += `${i}. ${crop}: ${price}\n`;
    i++;
  }

  return response;
}

/**
 * Get market price for a crop
 */
function getMarketPrice(crop) {
  const prices = {
    'Maize': 'KSh 65/kg',
    'Beans': 'KSh 85/kg',
    'Rice': 'KSh 125/kg',
    'Sorghum': 'KSh 95/kg',
    'Groundnuts': 'KSh 110/kg',
    'Kales': 'KSh 50/kg',
    'Cowpeas': 'KSh 70/kg',
    'Millet': 'KSh 45/kg',
    'Cassava': 'KSh 35/kg',
    'Sweet Potatoes': 'KSh 40/kg',
    'Tomatoes': 'KSh 75/kg',
    'Okra': 'KSh 55/kg',
  };

  return prices[crop] || 'Check at local market';
}

/**
 * Handle phone registration
 */
function handleRegisterPhone(session, input) {
  const phone = input.trim();

  if (!phone.match(/^(254|\+254|0)?[0-9]{9,10}$/)) {
    return getText('INVALID_INPUT', session.language);
  }

  session.data.phone = phone;
  session.state = SESSION_STATES.REGISTER_NAME;
  return getText('REGISTER_NAME', session.language);
}

/**
 * Handle name registration
 */
function handleRegisterName(session, input) {
  const name = input.trim();

  if (name.length < 3) {
    return getText('INVALID_INPUT', session.language);
  }

  session.data.name = name;

  // Save to database
  try {
    const db = new Database('./fahamu_shamba.db');
    const stmt = db.prepare(`
      INSERT OR IGNORE INTO users (phone, name, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `);
    stmt.run(session.phoneNumber, name, ''); // Empty password hash for USSD users
    db.close();
  } catch (error) {
    console.error('Error registering user:', error);
  }

  return getText('REGISTER_SUCCESS', session.language);
}

export default {
  handleUSSD,
  SESSION_STATES,
};
