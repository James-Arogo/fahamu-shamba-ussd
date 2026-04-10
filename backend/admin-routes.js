import express from 'express';
import {
  hashPassword,
  verifyPassword,
  generateMFAToken,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  generateSessionId,
  generateCSRFToken,
  loginLimiter,
  mfaLimiter
} from './admin-auth.js';
import {
  authenticateAdmin,
  requireRole,
  verifyCSRFToken,
  validateSession,
  getClientIP,
  sanitizeInput
} from './admin-middleware.js';
import {
  logAuditEvent,
  logSecurityEvent,
  logLoginAttempt,
  logMFAEvent,
  logConfigChange,
  logDataAccess,
  logSystemAlert,
  getAuditLogs,
  getSecurityLogs
} from './admin-audit-logger.js';
import * as adminDB from './admin-database.js';
import { sendOTPEmail, sendSecurityAlertEmail } from './email-service.js';

const router = express.Router();
const MFA_TOKEN_REGEX = /^[0-9]{8}$/;

// Session storage (in production, use Redis or database)
const sessionStore = new Map();

/**
 * POST /api/admin/login
 * Admin login with email and password
 */
router.post('/admin/login', sanitizeInput, async (req, res) => {
  try {
    const { email, password } = req.body;
    const ipAddress = getClientIP(req);

    // Validate input
    if (!email || !password) {
      logLoginAttempt(email, false, ipAddress, req.headers['user-agent'], 'Missing credentials');
      return res.status(400).json({
        success: false,
        message: 'Email and password required'
      });
    }

    // Check login rate limit
    if (!loginLimiter.checkLimit(email)) {
      logSecurityEvent('login_rate_limit_exceeded', { email, ipAddress }, 'warning');
      return res.status(429).json({
        success: false,
        message: 'Too many login attempts. Please try again later.',
        retryAfter: loginLimiter.getRetryAfter(email)
      });
    }

    // Find admin user
    const admin = await adminDB.getAdminByEmail(req.dbAsync, email);
    if (!admin) {
      logLoginAttempt(email, false, ipAddress, req.headers['user-agent'], 'User not found');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if account is locked
    if (admin.status === 'locked') {
      logSecurityEvent('login_attempt_to_locked_account', { email, ipAddress }, 'warning');
      return res.status(403).json({
        success: false,
        message: 'Account is locked. Contact administrator.'
      });
    }

    // Verify password
    if (!verifyPassword(password, admin.password_hash)) {
      await adminDB.incrementFailedLoginAttempts(req.dbAsync, email);
      if (admin.failed_login_attempts >= 4) {
        await adminDB.lockAdminAccount(req.dbAsync, email);
        logSecurityEvent('account_locked_too_many_attempts', { email, ipAddress }, 'critical');
      }
      logLoginAttempt(email, false, ipAddress, req.headers['user-agent'], 'Invalid password');
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Send OTP via email (always required for security)
    const otp = generateMFAToken();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes
    await adminDB.storeMFAToken(req.dbAsync, admin.id, otp, expiresAt.toISOString());

    // Send OTP via email
    const emailResult = await sendOTPEmail(email, otp);

    logLoginAttempt(email, true, ipAddress, req.headers['user-agent'], 'OTP sent');
    logAuditEvent(admin.id, email, 'otp_sent', { emailSent: emailResult.success }, 'success', ipAddress);
    
    return res.json({
      success: true,
      requiresOTP: true,
      message: 'OTP sent to your email. Please verify.',
      emailSent: emailResult.success,
      expiresIn: 300 // 5 minutes in seconds
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

/**
 * POST /api/admin/verify-otp
 * Verify OTP sent via email
 */
router.post('/admin/verify-otp', sanitizeInput, async (req, res) => {
  try {
    const { email, otp } = req.body;
    const ipAddress = getClientIP(req);

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: 'Email and OTP required'
      });
    }

    if (!MFA_TOKEN_REGEX.test(String(otp).trim())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP format'
      });
    }

    // Check OTP rate limit (3 attempts per 5 minutes)
    if (!mfaLimiter.checkLimit(email)) {
      logSecurityEvent('otp_rate_limit_exceeded', { email, ipAddress }, 'warning');
      
      // Send security alert
      await sendSecurityAlertEmail(
        email,
        'Multiple Failed OTP Attempts',
        `We detected multiple failed OTP verification attempts from ${ipAddress}.\n\nIf this was not you, please contact your administrator immediately.`
      );
      
      return res.status(429).json({
        success: false,
        message: 'Too many OTP attempts. Please try again later.',
        retryAfter: mfaLimiter.getRetryAfter(email)
      });
    }

    // Get admin and verify token
    const admin = await adminDB.getAdminByEmail(req.dbAsync, email);
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid request'
      });
    }

    const storedToken = await req.dbAsync.get(
      `SELECT * FROM mfa_tokens WHERE admin_id = ? AND token = ? AND used = 0 AND expires_at > CURRENT_TIMESTAMP`,
      [admin.id, otp]
    );

    if (!storedToken) {
      logMFAEvent(admin.id, email, 'otp_verification_failed', false, ipAddress);
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Mark token as used
    await adminDB.markMFATokenAsUsed(req.dbAsync, admin.id, otp);

    // Create session
    const sessionId = generateSessionId();
    const csrfToken = generateCSRFToken();
    await adminDB.createAdminSession(req.dbAsync, admin.id, sessionId, csrfToken, ipAddress, req.headers['user-agent']);
    sessionStore.set(sessionId, {
      adminId: admin.id,
      lastActivity: Date.now(),
      csrfToken,
      ipAddress,
      userAgent: req.headers['user-agent'] || 'unknown'
    });

    // Update last login
    await adminDB.updateAdminLastLogin(req.dbAsync, admin.id);
    mfaLimiter.reset(email);

    // Generate tokens
    const accessToken = generateAccessToken(admin.id, email, admin.role);
    const refreshToken = generateRefreshToken(admin.id, email);

    logMFAEvent(admin.id, email, 'otp_verification_success', true, ipAddress);
    logAuditEvent(admin.id, email, 'login_otp_verified', {}, 'success', ipAddress);

    res.json({
      success: true,
      message: 'OTP verified successfully',
      accessToken,
      refreshToken,
      sessionId,
      csrfToken,
      admin: {
        id: admin.id,
        email: admin.email,
        name: `${admin.first_name} ${admin.last_name}`,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'OTP verification failed'
    });
  }
});

/**
 * POST /api/admin/refresh-token
 * Refresh access token using refresh token
 */
router.post('/admin/refresh-token', async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const sessionId = req.headers['x-session-id'];
    const session = sessionId ? sessionStore.get(sessionId) : null;

    if (!refreshToken || !sessionId || !session) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token and session required'
      });
    }

    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded || decoded.adminId !== session.adminId) {
      logSecurityEvent('invalid_refresh_token_attempt', {
        sessionId,
        ipAddress: getClientIP(req)
      }, 'warning');
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    const admin = await adminDB.getAdminById(req.dbAsync, decoded.adminId);
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Admin session no longer valid'
      });
    }

    const accessToken = generateAccessToken(admin.id, admin.email, admin.role);

    res.json({
      success: true,
      message: 'Token refreshed',
      accessToken
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Token refresh failed'
    });
  }
});

