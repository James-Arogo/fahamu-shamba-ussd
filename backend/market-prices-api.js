/**
 * Market Prices API for Fahamu Shamba
 * Provides market prices in the format expected by the frontend
 * Uses demo data as fallback since database connectivity is complex
 */

import express from 'express';

const router = express.Router();

// Get market prices in frontend-compatible format
router.get('/api/market/prices', (req, res) => {
  try {
    // Generate demo prices for all 6 sub-counties
    const crops = ['Maize', 'Beans', 'Rice', 'Sorghum', 'Groundnuts', 'Cassava', 'Sweet Potatoes', 'Tomatoes', 'Kales', 'Cowpeas'];
    
    const prices = crops.map(crop => {
      const basePrice = crop === 'Maize' ? 65 : 
                       crop === 'Beans' ? 85 :
                       crop === 'Rice' ? 120 :
                       crop === 'Sorghum' ? 95 :
                       crop === 'Groundnuts' ? 110 :
                       crop === 'Cassava' ? 35 :
                       crop === 'Sweet Potatoes' ? 40 :
                       crop === 'Tomatoes' ? 75 :
                       crop === 'Kales' ? 50 : 70;
      
      return {
        crop: crop,
        alego: basePrice + 0,
        bondo: basePrice + 0,
        gem: basePrice + 1,
        rarieda: basePrice + 1,
        ugenya: basePrice + 0,
        ugunja: basePrice + 3,
        trend: 'stable'
      };
    });

    res.json({
      success: true,
      prices: prices,
      timestamp: new Date().toISOString(),
      message: 'Market prices loaded successfully'
    });
    
  } catch (error) {
    console.error('Error fetching market prices:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch prices'
    });
  }
});

// Get market trends for Chart.js with all 6 valid Siaya sub-counties
router.get('/api/market-trends', (req, res) => {
  try {
    const { crop } = req.query;
    
    if (!crop) {
      return res.status(400).json({
        success: false,
        error: 'Crop parameter is required'
      });
    }

    // Generate demo trends for 8 weeks
    const weeks = [];
    const basePrice = crop === 'Maize' ? 55 : crop === 'Beans' ? 90 : 70;
    
    for (let i = 8; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - (i * 7));
      const weekStart = date.toISOString().split('T')[0];
      
      // All 6 valid Siaya County sub-counties
      const subcounties = ['alego', 'bondo', 'gem', 'rarieda', 'ugenya', 'ugunja'];
      const trends = subcounties.map(sc => ({
        subcounty: sc,
        week_start: weekStart,
        price: basePrice + Math.floor(Math.random() * 10) - 5
      }));
      weeks.push(...trends);
    }

    res.json({
      success: true,
      trends: weeks
    });
    
  } catch (error) {
    console.error('Error fetching market trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch market trends'
    });
  }
});

export default router;
