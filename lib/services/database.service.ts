/**
 * Database Service
 * Handles Supabase client initialization and provides database utilities
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Database types
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          phone_number: string;
          stx_address: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          phone_number: string;
          stx_address: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          phone_number?: string;
          stx_address?: string;
          updated_at?: string;
        };
      };
      contacts: {
        Row: {
          id: number;
          user_phone: string;
          contact_name: string;
          contact_phone: string;
          created_at: string;
        };
        Insert: {
          user_phone: string;
          contact_name: string;
          contact_phone: string;
          created_at?: string;
        };
        Update: {
          contact_name?: string;
          contact_phone?: string;
        };
      };
      transactions: {
        Row: {
          id: number;
          sender_phone: string;
          recipient_phone: string;
          amount: number;
          status: 'pending' | 'processing' | 'confirmed' | 'failed';
          tx_id: string | null;
          error_message: string | null;
          created_at: string;
          confirmed_at: string | null;
        };
        Insert: {
          sender_phone: string;
          recipient_phone: string;
          amount: number;
          status: 'pending' | 'processing' | 'confirmed' | 'failed';
          tx_id?: string | null;
          error_message?: string | null;
          created_at?: string;
          confirmed_at?: string | null;
        };
        Update: {
          status?: 'pending' | 'processing' | 'confirmed' | 'failed';
          tx_id?: string | null;
          error_message?: string | null;
          confirmed_at?: string | null;
        };
      };
      escrows: {
        Row: {
          id: number;
          sender_phone: string;
          recipient_phone: string;
          recipient_phone_hash: string;
          amount: number;
          status: 'pending' | 'claimed' | 'refunded' | 'expired';
          escrow_id: string | null;
          claim_token: string | null;
          created_at: string;
          claimed_at: string | null;
          expires_at: string;
        };
        Insert: {
          sender_phone: string;
          recipient_phone: string;
          recipient_phone_hash: string;
          amount: number;
          status: 'pending' | 'claimed' | 'refunded' | 'expired';
          escrow_id?: string | null;
          claim_token?: string | null;
          created_at?: string;
          claimed_at?: string | null;
          expires_at?: string;
        };
        Update: {
          status?: 'pending' | 'claimed' | 'refunded' | 'expired';
          escrow_id?: string | null;
          claimed_at?: string | null;
        };
      };
      conversation_states: {
        Row: {
          phone_number: string;
          state_type: 'registration' | 'add_contact' | 'send_payment' | 'claim_escrow';
          state_data: Record<string, any>;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          phone_number: string;
          state_type: 'registration' | 'add_contact' | 'send_payment' | 'claim_escrow';
          state_data?: Record<string, any>;
          created_at?: string;
          expires_at?: string;
        };
        Update: {
          state_type?: 'registration' | 'add_contact' | 'send_payment' | 'claim_escrow';
          state_data?: Record<string, any>;
          expires_at?: string;
        };
      };
    };
  };
}

class DatabaseService {
  private static instance: DatabaseService;
  private supabase: SupabaseClient<Database>;

  private constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Missing Supabase credentials. Please check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env'
      );
    }

    this.supabase = createClient<Database>(supabaseUrl, supabaseKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): DatabaseService {
    if (!DatabaseService.instance) {
      DatabaseService.instance = new DatabaseService();
    }
    return DatabaseService.instance;
  }

  /**
   * Get Supabase client
   */
  public getClient(): SupabaseClient<Database> {
    return this.supabase;
  }

  /**
   * Test database connection
   */
  public async testConnection(): Promise<{ success: boolean; message: string }> {
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
  public async cleanExpiredStates(): Promise<number> {
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
  public async getStats(): Promise<{
    users: number;
    contacts: number;
    transactions: number;
    escrows: number;
    activeStates: number;
  }> {
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

// Export singleton instance
export const db = DatabaseService.getInstance();
export default DatabaseService;