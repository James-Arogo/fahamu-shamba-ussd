import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SEEDED_MARKETS = [
  ['Siaya Town Market', 'Siaya', 'Siaya', 'Alego Usonga'],
  ['Bondo Market', 'Bondo', 'Siaya', 'Bondo'],
  ['Yala Market', 'Yala', 'Siaya', 'Ugunja'],
  ['Ugunja Market', 'Ugunja', 'Siaya', 'Ugunja'],
  ['Gem Market', 'Gem', 'Siaya', 'Gem'],
  ['Rarieda Market', 'Rarieda', 'Siaya', 'Rarieda'],
  ['Ugenya Market', 'Ugenya', 'Siaya', 'Ugenya']
];

const SEEDED_PRICE_KEYS = new Set([
  'Maize|Siaya Town Market|65|kg',
  'Beans|Siaya Town Market|85|kg',
  'Cowpeas|Siaya Town Market|70|kg',
  'Tomatoes|Siaya Town Market|75|kg',
  'Rice|Siaya Town Market|120|kg',
  'Sorghum|Siaya Town Market|95|kg',
  'Sweet Potatoes|Siaya Town Market|40|kg',
  'Groundnuts|Siaya Town Market|110|kg',
  'Kales|Siaya Town Market|50|kg',
  'Cassava|Siaya Town Market|35|kg',
  'Sorghum|Bondo Market|95|kg',
  'Cassava|Bondo Market|35|kg',
  'Maize|Bondo Market|65|kg',
  'Beans|Bondo Market|85|kg',
  'Rice|Bondo Market|120|kg',
  'Groundnuts|Bondo Market|110|kg',
  'Tomatoes|Bondo Market|75|kg',
  'Sweet Potatoes|Bondo Market|40|kg',
  'Kales|Bondo Market|50|kg',
  'Cowpeas|Bondo Market|70|kg',
  'Rice|Yala Market|125|kg',
  'Vegetables|Yala Market|45|kg',
  'Beans|Yala Market|88|kg',
  'Maize|Yala Market|62|kg',
  'Groundnuts|Ugunja Market|110|kg',
  'Cowpeas|Ugunja Market|68|kg',
  'Maize|Ugunja Market|68|kg',
  'Beans|Ugunja Market|82|kg',
  'Rice|Ugunja Market|118|kg',
  'Sorghum|Ugunja Market|92|kg',
  'Maize|Gem Market|66|kg',
  'Kales|Gem Market|49|kg',
  'Beans|Gem Market|84|kg',
  'Sorghum|Gem Market|94|kg',
  'Rice|Gem Market|119|kg',
  'Groundnuts|Gem Market|109|kg',
  'Cassava|Gem Market|34|kg',
  'Tomatoes|Gem Market|74|kg',
  'Cowpeas|Gem Market|70|kg',
  'Sweet Potatoes|Gem Market|39|kg',
  'Maize|Rarieda Market|63|kg',
  'Beans|Rarieda Market|86|kg',
  'Sorghum|Rarieda Market|97|kg',
  'Rice|Rarieda Market|122|kg',
  'Groundnuts|Rarieda Market|111|kg',
  'Tomatoes|Rarieda Market|76|kg',
  'Kales|Rarieda Market|51|kg',
  'Cassava|Rarieda Market|38|kg',
  'Sweet Potatoes|Rarieda Market|41|kg',
  'Cowpeas|Rarieda Market|70|kg',
  'Maize|Ugenya Market|64|kg',
  'Beans|Ugenya Market|83|kg',
  'Cassava|Ugenya Market|38|kg',
  'Rice|Ugenya Market|125|kg',
  'Sorghum|Ugenya Market|98|kg',
  'Groundnuts|Ugenya Market|112|kg',
  'Tomatoes|Ugenya Market|78|kg',
  'Kales|Ugenya Market|52|kg',
  'Sweet Potatoes|Ugenya Market|42|kg',
  'Cowpeas|Ugenya Market|70|kg'
]);

const DEMO_USER_MATCHERS = [
  { field: 'username', value: 'demo_user' },
  { field: 'email', value: 'demo@fahamu-shamba.com' }
];

function normalizeUnit(value) {
  return String(value || 'kg').trim().toLowerCase();
}

function isExactSeededMarketSet(rows) {
  if (rows.length !== SEEDED_MARKETS.length) return false;
  const incoming = new Set(rows.map((row) => `${row.name}|${row.location}|${row.county}|${row.sub_county}`));
  return SEEDED_MARKETS.every(([name, location, county, subCounty]) =>
    incoming.has(`${name}|${location}|${county}|${subCounty}`)
  );
}

function areExactSeededPrices(rows) {
  if (!rows.length || rows.length > SEEDED_PRICE_KEYS.size) return false;
  return rows.every((row) => {
    const key = `${row.crop}|${row.market}|${Number(row.price)}|${normalizeUnit(row.unit)}`;
    return SEEDED_PRICE_KEYS.has(key);
  });
}

async function cleanupPostgres() {
  const { Pool } = pg;
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    const summary = {
      db: 'postgres',
      removedDemoUsers: 0,
      removedSeededMarketRows: 0,
      removedSeededMarkets: 0
    };

    for (const matcher of DEMO_USER_MATCHERS) {
      const result = await pool.query(`DELETE FROM users WHERE ${matcher.field} = $1`, [matcher.value]);
      summary.removedDemoUsers += result.rowCount || 0;
    }

    const markets = await pool.query('SELECT name, location, county, sub_county FROM market_centers');
    const prices = await pool.query('SELECT crop, market, price, unit FROM market_prices');

    if (isExactSeededMarketSet(markets.rows) && areExactSeededPrices(prices.rows)) {
      const deletedPrices = await pool.query('DELETE FROM market_prices');
      const deletedMarkets = await pool.query('DELETE FROM market_centers');
      summary.removedSeededMarketRows = deletedPrices.rowCount || 0;
      summary.removedSeededMarkets = deletedMarkets.rowCount || 0;
    }

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    await pool.end();
  }
}

async function cleanupSqlite() {
  const { default: Database } = await import('better-sqlite3');
  const db = new Database(path.join(__dirname, 'fahamu_shamba.db'));

  try {
    const summary = {
      db: 'sqlite',
      removedDemoUsers: 0,
      removedSeededMarketRows: 0,
      removedSeededMarkets: 0
    };

    for (const matcher of DEMO_USER_MATCHERS) {
      const result = db.prepare(`DELETE FROM users WHERE ${matcher.field} = ?`).run(matcher.value);
      summary.removedDemoUsers += result.changes || 0;
    }

    const markets = db.prepare('SELECT name, location, county, sub_county FROM market_centers').all();
    const prices = db.prepare('SELECT crop, market, price, unit FROM market_prices').all();

    if (isExactSeededMarketSet(markets) && areExactSeededPrices(prices)) {
      summary.removedSeededMarketRows = db.prepare('DELETE FROM market_prices').run().changes || 0;
      summary.removedSeededMarkets = db.prepare('DELETE FROM market_centers').run().changes || 0;
    }

    console.log(JSON.stringify(summary, null, 2));
  } finally {
    db.close();
  }
}

if (process.env.DATABASE_URL) {
  await cleanupPostgres();
} else {
  await cleanupSqlite();
}
