/**
 * Market Integration Service for Fahamu Shamba
 * Provides real-time market prices, price alerts, buyer linkages, and agro-dealer directory
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db;

function getDb() {
  if (!db) {
    db = new Database(path.join(__dirname, 'fahamu_shamba.db'));
  }
  return db;
}

// Initialize market integration tables
export function initializeMarketDatabase() {
  const database = getDb();
  
  // Market prices history
  database.exec(`
    CREATE TABLE IF NOT EXISTS market_prices (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crop TEXT NOT NULL,
      market TEXT NOT NULL,
      price REAL NOT NULL,
      unit TEXT DEFAULT 'kg',
      currency TEXT DEFAULT 'KES',
      price_per_kg REAL,
      trend TEXT DEFAULT 'stable',
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Price alerts
  database.exec(`
    CREATE TABLE IF NOT EXISTS market_price_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT NOT NULL,
      crop TEXT NOT NULL,
      market TEXT,
      threshold_type TEXT DEFAULT 'above',
      threshold_price REAL,
      current_price REAL,
      is_active BOOLEAN DEFAULT 1,
      last_checked DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Buyer listings
  database.exec(`
    CREATE TABLE IF NOT EXISTS buyers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      buyer_name TEXT NOT NULL,
      buyer_type TEXT DEFAULT 'trader',
      contact_person TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      location TEXT,
      county TEXT,
      crops_interested TEXT,
      quantity_needed TEXT,
      price_offering TEXT,
      is_verified BOOLEAN DEFAULT 0,
      rating REAL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Agro-dealer directory
  database.exec(`
    CREATE TABLE IF NOT EXISTS agro_dealers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_name TEXT NOT NULL,
      owner_name TEXT,
      phone TEXT NOT NULL,
      email TEXT,
      location TEXT,
      county TEXT,
      sub_county TEXT,
      products TEXT,
      brands TEXT,
      has_delivery BOOLEAN DEFAULT 0,
      delivery_area TEXT,
      rating REAL DEFAULT 0,
      is_verified BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Price predictions
  database.exec(`
    CREATE TABLE IF NOT EXISTS price_predictions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crop TEXT NOT NULL,
      market TEXT NOT NULL,
      current_price REAL,
      predicted_price REAL,
      prediction_date DATE,
      target_date DATE,
      confidence REAL,
      trend TEXT,
      factors TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Market centers
  database.exec(`
    CREATE TABLE IF NOT EXISTS market_centers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      location TEXT,
      county TEXT,
      sub_county TEXT,
      operating_days TEXT,
      main_crops TEXT,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Indexes
  database.exec(`CREATE INDEX IF NOT EXISTS idx_prices_crop ON market_prices(crop)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_prices_market ON market_prices(market)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_alerts_phone ON market_price_alerts(phone_number)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_buyers_county ON buyers(county)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_dealers_county ON agro_dealers(county)`);
  
  console.log('✅ Market database tables initialized');
}

// ==================== MARKET PRICES ====================

// Get current prices
export function getCurrentPrices(options = {}) {
  const { crop, market } = options;
  
  let query = `
    SELECT mp.*, mc.location, mc.county
    FROM market_prices mp
    LEFT JOIN market_centers mc ON mp.market = mc.name
    WHERE mp.recorded_at = (
      SELECT MAX(recorded_at) FROM market_prices mp2 WHERE mp2.crop = mp.crop AND mp2.market = mp.market
    )
  `;
  const params = [];
  
  if (crop) {
    query += ' AND mp.crop = ?';
    params.push(crop);
  }
  if (market) {
    query += ' AND mp.market = ?';
    params.push(market);
  }
  
  query += ' ORDER BY mp.crop, mp.market';
  
  const prices = getDb().prepare(query).all(...params);
  
  return {
    success: true,
    prices,
    timestamp: new Date().toISOString()
  };
}

// Get price history
export function getPriceHistory(crop, market, days = 30) {
  const history = getDb().prepare(`
    SELECT * FROM market_prices
    WHERE crop = ? AND market = ? AND recorded_at >= datetime('now', '-' || ? || ' days')
    ORDER BY recorded_at ASC
  `).all(crop, market, days);
  
  return {
    success: true,
    history,
    crop,
    market,
    days
  };
}

// Get prices by market
export function getPricesByMarket(market) {
  const prices = getDb().prepare(`
    SELECT * FROM market_prices
    WHERE market = ?
    ORDER BY crop, recorded_at DESC
  `).all(market);
  
  return {
    success: true,
    prices,
    market
  };
}

// Get all markets
export function getMarkets() {
  const markets = getDb().prepare(`
    SELECT * FROM market_centers WHERE is_active = 1
    ORDER BY name
  `).all();
  
  return { success: true, markets };
}

// Get price comparison across markets
export function getPriceComparison(crop) {
  const comparison = getDb().prepare(`
    SELECT mp.*, mc.location, mc.county
    FROM market_prices mp
    LEFT JOIN market_centers mc ON mp.market = mc.name
    WHERE mp.crop = ? AND mp.recorded_at >= datetime('now', '-7 days')
    ORDER BY mp.price ASC
  `).all(crop);
  
  // Calculate stats
  const prices = comparison.map(p => p.price);
  const stats = {
    lowest: Math.min(...prices),
    highest: Math.max(...prices),
    average: prices.reduce((a, b) => a + b, 0) / prices.length,
    markets: comparison.length
  };
  
  return {
    success: true,
    crop,
    prices: comparison,
    stats,
    recommendation: stats.lowest < stats.average * 0.8 
      ? `Best price at ${comparison[0]?.market} (KSh ${stats.lowest})`
      : 'Prices are stable across markets'
  };
}

// ==================== PRICE PREDICTIONS ====================

// Get price predictions
export function getPricePredictions(crop, market) {
  let query = `
    SELECT * FROM price_predictions
    WHERE 1=1
  `;
  const params = [];
  
  if (crop) {
    query += ' AND crop = ?';
    params.push(crop);
  }
  if (market) {
    query += ' AND market = ?';
    params.push(market);
  }
  
  query += ' ORDER BY target_date ASC LIMIT 20';
  
  const predictions = getDb().prepare(query).all(...params);
  
  return {
    success: true,
    predictions
  };
}

// Generate simple price prediction (based on trends)
export function generatePricePrediction(crop, market) {
  // Get recent prices
  const recentPrices = getDb().prepare(`
    SELECT price, recorded_at FROM market_prices
    WHERE crop = ? AND market = ?
    ORDER BY recorded_at DESC LIMIT 7
  `).all(crop, market);
  
  if (recentPrices.length < 2) {
    return { success: false, error: 'Not enough data for prediction' };
  }
  
  // Simple linear trend
  const prices = recentPrices.map(p => p.price).reverse();
  const n = prices.length;
  const sumX = (n * (n - 1)) / 2;
  const sumY = prices.reduce((a, b) => a + b, 0);
  const sumXY = prices.reduce((sum, y, x) => sum + x * y, 0);
  const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Predict next 7 days
  const predictions = [];
  for (let i = 1; i <= 7; i++) {
    const predictedPrice = intercept + slope * (n - 1 + i);
    predictions.push({
      date: new Date(Date.now() + i * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      price: Math.max(0, Math.round(predictedPrice * 100) / 100),
      trend: slope > 0.5 ? 'up' : slope < -0.5 ? 'down' : 'stable'
    });
  }
  
  const currentPrice = recentPrices[0].price;
  const predictedEnd = predictions[6].price;
  const confidence = Math.min(95, 50 + (recentPrices.length * 5));
  
  return {
    success: true,
    crop,
    market,
    currentPrice,
    predictions,
    summary: {
      trend: predictedEnd > currentPrice * 1.1 ? 'UP' : predictedEnd < currentPrice * 0.9 ? 'DOWN' : 'STABLE',
      confidence,
      expectedChange: Math.round((predictedEnd - currentPrice) / currentPrice * 100)
    }
  };
}

// ==================== PRICE ALERTS ====================

// Set price alert
export function setPriceAlert(data) {
  const { phoneNumber, crop, market, thresholdType, thresholdPrice } = data;
  
  if (!phoneNumber || !crop) {
    return { success: false, error: 'Phone number and crop are required' };
  }
  
  // Get current price
  const currentPriceData = getDb().prepare(`
    SELECT price FROM market_prices
    WHERE crop = ? AND market = ?
    ORDER BY recorded_at DESC LIMIT 1
  `).get(crop, market || 'Siaya Town Market');
  
  const currentPrice = currentPriceData?.price || 0;
  
  const stmt = getDb().prepare(`
    INSERT INTO market_price_alerts (phone_number, crop, market, threshold_type, threshold_price, current_price, last_checked)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  
  const result = stmt.run(phoneNumber, crop, market, thresholdType || 'above', thresholdPrice, currentPrice);
  
  return {
    success: true,
    alertId: result.lastInsertRowid,
    message: 'Price alert set',
    currentPrice
  };
}

// Get user price alerts
export function getUserPriceAlerts(phoneNumber) {
  const alerts = getDb().prepare(`
    SELECT * FROM market_price_alerts
    WHERE phone_number = ?
    ORDER BY created_at DESC
  `).all(phoneNumber);
  
  return { success: true, alerts };
}

// Check alerts against current prices
export function checkPriceAlerts() {
  const alerts = getDb().prepare(`
    SELECT a.*, mp.price as current_price
    FROM market_price_alerts a
    LEFT JOIN market_prices mp ON a.crop = mp.crop AND a.market = mp.market
    WHERE a.is_active = 1
  `).all();
  
  const triggered = [];
  
  alerts.forEach(alert => {
    const currentPrice = alert.current_price || 0;
    let shouldTrigger = false;
    
    if (alert.threshold_type === 'above' && currentPrice >= (alert.threshold_price || 0)) {
      shouldTrigger = true;
    } else if (alert.threshold_type === 'below' && currentPrice <= (alert.threshold_price || 999999)) {
      shouldTrigger = true;
    }
    
    if (shouldTrigger) {
      triggered.push({
        alertId: alert.id,
        phoneNumber: alert.phone_number,
        crop: alert.crop,
        market: alert.market,
        thresholdPrice: alert.threshold_price,
        currentPrice,
        message: `${alert.crop} price at ${alert.market}: KSh ${currentPrice} (threshold: KSh ${alert.threshold_price})`
      });
    }
    
    // Update last checked
    getDb().prepare('UPDATE market_price_alerts SET last_checked = CURRENT_TIMESTAMP, current_price = ? WHERE id = ?')
      .run(currentPrice, alert.id);
  });
  
  return { success: true, triggered };
}

// Delete price alert
export function deletePriceAlert(alertId) {
  getDb().prepare('DELETE FROM market_price_alerts WHERE id = ?').run(alertId);
  return { success: true, message: 'Alert deleted' };
}

// ==================== BUYERS ====================

// Register buyer
export function registerBuyer(data) {
  const { buyerName, buyerType, contactPerson, phone, email, location, county, cropsInterested, quantityNeeded, priceOffering } = data;
  
  if (!buyerName || !phone) {
    return { success: false, error: 'Buyer name and phone are required' };
  }
  
  const stmt = getDb().prepare(`
    INSERT INTO buyers (buyer_name, buyer_type, contact_person, phone, email, location, county, crops_interested, quantity_needed, price_offering)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(buyerName, buyerType, contactPerson, phone, email, location, county, cropsInterested, quantityNeeded, priceOffering);
  
  return {
    success: true,
    buyerId: result.lastInsertRowid,
    message: 'Buyer registered successfully'
  };
}

// Get buyers
export function getBuyers(options = {}) {
  const { county, crop } = options;
  
  let query = 'SELECT * FROM buyers WHERE 1=1';
  const params = [];
  
  if (county) {
    query += ' AND county = ?';
    params.push(county);
  }
  if (crop) {
    query += ' AND crops_interested LIKE ?';
    params.push(`%${crop}%`);
  }
  
  query += ' ORDER BY is_verified DESC, rating DESC';
  
  const buyers = getDb().prepare(query).all(...params);
  
  return { success: true, buyers };
}

// Get buyer details
export function getBuyerDetails(buyerId) {
  const buyer = getDb().prepare('SELECT * FROM buyers WHERE id = ?').get(buyerId);
  
  if (!buyer) {
    return { success: false, error: 'Buyer not found' };
  }
  
  return { success: true, buyer };
}

// ==================== AGRO-DEALERS ====================

// Register agro-dealer
export function registerAgroDealer(data) {
  const { shopName, ownerName, phone, email, location, county, subCounty, products, brands, hasDelivery, deliveryArea } = data;
  
  if (!shopName || !phone) {
    return { success: false, error: 'Shop name and phone are required' };
  }
  
  const stmt = getDb().prepare(`
    INSERT INTO agro_dealers (shop_name, owner_name, phone, email, location, county, sub_county, products, brands, has_delivery, delivery_area)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(shopName, ownerName, phone, email, location, county, subCounty, products, brands, hasDelivery ? 1 : 0, deliveryArea);
  
  return {
    success: true,
    dealerId: result.lastInsertRowid,
    message: 'Agro-dealer registered successfully'
  };
}

// Get agro-dealers
export function getAgroDealers(options = {}) {
  const { county, subCounty, product } = options;
  
  let query = 'SELECT * FROM agro_dealers WHERE 1=1';
  const params = [];
  
  if (county) {
    query += ' AND county = ?';
    params.push(county);
  }
  if (subCounty) {
    query += ' AND sub_county = ?';
    params.push(subCounty);
  }
  if (product) {
    query += ' AND products LIKE ?';
    params.push(`%${product}%`);
  }
  
  query += ' ORDER BY is_verified DESC, rating DESC';
  
  const dealers = getDb().prepare(query).all(...params);
  
  return { success: true, dealers };
}

// Get agro-dealer details
export function getAgroDealerDetails(dealerId) {
  const dealer = getDb().prepare('SELECT * FROM agro_dealers WHERE id = ?').get(dealerId);
  
  if (!dealer) {
    return { success: false, error: 'Dealer not found' };
  }
  
  return { success: true, dealer };
}

// ==================== MARKET STATS ====================

export function getMarketStats() {
  const prices = getDb().prepare('SELECT COUNT(DISTINCT crop) as crops, COUNT(*) as records FROM market_prices').get();
  const alerts = getDb().prepare('SELECT COUNT(*) as active FROM market_price_alerts WHERE is_active = 1').get();
  const buyers = getDb().prepare('SELECT COUNT(*) as total, SUM(is_verified) as verified FROM buyers').get();
  const dealers = getDb().prepare('SELECT COUNT(*) as total, SUM(is_verified) as verified FROM agro_dealers').get();
  
  // Price trends
  const trends = getDb().prepare(`
    SELECT crop, AVG(price) as avg_price, 
      (SELECT price FROM market_prices p2 WHERE p2.crop = p1.crop ORDER BY recorded_at DESC LIMIT 1) as current_price
    FROM market_prices p1
    GROUP BY crop
  `).all();
  
  return {
    success: true,
    stats: {
      trackedCrops: prices.crops,
      priceRecords: prices.records,
      activeAlerts: alerts.active,
      buyers: { total: buyers.total, verified: buyers.verified },
      agroDealers: { total: dealers.total, verified: dealers.verified }
    },
    priceTrends: trends
  };
}

// ==================== MANUAL PRICE UPDATE ====================

// Update price manually (admin)
export function updatePrice(crop, market, price, unit = 'kg') {
  const stmt = getDb().prepare(`
    INSERT INTO market_prices (crop, market, price, unit, trend)
    VALUES (?, ?, ?, ?, (
      SELECT CASE 
        WHEN ? > (SELECT price FROM market_prices WHERE crop = ? AND market = ? ORDER BY recorded_at DESC LIMIT 1) THEN 'up'
        WHEN ? < (SELECT price FROM market_prices WHERE crop = ? AND market = ? ORDER BY recorded_at DESC LIMIT 1) THEN 'down'
        ELSE 'stable'
      END
    ))
  `);
  
  stmt.run(crop, market, price, unit, price, crop, market, price, crop, market);
  
  return { success: true, message: 'Price updated' };
}

export default {
  initializeMarketDatabase,
  getCurrentPrices,
  getPriceHistory,
  getPricesByMarket,
  getMarkets,
  getPriceComparison,
  getPricePredictions,
  generatePricePrediction,
  setPriceAlert,
  getUserPriceAlerts,
  checkPriceAlerts,
  deletePriceAlert,
  registerBuyer,
  getBuyers,
  getBuyerDetails,
  registerAgroDealer,
  getAgroDealers,
  getAgroDealerDetails,
  getMarketStats,
  updatePrice
};
