import sqlite3 from 'sqlite3';
import { hashPassword } from './admin-auth.js';

const db = new sqlite3.Database('./fahamu_shamba.db');

const dbAsync = {
  get: (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    })
};

async function test() {
  try {
    console.log('🔍 Testing admin credentials...\n');
    
    // Test with the admin email
    const admin = await dbAsync.get(
      `SELECT * FROM admin_users WHERE email = ?`,
      ['fahamushamba@gmail.com']
    );
    
    if (admin) {
      console.log('✅ Admin found in database:');
      console.log('   Email:', admin.email);
      console.log('   Role:', admin.role);
      console.log('   Status:', admin.status);
      console.log('   Password Hash:', admin.password_hash?.substring(0, 20) + '...');
      
      // Test password hashing
      const testPassword = 'FahamuShamba01';
      const hash = hashPassword(testPassword);
      console.log('\n🔐 Password Hash Test:');
      console.log('   Input:', testPassword);
      console.log('   Generated Hash:', hash.substring(0, 20) + '...');
      console.log('   Match:', hash === admin.password_hash ? '✅ YES' : '❌ NO');
      
      if (hash !== admin.password_hash) {
        console.log('\n⚠️  PASSWORD MISMATCH FOUND!');
        console.log('   The hash does not match. This is causing the login error.');
        console.log('\n   Possible causes:');
        console.log('   1. PASSWORD_SALT environment variable is not set');
        console.log('   2. PASSWORD_SALT differs from when admin was created');
        console.log('\n   Solution: Set PASSWORD_SALT in .env and recreate admin account');
      }
    } else {
      console.log('❌ Admin not found in database');
    }
    
    db.close();
  } catch (error) {
    console.error('Error:', error.message);
    db.close();
  }
}

test();
