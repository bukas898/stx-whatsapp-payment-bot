/**
 * User Service Quick Test
 * Save as: scripts/test-user.js
 * Run: node scripts/test-user.js
 */

import('dotenv').then(dotenv => dotenv.config());

async function testUser() {
  console.log('🧪 Testing User Service...\n');

  try {
    // Import services
    const { userService } = await import('../lib/services/user.service.js');

    const testPhone = '+2349012345678';
    const testAddress = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';

    // Clean up
    console.log('🧹 Cleaning...');
    await userService.delete(testPhone);
    console.log('   ✓ Ready\n');

    // Test 1: Create user
    console.log('✓ Test 1: Create user');
    const createResult = await userService.create({
      phoneNumber: testPhone,
      stxAddress: testAddress,
    });

    if (!createResult.success) {
      console.error('   ❌ Failed:', createResult.error);
      process.exit(1);
    }
    console.log('   ✓ User created');
    console.log('   - Phone:', createResult.user?.phoneNumber);
    console.log('   - Address:', createResult.user?.stxAddress);
    console.log('');

    // Test 2: Check exists
    console.log('✓ Test 2: Check exists');
    const exists = await userService.exists(testPhone);
    if (!exists) {
      console.error('   ❌ User should exist');
      process.exit(1);
    }
    console.log('   ✓ User exists\n');

    // Test 3: Get by phone
    console.log('✓ Test 3: Get by phone');
    const getResult = await userService.getByPhone(testPhone);
    if (!getResult.success) {
      console.error('   ❌ Failed:', getResult.error);
      process.exit(1);
    }
    console.log('   ✓ User retrieved');
    console.log('   - Phone:', getResult.user?.phoneNumber);
    console.log('');

    // Test 4: Try duplicate
    console.log('✓ Test 4: Try duplicate');
    const dupResult = await userService.create({
      phoneNumber: testPhone,
      stxAddress: 'SP1DIFFERENT111111111111111111111111111111',
    });
    if (dupResult.success) {
      console.error('   ❌ Should reject duplicate');
      process.exit(1);
    }
    console.log('   ✓ Duplicate rejected:', dupResult.error);
    console.log('');

    // Test 5: Delete
    console.log('✓ Test 5: Delete user');
    const deleteResult = await userService.delete(testPhone);
    if (!deleteResult.success) {
      console.error('   ❌ Failed:', deleteResult.error);
      process.exit(1);
    }
    console.log('   ✓ User deleted\n');

    // Test 6: Verify deletion
    console.log('✓ Test 6: Verify deletion');
    const existsAfter = await userService.exists(testPhone);
    if (existsAfter) {
      console.error('   ❌ User should not exist');
      process.exit(1);
    }
    console.log('   ✓ Verified deleted\n');

    console.log('========================================');
    console.log('✅ All tests passed!');
    console.log('========================================');
    console.log('\nUser Service is working correctly! 🚀');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nMake sure:');
    console.error('1. lib/services/database.service.js exists');
    console.error('2. lib/services/user.service.js exists');
    console.error('3. package.json has "type": "module"');
    console.error('4. .env is configured');
    process.exit(1);
  }
}

testUser();