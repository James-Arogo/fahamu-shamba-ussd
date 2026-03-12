/**
 * Market Prices API for Fahamu Shamba
 * Provides market prices in the format expected by the frontend
 * Supports both SQLite and PostgreSQL
 */

import express from 'express';
import marketService from './market-service.js';
import * as marketServicePostgres from './market-service-postgres.js';

const router = express.Router();

// Detect which database to use
const USE_POSTGRES = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres');

// Initialize market database
let initialized = false;

async function ensureInitialized(req, res, next) {
  if (!initialized) {
    if (USE_POSTGRES) {
      await marketServicePostgres.initializeMarketDatabasePostgres();
    } else {
      marketService.initializeMarketDatabase();
    }
    initialized = true;
  }
  next();
}

// Get market prices in frontend-compatible format
router.get('/api/market/prices', ensureInitialized, async (req, res) => {
  try {
    console.log('📊 Fetching market prices, USE_POSTGRES:', USE_POSTGRES);
    const result = USE_POSTGRES
      ? await marketServicePostgres.getCurrentPricesPostgres()
      : marketService.getCurrentPrices();
    
    console.log('📊 Result success:', result.success, 'Prices count:', result.prices?.length);
    
    if (!result.success || !result.prices || result.prices.length === 0) {
      console.warn('⚠️ No prices returned:', result);
      return res.json({
        success: false,
        message: 'No market data available',
        debug: { usePostgres: USE_POSTGRES, resultSuccess: result.success, priceCount: result.prices?.length }
      });
    }

    // Group prices by crop and map to sub-counties
    // Fixed: Use all 6 valid Siaya sub-counties (removed invalid 'yala', added 'rarieda' and 'ugenya')
    const subcounties = ['alego', 'bondo', 'gem', 'rarieda', 'ugenya', 'ugunja'];
    const marketToSubcounty = {
      'Alego Usonga Market': 'alego',
      'Bondo Market': 'bondo',
      'Gem Market': 'gem',
      'Rarieda Market': 'rarieda',
      'Ugenya Market': 'ugenya',
      'Ugunja Market': 'ugunja',
      'Siaya Town Market': 'alego', // Siaya Town maps to Alego Usonga
      'Siaya Town': 'alego', // Also handle without "Market" suffix
      'Yala Market': 'ugunja' // Yala is in Ugunja sub-county
    };

    // Create a map to group by crop
    const cropMap = new Map();
    
    result.prices.forEach(price => {
      const crop = price.crop;
      const market = price.market;
      const subcounty = marketToSubcounty[market];
      const priceValue = price.price || 0;
      
      if (!cropMap.has(crop)) {
        cropMap.set(crop, {
          crop: crop,
          alego: 0,
          bondo: 0,
          gem: 0,
          rarieda: 0,
          ugenya: 0,
          ugunja: 0,
          trend: price.trend || 'stable'
        });
      }
      
      const cropData = cropMap.get(crop);
      if (subcounty && priceValue > 0) {
        cropData[subcounty] = priceValue;
      }
    });

    // Convert map to array and sort
    const prices = Array.from(cropMap.values()).sort((a, b) => a.crop.localeCompare(b.crop));
    
    res.json({
      success: true,
      prices: prices,
      timestamp: result.timestamp,
      message: 'Market prices loaded successfully'
    });
    
  } catch (error) {
    console.error('❌ Error fetching market prices:', error.message);
    console.error('Stack:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market prices',
      debug: {
        message: error.message,
        usePostgres: USE_POSTGRES,
        databaseUrl: process.env.DATABASE_URL ? 'SET' : 'NOT SET'
      }
    });
  }
});

// Get market trends for Chart.js
router.get('/api/market-trends', ensureInitialized, async (req, res) => {
  try {
    const { crop } = req.query;
    
    if (!crop) {
      return res.status(400).json({
        success: false,
        error: 'Crop parameter is required'
      });
    }

    // Get price history for the last 8 weeks
    const history = USE_POSTGRES
      ? await marketServicePostgres.getPriceHistoryPostgres(crop, 'Siaya Town Market', 56)
      : marketService.getPriceHistory(crop, 'Siaya Town Market', 56);
    
    if (!history.success || !history.history || history.history.length === 0) {
      // Return demo data if no history available
      return res.json({
        success: true,
        trends: generateDemoTrends(crop)
      });
    }

    // Group by week
    const weeklyData = {};
    history.history.forEach(record => {
      const date = new Date(record.recorded_at);
      const weekStart = new Date(date.getFullYear(), date.getMonth(), date.getDate() - date.getDay());
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeklyData[weekKey]) {
        weeklyData[weekKey] = {
          week_start: weekKey,
          subcounty: 'alego', // Default subcounty
          price: record.price
        };
      }
    });

    const trends = Object.values(weeklyData).sort((a, b) => a.week_start.localeCompare(b.week_start));
    
    res.json({
      success: true,
      trends: trends
    });
    
  } catch (error) {
    console.error('Error fetching market trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market trends'
    });
  }
});

// Generate demo trends for Chart.js with all 6 valid Siaya sub-counties
function generateDemoTrends(crop) {
  const weeks = [];
  const basePrice = crop === 'Maize' ? 55 : crop === 'Beans' ? 90 : 70;
  
  for (let i = 8; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - (i * 7));
    const weekStart = date.toISOString().split('T')[0];
    
    // All 6 valid Siaya County sub-counties (fixed: removed 'yala', added 'rarieda' and 'ugenya')
    const subcounties = ['alego', 'bondo', 'gem', 'rarieda', 'ugenya', 'ugunja'];
    const trends = subcounties.map(sc => ({
      subcounty: sc,
      week_start: weekStart,
      price: basePrice + Math.floor(Math.random() * 10) - 5
    }));
    weeks.push(...trends);
  }
  return weeks;
}

export default router;