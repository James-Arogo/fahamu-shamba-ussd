/**
 * Admin Database Schema and Operations
 */

export function initializeAdminDatabase(db, dbAsync) {
  try {
    // Admin users table
    db.exec(`CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      first_name TEXT,
      last_name TEXT,
      role TEXT DEFAULT 'admin' CHECK(role IN ('admin', 'super_admin', 'moderator')),
      mfa_enabled BOOLEAN DEFAULT 0,
      mfa_secret TEXT,
      status TEXT DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'locked')),
      last_login DATETIME,
      login_count INTEGER DEFAULT 0,
      failed_login_attempts INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      created_by TEXT
    )`);
    console.log('✅ Admin users table ready');

    // MFA tokens table
    db.exec(`CREATE TABLE IF NOT EXISTS mfa_tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      token TEXT NOT NULL,
      used BOOLEAN DEFAULT 0,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(admin_id) REFERENCES admin_users(id) ON DELETE CASCADE,
      UNIQUE(admin_id, token)
    )`);
    console.log('✅ MFA tokens table ready');

    // Admin sessions table
    db.exec(`CREATE TABLE IF NOT EXISTS admin_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER NOT NULL,
      session_id TEXT UNIQUE NOT NULL,
      csrf_token TEXT NOT NULL,
      ip_address TEXT,
      user_agent TEXT,
      last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(admin_id) REFERENCES admin_users(id) ON DELETE CASCADE
    )`);
    console.log('✅ Admin sessions table ready');

    // System audit logs table
    db.exec(`CREATE TABLE IF NOT EXISTS system_audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER,
      email TEXT,
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      details TEXT,
      status TEXT DEFAULT 'success',
      ip_address TEXT,
      user_agent TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
    )`);
    console.log('✅ System audit logs table ready');

    // System alerts and notifications
    db.exec(`CREATE TABLE IF NOT EXISTS system_alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_type TEXT NOT NULL,
      severity TEXT DEFAULT 'warning' CHECK(severity IN ('info', 'warning', 'critical')),
      title TEXT NOT NULL,
      message TEXT,
      triggered_by TEXT,
      resolved BOOLEAN DEFAULT 0,
      resolved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('✅ System alerts table ready');

    // System configuration
    db.exec(`CREATE TABLE IF NOT EXISTS system_config (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      config_key TEXT UNIQUE NOT NULL,
      config_value TEXT,
      data_type TEXT DEFAULT 'string',
      modified_by TEXT,
      modified_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
    console.log('✅ System config table ready');

    // Admin roles and permissions
    db.exec(`CREATE TABLE IF NOT EXISTS admin_permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL,
      permission TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(role, permission)
    )`);
    console.log('✅ Admin permissions table ready');

    // Initialize default permissions
    initializeDefaultPermissions(db);

    // Create indexes
    db.exec(`CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin_users(email)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin ON admin_sessions(admin_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_system_audit_logs_admin ON system_audit_logs(admin_id)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_system_audit_logs_created ON system_audit_logs(created_at)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_system_alerts_severity ON system_alerts(severity)`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_mfa_tokens_admin ON mfa_tokens(admin_id)`);
    
    console.log('✅ All admin database tables and indexes created');
  } catch (err) {
    console.error('Error initializing admin database:', err.message);
  }
}

/**
 * Initialize default role-based permissions
 */
function initializeDefaultPermissions(db) {
  const permissions = {
    'super_admin': [
      'view_dashboard',
      'manage_admins',
      'manage_system_config',
      'view_audit_logs',
      'manage_farmers',
      'manage_predictions',
      'view_analytics',
      'export_data',
      'manage_alerts',
      'system_maintenance',
      'reset_user_passwords',
      'backup_database',
      'view_security_logs'
    ],
    'admin': [
      'view_dashboard',
      'view_audit_logs',
      'manage_farmers',
      'manage_predictions',
      'view_analytics',
      'export_data',
      'view_alerts'
    ],
    'moderator': [
      'view_dashboard',
      'view_audit_logs',
      'manage_farmers',
      'view_alerts'
    ]
  };

  try {
    const stmt = db.prepare(`INSERT OR IGNORE INTO admin_permissions (role, permission) VALUES (?, ?)`);
    for (const [role, perms] of Object.entries(permissions)) {
      perms.forEach(permission => {
        stmt.run(role, permission);
      });
    }
    console.log('✅ Default permissions initialized');
  } catch (err) {
    console.error('Error initializing permissions:', err.message);
  }
}

/**
 * Create a new admin user
 */
export async function createAdminUser(dbAsync, email, passwordHash, firstName, lastName, role, createdBy) {
  try {
    const result = await dbAsync.run(
      `INSERT INTO admin_users (email, password_hash, first_name, last_name, role, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [email, passwordHash, firstName, lastName, role || 'admin', createdBy]
    );
    return { id: result.lastID, email, role };
  } catch (error) {
    throw new Error(`Failed to create admin user: ${error.message}`);
  }
}

/**
 * Get admin user by email
 */
export async function getAdminByEmail(dbAsync, email) {
  return await dbAsync.get(
    `SELECT * FROM admin_users WHERE email = ? AND status = 'active'`,
    [email]
  );
}

/**
 * Get admin user by ID
 */
export async function getAdminById(dbAsync, id) {
  return await dbAsync.get(
    `SELECT * FROM admin_users WHERE id = ? AND status = 'active'`,
    [id]
  );
}

/**
 * Update admin's last login
 */
export async function updateAdminLastLogin(dbAsync, adminId) {
  return await dbAsync.run(
    `UPDATE admin_users 
     SET last_login = CURRENT_TIMESTAMP, 
         login_count = login_count + 1,
         failed_login_attempts = 0
     WHERE id = ?`,
    [adminId]
  );
}

/**
 * Increment failed login attempts
 */
export async function incrementFailedLoginAttempts(dbAsync, email) {
  return await dbAsync.run(
    `UPDATE admin_users 
     SET failed_login_attempts = failed_login_attempts + 1
     WHERE email = ?`,
    [email]
  );
}

/**
 * Lock admin account
 */
export async function lockAdminAccount(dbAsync, email) {
  return await dbAsync.run(
    `UPDATE admin_users SET status = 'locked' WHERE email = ?`,
    [email]
  );
}

/**
 * Enable MFA for admin
 */
export async function enableMFAForAdmin(dbAsync, adminId, mfaSecret) {
  return await dbAsync.run(
    `UPDATE admin_users SET mfa_enabled = 1, mfa_secret = ? WHERE id = ?`,
    [mfaSecret, adminId]
  );
}

/**
 * Store MFA token
 */
export async function storeMFAToken(dbAsync, adminId, token, expiresAt) {
  return await dbAsync.run(
    `INSERT INTO mfa_tokens (admin_id, token, expires_at) VALUES (?, ?, ?)`,
    [adminId, token, expiresAt]
  );
}

/**
 * Mark MFA token as used
 */
export async function markMFATokenAsUsed(dbAsync, adminId, token) {
  return await dbAsync.run(
    `UPDATE mfa_tokens SET used = TRUE WHERE admin_id = ? AND token = ?`,
    [adminId, token]
  );
}

/**
 * Create admin session
 */
export async function createAdminSession(dbAsync, adminId, sessionId, csrfToken, ipAddress, userAgent) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return await dbAsync.run(
    `INSERT INTO admin_sessions (admin_id, session_id, csrf_token, ip_address, user_agent, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [adminId, sessionId, csrfToken, ipAddress, userAgent, expiresAt.toISOString()]
  );
}

/**
 * Get admin session
 */
export async function getAdminSession(dbAsync, sessionId) {
  return await dbAsync.get(
    `SELECT * FROM admin_sessions 
     WHERE session_id = ? AND expires_at > CURRENT_TIMESTAMP`,
    [sessionId]
  );
}

/**
 * Delete admin session
 */
export async function deleteAdminSession(dbAsync, sessionId) {
  return await dbAsync.run(
    `DELETE FROM admin_sessions WHERE session_id = ?`,
    [sessionId]
  );
}

/**
 * Log audit event in database
 */
export async function logAuditEventDB(dbAsync, adminId, email, action, resourceType, resourceId, details, status, ipAddress, userAgent) {
  return await dbAsync.run(
    `INSERT INTO system_audit_logs (admin_id, email, action, resource_type, resource_id, details, status, ip_address, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [adminId, email, action, resourceType, resourceId, JSON.stringify(details), status, ipAddress, userAgent]
  );
}

/**
 * Get audit logs from database
 */
export async function getAuditLogsDB(dbAsync, limit = 100, offset = 0) {
  return await dbAsync.all(
    `SELECT * FROM system_audit_logs 
     ORDER BY created_at DESC 
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
}

/**
 * Create system alert
 */
export async function createSystemAlert(dbAsync, alertType, severity, title, message, triggeredBy) {
  return await dbAsync.run(
    `INSERT INTO system_alerts (alert_type, severity, title, message, triggered_by)
     VALUES (?, ?, ?, ?, ?)`,
    [alertType, severity, title, message, triggeredBy]
  );
}

/**
 * Get active system alerts
 */
export async function getActiveSystemAlerts(dbAsync) {
  return await dbAsync.all(
    `SELECT * FROM system_alerts 
     WHERE resolved = FALSE
     ORDER BY created_at DESC`
  );
}

/**
 * Resolve system alert
 */
export async function resolveSystemAlert(dbAsync, alertId) {
  return await dbAsync.run(
    `UPDATE system_alerts 
     SET resolved = TRUE, resolved_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [alertId]
  );
}

/**
 * Update system configuration
 */
export async function updateSystemConfig(dbAsync, configKey, configValue, dataType, modifiedBy) {
  return await dbAsync.run(
    `INSERT INTO system_config (config_key, config_value, data_type, modified_by)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(config_key) DO UPDATE SET 
       config_value = excluded.config_value,
       data_type = excluded.data_type,
       modified_by = excluded.modified_by,
       modified_at = CURRENT_TIMESTAMP`,
    [configKey, configValue, dataType, modifiedBy]
  );
}

/**
 * Get all admins
 */
export async function getAllAdmins(dbAsync) {
  return await dbAsync.all(
    `SELECT id, email, first_name, last_name, role, mfa_enabled, status, last_login, login_count, created_at 
     FROM admin_users 
     ORDER BY created_at DESC`
  );
}

/**
 * Get admin permissions
 */
export async function getAdminPermissions(dbAsync, role) {
  const result = await dbAsync.all(
    `SELECT permission FROM admin_permissions WHERE role = ?`,
    [role]
  );
  return result.map(r => r.permission);
}
