import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getLiveSiayaMarketSnapshot } from '../live-market-source.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, 'data');
const RAW_DIR = path.join(DATA_DIR, 'raw');
const EXTERNAL_DIR = path.join(DATA_DIR, 'external');
const PROCESSED_DIR = path.join(DATA_DIR, 'processed');
const MODELS_DIR = path.join(__dirname, 'models');

const START_DATE = process.env.TRAINING_START_DATE || '2000-01-01';
const END_DATE = process.env.TRAINING_END_DATE || new Date().toISOString().slice(0, 10);
const OPEN_METEO_ARCHIVE_URL = 'https://archive-api.open-meteo.com/v1/archive';
const OPEN_METEO_DOCS_URL = 'https://open-meteo.com/en/docs/historical-weather-api';
const KALRO_LAND_SOIL_CROP_HUB_URL = 'https://www.kalro.org/land-soil-crop-suitability-hub/';
const DEFAULT_LOCATION_SCOPE = process.env.TRAINING_LOCATION_SCOPE || 'subcounties';
const EXTERNAL_SOIL_FILE = process.env.TRAINING_SOIL_FILE || 'kalro_siaya_soil.csv';
const EXTERNAL_MARKET_FILE = process.env.TRAINING_MARKET_FILE || 'siaya_market_prices.csv';
const OPEN_METEO_DELAY_MS = Number(process.env.OPEN_METEO_DELAY_MS || 30000);
const OPEN_METEO_RATE_LIMIT_BACKOFF_MS = Number(process.env.OPEN_METEO_RATE_LIMIT_BACKOFF_MS || 65000);
const OPEN_METEO_MAX_RETRIES = Number(process.env.OPEN_METEO_MAX_RETRIES || 3);

const WEATHER_DAILY_VARS = [
  'temperature_2m_mean',
  'precipitation_sum',
  'relative_humidity_2m_mean',
  'soil_moisture_0_to_7cm_mean',
  'soil_temperature_0_to_7cm_mean'
];

function ensureDirs() {
  [DATA_DIR, RAW_DIR, EXTERNAL_DIR, PROCESSED_DIR, MODELS_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readBoundaryFeatures() {
  const boundaryFile = path.join(__dirname, '..', '..', 'public', 'js', 'siaya-boundaries.js');
  const raw = fs.readFileSync(boundaryFile, 'utf8');
  const prefix = 'window.SIAYA_BOUNDARIES = ';
  if (!raw.startsWith(prefix)) {
    throw new Error('Unable to parse siaya-boundaries.js');
  }
  const jsonText = raw.slice(prefix.length).replace(/;?\s*$/, '');
  const parsed = JSON.parse(jsonText);
  return parsed.features || [];
}

function loadSiayaLocations() {
  const features = readBoundaryFeatures();
  const wards = features.map((feature) => {
    const props = feature.properties || {};
    const centroid = props.centroid || {};
    return {
      ward: String(props.ward || '').trim(),
      sub_county: String(props.subCounty || '').trim(),
      ward_code: String(props.wardCode || '').trim(),
      lat: Number(centroid.lat),
      lon: Number(centroid.lng)
    };
  }).filter((row) => row.ward && row.sub_county && Number.isFinite(row.lat) && Number.isFinite(row.lon));

  const subCountyMap = new Map();
  wards.forEach((ward) => {
    const key = ward.sub_county;
    const bucket = subCountyMap.get(key) || [];
    bucket.push(ward);
    subCountyMap.set(key, bucket);
  });

  const subCounties = Array.from(subCountyMap.entries()).map(([sub_county, items]) => {
    const lat = items.reduce((sum, row) => sum + row.lat, 0) / items.length;
    const lon = items.reduce((sum, row) => sum + row.lon, 0) / items.length;
    return { sub_county, lat, lon, ward_count: items.length };
  });

  return { wards, subCounties };
}

function toCsv(rows, columns) {
  const escaped = (value) => {
    if (value === null || value === undefined) return '';
    const text = String(value);
    if (text.includes(',') || text.includes('\n') || text.includes('"')) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  };
  const header = columns.join(',');
  const lines = rows.map((row) => columns.map((col) => escaped(row[col])).join(','));
  return `${header}\n${lines.join('\n')}\n`;
}

function parseCsv(csvText) {
  const lines = csvText.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(',');
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = (values[idx] || '').trim();
    });
    return row;
  });
}

