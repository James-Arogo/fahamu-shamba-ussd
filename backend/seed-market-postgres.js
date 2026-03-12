/**
 * Script to seed PostgreSQL database with market data
 * Run this on Vercel deployment to ensure market tables exist
 * Command: node backend/seed-market-postgres.js
 */

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
