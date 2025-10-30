/**
 * Stacks Blockchain Service
 * 
 * Handles all interactions with the Stacks blockchain via Hiro API:
 * - Get account balances
 * - Fetch transaction details
 * - Check transaction status
 * - Get account information
 * - Broadcast transactions
 * - Monitor confirmations
 */

import fetch from 'node-fetch';

class StacksService {
  constructor() {
    this.apiUrl = process.env.STACKS_API_URL || 'https://api.mainnet.hiro.so';
    this.network = process.env.STACKS_NETWORK || 'mainnet';
    
    // Minimum confirmations before considering a transaction final
    this.minConfirmations = 3;
  }

  /**
   * Make a GET request to Hiro API
   * @param {string} endpoint - API endpoint
   * @returns {Promise<Object>} API response
   */
  async _get(endpoint) {
    const url = `${this.apiUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Hiro API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Stacks API GET error:', error);
      throw new Error(`Failed to fetch from Stacks API: ${error.message}`);
    }
  }

  /**
   * Make a POST request to Hiro API
   * @param {string} endpoint - API endpoint
   * @param {Object} data - Request body
   * @returns {Promise<Object>} API response
   */
  async _post(endpoint, data) {
    const url = `${this.apiUrl}${endpoint}`;
    
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Hiro API error (${response.status}): ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Stacks API POST error:', error);
      throw new Error(`Failed to post to Stacks API: ${error.message}`);
    }
  }

  /**
   * Get STX balance for an address
   * @param {string} address - Stacks address (SP...)
   * @returns {Promise<Object>} Balance information
   */
  async getBalance(address) {
    try {
      const data = await this._get(`/extended/v1/address/${address}/balances`);
      
      return {
        address,
        stx: {
          balance: data.stx.balance,
          totalSent: data.stx.total_sent,
          totalReceived: data.stx.total_received,
          totalFeesSent: data.stx.total_fees_sent,
          locked: data.stx.locked,
          // Convert microSTX to STX (1 STX = 1,000,000 microSTX)
          balanceStx: parseFloat(data.stx.balance) / 1000000,
          lockedStx: parseFloat(data.stx.locked) / 1000000,
        },
        fungibleTokens: data.fungible_tokens || {},
        nonFungibleTokens: data.non_fungible_tokens || {},
      };
    } catch (error) {
      console.error('Error getting balance:', error);
      throw new Error(`Failed to get balance for ${address}: ${error.message}`);
    }
  }

  /**
   * Get account information including nonce
   * @param {string} address - Stacks address
   * @returns {Promise<Object>} Account info
   */
  async getAccountInfo(address) {
    try {
      const data = await this._get(`/v2/accounts/${address}`);
      
      return {
        address,
        balance: data.balance,
        balanceStx: parseFloat(data.balance) / 1000000,
        locked: data.locked,
        lockedStx: parseFloat(data.locked) / 1000000,
        unlockHeight: data.unlock_height,
        nonce: data.nonce,
      };
    } catch (error) {
      console.error('Error getting account info:', error);
      throw new Error(`Failed to get account info for ${address}: ${error.message}`);
    }
  }

  /**
   * Get transaction details by ID
   * @param {string} txId - Transaction ID
   * @returns {Promise<Object>} Transaction details
   */
  async getTransaction(txId) {
    try {
      const data = await this._get(`/extended/v1/tx/${txId}`);
      
      return {
        txId: data.tx_id,
        txStatus: data.tx_status,
        txType: data.tx_type,
        nonce: data.nonce,
        fee: data.fee_rate,
        feeStx: parseFloat(data.fee_rate) / 1000000,
        senderAddress: data.sender_address,
        sponsored: data.sponsored,
        postConditionMode: data.post_condition_mode,
        blockHeight: data.block_height,
        blockHash: data.block_hash,
        blockTime: data.block_time,
        blockTimeIso: data.block_time_iso,
        burnBlockTime: data.burn_block_time,
        burnBlockTimeIso: data.burn_block_time_iso,
        canonical: data.canonical,
        confirmations: data.tx_status === 'success' ? 
          (data.block_height ? 'confirmed' : 'pending') : 
          data.tx_status,
        // For STX transfers
        stxTransfer: data.tx_type === 'token_transfer' ? {
          recipient: data.token_transfer.recipient_address,
          amount: data.token_transfer.amount,
          amountStx: parseFloat(data.token_transfer.amount) / 1000000,
          memo: data.token_transfer.memo,
        } : null,
      };
    } catch (error) {
      console.error('Error getting transaction:', error);
      throw new Error(`Failed to get transaction ${txId}: ${error.message}`);
    }
  }

  /**
   * Get transaction status (simple version)
   * @param {string} txId - Transaction ID
   * @returns {Promise<Object>} Status information
   */
  async getTransactionStatus(txId) {
    try {
      const tx = await this.getTransaction(txId);
      
      return {
        txId,
        status: tx.txStatus,
        confirmed: tx.txStatus === 'success',
        pending: tx.txStatus === 'pending',
        failed: tx.txStatus === 'abort_by_response' || tx.txStatus === 'abort_by_post_condition',
        blockHeight: tx.blockHeight,
        confirmations: tx.blockHeight ? 'confirmed' : 'pending',
      };
    } catch (error) {
      // If transaction not found, it might be too recent
      if (error.message.includes('404')) {
        return {
          txId,
          status: 'not_found',
          confirmed: false,
          pending: true,
          failed: false,
          blockHeight: null,
          confirmations: 0,
        };
      }
      throw error;
    }
  }

  /**
   * Get recent transactions for an address
   * @param {string} address - Stacks address
   * @param {number} limit - Number of transactions to fetch (default: 50)
   * @returns {Promise<Array>} List of transactions
   */
  async getTransactionHistory(address, limit = 50) {
    try {
      const data = await this._get(
        `/extended/v1/address/${address}/transactions?limit=${limit}`
      );
      
      return {
        total: data.total,
        results: data.results.map(tx => ({
          txId: tx.tx_id,
          txType: tx.tx_type,
          txStatus: tx.tx_status,
          blockHeight: tx.block_height,
          blockTime: tx.block_time,
          fee: tx.fee_rate,
          feeStx: parseFloat(tx.fee_rate) / 1000000,
          sender: tx.sender_address,
          // For STX transfers
          transfer: tx.tx_type === 'token_transfer' ? {
            recipient: tx.token_transfer.recipient_address,
            amount: tx.token_transfer.amount,
            amountStx: parseFloat(tx.token_transfer.amount) / 1000000,
          } : null,
        })),
      };
    } catch (error) {
      console.error('Error getting transaction history:', error);
      throw new Error(`Failed to get transaction history for ${address}: ${error.message}`);
    }
  }

  /**
   * Broadcast a signed transaction to the network
   * @param {string} signedTx - Signed transaction in hex format
   * @returns {Promise<Object>} Broadcast result with txId
   */
  async broadcastTransaction(signedTx) {
    try {
      const result = await this._post('/v2/transactions', signedTx);
      
      return {
        success: true,
        txId: result.txid || result,
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
   * Wait for transaction confirmation
   * @param {string} txId - Transaction ID
   * @param {number} maxAttempts - Maximum polling attempts (default: 60)
   * @param {number} intervalMs - Polling interval in ms (default: 10000)
   * @returns {Promise<Object>} Final transaction status
   */
  async waitForConfirmation(txId, maxAttempts = 60, intervalMs = 10000) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      try {
        const status = await this.getTransactionStatus(txId);
        
        // Transaction confirmed
        if (status.confirmed) {
          return {
            confirmed: true,
            status: status.status,
            blockHeight: status.blockHeight,
            txId,
          };
        }
        
        // Transaction failed
        if (status.failed) {
          return {
            confirmed: false,
            failed: true,
            status: status.status,
            txId,
          };
        }
        
        // Still pending, wait and retry
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
      } catch (error) {
        console.error(`Confirmation check attempt ${attempts} failed:`, error);
        attempts++;
        if (attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, intervalMs));
        }
      }
    }
    
    // Timeout
    return {
      confirmed: false,
      timeout: true,
      status: 'pending',
      txId,
      message: 'Transaction confirmation timeout',
    };
  }

  /**
   * Get current block height
   * @returns {Promise<number>} Current block height
   */
  async getCurrentBlockHeight() {
    try {
      const data = await this._get('/extended/v1/block?limit=1');
      return data.results[0]?.height || 0;
    } catch (error) {
      console.error('Error getting block height:', error);
      throw new Error(`Failed to get current block height: ${error.message}`);
    }
  }

  /**
   * Estimate transaction fee
   * @returns {Promise<Object>} Fee estimates
   */
  async estimateFee() {
    try {
      const data = await this._get('/v2/fees/transaction');
      
      return {
        low: data.estimated_cost_scalar,
        medium: data.estimated_cost,
        high: data.estimated_cost_scalar * 2,
        // Convert to STX
        lowStx: parseFloat(data.estimated_cost_scalar) / 1000000,
        mediumStx: parseFloat(data.estimated_cost) / 1000000,
        highStx: (parseFloat(data.estimated_cost_scalar) * 2) / 1000000,
      };
    } catch (error) {
      console.error('Error estimating fee:', error);
      // Return default values if API fails
      return {
        low: 180,
        medium: 250,
        high: 360,
        lowStx: 0.00018,
        mediumStx: 0.00025,
        highStx: 0.00036,
      };
    }
  }

  /**
   * Validate Stacks address format
   * @param {string} address - Address to validate
   * @returns {boolean} True if valid
   */
  isValidAddress(address) {
    // Mainnet addresses start with SP
    // Testnet addresses start with ST
    const mainnetRegex = /^SP[0-9A-Z]{38,41}$/;
    const testnetRegex = /^ST[0-9A-Z]{38,41}$/;
    
    if (this.network === 'mainnet') {
      return mainnetRegex.test(address);
    } else {
      return testnetRegex.test(address);
    }
  }

  /**
   * Convert microSTX to STX
   * @param {number|string} microStx - Amount in microSTX
   * @returns {number} Amount in STX
   */
  microStxToStx(microStx) {
    return parseFloat(microStx) / 1000000;
  }

  /**
   * Convert STX to microSTX
   * @param {number|string} stx - Amount in STX
   * @returns {number} Amount in microSTX
   */
  stxToMicroStx(stx) {
    return Math.floor(parseFloat(stx) * 1000000);
  }

  /**
   * Format STX amount for display
   * @param {number|string} microStx - Amount in microSTX
   * @returns {string} Formatted amount (e.g., "5.25 STX")
   */
  formatStxAmount(microStx) {
    const stx = this.microStxToStx(microStx);
    return `${stx.toFixed(6)} STX`;
  }

  /**
   * Get network info
   * @returns {Object} Network information
   */
  getNetworkInfo() {
    return {
      network: this.network,
      apiUrl: this.apiUrl,
      isMainnet: this.network === 'mainnet',
      isTestnet: this.network === 'testnet',
    };
  }
}

// Export singleton instance
const stacksService = new StacksService();
export default stacksService;