function seasonFromDate(dateText) {
  const month = Number(dateText.slice(5, 7));
  if (month >= 3 && month <= 5) return 'long_rains';
  if (month >= 10 && month <= 12) return 'short_rains';
  return 'dry';
}

function bucketTemperature(value) {
  if (!Number.isFinite(value)) return 'unknown';
  if (value < 20) return 'cool';
  if (value < 26) return 'moderate';
  return 'hot';
}

function bucketRain(value) {
  if (!Number.isFinite(value)) return 'unknown';
  if (value < 1) return 'none';
  if (value < 5) return 'light';
  if (value < 15) return 'moderate';
  return 'heavy';
}

function bucketHumidity(value) {
  if (!Number.isFinite(value)) return 'unknown';
  if (value < 45) return 'dry';
  if (value < 70) return 'normal';
  return 'humid';
}

async function requestOpenMeteo(lat, lon, startDate, endDate, dailyVars) {
  const params = new URLSearchParams({
    latitude: String(lat),
    longitude: String(lon),
    start_date: startDate,
    end_date: endDate,
    daily: dailyVars.join(','),
    timezone: 'Africa/Nairobi'
  });
  const response = await fetch(`${OPEN_METEO_ARCHIVE_URL}?${params.toString()}`);
  return response.json();
}

async function fetchOpenMeteoDaily(lat, lon, startDate, endDate, attempt = 1) {
  const json = await requestOpenMeteo(lat, lon, startDate, endDate, WEATHER_DAILY_VARS);

  if (json.error) {
    const reason = String(json.reason || 'unknown error');
    if (/rate limit/i.test(reason) && attempt < OPEN_METEO_MAX_RETRIES) {
      console.log(`   ⏳ Open-Meteo rate limit hit, backing off for ${Math.round(OPEN_METEO_RATE_LIMIT_BACKOFF_MS / 1000)}s...`);
      await sleep(OPEN_METEO_RATE_LIMIT_BACKOFF_MS);
      return fetchOpenMeteoDaily(lat, lon, startDate, endDate, attempt + 1);
    }

    const fallbackVars = ['temperature_2m_mean', 'precipitation_sum', 'relative_humidity_2m_mean'];
    const fallbackJson = await requestOpenMeteo(lat, lon, startDate, endDate, fallbackVars);
    if (fallbackJson.error) {
      throw new Error(`Open-Meteo error: ${fallbackJson.reason || reason}`);
    }
    return fallbackJson;
  }

  return json;
}

async function downloadWeatherDataset(locations) {
  const weatherRows = [];
  for (let index = 0; index < locations.length; index += 1) {
    const location = locations[index];
    console.log(`   ↳ [${index + 1}/${locations.length}] ${location.ward || location.sub_county}`);
    const payload = await fetchOpenMeteoDaily(location.lat, location.lon, START_DATE, END_DATE);
    const daily = payload.daily || {};
    const dates = daily.time || [];
    for (let i = 0; i < dates.length; i += 1) {
      weatherRows.push({
        date: dates[i],
        ward: location.ward || '',
        sub_county: location.sub_county,
        ward_code: location.ward_code || '',
        lat: location.lat,
        lon: location.lon,
        temperature_2m_mean: Number(daily.temperature_2m_mean?.[i]),
        precipitation_sum: Number(daily.precipitation_sum?.[i]),
        relative_humidity_2m_mean: Number(daily.relative_humidity_2m_mean?.[i]),
        soil_moisture_0_to_7cm_mean: Number(daily.soil_moisture_0_to_7cm_mean?.[i]),
        soil_temperature_0_to_7cm_mean: Number(daily.soil_temperature_0_to_7cm_mean?.[i])
      });
    }
    await sleep(OPEN_METEO_DELAY_MS);
  }

  const weatherCsv = toCsv(weatherRows, [
    'date',
    'ward',
    'sub_county',
    'ward_code',
    'lat',
    'lon',
    'temperature_2m_mean',
    'precipitation_sum',
    'relative_humidity_2m_mean',
    'soil_moisture_0_to_7cm_mean',
    'soil_temperature_0_to_7cm_mean'
  ]);
  fs.writeFileSync(path.join(RAW_DIR, 'weather_open_meteo_daily.csv'), weatherCsv, 'utf8');
  return weatherRows;
}

