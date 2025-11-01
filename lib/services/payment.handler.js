/**
 * Payment Handler
 * 
 * Handles payment-related WhatsApp commands:
 * - "send 5 to John" - Send STX to a contact
 * - "send 10 to SP2J6..." - Send to an address
 * - "balance" - Check balance
 * - "history" - View transaction history
 * - "contacts" - List contacts
 * - "add contact Name SP..." - Add contact
 */

import userService from '../services/user.service.js';
import contactService from '../services/contact.service.js';
import transactionService from '../services/transaction.service.js';
import stacksService from '../services/stacks.service.js';
import stateService from '../services/state.service.js';
import whatsappService from '../services/whatsapp.service.js';

class PaymentHandler {
  /**
   * Handle incoming payment-related messages
   * @param {string} phoneNumber - User's phone number
   * @param {string} message - Message text
   * @returns {Promise<Object>} Handler result
   */
  async handleMessage(phoneNumber, message) {
    try {
      const normalizedMessage = message.toLowerCase().trim();

      // Check if user is registered
      const user = await userService.getByPhone(phoneNumber);
      if (!user) {
        return {
          success: false,
          message: '❌ You need to register first.\n\nSend: register [your-stx-address]',
        };
      }

      // Check conversation state (for multi-step flows)
      const state = await stateService.getState(phoneNumber);
      if (state && state.handler === 'payment') {
        return await this.handleStateFlow(phoneNumber, message, state);
      }

      // Route to appropriate handler
      if (normalizedMessage === 'balance') {
        return await this.handleBalance(phoneNumber, user);
      }

      if (normalizedMessage === 'history' || normalizedMessage.startsWith('history')) {
        return await this.handleHistory(phoneNumber, user);
      }

      if (normalizedMessage === 'contacts' || normalizedMessage === 'list contacts') {
        return await this.handleListContacts(phoneNumber);
      }

      if (normalizedMessage.startsWith('add contact')) {
        return await this.handleAddContact(phoneNumber, message);
      }

      if (normalizedMessage.startsWith('send')) {
        return await this.handleSend(phoneNumber, message, user);
      }

      // Not a payment command
      return null;
    } catch (error) {
      console.error('Error in payment handler:', error);
      return {
        success: false,
        message: `❌ Error: ${error.message}`,
      };
    }
  }

  /**
   * Handle "balance" command
   */
  async handleBalance(phoneNumber, user) {
    try {
      const balance = await stacksService.getBalance(user.stx_address);
      
      const message = `💰 *Your Balance*\n\n` +
        `Available: *${balance.stx.balanceStx.toFixed(6)} STX*\n` +
        `Locked: ${balance.stx.lockedStx.toFixed(6)} STX\n\n` +
        `Address: ${user.stx_address.substring(0, 10)}...${user.stx_address.substring(user.stx_address.length - 6)}`;

      await whatsappService.sendMessage(phoneNumber, message);
      
      return { success: true };
    } catch (error) {
      console.error('Error getting balance:', error);
      return {
        success: false,
        message: '❌ Failed to get balance. Please try again.',
      };
    }
  }

  /**
   * Handle "history" command
   */
  async handleHistory(phoneNumber, user) {
    try {
      const transactions = await transactionService.getTransactionsByPhone(phoneNumber, 'all', 10);
      
      if (transactions.length === 0) {
        await whatsappService.sendMessage(
          phoneNumber,
          '📜 *Transaction History*\n\nNo transactions yet.'
        );
        return { success: true };
      }

      let message = `📜 *Recent Transactions* (${transactions.length})\n\n`;

      transactions.forEach((tx, index) => {
        const formatted = transactionService.formatTransaction(tx);
        const isSent = tx.sender_phone === phoneNumber;
        const icon = isSent ? '📤' : '📥';
        const statusIcon = tx.status === 'confirmed' ? '✅' : 
                          tx.status === 'pending' ? '⏳' : '❌';

        message += `${index + 1}. ${icon} ${isSent ? 'Sent' : 'Received'}\n`;
        message += `   ${formatted.amountStx} ${statusIcon}\n`;
        message += `   ${isSent ? 'To' : 'From'}: ${isSent ? tx.recipient_phone : tx.sender_phone}\n`;
        message += `   ${new Date(tx.created_at).toLocaleDateString()}\n\n`;
      });

      await whatsappService.sendMessage(phoneNumber, message);
      
      return { success: true };
    } catch (error) {
      console.error('Error getting history:', error);
      return {
        success: false,
        message: '❌ Failed to get transaction history.',
      };
    }
  }

