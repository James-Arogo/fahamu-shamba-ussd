/**
 * Enhanced Feedback Service for Fahamu Shamba
 * Provides rating system, yield tracking, and ML improvement feedback
 */

import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db;

function getDb() {
  if (!db) {
    db = new Database('./fahamu_shamba.db');
  }
  return db;
}

// Initialize enhanced feedback tables
export function initializeFeedbackDatabase(dbConnection) {
  const database = dbConnection || getDb();
  
  // Enhanced feedback with ratings
  database.exec(`
    CREATE TABLE IF NOT EXISTS enhanced_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prediction_id INTEGER,
      phone_number TEXT,
      crop_recommended TEXT DEFAULT NULL,
      crop_planted TEXT,
      rating INTEGER CHECK(rating >= 1 AND rating <= 5),
      was_helpful BOOLEAN,
      yield_achieved TEXT,
      yield_unit TEXT DEFAULT 'kg',
      cultivation_period TEXT,
      challenges TEXT,
      suggestions TEXT,
      would_recommend BOOLEAN,
      feedback_type TEXT DEFAULT 'general',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Add feedback_type column if it doesn't exist (for existing databases)
  try {
    database.exec(`ALTER TABLE enhanced_feedback ADD COLUMN feedback_type TEXT DEFAULT 'general'`);
  } catch (e) {
    // Column already exists, ignore error
  }
  
  // Rating history for ML improvement
  database.exec(`
    CREATE TABLE IF NOT EXISTS rating_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prediction_id INTEGER,
      phone_number TEXT,
      crop TEXT NOT NULL,
      rating INTEGER CHECK(rating >= 1 AND rating <= 5),
      sub_county TEXT,
      soil_type TEXT,
      season TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Yield records
  database.exec(`
    CREATE TABLE IF NOT EXISTS yield_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT NOT NULL,
      crop TEXT NOT NULL,
      sub_county TEXT,
      soil_type TEXT,
      season TEXT,
      yield_amount REAL,
      yield_unit TEXT DEFAULT 'kg',
      farm_size REAL,
      inputs_used TEXT,
      notes TEXT,
      recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Feedback analytics summary (for quick dashboard stats)
  database.exec(`
    CREATE TABLE IF NOT EXISTS feedback_analytics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      crop TEXT NOT NULL,
      sub_county TEXT,
      total_ratings INTEGER DEFAULT 0,
      avg_rating REAL DEFAULT 0,
      positive_count INTEGER DEFAULT 0,
      negative_count INTEGER DEFAULT 0,
      yield_reports INTEGER DEFAULT 0,
      avg_yield REAL DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(crop, sub_county)
    )
  `);
  
  // Price alerts subscriptions
  database.exec(`
    CREATE TABLE IF NOT EXISTS price_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT NOT NULL,
      crop TEXT NOT NULL,
      threshold_type TEXT DEFAULT 'above',
      threshold_price REAL,
      notify_sms BOOLEAN DEFAULT 1,
      notify_push BOOLEAN DEFAULT 1,
      is_active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  
  // Indexes
  database.exec(`CREATE INDEX IF NOT EXISTS idx_feedback_phone ON enhanced_feedback(phone_number)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_feedback_crop ON enhanced_feedback(crop_recommended)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_rating_crop ON rating_history(crop)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_yields_phone ON yield_records(phone_number)`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_price_alerts_phone ON price_alerts(phone_number)`);
  
  console.log('✅ Enhanced feedback database tables initialized');
}

// ==================== RATING SYSTEM ====================

// Submit rating for a prediction
export function submitRating(data) {
  const { predictionId, phoneNumber, crop, rating, subCounty, soilType, season } = data;
  
  if (!crop || !rating || rating < 1 || rating > 5) {
    return { success: false, error: 'Valid crop and rating (1-5) are required' };
  }
  
  // Insert into rating history
  const stmt = getDb().prepare(`
    INSERT INTO rating_history (prediction_id, phone_number, crop, rating, sub_county, soil_type, season)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmt.run(predictionId || null, phoneNumber, crop, rating, subCounty, soilType, season);
  
  // Update analytics
  updateCropAnalytics(crop, subCounty);
  
  return {
    success: true,
    message: 'Rating submitted successfully',
    rating
  };
}

// Submit detailed feedback
export function submitFeedback(data) {
  const {
    predictionId,
    phoneNumber,
    cropRecommended,
    cropPlanted,
    rating,
    wasHelpful,
    yieldAchieved,
    yieldUnit,
    cultivationPeriod,
    challenges,
    suggestions,
    wouldRecommend
  } = data;
  
  const stmt = getDb().prepare(`
    INSERT INTO enhanced_feedback (
      prediction_id, phone_number, crop_recommended, crop_planted, rating,
      was_helpful, yield_achieved, yield_unit, cultivation_period,
      challenges, suggestions, would_recommend
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    predictionId || null,
    phoneNumber,
    cropRecommended,
    cropPlanted || cropRecommended,
    rating,
    wasHelpful !== undefined ? (wasHelpful ? 1 : 0) : null,
    yieldAchieved,
    yieldUnit || 'kg',
    cultivationPeriod,
    challenges,
    suggestions,
    wouldRecommend !== undefined ? (wouldRecommend ? 1 : 0) : null
  );
  
  // Update analytics
  if (cropRecommended) {
    updateCropAnalytics(cropRecommended, null);
  }
  
  return {
    success: true,
    feedbackId: result.lastInsertRowid,
    message: 'Feedback submitted successfully'
  };
}

// Submit simple feedback (quick feedback and detailed feedback)
export function submitSimpleFeedback(data) {
  const { phoneNumber, helpful, comments, feedback_type, rating } = data;
  
  // Use a default value for crop_recommended to avoid NOT NULL constraint issues
  const stmt = getDb().prepare(`
    INSERT INTO enhanced_feedback (
      phone_number, crop_recommended, rating, was_helpful, suggestions, feedback_type, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `);
  
  const result = stmt.run(
    phoneNumber,
    'general',  // Default crop_recommended to avoid NOT NULL constraint
    rating || null,
    helpful !== undefined ? (helpful ? 1 : 0) : null,
    comments || null,
    feedback_type || 'general'
  );
  
  return {
    success: true,
    feedbackId: result.lastInsertRowid,
    message: 'Feedback submitted successfully'
  };
}

// Get feedback by phone number
export function getUserFeedback(phoneNumber, limit = 10) {
  const feedback = getDb().prepare(`
    SELECT * FROM enhanced_feedback 
    WHERE phone_number = ?
    ORDER BY created_at DESC
    LIMIT ?
  `).all(phoneNumber, limit);
  
  return {
    success: true,
    feedback
  };
}

// Get all feedback with filters
export function getAllFeedback(options = {}) {
  const { page = 1, limit = 20, crop, subCounty, minRating } = options;
  const offset = (page - 1) * limit;
  
  let query = 'SELECT * FROM enhanced_feedback WHERE 1=1';
  const params = [];
  
  if (crop) {
    query += ' AND crop_recommended = ?';
    params.push(crop);
  }
  if (subCounty) {
    query += ' AND EXISTS (SELECT 1 FROM predictions p WHERE p.phone_number = enhanced_feedback.phone_number AND p.sub_county = ?)';
    params.push(subCounty);
  }
  if (minRating) {
    query += ' AND rating >= ?';
    params.push(minRating);
  }
  
  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(limit, offset);
  
  const feedback = getDb().prepare(query).all(...params);
  
  return {
    success: true,
    feedback,
    pagination: { page, limit }
  };
}

// ==================== YIELD TRACKING ====================

// Record yield
export function recordYield(data) {
  const {
    phoneNumber,
    crop,
    subCounty,
    soilType,
    season,
    yieldAmount,
    yieldUnit,
    farmSize,
    inputsUsed,
    notes
  } = data;
  
  if (!phoneNumber || !crop) {
    return { success: false, error: 'Phone number and crop are required' };
  }
  
  const stmt = getDb().prepare(`
    INSERT INTO yield_records (
      phone_number, crop, sub_county, soil_type, season,
      yield_amount, yield_unit, farm_size, inputs_used, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    phoneNumber,
    crop,
    subCounty,
    soilType,
    season,
    yieldAmount,
    yieldUnit || 'kg',
    farmSize,
    inputsUsed,
    notes
  );
  
  // Update analytics with yield
  if (yieldAmount) {
    updateYieldAnalytics(crop, subCounty, yieldAmount);
  }
  
  return {
    success: true,
    recordId: result.lastInsertRowid,
    message: 'Yield recorded successfully'
  };
}

// Get user yield history
export function getUserYields(phoneNumber) {
  const yields = getDb().prepare(`
    SELECT * FROM yield_records 
    WHERE phone_number = ?
    ORDER BY recorded_at DESC
  `).all(phoneNumber);
  
  return {
    success: true,
    yields
  };
}

// Get yield analytics by crop
export function getYieldAnalytics(crop, subCounty) {
  let query = `
    SELECT 
      crop,
      COUNT(*) as total_records,
      AVG(yield_amount) as avg_yield,
      MIN(yield_amount) as min_yield,
      MAX(yield_amount) as max_yield,
      AVG(farm_size) as avg_farm_size
    FROM yield_records
    WHERE yield_amount IS NOT NULL
  `;
  const params = [];
  
  if (crop) {
    query += ' AND crop = ?';
    params.push(crop);
  }
  if (subCounty) {
    query += ' AND sub_county = ?';
    params.push(subCounty);
  }
  
  query += ' GROUP BY crop';
  
  const analytics = getDb().prepare(query).all(...params);
  
  return {
    success: true,
    analytics
  };
}

// ==================== ANALYTICS ====================

// Update crop analytics
function updateCropAnalytics(crop, subCounty) {
  // Get latest ratings for this crop
  const ratings = getDb().prepare(`
    SELECT 
      COUNT(*) as total,
      AVG(rating) as avg_rating,
      SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END) as positive,
      SUM(CASE WHEN rating <= 2 THEN 1 ELSE 0 END) as negative
    FROM rating_history
    WHERE crop = ?
  `).get(crop);
  
  // Upsert analytics
  getDb().prepare(`
    INSERT INTO feedback_analytics (crop, sub_county, total_ratings, avg_rating, positive_count, negative_count, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(crop, sub_county) DO UPDATE SET
      total_ratings = excluded.total_ratings,
      avg_rating = excluded.avg_rating,
      positive_count = excluded.positive_count,
      negative_count = excluded.negative_count,
      updated_at = CURRENT_TIMESTAMP
  `).run(crop, subCounty || null, ratings.total, ratings.avg_rating, ratings.positive, ratings.negative);
}

// Update yield analytics
function updateYieldAnalytics(crop, subCounty, yieldAmount) {
  const yields = getDb().prepare(`
    SELECT 
      COUNT(*) as total,
      AVG(yield_amount) as avg_yield
    FROM yield_records
    WHERE crop = ?
  `).get(crop);
  
  getDb().prepare(`
    INSERT INTO feedback_analytics (crop, sub_county, yield_reports, avg_yield, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(crop, sub_county) DO UPDATE SET
      yield_reports = excluded.yield_reports,
      avg_yield = excluded.avg_yield,
      updated_at = CURRENT_TIMESTAMP
  `).run(crop, subCounty || null, yields.total, yields.avg_yield);
}

// Get comprehensive feedback analytics
export function getFeedbackAnalytics() {
  // Overall stats
  const overall = getDb().prepare(`
    SELECT 
      COUNT(*) as total_feedback,
      AVG(rating) as avg_rating,
      SUM(CASE WHEN was_helpful = 1 THEN 1 ELSE 0 END) as helpful_count,
      SUM(CASE WHEN would_recommend = 1 THEN 1 ELSE 0 END) as recommend_count
    FROM enhanced_feedback
    WHERE rating IS NOT NULL
  `).get();
  
  // Ratings distribution
  const distribution = getDb().prepare(`
    SELECT rating, COUNT(*) as count
    FROM rating_history
    GROUP BY rating
    ORDER BY rating
  `).all();
  
  // Top rated crops
  const topCrops = getDb().prepare(`
    SELECT 
      crop,
      COUNT(*) as total_ratings,
      AVG(rating) as avg_rating
    FROM rating_history
    GROUP BY crop
    HAVING COUNT(*) >= 3
    ORDER BY avg_rating DESC
    LIMIT 10
  `).all();
  
  // Bottom rated crops
  const bottomCrops = getDb().prepare(`
    SELECT 
      crop,
      COUNT(*) as total_ratings,
      AVG(rating) as avg_rating
    FROM rating_history
    GROUP BY crop
    HAVING COUNT(*) >= 3
    ORDER BY avg_rating ASC
    LIMIT 5
  `).all();
  
  // Recent feedback
  const recent = getDb().prepare(`
    SELECT * FROM enhanced_feedback
    ORDER BY created_at DESC
    LIMIT 10
  `).all();
  
  // Yield stats
  const yieldStats = getDb().prepare(`
    SELECT 
      crop,
      COUNT(*) as records,
      AVG(yield_amount) as avg_yield
    FROM yield_records
    WHERE yield_amount IS NOT NULL
    GROUP BY crop
  `).all();
  
  return {
    success: true,
    analytics: {
      overall: {
        totalFeedback: overall.total_feedback || 0,
        avgRating: overall.avg_rating ? parseFloat(overall.avg_rating.toFixed(2)) : 0,
        helpfulPercentage: overall.total_feedback ? Math.round((overall.helpful_count / overall.total_feedback) * 100) : 0,
        recommendPercentage: overall.total_feedback ? Math.round((overall.recommend_count / overall.total_feedback) * 100) : 0
      },
      distribution,
      topCrops,
      bottomCrops,
      recentFeedback: recent,
      yieldStats
    }
  };
}

// Get recent feedback
export function getRecentFeedback(options = {}) {
  const { limit = 10 } = options;
  
  const feedback = getDb().prepare(`
    SELECT 
      id,
      phone_number,
      rating,
      was_helpful,
      suggestions as comments,
      feedback_type,
      created_at
    FROM enhanced_feedback
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit);
  
  return {
    success: true,
    data: feedback
  };
}

// ==================== PRICE ALERTS ====================

// Subscribe to price alert
export function subscribePriceAlert(data) {
  const { phoneNumber, crop, thresholdType, thresholdPrice, notifySms, notifyPush } = data;
  
  if (!phoneNumber || !crop) {
    return { success: false, error: 'Phone number and crop are required' };
  }
  
  const stmt = getDb().prepare(`
    INSERT INTO price_alerts (phone_number, crop, threshold_type, threshold_price, notify_sms, notify_push)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  
  const result = stmt.run(
    phoneNumber,
    crop,
    thresholdType || 'above',
    thresholdPrice,
    notifySms !== false ? 1 : 0,
    notifyPush !== false ? 1 : 0
  );
  
  return {
    success: true,
    alertId: result.lastInsertRowid,
    message: 'Price alert subscribed'
  };
}

// Get user price alerts
export function getUserPriceAlerts(phoneNumber) {
  const alerts = getDb().prepare(`
    SELECT * FROM price_alerts 
    WHERE phone_number = ? AND is_active = 1
  `).all(phoneNumber);
  
  return { success: true, alerts };
}

// Update price alert
export function updatePriceAlert(alertId, updates) {
  const { thresholdPrice, isActive } = updates;
  
  if (thresholdPrice !== undefined) {
    getDb().prepare('UPDATE price_alerts SET threshold_price = ? WHERE id = ?').run(thresholdPrice, alertId);
  }
  if (isActive !== undefined) {
    getDb().prepare('UPDATE price_alerts SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, alertId);
  }
  
  return { success: true, message: 'Alert updated' };
}

// Delete price alert
export function deletePriceAlert(alertId) {
  getDb().prepare('DELETE FROM price_alerts WHERE id = ?').run(alertId);
  return { success: true, message: 'Alert deleted' };
}

// Get active alerts for a crop (for checking)
export function getActiveAlertsForCrop(crop) {
  const alerts = getDb().prepare(`
    SELECT * FROM price_alerts 
    WHERE crop = ? AND is_active = 1
  `).all(crop);
  
  return { success: true, alerts };
}

// ==================== ML IMPROVEMENT DATA ====================

// Get data for ML model improvement
export function getMLTrainingData(options = {}) {
  const { minRatings = 5 } = options;
  
  // Get crops that need improvement (low ratings)
  const lowRatedCrops = getDb().prepare(`
    SELECT crop, AVG(rating) as avg_rating, COUNT(*) as sample_size
    FROM rating_history
    GROUP BY crop
    HAVING COUNT(*) >= ? AND AVG(rating) < 3.5
    ORDER BY avg_rating ASC
  `).all(minRatings);
  
  // Get high-rated crop patterns
  const highRatedPatterns = getDb().prepare(`
    SELECT crop, sub_county, soil_type, season, AVG(rating) as avg_rating, COUNT(*) as samples
    FROM rating_history
    WHERE rating >= 4
    GROUP BY crop, sub_county, soil_type, season
    ORDER BY avg_rating DESC
    LIMIT 50
  `).all();
  
  // Get yield data for correlation
  const yieldCorrelations = getDb().prepare(`
    SELECT 
      r.crop,
      r.sub_county,
      r.soil_type,
      r.season,
      r.rating,
      y.yield_amount
    FROM rating_history r
    JOIN yield_records y ON r.phone_number = y.phone_number AND r.crop = y.crop
    WHERE r.rating IS NOT NULL AND y.yield_amount IS NOT NULL
  `).all();
  
  return {
    success: true,
    data: {
      lowRatedCrops,
      highRatedPatterns,
      yieldCorrelations,
      totalSamples: yieldCorrelations.length
    }
  };
}

export default {
  initializeFeedbackDatabase,
  submitRating,
  submitFeedback,
  submitSimpleFeedback,
  getUserFeedback,
  getAllFeedback,
  recordYield,
  getUserYields,
  getYieldAnalytics,
  getFeedbackAnalytics,
  getRecentFeedback,
  subscribePriceAlert,
  getUserPriceAlerts,
  updatePriceAlert,
  deletePriceAlert,
  getActiveAlertsForCrop,
  getMLTrainingData
};

