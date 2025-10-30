/**
 * WhatsApp Service Test
 * Run: node scripts/test-whatsapp.js
 * 
 * Note: This tests in simulation mode (without real Twilio credentials)
 * Real messages will be sent if TWILIO credentials are configured in .env
 */

import('dotenv').then(dotenv => dotenv.config());

async function testWhatsApp() {
  console.log('🧪 Testing WhatsApp Service...\n');

  try {
    const { whatsappService } = await import('../lib/services/whatsapp.service.js');

    const testPhone = '+2349012345678';
    const testAddress = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';

    // Check configuration status
    console.log('✓ Test 1: Check service configuration');
    const isReady = whatsappService.isReady();
    if (isReady) {
      console.log('   ✓ Twilio configured - will send real messages');
    } else {
      console.log('   ⚠ Twilio not configured - using simulation mode');
    }
    console.log('');

    // Test 2: Send simple message
    console.log('✓ Test 2: Send simple message');
    const result1 = await whatsappService.sendMessage(
      testPhone,
      'Hello! This is a test message from STX WhatsApp Bot.'
    );
    if (!result1.success) {
      console.error('   ❌ Failed:', result1.error);
      process.exit(1);
    }
    console.log('   ✓ Message sent');
    console.log('   - Message ID:', result1.messageId);
    if (result1.simulated) {
      console.log('   - Mode: Simulated');
    }
    console.log('');

    // Test 3: Invalid phone number
    console.log('✓ Test 3: Try invalid phone number');
    const result2 = await whatsappService.sendMessage(
      '12345',
      'Test message'
    );
    if (result2.success) {
      console.error('   ❌ Should reject invalid phone');
      process.exit(1);
    }
    console.log('   ✓ Invalid phone rejected');
    console.log('   - Error:', result2.error);
    console.log('');

    // Test 4: Empty message
    console.log('✓ Test 4: Try empty message');
    const result3 = await whatsappService.sendMessage(
      testPhone,
      ''
    );
    if (result3.success) {
      console.error('   ❌ Should reject empty message');
      process.exit(1);
    }
    console.log('   ✓ Empty message rejected');
    console.log('   - Error:', result3.error);
    console.log('');

    // Test 5: Welcome message
    console.log('✓ Test 5: Send welcome message');
    const result4 = await whatsappService.sendWelcomeMessage(
      testPhone,
      testAddress
    );
    if (!result4.success) {
      console.error('   ❌ Failed:', result4.error);
      process.exit(1);
    }
    console.log('   ✓ Welcome message sent');
    console.log('');

    // Test 6: Registration prompt
    console.log('✓ Test 6: Send registration prompt');
    const result5 = await whatsappService.sendRegistrationPrompt(testPhone);
    if (!result5.success) {
      console.error('   ❌ Failed:', result5.error);
      process.exit(1);
    }
    console.log('   ✓ Registration prompt sent');
    console.log('');

    // Test 7: Error message
    console.log('✓ Test 7: Send error message');
    const result6 = await whatsappService.sendErrorMessage(
      testPhone,
      'Invalid command format'
    );
    if (!result6.success) {
      console.error('   ❌ Failed:', result6.error);
      process.exit(1);
    }
    console.log('   ✓ Error message sent');
    console.log('');

    // Test 8: Help message (unregistered)
    console.log('✓ Test 8: Send help (unregistered user)');
    const result7 = await whatsappService.sendHelpMessage(testPhone, false);
    if (!result7.success) {
      console.error('   ❌ Failed:', result7.error);
      process.exit(1);
    }
    console.log('   ✓ Help message sent (unregistered)');
    console.log('');

    // Test 9: Help message (registered)
    console.log('✓ Test 9: Send help (registered user)');
    const result8 = await whatsappService.sendHelpMessage(testPhone, true);
    if (!result8.success) {
      console.error('   ❌ Failed:', result8.error);
      process.exit(1);
    }
    console.log('   ✓ Help message sent (registered)');
    console.log('');

    // Test 10: Payment confirmation
    console.log('✓ Test 10: Send payment confirmation');
    const result9 = await whatsappService.sendPaymentConfirmation(testPhone, {
      recipient: '+2349087654321',
      amount: 5000000,
      txId: '0x1234567890abcdef',
    });
    if (!result9.success) {
      console.error('   ❌ Failed:', result9.error);
      process.exit(1);
    }
    console.log('   ✓ Payment confirmation sent');
    console.log('');

    // Test 11: Escrow notification
    console.log('✓ Test 11: Send escrow notification');
    const result10 = await whatsappService.sendEscrowNotification(testPhone, {
      amount: 10000000,
      claimToken: 'ABC123XYZ',
    });
    if (!result10.success) {
      console.error('   ❌ Failed:', result10.error);
      process.exit(1);
    }
    console.log('   ✓ Escrow notification sent');
    console.log('');

    // Test 12: Format message
    console.log('✓ Test 12: Format message');
    const formatted = whatsappService.formatMessage('  Test message  ');
    if (formatted !== 'Test message') {
      console.error('   ❌ Formatting failed');
      process.exit(1);
    }
    console.log('   ✓ Message formatted correctly');
    console.log('');

    console.log('========================================');
    console.log('✅ All WhatsApp Service tests passed!');
    console.log('========================================');
    console.log('');
    
    if (!isReady) {
      console.log('ℹ️  Note: Tests ran in simulation mode');
      console.log('');
      console.log('To send real WhatsApp messages, add to .env:');
      console.log('  TWILIO_ACCOUNT_SID=ACxxxx...');
      console.log('  TWILIO_AUTH_TOKEN=your_token');
      console.log('  TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886');
      console.log('');
    } else {
      console.log('✅ Real messages were sent via Twilio!');
      console.log('');
    }
    
    console.log('Next: Registration Handler 🚀');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
    console.error('\nMake sure:');
    console.error('1. lib/services/whatsapp.service.js exists');
    console.error('2. twilio package is installed (npm install twilio)');
    process.exit(1);
  }
}

testWhatsApp();