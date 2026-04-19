#!/usr/bin/env node

/**
 * Create or Reset Default Admin User
 * Ensures the admin account uses credentials: cjoarogo@gmail.com / Jemo@721
 * Usage: node create-default-admin.js
 */

import Database from 'better-sqlite3';
import { hashPassword } from './admin-auth.js';
import * as adminDB from './admin-database.js';
import pool from './database-postgres.js';

const usePostgres = Boolean(process.env.DATABASE_URL);
let db = null;

const dbAsync = usePostgres
  ? {
      run: async (sql, params = []) => {
        let idx = 0;
        const pgSQL = sql.replace(/\?/g, () => `$${++idx}`);
        const result = await pool.query(pgSQL, params);
        return { lastID: result.rows?.[0]?.id || null, changes: result.rowCount };
      },
      get: async (sql, params = []) => {
        let idx = 0;
        const pgSQL = sql.replace(/\?/g, () => `$${++idx}`);
        const result = await pool.query(pgSQL, params);
        return result.rows[0] || null;
      }
    }
  : (() => {
      try {
        db = new Database('./fahamu_shamba.db');
      } catch (error) {
        console.error('❌ Error opening SQLite database:', error.message);
        process.exit(1);
      }
      return {
        run: async (sql, params = []) => {
          const stmt = db.prepare(sql);
          const result = stmt.run(...params);
          return { lastID: result.lastInsertRowid, changes: result.changes };
        },
        get: async (sql, params = []) => {
          const stmt = db.prepare(sql);
          return stmt.get(...params);
        }
      };
    })();

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║  🌱 Fahamu Shamba - Default Admin Account Setup        ║');
  console.log('╚════════════════════════════════════════════════════════╝\n');

  try {
    if (usePostgres) {
      console.log('ℹ️ Using PostgreSQL admin setup mode');
      await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id SERIAL PRIMARY KEY,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          first_name TEXT,
          last_name TEXT,
          role TEXT DEFAULT 'admin' CHECK(role IN ('admin', 'super_admin', 'moderator')),
          mfa_enabled BOOLEAN DEFAULT FALSE,
          mfa_secret TEXT,
          status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'locked')),
          last_login TIMESTAMP,
          login_count INTEGER DEFAULT 0,
          failed_login_attempts INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          created_by TEXT
        )
      `);
    } else {
      // Initialize database if needed
      adminDB.initializeAdminDatabase(db, dbAsync);
    }

    const email = 'cjoarogo@gmail.com';
    const password = 'Jemo@721';
    const passwordHash = hashPassword(password);

    // Check if admin already exists
    const existingAdmin = await dbAsync.get(
      'SELECT id FROM admin_users WHERE email = ?',
      [email]
    );

    if (existingAdmin) {
      console.log('⚠️  Admin account already exists');
      console.log('⏳ Resetting admin credentials to the requested defaults...\n');

      if (usePostgres) {
        await pool.query(
          `UPDATE admin_users
           SET password_hash = $1,
               first_name = $2,
               last_name = $3,
               role = $4,
               status = 'active',
               failed_login_attempts = 0,
               updated_at = CURRENT_TIMESTAMP
           WHERE email = $5`,
          [passwordHash, 'System', 'Administrator', 'super_admin', email]
        );
      } else {
        await dbAsync.run(
          `UPDATE admin_users
           SET password_hash = ?,
               first_name = ?,
               last_name = ?,
               role = ?,
               status = 'active',
               failed_login_attempts = 0,
               updated_at = CURRENT_TIMESTAMP
           WHERE email = ?`,
          [passwordHash, 'System', 'Administrator', 'super_admin', email]
        );
      }

      console.log('✅ Existing admin account updated successfully!\n');
    } else {
      console.log('⏳ Creating default admin account...\n');

      if (usePostgres) {
        await pool.query(
          `INSERT INTO admin_users (email, password_hash, first_name, last_name, role, created_by, status)
           VALUES ($1, $2, $3, $4, $5, $6, 'active')`,
          [email, passwordHash, 'System', 'Administrator', 'super_admin', 'setup-script']
        );
      } else {
        await adminDB.createAdminUser(
          dbAsync,
          email,
          passwordHash,
          'System',
          'Administrator',
          'super_admin',
          'setup-script'
        );
      }

      console.log('✅ Admin account created successfully!\n');
    }
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log(`║  Email:    cjoarogo@gmail.com                          ║`);
    console.log(`║  Password: Jemo@721                                    ║`);
    console.log(`║  Role:     Super Admin (Full Access)                   ║`);
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log('📚 Next Steps:\n');
    console.log('1. Start the server: npm start');
    console.log('2. Open: http://localhost:5000/admin');
    console.log('3. Login with the credentials above');
    console.log('4. Check email for OTP verification code');
    console.log('5. Enter OTP to complete login\n');

    console.log('📧 Email Configuration:\n');
    console.log('The system is configured to send OTP codes via email.');
    console.log('Add these to your .env file for email functionality:\n');
    console.log('EMAIL_USER=your-email@gmail.com');
    console.log('EMAIL_PASSWORD=your-app-password\n');
    console.log('Note: Use App Password, not your regular password\n');

    console.log('🔐 Security Reminder:\n');
    console.log('• Change password after first login');
    console.log('• Save the OTP email for authentication');
    console.log('• Keep credentials secure\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    if (db) db.close();
    if (usePostgres) await pool.end();
  }
}

main();
