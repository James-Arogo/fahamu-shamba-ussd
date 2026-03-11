/**
 * Weather Database Migration
 * Creates tables for storing weather history for ML model training
 */

import Database from 'better-sqlite3';
import pool from './database-postgres.js';
import dotenv from 'dotenv';

dotenv.config();

const USE_POSTGRES = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres');

/**
 * Initialize weather tables for SQLite
 */
function initializeWeatherTablesSQLite(db) {
  console.log('📊 Initializing weather tables (SQLite)...');
  
  try {
    // Current weather snapshots
    db.exec(`
      CREATE TABLE IF NOT EXISTS weather_current (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subcounty TEXT NOT NULL,
        temperature REAL,
        feels_like REAL,
        temp_min REAL,
        temp_max REAL,
        humidity INTEGER,
        pressure INTEGER,
        wind_speed REAL,
        wind_deg INTEGER,
        clouds INTEGER,
        visibility INTEGER,
        description TEXT,
        icon TEXT,
        weather_code INTEGER,
        rain_1h REAL DEFAULT 0,
        rain_3h REAL DEFAULT 0,
        sunrise INTEGER,
        sunset INTEGER,
        source TEXT DEFAULT 'openweathermap',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Hourly forecasts
    db.exec(`
      CREATE TABLE IF NOT EXISTS weather_hourly (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subcounty TEXT NOT NULL,
        forecast_time INTEGER NOT NULL,
        temperature REAL,
        feels_like REAL,
        humidity INTEGER,
        pressure INTEGER,
        wind_speed REAL,
        wind_deg INTEGER,
        clouds INTEGER,
        pop REAL,
        rain REAL DEFAULT 0,
        snow REAL DEFAULT 0,
        description TEXT,
        icon TEXT,
        weather_code INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Daily forecasts
    db.exec(`
      CREATE TABLE IF NOT EXISTS weather_daily (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subcounty TEXT NOT NULL,
        forecast_date TEXT NOT NULL,
        temp_min REAL,
        temp_max REAL,
        temp_avg REAL,
        humidity INTEGER,
        wind_speed REAL,
        pop INTEGER,
        rain REAL DEFAULT 0,
        description TEXT,
        icon TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Agricultural metrics history
    db.exec(`
      CREATE TABLE IF NOT EXISTS weather_agricultural (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subcounty TEXT NOT NULL,
        evapotranspiration REAL,
        soil_moisture REAL,
        soil_temperature REAL,
        uv_index REAL,
        source TEXT DEFAULT 'open-meteo',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Weather advisories
    db.exec(`
      CREATE TABLE IF NOT EXISTS weather_advisories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        subcounty TEXT NOT NULL,
        advisory_type TEXT NOT NULL,
        severity TEXT NOT NULL,
        message TEXT NOT NULL,
        action TEXT,
        valid_from DATETIME DEFAULT CURRENT_TIMESTAMP,
        valid_until DATETIME,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes for better query performance
    db.exec(`CREATE INDEX IF NOT EXISTS idx_weather_current_subcounty ON weather_current(subcounty)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_weather_current_created ON weather_current(created_at)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_weather_hourly_subcounty ON weather_hourly(subcounty)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_weather_hourly_forecast ON weather_hourly(forecast_time)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_weather_daily_subcounty ON weather_daily(subcounty)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_weather_daily_forecast ON weather_daily(forecast_date)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_weather_agri_subcounty ON weather_agricultural(subcounty)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_weather_agri_created ON weather_agricultural(created_at)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_weather_advisories_subcounty ON weather_advisories(subcounty)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_weather_advisories_active ON weather_advisories(is_active)`);
    
    console.log('✅ Weather tables initialized successfully (SQLite)');
  } catch (error) {
    console.error('❌ Error initializing weather tables:', error.message);
    throw error;
  }
}

/**
 * Initialize weather tables for PostgreSQL
 */
async function initializeWeatherTablesPostgreSQL() {
  console.log('📊 Initializing weather tables (PostgreSQL)...');
  
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Current weather snapshots
    await client.query(`
      CREATE TABLE IF NOT EXISTS weather_current (
        id SERIAL PRIMARY KEY,
        subcounty VARCHAR(100) NOT NULL,
        temperature DECIMAL(5,2),
        feels_like DECIMAL(5,2),
        temp_min DECIMAL(5,2),
        temp_max DECIMAL(5,2),
        humidity INTEGER,
        pressure INTEGER,
        wind_speed DECIMAL(5,2),
        wind_deg INTEGER,
        clouds INTEGER,
        visibility INTEGER,
        description VARCHAR(255),
        icon VARCHAR(10),
        weather_code INTEGER,
        rain_1h DECIMAL(5,2) DEFAULT 0,
        rain_3h DECIMAL(5,2) DEFAULT 0,
        sunrise BIGINT,
        sunset BIGINT,
        source VARCHAR(50) DEFAULT 'openweathermap',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Hourly forecasts
    await client.query(`
      CREATE TABLE IF NOT EXISTS weather_hourly (
        id SERIAL PRIMARY KEY,
        subcounty VARCHAR(100) NOT NULL,
        forecast_time BIGINT NOT NULL,
        temperature DECIMAL(5,2),
        feels_like DECIMAL(5,2),
        humidity INTEGER,
        pressure INTEGER,
        wind_speed DECIMAL(5,2),
        wind_deg INTEGER,
        clouds INTEGER,
        pop DECIMAL(3,2),
        rain DECIMAL(5,2) DEFAULT 0,
        snow DECIMAL(5,2) DEFAULT 0,
        description VARCHAR(255),
        icon VARCHAR(10),
        weather_code INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Daily forecasts
    await client.query(`
      CREATE TABLE IF NOT EXISTS weather_daily (
        id SERIAL PRIMARY KEY,
        subcounty VARCHAR(100) NOT NULL,
        forecast_date DATE NOT NULL,
        temp_min DECIMAL(5,2),
        temp_max DECIMAL(5,2),
        temp_avg DECIMAL(5,2),
        humidity INTEGER,
        wind_speed DECIMAL(5,2),
        pop INTEGER,
        rain DECIMAL(5,2) DEFAULT 0,
        description VARCHAR(255),
        icon VARCHAR(10),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Agricultural metrics history
    await client.query(`
      CREATE TABLE IF NOT EXISTS weather_agricultural (
        id SERIAL PRIMARY KEY,
        subcounty VARCHAR(100) NOT NULL,
        evapotranspiration DECIMAL(5,2),
        soil_moisture DECIMAL(5,4),
        soil_temperature DECIMAL(5,2),
        uv_index DECIMAL(4,2),
        source VARCHAR(50) DEFAULT 'open-meteo',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Weather advisories
    await client.query(`
      CREATE TABLE IF NOT EXISTS weather_advisories (
        id SERIAL PRIMARY KEY,
        subcounty VARCHAR(100) NOT NULL,
        advisory_type VARCHAR(50) NOT NULL,
        severity VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        action TEXT,
        valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        valid_until TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_weather_current_subcounty ON weather_current(subcounty)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_weather_current_created ON weather_current(created_at)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_weather_hourly_subcounty ON weather_hourly(subcounty)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_weather_hourly_forecast ON weather_hourly(forecast_time)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_weather_daily_subcounty ON weather_daily(subcounty)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_weather_daily_forecast ON weather_daily(forecast_date)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_weather_agri_subcounty ON weather_agricultural(subcounty)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_weather_agri_created ON weather_agricultural(created_at)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_weather_advisories_subcounty ON weather_advisories(subcounty)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_weather_advisories_active ON weather_advisories(is_active)`);
    
    await client.query('COMMIT');
    console.log('✅ Weather tables initialized successfully (PostgreSQL)');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error initializing weather tables:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Store current weather data
 */
async function storeCurrentWeather(dbAsync, data) {
  try {
    await dbAsync.run(`
      INSERT INTO weather_current (
        subcounty, temperature, feels_like, temp_min, temp_max,
        humidity, pressure, wind_speed, wind_deg, clouds,
        visibility, description, icon, weather_code,
        rain_1h, rain_3h, sunrise, sunset, source
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      data.subcounty,
      data.temperature,
      data.feels_like,
      data.temp_min,
      data.temp_max,
      data.humidity,
      data.pressure,
      data.wind_speed,
      data.wind_deg,
      data.clouds,
      data.visibility,
      data.description,
      data.icon,
      data.weather_code,
      data.rain_1h,
      data.rain_3h,
      data.sunrise,
      data.sunset,
      data.source
    ]);
  } catch (error) {
    console.error('Error storing current weather:', error.message);
  }
}

/**
 * Store hourly forecast data
 */
async function storeHourlyForecast(dbAsync, subcounty, hourlyData) {
  try {
    for (const hour of hourlyData) {
      await dbAsync.run(`
        INSERT INTO weather_hourly (
          subcounty, forecast_time, temperature, feels_like,
          humidity, pressure, wind_speed, wind_deg, clouds,
          pop, rain, snow, description, icon, weather_code
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        subcounty,
        hour.dt,
        hour.temp,
        hour.feels_like,
        hour.humidity,
        hour.pressure,
        hour.wind_speed,
        hour.wind_deg,
        hour.clouds,
        hour.pop,
        hour.rain,
        hour.snow,
        hour.description,
        hour.icon,
        hour.weather_code
      ]);
    }
  } catch (error) {
    console.error('Error storing hourly forecast:', error.message);
  }
}

/**
 * Store daily forecast data
 */
async function storeDailyForecast(dbAsync, subcounty, dailyData) {
  try {
    for (const day of dailyData) {
      await dbAsync.run(`
        INSERT INTO weather_daily (
          subcounty, forecast_date, temp_min, temp_max, temp_avg,
          humidity, wind_speed, pop, rain, description, icon
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        subcounty,
        day.date,
        day.temp_min,
        day.temp_max,
        day.temp_avg,
        day.humidity,
        day.wind_speed,
        day.pop,
        day.rain,
        day.description,
        day.icon
      ]);
    }
  } catch (error) {
    console.error('Error storing daily forecast:', error.message);
  }
}

/**
 * Store agricultural metrics
 */
async function storeAgriculturalMetrics(dbAsync, subcounty, data) {
  try {
    await dbAsync.run(`
      INSERT INTO weather_agricultural (
        subcounty, evapotranspiration, soil_moisture,
        soil_temperature, uv_index, source
      ) VALUES (?, ?, ?, ?, ?, ?)
    `, [
      subcounty,
      data.evapotranspiration,
      data.soil_moisture,
      data.soil_temperature,
      data.uv_index || null,
      data.source
    ]);
  } catch (error) {
    console.error('Error storing agricultural metrics:', error.message);
  }
}

/**
 * Get historical weather data for ML training
 */
async function getHistoricalWeatherData(dbAsync, subcounty, days = 30) {
  try {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
    
    const current = await dbAsync.all(`
      SELECT * FROM weather_current
      WHERE subcounty = ? AND created_at >= ?
      ORDER BY created_at DESC
    `, [subcounty, cutoffDate]);
    
    const hourly = await dbAsync.all(`
      SELECT * FROM weather_hourly
      WHERE subcounty = ? AND created_at >= ?
      ORDER BY forecast_time ASC
    `, [subcounty, cutoffDate]);
    
    const daily = await dbAsync.all(`
      SELECT * FROM weather_daily
      WHERE subcounty = ? AND created_at >= ?
      ORDER BY forecast_date ASC
    `, [subcounty, cutoffDate]);
    
    const agricultural = await dbAsync.all(`
      SELECT * FROM weather_agricultural
      WHERE subcounty = ? AND created_at >= ?
      ORDER BY created_at DESC
    `, [subcounty, cutoffDate]);
    
    return {
      subcounty,
      period_days: days,
      current,
      hourly,
      daily,
      agricultural,
      total_records: current.length + hourly.length + daily.length + agricultural.length
    };
  } catch (error) {
    console.error('Error fetching historical weather data:', error.message);
    throw error;
  }
}

/**
 * Clean up old weather data (keep last 90 days)
 */
async function cleanupOldWeatherData(dbAsync, daysToKeep = 90) {
  try {
    const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000).toISOString();
    
    const tables = ['weather_current', 'weather_hourly', 'weather_daily', 'weather_agricultural'];
    
    for (const table of tables) {
      const result = await dbAsync.run(`
        DELETE FROM ${table}
        WHERE created_at < ?
      `, [cutoffDate]);
      
      console.log(`Cleaned up ${result.changes || 0} old records from ${table}`);
    }
    
    return true;
  } catch (error) {
    console.error('Error cleaning up old weather data:', error.message);
    return false;
  }
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🚀 Running weather database migration...\n');
  
  if (USE_POSTGRES) {
    initializeWeatherTablesPostgreSQL()
      .then(() => {
        console.log('\n✅ PostgreSQL weather database migration completed');
        process.exit(0);
      })
      .catch(error => {
        console.error('\n❌ Migration failed:', error);
        process.exit(1);
      });
  } else {
    const dbPath = './fahamu_shamba.db';
    const db = new Database(dbPath);
    
    try {
      initializeWeatherTablesSQLite(db);
      console.log('\n✅ SQLite weather database migration completed');
      db.close();
      process.exit(0);
    } catch (error) {
      console.error('\n❌ Migration failed:', error);
      db.close();
      process.exit(1);
    }
  }
}

export {
  initializeWeatherTablesSQLite,
  initializeWeatherTablesPostgreSQL,
  storeCurrentWeather,
  storeHourlyForecast,
  storeDailyForecast,
  storeAgriculturalMetrics,
  getHistoricalWeatherData,
  cleanupOldWeatherData
};
