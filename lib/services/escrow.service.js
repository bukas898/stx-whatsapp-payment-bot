/**
 * Escrow Service
 * 
 * Interacts with the Clarity escrow smart contract:
 * - Create escrow transactions
 * - Release escrow to recipient
 * - Refund escrow to sender
 * - Check escrow status on blockchain
 * - Track escrows in database
 */

import transactionsPkg from '@stacks/transactions';
const {
  makeContractCall,
  broadcastTransaction,
  AnchorMode,
  PostConditionMode,
  uintCV,
  principalCV,
  stringUtf8CV,
  cvToJSON,
  makeStandardSTXPostCondition,
  FungibleConditionCode,
} = transactionsPkg;

import networkPkg from '@stacks/network';
const { StacksMainnet, StacksTestnet, callReadOnlyFunction } = networkPkg;

import databaseService from './database.service.js';
import stacksService from './stacks.service.js';

class EscrowService {
  constructor() {
    // Contract details (UPDATE THESE after deployment)
    this.contractAddress = process.env.ESCROW_CONTRACT_ADDRESS || 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
    this.contractName = process.env.ESCROW_CONTRACT_NAME || 'escrow';
    
    // Network configuration
    this.network = process.env.STACKS_NETWORK === 'mainnet' 
      ? new StacksMainnet()
      : new StacksTestnet();
  }

  /**
   * Create a new escrow transaction
   * @param {string} senderAddress - Sender's STX address
   * @param {string} senderKey - Sender's private key
   * @param {string} recipientAddress - Recipient's STX address
   * @param {number} amountMicroStx - Amount in microSTX
   * @param {number} timeoutBlocks - Timeout in blocks (144 blocks ≈ 24 hours)
   * @param {string} memo - Description/memo for the escrow
   * @param {string} senderPhone - Sender's phone number
   * @param {string} recipientPhone - Recipient's phone number (optional)
   * @returns {Promise<Object>} Transaction result with escrow ID
   */
  async createEscrow(
    senderAddress,
    senderKey,
    recipientAddress,
    amountMicroStx,
    timeoutBlocks,
    memo,
    senderPhone,
    recipientPhone = null
  ) {
    try {
      console.log('Creating escrow:', {
        sender: senderAddress,
        recipient: recipientAddress,
        amount: amountMicroStx,
        timeout: timeoutBlocks,
      });

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

      // Get account nonce
      const accountInfo = await stacksService.getAccountInfo(senderAddress);
      const nonce = accountInfo.nonce;

      // Post condition: sender must send exact amount
      const postConditions = [
        makeStandardSTXPostCondition(
          senderAddress,
          FungibleConditionCode.Equal,
          amountMicroStx
        ),
      ];

      // Build contract call transaction
      const txOptions = {
        contractAddress: this.contractAddress,
        contractName: this.contractName,
        functionName: 'create-escrow',
        functionArgs: [
          principalCV(recipientAddress),
          uintCV(amountMicroStx),
          uintCV(timeoutBlocks),
          stringUtf8CV(memo),
        ],
        senderKey,
        network: this.network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Deny,
        postConditions,
        nonce,
      };

      const transaction = await makeContractCall(txOptions);

      // Broadcast transaction
      const broadcastResponse = await broadcastTransaction(transaction, this.network);
      const txId = broadcastResponse.txid;

      if (broadcastResponse.error) {
        throw new Error(`Broadcast failed: ${broadcastResponse.error}`);
      }

      console.log('Escrow transaction broadcasted:', txId);

      // Get the escrow ID from contract (it's incremental)
      // For now, we'll need to wait for confirmation to get the actual ID
      // Store in database with pending status
      const escrowRecord = await this.saveEscrowToDatabase({
        senderPhone,
        senderAddress,
        recipientPhone,
        recipientAddress,
        amountMicroStx,
        timeoutBlocks,
        memo,
        txId,
        status: 'pending',
      });

      return {
        success: true,
        txId,
        escrowId: escrowRecord.id, // Database ID (not contract ID yet)
        amount: stacksService.microStxToStx(amountMicroStx),
        recipient: recipientAddress,
        timeout: timeoutBlocks,
        explorerUrl: `https://explorer.stacks.co/txid/${txId}?chain=${this.network.isMainnet() ? 'mainnet' : 'testnet'}`,
      };
    } catch (error) {
      console.error('Error creating escrow:', error);
      throw new Error(`Failed to create escrow: ${error.message}`);
    }
  }

