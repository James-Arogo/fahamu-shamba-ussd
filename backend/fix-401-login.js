#!/usr/bin/env node

/**
 * Fix 401 Login Error - Diagnostic and Repair Tool
 * 
 * This script:
 * 1. Checks all users and their password hashes
 * 2. Identifies users with missing/empty password hashes
 * 3. Tests password verification for existing users
 * 4. Provides clear reporting
 */

import Database from 'better-sqlite3';
import bcryptjs from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'fahamu_shamba.db');
const db = new Database(dbPath);

console.log('\n╔════════════════════════════════════════════════════════════════╗');
console.log('║           LOGIN 401 ERROR - DIAGNOSTIC & REPAIR TOOL            ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// Get all users
const users = db.prepare('SELECT id, phone, username, password_hash, name, created_at FROM users ORDER BY id DESC').all();

if (users.length === 0) {
  console.log('❌ No users found in database. This is a new database.\n');
  process.exit(0);
}

console.log(`📊 Found ${users.length} user(s) in database:\n`);
console.log('┌─────┬──────────────┬─────────────────┬──────────────────┬─────────────────────┐');
console.log('│ ID  │ Username     │ Phone           │ Hash Status      │ Created             │');
console.log('├─────┼──────────────┼─────────────────┼──────────────────┼─────────────────────┤');

const problemUsers = [];

users.forEach((user) => {
  const hashStatus = user.password_hash 
    ? (user.password_hash.length > 30 ? '✅ Present' : '⚠️ Too Short')
    : '❌ MISSING';
  
  const username = (user.username || 'N/A').padEnd(12);
  const phone = (user.phone || 'N/A').padEnd(15);
  const hash = hashStatus.padEnd(16);
  const created = (user.created_at || 'N/A').substring(0, 19);
  
  console.log(`│ ${String(user.id).padEnd(3)} │ ${username} │ ${phone} │ ${hash} │ ${created} │`);
  
  if (!user.password_hash || user.password_hash.length < 30) {
    problemUsers.push(user);
  }
});

console.log('└─────┴──────────────┴─────────────────┴──────────────────┴─────────────────────┘\n');

if (problemUsers.length > 0) {
  console.log('⚠️  ISSUES FOUND:\n');
  problemUsers.forEach((user) => {
    const reason = !user.password_hash ? 'MISSING password hash' : 'password hash too short';
    console.log(`   ❌ User ID ${user.id} (${user.username}): ${reason}`);
  });
  console.log('\n   ➜ These users CANNOT login. They need to be recreated.\n');
}

// Test password verification if TEST_PASSWORD is provided
const testPassword = process.argv[2];
const testUsername = process.argv[3];

if (testPassword && testUsername) {
  console.log('🔐 Testing password verification:\n');
  
  const testUser = users.find(u => u.username && u.username.toLowerCase() === testUsername.toLowerCase());
  
  if (!testUser) {
    console.log(`   ❌ User "${testUsername}" not found\n`);
  } else {
    console.log(`   👤 User found: ${testUser.username} (ID: ${testUser.id})`);
    
    if (!testUser.password_hash) {
      console.log(`   ❌ User has no password hash - cannot verify\n`);
    } else {
      bcryptjs.compare(testPassword, testUser.password_hash, (err, isMatch) => {
        if (err) {
          console.log(`   ❌ Verification error: ${err.message}\n`);
        } else if (isMatch) {
          console.log(`   ✅ Password MATCHES - Login should work\n`);
        } else {
          console.log(`   ❌ Password DOES NOT MATCH - Check if password is correct\n`);
        }
        showRecommendations();
      });
    }
  }
} else {
  showRecommendations();
}

function showRecommendations() {
  console.log('📋 RECOMMENDATIONS:\n');
  
  if (problemUsers.length > 0) {
    console.log('   1. ⚠️  DELETE problem users and recreate them:');
    problemUsers.forEach(user => {
      console.log(`      DELETE FROM users WHERE id = ${user.id};`);
    });
    console.log('\n   2. Go to login page and create new account\n');
  } else {
    console.log('   1. ✅ All users have password hashes\n');
    console.log('   2. 🔐 Verify you\'re using the correct password\n');
    console.log('   3. 📝 Check console logs for more details:\n');
    console.log('      - Use: npm start (to see server logs)\n');
    console.log('      - Look for password verification logs\n');
  }
  
  console.log('   4. 🔧 Clear browser cache and try again:\n');
  console.log('      - Press Ctrl+Shift+Delete in browser\n');
  console.log('      - Or use Incognito/Private window\n');
  
  console.log('   5. 📖 Test with provided test credentials:\n');
  console.log('      node backend/fix-401-login.js <password> <username>\n');
  console.log(`      Example: node backend/fix-401-login.js mypassword farmer04\n`);
  
  process.exit(0);
}