function createKalroTemplateIfMissing() {
  const kalroFile = path.join(EXTERNAL_DIR, EXTERNAL_SOIL_FILE);
  if (fs.existsSync(kalroFile)) return kalroFile;

  const template = [
    'sub_county,ward,soil_type,soil_ph,organic_matter,nitrogen,phosphorus,potassium,target_crop,yield_kg_per_ha,source_date',
    'Alego Usonga,Siaya Township,loam,6.5,2.1,0.18,18,140,Maize,3200,2025-06-01'
  ].join('\n');
  fs.writeFileSync(kalroFile, `${template}\n`, 'utf8');
  return kalroFile;
}

function loadKalroSoilData() {
  const kalroFile = createKalroTemplateIfMissing();
  const raw = fs.readFileSync(kalroFile, 'utf8');
  const rows = parseCsv(raw).map((row) => ({
    sub_county: String(row.sub_county || '').trim(),
    ward: String(row.ward || '').trim(),
    soil_type: String(row.soil_type || '').trim(),
    soil_ph: Number(row.soil_ph),
    organic_matter: Number(row.organic_matter),
    nitrogen: Number(row.nitrogen),
    phosphorus: Number(row.phosphorus),
    potassium: Number(row.potassium),
    target_crop: String(row.target_crop || '').trim(),
    yield_kg_per_ha: Number(row.yield_kg_per_ha),
    source_date: String(row.source_date || '').trim()
  }));
  return rows.filter((row) => row.sub_county);
}

async function downloadMarketDataset() {
  const externalMarketFile = path.join(EXTERNAL_DIR, EXTERNAL_MARKET_FILE);
  if (fs.existsSync(externalMarketFile)) {
    const raw = fs.readFileSync(externalMarketFile, 'utf8');
    const rows = parseCsv(raw).map((row) => ({
      crop: String(row.crop || '').trim(),
      market: String(row.market || '').trim(),
      county: String(row.county || 'Siaya').trim(),
      sub_county: String(row.sub_county || '').trim(),
      retail_price: Number(row.retail_price),
      wholesale_price: Number(row.wholesale_price),
      signal: String(row.signal || '').trim(),
      average_retail: Number(row.average_retail),
      observed_at: String(row.observed_at || '').trim(),
      source: String(row.source || 'external_csv').trim()
    })).filter((row) => row.crop && row.sub_county);

    const csv = toCsv(rows, [
      'crop',
      'market',
      'county',
      'sub_county',
      'retail_price',
      'wholesale_price',
      'signal',
      'average_retail',
      'observed_at',
      'source'
    ]);
    fs.writeFileSync(path.join(RAW_DIR, 'market_siaya_snapshot.csv'), csv, 'utf8');
    return rows;
  }

  const snapshot = await getLiveSiayaMarketSnapshot({ forceRefresh: true });
  const rows = (snapshot.prices || []).map((row) => ({
    crop: row.crop,
    market: row.market,
    county: row.county,
    sub_county: row.subCounty,
    retail_price: row.retailPrice,
    wholesale_price: row.wholesalePrice,
    signal: row.signal,
    average_retail: row.averageRetail,
    observed_at: row.observedAt,
    source: row.source
  }));

  const csv = toCsv(rows, [
    'crop',
    'market',
    'county',
    'sub_county',
    'retail_price',
    'wholesale_price',
    'signal',
    'average_retail',
    'observed_at',
    'source'
  ]);
  fs.writeFileSync(path.join(RAW_DIR, 'market_siaya_snapshot.csv'), csv, 'utf8');
  return rows;
}

