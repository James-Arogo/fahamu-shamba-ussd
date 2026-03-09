#!/usr/bin/env node

/**
 * Direct test of login logic without server
 * Run: node test-login-logic.js
 */

import Database from 'better-sqlite3';
import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'fahamu_shamba.db');
const db = new Database(dbPath);

const JWT_SECRET = process.env.JWT_SECRET || 'farmer_secret_key_change_in_production';

// Test login flow
async function testLogin(username, password) {
  console.log(`\n🔐 Testing login: username="${username}", password="${password}"\n`);

  try {
     // Step 1: Find user by username (matching what API does)
     const normalizedUsername = username.trim().toLowerCase();
     const stmt = db.prepare('SELECT id, phone, username, password_hash, name FROM users WHERE username = ?');
     let user = stmt.get(normalizedUsername);
     
     // Fallback: case-insensitive search
     if (!user) {
       const fallbackStmt = db.prepare('SELECT id, phone, username, password_hash, name FROM users');
       const allUsers = fallbackStmt.all();
       user = allUsers.find(u => u.username && u.username.toLowerCase() === normalizedUsername);
     }

    if (!user) {
      console.log('❌ User not found');
      return { status: 'error', message: 'Invalid username or password' };
    }

    console.log(`✅ User found: ID=${user.id}, username=${user.username}`);

    // Step 2: Verify password
    const isPasswordValid = await bcryptjs.compare(password, user.password_hash);
    console.log(`✅ Password verification: ${isPasswordValid ? 'MATCH' : 'MISMATCH'}`);

    if (!isPasswordValid) {
      return { status: 'error', message: 'Invalid username or password' };
    }

    // Step 3: Generate token
    const token = jwt.sign(
      {
        userId: user.id,
        phone: user.phone,
        username: user.username,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log(`✅ Token generated: ${token.substring(0, 20)}...`);

    return {
      status: 'success',
      token,
      user: {
        id: user.id,
        phone: user.phone,
        username: user.username,
        name: user.name
      }
    };
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return { status: 'error', message: error.message };
  }
}

// Test multiple scenarios
async function runTests() {
  console.log('🌾 FAHAMU SHAMBA - LOGIN LOGIC TEST\n');
  console.log('='.repeat(60));

  // Test 1: Valid credentials
  const result1 = await testLogin('testfarm', 'password123');
  console.log(`\nResult: ${result1.status === 'success' ? '✅ SUCCESS' : '❌ FAILED'}`);

  console.log('\n' + '='.repeat(60));

  // Test 2: Invalid password
  const result2 = await testLogin('testfarm', 'wrongpassword');
  console.log(`\nResult: ${result2.status === 'success' ? '✅ SUCCESS' : '❌ FAILED'}`);

  console.log('\n' + '='.repeat(60));

  // Test 3: Non-existent user
  const result3 = await testLogin('nonexistent', 'password123');
  console.log(`\nResult: ${result3.status === 'success' ? '✅ SUCCESS' : '❌ FAILED'}`);

  console.log('\n' + '='.repeat(60));

  // Test 4: Demo user
  const result4 = await testLogin('demo_user', 'demo1234');
  console.log(`\nResult: ${result4.status === 'success' ? '✅ SUCCESS' : '❌ FAILED'}`);

  console.log('\n' + '='.repeat(60));
  console.log('\n✅ LOGIN LOGIC TESTS COMPLETE\n');
}

runTests().finally(() => db.close());
