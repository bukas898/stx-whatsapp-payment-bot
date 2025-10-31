/**
 * Transaction Service
 * 
 * Handles STX transaction creation, signing, broadcasting, and tracking:
 * - Create STX transfer transactions
 * - Sign transactions with private keys
 * - Broadcast to Stacks blockchain
 * - Track transaction status in database
 * - Monitor confirmations
 */

import pkg from '@stacks/transactions';
const { makeSTXTokenTransfer, broadcastTransaction, AnchorMode, PostConditionMode } = pkg;

import networkPkg from '@stacks/network';
const { StacksMainnet, StacksTestnet } = networkPkg;

import stacksService from './stacks.service.js';
import databaseService from './database.service.js';

class TransactionService {
  constructor() {
    this.network = process.env.STACKS_NETWORK === 'testnet' 
      ? new StacksTestnet() 
      : new StacksMainnet();
    
    this.networkType = process.env.STACKS_NETWORK || 'mainnet';
  }

  /**
   * Create and sign an STX transfer transaction
   * @param {Object} params - Transaction parameters
   * @param {string} params.senderAddress - Sender's Stacks address
   * @param {string} params.senderKey - Sender's private key (64 hex chars)
   * @param {string} params.recipientAddress - Recipient's Stacks address
   * @param {number} params.amountMicroStx - Amount in microSTX
   * @param {string} params.memo - Optional memo (max 34 bytes)
   * @param {number} params.fee - Optional fee in microSTX (will estimate if not provided)
   * @returns {Promise<Object>} Signed transaction details
   */
  async createTransaction({
    senderAddress,
    senderKey,
    recipientAddress,
    amountMicroStx,
    memo = '',
    fee = null,
  }) {
    try {
      // Validate inputs
      if (!stacksService.isValidAddress(senderAddress)) {
        throw new Error('Invalid sender address');
      }
      if (!stacksService.isValidAddress(recipientAddress)) {
        throw new Error('Invalid recipient address');
      }
      if (amountMicroStx <= 0) {
        throw new Error('Amount must be greater than 0');
      }

      // Get sender's nonce
      const accountInfo = await stacksService.getAccountInfo(senderAddress);
      const nonce = accountInfo.nonce;

      // Estimate fee if not provided
      let txFee = fee;
      if (!txFee) {
        const feeEstimate = await stacksService.estimateFee();
        txFee = feeEstimate.medium; // Use medium fee estimate
      }

      // Create the transaction
      const txOptions = {
        recipient: recipientAddress,
        amount: amountMicroStx,
        senderKey: senderKey,
        network: this.network,
        memo: memo,
        nonce: nonce,
        fee: txFee,
        anchorMode: AnchorMode.Any,
      };

      const transaction = await makeSTXTokenTransfer(txOptions);

      return {
        transaction,
        txId: transaction.txid(),
        senderAddress,
        recipientAddress,
        amountMicroStx,
        amountStx: stacksService.microStxToStx(amountMicroStx),
        fee: txFee,
        feeStx: stacksService.microStxToStx(txFee),
        nonce,
        memo,
      };
    } catch (error) {
      console.error('Error creating transaction:', error);
      throw new Error(`Failed to create transaction: ${error.message}`);
    }
  }

  /**
   * Broadcast a signed transaction to the network
   * @param {Object} transaction - Signed transaction object from createTransaction
   * @returns {Promise<Object>} Broadcast result with txId
   */
  async broadcastTransaction(transaction) {
    try {
      const broadcastResponse = await broadcastTransaction(
        transaction,
        this.network
      );

      if (broadcastResponse.error) {
        throw new Error(broadcastResponse.reason || 'Broadcast failed');
      }

      return {
        success: true,
        txId: broadcastResponse.txid,
        message: 'Transaction broadcasted successfully',
      };
    } catch (error) {
      console.error('Error broadcasting transaction:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to broadcast transaction',
      };
    }
  }