function buildWardSoilJoinDataset(wards, kalroRows) {
  const kalroByWard = new Map();
  const kalroBySubCounty = new Map();

  kalroRows.forEach((row) => {
    const wardKey = `${row.sub_county}`.toLowerCase() + '|' + `${row.ward}`.toLowerCase();
    const wardBucket = kalroByWard.get(wardKey) || [];
    wardBucket.push(row);
    kalroByWard.set(wardKey, wardBucket);

    const subCountyKey = `${row.sub_county}`.toLowerCase();
    const subCountyBucket = kalroBySubCounty.get(subCountyKey) || [];
    subCountyBucket.push(row);
    kalroBySubCounty.set(subCountyKey, subCountyBucket);
  });

  const rows = wards.map((ward) => {
    const wardKey = `${ward.sub_county}`.toLowerCase() + '|' + `${ward.ward}`.toLowerCase();
    const wardMatch = kalroByWard.get(wardKey) || [];
    const subCountyMatch = kalroBySubCounty.get(`${ward.sub_county}`.toLowerCase()) || [];
    const sourceRows = wardMatch.length ? wardMatch : subCountyMatch;
    const first = sourceRows[0] || {};

    return {
      ward: ward.ward,
      sub_county: ward.sub_county,
      ward_code: ward.ward_code,
      lat: ward.lat,
      lon: ward.lon,
      soil_match_level: wardMatch.length ? 'ward' : (subCountyMatch.length ? 'sub_county' : 'missing'),
      soil_type: first.soil_type || '',
      soil_ph: Number.isFinite(first.soil_ph) ? first.soil_ph : '',
      organic_matter: Number.isFinite(first.organic_matter) ? first.organic_matter : '',
      nitrogen: Number.isFinite(first.nitrogen) ? first.nitrogen : '',
      phosphorus: Number.isFinite(first.phosphorus) ? first.phosphorus : '',
      potassium: Number.isFinite(first.potassium) ? first.potassium : '',
      target_crop: first.target_crop || '',
      yield_kg_per_ha: Number.isFinite(first.yield_kg_per_ha) ? first.yield_kg_per_ha : '',
      soil_data_note: 'GPS provides location only; soil values come from KALRO or external soil measurements.'
    };
  });

  fs.writeFileSync(
    path.join(PROCESSED_DIR, 'siaya_location_soil_reference.csv'),
    toCsv(rows, [
      'ward',
      'sub_county',
      'ward_code',
      'lat',
      'lon',
      'soil_match_level',
      'soil_type',
      'soil_ph',
      'organic_matter',
      'nitrogen',
      'phosphorus',
      'potassium',
      'target_crop',
      'yield_kg_per_ha',
      'soil_data_note'
    ]),
    'utf8'
  );

  return rows;
}

function aggregateWeatherBySubCountyDate(weatherRows) {
  const bucket = new Map();
  weatherRows.forEach((row) => {
    const key = `${row.sub_county}|${row.date}`;
    const current = bucket.get(key) || {
      sub_county: row.sub_county,
      date: row.date,
      count: 0,
      temperature_sum: 0,
      precipitation_sum: 0,
      humidity_sum: 0,
      soil_moisture_sum: 0,
      soil_temp_sum: 0,
      soil_moisture_count: 0,
      soil_temp_count: 0
    };

    current.count += 1;
    current.temperature_sum += Number.isFinite(row.temperature_2m_mean) ? row.temperature_2m_mean : 0;
    current.precipitation_sum += Number.isFinite(row.precipitation_sum) ? row.precipitation_sum : 0;
    current.humidity_sum += Number.isFinite(row.relative_humidity_2m_mean) ? row.relative_humidity_2m_mean : 0;
    if (Number.isFinite(row.soil_moisture_0_to_7cm_mean)) {
      current.soil_moisture_sum += row.soil_moisture_0_to_7cm_mean;
      current.soil_moisture_count += 1;
    }
    if (Number.isFinite(row.soil_temperature_0_to_7cm_mean)) {
      current.soil_temp_sum += row.soil_temperature_0_to_7cm_mean;
      current.soil_temp_count += 1;
    }

    bucket.set(key, current);
  });

  return Array.from(bucket.values()).map((item) => ({
    sub_county: item.sub_county,
    date: item.date,
    temperature_2m_mean: item.count ? item.temperature_sum / item.count : null,
    precipitation_sum: item.count ? item.precipitation_sum / item.count : null,
    relative_humidity_2m_mean: item.count ? item.humidity_sum / item.count : null,
    soil_moisture_0_to_7cm_mean: item.soil_moisture_count ? item.soil_moisture_sum / item.soil_moisture_count : null,
    soil_temperature_0_to_7cm_mean: item.soil_temp_count ? item.soil_temp_sum / item.soil_temp_count : null
  }));
}

