/**
 * Escrow Handler
 * 
 * Handles escrow-related WhatsApp commands:
 * - "escrow 5 to John for 24 hours" - Create escrow
 * - "release escrow #1" - Release funds to recipient
 * - "refund escrow #1" - Refund to sender after timeout
 * - "cancel escrow #1" - Cancel escrow
 * - "escrow status #1" - Check escrow status
 * - "my escrows" - List user's escrows
 */

import userService from '../services/user.service.js';
import contactService from '../services/contact.service.js';
import escrowService from '../services/escrow.service.js';
import stacksService from '../services/stacks.service.js';
import stateService from '../services/state.service.js';
import whatsappService from '../services/whatsapp.service.js';

class EscrowHandler {
  /**
   * Handle incoming escrow-related messages
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
      if (state && state.handler === 'escrow') {
        return await this.handleStateFlow(phoneNumber, message, state);
      }

      // Route to appropriate handler
      if (normalizedMessage.startsWith('escrow') && !normalizedMessage.includes('status')) {
        // "escrow 5 to John for 24 hours"
        return await this.handleCreateEscrow(phoneNumber, message, user);
      }

      if (normalizedMessage.startsWith('release escrow')) {
        // "release escrow #1"
        return await this.handleReleaseEscrow(phoneNumber, message, user);
      }

      if (normalizedMessage.startsWith('refund escrow')) {
        // "refund escrow #1"
        return await this.handleRefundEscrow(phoneNumber, message, user);
      }

      if (normalizedMessage.startsWith('cancel escrow')) {
        // "cancel escrow #1"
        return await this.handleCancelEscrow(phoneNumber, message, user);
      }

      if (normalizedMessage.includes('escrow status')) {
        // "escrow status #1"
        return await this.handleEscrowStatus(phoneNumber, message);
      }

      if (normalizedMessage === 'my escrows' || normalizedMessage === 'escrows') {
        // "my escrows"
        return await this.handleListEscrows(phoneNumber);
      }

      // Not an escrow command
      return null;
    } catch (error) {
      console.error('Error in escrow handler:', error);
      return {
        success: false,
        message: `❌ Error: ${error.message}`,
      };
    }
  }

  /**
   * Handle "escrow X to Y for Z hours/days" command
   */
  async handleCreateEscrow(phoneNumber, message, user) {
    try {
      // Parse: "escrow 5 to John for 24 hours"
      const escrowMatch = message.match(
        /escrow\s+(\d+(?:\.\d+)?)\s+to\s+(.+?)\s+for\s+(\d+)\s+(hour|hours|day|days)/i
      );

      if (!escrowMatch) {
        return {
          success: false,
          message: '❌ Invalid format.\n\nUse: escrow [amount] to [name/address] for [time] hours/days\n\nExamples:\n• escrow 5 to John for 24 hours\n• escrow 10 to Jane for 3 days',
        };
      }

      const amount = parseFloat(escrowMatch[1]);
      const recipientInput = escrowMatch[2].trim();
      const timeValue = parseInt(escrowMatch[3]);
      const timeUnit = escrowMatch[4].toLowerCase();

      // Validate amount
      if (amount <= 0) {
        return {
          success: false,
          message: '❌ Amount must be greater than 0.',
        };
      }

      // Calculate timeout in blocks (1 block ≈ 10 minutes)
      let timeoutBlocks;
      if (timeUnit.startsWith('hour')) {
        timeoutBlocks = timeValue * 6; // 6 blocks per hour
      } else {
        timeoutBlocks = timeValue * 144; // 144 blocks per day
      }

      // Check balance
      const balance = await stacksService.getBalance(user.stx_address);
      const fees = await stacksService.estimateFee();
      const totalNeeded = amount + fees.mediumStx;

      if (balance.stx.balanceStx < totalNeeded) {
        return {
          success: false,
          message: `❌ Insufficient balance.\n\nYou have: ${balance.stx.balanceStx.toFixed(6)} STX\nNeed: ${totalNeeded.toFixed(6)} STX (including ~${fees.mediumStx.toFixed(6)} STX fee)`,
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

      // Calculate time description
      const timeDescription = timeUnit.startsWith('hour')
        ? `${timeValue} hour${timeValue > 1 ? 's' : ''}`
        : `${timeValue} day${timeValue > 1 ? 's' : ''}`;

      // Save state for confirmation
      await stateService.setState(phoneNumber, 'escrow', 'confirm_create', {
        amount,
        amountMicroStx: stacksService.stxToMicroStx(amount),
        recipient,
        senderAddress: user.stx_address,
        timeoutBlocks,
        timeDescription,
        fee: fees.medium,
        feeStx: fees.mediumStx,
      });

      // Send confirmation prompt
      const confirmMessage =
        `🔒 *Confirm Escrow*\n\n` +
        `Amount: *${amount} STX*\n` +
        `To: ${recipient.name || recipient.address}\n` +
        `${recipient.address.substring(0, 10)}...${recipient.address.substring(recipient.address.length - 6)}\n` +
        `Timeout: ${timeDescription}\n` +
        `Fee: ~${fees.mediumStx.toFixed(6)} STX\n` +
        `Total: *${(amount + fees.mediumStx).toFixed(6)} STX*\n\n` +
        `⚠️ Funds will be locked until:\n` +
        `• You or recipient release them\n` +
        `• Timeout expires (${timeDescription})\n\n` +
        `Reply:\n*yes* to confirm\n*no* to cancel`;

      await whatsappService.sendMessage(phoneNumber, confirmMessage);

      return { success: true };
    } catch (error) {
      console.error('Error handling create escrow:', error);
      return {
        success: false,
        message: `❌ ${error.message}`,
      };
    }
  }

  /**
   * Handle "release escrow #X" command
   */
  async handleReleaseEscrow(phoneNumber, message, user) {
    try {
      // Parse: "release escrow #1" or "release escrow 1"
      const match = message.match(/release\s+escrow\s+#?(\d+)/i);

      if (!match) {
        return {
          success: false,
          message: '❌ Invalid format.\n\nUse: release escrow #[id]\n\nExample: release escrow #1',
        };
      }

      const escrowId = parseInt(match[1]);

      // Get escrow from database
      const escrows = await escrowService.getEscrowsByPhone(phoneNumber);
      const escrow = escrows.find(e => e.contract_escrow_id === escrowId);

      if (!escrow) {
        return {
          success: false,
          message: `❌ Escrow #${escrowId} not found.\n\nUse "my escrows" to see your escrows.`,
        };
      }

      // Check if user is authorized (sender or recipient)
      const isSender = escrow.sender_phone === phoneNumber;
      const isRecipient = escrow.recipient_phone === phoneNumber;

      if (!isSender && !isRecipient) {
        return {
          success: false,
          message: '❌ You are not authorized to release this escrow.',
        };
      }

      // Check if escrow is active
      if (escrow.status !== 'active') {
        return {
          success: false,
          message: `❌ Escrow is ${escrow.status}. Only active escrows can be released.`,
        };
      }

      // Save state for confirmation
      await stateService.setState(phoneNumber, 'escrow', 'confirm_release', {
        escrowId,
        escrow,
        userAddress: user.stx_address,
      });

      // Send confirmation
      const amount = stacksService.microStxToStx(escrow.amount_microstx);
      const confirmMessage =
        `🔓 *Confirm Release*\n\n` +
        `Escrow ID: #${escrowId}\n` +
        `Amount: ${amount} STX\n` +
        `To: ${escrow.recipient_phone || escrow.recipient_stx_address}\n` +
        `Memo: ${escrow.memo}\n\n` +
        `This will release the funds to the recipient.\n\n` +
        `Reply:\n*yes* to confirm\n*no* to cancel`;

      await whatsappService.sendMessage(phoneNumber, confirmMessage);

      return { success: true };
    } catch (error) {
      console.error('Error handling release escrow:', error);
      return {
        success: false,
        message: `❌ ${error.message}`,
      };
    }
  }

  /**
   * Handle "refund escrow #X" command
   */
  async handleRefundEscrow(phoneNumber, message, user) {
    try {
      // Parse: "refund escrow #1"
      const match = message.match(/refund\s+escrow\s+#?(\d+)/i);

      if (!match) {
        return {
          success: false,
          message: '❌ Invalid format.\n\nUse: refund escrow #[id]\n\nExample: refund escrow #1',
        };
      }

      const escrowId = parseInt(match[1]);

      // Get escrow from database
      const escrows = await escrowService.getEscrowsByPhone(phoneNumber, 'sender');
      const escrow = escrows.find(e => e.contract_escrow_id === escrowId);

      if (!escrow) {
        return {
          success: false,
          message: `❌ Escrow #${escrowId} not found or you are not the sender.\n\nOnly the sender can refund escrows.`,
        };
      }

      // Check if escrow is active
      if (escrow.status !== 'active') {
        return {
          success: false,
          message: `❌ Escrow is ${escrow.status}. Only active escrows can be refunded.`,
        };
      }

      // Check if timeout has been reached
      const canRefund = await escrowService.canRefund(escrowId);
      if (!canRefund) {
        return {
          success: false,
          message: `❌ Timeout not reached yet.\n\nYou can refund after ${escrow.timeout_blocks} blocks.\n\nOr use "cancel escrow #${escrowId}" to cancel immediately.`,
        };
      }

      // Save state for confirmation
      await stateService.setState(phoneNumber, 'escrow', 'confirm_refund', {
        escrowId,
        escrow,
        senderAddress: user.stx_address,
      });

      // Send confirmation
      const amount = stacksService.microStxToStx(escrow.amount_microstx);
      const confirmMessage =
        `💰 *Confirm Refund*\n\n` +
        `Escrow ID: #${escrowId}\n` +
        `Amount: ${amount} STX\n` +
        `Memo: ${escrow.memo}\n\n` +
        `⏰ Timeout reached. You can now get your refund.\n\n` +
        `Reply:\n*yes* to confirm\n*no* to cancel`;

      await whatsappService.sendMessage(phoneNumber, confirmMessage);

      return { success: true };
    } catch (error) {
      console.error('Error handling refund escrow:', error);
      return {
        success: false,
        message: `❌ ${error.message}`,
      };
    }
  }

  /**
   * Handle "cancel escrow #X" command
   */
  async handleCancelEscrow(phoneNumber, message, user) {
    try {
      // Parse: "cancel escrow #1"
      const match = message.match(/cancel\s+escrow\s+#?(\d+)/i);

      if (!match) {
        return {
          success: false,
          message: '❌ Invalid format.\n\nUse: cancel escrow #[id]\n\nExample: cancel escrow #1',
        };
      }

      const escrowId = parseInt(match[1]);

      // Get escrow from database
      const escrows = await escrowService.getEscrowsByPhone(phoneNumber, 'sender');
      const escrow = escrows.find(e => e.contract_escrow_id === escrowId);

      if (!escrow) {
        return {
          success: false,
          message: `❌ Escrow #${escrowId} not found or you are not the sender.\n\nOnly the sender can cancel escrows.`,
        };
      }

      // Check if escrow is active
      if (escrow.status !== 'active') {
        return {
          success: false,
          message: `❌ Escrow is ${escrow.status}. Only active escrows can be cancelled.`,
        };
      }

      // Save state for confirmation
      await stateService.setState(phoneNumber, 'escrow', 'confirm_cancel', {
        escrowId,
        escrow,
        senderAddress: user.stx_address,
      });

      // Send confirmation
      const amount = stacksService.microStxToStx(escrow.amount_microstx);
      const confirmMessage =
        `❌ *Confirm Cancel*\n\n` +
        `Escrow ID: #${escrowId}\n` +
        `Amount: ${amount} STX\n` +
        `Memo: ${escrow.memo}\n\n` +
        `This will cancel the escrow and return funds to you.\n\n` +
        `Reply:\n*yes* to confirm\n*no* to cancel`;

      await whatsappService.sendMessage(phoneNumber, confirmMessage);

      return { success: true };
    } catch (error) {
      console.error('Error handling cancel escrow:', error);
      return {
        success: false,
        message: `❌ ${error.message}`,
      };
    }
  }

  /**
   * Handle "escrow status #X" command
   */
  async handleEscrowStatus(phoneNumber, message) {
    try {
      // Parse: "escrow status #1"
      const match = message.match(/escrow\s+status\s+#?(\d+)/i);

      if (!match) {
        return {
          success: false,
          message: '❌ Invalid format.\n\nUse: escrow status #[id]\n\nExample: escrow status #1',
        };
      }

      const escrowId = parseInt(match[1]);

      // Get escrow from database
      const escrows = await escrowService.getEscrowsByPhone(phoneNumber);
      const escrow = escrows.find(e => e.contract_escrow_id === escrowId);

      if (!escrow) {
        return {
          success: false,
          message: `❌ Escrow #${escrowId} not found.`,
        };
      }

      // Format status message
      const amount = stacksService.microStxToStx(escrow.amount_microstx);
      const statusIcon = escrow.status === 'active' ? '🟢' : 
                        escrow.status === 'released' ? '✅' :
                        escrow.status === 'refunded' ? '💰' :
                        escrow.status === 'cancelled' ? '❌' : '⏳';

      let statusMessage =
        `${statusIcon} *Escrow #${escrowId}*\n\n` +
        `Amount: ${amount} STX\n` +
        `Status: ${escrow.status}\n` +
        `Sender: ${escrow.sender_phone || escrow.sender_stx_address.substring(0, 10) + '...'}\n` +
        `Recipient: ${escrow.recipient_phone || escrow.recipient_stx_address.substring(0, 10) + '...'}\n` +
        `Timeout: ${escrow.timeout_blocks} blocks\n` +
        `Memo: ${escrow.memo}\n`;

      if (escrow.tx_id) {
        statusMessage += `\nTX: ${escrow.tx_id.substring(0, 10)}...`;
      }

      await whatsappService.sendMessage(phoneNumber, statusMessage);

      return { success: true };
    } catch (error) {
      console.error('Error getting escrow status:', error);
      return {
        success: false,
        message: `❌ ${error.message}`,
      };
    }
  }

  /**
   * Handle "my escrows" command
   */
  async handleListEscrows(phoneNumber) {
    try {
      const escrows = await escrowService.getEscrowsByPhone(phoneNumber);

      if (escrows.length === 0) {
        await whatsappService.sendMessage(
          phoneNumber,
          '📋 *My Escrows*\n\nNo escrows found.\n\nCreate one: "escrow 5 to John for 24 hours"'
        );
        return { success: true };
      }

      // Format escrows list
      let message = `📋 *My Escrows* (${escrows.length})\n\n`;

      escrows.forEach(escrow => {
        const amount = stacksService.microStxToStx(escrow.amount_microstx);
        const statusIcon = escrow.status === 'active' ? '🟢' : 
                          escrow.status === 'released' ? '✅' :
                          escrow.status === 'refunded' ? '💰' :
                          escrow.status === 'cancelled' ? '❌' : '⏳';

        const isSender = escrow.sender_phone === phoneNumber;
        const role = isSender ? '📤 Sent' : '📥 Received';
        const other = isSender 
          ? (escrow.recipient_phone || escrow.recipient_stx_address.substring(0, 10) + '...')
          : (escrow.sender_phone || escrow.sender_stx_address.substring(0, 10) + '...');

        message += `${statusIcon} Escrow #${escrow.contract_escrow_id || escrow.id}\n`;
        message += `   ${amount} STX ${role}\n`;
        message += `   ${isSender ? 'To' : 'From'}: ${other}\n`;
        message += `   Status: ${escrow.status}\n\n`;
      });

      message += 'Check status: "escrow status #[id]"';

      await whatsappService.sendMessage(phoneNumber, message);

      return { success: true };
    } catch (error) {
      console.error('Error listing escrows:', error);
      return {
        success: false,
        message: '❌ Failed to get escrows.',
      };
    }
  }

  /**
   * Handle multi-step conversation flows
   */
  async handleStateFlow(phoneNumber, message, state) {
    try {
      const normalizedMessage = message.toLowerCase().trim();

      if (normalizedMessage !== 'yes' && normalizedMessage !== 'no') {
        await whatsappService.sendMessage(
          phoneNumber,
          '⚠️ Please reply *yes* to confirm or *no* to cancel.'
        );
        return { success: true };
      }

      if (normalizedMessage === 'no') {
        await stateService.clearState(phoneNumber);
        await whatsappService.sendMessage(phoneNumber, '❌ Cancelled.');
        return { success: true };
      }

      // User said yes - execute the action
      if (state.step === 'confirm_create') {
        return await this.executeCreateEscrow(phoneNumber, state);
      } else if (state.step === 'confirm_release') {
        return await this.executeReleaseEscrow(phoneNumber, state);
      } else if (state.step === 'confirm_refund') {
        return await this.executeRefundEscrow(phoneNumber, state);
      } else if (state.step === 'confirm_cancel') {
        return await this.executeCancelEscrow(phoneNumber, state);
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
   * Execute create escrow after confirmation
   */
  async executeCreateEscrow(phoneNumber, state) {
    try {
      const { amount, amountMicroStx, recipient, senderAddress, timeoutBlocks, timeDescription } = state.data;

      // Get user for private key
      const user = await userService.getByPhone(phoneNumber);
      const senderKey = user.private_key; // NOTE: Implement secure key storage

      if (!senderKey) {
        throw new Error('Private key not available. Please contact support.');
      }

      // Send processing message
      await whatsappService.sendMessage(
        phoneNumber,
        '⏳ Creating escrow...\n\nThis may take a few moments.'
      );

      // Create escrow
      const result = await escrowService.createEscrow(
        senderAddress,
        senderKey,
        recipient.address,
        amountMicroStx,
        timeoutBlocks,
        `Escrow via WhatsApp - ${timeDescription}`,
        phoneNumber,
        recipient.phone || null
      );

      // Clear state
      await stateService.clearState(phoneNumber);

      // Send success message
      const successMessage =
        `🔒 *Escrow Created!*\n\n` +
        `Amount: ${amount} STX\n` +
        `To: ${recipient.name || 'Address'}\n` +
        `Timeout: ${timeDescription}\n` +
        `TX ID: ${result.txId.substring(0, 10)}...${result.txId.substring(result.txId.length - 6)}\n\n` +
        `⏳ Confirming on blockchain...\n` +
        `View: ${result.explorerUrl}`;

      await whatsappService.sendMessage(phoneNumber, successMessage);

      // Notify recipient if they have a phone number
      if (recipient.phone) {
        const recipientUser = await userService.getByPhone(recipient.phone);
        if (recipientUser) {
          await whatsappService.sendMessage(
            recipient.phone,
            `🔒 *Escrow Received!*\n\n` +
            `Amount: ${amount} STX\n` +
            `From: ${phoneNumber}\n` +
            `Timeout: ${timeDescription}\n\n` +
            `Release: "release escrow #${result.escrowId}"`
          );
        }
      }

      return { success: true };
    } catch (error) {
      console.error('Error executing create escrow:', error);
      await stateService.clearState(phoneNumber);
      return {
        success: false,
        message: `❌ Failed to create escrow: ${error.message}`,
      };
    }
  }

  /**
   * Execute release escrow after confirmation
   */
  async executeReleaseEscrow(phoneNumber, state) {
    try {
      const { escrowId, userAddress } = state.data;

      const user = await userService.getByPhone(phoneNumber);
      const userKey = user.private_key;

      if (!userKey) {
        throw new Error('Private key not available.');
      }

      await whatsappService.sendMessage(phoneNumber, '⏳ Releasing escrow...');

      const result = await escrowService.releaseEscrow(escrowId, userAddress, userKey);

      await stateService.clearState(phoneNumber);

      await whatsappService.sendMessage(
        phoneNumber,
        `🔓 *Escrow Released!*\n\n` +
        `Escrow ID: #${escrowId}\n` +
        `TX ID: ${result.txId.substring(0, 10)}...\n\n` +
        `View: ${result.explorerUrl}`
      );

      return { success: true };
    } catch (error) {
      console.error('Error executing release:', error);
      await stateService.clearState(phoneNumber);
      return {
        success: false,
        message: `❌ Failed to release escrow: ${error.message}`,
      };
    }
  }

  /**
   * Execute refund escrow after confirmation
   */
  async executeRefundEscrow(phoneNumber, state) {
    try {
      const { escrowId, senderAddress } = state.data;

      const user = await userService.getByPhone(phoneNumber);
      const senderKey = user.private_key;

      if (!senderKey) {
        throw new Error('Private key not available.');
      }

      await whatsappService.sendMessage(phoneNumber, '⏳ Refunding escrow...');

      const result = await escrowService.refundEscrow(escrowId, senderAddress, senderKey);

      await stateService.clearState(phoneNumber);

      await whatsappService.sendMessage(
        phoneNumber,
        `💰 *Escrow Refunded!*\n\n` +
        `Escrow ID: #${escrowId}\n` +
        `TX ID: ${result.txId.substring(0, 10)}...\n\n` +
        `View: ${result.explorerUrl}`
      );

      return { success: true };
    } catch (error) {
      console.error('Error executing refund:', error);
      await stateService.clearState(phoneNumber);
      return {
        success: false,
        message: `❌ Failed to refund escrow: ${error.message}`,
      };
    }
  }

  /**
   * Execute cancel escrow after confirmation
   */
  async executeCancelEscrow(phoneNumber, state) {
    try {
      const { escrowId, senderAddress } = state.data;

      const user = await userService.getByPhone(phoneNumber);
      const senderKey = user.private_key;

      if (!senderKey) {
        throw new Error('Private key not available.');
      }

      await whatsappService.sendMessage(phoneNumber, '⏳ Cancelling escrow...');

      const result = await escrowService.cancelEscrow(escrowId, senderAddress, senderKey);

      await stateService.clearState(phoneNumber);

      await whatsappService.sendMessage(
        phoneNumber,
        `❌ *Escrow Cancelled!*\n\n` +
        `Escrow ID: #${escrowId}\n` +
        `TX ID: ${result.txId.substring(0, 10)}...\n\n` +
        `View: ${result.explorerUrl}`
      );

      return { success: true };
    } catch (error) {
      console.error('Error executing cancel:', error);
      await stateService.clearState(phoneNumber);
      return {
        success: false,
        message: `❌ Failed to cancel escrow: ${error.message}`,
      };
    }
  }

  /**
   * Get help text for escrow commands
   */
  getHelpText() {
    return (
      `🔒 *Escrow Commands*\n\n` +
      `*Create Escrow*\n` +
      `• escrow [amount] to [name/address] for [time] hours/days\n` +
      `  Example: escrow 5 to John for 24 hours\n\n` +
      `*Manage Escrows*\n` +
      `• release escrow #[id] - Release funds\n` +
      `• refund escrow #[id] - Refund after timeout\n` +
      `• cancel escrow #[id] - Cancel escrow\n` +
      `• escrow status #[id] - Check status\n` +
      `• my escrows - List all escrows\n\n` +
      `Need help? Reply *help*`
    );
  }
}

// Export singleton instance
const escrowHandler = new EscrowHandler();
export default escrowHandler;