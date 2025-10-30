/**
 * User Service
 * Handles user registration and management
 */

import { db } from './database.service';
import type { Database } from './database.service';

type UserRow = Database['public']['Tables']['users']['Row'];
type UserInsert = Database['public']['Tables']['users']['Insert'];

export interface CreateUserParams {
  phoneNumber: string;
  stxAddress: string;
}

export interface User {
  phoneNumber: string;
  stxAddress: string;
  createdAt: string;
  updatedAt: string;
}

class UserService {
  /**
   * Create a new user (register)
   */
  async create(params: CreateUserParams): Promise<{ success: boolean; user?: User; error?: string }> {
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
   */
  async getByPhone(phoneNumber: string): Promise<{ success: boolean; user?: User; error?: string }> {
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
   */
  async getByAddress(stxAddress: string): Promise<{ success: boolean; user?: User; error?: string }> {
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
   */
  async exists(phoneNumber: string): Promise<boolean> {
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
   */
  async addressExists(stxAddress: string): Promise<boolean> {
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
   */
  async updateAddress(
    phoneNumber: string,
    newStxAddress: string
  ): Promise<{ success: boolean; user?: User; error?: string }> {
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
   */
  async delete(phoneNumber: string): Promise<{ success: boolean; error?: string }> {
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
   */
  async count(): Promise<number> {
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
   * Map database row to User interface
   */
  private mapToUser(row: UserRow): User {
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