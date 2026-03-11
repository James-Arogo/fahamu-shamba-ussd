/**
 * Weather API Routes for Siaya County
 * Complete weather endpoints for farmer dashboard
 */

import express from 'express';
import weatherService from './weather-service.js';
import {
  storeCurrentWeather,
  storeHourlyForecast,
  storeDailyForecast,
  storeAgriculturalMetrics,
  getHistoricalWeatherData
} from './weather-database-migration.js';

const router = express.Router();

/**
 * GET /api/weather/live/:subcounty
 * Get complete weather bundle for dashboard (current + forecasts + advisories)
 */
router.get('/weather/live/:subcounty', async (req, res) => {
  try {
    const { subcounty } = req.params;
    
    const data = await weatherService.getCompleteWeatherData(subcounty);
    
    // Store in database for ML training (async, don't wait)
    if (req.dbAsync && data.success) {
      storeCurrentWeather(req.dbAsync, data.current).catch(err => 
        console.error('Failed to store current weather:', err)
      );
      storeHourlyForecast(req.dbAsync, data.subcounty, data.hourly).catch(err =>
        console.error('Failed to store hourly forecast:', err)
      );
      storeDailyForecast(req.dbAsync, data.subcounty, data.daily).catch(err =>
        console.error('Failed to store daily forecast:', err)
      );
      if (data.current.agromet) {
        storeAgriculturalMetrics(req.dbAsync, data.subcounty, data.current.agromet).catch(err =>
          console.error('Failed to store agricultural metrics:', err)
        );
      }
    }
    
    res.json(data);
  } catch (error) {
    console.error('Error in /weather/live:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch live weather data'
    });
  }
});

/**
 * GET /api/weather/current/:subcounty
 * Get current weather conditions only
 */
router.get('/weather/current/:subcounty', async (req, res) => {
  try {
    const { subcounty } = req.params;
    
    const current = await weatherService.fetchCurrentWeather(subcounty);
    
    // Store in database
    if (req.dbAsync) {
      storeCurrentWeather(req.dbAsync, current).catch(err =>
        console.error('Failed to store current weather:', err)
      );
    }
    
    res.json({
      success: true,
      data: current,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error in /weather/current:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch current weather'
    });
  }
});

/**
 * GET /api/weather/hourly/:subcounty
 * Get hourly forecast for next 48 hours
 */
router.get('/weather/hourly/:subcounty', async (req, res) => {
  try {
    const { subcounty } = req.params;
    const { hours = 24 } = req.query;
    
    const hourly = await weatherService.fetchHourlyForecast(subcounty);
    const limited = hourly.slice(0, parseInt(hours));
    
    // Store in database
    if (req.dbAsync) {
      storeHourlyForecast(req.dbAsync, subcounty, limited).catch(err =>
        console.error('Failed to store hourly forecast:', err)
      );
    }
    
    res.json({
      success: true,
      subcounty,
      hours: limited.length,
      data: limited,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error in /weather/hourly:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch hourly forecast'
    });
  }
});

/**
 * GET /api/weather/daily/:subcounty
 * Get daily forecast for next 7-14 days
 */
router.get('/weather/daily/:subcounty', async (req, res) => {
  try {
    const { subcounty } = req.params;
    const { days = 7 } = req.query;
    
    const daily = await weatherService.fetchDailyForecast(subcounty, parseInt(days));
    
    // Store in database
    if (req.dbAsync) {
      storeDailyForecast(req.dbAsync, subcounty, daily).catch(err =>
        console.error('Failed to store daily forecast:', err)
      );
    }
    
    res.json({
      success: true,
      subcounty,
      days: daily.length,
      data: daily,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error in /weather/daily:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch daily forecast'
    });
  }
});

/**
 * GET /api/weather/monthly/:subcounty
 * Get monthly outlook (30-day trend)
 */
