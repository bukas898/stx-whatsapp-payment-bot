/**
 * Parser Utility
 * Extracts structured data from user messages
 */

import { isValidSTXAddress } from './validator';

export interface SendCommandResult {
  amount: number;
  contactName: string;
  originalMessage: string;
}

/**
 * Parses "send" commands to extract amount and recipient name
 * Supports formats:
 * - "send 10 to Bob"
 * - "send 10 stx to Bob"
 * - "send 10.5 to Alice"
 * - "Send 100 to John Doe"
 * 
 * @param message - The user's message
 * @returns Parsed command result or null if invalid
 */
export function parseSendCommand(message: string): SendCommandResult | null {
  const normalizedMessage = message.trim().toLowerCase();
  
  // Pattern: "send <amount> [stx] to <name>"
  const sendPatterns = [
    /^send\s+(\d+(?:\.\d+)?)\s+to\s+(.+)$/i,           // "send 10 to Bob"
    /^send\s+(\d+(?:\.\d+)?)\s+stx\s+to\s+(.+)$/i,    // "send 10 stx to Bob"
  ];

  for (const pattern of sendPatterns) {
    const match = message.trim().match(pattern);
    if (match) {
      const amount = parseFloat(match[1]);
      const contactName = match[2].trim();

      return {
        amount,
        contactName,
        originalMessage: message.trim(),
      };
    }
  }

  return null;
}

/**
 * Checks if a message contains a valid STX address (user is trying to register)
 * @param message - The user's message
 * @returns The STX address if found, null otherwise
 */
export function isRegistrationMessage(message: string): string | null {
  const trimmedMessage = message.trim();
  
  // Check if the entire message is an STX address
  if (isValidSTXAddress(trimmedMessage)) {
    return trimmedMessage;
  }

  // Check if message contains an STX address anywhere
  const stxAddressPattern = /(SP|ST)[0-9A-Z]{38,40}/;
  const match = trimmedMessage.match(stxAddressPattern);
  
  if (match && isValidSTXAddress(match[0])) {
    return match[0];
  }

  return null;
}

/**
 * Checks if message is a "contacts" or "list contacts" command
 * @param message - The user's message
 * @returns true if it's a contacts command
 */
export function isContactsCommand(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return normalized === 'contacts' || 
         normalized === 'list contacts' || 
         normalized === 'my contacts' ||
         normalized === 'show contacts';
}

/**
 * Checks if message is a "claim" command
 * @param message - The user's message
 * @returns true if it's a claim command
 */
export function isClaimCommand(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return normalized === 'claim' || 
         normalized === 'claim funds' || 
         normalized === 'my claims';
}

/**
 * Extracts a simple yes/no response
 * @param message - The user's message
 * @returns true for yes, false for no, null for unclear
 */
export function parseYesNo(message: string): boolean | null {
  const normalized = message.trim().toLowerCase();
  
  const yesPatterns = ['yes', 'y', 'yeah', 'yep', 'sure', 'ok', 'okay'];
  const noPatterns = ['no', 'n', 'nope', 'nah'];

  if (yesPatterns.includes(normalized)) {
    return true;
  }
  
  if (noPatterns.includes(normalized)) {
    return false;
  }

  return null;
}

/**
 * Checks if message is a help command
 * @param message - The user's message
 * @returns true if it's a help command
 */
export function isHelpCommand(message: string): boolean {
  const normalized = message.trim().toLowerCase();
  return normalized === 'help' || 
         normalized === 'commands' || 
         normalized === 'what can you do' ||
         normalized === '?' ||
         normalized === 'menu';
}

/**
 * Extracts a name from a message (for sender name capture)
 * @param message - The user's message containing their name
 * @returns Cleaned name or null if invalid
 */
export function parseName(message: string): string | null {
  const trimmed = message.trim();
  
  // Name should be 1-50 characters, letters and spaces only
  if (trimmed.length === 0 || trimmed.length > 50) {
    return null;
  }

  // Allow letters, spaces, hyphens, and apostrophes
  const namePattern = /^[a-zA-Z\s'-]+$/;
  if (!namePattern.test(trimmed)) {
    return null;
  }

  return trimmed;
}
