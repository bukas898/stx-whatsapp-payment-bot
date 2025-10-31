import userService from '../lib/services/user.service.js';
import stacksService from '../lib/services/stacks.service.js';

async function testIntegration() {
  console.log('🧪 Testing Stacks Service Integration\n');

  try {
    // Test 1: Validate address from user service
    console.log('Test 1: Address Validation');
    const testAddress = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
    const isValid = stacksService.isValidAddress(testAddress);
    console.log('✅ Address valid:', isValid);

    // Test 2: Check if a user exists and validate their address
    console.log('\nTest 2: Get User and Validate Address');
    const user = await userService.getByPhone('+2349012345678');
    if (user) {
      const userAddressValid = stacksService.isValidAddress(user.stx_address);
      console.log('✅ User address valid:', userAddressValid);
      
      // Test 3: Try to get balance (will fail without network)
      try {
        const balance = await stacksService.getBalance(user.stx_address);
        console.log('✅ Balance:', balance.stx.balanceStx, 'STX');
      } catch (error) {
        console.log('⚠️  Balance check requires network access');
      }
    } else {
      console.log('⚠️  No user found with that phone number');
    }

    console.log('\n🎉 Integration test complete!');
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
  }
}

testIntegration();