function buildTrainingDataset(weatherRows, kalroRows, marketRows) {
  const weatherAgg = aggregateWeatherBySubCountyDate(weatherRows);

  const kalroBySubCounty = new Map();
  kalroRows.forEach((row) => {
    const key = row.sub_county.toLowerCase();
    const bucket = kalroBySubCounty.get(key) || [];
    bucket.push(row);
    kalroBySubCounty.set(key, bucket);
  });

  const marketBySubCounty = new Map();
  marketRows.forEach((row) => {
    const key = String(row.sub_county || '').toLowerCase();
    if (!key) return;
    const bucket = marketBySubCounty.get(key) || [];
    bucket.push(row);
    marketBySubCounty.set(key, bucket);
  });

  const dataset = weatherAgg.map((row) => {
    const subCountyKey = row.sub_county.toLowerCase();
    const kalroBucket = kalroBySubCounty.get(subCountyKey) || [];
    const marketBucket = marketBySubCounty.get(subCountyKey) || [];

    const soilType = kalroBucket[0]?.soil_type || '';
    const soilPhAvg = kalroBucket.length
      ? kalroBucket.reduce((sum, item) => sum + (Number.isFinite(item.soil_ph) ? item.soil_ph : 0), 0) / kalroBucket.length
      : null;
    const organicAvg = kalroBucket.length
      ? kalroBucket.reduce((sum, item) => sum + (Number.isFinite(item.organic_matter) ? item.organic_matter : 0), 0) / kalroBucket.length
      : null;

    const marketRetailAvg = marketBucket.length
      ? marketBucket.reduce((sum, item) => sum + (Number.isFinite(item.retail_price) ? item.retail_price : 0), 0) / marketBucket.length
      : null;

    const majoritySignal = (() => {
      if (!marketBucket.length) return '';
      const counts = marketBucket.reduce((acc, item) => {
        const key = item.signal || 'fair';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    })();

    const targetCrop = kalroBucket[0]?.target_crop || '';
    const yieldKgPerHa = kalroBucket[0]?.yield_kg_per_ha || null;

    return {
      date: row.date,
      sub_county: row.sub_county,
      season: seasonFromDate(row.date),
      temperature_2m_mean: row.temperature_2m_mean,
      precipitation_sum: row.precipitation_sum,
      relative_humidity_2m_mean: row.relative_humidity_2m_mean,
      soil_moisture_0_to_7cm_mean: row.soil_moisture_0_to_7cm_mean,
      soil_temperature_0_to_7cm_mean: row.soil_temperature_0_to_7cm_mean,
      soil_type: soilType,
      soil_ph_avg: soilPhAvg,
      organic_matter_avg: organicAvg,
      market_retail_avg: marketRetailAvg,
      market_signal: majoritySignal,
      target_crop: targetCrop,
      yield_kg_per_ha: yieldKgPerHa
    };
  });

  const csv = toCsv(dataset, [
    'date',
    'sub_county',
    'season',
    'temperature_2m_mean',
    'precipitation_sum',
    'relative_humidity_2m_mean',
    'soil_moisture_0_to_7cm_mean',
    'soil_temperature_0_to_7cm_mean',
    'soil_type',
    'soil_ph_avg',
    'organic_matter_avg',
    'market_retail_avg',
    'market_signal',
    'target_crop',
    'yield_kg_per_ha'
  ]);
  fs.writeFileSync(path.join(PROCESSED_DIR, 'training_dataset_real.csv'), csv, 'utf8');
  return dataset;
}

function trainNaiveBayes(dataset) {
  const labeled = dataset.filter((row) => row.target_crop);
  if (!labeled.length) {
    return {
      trained: false,
      reason: 'No target_crop labels found. Add rows to data/external/kalro_siaya_soil.csv.'
    };
  }

  const toFeatures = (row) => ({
    sub_county: row.sub_county || 'unknown',
    season: row.season || 'unknown',
    soil_type: row.soil_type || 'unknown',
    temperature_bucket: bucketTemperature(Number(row.temperature_2m_mean)),
    rain_bucket: bucketRain(Number(row.precipitation_sum)),
    humidity_bucket: bucketHumidity(Number(row.relative_humidity_2m_mean)),
    market_signal: row.market_signal || 'unknown'
  });

  const classes = Array.from(new Set(labeled.map((row) => row.target_crop)));
  const splitIndex = Math.max(1, Math.floor(labeled.length * 0.8));
  const trainRows = labeled.slice(0, splitIndex);
  const testRows = labeled.slice(splitIndex);

  const classCounts = {};
  const featureCounts = {};
  const featureValues = {};
  const featureKeys = Object.keys(toFeatures(labeled[0]));

  classes.forEach((cls) => {
    classCounts[cls] = 0;
    featureCounts[cls] = {};
    featureKeys.forEach((key) => {
      featureCounts[cls][key] = {};
      featureValues[key] = featureValues[key] || new Set();
    });
  });

  trainRows.forEach((row) => {
    const cls = row.target_crop;
    classCounts[cls] += 1;
    const features = toFeatures(row);
    featureKeys.forEach((key) => {
      const value = features[key];
      featureValues[key].add(value);
      featureCounts[cls][key][value] = (featureCounts[cls][key][value] || 0) + 1;
    });
  });

  const totalTrain = trainRows.length;
  const priors = {};
  classes.forEach((cls) => {
    priors[cls] = classCounts[cls] / totalTrain;
  });

  const predict = (row) => {
    const features = toFeatures(row);
    const scores = {};

    classes.forEach((cls) => {
      const prior = Math.log(priors[cls] || 1e-9);
      let score = prior;
      featureKeys.forEach((key) => {
        const value = features[key];
        const valueCount = featureCounts[cls][key][value] || 0;
        const classTotal = classCounts[cls];
        const vocabSize = featureValues[key].size || 1;
        const likelihood = (valueCount + 1) / (classTotal + vocabSize);
        score += Math.log(likelihood);
      });
      scores[cls] = score;
    });

    return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  };

  const evalRows = testRows.length ? testRows : trainRows;
  let correct = 0;
  evalRows.forEach((row) => {
    const pred = predict(row);
    if (pred === row.target_crop) correct += 1;
  });
  const accuracy = evalRows.length ? correct / evalRows.length : 0;

  const model = {
    trained_at: new Date().toISOString(),
    algorithm: 'categorical_naive_bayes',
    features: featureKeys,
    classes,
    priors,
    class_counts: classCounts,
    feature_counts: featureCounts,
    feature_values: Object.fromEntries(
      Object.entries(featureValues).map(([key, set]) => [key, Array.from(set)])
    ),
    metrics: {
      train_samples: trainRows.length,
      eval_samples: evalRows.length,
      accuracy
    }
  };

  fs.writeFileSync(
    path.join(MODELS_DIR, 'crop_naive_bayes_model.json'),
    JSON.stringify(model, null, 2),
    'utf8'
  );

  return { trained: true, accuracy, samples: labeled.length };
}

async function run() {
  ensureDirs();

  const { wards, subCounties } = loadSiayaLocations();
  const weatherLocations = DEFAULT_LOCATION_SCOPE === 'subcounties' ? subCounties : wards;
  fs.writeFileSync(
    path.join(RAW_DIR, 'siaya_wards_centroids.csv'),
    toCsv(wards, ['ward', 'sub_county', 'ward_code', 'lat', 'lon']),
    'utf8'
  );
  fs.writeFileSync(
    path.join(RAW_DIR, 'siaya_subcounties_centroids.csv'),
    toCsv(subCounties, ['sub_county', 'lat', 'lon', 'ward_count']),
    'utf8'
  );

  console.log(`📍 Loaded ${wards.length} wards and ${subCounties.length} sub-counties.`);
  console.log(`🌦️ Downloading Open-Meteo daily history (${START_DATE} → ${END_DATE}) using ${DEFAULT_LOCATION_SCOPE} centroids...`);
  const weatherRows = await downloadWeatherDataset(weatherLocations);
  console.log(`✅ Weather rows downloaded: ${weatherRows.length}`);

  console.log('🧪 Loading KALRO soil dataset (or template)...');
  const kalroRows = loadKalroSoilData();
  fs.writeFileSync(
    path.join(RAW_DIR, 'kalro_siaya_soil_normalized.csv'),
    toCsv(kalroRows, [
      'sub_county',
      'ward',
      'soil_type',
      'soil_ph',
      'organic_matter',
      'nitrogen',
      'phosphorus',
      'potassium',
      'target_crop',
      'yield_kg_per_ha',
      'source_date'
    ]),
    'utf8'
  );
  console.log(`✅ KALRO rows loaded: ${kalroRows.length}`);
  const wardSoilRows = buildWardSoilJoinDataset(wards, kalroRows);
  console.log(`✅ Ward-to-soil reference rows built: ${wardSoilRows.length}`);

  console.log('💹 Downloading Siaya market snapshot...');
  const marketRows = await downloadMarketDataset();
  console.log(`✅ Market rows downloaded: ${marketRows.length}`);

  console.log('🧩 Building merged training dataset...');
  const trainingRows = buildTrainingDataset(weatherRows, kalroRows, marketRows);
  console.log(`✅ Training rows built: ${trainingRows.length}`);

  console.log('🤖 Training baseline model...');
  const trainingResult = trainNaiveBayes(trainingRows);
  if (trainingResult.trained) {
    console.log(`✅ Model trained. Accuracy: ${(trainingResult.accuracy * 100).toFixed(2)}%`);
  } else {
    console.log(`⚠️ Model not trained: ${trainingResult.reason}`);
  }

  const sourceManifest = {
    generated_at: new Date().toISOString(),
    county: 'Siaya',
    weather_source: {
      provider: 'Open-Meteo Historical Weather API',
      url: OPEN_METEO_DOCS_URL,
      api_base_url: OPEN_METEO_ARCHIVE_URL,
      coverage: {
        start_date: START_DATE,
        end_date: END_DATE,
        location_scope: DEFAULT_LOCATION_SCOPE
      },
      variables: WEATHER_DAILY_VARS
    },
    soil_source: {
      provider: 'KALRO Land Soil Crop Suitability Hub / external soil CSV',
      url: KALRO_LAND_SOIL_CROP_HUB_URL,
      external_file: path.join(EXTERNAL_DIR, EXTERNAL_SOIL_FILE),
      note: 'GPS/centroids identify ward and sub-county. Soil chemistry values must come from KALRO or another measured soil dataset.'
    },
    market_source: {
      provider: fs.existsSync(path.join(EXTERNAL_DIR, EXTERNAL_MARKET_FILE))
        ? 'External CSV import'
        : 'Live Siaya market snapshot via existing market source',
      external_file: path.join(EXTERNAL_DIR, EXTERNAL_MARKET_FILE)
    },
    outputs: {
      wards_centroids_csv: path.join(RAW_DIR, 'siaya_wards_centroids.csv'),
      subcounties_centroids_csv: path.join(RAW_DIR, 'siaya_subcounties_centroids.csv'),
      weather_csv: path.join(RAW_DIR, 'weather_open_meteo_daily.csv'),
      soil_csv: path.join(RAW_DIR, 'kalro_siaya_soil_normalized.csv'),
      market_csv: path.join(RAW_DIR, 'market_siaya_snapshot.csv'),
      ward_soil_reference_csv: path.join(PROCESSED_DIR, 'siaya_location_soil_reference.csv'),
      training_dataset_csv: path.join(PROCESSED_DIR, 'training_dataset_real.csv'),
      model_json: path.join(MODELS_DIR, 'crop_naive_bayes_model.json')
    }
  };
  fs.writeFileSync(
    path.join(PROCESSED_DIR, 'training_sources_manifest.json'),
    JSON.stringify(sourceManifest, null, 2),
    'utf8'
  );

  console.log('\n📦 Outputs:');
  console.log(`- ${path.join(RAW_DIR, 'weather_open_meteo_daily.csv')}`);
  console.log(`- ${path.join(RAW_DIR, 'siaya_wards_centroids.csv')}`);
  console.log(`- ${path.join(PROCESSED_DIR, 'siaya_location_soil_reference.csv')}`);
  console.log(`- ${path.join(RAW_DIR, 'market_siaya_snapshot.csv')}`);
  console.log(`- ${path.join(PROCESSED_DIR, 'training_dataset_real.csv')}`);
  console.log(`- ${path.join(PROCESSED_DIR, 'training_sources_manifest.json')}`);
  console.log(`- ${path.join(MODELS_DIR, 'crop_naive_bayes_model.json')} (if labels exist)`);
}

run().catch((error) => {
  console.error('❌ Real data pipeline failed:', error.message);
  process.exitCode = 1;
});
