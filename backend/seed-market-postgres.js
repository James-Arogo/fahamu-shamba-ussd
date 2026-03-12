/**
 * Script to seed PostgreSQL database with market data
 * Run this on Vercel deployment to ensure market tables exist
 * Command: npm run seed:market (from root) or node seed-market-postgres.js (from backend)
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables BEFORE importing database module
const envPath = path.join(__dirname, '..', '.env.local');
console.log(`📁 Loading env from: ${envPath}`);
dotenv.config({ path: envPath });

if (!process.env.DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL not set in .env.local');
  console.error('Run: vercel env pull (from project root) first');
  process.exit(1);
}

console.log(`✅ DATABASE_URL loaded (password length: ${process.env.DATABASE_URL.split('@')[0].split(':')[2]?.length || 0})`);

// NOW import database modules after env is loaded
import pool from './database-postgres.js';
import * as marketServicePostgres from './market-service-postgres.js';

async function seedDatabase() {
  try {
    console.log('🌱 Starting PostgreSQL market database seeding...');
    await marketServicePostgres.initializeMarketDatabasePostgres();
    console.log('✅ PostgreSQL market database seeded successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seedDatabase();
