import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import recommendationEngine from './recommendation-engine.js';
import demoData from './demo-data.js';
import adminRoutes from './admin-routes.js';
import pool from './database-postgres.js';
import farmerRoutes from './farmer-routes.js';
import farmerProfileRoutes from './farmer-profile-routes.js';
import * as adminDB from './admin-database.js';
import * as farmerDB from './farmer-module.js';
import * as farmerProfileDB from './farmer-profile-dashboard.js';
import { securityHeaders, sanitizeInput, logAPICall } from './admin-middleware.js';
import { initializeEmailService } from './email-service.js';
import { initAuthRoutes } from './auth-routes.js';
import { initializeAuthTables } from './init-auth-tables.js';
import { handleUSSD } from './ussd-service.js';
import communityRoutes from './community-routes.js';
import feedbackRoutes from './feedback-routes.js';
import communityService from './community-service-async.js';
import feedbackService from './feedback-service.js';
import marketRoutes from './market-routes.js';
import marketPricesApi from './market-prices-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const IS_VERCEL = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
const USE_POSTGRES = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres');

// Enhanced CORS configuration
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') || true 
    : true,
  credentials: true
}));

const sendPublicPage = (res, filename) => res.sendFile(path.join(PUBLIC_DIR, filename));

// Canonical web routes (single source: root /public)
app.get('/', (req, res) => sendPublicPage(res, 'index.html'));
app.get('/landing', (req, res) => sendPublicPage(res, 'landing-page.html'));
app.get('/login', (req, res) => sendPublicPage(res, 'login.html'));
app.get('/signup', (req, res) => sendPublicPage(res, 'signup.html'));
app.get('/dashboard', (req, res) => sendPublicPage(res, 'dashboard.html'));
app.get('/farmer-dashboard', (req, res) => sendPublicPage(res, 'dashboard.html'));
app.get('/profile', (req, res) => sendPublicPage(res, 'profile.html'));
app.get('/farmer-profile', (req, res) => sendPublicPage(res, 'farmer-profile.html'));
app.get('/feedback', (req, res) => sendPublicPage(res, 'feedback.html'));
app.get('/community', (req, res) => sendPublicPage(res, 'community.html'));
app.get('/community-market', (req, res) => sendPublicPage(res, 'community-market.html'));
app.get('/market', (req, res) => sendPublicPage(res, 'market.html'));
app.get('/market-trends', (req, res) => sendPublicPage(res, 'market-trends.html'));
app.get('/market-trends.html', (req, res) => sendPublicPage(res, 'market-trends.html'));
app.get('/recommendations', (req, res) => sendPublicPage(res, 'recommendations.html'));
app.get('/crop-prediction', (req, res) => sendPublicPage(res, 'crop-prediction.html'));
app.get('/crop-details', (req, res) => sendPublicPage(res, 'crop-details.html'));
app.get('/settings', (req, res) => sendPublicPage(res, 'settings.html'));
app.get('/ussd-simulator', (req, res) => sendPublicPage(res, 'ussd-simulator.html'));
app.get('/api-tester', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API tester page is not included in current public build.'
  });
});
app.get('/admin', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Admin web page is not included in current public build.'
  });
});
app.get('/farmer-profile-dashboard', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Farmer profile dashboard page is not included in current public build.'
  });
});

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Add security headers
app.use(securityHeaders);

// Add sanitization middleware
app.use(sanitizeInput);

// Serve static files
app.use(express.static(PUBLIC_DIR));

// Initialize email service
console.log('📧 Initializing email service...');
initializeEmailService();

// Initialize database with error handling
let db;
if (USE_POSTGRES) {
  console.log('✅ Using PostgreSQL database (persistent storage for Vercel)');
  db = null; // PostgreSQL doesn't use better-sqlite3
} else {
  const databasePath = IS_VERCEL
    ? (process.env.SQLITE_DB_PATH || '/tmp/fahamu_shamba.db')
    : path.join(__dirname, 'fahamu_shamba.db');
  db = new Database(databasePath, {});
  console.log(`✅ Connected to SQLite database at ${databasePath}`);
}

// Wrapper for better-sqlite3 to match async patterns (MUST be before initializeDatabase)
const dbAsync = USE_POSTGRES ? {
  run: async (sql, params = []) => {
    let paramIndex = 0;
    let pgSQL = sql.replace(/\?/g, () => `$${++paramIndex}`);
    
    // Auto-add RETURNING id for INSERT statements
    if (pgSQL.trim().toUpperCase().startsWith('INSERT') && !pgSQL.toUpperCase().includes('RETURNING')) {
      pgSQL += ' RETURNING id';
    }
    
    const result = await pool.query(pgSQL, params);
    return {
      lastID: result.rows[0]?.id || null,
      changes: result.rowCount
    };
  },
  get: async (sql, params = []) => {
    let paramIndex = 0;
    const pgSQL = sql.replace(/\?/g, () => `$${++paramIndex}`);
    const result = await pool.query(pgSQL, params);
    return result.rows[0] || null;
  },
  all: async (sql, params = []) => {
    let paramIndex = 0;
    const pgSQL = sql.replace(/\?/g, () => `$${++paramIndex}`);
    const result = await pool.query(pgSQL, params);
    return result.rows;
  }
} : {
  run: (sql, params = []) => {
    try {
      const stmt = db.prepare(sql);
      const result = stmt.run(...params);
      return Promise.resolve({ lastID: result.lastInsertRowid, changes: result.changes });
    } catch (err) {
      return Promise.reject(err);
    }
  },
  get: (sql, params = []) => {
    try {
      const stmt = db.prepare(sql);
      const result = stmt.get(...params);
      return Promise.resolve(result);
    } catch (err) {
      return Promise.reject(err);
    }
  },
  all: (sql, params = []) => {
    try {
      const stmt = db.prepare(sql);
      const results = stmt.all(...params);
      return Promise.resolve(results);
    } catch (err) {
      return Promise.reject(err);
    }
  }
};

// Now initialize database (after dbAsync is defined)
initializeDatabase();

// Initialize authentication tables
if (!USE_POSTGRES) {
  console.log('🔐 Initializing authentication tables...');
  try {
    initializeAuthTables(db);
    console.log('✅ Authentication tables initialized');
  } catch (error) {
    console.error('⚠️ Error initializing auth tables:', error.message);
  }
} else {
  console.log('✅ Using PostgreSQL - auth tables already migrated');
}

// Initialize community and feedback databases with the main db connection
console.log('👥 Initializing community service...');
try {
  communityService.initializeCommunityDatabase(db, dbAsync);
  console.log('✅ Community service initialized (async/PostgreSQL ready)');
} catch (error) {
  console.error('⚠️ Error initializing community service:', error.message);
}

if (!USE_POSTGRES) {
  console.log('📝 Initializing feedback database...');
  try {
    feedbackService.initializeFeedbackDatabase(db, dbAsync);
    console.log('✅ Feedback database initialized');
  } catch (error) {
    console.error('⚠️ Error initializing feedback database:', error.message);
  }
} else {
  console.log('✅ Using PostgreSQL - feedback tables already migrated');
}
console.log('🚀 Registering authentication routes...');
const authRoutes = initAuthRoutes(db, dbAsync);
app.use('/api/auth', authRoutes);
console.log('✅ Authentication routes registered');

const SUPPORTED_LANGUAGES = ['english', 'swahili', 'luo'];

const normalizeLanguage = (language = 'english') => {
  const lang = (language || '').toString().toLowerCase();
  return SUPPORTED_LANGUAGES.includes(lang) ? lang : 'english';
};

const normalizePhoneNumber = (phoneNumber) => {
  if (!phoneNumber) return null;
  return phoneNumber.toString().replace(/\s+/g, '');
};

// Safaricom Configuration
const safaricomConfig = {
  consumerKey: process.env.SAFARICOM_CONSUMER_KEY,
  consumerSecret: process.env.SAFARICOM_CONSUMER_SECRET,
  shortcode: process.env.SAFARICOM_SHORTCODE,
  senderId: process.env.SAFARICOM_SENDER_ID || process.env.SAFARICOM_SHORTCODE,
  baseUrl: process.env.SAFARICOM_BASE_URL || 'https://sandbox.safaricom.co.ke'
};

const isSafaricomConfigured = () =>
  !!(safaricomConfig.consumerKey && safaricomConfig.consumerSecret && safaricomConfig.shortcode);

const formatPhoneForSms = (phoneNumber) => {
  if (!phoneNumber) return null;
  let digits = phoneNumber.toString().replace(/\D/g, '');

  if (digits.startsWith('0')) {
    digits = `254${digits.slice(1)}`;
  } else if (digits.startsWith('7') && digits.length === 9) {
    digits = `254${digits}`;
  } else if (digits.startsWith('254') && digits.length === 12) {
    // already correct
  } else if (digits.startsWith('254') && digits.length > 12) {
    digits = digits.slice(0, 12);
  }

  if (!digits.startsWith('254') || digits.length !== 12) {
    return null;
  }

  return `+${digits}`;
};

const safaricomTokenCache = {
  token: null,
  expiry: 0
};

async function getSafaricomAccessToken() {
  if (!isSafaricomConfigured()) {
    throw new Error('Safaricom SMS credentials not configured');
  }

  if (safaricomTokenCache.token && safaricomTokenCache.expiry > Date.now()) {
    return safaricomTokenCache.token;
  }

  const credentials = Buffer.from(`${safaricomConfig.consumerKey}:${safaricomConfig.consumerSecret}`).toString('base64');
  const response = await fetch(`${safaricomConfig.baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
    headers: {
      Authorization: `Basic ${credentials}`
    }
  });

  if (!response.ok) {
    throw new Error(`Safaricom OAuth error (${response.status})`);
  }

  const data = await response.json();
  const expiresInMs = (parseInt(data.expires_in, 10) || 3599) * 1000;
  safaricomTokenCache.token = data.access_token;
  safaricomTokenCache.expiry = Date.now() + expiresInMs - 30000; // refresh 30s early

  return safaricomTokenCache.token;
}

async function sendSafaricomSms(phoneNumber, message) {
  if (!isSafaricomConfigured()) {
    return {
      queued: false,
      channel: 'safaricom_sms',
      reason: 'Safaricom SMS not configured'
    };
  }

  const msisdn = formatPhoneForSms(phoneNumber);

  if (!msisdn) {
    return {
      queued: false,
      channel: 'safaricom_sms',
      reason: 'Invalid phone number format'
    };
  }

  try {
    const token = await getSafaricomAccessToken();
    const response = await fetch(`${safaricomConfig.baseUrl}/sms/v1/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        shortcode: safaricomConfig.shortcode,
        senderId: safaricomConfig.senderId,
        message,
        recipient: msisdn,
        bulkSMSMode: 0,
        enqueue: 0
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`Safaricom SMS error (${response.status}): ${errorBody}`);
    }

    const result = await response.json().catch(() => ({}));

    return {
      queued: true,
      channel: 'safaricom_sms',
      reference: result?.messageId || result?.ConversationID || null
    };
  } catch (error) {
    console.error('Safaricom SMS error:', error.message);
    return {
      queued: false,
      channel: 'safaricom_sms',
      reason: error.message
    };
  }
}

