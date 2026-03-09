#!/usr/bin/env node

/**
 * Test Login After Fix
 * Simulates the complete login flow with the fixed code
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
console.log('║              LOGIN FLOW TEST (FIXED VERSION)                    ║');
console.log('╚════════════════════════════════════════════════════════════════╝\n');

// Test credentials
const testUsername = process.argv[2] || 'farmer04';
const testPassword = process.argv[3] || 'password123';

console.log(`Testing login with:`);
console.log(`  Username: ${testUsername}`);
console.log(`  Password: ${testPassword}\n`);

async function testLoginFlow() {
  try {
    // Step 1: Normalize username (same as in auth-routes.js)
    const usernameIdentifier = testUsername.trim().toLowerCase();
    console.log(`✓ Step 1: Normalized username to "${usernameIdentifier}"\n`);

    // Step 2: Search for user (NEW FIXED LOGIC)
    console.log('✓ Step 2: Searching for user...');
    
    // Try exact match first
    const stmt = db.prepare('SELECT id, phone, username, password_hash, name FROM users WHERE username = ?');
    let user = stmt.get(usernameIdentifier);
    
    if (user) {
      console.log(`  ✅ Found via exact match: "${user.username}"\n`);
    } else {
      // Fallback to case-insensitive search (NEW LOGIC)
      console.log(`  ℹ️  Not found with exact match, trying case-insensitive...\n`);
      const fallbackStmt = db.prepare('SELECT id, phone, username, password_hash, name FROM users');
      const allUsers = fallbackStmt.all();
      const fallbackUser = allUsers.find(u => u.username && u.username.toLowerCase() === usernameIdentifier);
      
      if (fallbackUser) {
        console.log(`  ✅ Found via case-insensitive search: "${fallbackUser.username}"\n`);
        user = fallbackUser;
      }
    }

    if (!user) {
      console.log('  ❌ User not found\n');
      console.log('  Available users:');
      const allUsers = db.prepare('SELECT id, username, phone FROM users').all();
      if (allUsers.length === 0) {
        console.log('    (No users in database)');
      } else {
        allUsers.forEach(u => console.log(`    - ${u.username || 'N/A'} (${u.phone})`));
      }
      return;
    }

    // Step 3: Verify password exists
    console.log('✓ Step 3: Checking password hash...');
    if (!user.password_hash) {
      console.log('  ❌ Password hash is empty/NULL - user cannot login\n');
      console.log('  ⚠️  User needs to be recreated\n');
      return;
    }
    console.log(`  ✅ Hash present: ${user.password_hash.substring(0, 30)}...\n`);

    // Step 4: Verify password
    console.log('✓ Step 4: Verifying password...');
    const isPasswordValid = await bcryptjs.compare(testPassword, user.password_hash);
    console.log(`  ${isPasswordValid ? '✅' : '❌'} Password verification: ${isPasswordValid ? 'MATCH' : 'MISMATCH'}\n`);

    if (!isPasswordValid) {
      // Test with password from environment variable if provided
      const envPassword = process.env.TEST_PASSWORD;
      if (envPassword) {
        console.log(`Testing with environment password...\n`);
        const envMatch = await bcryptjs.compare(envPassword, user.password_hash);
        console.log(`  Environment password test: ${envMatch ? '✅ MATCH' : '❌ MISMATCH'}`);
      }
      return;
    }

    // Step 5: Generate token
    console.log('✓ Step 5: Generating JWT token...');
    console.log('  ✅ Token would be generated here\n');

    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                    LOGIN SUCCESSFUL ✅                         ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error(error.message);
    console.error(error.stack);
  }
}

testLoginFlow();
