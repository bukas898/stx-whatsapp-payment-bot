/**
 * WhatsApp Webhook - Main Entry Point
 * 
 * Receives WhatsApp messages from Twilio and routes them to appropriate handlers:
 * - Registration handler for new users
 * - Payment handler for payment commands
 * - Escrow handler for escrow commands
 * - Help commands
 * 
 * Deployed on Vercel as serverless function
 */

import dotenv from 'dotenv';
dotenv.config();

import registrationHandler from '../lib/handlers/registration.handler.js';
import paymentHandler from '../lib/handlers/payment.handler.js';
import escrowHandler from '../lib/handlers/escrow.handler.js';
import userService from '../lib/services/user.service.js';
import whatsappService from '../lib/services/whatsapp.service.js';

/**
 * Main webhook handler
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('📨 Incoming WhatsApp message:', req.body);

    // Extract message data from Twilio webhook
    const from = req.body.From; // Format: "whatsapp:+2349012345678"
    const body = req.body.Body; // Message text
    const messageId = req.body.MessageSid;

    // Validate required fields
    if (!from || !body) {
      console.error('Missing required fields:', { from, body });
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Extract phone number (remove "whatsapp:" prefix)
    const phoneNumber = from.replace('whatsapp:', '');
    
    console.log('Processing message from:', phoneNumber);
    console.log('Message:', body);

    // Process the message
    await processMessage(phoneNumber, body, messageId);

    // Respond to Twilio (200 OK acknowledges receipt)
    return res.status(200).json({ 
      success: true,
      message: 'Message received and processing'
    });

  } catch (error) {
    console.error('❌ Webhook error:', error);
    
    // Still return 200 to Twilio to prevent retries
    return res.status(200).json({ 
      success: false,
      error: error.message 
    });
  }
}

/**
 * Process incoming WhatsApp message
 */
async function processMessage(phoneNumber, messageText, messageId) {
  try {
    const normalizedMessage = messageText.toLowerCase().trim();

    // Help command - always available
    if (normalizedMessage === 'help' || normalizedMessage === 'menu') {
      await sendHelpMessage(phoneNumber);
      return;
    }

    // Check if user exists
    const user = await userService.getByPhone(phoneNumber);

    // Registration flow - for new users or explicit register command
    if (!user || normalizedMessage.startsWith('register')) {
      console.log('Routing to registration handler');
      const result = await registrationHandler.handleMessage(phoneNumber, messageText);
      
      if (result && result.message) {
        await whatsappService.sendMessage(phoneNumber, result.message);
      }
      return;
    }

    // Escrow commands - check first since they're more specific
    if (
      normalizedMessage.startsWith('escrow') ||
      normalizedMessage.startsWith('release escrow') ||
      normalizedMessage.startsWith('refund escrow') ||
      normalizedMessage.startsWith('cancel escrow') ||
      normalizedMessage.includes('escrow status') ||
      normalizedMessage === 'my escrows' ||
      normalizedMessage === 'escrows'
    ) {
      console.log('Routing to escrow handler');
      const result = await escrowHandler.handleMessage(phoneNumber, messageText);
      
      if (result === null) {
        await sendUnknownCommandMessage(phoneNumber);
      } else if (result && result.message) {
        await whatsappService.sendMessage(phoneNumber, result.message);
      }
      return;
    }

    // Payment commands - for registered users
    console.log('Routing to payment handler');
    const result = await paymentHandler.handleMessage(phoneNumber, messageText);
    
    if (result === null) {
      // Message not recognized by payment handler
      await sendUnknownCommandMessage(phoneNumber);
    } else if (result && result.message) {
      await whatsappService.sendMessage(phoneNumber, result.message);
    }

  } catch (error) {
    console.error('Error processing message:', error);
    
    // Send user-friendly error message
    await whatsappService.sendMessage(
      phoneNumber,
      '❌ Sorry, something went wrong. Please try again or type *help* for assistance.'
    );
  }
}

/**
 * Send help/menu message
 */
async function sendHelpMessage(phoneNumber) {
  try {
    // Check if user is registered
    const user = await userService.getByPhone(phoneNumber);

    if (!user) {
      // Help for new users
      const message = 
        `👋 *Welcome to STX WhatsApp Bot!*\n\n` +
        `Send and receive STX (Stacks) via WhatsApp.\n\n` +
        `*To get started:*\n` +
        `register [your-stx-address]\n\n` +
        `Example:\n` +
        `register SP2J6ZY48GV1EZ5V...\n\n` +
        `Need help? Visit our website.`;
      
      await whatsappService.sendMessage(phoneNumber, message);
    } else {
      // Help for registered users
      const message = 
        `💸 *STX WhatsApp Bot - Commands*\n\n` +
        `*Balance & History*\n` +
        `• balance - Check your balance\n` +
        `• history - View transactions\n\n` +
        `*Sending STX*\n` +
        `• send [amount] to [name/address]\n` +
        `  Example: send 5 to John\n\n` +
        `*Escrow (NEW!)* 🔒\n` +
        `• escrow [amount] to [name] for [time] hours/days\n` +
        `  Example: escrow 5 to John for 24 hours\n` +
        `• release escrow #[id]\n` +
        `• refund escrow #[id]\n` +
        `• cancel escrow #[id]\n` +
        `• my escrows - List all escrows\n\n` +
        `*Contacts*\n` +
        `• contacts - List your contacts\n` +
        `• add contact [name] [address]\n` +
        `  Example: add contact John SP2J6ZY...\n\n` +
        `*Other*\n` +
        `• help - Show this menu\n\n` +
        `Your address: ${user.stx_address.substring(0, 10)}...`;
      
      await whatsappService.sendMessage(phoneNumber, message);
    }
  } catch (error) {
    console.error('Error sending help:', error);
  }
}

/**
 * Send unknown command message
 */
async function sendUnknownCommandMessage(phoneNumber) {
  const message = 
    `❓ *Command not recognized*\n\n` +
    `Type *help* to see available commands.\n\n` +
    `Quick commands:\n` +
    `• balance\n` +
    `• send [amount] to [name]\n` +
    `• escrow [amount] to [name] for [time]\n` +
    `• contacts\n` +
    `• history`;
  
  await whatsappService.sendMessage(phoneNumber, message);
}

/**
 * Health check endpoint (for monitoring)
 */
export async function healthCheck(req, res) {
  return res.status(200).json({ 
    status: 'ok',
    service: 'stx-whatsapp-bot',
    timestamp: new Date().toISOString(),
    features: ['payments', 'escrow', 'contacts']
  });
}