// ==================== TWILIO SMS CONFIGURATION ====================
// Twilio works on localhost! You just need:
// 1. Install Twilio SDK: npm install twilio
// 2. Get credentials from https://console.twilio.com/
// 3. For webhooks (if needed), use ngrok: npx ngrok http 5000

const twilioConfig = {
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  fromNumber: process.env.TWILIO_PHONE_NUMBER // E.164 format: +1234567890
};

const isTwilioConfigured = () =>
  !!(twilioConfig.accountSid && twilioConfig.authToken && twilioConfig.fromNumber);

// Format phone number for Twilio (E.164 format)
const formatPhoneForTwilio = (phoneNumber) => {
  if (!phoneNumber) return null;
  let digits = phoneNumber.toString().replace(/\D/g, '');

  // Convert Kenyan format to international
  if (digits.startsWith('0')) {
    digits = `254${digits.slice(1)}`;
  } else if (digits.startsWith('7') && digits.length === 9) {
    digits = `254${digits}`;
  } else if (digits.startsWith('254') && digits.length === 12) {
    // already correct
  } else if (digits.startsWith('254') && digits.length > 12) {
    digits = digits.slice(0, 12);
  }

  if (!digits.startsWith('254') || digits.length !== 12) {
    return null;
  }

  return `+${digits}`;
};

async function sendTwilioSms(phoneNumber, message) {
  if (!isTwilioConfigured()) {
    return {
      queued: false,
      channel: 'twilio_sms',
      reason: 'Twilio SMS not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER'
    };
  }

  // Dynamically import Twilio (works even if not installed)
  let twilioClient;
  try {
    const twilioModule = await import('twilio');
    // Twilio exports as default in ESM
    const Twilio = twilioModule.default;
    twilioClient = Twilio(twilioConfig.accountSid, twilioConfig.authToken);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      return {
        queued: false,
        channel: 'twilio_sms',
        reason: 'Twilio SDK not installed. Run: npm install twilio'
      };
    }
    console.error('Failed to initialize Twilio:', error.message);
    return {
      queued: false,
      channel: 'twilio_sms',
      reason: `Twilio initialization failed: ${error.message}`
    };
  }

  const msisdn = formatPhoneForTwilio(phoneNumber);

  if (!msisdn) {
    return {
      queued: false,
      channel: 'twilio_sms',
      reason: 'Invalid phone number format. Expected: 07XX, 7XX, or +2547XX'
    };
  }

  try {
    const result = await twilioClient.messages.create({
      body: message,
      from: twilioConfig.fromNumber,
      to: msisdn
    });

    console.log(`Twilio SMS sent successfully. SID: ${result.sid}, Status: ${result.status}`);
    
    return {
      queued: true,
      channel: 'twilio_sms',
      reference: result.sid,
      status: result.status
    };
  } catch (error) {
    console.error('Twilio SMS error:', error.message);
    return {
      queued: false,
      channel: 'twilio_sms',
      reason: error.message || 'Failed to send SMS via Twilio'
    };
  }
}

// ==================== UNIFIED SMS NOTIFICATION ====================
// Choose SMS provider: 'safaricom', 'twilio', or 'auto' (tries both)
const SMS_PROVIDER = process.env.SMS_PROVIDER || 'auto';

const sendRecommendationNotification = async (phoneNumber, recommendation) => {
  if (!phoneNumber) {
    return {
      queued: false,
      channel: 'none',
      reason: 'Phone number not supplied'
    };
  }

  const message = [
    'Fahamu Shamba Recommendation:',
    `${recommendation.crop.toUpperCase()} suits ${recommendation.subCounty} (${recommendation.season}).`,
    `Confidence ${recommendation.confidence}%.`,
    recommendation.reason
  ].join(' ');

  // Auto mode: try Twilio first (better for localhost), then Safaricom
  if (SMS_PROVIDER === 'auto') {
    // Try Twilio first (works on localhost)
    if (isTwilioConfigured()) {
      const twilioResult = await sendTwilioSms(phoneNumber, message);
      if (twilioResult.queued) {
        return twilioResult;
      }
      console.log('Twilio failed, trying Safaricom...', twilioResult.reason);
    }
    
    // Fallback to Safaricom
    if (isSafaricomConfigured()) {
      return await sendSafaricomSms(phoneNumber, message);
    }
    
    return {
      queued: false,
      channel: 'none',
      reason: 'No SMS provider configured. Set up Twilio or Safaricom credentials.'
    };
  }
  
  // Explicit provider selection
  if (SMS_PROVIDER === 'twilio') {
    return await sendTwilioSms(phoneNumber, message);
  }
  
  if (SMS_PROVIDER === 'safaricom') {
    return await sendSafaricomSms(phoneNumber, message);
  }
  
  return {
    queued: false,
    channel: 'none',
    reason: `Unknown SMS provider: ${SMS_PROVIDER}. Use 'safaricom', 'twilio', or 'auto'`
  };
};

// Initialize database tables
function initializeDatabase() {
  // Skip SQLite initialization if using PostgreSQL
  if (USE_POSTGRES) {
    console.log('✅ Using PostgreSQL - tables already migrated, skipping SQLite initialization');
    return;
  }

  try {
    // Initialize admin database
    adminDB.initializeAdminDatabase(db, dbAsync);

    // Initialize farmer database
    // farmerDB.initializeFarmerDatabase(db);  // Commented - conflicts with farmers table schema in server.js

    // Initialize enhanced farmer profile database
    farmerProfileDB.initializeEnhancedFarmerDatabase(db);

    // Create tables with correct schema
    db.exec(`CREATE TABLE IF NOT EXISTS farmers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT UNIQUE,
      sub_county TEXT,
      soil_type TEXT,
      preferred_language TEXT DEFAULT 'english',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('✅ Farmers table ready');

    db.exec(`CREATE TABLE IF NOT EXISTS predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      farmer_id INTEGER,
      phone_number TEXT,
      sub_county TEXT,
      soil_type TEXT,
      season TEXT,
      predicted_crop TEXT,
      confidence INTEGER,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(farmer_id) REFERENCES farmers(id)
    )`);
    console.log('✅ Predictions table ready');

    db.exec(`CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prediction_id INTEGER,
      phone_number TEXT,
      is_helpful BOOLEAN,
      comments TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(prediction_id) REFERENCES predictions(id)
    )`);
    console.log('✅ Feedback table ready');

    // Helpful indexes for faster lookups
    db.exec(`CREATE INDEX IF NOT EXISTS idx_predictions_phone ON predictions(phone_number)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_predictions_created ON predictions(created_at)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_feedback_prediction ON feedback(prediction_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_farmers_phone ON farmers(phone_number)`);
    
    console.log('✅ All database indexes created');
  } catch (err) {
    console.error('Error initializing database:', err.message);
  }
}

// Input validation middleware
const validatePredictionInput = (req, res, next) => {
  const { subCounty, soilType, season, phoneNumber } = req.body;
  
  const validSubCounties = ['bondo', 'ugunja', 'yala', 'gem', 'alego'];
  const validSoilTypes = ['sandy', 'clay', 'loam'];
  const validSeasons = ['long_rains', 'short_rains', 'dry'];
  
  if (!subCounty || !validSubCounties.includes(subCounty.toLowerCase())) {
    return res.status(400).json({
      success: false,
      error: 'Invalid sub-county. Must be one of: bondo, ugunja, yala, gem, alego'
    });
  }
  
  if (!soilType || !validSoilTypes.includes(soilType.toLowerCase())) {
    return res.status(400).json({
      success: false,
      error: 'Invalid soil type. Must be one of: sandy, clay, loam'
    });
  }
  
  if (!season || !validSeasons.includes(season.toLowerCase())) {
    return res.status(400).json({
      success: false,
      error: 'Invalid season. Must be one of: long_rains, short_rains, dry'
    });
  }
  
  next();
};

// ==================== WEATHER API CONFIGURATION ====================
const WEATHER_BASE_URL = 'https://api.open-meteo.com/v1';
const OPENWEATHER_BASE_URL = 'https://api.openweathermap.org/data/2.5';
const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY || '';

const subCountyCoordinates = {
  'siaya': { lat: -0.0611, lon: 34.2881 },
  'bondo': { lat: -0.2386, lon: 34.2699 },
  'ugunja': { lat: -0.2833, lon: 34.2833 },
  'ugenya': { lat: -0.1000, lon: 34.5333 },
  'yala': { lat: -0.1000, lon: 34.5333 }, // alias for backward compatibility
  'gem': { lat: -0.0833, lon: 34.4833 },
  'alego': { lat: -0.1667, lon: 34.3667 },
  'rarieda': { lat: -0.3300, lon: 34.4920 }
};

// Current weather endpoint
app.get('/api/weather/current/:subcounty', async (req, res) => {
  try {
    const subcounty = req.params.subcounty.toLowerCase();
    const coords = subCountyCoordinates[subcounty];
    
    if (!coords) {
      return res.status(404).json({ 
        success: false,
        error: 'Sub-county not found. Available sub-counties: bondo, ugunja, ugenya, gem, alego, rarieda'
      });
    }

    const response = await fetch(
      `${WEATHER_BASE_URL}/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,precipitation,rain,showers,weather_code,wind_speed_10m,wind_direction_10m&timezone=Africa/Nairobi`
    );
    
    if (!response.ok) {
      throw new Error(`Weather API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.current) {
      throw new Error('Weather data not available from API');
    }

    const weatherData = {
      location: subcounty.charAt(0).toUpperCase() + subcounty.slice(1),
      temperature: Math.round(data.current.temperature_2m),
      humidity: data.current.relative_humidity_2m,
      precipitation: data.current.precipitation,
      rain: data.current.rain,
      showers: data.current.showers,
      weather_code: data.current.weather_code,
      wind_speed: data.current.wind_speed_10m,
      wind_direction: data.current.wind_direction_10m,
      description: getWeatherDescription(data.current.weather_code),
      icon: getWeatherIcon(data.current.weather_code),
      timestamp: new Date(data.current.time),
      alerts: checkWeatherAlerts(data.current)
    };

    res.json({
      success: true,
      data: weatherData,
      last_updated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Weather API error:', error);
    res.json({
      success: true,
      data: getMockWeatherData(req.params.subcounty),
      last_updated: new Date().toISOString(),
      note: 'Using fallback data due to API unavailability'
    });
  }
});

