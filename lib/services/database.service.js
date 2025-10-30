/**
 * Database Service (JavaScript)
 * Handles Supabase client initialization and provides database utilities
 */

import { createClient } from '@supabase/supabase-js';

class DatabaseService {
  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Missing Supabase credentials. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env'
      );
    }

    this.supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Get Supabase client
   */
  getClient() {
    return this.supabase;
  }

  /**
   * Test database connection
   */
  async testConnection() {
    try {
      // Simple query to test connection
      const { data, error } = await this.supabase
        .from('users')
        .select('count')
        .limit(1);

      if (error) {
        return {
          success: false,
          message: `Connection failed: ${error.message}`,
        };
      }

      return {
        success: true,
        message: 'Database connection successful',
      };
    } catch (error) {
      return {
        success: false,
        message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Clean expired conversation states
   * Should be called periodically (e.g., via cron job)
   */
  async cleanExpiredStates() {
    const { data, error } = await this.supabase
      .from('conversation_states')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select('phone_number');

    if (error) {
      console.error('Error cleaning expired states:', error);
      return 0;
    }

    return data?.length || 0;
  }

  /**
   * Get database statistics (for monitoring)
   */
  async getStats() {
    const [users, contacts, transactions, escrows, activeStates] = await Promise.all([
      this.supabase.from('users').select('count', { count: 'exact', head: true }),
      this.supabase.from('contacts').select('count', { count: 'exact', head: true }),
      this.supabase.from('transactions').select('count', { count: 'exact', head: true }),
      this.supabase.from('escrows').select('count', { count: 'exact', head: true }),
      this.supabase
        .from('conversation_states')
        .select('count', { count: 'exact', head: true })
        .gt('expires_at', new Date().toISOString()),
    ]);

    return {
      users: users.count || 0,
      contacts: contacts.count || 0,
      transactions: transactions.count || 0,
      escrows: escrows.count || 0,
      activeStates: activeStates.count || 0,
    };
  }
}

// Create and export singleton instance
let instance = null;

export const db = (() => {
  if (!instance) {
    instance = new DatabaseService();
  }
  return instance;
})();

export default DatabaseService;