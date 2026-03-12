/**
 * Market Routes for Fahamu Shamba
 * API endpoints for market prices, buyers, and agro-dealers
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

// ==================== MARKET PRICES ====================

// Get current prices
router.get('/market/prices', ensureInitialized, async (req, res) => {
  try {
    const { crop, market } = req.query;
    const result = USE_POSTGRES
      ? await marketServicePostgres.getCurrentPricesPostgres({ crop, market })
      : marketService.getCurrentPrices({ crop, market });
    res.json(result);
  } catch (error) {
    console.error('Error fetching prices:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch prices' });
  }
});

// Get price history
router.get('/market/prices/history', ensureInitialized, async (req, res) => {
  try {
    const { crop, market, days } = req.query;
    
    if (!crop || !market) {
      return res.status(400).json({
        success: false,
        error: 'crop and market are required'
      });
    }
    
    const result = USE_POSTGRES
      ? await marketServicePostgres.getPriceHistoryPostgres(crop, market, parseInt(days) || 30)
      : marketService.getPriceHistory(crop, market, parseInt(days) || 30);
    res.json(result);
  } catch (error) {
    console.error('Error fetching price history:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch history' });
  }
});

// Get prices by market
router.get('/market/prices/market/:market', ensureInitialized, async (req, res) => {
  try {
    const { market } = req.params;
    const result = USE_POSTGRES
      ? await marketServicePostgres.getPricesByMarketPostgres(market)
      : marketService.getPricesByMarket(market);
    res.json(result);
  } catch (error) {
    console.error('Error fetching market prices:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch prices' });
  }
});

// Get price comparison
router.get('/market/prices/compare', ensureInitialized, async (req, res) => {
  try {
    const { crop } = req.query;
    
    if (!crop) {
      return res.status(400).json({
        success: false,
        error: 'crop is required'
      });
    }
    
    const result = USE_POSTGRES
      ? await marketServicePostgres.getPriceComparisonPostgres(crop)
      : marketService.getPriceComparison(crop);
    res.json(result);
  } catch (error) {
    console.error('Error fetching price comparison:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch comparison' });
  }
});

// ==================== MARKETS ====================

// Get all markets
router.get('/market/centers', ensureInitialized, (req, res) => {
  try {
    const result = marketService.getMarkets();
    res.json(result);
  } catch (error) {
    console.error('Error fetching markets:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch markets' });
  }
});

// ==================== PRICE PREDICTIONS ====================

// Get price predictions
router.get('/market/predictions', ensureInitialized, (req, res) => {
  try {
    const { crop, market } = req.query;
    const result = marketService.getPricePredictions(crop, market);
    res.json(result);
  } catch (error) {
    console.error('Error fetching predictions:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch predictions' });
  }
});

// Generate price prediction
router.get('/market/predictions/generate', ensureInitialized, (req, res) => {
  try {
    const { crop, market } = req.query;
    
    if (!crop || !market) {
      return res.status(400).json({
        success: false,
        error: 'crop and market are required'
      });
    }
    
    const result = marketService.generatePricePrediction(crop, market);
    res.json(result);
  } catch (error) {
    console.error('Error generating prediction:', error);
    res.status(500).json({ success: false, error: 'Failed to generate prediction' });
  }
});

// ==================== PRICE ALERTS ====================

// Set price alert
router.post('/market/alerts', ensureInitialized, (req, res) => {
  try {
    const { phoneNumber, crop, market, thresholdType, thresholdPrice } = req.body;
    
    if (!phoneNumber || !crop) {
      return res.status(400).json({
        success: false,
        error: 'phoneNumber and crop are required'
      });
    }
    
    const result = marketService.setPriceAlert({
      phoneNumber,
      crop,
      market,
      thresholdType,
      thresholdPrice
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error setting price alert:', error);
    res.status(500).json({ success: false, error: 'Failed to set alert' });
  }
});

// Get user price alerts
router.get('/market/alerts/:phoneNumber', ensureInitialized, (req, res) => {
  try {
    const { phoneNumber } = req.params;
    const result = marketService.getUserPriceAlerts(phoneNumber);
    res.json(result);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch alerts' });
  }
});

// Delete price alert
router.delete('/market/alerts/:id', ensureInitialized, (req, res) => {
  try {
    const { id } = req.params;
    const result = marketService.deletePriceAlert(parseInt(id));
    res.json(result);
  } catch (error) {
    console.error('Error deleting alert:', error);
    res.status(500).json({ success: false, error: 'Failed to delete alert' });
  }
});

// Check price alerts (for cron job)
router.get('/market/alerts/check', ensureInitialized, (req, res) => {
  try {
    const result = marketService.checkPriceAlerts();
    res.json(result);
  } catch (error) {
    console.error('Error checking alerts:', error);
    res.status(500).json({ success: false, error: 'Failed to check alerts' });
  }
});

// ==================== BUYERS ====================

// Register buyer
router.post('/market/buyers', ensureInitialized, (req, res) => {
  try {
    const {
      buyerName, buyerType, contactPerson, phone, email,
      location, county, cropsInterested, quantityNeeded, priceOffering
    } = req.body;
    
    if (!buyerName || !phone) {
      return res.status(400).json({
        success: false,
        error: 'buyerName and phone are required'
      });
    }
    
    const result = marketService.registerBuyer({
      buyerName, buyerType, contactPerson, phone, email,
      location, county, cropsInterested, quantityNeeded, priceOffering
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error registering buyer:', error);
    res.status(500).json({ success: false, error: 'Failed to register buyer' });
  }
});

// Get buyers
router.get('/market/buyers', ensureInitialized, (req, res) => {
  try {
    const { county, crop } = req.query;
    const result = marketService.getBuyers({ county, crop });
    res.json(result);
  } catch (error) {
    console.error('Error fetching buyers:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch buyers' });
  }
});

// Get buyer details
router.get('/market/buyers/:id', ensureInitialized, (req, res) => {
  try {
    const { id } = req.params;
    const result = marketService.getBuyerDetails(parseInt(id));
    res.json(result);
  } catch (error) {
    console.error('Error fetching buyer:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch buyer' });
  }
});

// ==================== AGRO-DEALERS ====================

// Register agro-dealer
router.post('/market/dealers', ensureInitialized, (req, res) => {
  try {
    const {
      shopName, ownerName, phone, email,
      location, county, subCounty, products, brands,
      hasDelivery, deliveryArea
    } = req.body;
    
    if (!shopName || !phone) {
      return res.status(400).json({
        success: false,
        error: 'shopName and phone are required'
      });
    }
    
    const result = marketService.registerAgroDealer({
      shopName, ownerName, phone, email,
      location, county, subCounty, products, brands,
      hasDelivery, deliveryArea
    });
    
    res.json(result);
  } catch (error) {
    console.error('Error registering dealer:', error);
    res.status(500).json({ success: false, error: 'Failed to register dealer' });
  }
});

// Get agro-dealers
router.get('/market/dealers', ensureInitialized, (req, res) => {
  try {
    const { county, subCounty, product } = req.query;
    const result = marketService.getAgroDealers({ county, subCounty, product });
    res.json(result);
  } catch (error) {
    console.error('Error fetching dealers:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dealers' });
  }
});

// Get agro-dealer details
router.get('/market/dealers/:id', ensureInitialized, (req, res) => {
  try {
    const { id } = req.params;
    const result = marketService.getAgroDealerDetails(parseInt(id));
    res.json(result);
  } catch (error) {
    console.error('Error fetching dealer:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch dealer' });
  }
});

// ==================== MARKET STATS ====================

// Get market statistics
router.get('/market/stats', ensureInitialized, (req, res) => {
  try {
    const result = marketService.getMarketStats();
    res.json(result);
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch stats' });
  }
});

// ==================== ADMIN ====================

// Update price (admin)
router.post('/market/prices/update', ensureInitialized, (req, res) => {
  try {
    const { crop, market, price, unit } = req.body;
    
    if (!crop || !market || !price) {
      return res.status(400).json({
        success: false,
        error: 'crop, market, and price are required'
      });
    }
    
    const result = marketService.updatePrice(crop, market, price, unit);
    res.json(result);
  } catch (error) {
    console.error('Error updating price:', error);
    res.status(500).json({ success: false, error: 'Failed to update price' });
  }
});

export default router;

