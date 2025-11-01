/**
 * Contact Service
 * 
 * Manages user contacts for easy payments:
 * - Add contacts with names and STX addresses
 * - List user's contacts
 * - Get contact by name
 * - Update contact details
 * - Delete contacts
 * - Search contacts
 */

import databaseService from './database.service.js';
import stacksService from './stacks.service.js';

class ContactService {
  /**
   * Add a new contact for a user
   * @param {string} userPhone - User's phone number
   * @param {string} contactName - Contact's display name
   * @param {string} contactStxAddress - Contact's STX address
   * @param {string} contactPhone - Optional contact's phone number
   * @returns {Promise<Object>} Created contact
   */
  async addContact(userPhone, contactName, contactStxAddress, contactPhone = null) {
    try {
      // Validate inputs
      if (!userPhone || !contactName || !contactStxAddress) {
        throw new Error('Missing required fields: userPhone, contactName, or contactStxAddress');
      }

      // Validate STX address
      if (!stacksService.isValidAddress(contactStxAddress)) {
        throw new Error('Invalid STX address');
      }

      // Normalize contact name (trim and title case)
      const normalizedName = this.normalizeContactName(contactName);

      // Check if contact name already exists for this user
      const existing = await this.getContactByName(userPhone, normalizedName);
      if (existing) {
        throw new Error(`Contact with name "${normalizedName}" already exists`);
      }

      // Insert contact
      const { data, error } = await databaseService.client
        .from('contacts')
        .insert([
          {
            user_phone: userPhone,
            contact_name: normalizedName,
            contact_stx_address: contactStxAddress,
            contact_phone: contactPhone,
            created_at: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error adding contact:', error);
      throw new Error(`Failed to add contact: ${error.message}`);
    }
  }

  /**
   * Get all contacts for a user
   * @param {string} userPhone - User's phone number
   * @returns {Promise<Array>} List of contacts
   */
  async getContacts(userPhone) {
    try {
      const { data, error } = await databaseService.client
        .from('contacts')
        .select('*')
        .eq('user_phone', userPhone)
        .order('contact_name', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting contacts:', error);
      throw new Error(`Failed to get contacts: ${error.message}`);
    }
  }

  /**
   * Get a specific contact by name
   * @param {string} userPhone - User's phone number
   * @param {string} contactName - Contact's name
   * @returns {Promise<Object|null>} Contact or null if not found
   */
  async getContactByName(userPhone, contactName) {
    try {
      const normalizedName = this.normalizeContactName(contactName);

      const { data, error } = await databaseService.client
        .from('contacts')
        .select('*')
        .eq('user_phone', userPhone)
        .ilike('contact_name', normalizedName)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting contact by name:', error);
      throw new Error(`Failed to get contact: ${error.message}`);
    }
  }

  /**
   * Get a contact by ID
   * @param {number} contactId - Contact ID
   * @returns {Promise<Object|null>} Contact or null
   */
  async getContactById(contactId) {
    try {
      const { data, error } = await databaseService.client
        .from('contacts')
        .select('*')
        .eq('id', contactId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error getting contact by ID:', error);
      throw new Error(`Failed to get contact: ${error.message}`);
    }
  }

  /**
   * Search contacts by name (partial match)
   * @param {string} userPhone - User's phone number
   * @param {string} searchTerm - Search term
   * @returns {Promise<Array>} Matching contacts
   */
  async searchContacts(userPhone, searchTerm) {
    try {
      const { data, error } = await databaseService.client
        .from('contacts')
        .select('*')
        .eq('user_phone', userPhone)
        .ilike('contact_name', `%${searchTerm}%`)
        .order('contact_name', { ascending: true });

      if (error) {
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error searching contacts:', error);
      throw new Error(`Failed to search contacts: ${error.message}`);
    }
  }

  /**
   * Update contact details
   * @param {number} contactId - Contact ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated contact
   */
  async updateContact(contactId, updates) {
    try {
      // Validate STX address if being updated
      if (updates.contact_stx_address) {
        if (!stacksService.isValidAddress(updates.contact_stx_address)) {
          throw new Error('Invalid STX address');
        }
      }

      // Normalize contact name if being updated
      if (updates.contact_name) {
        updates.contact_name = this.normalizeContactName(updates.contact_name);
      }

      updates.updated_at = new Date().toISOString();

      const { data, error } = await databaseService.client
        .from('contacts')
        .update(updates)
        .eq('id', contactId)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error updating contact:', error);
      throw new Error(`Failed to update contact: ${error.message}`);
    }
  }

  /**
   * Delete a contact
   * @param {number} contactId - Contact ID
   * @returns {Promise<boolean>} Success status
   */
  async deleteContact(contactId) {
    try {
      const { error } = await databaseService.client
        .from('contacts')
        .delete()
        .eq('id', contactId);

      if (error) {
        throw error;
      }

      return true;
    } catch (error) {
      console.error('Error deleting contact:', error);
      throw new Error(`Failed to delete contact: ${error.message}`);
    }
  }

  /**
   * Delete a contact by name
   * @param {string} userPhone - User's phone number
   * @param {string} contactName - Contact's name
   * @returns {Promise<boolean>} Success status
   */
  async deleteContactByName(userPhone, contactName) {
    try {
      const contact = await this.getContactByName(userPhone, contactName);
      if (!contact) {
        throw new Error(`Contact "${contactName}" not found`);
      }

      return await this.deleteContact(contact.id);
    } catch (error) {
      console.error('Error deleting contact by name:', error);
      throw new Error(`Failed to delete contact: ${error.message}`);
    }
  }

  /**
   * Check if a contact name exists for a user
   * @param {string} userPhone - User's phone number
   * @param {string} contactName - Contact name to check
   * @returns {Promise<boolean>} True if exists
   */
  async contactExists(userPhone, contactName) {
    try {
      const contact = await this.getContactByName(userPhone, contactName);
      return contact !== null;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get contact count for a user
   * @param {string} userPhone - User's phone number
   * @returns {Promise<number>} Number of contacts
   */
  async getContactCount(userPhone) {
    try {
      const { count, error } = await databaseService.client
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('user_phone', userPhone);

      if (error) {
        throw error;
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting contact count:', error);
      throw new Error(`Failed to get contact count: ${error.message}`);
    }
  }

  /**
   * Resolve a name to an STX address
   * This is the main function used for payments: "send 5 to John"
   * @param {string} userPhone - User's phone number
   * @param {string} nameOrAddress - Contact name or STX address
   * @returns {Promise<Object>} Resolved contact info
   */
  async resolveRecipient(userPhone, nameOrAddress) {
    try {
      // Check if it's already a valid STX address
      if (stacksService.isValidAddress(nameOrAddress)) {
        return {
          type: 'address',
          address: nameOrAddress,
          name: null,
          isContact: false,
        };
      }

      // Try to find as contact name
      const contact = await this.getContactByName(userPhone, nameOrAddress);
      if (contact) {
        return {
          type: 'contact',
          address: contact.contact_stx_address,
          name: contact.contact_name,
          phone: contact.contact_phone,
          isContact: true,
          contactId: contact.id,
        };
      }

      // Not found
      throw new Error(`Recipient "${nameOrAddress}" not found. Add them as a contact or use their STX address.`);
    } catch (error) {
      console.error('Error resolving recipient:', error);
      throw error;
    }
  }

  /**
   * Format contact for display
   * @param {Object} contact - Contact from database
   * @returns {Object} Formatted contact
   */
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

  /**
   * Format contact list for display
   * @param {Array} contacts - Contacts from database
   * @returns {string} Formatted text list
   */
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

  /**
   * Normalize contact name (trim, title case)
   * @param {string} name - Contact name
   * @returns {string} Normalized name
   */
  normalizeContactName(name) {
    return name
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Bulk import contacts
   * @param {string} userPhone - User's phone number
   * @param {Array} contacts - Array of {name, address, phone?}
   * @returns {Promise<Object>} Import results
   */
  async bulkImportContacts(userPhone, contacts) {
    const results = {
      success: [],
      failed: [],
      total: contacts.length,
    };

    for (const contact of contacts) {
      try {
        const added = await this.addContact(
          userPhone,
          contact.name,
          contact.address,
          contact.phone
        );
        results.success.push(added);
      } catch (error) {
        results.failed.push({
          contact,
          error: error.message,
        });
      }
    }

    return results;
  }

  /**
   * Export all contacts for a user
   * @param {string} userPhone - User's phone number
   * @returns {Promise<Array>} Contacts in exportable format
   */
  async exportContacts(userPhone) {
    try {
      const contacts = await this.getContacts(userPhone);
      
      return contacts.map(c => ({
        name: c.contact_name,
        address: c.contact_stx_address,
        phone: c.contact_phone,
        created: c.created_at,
      }));
    } catch (error) {
      console.error('Error exporting contacts:', error);
      throw new Error(`Failed to export contacts: ${error.message}`);
    }
  }
}

// Export singleton instance
const contactService = new ContactService();
export default contactService;