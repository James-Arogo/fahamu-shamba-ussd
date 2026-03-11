/**
 * Enhanced Feedback Service for Fahamu Shamba (ASYNC VERSION)
 * Provides rating system, yield tracking, and ML improvement feedback
 * Compatible with both SQLite and PostgreSQL using dbAsync wrapper
 */

let dbAsync; // Async wrapper for database operations

// Set async database helper (required for all operations)
export function initializeFeedbackDatabase(db, asyncDbConnection) {
  if (!asyncDbConnection) {
    throw new Error('asyncDbConnection (dbAsync) is required for feedback service');
  }
  
  dbAsync = asyncDbConnection;
  
  // Note: Table initialization is now done at startup via migrate scripts
  // This function just sets up the dbAsync connection
  console.log('✅ Feedback service initialized with async database connection');
}

// ==================== RATING SYSTEM ====================

// Submit rating for a prediction
export async function submitRating(data) {
  const { predictionId, phoneNumber, crop, rating, subCounty, soilType, season } = data;
  
  if (!crop || !rating || rating < 1 || rating > 5) {
    return { success: false, error: 'Valid crop and rating (1-5) are required' };
  }
  
  // Insert into rating history
  await dbAsync.run(
    `INSERT INTO rating_history (prediction_id, phone_number, crop, rating, sub_county, soil_type, season)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [predictionId || null, phoneNumber, crop, rating, subCounty, soilType, season]
  );
  
  // Update analytics
  await updateCropAnalytics(crop, subCounty);
  
  return {
    success: true,
    message: 'Rating submitted successfully',
    rating
  };
}

// Submit detailed feedback
export async function submitFeedback(data) {
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
  
  const result = await dbAsync.run(
    `INSERT INTO enhanced_feedback (
      prediction_id, phone_number, crop_recommended, crop_planted, rating,
      was_helpful, yield_achieved, yield_unit, cultivation_period,
      challenges, suggestions, would_recommend
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
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
    ]
  );
  
  // Update analytics
  if (cropRecommended) {
    await updateCropAnalytics(cropRecommended, null);
  }
  
  return {
    success: true,
    feedbackId: result.lastID,
    message: 'Feedback submitted successfully'
  };
}

// Submit simple feedback (quick feedback and detailed feedback)
export async function submitSimpleFeedback(data) {
  const { phoneNumber, helpful, comments, feedback_type, rating } = data;
  
  const result = await dbAsync.run(
    `INSERT INTO enhanced_feedback (
      phone_number, crop_recommended, rating, was_helpful, suggestions, feedback_type, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
    [
      phoneNumber,
      'general',  // Default crop_recommended to avoid NOT NULL constraint
      rating || null,
      helpful !== undefined ? (helpful ? 1 : 0) : null,
      comments || null,
      feedback_type || 'general'
    ]
  );
  
  return {
    success: true,
    feedbackId: result.lastID,
    message: 'Feedback submitted successfully'
  };
}

// Get feedback by phone number
export async function getUserFeedback(phoneNumber, limit = 10) {
  const feedback = await dbAsync.all(
    `SELECT * FROM enhanced_feedback 
     WHERE phone_number = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [phoneNumber, limit]
  );
  
  return {
    success: true,
    feedback
  };
}

// Get all feedback with filters
export async function getAllFeedback(options = {}) {
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
  
  const feedback = await dbAsync.all(query, params);
  
  return {
    success: true,
    feedback,
    pagination: { page, limit }
  };
}

// ==================== YIELD TRACKING ====================

