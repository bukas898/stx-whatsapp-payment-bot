/**
 * Main Webhook Endpoint
 * Receives incoming WhatsApp messages from Twilio
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Webhook handler for incoming WhatsApp messages
 * 
 * This is a basic "Hello World" version for Phase 1 testing
 * Will be expanded in later phases to handle:
 * - User registration
 * - Contact management
 * - Send commands
 * - Multi-step conversations
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only accept POST requests from Twilio
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Extract message data from Twilio webhook
    const { Body, From, To } = req.body;

    console.log('📨 Incoming message:', {
      from: From,
      to: To,
      body: Body,
      timestamp: new Date().toISOString(),
    });

    // For Phase 1, just acknowledge receipt
    // TwiML response format for WhatsApp
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>👋 Hello! I'm your STX payment bot. 

Phase 1 is working! ✅

I received your message: "${Body}"

More features coming soon! 🚀</Message>
</Response>`;

    // Return TwiML response
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(twiml);

  } catch (error) {
    console.error('❌ Webhook error:', error);
    
    // Return error response in TwiML format
    const errorTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>⚠️ Something went wrong. Please try again later.</Message>
</Response>`;

    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(errorTwiml);
  }
}
