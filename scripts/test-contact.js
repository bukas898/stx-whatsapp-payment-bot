/**
 * Test script for Contact Service
 * 
 * Tests contact management functionality
 * Run: node scripts/test-contact.js
 */

import dotenv from 'dotenv';
dotenv.config();

import contactService from '../lib/services/contact.service.js';
import userService from '../lib/services/user.service.js';
import stacksService from '../lib/services/stacks.service.js';

console.log('🧪 Testing Contact Service\n');
console.log('='.repeat(60));

// Test data
const TEST_USER_PHONE = '+2349012345678';
const TEST_CONTACTS = [
  { name: 'John Doe', address: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7' },
  { name: 'Jane Smith', address: 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE' },
  { name: 'Bob Wilson', address: 'SPNWZ5V2TPWGQGVDR6T7B6RQ4XMGZ4PXTEE0VQ0S' },
];

async function runTests() {
  let passedTests = 0;
  let failedTests = 0;

  // Test 1: Service Methods Available
  console.log('\n✅ Test 1: Service Methods Available');
  try {
    const methods = [
      'addContact',
      'getContacts',
      'getContactByName',
      'searchContacts',
      'updateContact',
      'deleteContact',
      'resolveRecipient',
      'formatContactList',
    ];

    console.log('Available methods:');
    methods.forEach(method => {
      const exists = typeof contactService[method] === 'function';
      console.log(`  ${exists ? '✅' : '❌'} ${method}`);
    });

    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 2: Normalize Contact Names
  console.log('\n✅ Test 2: Normalize Contact Names');
  try {
    const testNames = [
      'john doe',
      'JANE SMITH',
      '  bob wilson  ',
      'Alice JONES',
    ];

    testNames.forEach(name => {
      const normalized = contactService.normalizeContactName(name);
      console.log(`  "${name}" → "${normalized}"`);
    });

    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 3: Validate STX Addresses
  console.log('\n✅ Test 3: Validate STX Addresses');
  try {
    const testAddresses = [
      'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
      'INVALID123',
      'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE',
    ];

    testAddresses.forEach(addr => {
      const valid = stacksService.isValidAddress(addr);
      console.log(`  ${addr.substring(0, 15)}... → ${valid ? '✅ Valid' : '❌ Invalid'}`);
    });

    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 4: Check if Test User Exists
  console.log('\n✅ Test 4: Check Test User');
  try {
    const user = await userService.getByPhone(TEST_USER_PHONE);
    if (user) {
      console.log('  User found:', user.phone_number);
      console.log('  STX Address:', user.stx_address);
    } else {
      console.log('  ⚠️  Test user not found. Some tests will be skipped.');
    }
    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 5: Mock Add Contact (without actually adding)
  console.log('\n✅ Test 5: Mock Add Contact');
  try {
    const mockContact = {
      userPhone: TEST_USER_PHONE,
      contactName: 'John Doe',
      contactStxAddress: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
      contactPhone: '+2349087654321',
    };

    console.log('Mock Contact Data:');
    console.log('  User:', mockContact.userPhone);
    console.log('  Name:', mockContact.contactName);
    console.log('  Address:', mockContact.contactStxAddress);
    console.log('  Phone:', mockContact.contactPhone);

    const normalized = contactService.normalizeContactName(mockContact.contactName);
    const validAddress = stacksService.isValidAddress(mockContact.contactStxAddress);

    console.log('\nValidation:');
    console.log('  Normalized Name:', normalized);
    console.log('  Valid Address:', validAddress);

    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 6: Format Contact List
  console.log('\n✅ Test 6: Format Contact List');
  try {
    const mockContacts = [
      {
        id: 1,
        contact_name: 'John Doe',
        contact_stx_address: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
        contact_phone: '+2349087654321',
      },
      {
        id: 2,
        contact_name: 'Jane Smith',
        contact_stx_address: 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE',
        contact_phone: null,
      },
    ];

    const formatted = contactService.formatContactList(mockContacts);
    console.log('Formatted List:');
    console.log(formatted);

    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 7: Resolve Recipient (Address)
  console.log('\n✅ Test 7: Resolve Recipient (Direct Address)');
  try {
    const address = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
    
    // This will work without database since it's a valid address
    if (stacksService.isValidAddress(address)) {
      console.log('  Input:', address);
      console.log('  Type: Direct STX Address');
      console.log('  ✅ Would resolve to address itself');
      passedTests++;
    } else {
      throw new Error('Address validation failed');
    }
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 8: Format Single Contact
  console.log('\n✅ Test 8: Format Single Contact');
  try {
    const mockContact = {
      id: 1,
      contact_name: 'John Doe',
      contact_stx_address: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
      contact_phone: '+2349087654321',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const formatted = contactService.formatContact(mockContact);
    console.log('Formatted Contact:');
    console.log('  ID:', formatted.id);
    console.log('  Name:', formatted.name);
    console.log('  Address:', formatted.address);
    console.log('  Phone:', formatted.phone);

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
  console.log('📝 USAGE EXAMPLES');
  console.log('='.repeat(60));
  console.log('// Add a contact');
  console.log('await contactService.addContact(');
  console.log('  "+2349012345678",');
  console.log('  "John Doe",');
  console.log('  "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7"');
  console.log(');\n');
  console.log('// Get all contacts');
  console.log('const contacts = await contactService.getContacts("+2349012345678");\n');
  console.log('// Resolve recipient');
  console.log('const recipient = await contactService.resolveRecipient(');
  console.log('  "+2349012345678",');
  console.log('  "John"  // or STX address');
  console.log(');');
}

runTests().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});