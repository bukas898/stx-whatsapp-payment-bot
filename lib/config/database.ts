/**
 * Database Configuration
 * Handles Vercel Postgres (Supabase) connection
 */

import { sql } from '@vercel/postgres';

/**
 * Execute a SQL query with error handling
 * @param query - SQL query string
 * @param params - Query parameters
 * @returns Query result
 */
export async function query(queryString: string, params: any[] = []) {
  try {
    const result = await sql.query(queryString, params);
    return result;
  } catch (error) {
    console.error('Database query error:', error);
    throw new Error(`Database error: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Test database connection
 * @returns true if connected, throws error otherwise
 */
export async function testConnection(): Promise<boolean> {
  try {
    await sql`SELECT 1 as test`;
    console.log('✅ Database connection successful');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// Export the sql client for direct use
export { sql };

export default {
  query,
  testConnection,
  sql,
};
