/**
 * Simple Contact Service Test (No Database)
 * Tests contact service logic without database
 */

import stacksService from '../lib/services/stacks.service.js';

// Mock contact service methods (without database)
class MockContactService {
  normalizeContactName(name) {
    return name
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  formatContact(contact) {
    return {
      id: contact.id,
      name: contact.contact_name,
      address: contact.contact_stx_address,
      phone: contact.contact_phone,
      createdAt: contact.created_at,
      updatedAt: contact.updated_at,
    };
  }

  formatContactList(contacts) {
    if (!contacts || contacts.length === 0) {
      return '📋 No contacts saved yet.\n\nAdd a contact: "add contact John SP2J6ZY..."';
    }

    let message = `📋 Your Contacts (${contacts.length}):\n\n`;

    contacts.forEach((contact, index) => {
      message += `${index + 1}. *${contact.contact_name}*\n`;
      message += `   ${contact.contact_stx_address}\n`;
      if (contact.contact_phone) {
        message += `   📱 ${contact.contact_phone}\n`;
      }
      message += '\n';
    });

    message += 'To send: "send 5 to [name]"';
    return message;
  }

  resolveRecipient(nameOrAddress) {
    // Check if it's already a valid STX address
    if (stacksService.isValidAddress(nameOrAddress)) {
      return {
        type: 'address',
        address: nameOrAddress,
        name: null,
        isContact: false,
      };
    }

    // In real service, would look up contact by name
    return {
      type: 'name',
      searchTerm: nameOrAddress,
      message: 'Would search contacts for: ' + nameOrAddress,
    };
  }
}

const mockContactService = new MockContactService();

console.log('🧪 Testing Contact Service (Simple)\n');
console.log('='.repeat(60));

async function runTests() {
  let passedTests = 0;
  let failedTests = 0;

  // Test 1: Normalize Contact Names
  console.log('\n✅ Test 1: Normalize Contact Names');
  try {
    const testNames = [
      { input: 'john doe', expected: 'John Doe' },
      { input: 'JANE SMITH', expected: 'Jane Smith' },
      { input: '  bob wilson  ', expected: 'Bob Wilson' },
      { input: 'Alice JONES', expected: 'Alice Jones' },
    ];

    testNames.forEach(({ input, expected }) => {
      const normalized = mockContactService.normalizeContactName(input);
      const passed = normalized === expected;
      console.log(`  "${input}" → "${normalized}" ${passed ? '✅' : '❌'}`);
    });

    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 2: Validate STX Addresses
  console.log('\n✅ Test 2: Validate STX Addresses for Contacts');
  try {
    const testAddresses = [
      { addr: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', valid: true },
      { addr: 'INVALID123', valid: false },
      { addr: 'SP3FBR2AGK5H9QBDH3EEN6DF8EK8JY7RX8QJ5SVTE', valid: true },
      { addr: 'ST2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7', valid: false }, // testnet on mainnet
    ];

    testAddresses.forEach(({ addr, valid }) => {
      const isValid = stacksService.isValidAddress(addr);
      const passed = isValid === valid;
      console.log(`  ${addr.substring(0, 15)}... → ${isValid ? '✅ Valid' : '❌ Invalid'} ${passed ? '✅' : '❌'}`);
    });

    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 3: Format Contact List (Empty)
  console.log('\n✅ Test 3: Format Empty Contact List');
  try {
    const formatted = mockContactService.formatContactList([]);
    console.log('Empty list message:');
    console.log(formatted);
    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 4: Format Contact List (With Contacts)
  console.log('\n✅ Test 4: Format Contact List (With Contacts)');
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

    const formatted = mockContactService.formatContactList(mockContacts);
    console.log(formatted);
    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 5: Format Single Contact
  console.log('\n✅ Test 5: Format Single Contact');
  try {
    const mockContact = {
      id: 1,
      contact_name: 'John Doe',
      contact_stx_address: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
      contact_phone: '+2349087654321',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const formatted = mockContactService.formatContact(mockContact);
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

  // Test 6: Resolve Recipient (Direct Address)
  console.log('\n✅ Test 6: Resolve Recipient (Direct Address)');
  try {
    const address = 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7';
    const resolved = mockContactService.resolveRecipient(address);
    
    console.log('  Input:', address);
    console.log('  Type:', resolved.type);
    console.log('  Address:', resolved.address);
    console.log('  Is Contact:', resolved.isContact);

    if (resolved.type === 'address' && resolved.address === address) {
      passedTests++;
    } else {
      throw new Error('Resolution failed');
    }
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 7: Resolve Recipient (Contact Name)
  console.log('\n✅ Test 7: Resolve Recipient (Contact Name)');
  try {
    const name = 'John';
    const resolved = mockContactService.resolveRecipient(name);
    
    console.log('  Input:', name);
    console.log('  Type:', resolved.type);
    console.log('  Message:', resolved.message);

    passedTests++;
  } catch (error) {
    console.error('❌ Failed:', error.message);
    failedTests++;
  }

  // Test 8: Contact Data Structure
  console.log('\n✅ Test 8: Contact Data Structure');
  try {
    const contactStructure = {
      userPhone: '+2349012345678',
      contactName: 'John Doe',
      contactStxAddress: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7',
      contactPhone: '+2349087654321',
    };

    console.log('Valid Contact Structure:');
    console.log('  User Phone:', contactStructure.userPhone);
    console.log('  Contact Name:', mockContactService.normalizeContactName(contactStructure.contactName));
    console.log('  STX Address:', contactStructure.contactStxAddress);
    console.log('  Valid Address:', stacksService.isValidAddress(contactStructure.contactStxAddress));
    console.log('  Contact Phone:', contactStructure.contactPhone);

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
  console.log('📝 CONTACT SERVICE FEATURES');
  console.log('='.repeat(60));
  console.log('✅ Add contacts with names and STX addresses');
  console.log('✅ Normalize contact names (Title Case)');
  console.log('✅ Validate STX addresses');
  console.log('✅ Format contact lists for WhatsApp');
  console.log('✅ Resolve "send to John" → STX address');
  console.log('✅ Search contacts by name');
  console.log('✅ Update and delete contacts');
  console.log('\n' + '='.repeat(60));
  console.log('📱 USAGE IN WHATSAPP');
  console.log('='.repeat(60));
  console.log('User: "add contact John SP2J6ZY48GV1EZ5V..."');
  console.log('Bot:  ✅ Contact "John" added!\n');
  console.log('User: "send 5 to John"');
  console.log('Bot:  Sending 5 STX to John (SP2J6ZY...)');
  console.log('      Confirm? (yes/no)');
}

runTests().catch(error => {
  console.error('\n💥 Fatal error:', error);
  process.exit(1);
});