  /**
   * Create, sign, and broadcast a transaction in one step
   * @param {Object} params - Transaction parameters (same as createTransaction)
   * @param {string} params.senderPhone - Sender's phone number (for database tracking)
   * @param {string} params.recipientPhone - Recipient's phone number (for database tracking)
   * @returns {Promise<Object>} Complete transaction result
   */
  async sendTransaction({
    senderAddress,
    senderKey,
    senderPhone,
    recipientAddress,
    recipientPhone,
    amountMicroStx,
    memo = '',
    fee = null,
  }) {
    try {
      // Step 1: Create and sign transaction
      console.log('Creating transaction...');
      const txData = await this.createTransaction({
        senderAddress,
        senderKey,
        recipientAddress,
        amountMicroStx,
        memo,
        fee,
      });

      // Step 2: Broadcast transaction
      console.log('Broadcasting transaction...');
      const broadcastResult = await this.broadcastTransaction(txData.transaction);

      if (!broadcastResult.success) {
        throw new Error(broadcastResult.error);
      }

      const txId = broadcastResult.txId;

      // Step 3: Record in database
      console.log('Recording in database...');
      await this.recordTransaction({
        txId,
        senderPhone,
        recipientPhone,
        senderAddress,
        recipientAddress,
        amountMicroStx,
        fee: txData.fee,
        memo,
        status: 'pending',
      });

      return {
        success: true,
        txId,
        senderAddress,
        recipientAddress,
        amountStx: txData.amountStx,
        feeStx: txData.feeStx,
        message: 'Transaction sent successfully',
      };
    } catch (error) {
      console.error('Error sending transaction:', error);
      throw new Error(`Failed to send transaction: ${error.message}`);
    }
  }

