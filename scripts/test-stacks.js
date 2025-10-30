/**
 * Test script for Stacks Service
 * 
 * Tests all blockchain interactions with Hiro API
 * Run: node test-stacks.js
 */

import stacksService from '../lib/services/stacks.service.js';

// Test addresses (known addresses on Stacks mainnet)
const TEST_ADDRESS = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7'; // Example mainnet address
const TEST_TX_ID = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'; // Example tx

console.log('🧪 Testing Stacks Service\n');
console.log('=' .repeat(60));

async function runTests() {
  let passedTests = 0;
  let failedTests = 0;

  // Test 1: Network Info
  console.log('\n✅ Test 1: Get Network Info');
  try {
    const networkInfo = stacksService.getNetworkInfo();
    console.log('Network:', networkInfo.network);
    console.log('API URL:', networkInfo.apiUrl);
    console.log('Is Mainnet:', networkInfo.isMainnet);
    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 2: Address Validation
  console.log('\n✅ Test 2: Validate Stacks Addresses');
  try {
    const validMainnet = stacksService.isValidAddress('SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
    const invalidAddress = stacksService.isValidAddress('INVALID123');
    const testnetAddress = stacksService.isValidAddress('ST2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7');
    
    console.log('Valid mainnet address (SP...):', validMainnet);
    console.log('Invalid address:', invalidAddress);
    console.log('Testnet address on mainnet:', testnetAddress);
    
    if (validMainnet && !invalidAddress) {
      passedTests++;
    } else {
      throw new Error('Address validation failed');
    }
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 3: STX Conversion
  console.log('\n✅ Test 3: STX/MicroSTX Conversion');
  try {
    const microStx = 5000000; // 5 STX
    const stx = stacksService.microStxToStx(microStx);
    const backToMicro = stacksService.stxToMicroStx(stx);
    const formatted = stacksService.formatStxAmount(microStx);
    
    console.log('5,000,000 microSTX =', stx, 'STX');
    console.log('5 STX =', backToMicro, 'microSTX');
    console.log('Formatted:', formatted);
    
    if (stx === 5 && backToMicro === 5000000) {
      passedTests++;
    } else {
      throw new Error('Conversion failed');
    }
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 4: Fee Estimation
  console.log('\n✅ Test 4: Estimate Transaction Fees');
  try {
    const fees = await stacksService.estimateFee();
    console.log('Low fee:', fees.lowStx, 'STX');
    console.log('Medium fee:', fees.mediumStx, 'STX');
    console.log('High fee:', fees.highStx, 'STX');
    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 5: Current Block Height
  console.log('\n✅ Test 5: Get Current Block Height');
  try {
    const blockHeight = await stacksService.getCurrentBlockHeight();
    console.log('Current block height:', blockHeight);
    if (blockHeight > 0) {
      passedTests++;
    } else {
      throw new Error('Invalid block height');
    }
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 6: Get Balance (using a known address)
  console.log('\n✅ Test 6: Get STX Balance');
  console.log('Testing with address:', TEST_ADDRESS);
  try {
    const balance = await stacksService.getBalance(TEST_ADDRESS);
    console.log('Balance (STX):', balance.stx.balanceStx);
    console.log('Balance (microSTX):', balance.stx.balance);
    console.log('Total Received:', balance.stx.totalReceived);
    console.log('Total Sent:', balance.stx.totalSent);
    console.log('Locked:', balance.stx.lockedStx, 'STX');
    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    console.error('Note: This may fail if the test address is invalid or API is down');
    failedTests++;
  }

  // Test 7: Get Account Info
  console.log('\n✅ Test 7: Get Account Info');
  try {
    const accountInfo = await stacksService.getAccountInfo(TEST_ADDRESS);
    console.log('Address:', accountInfo.address);
    console.log('Balance:', accountInfo.balanceStx, 'STX');
    console.log('Nonce:', accountInfo.nonce);
    console.log('Locked:', accountInfo.lockedStx, 'STX');
    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 8: Get Transaction History
  console.log('\n✅ Test 8: Get Transaction History');
  try {
    const history = await stacksService.getTransactionHistory(TEST_ADDRESS, 5);
    console.log('Total transactions:', history.total);
    console.log('Showing recent', history.results.length, 'transactions:');
    
    history.results.slice(0, 3).forEach((tx, i) => {
      console.log(`\n  Transaction ${i + 1}:`);
      console.log('  - TX ID:', tx.txId);
      console.log('  - Type:', tx.txType);
      console.log('  - Status:', tx.txStatus);
      console.log('  - Fee:', tx.feeStx, 'STX');
      if (tx.transfer) {
        console.log('  - Amount:', tx.transfer.amountStx, 'STX');
        console.log('  - To:', tx.transfer.recipient);
      }
    });
    
    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 9: Get Transaction (will likely fail with example tx)
  console.log('\n✅ Test 9: Get Transaction Details');
  console.log('Note: This test will fail with example TX ID');
  try {
    // Try to get a real transaction from the history
    const history = await stacksService.getTransactionHistory(TEST_ADDRESS, 1);
    if (history.results.length > 0) {
      const realTxId = history.results[0].txId;
      const tx = await stacksService.getTransaction(realTxId);
      console.log('Transaction ID:', tx.txId);
      console.log('Status:', tx.txStatus);
      console.log('Block Height:', tx.blockHeight);
      console.log('Fee:', tx.feeStx, 'STX');
      if (tx.stxTransfer) {
        console.log('Transfer Amount:', tx.stxTransfer.amountStx, 'STX');
        console.log('Recipient:', tx.stxTransfer.recipient);
      }
      passedTests++;
    } else {
      console.log('⚠️  No transactions found to test with');
      passedTests++;
    }
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 10: Get Transaction Status
  console.log('\n✅ Test 10: Get Transaction Status');
  try {
    const history = await stacksService.getTransactionHistory(TEST_ADDRESS, 1);
    if (history.results.length > 0) {
      const realTxId = history.results[0].txId;
      const status = await stacksService.getTransactionStatus(realTxId);
      console.log('Transaction ID:', status.txId);
      console.log('Status:', status.status);
      console.log('Confirmed:', status.confirmed);
      console.log('Pending:', status.pending);
      console.log('Failed:', status.failed);
      passedTests++;
    } else {
      console.log('⚠️  No transactions found to test with');
      passedTests++;
    }
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
}

// Run the tests
runTests().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});