router.use('/admin', authenticateAdmin, validateSession(sessionStore));

/**
 * POST /api/admin/logout
 * Admin logout
 */
router.post('/admin/logout', verifyCSRFToken, async (req, res) => {
  try {
    const sessionId = req.headers['x-session-id'];
    if (sessionId) {
      await adminDB.deleteAdminSession(req.dbAsync, sessionId);
      sessionStore.delete(sessionId);
    }

    logAuditEvent(req.admin.adminId, req.admin.email, 'logout', {}, 'success', getClientIP(req));

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
});

/**
 * GET /api/admin/session
 * Get current admin session metadata
 */
router.get('/admin/session', async (req, res) => {
  try {
    const admin = await adminDB.getAdminById(req.dbAsync, req.admin.adminId);
    const permissions = await adminDB.getAdminPermissions(req.dbAsync, req.admin.role);

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found'
      });
    }

    res.json({
      success: true,
      data: {
        admin: {
          id: admin.id,
          email: admin.email,
          firstName: admin.first_name,
          lastName: admin.last_name,
          role: admin.role,
          mfaEnabled: !!admin.mfa_enabled,
          lastLogin: admin.last_login,
          status: admin.status
        },
        permissions
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to load session'
    });
  }
});

/**
 * GET /api/admin/dashboard
 * Get admin dashboard data
 */
