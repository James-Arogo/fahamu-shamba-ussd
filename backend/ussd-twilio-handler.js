/**
 * Twilio USSD Handler for Fahamu Shamba
 * Integrates with existing USSD service
 */

import { handleUSSD } from './ussd-service.js';

/**
 * Handle incoming Twilio USSD requests
 */
export function handleTwilioUSSD(req, res) {
  try {
    // Extract Twilio USSD parameters
    const { 
      From: fromNumber, 
      To: toNumber, 
      Body: bodyText 
    } = req.body;

    // Map Twilio parameters to USSD service format
    const sessionId = `twilio_${fromNumber}_${Date.now()}`;
    const serviceCode = toNumber || '*123#';
    const phoneNumber = fromNumber;
    const text = bodyText || '';

    console.log(`[Twilio USSD] Request: sessionId=${sessionId}, phone=${phoneNumber}, text=${text}, serviceCode=${serviceCode}`);

    // Use existing USSD service
    const result = handleUSSD(sessionId, phoneNumber, text, serviceCode);

    // Format response for Twilio
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>
    <Body>${result.response}</Body>
  </Message>
</Response>`;

    // Set appropriate headers
    res.set('Content-Type', 'text/xml');
    res.send(twimlResponse);

  } catch (error) {
    console.error('Twilio USSD Error:', error);
    
    const errorResponse = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>
    <Body>Service temporarily unavailable. Please try again later.</Body>
  </Message>
</Response>`;

    res.set('Content-Type', 'text/xml');
    res.send(errorResponse);
  }
}

/**
 * Configure Twilio webhook URL
 * This URL should be set in your Twilio console
 */
export const TWILIO_USSD_WEBHOOK = '/api/ussd/twilio';

export default {
  handleTwilioUSSD,
  TWILIO_USSD_WEBHOOK
};
