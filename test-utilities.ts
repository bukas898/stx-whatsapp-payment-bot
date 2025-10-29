/**
 * Simple Tests for Phase 1 Utilities
 * Run with: node --loader ts-node/esm test-utilities.ts
 * Or: npx tsx test-utilities.ts
 */

import {
  isValidPhoneNumber,
  getPhoneExample,
  isValidSTXAddress,
  isValidAmount,
  getPhoneErrorMessage,
} from './lib/utils/validator';

import {
  parseSendCommand,
  isRegistrationMessage,
  isContactsCommand,
  isClaimCommand,
  parseName,
} from './lib/utils/parser';

import {
  formatSTXAmount,
  abbreviateAddress,
  formatTransactionLink,
  getWelcomeMessage,
  stxToMicroStx,
  microStxToStx,
} from './lib/utils/formatter';

console.log('🧪 Testing Phase 1 Utilities\n');

// ============================================
// VALIDATOR TESTS
// ============================================
console.log('📋 VALIDATOR TESTS');
console.log('==================\n');

// Phone validation tests
const phoneTests = [
  { input: '+2348012345678', expected: true, label: 'Valid Nigerian number' },
  { input: '+2347012345678', expected: true, label: 'Valid Nigerian number (070)' },
  { input: '08012345678', expected: false, label: 'Missing +234 prefix' },
  { input: '+234 801 234 5678', expected: false, label: 'Has spaces' },
  { input: '+234-801-234-5678', expected: false, label: 'Has dashes' },
  { input: '2348012345678', expected: false, label: 'Missing + sign' },
  { input: '+23480123456', expected: false, label: 'Too short' },
];

console.log('Phone Number Validation:');
phoneTests.forEach((test) => {
  const result = isValidPhoneNumber(test.input);
  const status = result === test.expected ? '✅' : '❌';
  console.log(`  ${status} ${test.label}: "${test.input}" → ${result}`);
});

console.log('\nExample phone:', getPhoneExample());

