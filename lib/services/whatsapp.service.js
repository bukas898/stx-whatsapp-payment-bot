/**
 * WhatsApp Service (JavaScript)
 * Handles sending WhatsApp messages via Twilio
 */

import twilio from 'twilio';

class WhatsAppService {
  constructor() {
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    // Check if credentials are set (will be undefined during testing without Twilio)
    if (this.accountSid && this.authToken && this.whatsappNumber) {
      this.client = twilio(this.accountSid, this.authToken);
      this.isConfigured = true;
    } else {
      this.client = null;
      this.isConfigured = false;
      console.warn('⚠️  WhatsApp Service: Twilio credentials not configured. Messages will be simulated.');
    }
  }

  /**
   * Check if WhatsApp service is properly configured
   * @returns {boolean}
   */
  isReady() {
    return this.isConfigured;
  }

  /**
   * Send a WhatsApp message
   * @param {string} to - Recipient phone number (e.g., +2349012345678)
   * @param {string} message - Message text
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendMessage(to, message) {
    try {
      // Validate phone number format
      if (!to.match(/^\+234\d{10}$/)) {
        return {
          success: false,
          error: 'Invalid phone number format. Must be +234XXXXXXXXXX',
        };
      }

      // Validate message
      if (!message || message.trim().length === 0) {
        return {
          success: false,
          error: 'Message cannot be empty',
        };
      }

      // Check if service is configured
      if (!this.isConfigured) {
        // Simulate sending (for testing without Twilio credentials)
        console.log(`📱 [SIMULATED] WhatsApp to ${to}:`);
        console.log(`   ${message}`);
        return {
          success: true,
          messageId: `sim_${Date.now()}`,
          simulated: true,
        };
      }

      // Format WhatsApp number (add whatsapp: prefix)
      const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
      const formattedFrom = this.whatsappNumber.startsWith('whatsapp:') 
        ? this.whatsappNumber 
        : `whatsapp:${this.whatsappNumber}`;

      // Send message via Twilio
      const result = await this.client.messages.create({
        body: message,
        from: formattedFrom,
        to: formattedTo,
      });

      return {
        success: true,
        messageId: result.sid,
      };
    } catch (error) {
      console.error('WhatsApp send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Send welcome message to new user
   * @param {string} to - Phone number
   * @param {string} stxAddress - User's STX address
   */
  async sendWelcomeMessage(to, stxAddress) {
    const message = `🎉 Welcome to STX WhatsApp Bot!

Your account has been registered successfully.

📱 Phone: ${to}
🔑 STX Address: ${stxAddress}

You can now:
• Send STX: "send <amount> to <contact or phone>"
• Add contact: "add contact <name> <phone>"
• Check balance: "balance"
• Get help: "help"

Start by adding contacts or sending your first payment!`;

    return await this.sendMessage(to, message);
  }

  /**
   * Send registration prompt
   * @param {string} to - Phone number
   */
  async sendRegistrationPrompt(to) {
    const message = `👋 Welcome to STX WhatsApp Bot!

You're not registered yet. To get started, please send your Stacks (STX) address.

Format: SP... or ST...
Example: SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7

Reply with your STX address to register.`;

    return await this.sendMessage(to, message);
  }

  /**
   * Send error message
   * @param {string} to - Phone number
   * @param {string} errorMessage - Error description
   */
  async sendErrorMessage(to, errorMessage) {
    const message = `❌ Error: ${errorMessage}

Type "help" for available commands.`;

    return await this.sendMessage(to, message);
  }

  /**
   * Send help message
   * @param {string} to - Phone number
   * @param {boolean} isRegistered - Whether user is registered
   */
  async sendHelpMessage(to, isRegistered = false) {
    let message;

    if (isRegistered) {
      message = `📚 STX WhatsApp Bot - Help

Available commands:

💸 Payments:
• send <amount> to <contact>
• send <amount> to <phone>
Example: send 10 to John
Example: send 5 to +2349012345678

👥 Contacts:
• add contact <name> <phone>
• list contacts
• remove contact <name>

💰 Account:
• balance - Check your STX balance
• address - View your STX address
• transactions - View recent transactions

ℹ️ Other:
• help - Show this message
• about - About this bot

Need more help? Visit our documentation.`;
    } else {
      message = `📚 STX WhatsApp Bot - Help

You're not registered yet!

To register:
1. Send your Stacks (STX) address
   Format: SP... or ST...
   Example: SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7

After registration, you can:
• Send STX to contacts or phone numbers
• Add and manage contacts
• Check your balance
• View transaction history

What is an STX address?
Your Stacks blockchain wallet address. Get one from:
• Hiro Wallet (wallet.hiro.so)
• Xverse Wallet
• Leather Wallet`;
    }

    return await this.sendMessage(to, message);
  }

  /**
   * Format a message with proper WhatsApp formatting
   * @param {string} text - Raw text
   * @returns {string} Formatted text
   */
  formatMessage(text) {
    // WhatsApp supports basic markdown-style formatting
    // *bold* _italic_ ~strikethrough~ ```monospace```
    return text.trim();
  }

  /**
   * Send payment confirmation
   * @param {string} to - Phone number
   * @param {Object} details - Payment details
   */
  async sendPaymentConfirmation(to, details) {
    const { recipient, amount, txId } = details;
    
    const amountSTX = (amount / 1000000).toFixed(6);
    
    const message = `✅ Payment Sent Successfully!

💸 Amount: ${amountSTX} STX
👤 To: ${recipient}
🔗 Transaction ID: ${txId}

View on explorer:
https://explorer.hiro.so/txid/${txId}?chain=mainnet`;

    return await this.sendMessage(to, message);
  }

  /**
   * Send escrow notification to recipient
   * @param {string} to - Recipient phone number
   * @param {Object} details - Escrow details
   */
  async sendEscrowNotification(to, details) {
    const { amount, claimToken } = details;
    const amountSTX = (amount / 1000000).toFixed(6);

    const message = `🎁 You've received ${amountSTX} STX!

Someone sent you STX, but you're not registered yet.

To claim:
1. Register by sending your STX address
2. Reply with: claim ${claimToken}

The funds are held safely in escrow for 7 days.

Get an STX address from:
• Hiro Wallet (wallet.hiro.so)
• Xverse or Leather Wallet`;

    return await this.sendMessage(to, message);
  }
}

// Export singleton instance
export const whatsappService = new WhatsAppService();
export default WhatsAppService;