// Record yield
export async function recordYield(data) {
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
  
  const result = await dbAsync.run(
    `INSERT INTO yield_records (
      phone_number, crop, sub_county, soil_type, season,
      yield_amount, yield_unit, farm_size, inputs_used, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
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
    ]
  );
  
  // Update analytics with yield
  if (yieldAmount) {
    await updateYieldAnalytics(crop, subCounty, yieldAmount);
  }
  
  return {
    success: true,
    recordId: result.lastID,
    message: 'Yield recorded successfully'
  };
}

// Get user yield history
export async function getUserYields(phoneNumber) {
  const yields = await dbAsync.all(
    `SELECT * FROM yield_records 
     WHERE phone_number = ?
     ORDER BY recorded_at DESC`,
    [phoneNumber]
  );
  
  return {
    success: true,
    yields
  };
}

// Get yield analytics by crop
export async function getYieldAnalytics(crop, subCounty) {
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
  
  const analytics = await dbAsync.all(query, params);
  
  return {
    success: true,
    analytics
  };
}

// ==================== ANALYTICS ====================

// Update crop analytics
async function updateCropAnalytics(crop, subCounty) {
  // Get latest ratings for this crop
  const ratings = await dbAsync.get(
    `SELECT 
      COUNT(*) as total,
      AVG(rating) as avg_rating,
      SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END) as positive,
      SUM(CASE WHEN rating <= 2 THEN 1 ELSE 0 END) as negative
    FROM rating_history
    WHERE crop = ?`,
    [crop]
  );
  
  // Check if analytics exist
  let existing;
  if (subCounty) {
    existing = await dbAsync.get(
      `SELECT id FROM feedback_analytics WHERE crop = ? AND sub_county = ?`,
      [crop, subCounty]
    );
  } else {
    existing = await dbAsync.get(
      `SELECT id FROM feedback_analytics WHERE crop = ? AND sub_county IS NULL`,
      [crop]
    );
  }
  
  if (existing) {
    // Update existing record
    if (subCounty) {
      await dbAsync.run(
        `UPDATE feedback_analytics 
         SET total_ratings = ?, avg_rating = ?, positive_count = ?, negative_count = ?, updated_at = CURRENT_TIMESTAMP
         WHERE crop = ? AND sub_county = ?`,
        [ratings.total, ratings.avg_rating, ratings.positive, ratings.negative, crop, subCounty]
      );
    } else {
      await dbAsync.run(
        `UPDATE feedback_analytics 
         SET total_ratings = ?, avg_rating = ?, positive_count = ?, negative_count = ?, updated_at = CURRENT_TIMESTAMP
         WHERE crop = ? AND sub_county IS NULL`,
        [ratings.total, ratings.avg_rating, ratings.positive, ratings.negative, crop]
      );
    }
  } else {
    // Insert new record
    await dbAsync.run(
      `INSERT INTO feedback_analytics 
       (crop, sub_county, total_ratings, avg_rating, positive_count, negative_count, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [crop, subCounty || null, ratings.total, ratings.avg_rating, ratings.positive, ratings.negative]
    );
  }
}

// Update yield analytics
async function updateYieldAnalytics(crop, subCounty, yieldAmount) {
  const yields = await dbAsync.get(
    `SELECT 
      COUNT(*) as total,
      AVG(yield_amount) as avg_yield
    FROM yield_records
    WHERE crop = ?`,
    [crop]
  );
  
  // Check if analytics exist
  let existing;
  if (subCounty) {
    existing = await dbAsync.get(
      `SELECT id FROM feedback_analytics WHERE crop = ? AND sub_county = ?`,
      [crop, subCounty]
    );
  } else {
    existing = await dbAsync.get(
      `SELECT id FROM feedback_analytics WHERE crop = ? AND sub_county IS NULL`,
      [crop]
    );
  }
  
  if (existing) {
    // Update existing record
    if (subCounty) {
      await dbAsync.run(
        `UPDATE feedback_analytics 
         SET yield_reports = ?, avg_yield = ?, updated_at = CURRENT_TIMESTAMP
         WHERE crop = ? AND sub_county = ?`,
        [yields.total, yields.avg_yield, crop, subCounty]
      );
    } else {
      await dbAsync.run(
        `UPDATE feedback_analytics 
         SET yield_reports = ?, avg_yield = ?, updated_at = CURRENT_TIMESTAMP
         WHERE crop = ? AND sub_county IS NULL`,
        [yields.total, yields.avg_yield, crop]
      );
    }
  } else {
    // Insert new record
    await dbAsync.run(
      `INSERT INTO feedback_analytics 
       (crop, sub_county, yield_reports, avg_yield, updated_at)
       VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`,
      [crop, subCounty || null, yields.total, yields.avg_yield]
    );
  }
}