router.get('/admin/dashboard', authenticateAdmin, async (req, res) => {
  try {
    // Get system statistics - count from both farmers and farmer_profiles tables
    const farmerCount = await req.dbAsync.get(
      `SELECT COUNT(*) as count FROM farmers`
    );
    
    // Try to get count from farmer_profiles table (enhanced profiles)
    let farmerProfileCount = { count: 0 };
    try {
      farmerProfileCount = await req.dbAsync.get(
        `SELECT COUNT(*) as count FROM farmer_profiles WHERE is_active = 1`
      ) || { count: 0 };
    } catch (e) {
      // Table might not exist yet
    }
    
    const predictionCount = await req.dbAsync.get(
      `SELECT COUNT(*) as count FROM predictions`
    );
    const recentAlerts = await adminDB.getActiveSystemAlerts(req.dbAsync);
    const auditLogs = await adminDB.getAuditLogsDB(req.dbAsync, 10);

    logDataAccess(req.admin.adminId, req.admin.email, 'dashboard', 0, getClientIP(req));

    // Combine farmer counts from both sources
    const totalFarmers = (farmerCount?.count || 0) + (farmerProfileCount?.count || 0);

    res.json({
      success: true,
      data: {
        statistics: {
          totalFarmers: totalFarmers,
          farmerProfiles: farmerProfileCount?.count || 0,
          legacyFarmers: farmerCount?.count || 0,
          totalPredictions: predictionCount?.count || 0,
          activeAlerts: recentAlerts.length
        },
        recentAlerts,
        recentActivity: auditLogs
      }
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to load dashboard'
    });
  }
});

/**
 * GET /api/admin/audit-logs
 * Get audit logs
 */
router.get('/admin/audit-logs', authenticateAdmin, requireRole('admin'), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const logs = await adminDB.getAuditLogsDB(req.dbAsync, limit, offset);
    logDataAccess(req.admin.adminId, req.admin.email, 'audit_logs', logs.length, getClientIP(req));

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs'
    });
  }
});

/**
 * GET /api/admin/security-logs
 * Get security logs
 */
router.get('/admin/security-logs', authenticateAdmin, requireRole('super_admin'), async (req, res) => {
  try {
    const severity = req.query.severity || null;
    const limit = parseInt(req.query.limit) || 100;

    const logs = getSecurityLogs(limit, severity);
    logDataAccess(req.admin.adminId, req.admin.email, 'security_logs', logs.length, getClientIP(req));

    res.json({
      success: true,
      data: logs
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch security logs'
    });
  }
});

/**
 * POST /api/admin/system-alerts
 * Create system alert
 */
router.post('/admin/system-alerts', requireRole('admin'), verifyCSRFToken, sanitizeInput, async (req, res) => {
  try {
    const { alertType, severity, title, message } = req.body;

    if (!alertType || !title) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const result = await adminDB.createSystemAlert(
      req.dbAsync,
      alertType,
      severity || 'warning',
      title,
      message,
      req.admin.email
    );

    logAuditEvent(
      req.admin.adminId,
      req.admin.email,
      'create_system_alert',
      { alertType, severity, title },
      'success',
      getClientIP(req)
    );

    logSystemAlert(alertType, { title, message }, severity);

    res.json({
      success: true,
      message: 'Alert created',
      data: { id: result.lastID }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create alert'
    });
  }
});

/**
 * GET /api/admin/system-alerts
 * Get active system alerts
 */
router.get('/admin/system-alerts', authenticateAdmin, async (req, res) => {
  try {
    const alerts = await adminDB.getActiveSystemAlerts(req.dbAsync);
    logDataAccess(req.admin.adminId, req.admin.email, 'system_alerts', alerts.length, getClientIP(req));

    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alerts'
    });
  }
});

/**
 * PUT /api/admin/system-alerts/:alertId
 * Resolve system alert
 */
router.put('/admin/system-alerts/:alertId', requireRole('admin'), verifyCSRFToken, async (req, res) => {
  try {
    const { alertId } = req.params;
    await adminDB.resolveSystemAlert(req.dbAsync, alertId);

    logAuditEvent(
      req.admin.adminId,
      req.admin.email,
      'resolve_system_alert',
      { alertId },
      'success',
      getClientIP(req)
    );

    res.json({
      success: true,
      message: 'Alert resolved'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to resolve alert'
    });
  }
});

/**
 * GET /api/admin/admins
 * Get all admin users
 */