  /**
   * Release escrow to recipient
   * @param {number} contractEscrowId - Escrow ID from contract
   * @param {string} callerAddress - Address calling release (sender or recipient)
   * @param {string} callerKey - Private key
   * @returns {Promise<Object>} Transaction result
   */
  async releaseEscrow(contractEscrowId, callerAddress, callerKey) {
    try {
      console.log('Releasing escrow:', contractEscrowId);

      // Get account nonce
      const accountInfo = await stacksService.getAccountInfo(callerAddress);
      const nonce = accountInfo.nonce;

      // Build contract call transaction
      const txOptions = {
        contractAddress: this.contractAddress,
        contractName: this.contractName,
        functionName: 'release-escrow',
        functionArgs: [uintCV(contractEscrowId)],
        senderKey: callerKey,
        network: this.network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
        nonce,
      };

      const transaction = await makeContractCall(txOptions);

      // Broadcast transaction
      const broadcastResponse = await broadcastTransaction(transaction, this.network);
      const txId = broadcastResponse.txid;

      if (broadcastResponse.error) {
        throw new Error(`Broadcast failed: ${broadcastResponse.error}`);
      }

      console.log('Escrow release transaction broadcasted:', txId);

      // Update database status
      await this.updateEscrowStatus(contractEscrowId, 'released', txId);

      return {
        success: true,
        txId,
        status: 'released',
        explorerUrl: `https://explorer.stacks.co/txid/${txId}?chain=${this.network.isMainnet() ? 'mainnet' : 'testnet'}`,
      };
    } catch (error) {
      console.error('Error releasing escrow:', error);
      throw new Error(`Failed to release escrow: ${error.message}`);
    }
  }

  /**
   * Refund escrow to sender (after timeout)
   * @param {number} contractEscrowId - Escrow ID from contract
   * @param {string} senderAddress - Sender's address
   * @param {string} senderKey - Sender's private key
   * @returns {Promise<Object>} Transaction result
   */
  async refundEscrow(contractEscrowId, senderAddress, senderKey) {
    try {
      console.log('Refunding escrow:', contractEscrowId);

      // Check if refund is allowed
      const canRefund = await this.canRefund(contractEscrowId);
      if (!canRefund) {
        throw new Error('Timeout not reached or escrow not active');
      }

      // Get account nonce
      const accountInfo = await stacksService.getAccountInfo(senderAddress);
      const nonce = accountInfo.nonce;

      // Build contract call transaction
      const txOptions = {
        contractAddress: this.contractAddress,
        contractName: this.contractName,
        functionName: 'refund-escrow',
        functionArgs: [uintCV(contractEscrowId)],
        senderKey,
        network: this.network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
        nonce,
      };

      const transaction = await makeContractCall(txOptions);

      // Broadcast transaction
      const broadcastResponse = await broadcastTransaction(transaction, this.network);
      const txId = broadcastResponse.txid;

      if (broadcastResponse.error) {
        throw new Error(`Broadcast failed: ${broadcastResponse.error}`);
      }

      console.log('Escrow refund transaction broadcasted:', txId);

      // Update database status
      await this.updateEscrowStatus(contractEscrowId, 'refunded', txId);

      return {
        success: true,
        txId,
        status: 'refunded',
        explorerUrl: `https://explorer.stacks.co/txid/${txId}?chain=${this.network.isMainnet() ? 'mainnet' : 'testnet'}`,
      };
    } catch (error) {
      console.error('Error refunding escrow:', error);
      throw new Error(`Failed to refund escrow: ${error.message}`);
    }
  }

  /**
   * Cancel escrow (sender only, before release)
   * @param {number} contractEscrowId - Escrow ID from contract
   * @param {string} senderAddress - Sender's address
   * @param {string} senderKey - Sender's private key
   * @returns {Promise<Object>} Transaction result
   */
  async cancelEscrow(contractEscrowId, senderAddress, senderKey) {
    try {
      console.log('Cancelling escrow:', contractEscrowId);

      // Get account nonce
      const accountInfo = await stacksService.getAccountInfo(senderAddress);
      const nonce = accountInfo.nonce;

      // Build contract call transaction
      const txOptions = {
        contractAddress: this.contractAddress,
        contractName: this.contractName,
        functionName: 'cancel-escrow',
        functionArgs: [uintCV(contractEscrowId)],
        senderKey,
        network: this.network,
        anchorMode: AnchorMode.Any,
        postConditionMode: PostConditionMode.Allow,
        nonce,
      };

      const transaction = await makeContractCall(txOptions);

      // Broadcast transaction
      const broadcastResponse = await broadcastTransaction(transaction, this.network);
      const txId = broadcastResponse.txid;

      if (broadcastResponse.error) {
        throw new Error(`Broadcast failed: ${broadcastResponse.error}`);
      }

      console.log('Escrow cancel transaction broadcasted:', txId);

      // Update database status
      await this.updateEscrowStatus(contractEscrowId, 'cancelled', txId);

      return {
        success: true,
        txId,
        status: 'cancelled',
        explorerUrl: `https://explorer.stacks.co/txid/${txId}?chain=${this.network.isMainnet() ? 'mainnet' : 'testnet'}`,
      };
    } catch (error) {
      console.error('Error cancelling escrow:', error);
      throw new Error(`Failed to cancel escrow: ${error.message}`);
    }
  }

