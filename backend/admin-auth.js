import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const isProduction = process.env.NODE_ENV === 'production';
const ADMIN_SECRET = process.env.ADMIN_JWT_SECRET || 'dev-only-admin-jwt-secret';
const REFRESH_SECRET = process.env.ADMIN_REFRESH_SECRET || 'dev-only-admin-refresh-secret';
const PASSWORD_SALT = process.env.PASSWORD_SALT || 'dev-only-password-salt';

function assertAdminSecretsConfigured() {
  if (!isProduction) return;

  const missing = [];
  if (!process.env.ADMIN_JWT_SECRET) missing.push('ADMIN_JWT_SECRET');
  if (!process.env.ADMIN_REFRESH_SECRET) missing.push('ADMIN_REFRESH_SECRET');
  if (!process.env.PASSWORD_SALT) missing.push('PASSWORD_SALT');

  if (missing.length) {
    throw new Error(`${missing.join(', ')} must be set in production`);
  }
}
const TOKEN_EXPIRY = '15m'; // Short-lived access token
const REFRESH_EXPIRY = '7d'; // Longer-lived refresh token
const SCRYPT_KEYLEN = 64;
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;

/**
 * Generate a secure random token for MFA
 */
export function generateMFAToken() {
  return crypto.randomInt(0, 100000000).toString().padStart(8, '0');
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(adminId, email, role = 'admin') {
  assertAdminSecretsConfigured();
  return jwt.sign(
    { 
      adminId, 
      email, 
      role,
      type: 'access'
    },
    ADMIN_SECRET,
    { expiresIn: TOKEN_EXPIRY }
  );
}

/**
 * Generate JWT refresh token
 */
export function generateRefreshToken(adminId, email) {
  assertAdminSecretsConfigured();
  return jwt.sign(
    { 
      adminId, 
      email,
      type: 'refresh'
    },
    REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRY }
  );
}

/**
 * Verify access token
 */
export function verifyAccessToken(token) {
  try {
    assertAdminSecretsConfigured();
    const decoded = jwt.verify(token, ADMIN_SECRET);
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(token) {
  try {
    assertAdminSecretsConfigured();
    const decoded = jwt.verify(token, REFRESH_SECRET);
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Hash password using SHA-256
 */
export function hashPassword(password) {
  assertAdminSecretsConfigured();
  const perUserSalt = crypto.randomBytes(16).toString('hex');
  const fullSalt = `${PASSWORD_SALT}:${perUserSalt}`;
  const derivedKey = crypto
    .scryptSync(password, fullSalt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P })
    .toString('hex');
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${perUserSalt}$${derivedKey}`;
}

/**
 * Verify password
 */
export function verifyPassword(password, hash) {
  assertAdminSecretsConfigured();
  if (!hash) {
    return false;
  }

  // Backward-compatible support for legacy SHA-256 hashes.
  if (!hash.startsWith('scrypt$')) {
    const legacyHash = crypto
      .createHash('sha256')
      .update(`${password}${PASSWORD_SALT}`)
      .digest('hex');

    try {
      return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(legacyHash));
    } catch {
      return false;
    }
  }

  const parts = hash.split('$');
  if (parts.length < 2) {
    return false;
  }

  // Backward-compatible support for old scrypt format: scrypt$<derivedKey>.
  if (parts.length === 2) {
    const storedDerivedKey = parts[1];
    const suppliedKey = crypto.scryptSync(password, PASSWORD_SALT, SCRYPT_KEYLEN).toString('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(storedDerivedKey), Buffer.from(suppliedKey));
    } catch {
      return false;
    }
  }

  // Preferred format: scrypt$N$r$p$perUserSalt$derivedKey.
  const [, nRaw, rRaw, pRaw, perUserSalt, storedDerivedKey] = parts;
  if (!nRaw || !rRaw || !pRaw || !perUserSalt || !storedDerivedKey) {
    return false;
  }

  const n = Number(nRaw);
  const r = Number(rRaw);
  const p = Number(pRaw);
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p)) {
    return false;
  }

  const suppliedKey = crypto
    .scryptSync(password, `${PASSWORD_SALT}:${perUserSalt}`, SCRYPT_KEYLEN, { N: n, r, p })
    .toString('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(storedDerivedKey), Buffer.from(suppliedKey));
  } catch {
    return false;
  }
}

/**
 * Generate session ID
 */
export function generateSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate CSRF token
 */
export function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  constructor(maxAttempts = 5, windowMs = 15 * 60 * 1000) {
    this.maxAttempts = maxAttempts;
    this.windowMs = windowMs;
    this.attempts = new Map();
  }

  checkLimit(identifier) {
    const now = Date.now();
    const userAttempts = this.attempts.get(identifier) || [];
    
    // Remove old attempts outside the window
    const recentAttempts = userAttempts.filter(time => now - time < this.windowMs);
    
    if (recentAttempts.length >= this.maxAttempts) {
      return false;
    }
    
    recentAttempts.push(now);
    this.attempts.set(identifier, recentAttempts);
    return true;
  }

  reset(identifier) {
    this.attempts.delete(identifier);
  }

  isLocked(identifier) {
    const userAttempts = this.attempts.get(identifier) || [];
    const now = Date.now();
    const recentAttempts = userAttempts.filter(time => now - time < this.windowMs);
    return recentAttempts.length >= this.maxAttempts;
  }

  getRetryAfter(identifier) {
    const userAttempts = this.attempts.get(identifier) || [];
    if (userAttempts.length === 0) return 0;
    const oldestAttempt = Math.min(...userAttempts);
    return Math.ceil((oldestAttempt + this.windowMs - Date.now()) / 1000);
  }
}

export const loginLimiter = new RateLimiter(5, 15 * 60 * 1000); // 5 attempts per 15 minutes
export const mfaLimiter = new RateLimiter(3, 5 * 60 * 1000); // 3 attempts per 5 minutes
