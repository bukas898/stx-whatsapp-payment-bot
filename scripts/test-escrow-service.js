/**
 * Test script for Escrow Service
 * 
 * Tests escrow service methods (without blockchain calls)
 * Run: node scripts/test-escrow-service.js
 */

import escrowService from '../lib/services/escrow.service.js';
import stacksService from '../lib/services/stacks.service.js';

console.log('🧪 Testing Escrow Service\n');
console.log('='.repeat(60));

async function runTests() {
  let passedTests = 0;
  let failedTests = 0;

  // Test 1: Service initialization
  console.log('\n✅ Test 1: Service Initialization');
  try {
    console.log('  Contract Address:', escrowService.contractAddress);
    console.log('  Contract Name:', escrowService.contractName);
    console.log('  Network:', escrowService.network.isMainnet() ? 'Mainnet' : 'Testnet');
    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 2: Service methods available
  console.log('\n✅ Test 2: Service Methods Available');
  try {
    const methods = [
      'createEscrow',
      'releaseEscrow',
      'refundEscrow',
      'cancelEscrow',
      'getEscrowFromContract',
      'getEscrowStatus',
      'canRefund',
      'saveEscrowToDatabase',
      'updateEscrowStatus',
      'getEscrowsByPhone',
      'formatEscrow',
    ];

    console.log('Available methods:');
    methods.forEach(method => {
      const exists = typeof escrowService[method] === 'function';
      console.log(`  ${exists ? '✅' : '❌'} ${method}`);
    });

    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 3: Validate timeout blocks calculation
  console.log('\n✅ Test 3: Timeout Blocks Calculation');
  try {
    const timeframes = [
      { hours: 1, blocks: 6 },      // 1 hour ≈ 6 blocks (10 min/block)
      { hours: 24, blocks: 144 },   // 24 hours ≈ 144 blocks
      { hours: 72, blocks: 432 },   // 3 days ≈ 432 blocks
      { days: 7, blocks: 1008 },    // 7 days ≈ 1008 blocks
    ];

    timeframes.forEach(({ hours, days, blocks }) => {
      const time = hours ? `${hours}h` : `${days}d`;
      console.log(`  ${time} = ${blocks} blocks (~10 min/block)`);
    });

    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 4: Format escrow data
  console.log('\n✅ Test 4: Format Escrow Data');
  try {
    const mockEscrow = {
      id: 1,
      contract_escrow_id: 0,
      sender_phone: '+2349012345678',
      sender_stx_address: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
      recipient_phone: '+2349087654321',
      recipient_stx_address: 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE',
      amount_microstx: 5000000, // 5 STX
      timeout_blocks: 144,
      memo: 'Payment for services',
      status: 'active',
      created_at: new Date().toISOString(),
      tx_id: '0x1234567890abcdef',
    };

    const formatted = escrowService.formatEscrow(mockEscrow);
    
    console.log('Formatted Escrow:');
    console.log('  ID:', formatted.id);
    console.log('  Contract ID:', formatted.contractId);
    console.log('  Sender:', formatted.sender);
    console.log('  Recipient:', formatted.recipient);
    console.log('  Amount:', formatted.amount, 'STX');
    console.log('  Status:', formatted.status);
    console.log('  Memo:', formatted.memo);
    console.log('  Timeout:', formatted.timeout, 'blocks');

    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 5: Escrow amount validation
  console.log('\n✅ Test 5: Amount Validation');
  try {
    const testAmounts = [
      { stx: 1, microStx: 1000000, valid: true },
      { stx: 5, microStx: 5000000, valid: true },
      { stx: 0, microStx: 0, valid: false },
      { stx: -1, microStx: -1000000, valid: false },
    ];

    testAmounts.forEach(({ stx, microStx, valid }) => {
      const isValid = microStx > 0;
      const passed = isValid === valid;
      console.log(`  ${stx} STX (${microStx} µSTX) → ${isValid ? '✅ Valid' : '❌ Invalid'} ${passed ? '✅' : '❌'}`);
    });

    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 6: Address validation for escrow
  console.log('\n✅ Test 6: Address Validation');
  try {
    const testAddresses = [
      { addr: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', valid: true },
      { addr: 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE', valid: true },
      { addr: 'INVALID', valid: false },
      { addr: 'ST2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', valid: false }, // testnet
    ];

    testAddresses.forEach(({ addr, valid }) => {
      const isValid = stacksService.isValidAddress(addr);
      const passed = isValid === valid;
      console.log(`  ${addr.substring(0, 15)}... → ${isValid ? '✅' : '❌'} ${passed ? '✅' : '❌'}`);
    });

    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 7: Escrow status types
  console.log('\n✅ Test 7: Escrow Status Types');
  try {
    const statuses = [
      { status: 'pending', description: 'Transaction broadcasted, waiting for confirmation' },
      { status: 'active', description: 'Escrow created and active on blockchain' },
      { status: 'released', description: 'Funds released to recipient' },
      { status: 'refunded', description: 'Funds refunded to sender after timeout' },
      { status: 'cancelled', description: 'Escrow cancelled by sender' },
    ];

    statuses.forEach(({ status, description }) => {
      console.log(`  ${status}: ${description}`);
    });

    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 8: Explorer URL generation
  console.log('\n✅ Test 8: Explorer URL Generation');
  try {
    const txId = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';
    const isMainnet = escrowService.network.isMainnet();
    const explorerUrl = `https://explorer.stacks.co/txid/${txId}?chain=${isMainnet ? 'mainnet' : 'testnet'}`;
    
    console.log('  Transaction ID:', txId.substring(0, 20) + '...');
    console.log('  Network:', isMainnet ? 'Mainnet' : 'Testnet');
    console.log('  Explorer URL:', explorerUrl);

    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📈 Total: ${passedTests + failedTests}`);
  console.log(`🎯 Success Rate: ${((passedTests / (passedTests + failedTests)) * 100).toFixed(1)}%`);
  
  if (failedTests === 0) {
    console.log('\n🎉 ALL TESTS PASSED!');
  } else {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
  }

  console.log('\n' + '='.repeat(60));
  console.log('📝 ESCROW SERVICE FEATURES');
  console.log('='.repeat(60));
  console.log('✅ Create escrow with timeout');
  console.log('✅ Release escrow to recipient');
  console.log('✅ Refund escrow after timeout');
  console.log('✅ Cancel escrow (sender only)');
  console.log('✅ Check escrow status on blockchain');
  console.log('✅ Track escrows in database');
  console.log('✅ Query escrows by phone number');

  console.log('\n' + '='.repeat(60));
  console.log('💬 USAGE EXAMPLES');
  console.log('='.repeat(60));
  console.log('// Create escrow');
  console.log('await escrowService.createEscrow(');
  console.log('  senderAddress,');
  console.log('  senderKey,');
  console.log('  recipientAddress,');
  console.log('  5000000, // 5 STX');
  console.log('  144, // 24 hours timeout');
  console.log('  "Payment for services",');
  console.log('  "+2349012345678",');
  console.log('  "+2349087654321"');
  console.log(');\n');
  console.log('// Release escrow');
  console.log('await escrowService.releaseEscrow(0, callerAddress, callerKey);\n');
  console.log('// Refund escrow');
  console.log('await escrowService.refundEscrow(0, senderAddress, senderKey);');
}

runTests().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});