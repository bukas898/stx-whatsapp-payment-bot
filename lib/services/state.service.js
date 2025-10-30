/**
 * State Service (JavaScript)
 * Manages conversation states for multi-step interactions
 */

import { db } from './database.service.js';

class StateService {
  /**
   * Set conversation state for a user
   * @param {string} phoneNumber
   * @param {string} stateType - 'registration' | 'add_contact' | 'send_payment' | 'claim_escrow'
   * @param {Object} stateData - Additional data for the state
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async setState(phoneNumber, stateType, stateData = {}) {
    try {
      const client = db.getClient();

      // Calculate expiration (10 minutes from now)
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + 10);

      const { error } = await client
        .from('conversation_states')
        .upsert({
          phone_number: phoneNumber,
          state_type: stateType,
          state_data: stateData,
          expires_at: expiresAt.toISOString(),
        }, {
          onConflict: 'phone_number'
        });

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get conversation state for a user
   * @param {string} phoneNumber
   * @returns {Promise<{success: boolean, state?: Object, error?: string}>}
   */
  async getState(phoneNumber) {
    try {
      const client = db.getClient();
      const now = new Date().toISOString();

      const { data, error } = await client
        .from('conversation_states')
        .select('*')
        .eq('phone_number', phoneNumber)
        .gt('expires_at', now) // Only get non-expired states
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No state found or expired
          return {
            success: false,
            error: 'No active state found',
          };
        }
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        state: {
          phoneNumber: data.phone_number,
          stateType: data.state_type,
          stateData: data.state_data,
          createdAt: data.created_at,
          expiresAt: data.expires_at,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Clear conversation state for a user
   * @param {string} phoneNumber
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async clearState(phoneNumber) {
    try {
      const client = db.getClient();

      const { error } = await client
        .from('conversation_states')
        .delete()
        .eq('phone_number', phoneNumber);

      if (error) {
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Update state data without changing state type
   * @param {string} phoneNumber
   * @param {Object} newData - Data to merge with existing state data
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async updateStateData(phoneNumber, newData) {
    try {
      // Get current state
      const currentState = await this.getState(phoneNumber);
      
      if (!currentState.success) {
        return {
          success: false,
          error: 'No active state to update',
        };
      }

      // Merge data
      const mergedData = {
        ...currentState.state.stateData,
        ...newData,
      };

      // Update state with merged data
      return await this.setState(
        phoneNumber,
        currentState.state.stateType,
        mergedData
      );
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if user has an active state
   * @param {string} phoneNumber
   * @returns {Promise<boolean>}
   */
  async hasActiveState(phoneNumber) {
    const result = await this.getState(phoneNumber);
    return result.success;
  }

  /**
   * Get state type for a user (or null if no active state)
   * @param {string} phoneNumber
   * @returns {Promise<string|null>}
   */
  async getStateType(phoneNumber) {
    const result = await this.getState(phoneNumber);
    return result.success ? result.state.stateType : null;
  }

  /**
   * Clean up expired states (should be called periodically)
   * @returns {Promise<number>} Number of states cleaned
   */
  async cleanExpiredStates() {
    try {
      const client = db.getClient();
      const now = new Date().toISOString();

      const { data, error } = await client
        .from('conversation_states')
        .delete()
        .lt('expires_at', now)
        .select('phone_number');

      if (error) {
        console.error('Error cleaning expired states:', error);
        return 0;
      }

      return data?.length || 0;
    } catch (error) {
      console.error('Error cleaning expired states:', error);
      return 0;
    }
  }

  /**
   * Get all active states (for monitoring/debugging)
   * @returns {Promise<Array>}
   */
  async getAllActiveStates() {
    try {
      const client = db.getClient();
      const now = new Date().toISOString();

      const { data, error } = await client
        .from('conversation_states')
        .select('*')
        .gt('expires_at', now)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error getting active states:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error getting active states:', error);
      return [];
    }
  }
}

// Export singleton instance
export const stateService = new StateService();
export default StateService;