  /**
   * Handle "contacts" command
   */
  async handleListContacts(phoneNumber) {
    try {
      const contacts = await contactService.getContacts(phoneNumber);
      const formatted = contactService.formatContactList(contacts);
      
      await whatsappService.sendMessage(phoneNumber, formatted);
      
      return { success: true };
    } catch (error) {
      console.error('Error listing contacts:', error);
      return {
        success: false,
        message: '❌ Failed to get contacts.',
      };
    }
  }

  /**
   * Handle "add contact Name Address" command
   */
  async handleAddContact(phoneNumber, message) {
    try {
      // Parse: "add contact John SP2J6ZY..."
      const parts = message.split(/\s+/);
      
      if (parts.length < 4) {
        return {
          success: false,
          message: '❌ Invalid format.\n\nUse: add contact [Name] [STX-Address]\n\nExample: add contact John SP2J6ZY48GV1EZ5V...',
        };
      }

      const contactName = parts[2];
      const contactAddress = parts[3];

      // Validate address
      if (!stacksService.isValidAddress(contactAddress)) {
        return {
          success: false,
          message: '❌ Invalid STX address.\n\nAddress must start with SP for mainnet.',
        };
      }

      // Add contact
      await contactService.addContact(phoneNumber, contactName, contactAddress);

      const normalized = contactService.normalizeContactName(contactName);
      
      await whatsappService.sendMessage(
        phoneNumber,
        `✅ Contact added!\n\n*${normalized}*\n${contactAddress}\n\nYou can now send: "send 5 to ${normalized}"`
      );

      return { success: true };
    } catch (error) {
      console.error('Error adding contact:', error);
      return {
        success: false,
        message: `❌ ${error.message}`,
      };
    }
  }

  /**
   * Handle "send X to Y" command
   */
  async handleSend(phoneNumber, message, user) {
    try {
      // Parse: "send 5 to John" or "send 10 STX to SP2J6ZY..."
      const sendMatch = message.match(/send\s+(\d+(?:\.\d+)?)\s*(?:stx)?\s+to\s+(.+)/i);
      
      if (!sendMatch) {
        return {
          success: false,
          message: '❌ Invalid format.\n\nUse: send [amount] to [name or address]\n\nExamples:\n• send 5 to John\n• send 10 to SP2J6ZY48GV1...',
        };
      }

      const amount = parseFloat(sendMatch[1]);
      const recipientInput = sendMatch[2].trim();

      // Validate amount
      if (amount <= 0) {
        return {
          success: false,
          message: '❌ Amount must be greater than 0.',
        };
      }

      // Check balance
      const balance = await stacksService.getBalance(user.stx_address);
      const fees = await stacksService.estimateFee();
      const totalNeeded = amount + fees.mediumStx;

      if (balance.stx.balanceStx < totalNeeded) {
        return {
          success: false,
          message: `❌ Insufficient balance.\n\nYou have: ${balance.stx.balanceStx.toFixed(6)} STX\n` +
                   `Need: ${totalNeeded.toFixed(6)} STX (including ~${fees.mediumStx.toFixed(6)} STX fee)`,
        };
      }

      // Resolve recipient
      let recipient;
      try {
        recipient = await contactService.resolveRecipient(phoneNumber, recipientInput);
      } catch (error) {
        return {
          success: false,
          message: `❌ ${error.message}`,
        };
      }

      // Save state for confirmation
      await stateService.setState(phoneNumber, 'payment', 'confirm_send', {
        amount,
        amountMicroStx: stacksService.stxToMicroStx(amount),
        recipient,
        senderAddress: user.stx_address,
        fee: fees.medium,
        feeStx: fees.mediumStx,
      });

      // Send confirmation prompt
      const confirmMessage = `💸 *Confirm Payment*\n\n` +
        `Amount: *${amount} STX*\n` +
        `To: ${recipient.name || recipient.address}\n` +
        `${recipient.address.substring(0, 10)}...${recipient.address.substring(recipient.address.length - 6)}\n` +
        `Fee: ~${fees.mediumStx.toFixed(6)} STX\n` +
        `Total: *${(amount + fees.mediumStx).toFixed(6)} STX*\n\n` +
        `Reply:\n*yes* to confirm\n*no* to cancel`;

      await whatsappService.sendMessage(phoneNumber, confirmMessage);

      return { success: true };
    } catch (error) {
      console.error('Error handling send:', error);
      return {
        success: false,
        message: `❌ ${error.message}`,
      };
    }
  }

