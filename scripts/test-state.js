/**
 * State Service Test
 * Run: node scripts/test-state.js
 */

import('dotenv').then(dotenv => dotenv.config());

async function testState() {
  console.log('🧪 Testing State Service...\n');

  try {
    const { stateService } = await import('../lib/services/state.service.js');

    const testPhone = '+2349012345678';

    // Clean up
    console.log('🧹 Cleaning...');
    await stateService.clearState(testPhone);
    console.log('   ✓ Ready\n');

    // Test 1: Check no state exists
    console.log('✓ Test 1: Check no active state');
    const hasState1 = await stateService.hasActiveState(testPhone);
    if (hasState1) {
      console.error('   ❌ Should not have state');
      process.exit(1);
    }
    console.log('   ✓ No active state (correct)\n');

    // Test 2: Set registration state
    console.log('✓ Test 2: Set registration state');
    const setState1 = await stateService.setState(
      testPhone,
      'registration',
      { step: 1, awaitingAddress: true }
    );
    if (!setState1.success) {
      console.error('   ❌ Failed:', setState1.error);
      process.exit(1);
    }
    console.log('   ✓ State set successfully\n');

    // Test 3: Get state
    console.log('✓ Test 3: Get state');
    const getState1 = await stateService.getState(testPhone);
    if (!getState1.success) {
      console.error('   ❌ Failed:', getState1.error);
      process.exit(1);
    }
    console.log('   ✓ State retrieved');
    console.log('   - Type:', getState1.state.stateType);
    console.log('   - Data:', JSON.stringify(getState1.state.stateData));
    console.log('   - Expires:', new Date(getState1.state.expiresAt).toLocaleString());
    console.log('');

    // Test 4: Check state exists
    console.log('✓ Test 4: Check state exists now');
    const hasState2 = await stateService.hasActiveState(testPhone);
    if (!hasState2) {
      console.error('   ❌ Should have state');
      process.exit(1);
    }
    console.log('   ✓ State exists (correct)\n');

    // Test 5: Get state type
    console.log('✓ Test 5: Get state type');
    const stateType = await stateService.getStateType(testPhone);
    if (stateType !== 'registration') {
      console.error('   ❌ Wrong state type:', stateType);
      process.exit(1);
    }
    console.log('   ✓ State type:', stateType);
    console.log('');

    // Test 6: Update state data
    console.log('✓ Test 6: Update state data');
    const updateResult = await stateService.updateStateData(
      testPhone,
      { step: 2, addressReceived: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7' }
    );
    if (!updateResult.success) {
      console.error('   ❌ Failed:', updateResult.error);
      process.exit(1);
    }
    console.log('   ✓ Data updated\n');

    // Test 7: Verify updated data
    console.log('✓ Test 7: Verify updated data');
    const getState2 = await stateService.getState(testPhone);
    if (!getState2.success) {
      console.error('   ❌ Failed:', getState2.error);
      process.exit(1);
    }
    console.log('   ✓ Updated data retrieved');
    console.log('   - step:', getState2.state.stateData.step);
    console.log('   - awaitingAddress:', getState2.state.stateData.awaitingAddress);
    console.log('   - addressReceived:', getState2.state.stateData.addressReceived);
    console.log('');

    // Test 8: Change state type
    console.log('✓ Test 8: Change state type');
    const setState2 = await stateService.setState(
      testPhone,
      'send_payment',
      { recipient: '+2349087654321', amount: 1000000 }
    );
    if (!setState2.success) {
      console.error('   ❌ Failed:', setState2.error);
      process.exit(1);
    }
    console.log('   ✓ State type changed\n');

    // Test 9: Verify new state
    console.log('✓ Test 9: Verify new state');
    const getState3 = await stateService.getState(testPhone);
    if (!getState3.success || getState3.state.stateType !== 'send_payment') {
      console.error('   ❌ State type not updated correctly');
      process.exit(1);
    }
    console.log('   ✓ New state verified');
    console.log('   - Type:', getState3.state.stateType);
    console.log('   - Data:', JSON.stringify(getState3.state.stateData));
    console.log('');

    // Test 10: Get all active states
    console.log('✓ Test 10: Get all active states');
    const allStates = await stateService.getAllActiveStates();
    console.log(`   ✓ Found ${allStates.length} active state(s)`);
    if (allStates.length > 0) {
      console.log('   - First state phone:', allStates[0].phone_number);
    }
    console.log('');

    // Test 11: Clear state
    console.log('✓ Test 11: Clear state');
    const clearResult = await stateService.clearState(testPhone);
    if (!clearResult.success) {
      console.error('   ❌ Failed:', clearResult.error);
      process.exit(1);
    }
    console.log('   ✓ State cleared\n');

    // Test 12: Verify cleared
    console.log('✓ Test 12: Verify state cleared');
    const hasState3 = await stateService.hasActiveState(testPhone);
    if (hasState3) {
      console.error('   ❌ State should be cleared');
      process.exit(1);
    }
    console.log('   ✓ State cleared (verified)\n');

    // Test 13: Try to get cleared state
    console.log('✓ Test 13: Try to get cleared state');
    const getState4 = await stateService.getState(testPhone);
    if (getState4.success) {
      console.error('   ❌ Should not get cleared state');
      process.exit(1);
    }
    console.log('   ✓ Cleared state not retrieved (correct)');
    console.log('   - Error:', getState4.error);
    console.log('');

    console.log('========================================');
    console.log('✅ All State Service tests passed!');
    console.log('========================================');
    console.log('\nState Service is working correctly! 🚀');
    console.log('\nNext: WhatsApp Service');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('\nMake sure:');
    console.error('1. lib/services/state.service.js exists');
    console.error('2. Database connection is working');
    console.error('3. conversation_states table exists');
    process.exit(1);
  }
}

testState();