router.get('/weather/monthly/:subcounty', async (req, res) => {
  try {
    const { subcounty } = req.params;
    
    const monthly = await weatherService.getMonthlyOutlook(subcounty);
    
    res.json({
      success: true,
      data: monthly,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error in /weather/monthly:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch monthly outlook'
    });
  }
});

/**
 * GET /api/weather/agricultural/:subcounty
 * Get agricultural metrics (soil moisture, evapotranspiration, UV)
 */
router.get('/weather/agricultural/:subcounty', async (req, res) => {
  try {
    const { subcounty } = req.params;
    
    const metrics = await weatherService.fetchAgriculturalMetrics(subcounty);
    
    // Store in database
    if (req.dbAsync) {
      storeAgriculturalMetrics(req.dbAsync, subcounty, metrics).catch(err =>
        console.error('Failed to store agricultural metrics:', err)
      );
    }
    
    res.json({
      success: true,
      subcounty,
      data: metrics,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error in /weather/agricultural:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch agricultural metrics'
    });
  }
});

/**
 * GET /api/weather/advisory/:subcounty
 * Get farming advisories based on weather conditions
 */
router.get('/weather/advisory/:subcounty', async (req, res) => {
  try {
    const { subcounty } = req.params;
    
    // Fetch weather data to generate advisories
    const [current, hourly, daily] = await Promise.all([
      weatherService.fetchCurrentWeather(subcounty),
      weatherService.fetchHourlyForecast(subcounty),
      weatherService.fetchDailyForecast(subcounty, 7)
    ]);
    
    const advisories = weatherService.generateFarmingAdvisory(current, hourly, daily);
    
    res.json({
      success: true,
      subcounty,
      location: current.location,
      advisories,
      count: advisories.length,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error in /weather/advisory:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to generate farming advisories'
    });
  }
});

/**
 * GET /api/weather/history/:subcounty
 * Get historical weather data for ML training
 */
router.get('/weather/history/:subcounty', async (req, res) => {
  try {
    const { subcounty } = req.params;
    const { days = 30 } = req.query;
    
    if (!req.dbAsync) {
      return res.status(503).json({
        success: false,
        message: 'Database not available'
      });
    }
    
    const history = await getHistoricalWeatherData(req.dbAsync, subcounty, parseInt(days));
    
    res.json({
      success: true,
      data: history,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error in /weather/history:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch historical weather data'
    });
  }
});

/**
 * GET /api/weather/all-subcounties
 * Get weather summary for all Siaya sub-counties
 */
router.get('/weather/all-subcounties', async (req, res) => {
  try {
    const subcounties = Object.keys(weatherService.SIAYA_SUBCOUNTIES);
    const results = [];
    
    for (const subcounty of subcounties) {
      try {
        const current = await weatherService.fetchCurrentWeather(subcounty);
        results.push({
          subcounty,
          location: current.location,
          temperature: current.temperature,
          description: current.description,
          humidity: current.humidity,
          wind_speed: current.wind_speed,
          rain_1h: current.rain_1h,
          icon: current.icon
        });
      } catch (error) {
        console.error(`Failed to fetch weather for ${subcounty}:`, error.message);
        results.push({
          subcounty,
          error: 'Failed to fetch weather',
          temperature: null
        });
      }
    }
    
    res.json({
      success: true,
      count: results.length,
      data: results,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error in /weather/all-subcounties:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch weather for all sub-counties'
    });
  }
});

/**
 * GET /api/weather/subcounties
 * Get list of supported sub-counties
 */
router.get('/weather/subcounties', (req, res) => {
  try {
    const subcounties = Object.entries(weatherService.SIAYA_SUBCOUNTIES).map(([key, data]) => ({
      key,
      name: data.name,
      lat: data.lat,
      lon: data.lon,
      alias: data.alias
    }));
    
    res.json({
      success: true,
      count: subcounties.length,
      data: subcounties,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error in /weather/subcounties:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch sub-counties list'
    });
  }
});

/**
 * GET /api/weather/compare
 * Compare weather across multiple sub-counties
 */
