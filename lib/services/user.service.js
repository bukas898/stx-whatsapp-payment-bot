/**
 * User Service (JavaScript)
 * Handles user registration and management
 */

import { db } from './database.service.js';

class UserService {
  /**
   * Create a new user (register)
   * @param {Object} params
   * @param {string} params.phoneNumber
   * @param {string} params.stxAddress
   * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
   */
  async create(params) {
    try {
      const client = db.getClient();

      const { data, error } = await client
        .from('users')
        .insert({
          phone_number: params.phoneNumber,
          stx_address: params.stxAddress,
        })
        .select()
        .single();

      if (error) {
        // Check for duplicate phone number
        if (error.code === '23505' && error.message.includes('phone_number')) {
          return {
            success: false,
            error: 'Phone number already registered',
          };
        }
        // Check for duplicate STX address
        if (error.code === '23505' && error.message.includes('stx_address')) {
          return {
            success: false,
            error: 'STX address already registered',
          };
        }
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        user: this.mapToUser(data),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get user by phone number
   * @param {string} phoneNumber
   * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
   */
  async getByPhone(phoneNumber) {
    try {
      const client = db.getClient();

      const { data, error } = await client
        .from('users')
        .select('*')
        .eq('phone_number', phoneNumber)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return {
            success: false,
            error: 'User not found',
          };
        }
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        user: this.mapToUser(data),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get user by STX address
   * @param {string} stxAddress
   * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
   */
  async getByAddress(stxAddress) {
    try {
      const client = db.getClient();

      const { data, error } = await client
        .from('users')
        .select('*')
        .eq('stx_address', stxAddress)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return {
            success: false,
            error: 'User not found',
          };
        }
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        user: this.mapToUser(data),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check if user exists by phone number
   * @param {string} phoneNumber
   * @returns {Promise<boolean>}
   */
  async exists(phoneNumber) {
    try {
      const client = db.getClient();

      const { data, error } = await client
        .from('users')
        .select('phone_number')
        .eq('phone_number', phoneNumber)
        .single();

      return !error && data !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if STX address is already registered
   * @param {string} stxAddress
   * @returns {Promise<boolean>}
   */
  async addressExists(stxAddress) {
    try {
      const client = db.getClient();

      const { data, error } = await client
        .from('users')
        .select('stx_address')
        .eq('stx_address', stxAddress)
        .single();

      return !error && data !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Update user's STX address
   * @param {string} phoneNumber
   * @param {string} newStxAddress
   * @returns {Promise<{success: boolean, user?: Object, error?: string}>}
   */
  async updateAddress(phoneNumber, newStxAddress) {
    try {
      const client = db.getClient();

      const { data, error } = await client
        .from('users')
        .update({ stx_address: newStxAddress })
        .eq('phone_number', phoneNumber)
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          return {
            success: false,
            error: 'STX address already registered to another user',
          };
        }
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        user: this.mapToUser(data),
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Delete user (for testing/admin only)
   * @param {string} phoneNumber
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async delete(phoneNumber) {
    try {
      const client = db.getClient();

      const { error } = await client.from('users').delete().eq('phone_number', phoneNumber);

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
   * Get total user count
   * @returns {Promise<number>}
   */
  async count() {
    try {
      const client = db.getClient();

      const { count, error } = await client
        .from('users')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Error counting users:', error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error('Error counting users:', error);
      return 0;
    }
  }

  /**
   * Map database row to User object
   * @param {Object} row
   * @returns {Object}
   */
  mapToUser(row) {
    return {
      phoneNumber: row.phone_number,
      stxAddress: row.stx_address,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// Export singleton instance
export const userService = new UserService();
export default UserService;