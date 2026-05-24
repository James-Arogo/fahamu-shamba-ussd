#!/usr/bin/env node

/**
 * Enable MFA for Admin User
 * Sets mfa_enabled flag to true in the database
 * Usage: node enable-mfa.js
 */

import sqlite3 from 'sqlite3';

const db = new sqlite3.Database('./fahamu_shamba.db', (err) => {
  if (err) {
    console.error('❌ Error opening database:', err.message);
    process.exit(1);
  }
});

const dbAsync = {
  run: (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.run(sql, params, function(err) {
        if (err) return reject(err);
        resolve(this);
      });
    }),
  get: (sql, params = []) =>
    new Promise((resolve, reject) => {
      db.get(sql, params, (err, row) => {
        if (err) return reject(err);
        resolve(row);
      });
    })
};

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  🔐 Enable MFA for Admin User                          ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    // Get current admin
    const admin = await dbAsync.get(
      'SELECT id, email, mfa_enabled FROM admin_users WHERE email = ?',
      ['fahamushamba@gmail.com']
    );

    if (!admin) {
      console.log('❌ Admin user not found');
      console.log('   Run: node create-default-admin.js\n');
      db.close();
      process.exit(1);
    }

    console.log('📋 Current Status:');
    console.log(`   Email: ${admin.email}`);
    console.log(`   ID: ${admin.id}`);
    console.log(`   MFA Enabled: ${admin.mfa_enabled ? '✅ Yes' : '❌ No'}\n`);

    if (admin.mfa_enabled) {
      console.log('ℹ️  MFA is already enabled for this admin!\n');
      db.close();
      process.exit(0);
    }

    // Enable MFA
    console.log('⏳ Enabling MFA...\n');
    await dbAsync.run(
      'UPDATE admin_users SET mfa_enabled = 1 WHERE id = ?',
      [admin.id]
    );

    // Verify
    const updated = await dbAsync.get(
      'SELECT mfa_enabled FROM admin_users WHERE id = ?',
      [admin.id]
    );

    if (updated.mfa_enabled) {
      console.log('✅ MFA Enabled Successfully!\n');
      console.log('╔════════════════════════════════════════════════════════╗');
      console.log('║  MFA is now ACTIVE                                     ║');
      console.log('║                                                        ║');
      console.log('║  What this means:                                      ║');
      console.log('║  • Admin login requires email + password               ║');
      console.log('║  • OTP code sent to email                              ║');
      console.log('║  • OTP must be verified within 5 minutes               ║');
      console.log('║  • Full 2-factor authentication enabled                ║');
      console.log('║                                                        ║');
      console.log('║  Next Step:                                            ║');
      console.log('║  Restart your server: npm run dev                      ║');
      console.log('╚════════════════════════════════════════════════════════╝\n');
    } else {
      console.log('❌ Failed to enable MFA\n');
      db.close();
      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    db.close();
    process.exit(1);
  } finally {
    db.close();
  }
}

main();
