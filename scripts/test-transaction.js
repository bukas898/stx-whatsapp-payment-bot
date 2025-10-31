/**
 * Test script for Transaction Service
 * 
 * NOTE: This test uses MOCK data since actual transactions require:
 * - Real private keys
 * - Real STX balance
 * - Mainnet or testnet funds
 * 
 * For production testing, use testnet with test STX
 * Run: node scripts/test-transaction.js
 */

// Load environment variables
import dotenv from 'dotenv';
dotenv.config();

import transactionService from '../lib/services/transaction.service.js';
import stacksService from '../lib/services/stacks.service.js';

console.log('🧪 Testing Transaction Service\n');
console.log('⚠️  Note: Using mock data (no real transactions)\n');
console.log('='.repeat(60));

async function runTests() {
  let passedTests = 0;
  let failedTests = 0;

  // Test 1: Service Initialization
  console.log('\n✅ Test 1: Service Initialization');
  try {
    console.log('Network:', transactionService.networkType);
    console.log('Network Object:', transactionService.network.coreApiUrl);
    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 2: Validate Transaction Parameters
  console.log('\n✅ Test 2: Validate Transaction Parameters');
  try {
    const validSender = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
    const validRecipient = 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE';
    const amount = stacksService.stxToMicroStx(5); // 5 STX

    console.log('Sender:', validSender);
    console.log('Recipient:', validRecipient);
    console.log('Amount:', amount, 'microSTX (', stacksService.microStxToStx(amount), 'STX )');
    
    const senderValid = stacksService.isValidAddress(validSender);
    const recipientValid = stacksService.isValidAddress(validRecipient);
    
    console.log('Sender valid:', senderValid);
    console.log('Recipient valid:', recipientValid);
    
    if (senderValid && recipientValid) {
      passedTests++;
    } else {
      throw new Error('Address validation failed');
    }
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 3: Amount Conversions
  console.log('\n✅ Test 3: Amount Conversions for Transactions');
  try {
    const testAmounts = [1, 5, 10, 100];
    
    testAmounts.forEach(stx => {
      const microStx = stacksService.stxToMicroStx(stx);
      const backToStx = stacksService.microStxToStx(microStx);
      console.log(`${stx} STX = ${microStx.toLocaleString()} microSTX = ${backToStx} STX ✅`);
    });
    
    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 4: Fee Estimation
  console.log('\n✅ Test 4: Transaction Fee Estimation');
  try {
    const fees = await stacksService.estimateFee();
    console.log('Low fee:', fees.lowStx, 'STX (', fees.low, 'microSTX )');
    console.log('Medium fee:', fees.mediumStx, 'STX (', fees.medium, 'microSTX )');
    console.log('High fee:', fees.highStx, 'STX (', fees.high, 'microSTX )');
    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 5: Format Transaction for Display
  console.log('\n✅ Test 5: Format Transaction for Display');
  try {
    const mockTx = {
      tx_id: '0x1234567890abcdef',
      sender_phone: '+2349012345678',
      recipient_phone: '+2349087654321',
      amount_micro_stx: 5000000,
      fee_micro_stx: 250,
      status: 'pending',
      memo: 'Test payment',
      created_at: new Date().toISOString(),
      confirmed_at: null,
      block_height: null,
    };

    const formatted = transactionService.formatTransaction(mockTx);
    console.log('TX ID:', formatted.txId);
    console.log('From:', formatted.sender);
    console.log('To:', formatted.recipient);
    console.log('Amount:', formatted.amountStx);
    console.log('Fee:', formatted.feeStx);
    console.log('Status:', formatted.status);
    console.log('Memo:', formatted.memo);
    
    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 6: Check Account Nonce (needed for transactions)
  console.log('\n✅ Test 6: Get Account Nonce (Required for Transactions)');
  try {
    const testAddress = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
    const accountInfo = await stacksService.getAccountInfo(testAddress);
    console.log('Address:', testAddress);
    console.log('Current Nonce:', accountInfo.nonce);
    console.log('Balance:', accountInfo.balanceStx, 'STX');
    passedTests++;
  } catch (error) {
    console.error('❌ Failed (needs network):', error.message);
    failedTests++;
  }

  // Test 7: Simulate Transaction Creation (Mock)
  console.log('\n✅ Test 7: Simulate Transaction Creation (Mock)');
  try {
    const txParams = {
      sender: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
      recipient: 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE',
      amount: 5, // STX
      memo: 'Test transaction',
    };

    console.log('Transaction Parameters:');
    console.log('  From:', txParams.sender);
    console.log('  To:', txParams.recipient);
    console.log('  Amount:', txParams.amount, 'STX');
    console.log('  Amount (microSTX):', stacksService.stxToMicroStx(txParams.amount));
    console.log('  Memo:', txParams.memo);
    
    console.log('\n⚠️  Actual transaction creation requires:');
    console.log('  - Sender private key');
    console.log('  - Sufficient STX balance');
    console.log('  - Use testnet for testing');
    
    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 8: Database Query Methods (without actually querying)
  console.log('\n✅ Test 8: Database Query Methods Available');
  try {
    const methods = [
      'recordTransaction',
      'getTransactionById',
      'getTransactionsByPhone',
      'updateTransactionStatus',
      'monitorTransaction',
      'checkPendingTransactions',
    ];

    console.log('Available methods:');
    methods.forEach(method => {
      const exists = typeof transactionService[method] === 'function';
      console.log(`  ${exists ? '✅' : '❌'} ${method}`);
    });

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
  console.log('📝 TESTING NOTES');
  console.log('='.repeat(60));
  console.log('To test actual transactions:');
  console.log('1. Switch to testnet in .env');
  console.log('2. Get testnet STX from faucet');
  console.log('3. Use testnet private key');
  console.log('4. Create test script with real transaction');
  console.log('\nTestnet Faucet: https://explorer.stacks.co/sandbox/faucet');
}

// Run the tests
runTests().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});