import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IS_VERCEL = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
const LOGS_DIR = process.env.LOGS_DIR || (IS_VERCEL ? '/tmp/fahamu-shamba-logs' : path.join(__dirname, 'logs'));
const AUDIT_LOG_FILE = path.join(LOGS_DIR, 'admin-audit.log');
const SECURITY_LOG_FILE = path.join(LOGS_DIR, 'admin-security.log');
let logsWritable = true;

// Ensure logs directory exists
try {
  if (!fs.existsSync(LOGS_DIR)) {
    fs.mkdirSync(LOGS_DIR, { recursive: true });
  }
} catch (error) {
  logsWritable = false;
  console.warn(`Audit logs disabled: ${error.message}`);
}

function appendLogSafe(logFile, logLine) {
  if (!logsWritable) return;
  try {
    fs.appendFileSync(logFile, logLine, { encoding: 'utf8' });
  } catch (error) {
    logsWritable = false;
    console.error(`Failed writing audit log to ${logFile}:`, error.message);
  }
}

/**
 * Log audit events (user actions)
 */
export function logAuditEvent(adminId, email, action, details, status = 'success', ipAddress = null, userAgent = null) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    adminId,
    email,
    action,
    details,
    status,
    ipAddress,
    userAgent,
    hash: generateLogHash()
  };

  const logLine = JSON.stringify(logEntry) + '\n';
  appendLogSafe(AUDIT_LOG_FILE, logLine);

  if (status === 'failure') {
    logSecurityEvent('audit_failure', logEntry);
  }
}

/**
 * Log security events
 */
export function logSecurityEvent(eventType, details, severity = 'warning') {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    eventType,
    severity, // 'info', 'warning', 'critical'
    details,
    hash: generateLogHash()
  };

  const logLine = JSON.stringify(logEntry) + '\n';
  appendLogSafe(SECURITY_LOG_FILE, logLine);

  // Alert on critical events
  if (severity === 'critical') {
    console.error(`[SECURITY ALERT] ${eventType}: ${JSON.stringify(details)}`);
  }
}

/**
 * Log API calls for audit trail
 */
export function logAPICall(adminId, method, endpoint, statusCode, ipAddress, userAgent) {
  logAuditEvent(
    adminId,
    'system',
    'api_call',
    {
      method,
      endpoint,
      statusCode
    },
    statusCode >= 200 && statusCode < 300 ? 'success' : 'failure',
    ipAddress,
    userAgent
  );
}

/**
 * Log login attempts
 */
export function logLoginAttempt(email, success, ipAddress, userAgent, reason = null) {
  const action = success ? 'login_success' : 'login_failure';
  const severity = success ? 'info' : 'warning';
  
  logAuditEvent(
    null,
    email,
    action,
    { reason },
    success ? 'success' : 'failure',
    ipAddress,
    userAgent
  );

  if (!success) {
    logSecurityEvent('failed_login_attempt', { email, ipAddress }, severity);
  }
}

/**
 * Log MFA events
 */
export function logMFAEvent(adminId, email, eventType, success, ipAddress) {
  logAuditEvent(
    adminId,
    email,
    `mfa_${eventType}`,
    { mfaType: 'totp' },
    success ? 'success' : 'failure',
    ipAddress
  );

  if (!success) {
    logSecurityEvent('failed_mfa_attempt', { adminId, email, ipAddress }, 'warning');
  }
}

/**
 * Log configuration changes
 */
export function logConfigChange(adminId, email, configKey, oldValue, newValue, ipAddress) {
  logAuditEvent(
    adminId,
    email,
    'config_change',
    {
      configKey,
      oldValue: maskSensitiveData(oldValue),
      newValue: maskSensitiveData(newValue)
    },
    'success',
    ipAddress
  );

  logSecurityEvent('configuration_modified', { adminId, email, configKey }, 'info');
}

/**
 * Log data access
 */
export function logDataAccess(adminId, email, dataType, recordCount, ipAddress) {
  logAuditEvent(
    adminId,
    email,
    'data_access',
    {
      dataType,
      recordCount
    },
    'success',
    ipAddress
  );
}

/**
 * Log system alerts
 */
export function logSystemAlert(alertType, details, severity = 'warning') {
  logSecurityEvent(alertType, details, severity);
}

/**
 * Get audit logs
 */
export function getAuditLogs(limit = 100, filter = {}) {
  try {
    const logs = fs.readFileSync(AUDIT_LOG_FILE, 'utf8')
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line))
      .reverse()
      .slice(0, limit);

    // Apply filters
    if (filter.adminId) {
      return logs.filter(log => log.adminId === filter.adminId);
    }
    if (filter.action) {
      return logs.filter(log => log.action === filter.action);
    }
    if (filter.email) {
      return logs.filter(log => log.email === filter.email);
    }

    return logs;
  } catch (error) {
    console.error('Error reading audit logs:', error);
    return [];
  }
}

/**
 * Get security logs
 */
export function getSecurityLogs(limit = 100, severity = null) {
  try {
    let logs = fs.readFileSync(SECURITY_LOG_FILE, 'utf8')
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line))
      .reverse()
      .slice(0, limit);

    if (severity) {
      logs = logs.filter(log => log.severity === severity);
    }

    return logs;
  } catch (error) {
    console.error('Error reading security logs:', error);
    return [];
  }
}

/**
 * Generate log integrity hash
 */
function generateLogHash() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Mask sensitive data
 */
function maskSensitiveData(value) {
  if (!value) return value;
  const str = String(value);
  if (str.length <= 4) return '****';
  return str.slice(0, 2) + '*'.repeat(str.length - 4) + str.slice(-2);
}

/**
 * Export logs as JSON
 */
export function exportLogsAsJSON(logsType = 'audit', startDate = null, endDate = null) {
  try {
    const logFile = logsType === 'security' ? SECURITY_LOG_FILE : AUDIT_LOG_FILE;
    const logs = fs.readFileSync(logFile, 'utf8')
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));

    // Filter by date range if provided
    if (startDate || endDate) {
      return logs.filter(log => {
        const logDate = new Date(log.timestamp);
        if (startDate && logDate < new Date(startDate)) return false;
        if (endDate && logDate > new Date(endDate)) return false;
        return true;
      });
    }

    return logs;
  } catch (error) {
    console.error('Error exporting logs:', error);
    return [];
  }
}

/**
 * Clear old logs (retention policy)
 */
export function clearOldLogs(daysToKeep = 90) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  [AUDIT_LOG_FILE, SECURITY_LOG_FILE].forEach(logFile => {
    try {
      if (fs.existsSync(logFile)) {
        const logs = fs.readFileSync(logFile, 'utf8')
          .split('\n')
          .filter(line => line.trim())
          .map(line => JSON.parse(line))
          .filter(log => new Date(log.timestamp) > cutoffDate)
          .map(log => JSON.stringify(log))
          .join('\n') + '\n';

        fs.writeFileSync(logFile, logs, 'utf8');
        console.log(`Cleared logs older than ${daysToKeep} days from ${logFile}`);
      }
    } catch (error) {
      console.error(`Error clearing logs from ${logFile}:`, error);
    }
  });
}
