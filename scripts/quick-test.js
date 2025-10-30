/**
 * Quick Database Test - No TypeScript compilation needed
 * Run with: node scripts/quick-test.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function quickTest() {
  console.log('🔍 Quick Database Connection Test...\n');

  try {
    // Check environment variables
    console.log('✓ Checking environment...');
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
      process.exit(1);
    }
    console.log(`   ✓ SUPABASE_URL: ${supabaseUrl}`);
    console.log('');

    // Create client
    console.log('✓ Connecting to database...');
    const supabase = createClient(supabaseUrl, supabaseKey);
    console.log('   ✓ Client created');
    console.log('');

    // Test connection with users table
    console.log('✓ Testing connection...');
    const { data, error } = await supabase.from('users').select('count').limit(1);
    
    if (error) {
      console.error('❌ Connection failed:', error.message);
      process.exit(1);
    }
    console.log('   ✓ Connection successful!');
    console.log('');

    // Check all tables
    console.log('✓ Verifying tables...');
    const tables = ['users', 'contacts', 'transactions', 'escrows', 'conversation_states'];
    
    for (const table of tables) {
      const { error: tableError } = await supabase.from(table).select('count').limit(1);
      if (tableError) {
        console.error(`   ❌ Table "${table}": ${tableError.message}`);
        process.exit(1);
      }
      console.log(`   ✓ ${table}`);
    }
    console.log('');

    // Get counts
    console.log('✓ Database statistics:');
    const userCount = await supabase.from('users').select('*', { count: 'exact', head: true });
    const contactCount = await supabase.from('contacts').select('*', { count: 'exact', head: true });
    const txCount = await supabase.from('transactions').select('*', { count: 'exact', head: true });
    const escrowCount = await supabase.from('escrows').select('*', { count: 'exact', head: true });
    const stateCount = await supabase.from('conversation_states').select('*', { count: 'exact', head: true });

    console.log(`   - Users: ${userCount.count || 0}`);
    console.log(`   - Contacts: ${contactCount.count || 0}`);
    console.log(`   - Transactions: ${txCount.count || 0}`);
    console.log(`   - Escrows: ${escrowCount.count || 0}`);
    console.log(`   - States: ${stateCount.count || 0}`);
    console.log('');

    console.log('========================================');
    console.log('✅ Database test passed!');
    console.log('========================================');
    console.log('Your database is ready!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nCheck:');
    console.error('1. .env file has SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
    console.error('2. Migration was run in Supabase SQL Editor');
    console.error('3. All 5 tables exist in Table Editor');
    process.exit(1);
  }
}

quickTest();