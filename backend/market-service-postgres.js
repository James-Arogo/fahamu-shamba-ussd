/**
 * Market Integration Service for Fahamu Shamba - PostgreSQL Version
 * Provides real-time market prices, price alerts, buyer linkages, and agro-dealer directory
 * Uses PostgreSQL connection pool instead of SQLite
 */

import pool from './database-postgres.js';

// Initialize market integration tables for PostgreSQL
export async function initializeMarketDatabasePostgres() {
  try {
    // Market prices history
    await pool.query(`
      CREATE TABLE IF NOT EXISTS market_prices (
        id SERIAL PRIMARY KEY,
        crop TEXT NOT NULL,
        market TEXT NOT NULL,
        price REAL NOT NULL,
        unit TEXT DEFAULT 'kg',
        currency TEXT DEFAULT 'KES',
        price_per_kg REAL,
        trend TEXT DEFAULT 'stable',
        recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Price alerts
    await pool.query(`
      CREATE TABLE IF NOT EXISTS market_price_alerts (
        id SERIAL PRIMARY KEY,
        phone_number TEXT NOT NULL,
        crop TEXT NOT NULL,
        market TEXT,
        threshold_type TEXT DEFAULT 'above',
        threshold_price REAL,
        current_price REAL,
        is_active BOOLEAN DEFAULT true,
        last_checked TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Buyer listings
    await pool.query(`
      CREATE TABLE IF NOT EXISTS buyers (
        id SERIAL PRIMARY KEY,
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
        is_verified BOOLEAN DEFAULT false,
        rating REAL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Agro-dealer directory
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agro_dealers (
        id SERIAL PRIMARY KEY,
        shop_name TEXT NOT NULL,
        owner_name TEXT,
        phone TEXT NOT NULL,
        email TEXT,
        location TEXT,
        county TEXT,
        sub_county TEXT,
        products TEXT,
        brands TEXT,
        has_delivery BOOLEAN DEFAULT false,
        delivery_area TEXT,
        rating REAL DEFAULT 0,
        is_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Price predictions
    await pool.query(`
      CREATE TABLE IF NOT EXISTS price_predictions (
        id SERIAL PRIMARY KEY,
        crop TEXT NOT NULL,
        market TEXT NOT NULL,
        current_price REAL,
        predicted_price REAL,
        prediction_date DATE,
        target_date DATE,
        confidence REAL,
        trend TEXT,
        factors TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Market centers
    await pool.query(`
      CREATE TABLE IF NOT EXISTS market_centers (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        location TEXT,
        county TEXT,
        sub_county TEXT,
        operating_days TEXT,
        main_crops TEXT,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Indexes
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_prices_crop ON market_prices(crop)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_prices_market ON market_prices(market)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_alerts_phone ON market_price_alerts(phone_number)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_buyers_county ON buyers(county)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_dealers_county ON agro_dealers(county)`);

    console.log('✅ PostgreSQL Market database tables initialized');
  } catch (error) {
    console.error('Error initializing market database:', error);
  }
}

// ==================== MARKET PRICES ====================

// Get current prices - simplified query for PostgreSQL compatibility
export async function getCurrentPricesPostgres(options = {}) {
  const { crop, market } = options;

  try {
    let query = `
      SELECT mp.*, mc.location, mc.county
      FROM market_prices mp
      LEFT JOIN market_centers mc ON mp.market = mc.name
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 0;

    if (crop) {
      query += ` AND mp.crop = $${++paramIndex}`;
      params.push(crop);
    }
    if (market) {
      query += ` AND mp.market = $${++paramIndex}`;
      params.push(market);
    }

    query += ' ORDER BY mp.crop, mp.market';

    console.log('🔍 Executing query:', query.substring(0, 100));
    const result = await pool.query(query, params);
    console.log('✅ Query returned', result.rows.length, 'rows');

    return {
      success: true,
      prices: result.rows,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('❌ PostgreSQL query error:', error.message);
    throw error;
  }
}

// Get price history
export async function getPriceHistoryPostgres(crop, market, days = 30) {
  const query = `
    SELECT *
    FROM market_prices
    WHERE crop = $1 AND market = $2 AND recorded_at > NOW() - INTERVAL '${days} days'
    ORDER BY recorded_at DESC
  `;

  const result = await pool.query(query, [crop, market]);

  return {
    success: true,
    history: result.rows
  };
}

// Get prices by market
export async function getPricesByMarketPostgres(market) {
  const query = `
    SELECT *
    FROM market_prices
    WHERE market = $1 AND recorded_at = (
      SELECT MAX(recorded_at) FROM market_prices WHERE market = $1
    )
    ORDER BY crop
  `;

  const result = await pool.query(query, [market]);

  return {
    success: true,
    market: market,
    prices: result.rows
  };
}

// Get all markets
export async function getMarketsPostgres() {
  const result = await pool.query('SELECT * FROM market_centers WHERE is_active = true ORDER BY name');

  return {
    success: true,
    markets: result.rows
  };
}

// Get price comparison
export async function getPriceComparisonPostgres(crop) {
  const query = `
    SELECT market, price, unit, recorded_at
    FROM market_prices
    WHERE crop = $1 AND recorded_at = (
      SELECT MAX(recorded_at) FROM market_prices WHERE crop = $1
    )
    ORDER BY price DESC
  `;

  const result = await pool.query(query, [crop]);

  return {
    success: true,
    crop: crop,
    prices: result.rows
  };
}

// Get price predictions
export async function getPricePredictionsPostgres(crop, market) {
  let query = 'SELECT * FROM price_predictions WHERE crop = $1';
  const params = [crop];

  if (market) {
    query += ' AND market = $2';
    params.push(market);
  }

  query += ' ORDER BY prediction_date DESC LIMIT 10';

  const result = await pool.query(query, params);

  return {
    success: true,
    predictions: result.rows
  };
}

// Generate price prediction
export async function generatePricePredictionPostgres(crop, market) {
  const currentResult = await pool.query(
    'SELECT AVG(price) as avg_price FROM market_prices WHERE crop = $1 AND market = $2',
    [crop, market]
  );

  const avgPrice = currentResult.rows[0]?.avg_price || 0;
  const predictedPrice = Math.round(avgPrice * (1 + (Math.random() - 0.5) * 0.1));

  return {
    success: true,
    crop: crop,
    market: market,
    currentPrice: avgPrice,
    predictedPrice: predictedPrice,
    trend: predictedPrice > avgPrice ? 'up' : predictedPrice < avgPrice ? 'down' : 'stable'
  };
}

// ==================== PRICE ALERTS ====================

// Set price alert
export async function setPriceAlertPostgres(data) {
  const { phoneNumber, crop, market, thresholdType, thresholdPrice } = data;

  if (!phoneNumber || !crop) {
    return { success: false, error: 'Phone number and crop are required' };
  }

  await pool.query(
    `INSERT INTO market_price_alerts (phone_number, crop, market, threshold_type, threshold_price)
     VALUES ($1, $2, $3, $4, $5)`,
    [phoneNumber, crop, market, thresholdType || 'above', thresholdPrice]
  );

  return {
    success: true,
    message: 'Price alert set successfully'
  };
}

// Get user price alerts
export async function getUserPriceAlertsPostgres(phoneNumber) {
  const result = await pool.query(
    `SELECT * FROM market_price_alerts
     WHERE phone_number = $1
     ORDER BY created_at DESC`,
    [phoneNumber]
  );

  return { success: true, alerts: result.rows };
}

// Check alerts against current prices
export async function checkPriceAlertsPostgres() {
  const result = await pool.query(`
    SELECT a.*, mp.price as current_price
    FROM market_price_alerts a
    LEFT JOIN market_prices mp ON a.crop = mp.crop AND a.market = mp.market
    WHERE a.is_active = true
  `);

  const triggered = [];

  for (const alert of result.rows) {
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
    await pool.query(
      'UPDATE market_price_alerts SET last_checked = NOW(), current_price = $1 WHERE id = $2',
      [currentPrice, alert.id]
    );
  }

  return { success: true, triggered };
}

// Delete price alert
export async function deletePriceAlertPostgres(alertId) {
  await pool.query('DELETE FROM market_price_alerts WHERE id = $1', [alertId]);
  return { success: true, message: 'Alert deleted' };
}

// ==================== BUYERS ====================

// Register buyer
export async function registerBuyerPostgres(data) {
  const { buyerName, buyerType, contactPerson, phone, email, location, county, cropsInterested, quantityNeeded, priceOffering } = data;

  if (!buyerName || !phone) {
    return { success: false, error: 'Buyer name and phone are required' };
  }

  const result = await pool.query(
    `INSERT INTO buyers (buyer_name, buyer_type, contact_person, phone, email, location, county, crops_interested, quantity_needed, price_offering)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [buyerName, buyerType, contactPerson, phone, email, location, county, cropsInterested, quantityNeeded, priceOffering]
  );

  return {
    success: true,
    buyerId: result.rows[0].id,
    message: 'Buyer registered successfully'
  };
}

// Get buyers
export async function getBuyersPostgres(options = {}) {
  const { county, crop } = options;

  let query = 'SELECT * FROM buyers WHERE 1=1';
  const params = [];
  let paramIndex = 0;

  if (county) {
    query += ` AND county = $${++paramIndex}`;
    params.push(county);
  }
  if (crop) {
    query += ` AND crops_interested ILIKE $${++paramIndex}`;
    params.push(`%${crop}%`);
  }

  query += ' ORDER BY is_verified DESC, rating DESC';

  const result = await pool.query(query, params);

  return { success: true, buyers: result.rows };
}

// Get buyer details
export async function getBuyerDetailsPostgres(buyerId) {
  const result = await pool.query('SELECT * FROM buyers WHERE id = $1', [buyerId]);

  if (!result.rows[0]) {
    return { success: false, error: 'Buyer not found' };
  }

  return { success: true, buyer: result.rows[0] };
}

// ==================== AGRO-DEALERS ====================

// Register agro-dealer
export async function registerAgroDealerPostgres(data) {
  const { shopName, ownerName, phone, email, location, county, subCounty, products, brands, hasDelivery, deliveryArea } = data;

  if (!shopName || !phone) {
    return { success: false, error: 'Shop name and phone are required' };
  }

  const result = await pool.query(
    `INSERT INTO agro_dealers (shop_name, owner_name, phone, email, location, county, sub_county, products, brands, has_delivery, delivery_area)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING id`,
    [shopName, ownerName, phone, email, location, county, subCounty, products, brands, hasDelivery ? true : false, deliveryArea]
  );

  return {
    success: true,
    dealerId: result.rows[0].id,
    message: 'Agro-dealer registered successfully'
  };
}

// Get agro-dealers
export async function getAgroDealersPostgres(options = {}) {
  const { county, subCounty, product } = options;

  let query = 'SELECT * FROM agro_dealers WHERE 1=1';
  const params = [];
  let paramIndex = 0;

  if (county) {
    query += ` AND county = $${++paramIndex}`;
    params.push(county);
  }
  if (subCounty) {
    query += ` AND sub_county = $${++paramIndex}`;
    params.push(subCounty);
  }
  if (product) {
    query += ` AND products ILIKE $${++paramIndex}`;
    params.push(`%${product}%`);
  }

  query += ' ORDER BY is_verified DESC, rating DESC';

  const result = await pool.query(query, params);

  return { success: true, dealers: result.rows };
}

// Get agro-dealer details
export async function getAgroDealerDetailsPostgres(dealerId) {
  const result = await pool.query('SELECT * FROM agro_dealers WHERE id = $1', [dealerId]);

  if (!result.rows[0]) {
    return { success: false, error: 'Dealer not found' };
  }

  return { success: true, dealer: result.rows[0] };
}

// ==================== MARKET STATS ====================

export async function getMarketStatsPostgres() {
  const pricesResult = await pool.query('SELECT COUNT(DISTINCT crop) as crops, COUNT(*) as records FROM market_prices');
  const alertsResult = await pool.query('SELECT COUNT(*) as active FROM market_price_alerts WHERE is_active = true');
  const buyersResult = await pool.query('SELECT COUNT(*) as total, SUM(CASE WHEN is_verified THEN 1 ELSE 0 END) as verified FROM buyers');
  const dealersResult = await pool.query('SELECT COUNT(*) as total, SUM(CASE WHEN is_verified THEN 1 ELSE 0 END) as verified FROM agro_dealers');

  // Price trends
  const trendsResult = await pool.query(`
    SELECT crop, AVG(price) as avg_price,
      (SELECT price FROM market_prices p2 WHERE p2.crop = p1.crop ORDER BY recorded_at DESC LIMIT 1) as current_price
    FROM market_prices p1
    GROUP BY crop
  `);

  return {
    success: true,
    stats: {
      trackedCrops: parseInt(pricesResult.rows[0]?.crops || 0),
      priceRecords: parseInt(pricesResult.rows[0]?.records || 0),
      activeAlerts: parseInt(alertsResult.rows[0]?.active || 0),
      buyers: { total: parseInt(buyersResult.rows[0]?.total || 0), verified: parseInt(buyersResult.rows[0]?.verified || 0) },
      agroDealers: { total: parseInt(dealersResult.rows[0]?.total || 0), verified: parseInt(dealersResult.rows[0]?.verified || 0) }
    },
    priceTrends: trendsResult.rows
  };
}

// ==================== MANUAL PRICE UPDATE ====================

// Update price manually (admin)
export async function updatePricePostgres(crop, market, price, unit = 'kg') {
  await pool.query(
    `INSERT INTO market_prices (crop, market, price, unit, trend)
     VALUES ($1, $2, $3, $4, (
       SELECT CASE 
         WHEN $3 > (SELECT price FROM market_prices WHERE crop = $1 AND market = $2 ORDER BY recorded_at DESC LIMIT 1) THEN 'up'
         WHEN $3 < (SELECT price FROM market_prices WHERE crop = $1 AND market = $2 ORDER BY recorded_at DESC LIMIT 1) THEN 'down'
         ELSE 'stable'
       END
     ))`,
    [crop, market, price, unit]
  );

  return { success: true, message: 'Price updated' };
}

export default {
  initializeMarketDatabasePostgres,
  getCurrentPricesPostgres,
  getPriceHistoryPostgres,
  getPricesByMarketPostgres,
  getMarketsPostgres,
  getPriceComparisonPostgres,
  getPricePredictionsPostgres,
  generatePricePredictionPostgres,
  setPriceAlertPostgres,
  getUserPriceAlertsPostgres,
  checkPriceAlertsPostgres,
  deletePriceAlertPostgres,
  registerBuyerPostgres,
  getBuyersPostgres,
  getBuyerDetailsPostgres,
  registerAgroDealerPostgres,
  getAgroDealersPostgres,
  getAgroDealerDetailsPostgres,
  getMarketStatsPostgres,
  updatePricePostgres
};
