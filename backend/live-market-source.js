import fetch from 'node-fetch';

const DEFAULT_LIVE_SOURCE_URL = 'https://portal.mkulimabora.org/market-prices/admin/k2/api.php';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

let cachedSnapshot = null;
let cachedAt = 0;

const ENTITY_MAP = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&quot;': '"',
  '&#039;': "'"
};

const MARKET_TO_SUBCOUNTY = {
  bondo: 'Bondo',
  ugunja: 'Ugunja',
  yala: 'Ugunja',
  siaya: 'Alego Usonga',
  akala: 'Gem',
  gem: 'Gem',
  aram: 'Rarieda',
  rarieda: 'Rarieda',
  ugenya: 'Ugenya'
};

const CROP_ALIASES = new Map([
  ['green maize', 'Maize'],
  ['dry maize', 'Maize'],
  ['maize', 'Maize'],
  ['beans (mwezi moja)', 'Beans'],
  ['mixed beans', 'Beans'],
  ['beans', 'Beans'],
  ['beans red haricot (wairimu)', 'Beans'],
  ['beans (yellow-green)', 'Beans'],
  ['ground nuts', 'Groundnuts'],
  ['groundnuts', 'Groundnuts'],
  ['cassava fresh', 'Cassava'],
  ['cassava', 'Cassava'],
  ['cassava chips (dry)', 'Cassava Chips'],
  ['sweet potatoes', 'Sweet Potatoes'],
  ['sweet potatoes ', 'Sweet Potatoes'],
  ['sweet potatoes', 'Sweet Potatoes'],
  ['rice', 'Rice'],
  ['finger millet', 'Millet'],
  ['millet', 'Millet'],
  ['sorghum', 'Sorghum'],
  ['cowpeas', 'Cowpeas'],
  ['green grams', 'Green Grams'],
  ['tomatoes', 'Tomatoes'],
  ['black nightshade (managu/ osuga)', 'Black Nightshade'],
  ['amaranthus (terere)', 'Amaranthus'],
  ['cowpea leaves (kunde)', 'Cowpea Leaves'],
  ['spider flower (saga)', 'Spider Flower'],
  ['pumpkin leaves', 'Pumpkin Leaves'],
  ['spinach', 'Spinach'],
  ['dry onions', 'Dry Onions'],
  ['spring onions', 'Spring Onions'],
  ['coriander (dhania)', 'Coriander'],
  ['capsicums', 'Capsicums'],
  ['kales', 'Kales']
]);

function decodeEntities(text) {
  return Object.entries(ENTITY_MAP).reduce(
    (current, [entity, replacement]) => current.split(entity).join(replacement),
    text
  );
}

