#!/usr/bin/env node

/**
 * Test the login endpoint
 * Run: node test-login-endpoint.js
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'fahamu_shamba.db');
const db = new Database(dbPath);

console.log('🔐 LOGIN ENDPOINT TEST\n');

// Get all users from database
const allUsers = db.prepare('SELECT id, phone, username, password_hash, name FROM users LIMIT 10').all();

console.log(`📊 Found ${allUsers.length} users in database:\n`);

allUsers.forEach((user, index) => {
  console.log(`${index + 1}. Username: ${user.username}`);
  console.log(`   Phone: ${user.phone}`);
  console.log(`   Name: ${user.name || 'N/A'}`);
  console.log(`   Hash: ${user.password_hash.substring(0, 20)}...`);
  console.log('');
});

// Test login query
console.log('\n🧪 TESTING LOGIN QUERY\n');

const testUsername = 'testfarm';
const normalizedTestUsername = testUsername.trim().toLowerCase();
const stmt = db.prepare('SELECT id, phone, username, password_hash, name FROM users WHERE username = ?');
let user = stmt.get(normalizedTestUsername);

// Fallback: case-insensitive search
if (!user) {
  const fallbackStmt = db.prepare('SELECT id, phone, username, password_hash, name FROM users');
  const allUsers = fallbackStmt.all();
  user = allUsers.find(u => u.username && u.username.toLowerCase() === normalizedTestUsername);
}

if (user) {
  console.log(`✅ Query found user: ${user.username}`);
  console.log(`   ID: ${user.id}`);
  console.log(`   Phone: ${user.phone}`);
} else {
  console.log(`❌ Query did not find user: ${testUsername}`);
  console.log('\n📝 Trying alternative query...\n');
  
  const altStmt = db.prepare('SELECT id, phone, username, password_hash, name FROM users WHERE username = ?');
  const altUser = altStmt.get(testUsername);
  
  if (altUser) {
    console.log(`✅ Found with case-sensitive query: ${altUser.username}`);
  } else {
    console.log(`❌ No user found with username: ${testUsername}`);
  }
}

db.close();
