/**
 * Africa's Talking USSD Handler for Fahamu Shamba
 * Integrates with existing USSD service
 */

import { handleUSSD } from './ussd-service.js';

/**
 * Handle incoming Africa's Talking USSD requests
 */
export async function handleAfricaTalkingUSSD(req, res) {
  try {
    // Extract Africa's Talking USSD parameters
    const { 
      sessionId, 
      serviceCode, 
      phoneNumber, 
      text 
    } = req.body;

    console.log(`[Africa's Talking USSD] Request: sessionId=${sessionId}, phone=${phoneNumber}, text=${text}`);

    // Validate required parameters
    if (!sessionId || !phoneNumber) {
      return res.status(400).json({
        status: 'error',
        message: 'Missing required parameters: sessionId, phoneNumber'
      });
    }

    // Use existing USSD service
    const result = await handleUSSD(sessionId, phoneNumber, text || '', serviceCode || '');

    // Format response for Africa's Talking
    const africaTalkingResponse = {
      response: result.response,
      endSession: result.endSession
    };

    res.json(africaTalkingResponse);

  } catch (error) {
    console.error('Africa\'s Talking USSD Error:', error);
    
    res.json({
      response: 'Service temporarily unavailable. Please try again later.',
      endSession: true
    });
  }
}

/**
 * Configure Africa's Talking webhook URL
 * This URL should be set in your Africa's Talking console
 */
export const AFRICASTALKING_USSD_WEBHOOK = '/api/ussd/africastalking';

export default {
  handleAfricaTalkingUSSD,
  AFRICASTALKING_USSD_WEBHOOK
};