  /**
   * Handle multi-step conversation flows
   */
  async handleStateFlow(phoneNumber, message, state) {
    try {
      const normalizedMessage = message.toLowerCase().trim();

      if (state.step === 'confirm_send') {
        if (normalizedMessage === 'yes') {
          return await this.executeSend(phoneNumber, state);
        } else if (normalizedMessage === 'no') {
          await stateService.clearState(phoneNumber);
          await whatsappService.sendMessage(phoneNumber, '❌ Payment cancelled.');
          return { success: true };
        } else {
          await whatsappService.sendMessage(
            phoneNumber,
            '⚠️ Please reply *yes* to confirm or *no* to cancel.'
          );
          return { success: true };
        }
      }

      return null;
    } catch (error) {
      console.error('Error in state flow:', error);
      await stateService.clearState(phoneNumber);
      return {
        success: false,
        message: `❌ ${error.message}`,
      };
    }
  }

  /**
   * Execute the payment after confirmation
   */
  async executeSend(phoneNumber, state) {
    try {
      const { amount, amountMicroStx, recipient, senderAddress } = state.data;

      // Get user for private key (NOTE: In production, use secure key management)
      const user = await userService.getByPhone(phoneNumber);
      
      // Get recipient phone number if it's a contact
      let recipientPhone = null;
      if (recipient.isContact && recipient.phone) {
        recipientPhone = recipient.phone;
      }

      // Send status message
      await whatsappService.sendMessage(
        phoneNumber,
        '⏳ Processing payment...\n\nThis may take a few moments.'
      );

      // NOTE: In production, you would need to securely store and retrieve private keys
      // For now, this is a placeholder - YOU NEED TO IMPLEMENT SECURE KEY STORAGE
      const senderKey = user.private_key; // This would come from secure storage

      if (!senderKey) {
        throw new Error('Private key not available. Please contact support.');
      }

      // Create and broadcast transaction
      const result = await transactionService.sendTransaction({
        senderAddress,
        senderKey,
        senderPhone: phoneNumber,
        recipientAddress: recipient.address,
        recipientPhone,
        amountMicroStx,
        memo: `Payment via WhatsApp`,
      });

      // Clear state
      await stateService.clearState(phoneNumber);

      // Send success message to sender
      const successMessage = `✅ *Payment Sent!*\n\n` +
        `Amount: ${amount} STX\n` +
        `To: ${recipient.name || 'Address'}\n` +
        `TX ID: ${result.txId.substring(0, 10)}...${result.txId.substring(result.txId.length - 6)}\n\n` +
        `⏳ Confirming on blockchain...\n` +
        `View: https://explorer.stacks.co/txid/${result.txId}`;

      await whatsappService.sendMessage(phoneNumber, successMessage);

      // Notify recipient if they have a phone number
      if (recipientPhone) {
        const recipientUser = await userService.getByPhone(recipientPhone);
        if (recipientUser) {
          await whatsappService.sendMessage(
            recipientPhone,
            `📥 *Payment Received!*\n\n` +
            `Amount: ${amount} STX\n` +
            `From: ${phoneNumber}\n` +
            `TX ID: ${result.txId.substring(0, 10)}...`
          );
        }
      }

      // Start monitoring transaction in background (optional)
      // You could implement background job here

      return { success: true };
    } catch (error) {
      console.error('Error executing send:', error);
      await stateService.clearState(phoneNumber);
      
      return {
        success: false,
        message: `❌ Payment failed: ${error.message}`,
      };
    }
  }

  /**
   * Get help text for payment commands
   */
  getHelpText() {
    return `💸 *Payment Commands*\n\n` +
      `*balance* - Check your balance\n` +
      `*send [amount] to [name/address]* - Send STX\n` +
      `  Example: send 5 to John\n` +
      `*history* - View transactions\n` +
      `*contacts* - List contacts\n` +
      `*add contact [name] [address]* - Add contact\n\n` +
      `Need help? Reply *help*`;
  }
}

// Export singleton instance
const paymentHandler = new PaymentHandler();
export default paymentHandler;