// OpenWeather-powered live weather bundle for dashboard cards and charts.
app.get('/api/weather/live/:subcounty', async (req, res) => {
  const subcounty = req.params.subcounty.toLowerCase();
  const coords = subCountyCoordinates[subcounty];

  if (!coords) {
    return res.status(404).json({
      success: false,
      error: 'Sub-county not found. Use siaya, bondo, ugunja, ugenya, gem, alego, rarieda'
    });
  }

  // If key is missing, fallback to existing open-meteo endpoints already in this service.
  if (!OPENWEATHER_API_KEY) {
    try {
      const [currentResp, forecastResp, agrometData] = await Promise.all([
        fetch(`${WEATHER_BASE_URL}/forecast?latitude=${coords.lat}&longitude=${coords.lon}&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m,wind_direction_10m&timezone=Africa/Nairobi`),
        fetch(`${WEATHER_BASE_URL}/forecast?latitude=${coords.lat}&longitude=${coords.lon}&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=Africa/Nairobi&forecast_days=7`),
        fetchAgrometData(coords.lat, coords.lon)
      ]);
      const currentData = await currentResp.json();
      const forecastData = await forecastResp.json();

      return res.json({
        success: true,
        source: 'open-meteo-fallback',
        location: subcounty,
        current: {
          temp: Math.round(currentData?.current?.temperature_2m || 0),
          feels_like: Math.round(currentData?.current?.temperature_2m || 0),
          humidity: currentData?.current?.relative_humidity_2m || 0,
          wind_speed: currentData?.current?.wind_speed_10m || 0,
          wind_deg: currentData?.current?.wind_direction_10m || 0,
          description: getWeatherDescription(currentData?.current?.weather_code || 0),
          icon: getWeatherIcon(currentData?.current?.weather_code || 0),
          precipitation: currentData?.current?.precipitation || 0,
          rain_1h: currentData?.current?.rain || 0,
          agromet: agrometData
        },
        hourly: (forecastData?.hourly?.time || []).slice(0, 24).map((time, idx) => ({
          dt_txt: time,
          temp: Math.round(forecastData.hourly.temperature_2m[idx] || 0),
          humidity: forecastData.hourly.relative_humidity_2m[idx] || 0,
          pop: ((forecastData.hourly.precipitation_probability?.[idx] || 0) / 100),
          precipitation: forecastData.hourly.precipitation?.[idx] || 0,
          description: getWeatherDescription(forecastData.hourly.weather_code[idx] || 0),
          icon: getWeatherIcon(forecastData.hourly.weather_code[idx] || 0)
        })),
        daily: processOpenMeteoForecast(forecastData.daily || {}, subcounty),
        air: { aqi: 2, label: 'Good' },
        sun: {
          sunrise: new Date().setHours(6, 39, 0, 0),
          sunset: new Date().setHours(18, 46, 0, 0)
        },
        uv_index: 1
      });
    } catch (error) {
      return res.json({
        success: true,
        source: 'mock-fallback',
        location: subcounty,
        current: {
          temp: 26,
          feels_like: 27,
          humidity: 74,
          wind_speed: 7.2,
          wind_deg: 45,
          description: 'Overcast',
          icon: '☁️',
          precipitation: 0.5,
          rain_1h: 0.2
        },
        hourly: [],
        daily: getMockForecastData(subcounty),
        air: { aqi: 1, label: 'Excellent' },
        sun: {
          sunrise: Date.now(),
          sunset: Date.now() + (12 * 60 * 60 * 1000)
        },
        uv_index: 1
      });
    }
  }

  try {
    const [currentRes, forecastRes, airRes, agrometData] = await Promise.all([
      fetch(`${OPENWEATHER_BASE_URL}/weather?lat=${coords.lat}&lon=${coords.lon}&units=metric&appid=${OPENWEATHER_API_KEY}`),
      fetch(`${OPENWEATHER_BASE_URL}/forecast?lat=${coords.lat}&lon=${coords.lon}&units=metric&appid=${OPENWEATHER_API_KEY}`),
      fetch(`${OPENWEATHER_BASE_URL}/air_pollution?lat=${coords.lat}&lon=${coords.lon}&appid=${OPENWEATHER_API_KEY}`),
      fetchAgrometData(coords.lat, coords.lon)
    ]);

    if (!currentRes.ok || !forecastRes.ok || !airRes.ok) {
      throw new Error('OpenWeather request failed');
    }

    const current = await currentRes.json();
    const forecast = await forecastRes.json();
    const air = await airRes.json();

    const airAqi = air?.list?.[0]?.main?.aqi || 0;
    const airLabels = {
      1: 'Excellent',
      2: 'Good',
      3: 'Moderate',
      4: 'Poor',
      5: 'Very Poor'
    };

    const dailyMap = new Map();
    (forecast.list || []).forEach(item => {
      const key = item.dt_txt.slice(0, 10);
      if (!dailyMap.has(key)) {
        dailyMap.set(key, {
          date: new Date(item.dt * 1000),
          temperature: { min: item.main.temp_min, max: item.main.temp_max },
          description: item.weather?.[0]?.description || 'N/A',
          icon: item.weather?.[0]?.icon || '01d',
          precipitation: item.rain?.['3h'] || 0,
          rain_probability: Math.round((item.pop || 0) * 100)
        });
      } else {
        const d = dailyMap.get(key);
        d.temperature.min = Math.min(d.temperature.min, item.main.temp_min);
        d.temperature.max = Math.max(d.temperature.max, item.main.temp_max);
      }
    });

    const daily = Array.from(dailyMap.values()).slice(0, 7).map(d => ({
      ...d,
      temperature: {
        min: Math.round(d.temperature.min),
        max: Math.round(d.temperature.max)
      }
    }));

    res.json({
      success: true,
      source: 'openweather',
      location: current.name || subcounty,
      current: {
        temp: Math.round(current.main?.temp || 0),
        feels_like: Math.round(current.main?.feels_like || 0),
        humidity: current.main?.humidity || 0,
        wind_speed: current.wind?.speed || 0,
        wind_deg: current.wind?.deg || 0,
        description: current.weather?.[0]?.description || 'N/A',
        icon: current.weather?.[0]?.icon || '01d',
        precipitation: current.rain?.['1h'] || 0,
        rain_1h: current.rain?.['1h'] || 0,
        clouds: current.clouds?.all || 0,
        agromet: agrometData
      },
      hourly: (forecast.list || []).slice(0, 24).map(item => ({
        dt_txt: item.dt_txt,
        temp: Math.round(item.main?.temp || 0),
        humidity: item.main?.humidity || 0,
        pop: item.pop || 0,
        precipitation: item.rain?.['3h'] || 0,
        description: item.weather?.[0]?.description || 'N/A',
        icon: item.weather?.[0]?.icon || '01d'
      })),
      daily,
      air: {
        aqi: airAqi,
        label: airLabels[airAqi] || 'Unknown'
      },
      sun: {
        sunrise: (current.sys?.sunrise || 0) * 1000,
        sunset: (current.sys?.sunset || 0) * 1000
      },
      // Free tier does not always provide UV in this endpoint set.
      uv_index: null
    });
  } catch (error) {
    console.error('OpenWeather live endpoint error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch live weather' });
  }
});