function sanitizeText(value) {
  return decodeEntities(String(value || ''))
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, '\n')
    .replace(/\r/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function normalizeCropName(rawName) {
  const cleaned = String(rawName || '').trim().replace(/\s+/g, ' ');
  const key = cleaned.toLowerCase();
  return CROP_ALIASES.get(key) || cleaned.split(' ').map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(' ');
}

function parseNumeric(value) {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).replace(/,/g, '').trim();
  if (!cleaned || cleaned === '-' || cleaned === '0.00') return null;
  const parsed = Number.parseFloat(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseObservedAt(value) {
  if (!value) return null;
  const normalized = String(value).replace(/\./g, '');
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function inferSubCounty(marketName) {
  const normalized = String(marketName || '').toLowerCase();
  const match = Object.keys(MARKET_TO_SUBCOUNTY).find(key => normalized.includes(key));
  return match ? MARKET_TO_SUBCOUNTY[match] : null;
}

function classifyPriceSignal(retailPrice, averageRetail) {
  if (!retailPrice || !averageRetail) return 'fair';
  if (retailPrice >= averageRetail * 1.08) return 'good';
  if (retailPrice <= averageRetail * 0.92) return 'low';
  return 'fair';
}

function buildUnavailableSnapshot(reason) {
  return {
    success: true,
    provider: 'unavailable',
    sourceUrl: null,
    fetchedAt: new Date().toISOString(),
    observedAt: null,
    isFallback: false,
    notes: reason || 'No live market data is currently available.',
    prices: []
  };
}

function enrichSnapshot(rows, meta) {
  const prices = rows.filter(row => row.county === 'Siaya');
  const cropAverages = new Map();

  prices.forEach((row) => {
    if (!row.retailPrice) return;
    const bucket = cropAverages.get(row.crop) || [];
    bucket.push(row.retailPrice);
    cropAverages.set(row.crop, bucket);
  });

  const enriched = prices.map((row) => {
    const cropPrices = cropAverages.get(row.crop) || [];
    const averageRetail = cropPrices.length
      ? cropPrices.reduce((sum, value) => sum + value, 0) / cropPrices.length
      : null;

    return {
      ...row,
      signal: classifyPriceSignal(row.retailPrice, averageRetail),
      averageRetail: averageRetail ? Math.round(averageRetail * 100) / 100 : null
    };
  });

  const freshestObservedAt = enriched
    .map(row => row.observedAt)
    .filter(Boolean)
    .sort()
    .slice(-1)[0] || null;

  return {
    success: true,
    provider: meta.provider,
    sourceUrl: meta.sourceUrl,
    fetchedAt: meta.fetchedAt,
    observedAt: freshestObservedAt,
    isFallback: meta.provider !== 'mkulima_bora' && enriched.length > 0,
    notes: meta.notes,
    prices: enriched
  };
}

function parseMkulimaBoraPayload(rawText) {
  const text = sanitizeText(rawText);
  const recordPattern = /([A-Za-z][A-Za-z0-9\s(),/'-]{1,80})\s+Wholesale Price:\s*\|?\s*(?:Ksh)?\s*([\d,]+(?:\.\d+)?)\s*\/?\s*([A-Za-z0-9()/-]+)?\s+Retail Price:\s*\|?\s*(?:Ksh)?\s*([\d,]+(?:\.\d+)?)\s*\/?\s*([A-Za-z0-9()/-]+)?\s+Market:\s*\|?\s*([A-Za-z][A-Za-z0-9\s(),/'-]{1,80})\s+County:\s*\|?\s*([A-Za-z][A-Za-z0-9\s(),/'-]{1,40})\s+Suppy Volume:\s*\|?\s*([\d,]+(?:\.\d+)?)?\s+((?:Mon|Tue|Wed|Thu|Fri|Sat|Sun),\s+\d{2}\s+[A-Za-z]{3}\.?\s+\d{4})/g;
  const rows = [];
  const seen = new Set();
  let match;

  while ((match = recordPattern.exec(text)) !== null) {
    const crop = normalizeCropName(match[1]);
    const market = String(match[6] || '').trim();
    const county = String(match[7] || '').trim();
    const observedAt = parseObservedAt(match[9]);
    const row = {
      crop,
      market,
      county,
      subCounty: inferSubCounty(market),
      wholesalePrice: parseNumeric(match[2]),
      retailPrice: parseNumeric(match[4]),
      unit: (match[5] || match[3] || 'Kg').trim(),
      volume: parseNumeric(match[8]),
      observedAt,
      source: 'mkulima_bora'
    };

    const dedupeKey = `${row.crop}|${row.market}|${row.observedAt}|${row.retailPrice}`;
    if (!seen.has(dedupeKey) && row.county.toLowerCase() === 'siaya') {
      seen.add(dedupeKey);
      rows.push(row);
    }
  }

  return rows;
}

export async function getLiveSiayaMarketSnapshot(options = {}) {
  const forceRefresh = options.forceRefresh === true;
  if (!forceRefresh && cachedSnapshot && (Date.now() - cachedAt) < CACHE_TTL_MS) {
    return cachedSnapshot;
  }

  const sourceUrl = process.env.MARKET_LIVE_SOURCE_URL || DEFAULT_LIVE_SOURCE_URL;

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        'User-Agent': 'FahamuShamba/1.0 MarketSync'
      },
      timeout: 15000
    });

    if (!response.ok) {
      throw new Error(`Live source returned ${response.status}`);
    }

    const body = await response.text();
    const parsedRows = parseMkulimaBoraPayload(body);

    if (!parsedRows.length) {
      throw new Error('Live market parser returned no Siaya rows');
    }

    cachedSnapshot = enrichSnapshot(parsedRows, {
      provider: 'mkulima_bora',
      sourceUrl,
      fetchedAt: new Date().toISOString(),
      notes: 'Live external market feed for Siaya prices.'
    });
    cachedAt = Date.now();
    return cachedSnapshot;
  } catch (error) {
    console.warn('Live market source failed; returning empty market snapshot:', error.message);
    cachedSnapshot = buildUnavailableSnapshot('No live market prices are currently available from the external source.');
    cachedAt = Date.now();
    return cachedSnapshot;
  }
}

export default {
  getLiveSiayaMarketSnapshot
};