// Get comprehensive feedback analytics
export async function getFeedbackAnalytics() {
  // Overall stats
  const overall = await dbAsync.get(
    `SELECT 
      COUNT(*) as total_feedback,
      AVG(rating) as avg_rating,
      SUM(CASE WHEN was_helpful IS TRUE THEN 1 ELSE 0 END) as helpful_count,
      SUM(CASE WHEN would_recommend IS TRUE THEN 1 ELSE 0 END) as recommend_count
    FROM enhanced_feedback
    WHERE rating IS NOT NULL`
  );
  
  // Ratings distribution
  const distribution = await dbAsync.all(
    `SELECT rating, COUNT(*) as count
     FROM rating_history
     GROUP BY rating
     ORDER BY rating`
  );
  
  // Top rated crops
  const topCrops = await dbAsync.all(
    `SELECT 
      crop,
      COUNT(*) as total_ratings,
      AVG(rating) as avg_rating
    FROM rating_history
    GROUP BY crop
    HAVING COUNT(*) >= 3
    ORDER BY avg_rating DESC
    LIMIT 10`
  );
  
  // Bottom rated crops
  const bottomCrops = await dbAsync.all(
    `SELECT 
      crop,
      COUNT(*) as total_ratings,
      AVG(rating) as avg_rating
    FROM rating_history
    GROUP BY crop
    HAVING COUNT(*) >= 3
    ORDER BY avg_rating ASC
    LIMIT 5`
  );
  
  // Recent feedback
  const recent = await dbAsync.all(
    `SELECT * FROM enhanced_feedback
     ORDER BY created_at DESC
     LIMIT 10`
  );
  
  // Yield stats
  const yieldStats = await dbAsync.all(
    `SELECT 
      crop,
      COUNT(*) as records,
      AVG(yield_amount) as avg_yield
    FROM yield_records
    WHERE yield_amount IS NOT NULL
    GROUP BY crop`
  );
  
  return {
    success: true,
    analytics: {
      overall: {
        totalFeedback: overall?.total_feedback || 0,
        avgRating: overall?.avg_rating ? parseFloat(overall.avg_rating.toFixed(2)) : 0,
        helpfulPercentage: overall?.total_feedback ? Math.round((overall.helpful_count / overall.total_feedback) * 100) : 0,
        recommendPercentage: overall?.total_feedback ? Math.round((overall.recommend_count / overall.total_feedback) * 100) : 0
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
export async function getRecentFeedback(options = {}) {
  const { limit = 10 } = options;
  
  const feedback = await dbAsync.all(
    `SELECT 
      id,
      phone_number,
      rating,
      was_helpful,
      suggestions as comments,
      feedback_type,
      created_at
    FROM enhanced_feedback
    ORDER BY created_at DESC
    LIMIT ?`,
    [limit]
  );
  
  return {
    success: true,
    data: feedback
  };
}

// ==================== PRICE ALERTS ====================

// Subscribe to price alert
export async function subscribePriceAlert(data) {
  const { phoneNumber, crop, thresholdType, thresholdPrice, notifySms, notifyPush } = data;
  
  if (!phoneNumber || !crop) {
    return { success: false, error: 'Phone number and crop are required' };
  }
  
  const result = await dbAsync.run(
    `INSERT INTO price_alerts (phone_number, crop, threshold_type, threshold_price, notify_sms, notify_push)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      phoneNumber,
      crop,
      thresholdType || 'above',
      thresholdPrice,
      notifySms !== false ? 1 : 0,
      notifyPush !== false ? 1 : 0
    ]
  );
  
  return {
    success: true,
    alertId: result.lastID,
    message: 'Price alert subscribed'
  };
}

// Get user price alerts
export async function getUserPriceAlerts(phoneNumber) {
  const alerts = await dbAsync.all(
    `SELECT * FROM price_alerts 
     WHERE phone_number = ? AND is_active = 1`,
    [phoneNumber]
  );
  
  return { success: true, alerts };
}

// Update price alert
export async function updatePriceAlert(alertId, updates) {
  const { thresholdPrice, isActive } = updates;
  
  if (thresholdPrice !== undefined) {
    await dbAsync.run(
      'UPDATE price_alerts SET threshold_price = ? WHERE id = ?',
      [thresholdPrice, alertId]
    );
  }
  if (isActive !== undefined) {
    await dbAsync.run(
      'UPDATE price_alerts SET is_active = ? WHERE id = ?',
      [isActive ? 1 : 0, alertId]
    );
  }
  
  return { success: true, message: 'Alert updated' };
}

// Delete price alert
export async function deletePriceAlert(alertId) {
  await dbAsync.run('DELETE FROM price_alerts WHERE id = ?', [alertId]);
  return { success: true, message: 'Alert deleted' };
}

// Get active alerts for a crop (for checking)
export async function getActiveAlertsForCrop(crop) {
  const alerts = await dbAsync.all(
    `SELECT * FROM price_alerts 
     WHERE crop = ? AND is_active = 1`,
    [crop]
  );
  
  return { success: true, alerts };
}

// ==================== ML IMPROVEMENT DATA ====================

// Get data for ML model improvement
export async function getMLTrainingData(options = {}) {
  const { minRatings = 5 } = options;
  
  // Get crops that need improvement (low ratings)
  const lowRatedCrops = await dbAsync.all(
    `SELECT crop, AVG(rating) as avg_rating, COUNT(*) as sample_size
     FROM rating_history
     GROUP BY crop
     HAVING COUNT(*) >= ? AND AVG(rating) < 3.5
     ORDER BY avg_rating ASC`,
    [minRatings]
  );
  
  // Get high-rated crop patterns
  const highRatedPatterns = await dbAsync.all(
    `SELECT crop, sub_county, soil_type, season, AVG(rating) as avg_rating, COUNT(*) as samples
     FROM rating_history
     WHERE rating >= 4
     GROUP BY crop, sub_county, soil_type, season
     ORDER BY avg_rating DESC
     LIMIT 50`
  );
  
  // Get yield data for correlation
  const yieldCorrelations = await dbAsync.all(
    `SELECT 
      r.crop,
      r.sub_county,
      r.soil_type,
      r.season,
      r.rating,
      y.yield_amount
    FROM rating_history r
    JOIN yield_records y ON r.phone_number = y.phone_number AND r.crop = y.crop
    WHERE r.rating IS NOT NULL AND y.yield_amount IS NOT NULL`
  );
  
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
