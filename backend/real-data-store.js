import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRAINING_DIR = path.join(__dirname, 'training');
const DATA_DIR = path.join(TRAINING_DIR, 'data');
const RAW_DIR = path.join(DATA_DIR, 'raw');
const PROCESSED_DIR = path.join(DATA_DIR, 'processed');
const MODELS_DIR = path.join(TRAINING_DIR, 'models');

function normalizeKey(value) {
  return String(value || '').trim().toLowerCase();
}

function safeNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const rows = [];
  const parseLine = (line) => {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      const next = line[i + 1];

      if (char === '"' && inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current);
    return values.map((value) => value.trim());
  };

  const headers = parseLine(lines[0]);
  lines.slice(1).forEach((line) => {
    const values = parseLine(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  });

  return rows;
}

function readCsvIfExists(filePath) {
  if (!fs.existsSync(filePath)) return [];
  return parseCsv(fs.readFileSync(filePath, 'utf8'));
}

function average(values) {
  const filtered = values.filter(Number.isFinite);
  if (!filtered.length) return null;
  return filtered.reduce((sum, value) => sum + value, 0) / filtered.length;
}

function seasonFromDate(dateText) {
  const month = Number(String(dateText || '').slice(5, 7));
  if (month >= 3 && month <= 5) return 'long_rains';
  if (month >= 10 && month <= 12) return 'short_rains';
  return 'dry';
}

function buildWeatherData(trainingRows) {
  const bucket = new Map();

  trainingRows.forEach((row) => {
    const subCounty = String(row.sub_county || '').trim();
    if (!subCounty) return;
    const season = seasonFromDate(row.date);
    const key = `${normalizeKey(subCounty)}|${season}`;
    const current = bucket.get(key) || {
      sub_county: subCounty,
      season,
      dates: [],
      temperatures: [],
      rainfall: [],
      humidity: [],
      soilMoisture: [],
      soilTemperature: []
    };

    current.dates.push(row.date);
    current.temperatures.push(safeNumber(row.temperature_2m_mean));
    current.rainfall.push(safeNumber(row.precipitation_sum));
    current.humidity.push(safeNumber(row.relative_humidity_2m_mean));
    current.soilMoisture.push(safeNumber(row.soil_moisture_0_to_7cm_mean));
    current.soilTemperature.push(safeNumber(row.soil_temperature_0_to_7cm_mean));

    bucket.set(key, current);
  });

  const nested = {};
  Array.from(bucket.values()).forEach((item) => {
    const subCountyKey = normalizeKey(item.sub_county);
    nested[subCountyKey] = nested[subCountyKey] || {};
    nested[subCountyKey][item.season] = {
      location: item.sub_county,
      season: item.season,
      avgTemperature: average(item.temperatures),
      totalRainfall: item.rainfall.filter(Number.isFinite).reduce((sum, value) => sum + value, 0),
      avgHumidity: average(item.humidity),
      avgSoilMoisture: average(item.soilMoisture),
      avgSoilTemperature: average(item.soilTemperature),
      recordCount: item.dates.length,
      periodStart: item.dates[0] || null,
      periodEnd: item.dates[item.dates.length - 1] || null
    };
  });

  return nested;
}

function buildSoilData(soilRows) {
  const bucket = new Map();

  soilRows.forEach((row) => {
    const subCounty = String(row.sub_county || '').trim();
    const soilType = String(row.soil_type || '').trim();
    if (!subCounty || !soilType) return;

    const key = `${normalizeKey(subCounty)}|${normalizeKey(soilType)}`;
    const current = bucket.get(key) || {
      sub_county: subCounty,
      soil_type: soilType,
      rows: []
    };
    current.rows.push(row);
    bucket.set(key, current);
  });

  const nested = {};
  Array.from(bucket.values()).forEach((item) => {
    const subCountyKey = normalizeKey(item.sub_county);
    const soilTypeKey = normalizeKey(item.soil_type);
    const rows = item.rows;
    nested[subCountyKey] = nested[subCountyKey] || {};
    nested[subCountyKey][soilTypeKey] = {
      pH: average(rows.map((row) => safeNumber(row.soil_ph))),
      nitrogen: average(rows.map((row) => safeNumber(row.nitrogen))),
      phosphorus: average(rows.map((row) => safeNumber(row.phosphorus))),
      potassium: average(rows.map((row) => safeNumber(row.potassium))),
      organicMatter: average(rows.map((row) => safeNumber(row.organic_matter))),
      wards: Array.from(new Set(rows.map((row) => row.ward).filter(Boolean))),
      targetCrops: Array.from(new Set(rows.map((row) => row.target_crop).filter(Boolean))),
      sampleCount: rows.length
    };
  });

  return nested;
}

function signalToTrend(signal) {
  if (signal === 'good') return 'up';
  if (signal === 'low') return 'down';
  return 'stable';
}

function buildMarketRows(rawRows) {
  return rawRows
    .map((row) => ({
      crop: String(row.crop || '').trim(),
      market: String(row.market || '').trim(),
      county: String(row.county || 'Siaya').trim(),
      sub_county: String(row.sub_county || '').trim(),
      price: safeNumber(row.retail_price),
      wholesale_price: safeNumber(row.wholesale_price),
      trend: signalToTrend(String(row.signal || '').trim()),
      signal: String(row.signal || 'fair').trim(),
      average_retail: safeNumber(row.average_retail),
      recorded_at: String(row.observed_at || '').trim() || new Date().toISOString(),
      source: String(row.source || '').trim()
    }))
    .filter((row) => row.crop && row.market)
    .filter((row) => !['local_seed', 'built_in_seed', 'dummy', 'demo'].includes(row.source.toLowerCase()));
}

function readJsonIfExists(filePath, fallback = null) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

class RealDataStore {
  constructor() {
    this.cache = null;
  }

  load() {
    if (this.cache) return this.cache;

    const trainingRows = readCsvIfExists(path.join(PROCESSED_DIR, 'training_dataset_real.csv'));
    const soilReferenceRows = readCsvIfExists(path.join(PROCESSED_DIR, 'siaya_location_soil_reference.csv'));
    const marketRows = readCsvIfExists(path.join(RAW_DIR, 'market_siaya_snapshot.csv'));
    const model = readJsonIfExists(path.join(MODELS_DIR, 'crop_naive_bayes_model.json'), null);
    const sourceManifest = readJsonIfExists(path.join(PROCESSED_DIR, 'training_sources_manifest.json'), {});

    const weatherData = buildWeatherData(trainingRows);
    const soilData = buildSoilData(soilReferenceRows);
    const normalizedMarketRows = buildMarketRows(marketRows);
    const cropCatalog = Array.from(new Set([
      ...normalizedMarketRows.map((row) => row.crop),
      ...soilReferenceRows.map((row) => String(row.target_crop || '').trim()).filter(Boolean),
      ...Object.keys(model?.class_counts || {})
    ])).sort();

    this.cache = {
      loadedAt: new Date().toISOString(),
      trainingRows,
      soilReferenceRows,
      marketRows: normalizedMarketRows,
      weatherData,
      soilData,
      model,
      cropCatalog,
      sourceManifest
    };

    return this.cache;
  }

  reload() {
    this.cache = null;
    return this.load();
  }
}

export default new RealDataStore();