router.get('/weather/compare', async (req, res) => {
  try {
    const { subcounties } = req.query;
    
    if (!subcounties) {
      return res.status(400).json({
        success: false,
        message: 'Please provide subcounties parameter (comma-separated)'
      });
    }
    
    const list = subcounties.split(',').map(s => s.trim());
    const comparison = [];
    
    for (const subcounty of list) {
      try {
        const current = await weatherService.fetchCurrentWeather(subcounty);
        comparison.push({
          subcounty,
          location: current.location,
          temperature: current.temperature,
          feels_like: current.feels_like,
          humidity: current.humidity,
          wind_speed: current.wind_speed,
          description: current.description,
          rain_1h: current.rain_1h
        });
      } catch (error) {
        comparison.push({
          subcounty,
          error: 'Invalid sub-county or data unavailable'
        });
      }
    }
    
    res.json({
      success: true,
      count: comparison.length,
      data: comparison,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error in /weather/compare:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to compare weather'
    });
  }
});

/**
 * GET /api/weather/best-for-activity
 * Get best sub-county for a specific farming activity
 */
router.get('/weather/best-for-activity', async (req, res) => {
  try {
    const { activity = 'planting' } = req.query;
    
    const subcounties = Object.keys(weatherService.SIAYA_SUBCOUNTIES);
    const weatherData = [];
    
    for (const subcounty of subcounties) {
      try {
        const current = await weatherService.fetchCurrentWeather(subcounty);
        const hourly = await weatherService.fetchHourlyForecast(subcounty);
        
        // Calculate suitability score based on activity
        let score = 0;
        const avgPop = hourly.slice(0, 8).reduce((sum, h) => sum + h.pop, 0) / 8;
        
        if (activity === 'planting') {
          // Prefer moderate rain (30-60%)
          if (avgPop >= 0.3 && avgPop <= 0.6) score += 50;
          if (current.temperature >= 20 && current.temperature <= 30) score += 30;
          if (current.wind_speed < 5) score += 20;
        } else if (activity === 'harvesting') {
          // Prefer dry conditions
          if (avgPop < 0.2) score += 60;
          if (current.temperature >= 20 && current.temperature <= 28) score += 20;
          if (current.wind_speed < 8) score += 20;
        } else if (activity === 'spraying') {
          // Prefer calm, dry conditions
          if (avgPop < 0.1) score += 50;
          if (current.wind_speed < 3) score += 40;
          if (current.temperature < 30) score += 10;
        }
        
        weatherData.push({
          subcounty,
          location: current.location,
          score,
          temperature: current.temperature,
          rain_probability: Math.round(avgPop * 100),
          wind_speed: current.wind_speed,
          description: current.description
        });
      } catch (error) {
        console.error(`Failed to fetch weather for ${subcounty}:`, error.message);
      }
    }
    
    // Sort by score (highest first)
    weatherData.sort((a, b) => b.score - a.score);
    
    res.json({
      success: true,
      activity,
      recommendation: weatherData[0] || null,
      all_options: weatherData,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error in /weather/best-for-activity:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to find best location for activity'
    });
  }
});

/**
 * GET /api/weather/alerts/:subcounty
 * Get active weather alerts for a sub-county
 */
router.get('/weather/alerts/:subcounty', async (req, res) => {
  try {
    const { subcounty } = req.params;
    
    const [current, hourly, daily] = await Promise.all([
      weatherService.fetchCurrentWeather(subcounty),
      weatherService.fetchHourlyForecast(subcounty),
      weatherService.fetchDailyForecast(subcounty, 7)
    ]);
    
    const advisories = weatherService.generateFarmingAdvisory(current, hourly, daily);
    const alerts = advisories.filter(a => a.severity === 'warning');
    
    res.json({
      success: true,
      subcounty,
      location: current.location,
      alert_count: alerts.length,
      alerts,
      all_advisories: advisories,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Error in /weather/alerts:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Failed to fetch weather alerts'
    });
  }
});

export default router;
