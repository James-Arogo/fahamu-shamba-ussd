/**
 * Test the complete auth flow
 */
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import bcryptjs from 'bcryptjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'fahamu_shamba.db');
const db = new Database(dbPath);

// Simulate registration
console.log('🔐 TESTING AUTH FLOW\n');
console.log('1️⃣  REGISTRATION\n');

const testUser = {
  phone: '0712345678',
  username: 'testfarm',
  password: 'password123'
};

// Normalize phone
let normalizedPhone = testUser.phone.trim();
if (normalizedPhone.startsWith('0')) {
  normalizedPhone = '+254' + normalizedPhone.substring(1);
} else if (normalizedPhone.startsWith('254')) {
  normalizedPhone = '+' + normalizedPhone;
}

const normalizedUsername = testUser.username.trim().toLowerCase();
const passwordHash = bcryptjs.hashSync(testUser.password, 10);

console.log(`  Input phone: ${testUser.phone}`);
console.log(`  Normalized phone: ${normalizedPhone}`);
console.log(`  Username: ${normalizedUsername}`);
console.log(`  Password hash: ${passwordHash.substring(0, 20)}...\n`);

try {
  const insertStmt = db.prepare(
    'INSERT INTO users (phone, username, password_hash, created_at, updated_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)'
  );
  const result = insertStmt.run(normalizedPhone, normalizedUsername, passwordHash);
  console.log(`✅ User created with ID: ${result.lastInsertRowid}\n`);
} catch (error) {
  console.error('❌ Registration failed:', error.message, '\n');
  db.close();
  process.exit(1);
}

// Simulate login with username
console.log('2️⃣  LOGIN WITH USERNAME\n');

const loginUsername = 'testfarm';
const loginPassword = 'password123';

console.log(`  Attempting login with username: "${loginUsername}"\n`);

const normalizedLoginUsername = loginUsername.trim().toLowerCase();
const stmt = db.prepare('SELECT id, phone, username, password_hash, name FROM users WHERE username = ? OR phone = ?');
let user = stmt.get(normalizedLoginUsername, loginUsername);

// Fallback: case-insensitive search
if (!user) {
  const fallbackStmt = db.prepare('SELECT id, phone, username, password_hash, name FROM users');
  const allUsers = fallbackStmt.all();
  user = allUsers.find(u => u.username && u.username.toLowerCase() === normalizedLoginUsername);
}

if (!user) {
  console.log('❌ User not found in database\n');
  
  // Debug: show all users
  const allUsers = db.prepare('SELECT id, phone, username FROM users').all();
  console.log('Users in database:');
  allUsers.forEach(u => {
    console.log(`  - ID: ${u.id}, Phone: ${u.phone}, Username: ${u.username}`);
  });
  
  db.close();
  process.exit(1);
} else {
  console.log(`✅ User found: ID=${user.id}, Phone=${user.phone}, Username=${user.username}\n`);
}

// Verify password
const isPasswordValid = bcryptjs.compareSync(loginPassword, user.password_hash);
console.log(`3️⃣  PASSWORD VERIFICATION\n`);
console.log(`  Password matches: ${isPasswordValid ? '✅ YES' : '❌ NO'}\n`);

if (isPasswordValid) {
  console.log('✅ AUTH FLOW SUCCESS - User can log in!\n');
} else {
  console.log('❌ AUTH FLOW FAILED - Password mismatch\n');
}

// Test login with phone
console.log('4️⃣  LOGIN WITH PHONE\n');

const loginPhone = '+254712345678';
console.log(`  Attempting login with phone: "${loginPhone}"\n`);

const userByPhone = stmt.get('', loginPhone);
if (userByPhone) {
  console.log(`✅ User found by phone: ID=${userByPhone.id}\n`);
} else {
  console.log(`❌ User not found by phone\n`);
}

db.close();
console.log('✅ Test complete');