  /**
   * Record transaction in database
   * @param {Object} txData - Transaction data to record
   * @returns {Promise<Object>} Database record
   */
  async recordTransaction({
    txId,
    senderPhone,
    recipientPhone,
    senderAddress,
    recipientAddress,
    amountMicroStx,
    fee,
    memo,
    status,
  }) {
    try {
      const { data, error } = await databaseService.client
        .from('transactions')
        .insert([
          {
            tx_id: txId,
            sender_phone: senderPhone,
            recipient_phone: recipientPhone,
            sender_address: senderAddress,
            recipient_address: recipientAddress,
            amount_micro_stx: amountMicroStx,
            fee_micro_stx: fee,
            memo: memo,
            status: status,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error recording transaction:', error);
      throw new Error(`Failed to record transaction: ${error.message}`);
    }
  }

  /**
   * Get transaction by ID from database
   * @param {string} txId - Transaction ID
   * @returns {Promise<Object>} Transaction record
   */
  async getTransactionById(txId) {
    try {
      const { data, error } = await databaseService.client
        .from('transactions')
        .select('*')
        .eq('tx_id', txId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting transaction:', error);
      throw new Error(`Failed to get transaction: ${error.message}`);
    }
  }

  /**
   * Get all transactions for a phone number
   * @param {string} phoneNumber - Phone number
   * @param {string} type - 'sent' | 'received' | 'all'
   * @param {number} limit - Maximum number to return
   * @returns {Promise<Array>} List of transactions
   */
  async getTransactionsByPhone(phoneNumber, type = 'all', limit = 50) {
    try {
      let query = databaseService.client
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (type === 'sent') {
        query = query.eq('sender_phone', phoneNumber);
      } else if (type === 'received') {
        query = query.eq('recipient_phone', phoneNumber);
      } else {
        query = query.or(`sender_phone.eq.${phoneNumber},recipient_phone.eq.${phoneNumber}`);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting transactions by phone:', error);
      throw new Error(`Failed to get transactions: ${error.message}`);
    }
  }

  /**
   * Update transaction status
   * @param {string} txId - Transaction ID
   * @param {string} status - New status ('pending' | 'confirmed' | 'failed')
   * @param {number} blockHeight - Optional block height when confirmed
   * @returns {Promise<Object>} Updated transaction
   */
  async updateTransactionStatus(txId, status, blockHeight = null) {
    try {
      const updateData = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (blockHeight) {
        updateData.block_height = blockHeight;
        updateData.confirmed_at = new Date().toISOString();
      }

      const { data, error } = await databaseService.client
        .from('transactions')
        .update(updateData)
        .eq('tx_id', txId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating transaction status:', error);
      throw new Error(`Failed to update transaction status: ${error.message}`);
    }
  }

  /**
   * Monitor transaction and update status when confirmed
   * @param {string} txId - Transaction ID
   * @param {Function} onUpdate - Callback function for status updates
   * @returns {Promise<Object>} Final status
   */
  async monitorTransaction(txId, onUpdate = null) {
    try {
      console.log(`Monitoring transaction ${txId}...`);

      // Wait for confirmation (up to 10 minutes)
      const result = await stacksService.waitForConfirmation(txId, 60, 10000);

      if (result.confirmed) {
        // Update database
        await this.updateTransactionStatus(txId, 'confirmed', result.blockHeight);
        
        if (onUpdate) {
          onUpdate({
            status: 'confirmed',
            txId,
            blockHeight: result.blockHeight,
          });
        }

        return {
          success: true,
          status: 'confirmed',
          txId,
          blockHeight: result.blockHeight,
        };
      } else if (result.failed) {
        // Update database
        await this.updateTransactionStatus(txId, 'failed');
        
        if (onUpdate) {
          onUpdate({
            status: 'failed',
            txId,
          });
        }

        return {
          success: false,
          status: 'failed',
          txId,
        };
      } else {
        // Timeout
        if (onUpdate) {
          onUpdate({
            status: 'pending',
            txId,
            message: 'Still pending after monitoring period',
          });
        }

        return {
          success: false,
          status: 'pending',
          txId,
          message: 'Transaction still pending',
        };
      }
    } catch (error) {
      console.error('Error monitoring transaction:', error);
      throw new Error(`Failed to monitor transaction: ${error.message}`);
    }
  }

  /**
   * Get pending transactions and check their status
   * @returns {Promise<Array>} Updated transactions
   */
  async checkPendingTransactions() {
    try {
      // Get all pending transactions from database
      const { data: pendingTxs, error } = await databaseService.client
        .from('transactions')
        .select('*')
        .eq('status', 'pending');

      if (error) {
        throw error;
      }

      if (!pendingTxs || pendingTxs.length === 0) {
        return [];
      }

      console.log(`Checking ${pendingTxs.length} pending transactions...`);

      // Check status of each transaction
      const updates = [];
      for (const tx of pendingTxs) {
        try {
          const status = await stacksService.getTransactionStatus(tx.tx_id);
          
          if (status.confirmed) {
            await this.updateTransactionStatus(tx.tx_id, 'confirmed', status.blockHeight);
            updates.push({ txId: tx.tx_id, status: 'confirmed' });
          } else if (status.failed) {
            await this.updateTransactionStatus(tx.tx_id, 'failed');
            updates.push({ txId: tx.tx_id, status: 'failed' });
          }
        } catch (error) {
          console.error(`Error checking transaction ${tx.tx_id}:`, error.message);
        }
      }

      return updates;
    } catch (error) {
      console.error('Error checking pending transactions:', error);
      throw new Error(`Failed to check pending transactions: ${error.message}`);
    }
  }

  /**
   * Format transaction for display
   * @param {Object} tx - Transaction from database
   * @returns {Object} Formatted transaction
   */
  formatTransaction(tx) {
    return {
      txId: tx.tx_id,
      sender: tx.sender_phone,
      recipient: tx.recipient_phone,
      amount: stacksService.microStxToStx(tx.amount_micro_stx),
      amountStx: `${stacksService.microStxToStx(tx.amount_micro_stx)} STX`,
      fee: stacksService.microStxToStx(tx.fee_micro_stx),
      feeStx: `${stacksService.microStxToStx(tx.fee_micro_stx)} STX`,
      status: tx.status,
      memo: tx.memo,
      createdAt: tx.created_at,
      confirmedAt: tx.confirmed_at,
      blockHeight: tx.block_height,
    };
  }
}

// Export singleton instance
const transactionService = new TransactionService();
export default transactionService;