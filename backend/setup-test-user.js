#!/usr/bin/env node

/**
 * Setup script for test users with proper credentials
 * Run: node setup-test-user.js
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcryptjs from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'fahamu_shamba.db');
const db = new Database(dbPath);

// Test users to create
const testUsers = [
  {
    phone: '0712345678',
    username: 'testfarm',
    password: 'password123',
    name: 'Test Farmer'
  },
  {
    phone: '0798765432',
    username: 'demo_user',
    password: 'demo1234',
    name: 'Demo User'
  },
  {
    phone: '0722222222',
    username: 'john_farmer',
    password: 'john2024',
    name: 'John Farmer'
  }
];

console.log('🌾 FAHAMU SHAMBA - TEST USER SETUP\n');
console.log('Creating test users...\n');

let createdCount = 0;
let skippedCount = 0;

for (const testUser of testUsers) {
  // Normalize phone
  let normalizedPhone = testUser.phone.trim();
  if (normalizedPhone.startsWith('0')) {
    normalizedPhone = '+254' + normalizedPhone.substring(1);
  } else if (normalizedPhone.startsWith('254')) {
    normalizedPhone = '+' + normalizedPhone;
  }

  const normalizedUsername = testUser.username.trim().toLowerCase();

  // Check if user already exists
  const existingStmt = db.prepare('SELECT id FROM users WHERE username = ? OR phone = ?');
  let existing = existingStmt.get(normalizedUsername, normalizedPhone);
  
  // Fallback: case-insensitive search
  if (!existing) {
    const fallbackStmt = db.prepare('SELECT id FROM users');
    const allUsers = fallbackStmt.all();
    existing = allUsers.find(u => u.username && u.username.toLowerCase() === normalizedUsername);
  }

  if (existing) {
    console.log(`⏭️  SKIPPED: ${testUser.username} (already exists)`);
    skippedCount++;
    continue;
  }

  // Hash password
  const passwordHash = bcryptjs.hashSync(testUser.password, 10);

  try {
    // Create user
    const insertStmt = db.prepare(
      'INSERT INTO users (phone, username, password_hash, name, created_at, updated_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
    );
    const result = insertStmt.run(normalizedPhone, normalizedUsername, passwordHash, testUser.name);

    // Create farm profile for the user
    const farmStmt = db.prepare(
      'INSERT INTO farms (user_id, location, ward, farm_size, farm_size_unit, created_at, updated_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
    );
    farmStmt.run(result.lastInsertRowid, 'Nairobi', 'Embakasi', 2, 'acres');

    console.log(`✅ CREATED: ${testUser.username}`);
    console.log(`   ID: ${result.lastInsertRowid}`);
    console.log(`   Phone: ${normalizedPhone}`);
    console.log(`   Password: ${testUser.password}`);
    console.log('');
    createdCount++;
  } catch (error) {
    console.log(`❌ FAILED: ${testUser.username}`);
    console.log(`   Error: ${error.message}\n`);
  }
}

console.log('='.repeat(50));
console.log(`📊 SUMMARY: Created ${createdCount}, Skipped ${skippedCount}\n`);

// Test login with first user
if (createdCount > 0) {
  console.log('🔐 TESTING LOGIN WITH TEST CREDENTIALS\n');

  const stmt = db.prepare('SELECT id, phone, username, password_hash, name FROM users WHERE username = ?');
  let user = stmt.get('testfarm');
  
  // Fallback: case-insensitive search
  if (!user) {
    const fallbackStmt = db.prepare('SELECT id, phone, username, password_hash, name FROM users');
    const allUsers = fallbackStmt.all();
    user = allUsers.find(u => u.username && u.username.toLowerCase() === 'testfarm');
  }

  if (user) {
    const password = 'password123';
    const isValid = bcryptjs.compareSync(password, user.password_hash);
    
    console.log(`User: testfarm`);
    console.log(`Password: ${password}`);
    console.log(`Match: ${isValid ? '✅ YES' : '❌ NO'}\n`);

    if (isValid) {
      console.log('✅ TEST LOGIN SUCCESSFUL!\n');
      console.log('Login Credentials:');
      console.log('  Username: testfarm');
      console.log('  Password: password123\n');
    }
  }
}

console.log('📝 All test credentials ready for use!\n');

db.close();