router.get('/admin/admins', requireRole('super_admin'), async (req, res) => {
  try {
    const admins = await adminDB.getAllAdmins(req.dbAsync);
    logDataAccess(req.admin.adminId, req.admin.email, 'admin_users', admins.length, getClientIP(req));

    res.json({
      success: true,
      data: admins
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admins'
    });
  }
});

/**
 * POST /api/admin/admins
 * Create new admin user
 */
router.post('/admin/admins', requireRole('super_admin'), verifyCSRFToken, sanitizeInput, async (req, res) => {
  try {
    const { email, password, firstName, lastName, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password required'
      });
    }

    const passwordHash = hashPassword(password);
    const result = await adminDB.createAdminUser(
      req.dbAsync,
      email,
      passwordHash,
      firstName,
      lastName,
      role || 'admin',
      req.admin.email
    );

    logAuditEvent(
      req.admin.adminId,
      req.admin.email,
      'create_admin_user',
      { email, role },
      'success',
      getClientIP(req)
    );

    res.json({
      success: true,
      message: 'Admin user created',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create admin user'
    });
  }
});

/**
 * GET /api/admin/farmer-profiles
 * Get all farmer profiles for admin dashboard
 */
router.get('/admin/farmer-profiles', authenticateAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;

    // Get farmer profiles
    const profiles = await req.dbAsync.all(
      `SELECT * FROM farmer_profiles 
       WHERE is_active = 1 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    // Get total count
    const countResult = await req.dbAsync.get(
      `SELECT COUNT(*) as total FROM farmer_profiles WHERE is_active = 1`
    );

    logDataAccess(req.admin.adminId, req.admin.email, 'farmer_profiles', profiles.length, getClientIP(req));

    res.json({
      success: true,
      data: profiles || [],
      pagination: {
        limit,
        offset,
        total: countResult?.total || 0,
        hasMore: (offset + limit) < (countResult?.total || 0)
      }
    });
  } catch (error) {
    console.error('Error fetching farmer profiles:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch farmer profiles',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/farmer-profiles/:farmerId
 * Get specific farmer profile details
 */
router.get('/admin/farmer-profiles/:farmerId', authenticateAdmin, async (req, res) => {
  try {
    const { farmerId } = req.params;

    const profile = await req.dbAsync.get(
      `SELECT * FROM farmer_profiles WHERE farmer_id = ?`,
      [farmerId]
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Farmer profile not found'
      });
    }

    // Get farmer's farms if available
    let farms = [];
    try {
      farms = await req.dbAsync.all(
        `SELECT * FROM farmer_farms WHERE farmer_id = ?`,
        [farmerId]
      );
    } catch (e) {
      // Table might not exist
    }

    logDataAccess(req.admin.adminId, req.admin.email, `farmer_profile_${farmerId}`, 1, getClientIP(req));

    res.json({
      success: true,
      data: {
        profile,
        farms: farms || []
      }
    });
  } catch (error) {
    console.error('Error fetching farmer profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch farmer profile',
      error: error.message
    });
  }
});

/**
 * GET /api/admin/farmer-profiles/stats/summary
 * Get farmer profile statistics
 */
router.get('/admin/farmer-profiles/stats/summary', authenticateAdmin, async (req, res) => {
  try {
    const stats = await req.dbAsync.get(
      `SELECT 
        COUNT(*) as total_profiles,
        SUM(CASE WHEN profile_verified = 1 THEN 1 ELSE 0 END) as verified_profiles,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_profiles
       FROM farmer_profiles`
    );

    // Get breakdown by sub-county
    const bySubcounty = await req.dbAsync.all(
      `SELECT sub_county, COUNT(*) as count 
       FROM farmer_profiles 
       WHERE is_active = 1 
       GROUP BY sub_county 
       ORDER BY count DESC`
    );

    // Get breakdown by soil type
    const bySoilType = await req.dbAsync.all(
      `SELECT soil_type, COUNT(*) as count 
       FROM farmer_profiles 
       WHERE is_active = 1 AND soil_type IS NOT NULL
       GROUP BY soil_type 
       ORDER BY count DESC`
    );

    logDataAccess(req.admin.adminId, req.admin.email, 'farmer_profiles_stats', 1, getClientIP(req));

    res.json({
      success: true,
      data: {
        overview: stats || {},
        bySubcounty: bySubcounty || [],
        bySoilType: bySoilType || []
      }
    });
  } catch (error) {
    console.error('Error fetching farmer profile stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch farmer profile statistics',
      error: error.message
    });
  }
});

export default router;
