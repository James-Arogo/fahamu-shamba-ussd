import twilio from 'twilio';
import { logSecurityEvent } from './admin-audit-logger.js';

function getExternalUrl(req) {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const protocol = (forwardedProto ? forwardedProto.split(',')[0] : req.protocol || 'https').trim();
  const host = req.headers['x-forwarded-host'] || req.get('host');
  return `${protocol}://${host}${req.originalUrl}`;
}

function getTwilioParams(req) {
  if (req.body && typeof req.body === 'object') {
    return req.body;
  }
  return {};
}

export function verifyTwilioWebhook(req, res, next) {
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      logSecurityEvent('twilio_webhook_auth_token_missing', { endpoint: req.originalUrl }, 'critical');
      return res.status(503).json({ success: false, message: 'Webhook verification not configured' });
    }
    return next();
  }

  const signature = req.headers['x-twilio-signature'];
  if (!signature) {
    logSecurityEvent('twilio_webhook_missing_signature', { endpoint: req.originalUrl }, 'warning');
    return res.status(401).json({ success: false, message: 'Missing webhook signature' });
  }

  try {
    const url = getExternalUrl(req);
    const isValid = twilio.validateRequest(authToken, signature, url, getTwilioParams(req));
    if (!isValid) {
      logSecurityEvent('twilio_webhook_invalid_signature', { endpoint: req.originalUrl }, 'warning');
      return res.status(403).json({ success: false, message: 'Invalid webhook signature' });
    }
    return next();
  } catch (error) {
    logSecurityEvent('twilio_webhook_verification_error', { endpoint: req.originalUrl, reason: error.message }, 'warning');
    return res.status(403).json({ success: false, message: 'Webhook signature verification failed' });
  }
}

export function verifyAfricaTalkingWebhook(req, res, next) {
  const verificationToken = process.env.AFRICASTALKING_WEBHOOK_TOKEN || process.env.AFRICASTALKING_API_KEY;
  if (!verificationToken) {
    const isProduction = process.env.NODE_ENV === 'production';
    if (isProduction) {
      logSecurityEvent('africastalking_webhook_token_missing', { endpoint: req.originalUrl }, 'critical');
      return res.status(503).json({ success: false, message: 'Webhook verification not configured' });
    }
    return next();
  }

  const signatureHeader = req.headers['x-africastalking-signature'];
  const authorizationHeader = req.headers.authorization || '';
  const bearerToken = authorizationHeader.startsWith('Bearer ') ? authorizationHeader.slice(7).trim() : '';
  const tokenHeader = req.headers['x-webhook-token'];

  const providedToken = String(signatureHeader || bearerToken || tokenHeader || '').trim();
  if (!providedToken) {
    logSecurityEvent('africastalking_webhook_missing_token', { endpoint: req.originalUrl }, 'warning');
    return res.status(401).json({ success: false, message: 'Missing webhook verification token' });
  }

  if (providedToken !== verificationToken) {
    logSecurityEvent('africastalking_webhook_invalid_token', { endpoint: req.originalUrl }, 'warning');
    return res.status(403).json({ success: false, message: 'Invalid webhook verification token' });
  }

  return next();
}
