/**
 * Migration Script: Add Edit Tracking Columns
 * Run this script to add profile_edits_count and last_profile_edit columns
 * to existing farmer_profiles tables
 * 
 * Usage: node migrate-add-edit-tracking.js
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'fahamu_shamba.db');

console.log('🔄 Running migration: Add Edit Tracking Columns');
console.log(`📁 Database: ${dbPath}`);

try {
  const db = new Database(dbPath);
  
  // Check if columns already exist
  const tableInfo = db.prepare("PRAGMA table_info(farmer_profiles)").all();
  const columnNames = tableInfo.map(col => col.name);
  
  // Add profile_edits_count if not exists
  if (!columnNames.includes('profile_edits_count')) {
    db.exec(`ALTER TABLE farmer_profiles ADD COLUMN profile_edits_count INTEGER DEFAULT 0`);
    console.log('✅ Added column: profile_edits_count');
  } else {
    console.log('⏭️  Column already exists: profile_edits_count');
  }
  
  // Add last_profile_edit if not exists
  if (!columnNames.includes('last_profile_edit')) {
    db.exec(`ALTER TABLE farmer_profiles ADD COLUMN last_profile_edit DATETIME`);
    console.log('✅ Added column: last_profile_edit');
  } else {
    console.log('⏭️  Column already exists: last_profile_edit');
  }
  
  db.close();
  console.log('✅ Migration completed successfully!');
} catch (error) {
  console.error('❌ Migration failed:', error.message);
  process.exit(1);
}
