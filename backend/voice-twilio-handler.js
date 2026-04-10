/**
 * Twilio Voice handler for Fahamu Shamba.
 * Reuses the USSD state machine so farmers can navigate the same services via keypad calls.
 */

import { handleUSSD } from './ussd-service.js';

const VOICE_USSD_SERVICE_CODE = '*123#';

function escapeXml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function normalizeForVoice(text = '') {
  return String(text)
    .replace(/\n+/g, '. ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function buildGatherTwiml(promptText) {
  const spokenPrompt = escapeXml(normalizeForVoice(promptText));
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather action="/api/voice/twilio/menu" method="POST" input="dtmf" numDigits="1" timeout="10">
    <Say voice="alice">${spokenPrompt}</Say>
  </Gather>
  <Say voice="alice">No input received. Please call again to continue.</Say>
  <Hangup/>
</Response>`;
}

function buildEndTwiml(message) {
  const spokenMessage = escapeXml(normalizeForVoice(message));
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="alice">${spokenMessage}</Say>
  <Hangup/>
</Response>`;
}

function resolveCallSessionId(req) {
  return req.body?.CallSid || req.body?.callSid || req.query?.callSid || `voice_${Date.now()}`;
}

function resolveCaller(req) {
  return req.body?.From || req.body?.from || req.query?.from || 'unknown';
}

export async function handleTwilioVoiceInbound(req, res) {
  try {
    const sessionId = resolveCallSessionId(req);
    const phoneNumber = resolveCaller(req);

    const initial = await handleUSSD(sessionId, phoneNumber, '', VOICE_USSD_SERVICE_CODE);
    res.set('Content-Type', 'text/xml');
    res.send(buildGatherTwiml(initial.response));
  } catch (error) {
    console.error('Twilio Voice inbound error:', error);
    res.set('Content-Type', 'text/xml');
    res.send(buildEndTwiml('Service temporarily unavailable. Please try again later.'));
  }
}

export async function handleTwilioVoiceMenu(req, res) {
  try {
    const sessionId = resolveCallSessionId(req);
    const phoneNumber = resolveCaller(req);
    const digits = String(req.body?.Digits || '').trim();

    const result = await handleUSSD(
      sessionId,
      phoneNumber,
      digits,
      VOICE_USSD_SERVICE_CODE
    );

    res.set('Content-Type', 'text/xml');
    if (result.endSession) {
      res.send(buildEndTwiml(result.response));
      return;
    }

    res.send(buildGatherTwiml(result.response));
  } catch (error) {
    console.error('Twilio Voice menu error:', error);
    res.set('Content-Type', 'text/xml');
    res.send(buildEndTwiml('Service temporarily unavailable. Please try again later.'));
  }
}

export const TWILIO_VOICE_INBOUND_WEBHOOK = '/api/voice/twilio/inbound';
export const TWILIO_VOICE_MENU_WEBHOOK = '/api/voice/twilio/menu';