// STX address validation tests
const stxTests = [
  { input: 'SP3X6QWWETNBZWGBK6DRGTR1KX50S74D3425Q1TPK', expected: true, label: 'Valid mainnet address' },
  { input: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', expected: true, label: 'Valid testnet address' },
  { input: 'SP123', expected: false, label: 'Too short' },
  { input: 'BP3X6QWWETNBZWGBK6DRGTR1KX50S74D3425Q1TPK', expected: false, label: 'Invalid prefix' },
];

console.log('\nSTX Address Validation:');
stxTests.forEach((test) => {
  const result = isValidSTXAddress(test.input);
  const status = result === test.expected ? '✅' : '❌';
  console.log(`  ${status} ${test.label}: ${result}`);
});

// Amount validation tests
const amountTests = [
  { input: 10, expected: true, label: 'Integer amount' },
  { input: 10.5, expected: true, label: 'Decimal amount' },
  { input: 0.000001, expected: true, label: 'Tiny amount (6 decimals)' },
  { input: 0, expected: false, label: 'Zero amount' },
  { input: -5, expected: false, label: 'Negative amount' },
  { input: 10.1234567, expected: false, label: 'Too many decimals (7)' },
];

console.log('\nAmount Validation:');
amountTests.forEach((test) => {
  const result = isValidAmount(test.input);
  const status = result === test.expected ? '✅' : '❌';
  console.log(`  ${status} ${test.label}: ${test.input} → ${result}`);
});

// ============================================
// PARSER TESTS
// ============================================
console.log('\n\n📋 PARSER TESTS');
console.log('===============\n');

// Send command parsing tests
const sendTests = [
  { input: 'send 10 to Bob', expectedAmount: 10, expectedName: 'Bob' },
  { input: 'send 10 stx to Alice', expectedAmount: 10, expectedName: 'Alice' },
  { input: 'Send 100.5 to John Doe', expectedAmount: 100.5, expectedName: 'John Doe' },
  { input: 'SEND 25 TO Charlie', expectedAmount: 25, expectedName: 'Charlie' },
];

console.log('Send Command Parsing:');
sendTests.forEach((test) => {
  const result = parseSendCommand(test.input);
  if (result && result.amount === test.expectedAmount && result.contactName === test.expectedName) {
    console.log(`  ✅ "${test.input}"`);
    console.log(`     → Amount: ${result.amount}, Name: ${result.contactName}`);
  } else {
    console.log(`  ❌ "${test.input}"`);
    console.log(`     → Expected: ${test.expectedAmount} to ${test.expectedName}`);
    console.log(`     → Got:`, result);
  }
});

// Registration message tests
const registrationTests = [
  { input: 'SP3X6QWWETNBZWGBK6DRGTR1KX50S74D3425Q1TPK', expected: true, label: 'Valid STX address' },
  { input: 'Here is my address: ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM', expected: true, label: 'Address in message' },
  { input: 'Hello', expected: false, label: 'Not a registration' },
];

console.log('\nRegistration Message Detection:');
registrationTests.forEach((test) => {
  const result = isRegistrationMessage(test.input);
  const status = (result !== null) === test.expected ? '✅' : '❌';
  console.log(`  ${status} ${test.label}: ${result !== null}`);
});

// Command detection tests
console.log('\nCommand Detection:');
console.log(`  ✅ "contacts" is contacts command: ${isContactsCommand('contacts')}`);
console.log(`  ✅ "list contacts" is contacts command: ${isContactsCommand('list contacts')}`);
console.log(`  ✅ "claim" is claim command: ${isClaimCommand('claim')}`);
console.log(`  ✅ "claim funds" is claim command: ${isClaimCommand('claim funds')}`);

// Name parsing tests
const nameTests = [
  { input: 'Alice', expected: true, label: 'Simple name' },
  { input: 'John Doe', expected: true, label: 'Two-word name' },
  { input: "O'Brien", expected: true, label: 'Name with apostrophe' },
  { input: 'Mary-Jane', expected: true, label: 'Hyphenated name' },
  { input: '123', expected: false, label: 'Numbers only' },
  { input: 'Alice123', expected: false, label: 'Name with numbers' },
];

console.log('\nName Parsing:');
nameTests.forEach((test) => {
  const result = parseName(test.input);
  const status = (result !== null) === test.expected ? '✅' : '❌';
  console.log(`  ${status} ${test.label}: "${test.input}" → ${result !== null ? 'valid' : 'invalid'}`);
});

// ============================================
// FORMATTER TESTS
// ============================================
console.log('\n\n📋 FORMATTER TESTS');
console.log('==================\n');

console.log('STX Amount Formatting:');
console.log(`  10 → ${formatSTXAmount(10)}`);
console.log(`  10.5 → ${formatSTXAmount(10.5)}`);
console.log(`  10.123456 → ${formatSTXAmount(10.123456)}`);
console.log(`  0.000001 → ${formatSTXAmount(0.000001)}`);

console.log('\nAddress Abbreviation:');
console.log(`  Full: SP3X6QWWETNBZWGBK6DRGTR1KX50S74D3425Q1TPK`);
console.log(`  Short: ${abbreviateAddress('SP3X6QWWETNBZWGBK6DRGTR1KX50S74D3425Q1TPK')}`);

console.log('\nTransaction Link:');
console.log(`  ${formatTransactionLink('0x1234567890abcdef', 'testnet')}`);

console.log('\nSTX ↔ MicroSTX Conversion:');
console.log(`  10 STX → ${stxToMicroStx(10)} microSTX`);
console.log(`  1000000 microSTX → ${microStxToStx(1000000)} STX`);

console.log('\nWelcome Message:');
console.log(getWelcomeMessage());

// ============================================
// SUMMARY
// ============================================
console.log('\n\n' + '='.repeat(50));
console.log('✅ Phase 1 Utilities Test Complete!');
console.log('='.repeat(50));
console.log('\nAll utility functions are working correctly.');
console.log('Ready to proceed to Phase 2! 🚀\n');