// 7-day forecast endpoint
app.get('/api/weather/forecast/:subcounty', async (req, res) => {
  try {
    const subcounty = req.params.subcounty.toLowerCase();
    const coords = subCountyCoordinates[subcounty];
    
    if (!coords) {
      return res.status(404).json({ 
        success: false,
        error: 'Sub-county not found' 
      });
    }

    const response = await fetch(
      `${WEATHER_BASE_URL}/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,rain_sum,precipitation_hours,wind_speed_10m_max&timezone=Africa/Nairobi&forecast_days=7`
    );
    
    if (!response.ok) {
      throw new Error(`Forecast API responded with status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.daily) {
      throw new Error('Forecast data not available from API');
    }

    const forecastData = processOpenMeteoForecast(data.daily, subcounty);

    res.json({
      success: true,
      data: forecastData,
      location: subcounty.charAt(0).toUpperCase() + subcounty.slice(1),
      last_updated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Forecast API error:', error);
    res.json({
      success: true,
      data: getMockForecastData(req.params.subcounty),
      last_updated: new Date().toISOString(),
      note: 'Using fallback data due to API unavailability'
    });
  }
});

// Weather summary endpoint
app.get('/api/weather/summary/:subcounty', async (req, res) => {
  try {
    const subcounty = req.params.subcounty.toLowerCase();
    
    if (!subCountyCoordinates[subcounty]) {
      return res.status(404).json({ 
        success: false,
        error: 'Sub-county not found' 
      });
    }

    const [currentResponse, forecastResponse] = await Promise.all([
      fetch(`${WEATHER_BASE_URL}/forecast?latitude=${subCountyCoordinates[subcounty].lat}&longitude=${subCountyCoordinates[subcounty].lon}&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m&timezone=Africa/Nairobi`),
      fetch(`${WEATHER_BASE_URL}/forecast?latitude=${subCountyCoordinates[subcounty].lat}&longitude=${subCountyCoordinates[subcounty].lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,rain_sum&timezone=Africa/Nairobi&forecast_days=3`)
    ]);

    if (!currentResponse.ok || !forecastResponse.ok) {
      throw new Error('Weather API responded with error');
    }

    const currentData = await currentResponse.json();
    const forecastData = await forecastResponse.json();

    if (!currentData.current || !forecastData.daily) {
      throw new Error('Incomplete weather data received');
    }

    const summary = {
      current: {
        temperature: Math.round(currentData.current.temperature_2m),
        description: getWeatherDescription(currentData.current.weather_code),
        icon: getWeatherIcon(currentData.current.weather_code),
        humidity: currentData.current.relative_humidity_2m,
        wind_speed: currentData.current.wind_speed_10m,
        precipitation: currentData.current.precipitation
      },
      forecast: processOpenMeteoForecast(forecastData.daily, subcounty).slice(0, 3),
      alerts: checkWeatherAlerts(currentData.current)
    };

    res.json({
      success: true,
      data: summary,
      last_updated: new Date().toISOString()
    });

  } catch (error) {
    console.error('Weather summary error:', error);
    res.json({
      success: true,
      data: getMockWeatherSummary(req.params.subcounty),
      last_updated: new Date().toISOString(),
      note: 'Using fallback data due to API unavailability'
    });
  }
});

// ==================== WEATHER HELPER FUNCTIONS ====================
async function fetchAgrometData(lat, lon) {
  try {
    const response = await fetch(`https://agromet-api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=et0_fao_evapotranspiration,soil_moisture_0_to_10cm,soil_temperature_0_to_10cm&timezone=Africa/Nairobi`);
    if (!response.ok) return null;
    const data = await response.json();
    return {
      evapotranspiration: data.daily?.et0_fao_evapotranspiration?.[0] || 0,
      soil_moisture: data.daily?.soil_moisture_0_to_10cm?.[0] || 0,
      soil_temperature: data.daily?.soil_temperature_0_to_10cm?.[0] || 0
    };
  } catch (error) {
    console.error('Agromet API error:', error);
    return null;
  }
}

function processOpenMeteoForecast(dailyData, location) {
  if (!dailyData.time || !dailyData.temperature_2m_min || !dailyData.temperature_2m_max) {
    return getMockForecastData(location);
  }
  
  return dailyData.time.map((date, index) => ({
    date: new Date(date),
    temperature: {
      min: Math.round(dailyData.temperature_2m_min[index]),
      max: Math.round(dailyData.temperature_2m_max[index])
    },
    weather_code: dailyData.weather_code[index],
    description: getWeatherDescription(dailyData.weather_code[index]),
    icon: getWeatherIcon(dailyData.weather_code[index]),
    precipitation: dailyData.precipitation_sum[index] || 0,
    rain: dailyData.rain_sum[index] || 0,
    precipitation_hours: dailyData.precipitation_hours ? dailyData.precipitation_hours[index] : 0,
    rain_probability: calculateRainProbability(dailyData.weather_code[index])
  }));
}

function getWeatherDescription(weatherCode) {
  const weatherDescriptions = {
    0: 'Clear sky',
    1: 'Mainly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Fog',
    48: 'Depositing rime fog',
    51: 'Light drizzle',
    53: 'Moderate drizzle',
    55: 'Dense drizzle',
    61: 'Slight rain',
    63: 'Moderate rain',
    65: 'Heavy rain',
    80: 'Slight rain showers',
    81: 'Moderate rain showers',
    82: 'Violent rain showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with slight hail',
    99: 'Thunderstorm with heavy hail'
  };
  return weatherDescriptions[weatherCode] || 'Unknown';
}

function getWeatherIcon(weatherCode) {
  const weatherIcons = {
    0: '☀️',  // Clear sky
    1: '🌤️',  // Mainly clear
    2: '⛅',  // Partly cloudy
    3: '☁️',  // Overcast
    45: '🌫️', // Fog
    48: '🌫️', // Fog
    51: '🌦️', // Light drizzle
    53: '🌦️', // Moderate drizzle
    55: '🌧️', // Dense drizzle
    61: '🌦️', // Slight rain
    63: '🌧️', // Moderate rain
    65: '🌧️', // Heavy rain
    80: '🌦️', // Rain showers
    81: '🌧️', // Rain showers
    82: '⛈️',  // Violent rain showers
    95: '⛈️',  // Thunderstorm
    96: '⛈️',  // Thunderstorm with hail
    99: '⛈️'   // Thunderstorm with hail
  };
  return weatherIcons[weatherCode] || '🌈';
}

function calculateRainProbability(weatherCode) {
  const rainCodes = [51, 53, 55, 61, 63, 65, 80, 81, 82, 95, 96, 99];
  return rainCodes.includes(weatherCode) ? 70 : 
         weatherCode === 2 ? 20 : 
         weatherCode === 3 ? 30 : 10;
}

function checkWeatherAlerts(current) {
  const alerts = [];
  
  if (!current) return alerts;
  
  // Check for extreme temperatures
  if (current.temperature_2m > 35) {
    alerts.push({
      type: 'high_temperature',
      message: 'High temperature alert: Consider irrigation and shading',
      severity: 'warning'
    });
  }
  
  if (current.temperature_2m < 10) {
    alerts.push({
      type: 'low_temperature',
      message: 'Low temperature alert: Protect sensitive crops',
      severity: 'warning'
    });
  }
  
  // Check for heavy rain
  if (current.precipitation > 10) {
    alerts.push({
      type: 'heavy_rain',
      message: 'Heavy rain alert: Ensure proper drainage',
      severity: 'warning'
    });
  }
  
  return alerts;
}

// Mock data for fallback
function getMockWeatherData(subcounty) {
  const baseTemp = 25 + Math.random() * 5;
  return {
    location: subcounty.charAt(0).toUpperCase() + subcounty.slice(1),
    temperature: Math.round(baseTemp),
    humidity: 60 + Math.floor(Math.random() * 20),
    precipitation: Math.random() * 5,
    rain: Math.random() * 2,
    weather_code: Math.random() > 0.7 ? 63 : 1,
    wind_speed: 2 + Math.random() * 5,
    description: Math.random() > 0.7 ? 'Moderate rain' : 'Mainly clear',
    icon: Math.random() > 0.7 ? '🌧️' : '🌤️',
    timestamp: new Date(),
    alerts: []
  };
}

function getMockForecastData(subcounty) {
  const forecast = [];
  const baseDate = new Date();
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(baseDate);
    date.setDate(baseDate.getDate() + i);
    
    forecast.push({
      date: date,
      temperature: {
        min: 18 + Math.floor(Math.random() * 5),
        max: 28 + Math.floor(Math.random() * 5)
      },
      description: i % 3 === 0 ? 'Moderate rain' : 'Partly cloudy',
      icon: i % 3 === 0 ? '🌧️' : '⛅',
      precipitation: i % 3 === 0 ? 5 + Math.random() * 10 : Math.random() * 2,
      rain_probability: i % 3 === 0 ? 70 : 20
    });
  }
  
  return forecast;
}

function getMockWeatherSummary(subcounty) {
  return {
    current: {
      temperature: 27,
      description: 'Partly cloudy',
      icon: '⛅',
      humidity: 65,
      wind_speed: 3.2,
      precipitation: 0.5
    },
    forecast: [
      {
        date: new Date(Date.now() + 86400000),
        temperature: { min: 19, max: 29 },
        description: 'Partly cloudy',
        icon: '⛅',
        rain_probability: 20
      },
      {
        date: new Date(Date.now() + 172800000),
        temperature: { min: 20, max: 28 },
        description: 'Moderate rain',
        icon: '🌧️',
        rain_probability: 70
      },
      {
        date: new Date(Date.now() + 259200000),
        temperature: { min: 18, max: 27 },
        description: 'Mainly clear',
        icon: '🌤️',
        rain_probability: 10
      }
    ],
    alerts: []
  };
}

// ==================== CROP PREDICTION RULES ====================
const cropRules = [
  // Bondo rules (10 crops)
  {
    conditions: { subcounty: "bondo", soil: "sandy", season: "long_rains" },
    recommendation: "beans",
    confidence: 85,
    reasons: {
      english: "Beans thrive in sandy soil during long rains with good drainage",
      swahili: "Maharagwe hukua vizuri kwenye udongo wa mchanga wakati wa mvua nyingi",
      luo: "Bo ma okony gi tongo anyong e piny ruodho"
    }
  },
  {
    conditions: { subcounty: "bondo", soil: "clay", season: "short_rains" },
    recommendation: "maize",
    confidence: 80,
    reasons: {
      english: "Maize grows well in clay soil during short rains",
      swahili: "Mahindi hukua vizuri kwenye udongo wa mfinyanzi wakati wa mvua fupi",
      luo: "Oduma donjo maber e tongo lal e piny ruodho machon"
    }
  },
  {
    conditions: { subcounty: "bondo", soil: "loam", season: "long_rains" },
    recommendation: "sorghum",
    confidence: 90,
    reasons: {
      english: "Sorghum is drought-resistant and grows well in loam soil",
      swahili: "Mtama unaomvumilia ukame na hukua vizuri kwenye udongo wa tanuri",
      luo: "Bel donjo maber e tongo ber e piny ruodho"
    }
  },
  {
    conditions: { subcounty: "bondo", soil: "sandy", season: "dry" },
    recommendation: "cassava",
    confidence: 75,
    reasons: {
      english: "Cassava is drought-tolerant and grows well in sandy soil",
      swahili: "Muhogo unavumilia ukame na hukua vizuri kwenye udongo wa mchanga",
      luo: "Mogo nyalo turo e kwo e tongo anyong"
    }
  },
  {
    conditions: { subcounty: "bondo", soil: "clay", season: "long_rains" },
    recommendation: "rice",
    confidence: 88,
    reasons: {
      english: "Rice requires clay soil that retains water during long rains",
      swahili: "Mchele unahitaji udongo wa mfinyanzi unaoshika maji wakati wa mvua nyingi",
      luo: "Mchele donjo maber e tongo lal e piny ruodho"
    }
  },
  {
    conditions: { subcounty: "bondo", soil: "loam", season: "short_rains" },
    recommendation: "soybeans",
    confidence: 82,
    reasons: {
      english: "Soybeans thrive in loam soil during short rains",
      swahili: "Soya hukua vizuri kwenye udongo wa tanuri wakati wa mvua fupi",
      luo: "Soy donjo maber e tongo ber e piny ruodho machon"
    }
  },
  {
    conditions: { subcounty: "bondo", soil: "sandy", season: "short_rains" },
    recommendation: "green_grams",
    confidence: 78,
    reasons: {
      english: "Green grams are suitable for sandy soil in short rains",
      swahili: "Pojo ni sawa kwa udongo wa mchanga wakati wa mvua fupi",
      luo: "Ngege ber mondo tiyo gi tongo anyong e piny ruodho machon"
    }
  },
  {
    conditions: { subcounty: "bondo", soil: "clay", season: "dry" },
    recommendation: "millet",
    confidence: 70,
    reasons: {
      english: "Millet is drought-tolerant and grows in clay soil",
      swahili: "Uwele unavumilia ukame na hukua kwenye udongo wa mfinyanzi",
      luo: "Belo ma nyalo turo e kwo e tongo lal"
    }
  },
  {
    conditions: { subcounty: "bondo", soil: "loam", season: "dry" },
    recommendation: "sweet_potatoes",
    confidence: 85,
    reasons: {
      english: "Sweet potatoes grow well in loam soil during dry season",
      swahili: "Viazi vitamu hukua vizuri kwenye udongo wa tanuri wakati wa kiangazi",
      luo: "Rabuon donjo maber e tongo ber e piny kwo"
    }
  },
  {
    conditions: { subcounty: "bondo", soil: "sandy", season: "long_rains" },
    recommendation: "watermelons",
    confidence: 80,
    reasons: {
      english: "Watermelons thrive in sandy soil with good drainage during long rains",
      swahili: "Mtikiti hukua vizuri kwenye udongo wa mchanga wenye mitiririko mzuri wakati wa mvua nyingi",
      luo: "Mikwere donjo maber e tongo anyong e piny ruodho"
    }
  },

  // Ugunja rules (10 crops)
  {
    conditions: { subcounty: "ugunja", soil: "sandy", season: "long_rains" },
    recommendation: "cowpeas",
    confidence: 85,
    reasons: {
      english: "Cowpeas are ideal for sandy soils in Ugunja during long rains",
      swahili: "Kunde ni bora kwa udongo wa mchanga huko Ugunja wakati wa mvua nyingi",
      luo: "Bo ma nyoyo donjo maber e Ugunja gi tongo anyong"
    }
  },
  {
    conditions: { subcounty: "ugunja", soil: "clay", season: "short_rains" },
    recommendation: "pigeon_peas",
    confidence: 82,
    reasons: {
      english: "Pigeon peas grow well in clay soil during short rains",
      swahili: "Mbaazi hukua vizuri kwenye udongo wa mfinyanzi wakati wa mvua fupi",
      luo: "Otho donjo maber e tongo lal e piny ruodho machon"
    }
  },
  {
    conditions: { subcounty: "ugunja", soil: "loam", season: "long_rains" },
    recommendation: "sunflower",
    confidence: 78,
    reasons: {
      english: "Sunflowers thrive in loam soil during long rains",
      swahili: "Alizeti hukua vizuri kwenye udongo wa tanuri wakati wa mvua nyingi",
      luo: "Abir donjo maber e tongo ber e piny ruodho"
    }
  },
  {
    conditions: { subcounty: "ugunja", soil: "sandy", season: "dry" },
    recommendation: "groundnuts",
    confidence: 75,
    reasons: {
      english: "Groundnuts are drought-resistant and suitable for sandy soil",
      swahili: "Njugu unavumilia ukame na unafaa kwa udongo wa mchanga",
      luo: "Nguo ma nyalo turo e kwo e tongo anyong"
    }
  },
  {
    conditions: { subcounty: "ugunja", soil: "clay", season: "long_rains" },
    recommendation: "cotton",
    confidence: 72,
    reasons: {
      english: "Cotton requires clay soil that retains moisture during long rains",
      swahili: "Pamba unahitaji udongo wa mfinyanzi unaoshika unyevu wakati wa mvua nyingi",
      luo: "Pamba donjo maber e tongo lal e piny ruodho"
    }
  },
  {
    conditions: { subcounty: "ugunja", soil: "loam", season: "short_rains" },
    recommendation: "tomatoes",
    confidence: 88,
    reasons: {
      english: "Tomatoes thrive in loam soil during short rains",
      swahili: "Nyanya hukua vizuri kwenye udongo wa tanuri wakati wa mvua fupi",
      luo: "Nyanya donjo maber e tongo ber e piny ruodho machon"
    }
  },
  {
    conditions: { subcounty: "ugunja", soil: "sandy", season: "short_rains" },
    recommendation: "onions",
    confidence: 80,
    reasons: {
      english: "Onions grow well in sandy soil during short rains",
      swahili: "Vitunguu hukua vizuri kwenye udongo wa mchanga wakati wa mvua fupi",
      luo: "Kitunguu donjo maber e tongo anyong e piny ruodho machon"
    }
  },
  {
    conditions: { subcounty: "ugunja", soil: "clay", season: "dry" },
    recommendation: "sugarcane",
    confidence: 85,
    reasons: {
      english: "Sugarcane is drought-tolerant and grows in clay soil",
      swahili: "Mia unavumilia ukame na hukua kwenye udongo wa mfinyanzi",
      luo: "Mia nyalo turo e kwo e tongo lal"
    }
  },
  {
    conditions: { subcounty: "ugunja", soil: "loam", season: "dry" },
    recommendation: "potatoes",
    confidence: 82,
    reasons: {
      english: "Potatoes grow well in loam soil during dry season",
      swahili: "Viazi hukua vizuri kwenye udongo wa tanuri wakati wa kiangazi",
      luo: "Rabuon donjo maber e tongo ber e piny kwo"
    }
  },
  {
    conditions: { subcounty: "ugunja", soil: "sandy", season: "long_rains" },
    recommendation: "carrots",
    confidence: 78,
    reasons: {
      english: "Carrots thrive in sandy soil with good drainage during long rains",
      swahili: "Karoti hukua vizuri kwenye udongo wa mchanga wenye mitiririko mzuri wakati wa mvua nyingi",
      luo: "Karot donjo maber e tongo anyong e piny ruodho"
    }
  },

  // Yala rules (10 crops)
  {
    conditions: { subcounty: "yala", soil: "loam", season: "long_rains" },
    recommendation: "rice",
    confidence: 95,
    reasons: {
      english: "Yala's loam soil is perfect for rice cultivation during long rains",
      swahili: "Udongo wa tanuri wa Yala unafaa kwa kilimo cha mchele wakati wa mvua nyingi",
      luo: "Mchele donjo maber e Yala gi tongo ber e piny ruodho"
    }
  },
  {
    conditions: { subcounty: "yala", soil: "clay", season: "short_rains" },
    recommendation: "sweet_potatoes",
    confidence: 88,
    reasons: {
      english: "Sweet potatoes grow well in clay soil during short rains",
      swahili: "Viazi vitamu hukua vizuri kwenye udongo wa mfinyanzi wakati wa mvua fupi",
      luo: "Rabuon donjo maber e tongo lal e piny ruodho machon"
    }
  },
  {
    conditions: { subcounty: "yala", soil: "sandy", season: "long_rains" },
    recommendation: "cabbage",
    confidence: 85,
    reasons: {
      english: "Cabbage thrives in sandy soil during long rains",
      swahili: "Kabichi hukua vizuri kwenye udongo wa mchanga wakati wa mvua nyingi",
      luo: "Kabich donjo maber e tongo anyong e piny ruodho"
    }
  },
  {
    conditions: { subcounty: "yala", soil: "loam", season: "short_rains" },
    recommendation: "kale",
    confidence: 90,
    reasons: {
      english: "Kale grows exceptionally well in Yala's loam soil during short rains",
      swahili: "Sukumawiki hukua vizuri sana kwenye udongo wa tanuri wa Yala wakati wa mvua fupi",
      luo: "Sukumawiki donjo maber e Yala gi tongo ber e piny ruodho machon"
    }
  },
  {
    conditions: { subcounty: "yala", soil: "clay", season: "long_rains" },
    recommendation: "spinach",
    confidence: 82,
    reasons: {
      english: "Spinach requires clay soil that retains moisture during long rains",
      swahili: "Mchicha unahitaji udongo wa mfinyanzi unaoshika unyevu wakati wa mvua nyingi",
      luo: "Mchicha donjo maber e tongo lal e piny ruodho"
    }
  },
  {
    conditions: { subcounty: "yala", soil: "sandy", season: "dry" },
    recommendation: "pumpkins",
    confidence: 75,
    reasons: {
      english: "Pumpkins are drought-tolerant and grow well in sandy soil",
      swahili: "Maboga unavumilia ukame na hukua vizuri kwenye udongo wa mchanga",
      luo: "Boga ma nyalo turo e kwo e tongo anyong"
    }
  },
  {
    conditions: { subcounty: "yala", soil: "loam", season: "dry" },
    recommendation: "eggplant",
    confidence: 78,
    reasons: {
      english: "Eggplant grows well in loam soil during dry season",
      swahili: "Biringanya hukua vizuri kwenye udongo wa tanuri wakati wa kiangazi",
      luo: "Biringanya donjo maber e tongo ber e piny kwo"
    }
  },
  {
    conditions: { subcounty: "yala", soil: "clay", season: "short_rains" },
    recommendation: "okra",
    confidence: 80,
    reasons: {
      english: "Okra thrives in clay soil during short rains",
      swahili: "Bamia hukua vizuri kwenye udongo wa mfinyanzi wakati wa mvua fupi",
      luo: "Bamia donjo maber e tongo lal e piny ruodho machon"
    }
  },
  {
    conditions: { subcounty: "yala", soil: "sandy", season: "short_rains" },
    recommendation: "cucumber",
    confidence: 82,
    reasons: {
      english: "Cucumbers grow well in sandy soil during short rains",
      swahili: "Tangawizi hukua vizuri kwenye udongo wa mchanga wakati wa mvua fupi",
      luo: "Tangawisi donjo maber e tongo anyong e piny ruodho machon"
    }
  },
  {
    conditions: { subcounty: "yala", soil: "loam", season: "long_rains" },
    recommendation: "bananas",
    confidence: 92,
    reasons: {
      english: "Bananas thrive in Yala's fertile loam soil during long rains",
      swahili: "Ndizi hukua vizuri kwenye udongo wa tanuri wa Yala wakati wa mvua nyingi",
      luo: "Rabuon donjo maber e Yala gi tongo ber e piny ruodho"
    }
  },

  // Gem rules (10 crops)
  {
    conditions: { subcounty: "gem", soil: "loam", season: "long_rains" },
    recommendation: "soybeans",
    confidence: 82,
    reasons: {
      english: "Soybeans thrive in Gem's loam soil during long rains",
      swahili: "Soya hukua vizuri kwenye udongo wa tanuri wa Gem wakati wa mvua nyingi",
      luo: "Soy donjo maber e Gem gi tongo ber"
    }
  },
  {
    conditions: { subcounty: "gem", soil: "sandy", season: "short_rains" },
    recommendation: "green_grams",
    confidence: 78,
    reasons: {
      english: "Green grams are suitable for Gem's sandy soil in short rains",
      swahili: "Pojo ni sawa kwa udongo wa mchanga wa Gem wakati wa mvua fupi",
      luo: "Ngege ber mondo tiyo gi tongo anyong e Gem"
    }
  },
  {
    conditions: { subcounty: "gem", soil: "clay", season: "long_rains" },
    recommendation: "tea",
    confidence: 85,
    reasons: {
      english: "Tea requires clay soil with good moisture retention in Gem during long rains",
      swahili: "Chai unahitaji udongo wa mfinyanzi unaoshika unyevu vizuri Gem wakati wa mvua nyingi",
      luo: "Chai donjo maber e Gem gi tongo lal e piny ruodho"
    }
  },
  {
    conditions: { subcounty: "gem", soil: "loam", season: "short_rains" },
    recommendation: "coffee",
    confidence: 88,
    reasons: {
      english: "Coffee grows well in Gem's loam soil during short rains",
      swahili: "Kahawa hukua vizuri kwenye udongo wa tanuri wa Gem wakati wa mvua fupi",
      luo: "Kahawa donjo maber e Gem gi tongo ber e piny ruodho machon"
    }
  },
  {
    conditions: { subcounty: "gem", soil: "sandy", season: "dry" },
    recommendation: "sisal",
    confidence: 70,
    reasons: {
      english: "Sisal is drought-resistant and suitable for sandy soil in Gem",
      swahili: "Mkonge unavumilia ukame na unafaa kwa udongo wa mchanga Gem",
      luo: "Mkonge ma nyalo turo e kwo e Gem gi tongo anyong"
    }
  },
  {
    conditions: { subcounty: "gem", soil: "clay", season: "short_rains" },
    recommendation: "pyrethrum",
    confidence: 75,
    reasons: {
      english: "Pyrethrum grows well in clay soil during short rains in Gem",
      swahili: "Pyrethrum hukua vizuri kwenye udongo wa mfinyanzi wakati wa mvua fupi Gem",
      luo: "Pyrethrum donjo maber e Gem gi tongo lal e piny ruodho machon"
    }
  },
  {
    conditions: { subcounty: "gem", soil: "loam", season: "dry" },
    recommendation: "avocado",
    confidence: 90,
    reasons: {
      english: "Avocado trees thrive in Gem's loam soil during dry season",
      swahili: "Mikunde hukua vizuri kwenye udongo wa tanuri wa Gem wakati wa kiangazi",
      luo: "Mikunde donjo maber e Gem gi tongo ber e piny kwo"
    }
  },
  {
    conditions: { subcounty: "gem", soil: "sandy", season: "long_rains" },
    recommendation: "mangoes",
    confidence: 85,
    reasons: {
      english: "Mangoes grow well in sandy soil with good drainage in Gem during long rains",
      swahili: "Maembe hukua vizuri kwenye udongo wa mchanga wenye mitiririko mzuri Gem wakati wa mvua nyingi",
      luo: "Maembe donjo maber e Gem gi tongo anyong e piny ruodho"
    }
  },
  {
    conditions: { subcounty: "gem", soil: "clay", season: "dry" },
    recommendation: "macadamia",
    confidence: 80,
    reasons: {
      english: "Macadamia nuts are drought-tolerant and grow in clay soil in Gem",
      swahili: "Macadamia unavumilia ukame na hukua kwenye udongo wa mfinyanzi Gem",
      luo: "Macadamia nyalo turo e kwo e Gem gi tongo lal"
    }
  },
  {
    conditions: { subcounty: "gem", soil: "loam", season: "long_rains" },
    recommendation: "passion_fruit",
    confidence: 88,
    reasons: {
      english: "Passion fruit thrives in Gem's loam soil during long rains",
      swahili: "Passion hukua vizuri kwenye udongo wa tanuri wa Gem wakati wa mvua nyingi",
      luo: "Passion donjo maber e Gem gi tongo ber e piny ruodho"
    }
  },

  // Alego rules (10 crops)
  {
    conditions: { subcounty: "alego", soil: "sandy", season: "short_rains" },
    recommendation: "green_grams",
    confidence: 78,
    reasons: {
      english: "Green grams are suitable for Alego's sandy soil in short rains",
      swahili: "Pojo ni sawa kwa udongo wa mchanga wa Alego wakati wa mvua fupi",
      luo: "Ngege ber mondo tiyo gi tongo anyong e Alego"
    }
  },
  {
    conditions: { subcounty: "alego", soil: "clay", season: "long_rains" },
    recommendation: "rice",
    confidence: 85,
    reasons: {
      english: "Rice grows well in Alego's clay soil during long rains",
      swahili: "Mchele hukua vizuri kwenye udongo wa mfinyanzi wa Alego wakati wa mvua nyingi",
      luo: "Mchele donjo maber e Alego gi tongo lal e piny ruodho"
    }
  },
  {
    conditions: { subcounty: "alego", soil: "loam", season: "short_rains" },
    recommendation: "beans",
    confidence: 90,
    reasons: {
      english: "Beans thrive in Alego's loam soil during short rains",
      swahili: "Maharagwe hukua vizuri kwenye udongo wa tanuri wa Alego wakati wa mvua fupi",
      luo: "Bo donjo maber e Alego gi tongo ber e piny ruodho machon"
    }
  },
  {
    conditions: { subcounty: "alego", soil: "sandy", season: "dry" },
    recommendation: "cowpeas",
    confidence: 75,
    reasons: {
      english: "Cowpeas are drought-resistant and suitable for Alego's sandy soil",
      swahili: "Kunde unavumilia ukame na unafaa kwa udongo wa mchanga wa Alego",
      luo: "Bo ma nyoyo nyalo turo e kwo e Alego gi tongo anyong"
    }
  },
  {
    conditions: { subcounty: "alego", soil: "clay", season: "short_rains" },
    recommendation: "sorghum",
    confidence: 82,
    reasons: {
      english: "Sorghum grows well in clay soil during short rains in Alego",
      swahili: "Mtama hukua vizuri kwenye udongo wa mfinyanzi wakati wa mvua fupi Alego",
      luo: "Bel donjo maber e Alego gi tongo lal e piny ruodho machon"
    }
  },
  {
    conditions: { subcounty: "alego", soil: "loam", season: "long_rains" },
    recommendation: "maize",
    confidence: 88,
    reasons: {
      english: "Maize thrives in Alego's loam soil during long rains",
      swahili: "Mahindi hukua vizuri kwenye udongo wa tanuri wa Alego wakati wa mvua nyingi",
      luo: "Oduma donjo maber e Alego gi tongo ber e piny ruodho"
    }
  },
  {
    conditions: { subcounty: "alego", soil: "sandy", season: "long_rains" },
    recommendation: "watermelons",
    confidence: 80,
    reasons: {
      english: "Watermelons grow well in Alego's sandy soil during long rains",
      swahili: "Mtikiti hukua vizuri kwenye udongo wa mchanga wa Alego wakati wa mvua nyingi",
      luo: "Mikwere donjo maber e Alego gi tongo anyong e piny ruodho"
    }
  },
  {
    conditions: { subcounty: "alego", soil: "clay", season: "dry" },
    recommendation: "millet",
    confidence: 70,
    reasons: {
      english: "Millet is drought-tolerant and grows in Alego's clay soil",
      swahili: "Uwele unavumilia ukame na hukua kwenye udongo wa mfinyanzi wa Alego",
      luo: "Belo ma nyalo turo e kwo e Alego gi tongo lal"
    }
  },
  {
    conditions: { subcounty: "alego", soil: "loam", season: "dry" },
    recommendation: "sweet_potatoes",
    confidence: 85,
    reasons: {
      english: "Sweet potatoes grow well in Alego's loam soil during dry season",
      swahili: "Viazi vitamu hukua vizuri kwenye udongo wa tanuri wa Alego wakati wa kiangazi",
      luo: "Rabuon donjo maber e Alego gi tongo ber e piny kwo"
    }
  },
  {
    conditions: { subcounty: "alego", soil: "sandy", season: "short_rains" },
    recommendation: "groundnuts",
    confidence: 78,
    reasons: {
      english: "Groundnuts are suitable for Alego's sandy soil in short rains",
      swahili: "Njugu ni sawa kwa udongo wa mchanga wa Alego wakati wa mvua fupi",
      luo: "Nguo ber mondo tiyo gi tongo anyong e Alego e piny ruodho machon"
    }
  }
];
// Enhanced Prediction API with proper error handling (using dbAsync)

// guide developers & clients
app.get('/api/predict', (req, res) => {
  res.status(405).json({
    success: false,
    error: 'This endpoint accepts POST requests only. Send JSON body with { subCounty, soilType, season }'
  });
});

app.post('/api/predict', validatePredictionInput, async (req, res) => {
  const { subCounty, soilType, season, language = 'english', phoneNumber } = req.body;
  const normalizedLanguage = normalizeLanguage(language);
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  console.log('Received prediction request:', { subCounty, soilType, season, language: normalizedLanguage, phoneNumber: normalizedPhone });

  const matchedRule = cropRules.find(rule =>
    rule.conditions.subcounty === subCounty.toLowerCase() &&
    rule.conditions.soil === soilType.toLowerCase() &&
    rule.conditions.season === season.toLowerCase()
  );

  if (!matchedRule) {
    return res.status(404).json({
      success: false,
      error: 'No matching crop recommendation found for your inputs'
    });
  }

  const localizedReason = matchedRule.reasons[normalizedLanguage] || matchedRule.reasons.english;

  try {
    if (normalizedPhone) {
      await dbAsync.run(
        `INSERT INTO farmers (phone_number, sub_county, soil_type, preferred_language)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(phone_number) DO UPDATE SET
           sub_county = excluded.sub_county,
           soil_type = excluded.soil_type,
           preferred_language = excluded.preferred_language`,
        [normalizedPhone, subCounty, soilType, normalizedLanguage]
      );
    }

    const predResult = await dbAsync.run(
      `INSERT INTO predictions (sub_county, soil_type, season, predicted_crop, confidence, reason, phone_number)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [subCounty, soilType, season, matchedRule.recommendation, matchedRule.confidence, localizedReason, normalizedPhone]
    );

    const alternatives = cropRules
      .filter(rule => rule.conditions.subcounty === subCounty.toLowerCase())
      .filter(rule => rule.recommendation !== matchedRule.recommendation)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3)
      .map(rule => ({
        crop: rule.recommendation,
        confidence: rule.confidence,
        soil: rule.conditions.soil,
        season: rule.conditions.season,
        reason: rule.reasons[normalizedLanguage] || rule.reasons.english
      }));

    let notificationStatus = {
      queued: false,
      channel: 'safaricom_sms',
      reason: 'Phone number not provided'
    };

    if (normalizedPhone) {
      notificationStatus = await sendRecommendationNotification(normalizedPhone, {
        crop: matchedRule.recommendation,
        confidence: matchedRule.confidence,
        reason: localizedReason,
        subCounty,
        season,
        soilType
      });
    }

    res.json({
      success: true,
      crop: matchedRule.recommendation,
      confidence: matchedRule.confidence,
      reason: localizedReason,
      message: 'Prediction successful',
      predictionId: predResult.lastID,
      submitted_at: new Date().toISOString(),
      suggestions: alternatives,   // top 3 ranked by confidence
      notificationStatus
    });
  } catch (err) {
    console.error('Prediction error:', err);
    res.status(500).json({
      success: false,
      error: 'Database error during prediction'
    });
  }
});

// USSD endpoint - Handles feature phone users
app.post('/api/ussd', (req, res) => {
  try {
    const { sessionId, serviceCode, phoneNumber, text } = req.body;

    // Validate required parameters
    if (!sessionId || !phoneNumber) {
      res.status(400).json({ error: 'Missing required parameters: sessionId, phoneNumber' });
      return;
    }

    // Handle USSD request
    const result = handleUSSD(sessionId, phoneNumber, text || '', serviceCode || '');

    // Format response for USSD gateway
    const ussdResponse = result.endSession 
      ? `END ${result.response}`
      : `CON ${result.response}`;

    res.set('Content-Type', 'text/plain');
    res.send(ussdResponse);

  } catch (error) {
    console.error('USSD Error:', error);
    const response = `END An error occurred. Please try again later.`;
    res.set('Content-Type', 'text/plain');
    res.send(response);
  }
});

// Save user feedback about recommendations - DEPRECATED, use /api/feedback from feedback-routes.js
// This endpoint is kept for backward compatibility but delegates to the new service
app.post('/api/feedback/deprecated', async (req, res) => {
  const { predictionId, phoneNumber, helpful, comments = '' } = req.body;

  if (!predictionId || typeof helpful !== 'boolean') {
    return res.status(400).json({
      success: false,
      message: 'predictionId and helpful flag are required'
    });
  }

  const trimmedComments = comments ? comments.toString().trim().slice(0, 500) : null;
  const normalizedPhone = normalizePhoneNumber(phoneNumber);

  try {
    await dbAsync.run(
      `INSERT INTO feedback (prediction_id, phone_number, is_helpful, comments)
       VALUES (?, ?, ?, ?)`,
      [predictionId, normalizedPhone, helpful ? 1 : 0, trimmedComments]
    );

    res.json({
      success: true,
      message: 'Feedback recorded. Thank you!'
    });
  } catch (error) {
    console.error('Error saving feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to save feedback'
    });
  }
});

// Get prediction history
app.get('/api/predictions', async (req, res) => {
  try {
    const { phoneNumber, limit = 10 } = req.query;
    let query = `SELECT * FROM predictions`;
    const params = [];
    if (phoneNumber) {
      query += ` WHERE phone_number = ?`;
      params.push(phoneNumber);
    }
    query += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(parseInt(limit));

    const rows = await dbAsync.all ? await dbAsync.all(query, params) : await dbAsync.run(query, params); // all method may exist
    res.json({ success: true, predictions: rows });
  } catch (err) {
    console.error('Error fetching predictions:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch predictions' });
  }
});

// Get farmers endpoint
app.get('/api/farmers', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    const rows = await dbAsync.all(`SELECT * FROM farmers ORDER BY created_at DESC LIMIT ?`, [parseInt(limit)]);
    res.json({ success: true, farmers: rows });
  } catch (err) {
    console.error('Error fetching farmers:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch farmers' });
  }
});

// Get market data
app.get('/api/market', (req, res) => {
  const marketData = [
    { crop: 'Beans', bondo: 85, ugunja: 82, yala: 88, trend: 'up' },
    { crop: 'Maize', bondo: 65, ugunja: 68, yala: 62, trend: 'down' },
    { crop: 'Rice', bondo: 120, ugunja: 118, yala: 125, trend: 'up' },
    { crop: 'Sorghum', bondo: 95, ugunja: 92, yala: 98, trend: 'up' },
    { crop: 'Millet', bondo: 110, ugunja: 105, yala: 112, trend: 'down' }
  ];
  res.json({ 
    success: true,
    updatedAt: new Date().toISOString(),
    marketData 
  });
});

// Get market trends by market center
app.get('/api/market-trends', (req, res) => {
  const marketCenters = {
    'siaya-town': {
      name: 'Siaya Town',
      location: 'Siaya',
      lastUpdated: new Date().toISOString(),
      crops: [
        { crop: 'Maize', price: 62, trend: 'down', changePercent: -2.4, history: [65, 64, 63, 62] },
        { crop: 'Beans', price: 88, trend: 'up', changePercent: 3.5, history: [85, 86, 87, 88] },
        { crop: 'Rice', price: 125, trend: 'up', changePercent: 2.0, history: [122, 123, 124, 125] },
        { crop: 'Sorghum', price: 98, trend: 'stable', changePercent: 0.0, history: [98, 98, 98, 98] },
        { crop: 'Groundnuts', price: 112, trend: 'down', changePercent: -1.8, history: [114, 113, 112, 112] }
      ]
    },
    'bondo': {
      name: 'Bondo Market',
      location: 'Bondo',
      lastUpdated: new Date().toISOString(),
      crops: [
        { crop: 'Maize', price: 65, trend: 'stable', changePercent: 0.0, history: [65, 65, 65, 65] },
        { crop: 'Beans', price: 85, trend: 'up', changePercent: 2.4, history: [83, 84, 84, 85] },
        { crop: 'Rice', price: 120, trend: 'up', changePercent: 1.7, history: [118, 119, 119, 120] },
        { crop: 'Sorghum', price: 95, trend: 'up', changePercent: 1.1, history: [94, 94, 95, 95] },
        { crop: 'Tomatoes', price: 75, trend: 'down', changePercent: -3.2, history: [78, 77, 76, 75] }
      ]
    },
    'yala': {
      name: 'Yala Market',
      location: 'Yala',
      lastUpdated: new Date().toISOString(),
      crops: [
        { crop: 'Maize', price: 62, trend: 'down', changePercent: -1.6, history: [63, 63, 62, 62] },
        { crop: 'Beans', price: 88, trend: 'up', changePercent: 2.3, history: [86, 87, 87, 88] },
        { crop: 'Rice', price: 125, trend: 'up', changePercent: 2.0, history: [122, 123, 124, 125] },
        { crop: 'Cassava', price: 37, trend: 'down', changePercent: -2.6, history: [38, 38, 37, 37] },
        { crop: 'Sweet Potatoes', price: 42, trend: 'up', changePercent: 1.2, history: [41, 41, 42, 42] }
      ]
    },
    'ugunja': {
      name: 'Ugunja Market',
      location: 'Ugunja',
      lastUpdated: new Date().toISOString(),
      crops: [
        { crop: 'Maize', price: 68, trend: 'up', changePercent: 1.5, history: [67, 67, 68, 68] },
        { crop: 'Beans', price: 82, trend: 'down', changePercent: -1.2, history: [83, 83, 82, 82] },
        { crop: 'Rice', price: 118, trend: 'stable', changePercent: 0.0, history: [118, 118, 118, 118] },
        { crop: 'Sorghum', price: 92, trend: 'down', changePercent: -2.1, history: [94, 93, 92, 92] },
        { crop: 'Groundnuts', price: 108, trend: 'up', changePercent: 1.9, history: [106, 107, 107, 108] }
      ]
    },
    'gem': {
      name: 'Gem Market',
      location: 'Gem',
      lastUpdated: new Date().toISOString(),
      crops: [
        { crop: 'Maize', price: 66, trend: 'up', changePercent: 2.0, history: [64, 65, 65, 66] },
        { crop: 'Beans', price: 84, trend: 'up', changePercent: 2.4, history: [82, 83, 83, 84] },
        { crop: 'Rice', price: 119, trend: 'up', changePercent: 0.8, history: [118, 118, 119, 119] },
        { crop: 'Sweet Potatoes', price: 39, trend: 'up', changePercent: 2.6, history: [38, 38, 39, 39] },
        { crop: 'Kales', price: 49, trend: 'down', changePercent: -1.0, history: [50, 50, 49, 49] }
      ]
    },
    'alego': {
      name: 'Alego Market',
      location: 'Alego',
      lastUpdated: new Date().toISOString(),
      crops: [
        { crop: 'Maize', price: 63, trend: 'down', changePercent: -1.6, history: [64, 64, 63, 63] },
        { crop: 'Beans', price: 86, trend: 'up', changePercent: 1.2, history: [85, 85, 86, 86] },
        { crop: 'Rice', price: 122, trend: 'up', changePercent: 1.7, history: [120, 121, 121, 122] },
        { crop: 'Sorghum', price: 97, trend: 'up', changePercent: 2.1, history: [95, 96, 96, 97] },
        { crop: 'Cassava', price: 38, trend: 'up', changePercent: 2.7, history: [37, 37, 38, 38] }
      ]
    }
  };

  res.json({
    success: true,
    data: marketCenters,
    timestamp: new Date().toISOString()
  });
});

// Get market prediction for a specific crop
app.get('/api/market-prediction/:crop', (req, res) => {
  const crop = req.params.crop.toLowerCase();
  const predictions = {
    'maize': {
      crop: 'Maize',
      currentAvgPrice: 64.33,
      prediction: 'DOWN',
      confidence: 65,
      forecastPrice: 61,
      reason: 'Post-harvest season leading to increased supply',
      timeline: '2-3 weeks'
    },
    'beans': {
      crop: 'Beans',
      currentAvgPrice: 85.33,
      prediction: 'UP',
      confidence: 72,
      forecastPrice: 89,
      reason: 'Growing demand and seasonal scarcity',
      timeline: '1-2 weeks'
    },
    'rice': {
      crop: 'Rice',
      currentAvgPrice: 120.67,
      prediction: 'UP',
      confidence: 68,
      forecastPrice: 126,
      reason: 'Limited supply and increasing demand',
      timeline: '2-3 weeks'
    },
    'sorghum': {
      crop: 'Sorghum',
      currentAvgPrice: 95.33,
      prediction: 'STABLE',
      confidence: 58,
      forecastPrice: 95,
      reason: 'Steady demand with consistent supply',
      timeline: 'Ongoing'
    },
    'groundnuts': {
      crop: 'Groundnuts',
      currentAvgPrice: 109.33,
      prediction: 'DOWN',
      confidence: 62,
      forecastPrice: 107,
      reason: 'Increased production in current season',
      timeline: '1-2 weeks'
    }
  };

  const prediction = predictions[crop];
  if (prediction) {
    res.json({
      success: true,
      data: prediction,
      timestamp: new Date().toISOString()
    });
  } else {
    res.status(404).json({
      success: false,
      error: 'Crop prediction not found'
    });
  }
});

// High-level system stats for dashboards
app.get('/api/stats', async (req, res) => {
  try {
    const [
      predictionTotals,
      farmerTotals,
      feedbackTotals,
      topCrop,
      topSubCounty,
      lastPrediction
    ] = await Promise.all([
      dbAsync.get(`SELECT COUNT(*) as totalPredictions FROM predictions`),
      dbAsync.get(`SELECT COUNT(*) as totalFarmers FROM farmers`),
      dbAsync.get(`SELECT COUNT(*) as totalFeedback FROM feedback`),
      dbAsync.get(`SELECT predicted_crop as crop, COUNT(*) as count FROM predictions GROUP BY predicted_crop ORDER BY count DESC LIMIT 1`),
      dbAsync.get(`SELECT sub_county as subCounty, COUNT(*) as count FROM predictions GROUP BY sub_county ORDER BY count DESC LIMIT 1`),
      dbAsync.get(`SELECT created_at FROM predictions ORDER BY created_at DESC LIMIT 1`)
    ]);

    res.json({
      success: true,
      data: {
        totalPredictions: predictionTotals?.totalPredictions || 0,
        totalFarmers: farmerTotals?.totalFarmers || 0,
        totalFeedback: feedbackTotals?.totalFeedback || 0,
        topCrop: topCrop?.crop || null,
        topSubCounty: topSubCounty?.subCounty || null,
        lastPredictionAt: lastPrediction?.created_at || null
      }
    });
  } catch (error) {
    console.error('Stats endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stats'
    });
  }
});

// ==================== NEW RECOMMENDATION ENDPOINTS ====================

// Get crop recommendations
app.post('/api/recommend', (req, res) => {
  try {
    const { subCounty, soilType, season, budget = 5000, farmSize = 1, waterSource = 'Rainfall' } = req.body;

    // Validate inputs
    if (!subCounty || !soilType || !season) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: subCounty, soilType, season'
      });
    }

    const result = recommendationEngine.getRecommendations({
      subCounty,
      soilType,
      season,
      budget,
      farmSize,
      waterSource
    });

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating recommendations',
      error: error.message
    });
  }
});

// Analyze complete farm conditions
app.post('/api/analyze-farm', (req, res) => {
  try {
    const { subCounty, soilType, season, budget = 5000, farmSize = 1, waterSource = 'Rainfall' } = req.body;

    if (!subCounty || !soilType || !season) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: subCounty, soilType, season'
      });
    }

    const analysis = recommendationEngine.analyzeFarm({
      subCounty,
      soilType,
      season,
      budget,
      farmSize,
      waterSource
    });

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Farm analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Error analyzing farm',
      error: error.message
    });
  }
});

// Get soil assessment
app.post('/api/soil-assessment', (req, res) => {
  try {
    const { subCounty, soilType } = req.body;

    if (!subCounty || !soilType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: subCounty, soilType'
      });
    }

    const assessment = recommendationEngine.getSoilAssessment(subCounty, soilType);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Soil data not found for this location and type'
      });
    }

    res.json({
      success: true,
      data: assessment
    });
  } catch (error) {
    console.error('Soil assessment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error assessing soil',
      error: error.message
    });
  }
});

// Get market prices
app.get('/api/market-prices', (req, res) => {
  try {
    res.json({
      success: true,
      data: {
        prices: demoData.marketPrices,
        timestamp: new Date().toISOString(),
        currency: 'KSh',
        unit: 'per kg'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching market prices',
      error: error.message
    });
  }
});

// Get weather data
app.get('/api/weather-data', (req, res) => {
  try {
    const { subCounty, season } = req.query;

    if (!subCounty) {
      // Return all weather data
      return res.json({
        success: true,
        data: demoData.weatherData,
        timestamp: new Date().toISOString()
      });
    }

    const weatherData = demoData.weatherData[subCounty.toLowerCase()]?.[season?.toLowerCase() || 'long_rains'];

    if (!weatherData) {
      return res.status(404).json({
        success: false,
        message: 'Weather data not found for this location or season'
      });
    }

    res.json({
      success: true,
      data: {
        location: subCounty,
        season: season || 'long_rains',
        ...weatherData,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching weather data',
      error: error.message
    });
  }
});

// Register farmer
app.post('/api/register-farmer', async (req, res) => {
  try {
    const { phoneNumber, name, subCounty, soilType, farmSize, waterSource, budget } = req.body;

    if (!phoneNumber || !subCounty || !soilType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: phoneNumber, subCounty, soilType'
      });
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    await dbAsync.run(
      `INSERT INTO farmers (phone_number, sub_county, soil_type, preferred_language)
       VALUES (?, ?, ?, ?)
       ON CONFLICT(phone_number) DO UPDATE SET 
         sub_county = excluded.sub_county,
         soil_type = excluded.soil_type`,
      [normalizedPhone, subCounty, soilType, 'english']
    );

    res.json({
      success: true,
      message: 'Farmer registered successfully',
      data: {
        phoneNumber: normalizedPhone,
        subCounty,
        soilType,
        farmSize,
        waterSource,
        budget
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Error registering farmer',
      error: error.message
    });
  }
});

// Get demo sample farmers
app.get('/api/sample-farmers', (req, res) => {
  res.json({
    success: true,
    data: demoData.sampleFarmers,
    message: 'Sample farmer data for MVP testing'
  });
});

// ==================== FARM INPUTS RECOMMENDATION ENDPOINTS ====================

// Get farm input recommendations for a specific crop
app.get('/api/farm-inputs/:cropName', (req, res) => {
  try {
    const { cropName } = req.params;
    const { farmSize = 1 } = req.query;

    const recommendations = recommendationEngine.getFarmInputRecommendations(cropName, parseFloat(farmSize));

    if (recommendations.error) {
      return res.status(404).json({
        success: false,
        message: recommendations.error
      });
    }

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Farm inputs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching farm inputs',
      error: error.message
    });
  }
});

// Get budget-adjusted input recommendations
app.post('/api/farm-inputs/budget-adjusted', (req, res) => {
  try {
    const { cropName, budget, farmSize = 1 } = req.body;

    if (!cropName || budget === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: cropName, budget'
      });
    }

    const recommendations = recommendationEngine.getBudgetAdjustedInputs(cropName, budget, parseFloat(farmSize));

    if (recommendations.error) {
      return res.status(404).json({
        success: false,
        message: recommendations.error
      });
    }

    res.json({
      success: true,
      data: recommendations
    });
  } catch (error) {
    console.error('Budget adjusted inputs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error calculating budget-adjusted inputs',
      error: error.message
    });
  }
});

// Get cost-saving tips
app.get('/api/cost-saving-tips', (req, res) => {
  try {
    const { budget = 5000, farmSize = 1 } = req.query;

    const tips = recommendationEngine.getCostSavingTips(parseFloat(budget), parseFloat(farmSize));

    res.json({
      success: true,
      data: {
        budget: parseFloat(budget),
        farmSize: parseFloat(farmSize),
        tips: tips
      }
    });
  } catch (error) {
    console.error('Cost saving tips error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cost-saving tips',
      error: error.message
    });
  }
});

// Get essential tools checklist
app.get('/api/tools-checklist', (req, res) => {
  try {
    const checklist = recommendationEngine.getEssentialToolsChecklist();

    res.json({
      success: true,
      data: checklist
    });
  } catch (error) {
    console.error('Tools checklist error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching tools checklist',
      error: error.message
    });
  }
});

// Get soil improvement plan
app.post('/api/soil-improvement-plan', (req, res) => {
  try {
    const { subCounty, soilType, cropName } = req.body;

    if (!subCounty || !soilType || !cropName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: subCounty, soilType, cropName'
      });
    }

    const plan = recommendationEngine.getSoilImprovementPlan(subCounty, soilType, cropName);

    res.json({
      success: true,
      data: plan
    });
  } catch (error) {
    console.error('Soil improvement plan error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating soil improvement plan',
      error: error.message
    });
  }
});

// Get comprehensive farm inputs analysis
app.post('/api/farm-inputs/comprehensive', (req, res) => {
  try {
    const { cropName, subCounty, soilType, budget, farmSize = 1 } = req.body;

    if (!cropName || !budget) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: cropName, budget'
      });
    }

    // Get farm inputs
    const inputs = recommendationEngine.getBudgetAdjustedInputs(cropName, budget, farmSize);
    
    // Get soil improvement plan if soil info provided
    const soilPlan = (subCounty && soilType) ? 
      recommendationEngine.getSoilImprovementPlan(subCounty, soilType, cropName) : 
      null;

    // Get cost-saving tips
    const costSavingTips = recommendationEngine.getCostSavingTips(budget, farmSize);

    // Get tools checklist
    const toolsChecklist = recommendationEngine.getEssentialToolsChecklist();

    res.json({
      success: true,
      data: {
        crop: cropName,
        farmSize,
        budget,
        inputs,
        soilPlan,
        costSavingTips,
        toolsChecklist,
        summary: {
          totalInputCost: inputs.budgetSufficiency.required,
          budgetAvailable: budget,
          budgetStatus: inputs.budgetSufficiency.status,
          essentialInputs: inputs.recommendations.essential.length,
          importantInputs: inputs.recommendations.important.length,
          optionalInputs: inputs.recommendations.optional.length
        }
      }
    });
  } catch (error) {
    console.error('Comprehensive farm inputs error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating comprehensive farm inputs analysis',
      error: error.message
    });
  }
});

// Register admin routes
app.use('/api', (req, res, next) => {
  // Make dbAsync available to routes
  req.dbAsync = dbAsync;
  next();
}, adminRoutes);

// Register farmer routes
app.use('/api', (req, res, next) => {
  // Make dbAsync available to routes
  req.dbAsync = dbAsync;
  next();
}, farmerRoutes);

// Register farmer profile routes
app.use('/api', (req, res, next) => {
  // Make dbAsync available to routes
  req.dbAsync = dbAsync;
  next();
}, farmerProfileRoutes);

// Register community routes (with dbAsync middleware)
app.use('/api', (req, res, next) => {
  // Make dbAsync available to community routes
  req.dbAsync = dbAsync;
  next();
}, communityRoutes);

// Register feedback routes
app.use('/api', feedbackRoutes);

// Register market routes
app.use('/api', marketRoutes);

// Register market prices API (frontend-compatible)
app.use('/', marketPricesApi);

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    success: true,
    message: 'Fahamu Shamba API is working!',
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    endpoints: {
      recommendations: [
        'POST /api/recommend',
        'POST /api/analyze-farm'
      ],
      data: [
        'POST /api/soil-assessment',
        'GET /api/market-prices',
        'GET /api/weather-data'
      ],
      farmers: [
        'POST /api/register-farmer',
        'GET /api/farmers',
        'GET /api/sample-farmers',
        'GET /api/predictions'
      ],
      admin: [
        'POST /api/admin/login',
        'POST /api/admin/verify-mfa',
        'POST /api/admin/logout',
        'GET /api/admin/dashboard',
        'GET /api/admin/audit-logs',
        'GET /api/admin/security-logs'
      ],
      testing: [
        'GET /api-tester (API Testing Console)',
        'GET /dashboard (Web Dashboard)',
        'GET /admin (Admin Dashboard)',
        'GET /api/health (Health Check)',
        'GET /api/stats (Statistics)'
      ]
    }
  });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    if (USE_POSTGRES) {
      // PostgreSQL health check
      const result = await pool.query('SELECT 1 as test');
      res.json({
        success: true,
        status: 'All systems operational (PostgreSQL)',
        database: 'PostgreSQL',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    } else {
      // SQLite health check
      const result = db.prepare('SELECT 1 as test').get();
      res.json({
        success: true,
        status: 'All systems operational (SQLite)',
        database: 'SQLite',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
      });
    }
  } catch (err) {
    return res.status(503).json({
      success: false,
      status: 'Database connection failed',
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// ==================== HELPER FUNCTIONS ====================
function getLanguage(choice) {
  const languages = { '1': 'english', '2': 'swahili', '3': 'luo' };
  return languages[choice] || 'english';
}

function getTranslation(key, language) {
  const translations = {
    english: {
      select_option: "Select option:",
      get_advice: "Get crop advice",
      about: "About Fahamu Shamba",
      select_subcounty: "Select your sub-county:",
      select_soil: "Select soil type:",
      select_season: "Select season:",
      sandy: "Sandy soil",
      clay: "Clay soil", 
      loam: "Loam soil",
      long_rains: "Long rains",
      short_rains: "Short rains",
      dry: "Dry season",
      recommendation: "We recommend",
      no_recommendation: "Sorry, no recommendation available for your inputs"
    },
    swahili: {
      select_option: "Chagua chaguo:",
      get_advice: "Pata ushauri wa mazao",
      about: "Kuhusu Fahamu Shamba", 
      select_subcounty: "Chagua sub-kaunti yako:",
      select_soil: "Chagua aina ya udongo:",
      select_season: "Chagua msimu:",
      sandy: "Udongo wa mchanga",
      clay: "Udongo wa mfinyanzi",
      loam: "Udongo wa tanuri",
      long_rains: "Mvua nyingi",
      short_rains: "Mvua fupi", 
      dry: "Msimu wa kiangazi",
      recommendation: "Tunapendekeza",
      no_recommendation: "Samahani, hakuna ushauri unaopatikana kwa maelezo yako"
    },
    luo: {
      select_option: "Yier option:",
      get_advice: "Nong'o kit ma idwaro tiyo",
      about: "E kind Fahamu Shamba",
      select_subcounty: "Yier sub-county mada:",
      select_soil: "Yier tongo:",
      select_season: "Yier piny:",
      sandy: "Tongo anyong",
      clay: "Tongo lal",
      loam: "Tongo ber",
      long_rains: "Piny ruodho",
      short_rains: "Piny ruodho machon",
      dry: "Piny kwo",
      recommendation: "Waneno ni",
      no_recommendation: "Mos, onge kit ma wanyalo nongo kodu mose"
    }
  };
  
  return translations[language]?.[key] || key;
}

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down gracefully...');
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed');
    }
    process.exit(0);
  });
});

// Start server
if (!IS_VERCEL) {
app.listen(PORT, () => {
  console.log(`\n🌱 Fahamu Shamba MVP Server Running\n`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  console.log(`📍 Server: http://localhost:${PORT}\n`);
  
  console.log(`📱 USER INTERFACES:`);
  console.log(`   🏠 Farmer Dashboard: http://localhost:${PORT}/farmer-dashboard`);
  console.log(`   📱 USSD Simulator:   http://localhost:${PORT}/ussd-simulator`);
  console.log(`   🧪 API Tester:       http://localhost:${PORT}/api-tester\n`);
  
  console.log(`🔌 API ENDPOINTS:`);
  console.log(`   POST /api/recommend           - Get crop recommendations`);
  console.log(`   POST /api/analyze-farm        - Full farm analysis`);
  console.log(`   POST /api/soil-assessment     - Soil quality check`);
  console.log(`   GET  /api/market-prices       - Current market prices`);
  console.log(`   GET  /api/weather-data        - Weather conditions`);
  console.log(`   POST /api/register-farmer     - Register new farmer`);
  console.log(`   GET  /api/sample-farmers      - Demo farmer data\n`);

  console.log(`🔐 ADMIN ENDPOINTS:`);
  console.log(`   POST /api/admin/login         - Admin login`);
  console.log(`   POST /api/admin/verify-mfa    - MFA verification`);
  console.log(`   GET  /api/admin/dashboard     - Admin dashboard`);
  console.log(`   GET  /api/admin/audit-logs    - View audit logs`);
  console.log(`   GET  /api/admin/security-logs - View security logs\n`);
  
  console.log(`📊 SYSTEM INFO:`);
  console.log(`   GET  /api/test                - API status`);
  console.log(`   GET  /api/health              - Health check`);
  console.log(`   GET  /api/stats               - System statistics`);
  console.log(`   GET  /api/farmers             - Registered farmers`);
  console.log(`   GET  /api/predictions         - Prediction history\n`);
  
  console.log(`⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🗄️  Database: SQLite (fahamu_shamba.db)`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  
  console.log(`✨ MVP is ready!`);
  console.log(`   🚀 User Dashboard: http://localhost:${PORT}/farmer-dashboard`);
  console.log(`   🔐 Admin Dashboard: http://localhost:${PORT}/admin\n`);
});
}

export default app;
