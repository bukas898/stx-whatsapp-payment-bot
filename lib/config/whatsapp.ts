/**
 * WhatsApp/Twilio Configuration
 * Handles Twilio client setup for WhatsApp messaging
 */

import twilio from 'twilio';

/**
 * Get Twilio credentials from environment
 */
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

/**
 * Validate required environment variables
 */
function validateConfig() {
  if (!accountSid) {
    throw new Error('TWILIO_ACCOUNT_SID is not configured');
  }
  if (!authToken) {
    throw new Error('TWILIO_AUTH_TOKEN is not configured');
  }
  if (!twilioPhoneNumber) {
    throw new Error('TWILIO_PHONE_NUMBER is not configured');
  }
}

// Validate on import (will fail fast if misconfigured)
try {
  validateConfig();
} catch (error) {
  console.error('⚠️  Twilio configuration error:', error instanceof Error ? error.message : error);
  // Don't throw in production, allow app to start
  if (process.env.NODE_ENV !== 'production') {
    throw error;
  }
}

/**
 * Initialize Twilio client
 */
export const twilioClient = twilio(accountSid, authToken);

/**
 * Get the Twilio WhatsApp phone number
 * @returns Phone number with whatsapp: prefix
 */
export function getTwilioWhatsAppNumber(): string {
  if (!twilioPhoneNumber) {
    throw new Error('TWILIO_PHONE_NUMBER is not configured');
  }
  return `whatsapp:${twilioPhoneNumber}`;
}

/**
 * Get the raw Twilio phone number (without prefix)
 * @returns Phone number without whatsapp: prefix
 */
export function getTwilioPhoneNumber(): string {
  if (!twilioPhoneNumber) {
    throw new Error('TWILIO_PHONE_NUMBER is not configured');
  }
  return twilioPhoneNumber;
}

/**
 * Clean phone number from Twilio format
 * Removes "whatsapp:" prefix if present
 * @param phone - Phone number possibly with whatsapp: prefix
 * @returns Clean phone number
 */
export function cleanTwilioPhone(phone: string): string {
  return phone.replace('whatsapp:', '');
}

/**
 * Format phone number for Twilio
 * Adds "whatsapp:" prefix if not present
 * @param phone - Clean phone number
 * @returns Phone number with whatsapp: prefix
 */
export function formatForTwilio(phone: string): string {
  if (phone.startsWith('whatsapp:')) {
    return phone;
  }
  return `whatsapp:${phone}`;
}

// Export configuration object
export const whatsappConfig = {
  client: twilioClient,
  phoneNumber: getTwilioPhoneNumber,
  whatsappNumber: getTwilioWhatsAppNumber,
  cleanPhone: cleanTwilioPhone,
  formatPhone: formatForTwilio,
};

export default whatsappConfig;
