import Database from 'better-sqlite3';
import bcryptjs from 'bcryptjs';

const db = new Database('./fahamu_shamba.db');
const user = db.prepare('SELECT * FROM users WHERE username = ?').get('testfarm');

if (user) {
  console.log('User found:', user.username, user.phone);
  const testPasswords = ['password123', '123456', 'testfarm', '258000'];

  for (const pwd of testPasswords) {
    const isValid = bcryptjs.compareSync(pwd, user.password_hash);
    console.log(`Password '${pwd}': ${isValid ? '✅ VALID' : '❌ INVALID'}`);
  }
} else {
  console.log('User not found');
}

db.close();