  /**
   * Get escrow details from blockchain
   * @param {number} escrowId - Escrow ID
   * @returns {Promise<Object>} Escrow data from contract
   */
  async getEscrowFromContract(escrowId) {
    try {
      const result = await callReadOnlyFunction({
        contractAddress: this.contractAddress,
        contractName: this.contractName,
        functionName: 'get-escrow',
        functionArgs: [uintCV(escrowId)],
        network: this.network,
        senderAddress: this.contractAddress,
      });

      const escrowData = cvToJSON(result);

      if (escrowData.value === null) {
        return null;
      }

      return escrowData.value;
    } catch (error) {
      console.error('Error getting escrow from contract:', error);
      throw new Error(`Failed to get escrow: ${error.message}`);
    }
  }

  /**
   * Get escrow status from blockchain
   * @param {number} escrowId - Escrow ID
   * @returns {Promise<string>} Status (active, released, refunded, cancelled)
   */
  async getEscrowStatus(escrowId) {
    try {
      const result = await callReadOnlyFunction({
        contractAddress: this.contractAddress,
        contractName: this.contractName,
        functionName: 'get-status',
        functionArgs: [uintCV(escrowId)],
        network: this.network,
        senderAddress: this.contractAddress,
      });

      const status = cvToJSON(result);
      return status.value.value; // Extract string from Ok response
    } catch (error) {
      console.error('Error getting escrow status:', error);
      throw new Error(`Failed to get escrow status: ${error.message}`);
    }
  }

  /**
   * Check if escrow can be refunded
   * @param {number} escrowId - Escrow ID
   * @returns {Promise<boolean>} True if can refund
   */
  async canRefund(escrowId) {
    try {
      const result = await callReadOnlyFunction({
        contractAddress: this.contractAddress,
        contractName: this.contractName,
        functionName: 'can-refund',
        functionArgs: [uintCV(escrowId)],
        network: this.network,
        senderAddress: this.contractAddress,
      });

      const canRefund = cvToJSON(result);
      return canRefund.value.value; // Extract boolean from Ok response
    } catch (error) {
      console.error('Error checking refund status:', error);
      return false;
    }
  }

  /**
   * Save escrow to database
   * @param {Object} escrowData - Escrow data
   * @returns {Promise<Object>} Database record
   */
  async saveEscrowToDatabase(escrowData) {
    try {
      const { data, error } = await databaseService.client
        .from('escrows')
        .insert([
          {
            sender_phone: escrowData.senderPhone,
            sender_stx_address: escrowData.senderAddress,
            recipient_phone: escrowData.recipientPhone,
            recipient_stx_address: escrowData.recipientAddress,
            amount_microstx: escrowData.amountMicroStx,
            timeout_blocks: escrowData.timeoutBlocks,
            memo: escrowData.memo,
            tx_id: escrowData.txId,
            contract_escrow_id: escrowData.contractEscrowId || null,
            status: escrowData.status,
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
      console.error('Error saving escrow to database:', error);
      throw new Error(`Failed to save escrow: ${error.message}`);
    }
  }

  /**
   * Update escrow status in database
   * @param {number} contractEscrowId - Contract escrow ID
   * @param {string} status - New status
   * @param {string} txId - Transaction ID (optional)
   * @returns {Promise<Object>} Updated record
   */
  async updateEscrowStatus(contractEscrowId, status, txId = null) {
    try {
      const updateData = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (txId) {
        updateData.release_tx_id = txId;
      }

      const { data, error } = await databaseService.client
        .from('escrows')
        .update(updateData)
        .eq('contract_escrow_id', contractEscrowId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating escrow status:', error);
      throw new Error(`Failed to update escrow status: ${error.message}`);
    }
  }

  /**
   * Get escrows by phone number
   * @param {string} phoneNumber - Phone number
   * @param {string} role - 'sender' or 'recipient'
   * @returns {Promise<Array>} List of escrows
   */
  async getEscrowsByPhone(phoneNumber, role = 'all') {
    try {
      let query = databaseService.client.from('escrows').select('*');

      if (role === 'sender') {
        query = query.eq('sender_phone', phoneNumber);
      } else if (role === 'recipient') {
        query = query.eq('recipient_phone', phoneNumber);
      } else {
        query = query.or(`sender_phone.eq.${phoneNumber},recipient_phone.eq.${phoneNumber}`);
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting escrows:', error);
      throw new Error(`Failed to get escrows: ${error.message}`);
    }
  }

  /**
   * Format escrow for display
   * @param {Object} escrow - Escrow from database
   * @returns {Object} Formatted escrow
   */
  formatEscrow(escrow) {
    return {
      id: escrow.id,
      contractId: escrow.contract_escrow_id,
      sender: escrow.sender_phone || escrow.sender_stx_address,
      recipient: escrow.recipient_phone || escrow.recipient_stx_address,
      amount: stacksService.microStxToStx(escrow.amount_microstx),
      status: escrow.status,
      memo: escrow.memo,
      timeout: escrow.timeout_blocks,
      createdAt: escrow.created_at,
      txId: escrow.tx_id,
    };
  }
}

// Export singleton instance
const escrowService = new EscrowService();
export default escrowService;