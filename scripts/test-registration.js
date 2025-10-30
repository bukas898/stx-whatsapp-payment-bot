/**
 * Registration Handler Test
 * Run: node scripts/test-registration.js
 */

import('dotenv').then(dotenv => dotenv.config());

async function testRegistration() {
  console.log('🧪 Testing Registration Handler...\n');

  try {
    const { registrationHandler } = await import('../lib/handlers/registration.handler.js');
    const { userService } = await import('../lib/services/user.service.js');
    const { stateService } = await import('../lib/services/state.service.js');

    const testPhone = '+2349012345678';
    const testAddress = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
    const invalidAddress1 = 'INVALID_ADDRESS';
    const invalidAddress2 = 'SP123'; // Too short

    // Clean up
    console.log('🧹 Cleaning up...');
    await userService.delete(testPhone);
    await stateService.clearState(testPhone);
    console.log('   ✓ Ready\n');

    // Test 1: Check registration status (not registered)
    console.log('✓ Test 1: Check initial registration status');
    const status1 = await registrationHandler.getRegistrationStatus(testPhone);
    if (status1.registered || status1.inProgress) {
      console.error('   ❌ Should not be registered or in progress');
      process.exit(1);
    }
    console.log('   ✓ Not registered (correct)');
    console.log('   - Registered:', status1.registered);
    console.log('   - In progress:', status1.inProgress);
    console.log('');

    // Test 2: Initiate registration
    console.log('✓ Test 2: Initiate registration');
    const initResult = await registrationHandler.initiateRegistration(testPhone);
    if (!initResult.success) {
      console.error('   ❌ Failed:', initResult.error);
      process.exit(1);
    }
    console.log('   ✓ Registration initiated');
    console.log('');

    // Test 3: Check registration status (in progress)
    console.log('✓ Test 3: Check status after initiation');
    const status2 = await registrationHandler.getRegistrationStatus(testPhone);
    if (!status2.inProgress) {
      console.error('   ❌ Should be in progress');
      process.exit(1);
    }
    console.log('   ✓ Registration in progress');
    console.log('   - State type:', status2.state?.stateType);
    console.log('   - Awaiting address:', status2.state?.stateData?.awaitingAddress);
    console.log('');

    // Test 4: Try invalid address (wrong format)
    console.log('✓ Test 4: Try invalid address format');
    const invalidResult1 = await registrationHandler.handleRegistration(
      testPhone,
      invalidAddress1
    );
    if (invalidResult1.success) {
      console.error('   ❌ Should reject invalid address');
      process.exit(1);
    }
    console.log('   ✓ Invalid address rejected');
    console.log('   - Error:', invalidResult1.error);
    console.log('');

    // Test 5: Try invalid address (too short)
    console.log('✓ Test 5: Try too short address');
    const invalidResult2 = await registrationHandler.handleRegistration(
      testPhone,
      invalidAddress2
    );
    if (invalidResult2.success) {
      console.error('   ❌ Should reject short address');
      process.exit(1);
    }
    console.log('   ✓ Short address rejected');
    console.log('   - Error:', invalidResult2.error);
    console.log('');

    // Test 6: Complete registration with valid address
    console.log('✓ Test 6: Complete registration with valid address');
    const completeResult = await registrationHandler.handleRegistration(
      testPhone,
      testAddress
    );
    if (!completeResult.success) {
      console.error('   ❌ Failed:', completeResult.error);
      process.exit(1);
    }
    console.log('   ✓ Registration completed');
    console.log('   - Phone:', completeResult.user?.phoneNumber);
    console.log('   - Address:', completeResult.user?.stxAddress);
    console.log('');

    // Test 7: Check registration status (now registered)
    console.log('✓ Test 7: Check status after completion');
    const status3 = await registrationHandler.getRegistrationStatus(testPhone);
    if (!status3.registered || status3.inProgress) {
      console.error('   ❌ Should be registered and not in progress');
      process.exit(1);
    }
    console.log('   ✓ User registered');
    console.log('   - Registered:', status3.registered);
    console.log('   - In progress:', status3.inProgress);
    console.log('');

    // Test 8: Try to register again (should fail)
    console.log('✓ Test 8: Try to register again');
    const duplicateResult = await registrationHandler.initiateRegistration(testPhone);
    if (duplicateResult.success) {
      console.error('   ❌ Should not allow duplicate registration');
      process.exit(1);
    }
    console.log('   ✓ Duplicate registration prevented');
    console.log('   - Error:', duplicateResult.error);
    console.log('');

    // Test 9: Test with another user - start and cancel
    const testPhone2 = '+2349087654321';
    console.log('✓ Test 9: Start and cancel registration');
    
    await stateService.clearState(testPhone2);
    await registrationHandler.initiateRegistration(testPhone2);
    
    const cancelResult = await registrationHandler.cancelRegistration(testPhone2);
    if (!cancelResult.success) {
      console.error('   ❌ Failed to cancel:', cancelResult.error);
      process.exit(1);
    }
    console.log('   ✓ Registration cancelled');
    console.log('');

    // Test 10: Verify cancellation cleared state
    console.log('✓ Test 10: Verify state cleared after cancel');
    const status4 = await registrationHandler.getRegistrationStatus(testPhone2);
    if (status4.inProgress) {
      console.error('   ❌ State should be cleared');
      process.exit(1);
    }
    console.log('   ✓ State cleared (verified)');
    console.log('');

    // Test 11: Try to use already registered address
    const testPhone3 = '+2349011111111';
    console.log('✓ Test 11: Try to register with used address');
    
    await userService.delete(testPhone3);
    await stateService.clearState(testPhone3);
    await registrationHandler.initiateRegistration(testPhone3);
    
    const usedAddressResult = await registrationHandler.handleRegistration(
      testPhone3,
      testAddress // Same address as testPhone
    );
    
    if (usedAddressResult.success) {
      console.error('   ❌ Should reject already-used address');
      process.exit(1);
    }
    console.log('   ✓ Duplicate address rejected');
    console.log('   - Error:', usedAddressResult.error);
    console.log('');

    // Cleanup
    console.log('✓ Test 12: Cleanup');
    await userService.delete(testPhone);
    await userService.delete(testPhone2);
    await userService.delete(testPhone3);
    await stateService.clearState(testPhone);
    await stateService.clearState(testPhone2);
    await stateService.clearState(testPhone3);
    console.log('   ✓ Cleanup complete\n');

    console.log('========================================');
    console.log('✅ All Registration Handler tests passed!');
    console.log('========================================');
    console.log('');
    console.log('Registration flow is working correctly! 🚀');
    console.log('');
    console.log('Next: Enhanced Webhook (api/webhook.ts)');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    console.error('\nMake sure:');
    console.error('1. lib/handlers/registration.handler.js exists');
    console.error('2. lib/utils/validator.js exists');
    console.error('3. All services are working');
    process.exit(1);
  }
}

testRegistration();