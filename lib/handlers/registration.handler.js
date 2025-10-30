/**
 * Registration Handler (JavaScript)
 * Handles user registration flow with STX address validation
 */

import { userService } from '../services/user.service.js';
import { stateService } from '../services/state.service.js';
import { whatsappService } from '../services/whatsapp.service.js';
import { validateStxAddress, validatePhone } from '../utils/validator.js';

class RegistrationHandler {
  /**
   * Handle registration process for a user
   * @param {string} phoneNumber - User's phone number
   * @param {string} messageBody - User's message (potential STX address)
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  async handleRegistration(phoneNumber, messageBody) {
    try {
      // Validate phone number
      if (!validatePhone(phoneNumber)) {
        await whatsappService.sendErrorMessage(
          phoneNumber,
          'Invalid phone number format'
        );
        return {
          success: false,
          error: 'Invalid phone number',
        };
      }

      // Check if user is already registered
      const userExists = await userService.exists(phoneNumber);
      if (userExists) {
        await whatsappService.sendErrorMessage(
          phoneNumber,
          'You are already registered. Type "help" for available commands.'
        );
        return {
          success: false,
          error: 'User already registered',
        };
      }

      // Check if there's an active registration state
      const stateResult = await stateService.getState(phoneNumber);
      
      if (!stateResult.success) {
        // No active state - this is the start of registration
        return await this.startRegistration(phoneNumber);
      }

      // User has active registration state - expecting STX address
      return await this.completeRegistration(phoneNumber, messageBody);
    } catch (error) {
      console.error('Registration handler error:', error);
      await whatsappService.sendErrorMessage(
        phoneNumber,
        'Registration failed. Please try again.'
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Start registration process
   * @param {string} phoneNumber
   * @returns {Promise<{success: boolean}>}
   */
  async startRegistration(phoneNumber) {
    // Set registration state
    await stateService.setState(phoneNumber, 'registration', {
      step: 1,
      awaitingAddress: true,
      startedAt: new Date().toISOString(),
    });

    // Send registration prompt
    await whatsappService.sendRegistrationPrompt(phoneNumber);

    return {
      success: true,
      message: 'Registration started',
    };
  }

  /**
   * Complete registration with STX address
   * @param {string} phoneNumber
   * @param {string} stxAddress
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  async completeRegistration(phoneNumber, stxAddress) {
    // Clean up the address (remove whitespace)
    const cleanAddress = stxAddress.trim();

    // Validate STX address format
    const addressValidation = validateStxAddress(cleanAddress);
    if (!addressValidation.valid) {
      await whatsappService.sendErrorMessage(
        phoneNumber,
        `Invalid STX address: ${addressValidation.error}\n\nPlease send a valid Stacks address (starting with SP or ST).`
      );
      return {
        success: false,
        error: addressValidation.error,
      };
    }

    // Check if address is already registered
    const addressExists = await userService.addressExists(cleanAddress);
    if (addressExists) {
      await whatsappService.sendErrorMessage(
        phoneNumber,
        'This STX address is already registered to another account.'
      );
      await stateService.clearState(phoneNumber);
      return {
        success: false,
        error: 'Address already registered',
      };
    }

    // Create user in database
    const createResult = await userService.create({
      phoneNumber: phoneNumber,
      stxAddress: cleanAddress,
    });

    if (!createResult.success) {
      await whatsappService.sendErrorMessage(
        phoneNumber,
        'Registration failed. Please try again later.'
      );
      await stateService.clearState(phoneNumber);
      return {
        success: false,
        error: createResult.error,
      };
    }

    // Clear registration state
    await stateService.clearState(phoneNumber);

    // Send welcome message
    await whatsappService.sendWelcomeMessage(phoneNumber, cleanAddress);

    // Check for pending escrows for this phone number
    // (This will be implemented in Phase 3)
    // await this.checkPendingEscrows(phoneNumber);

    return {
      success: true,
      message: 'Registration completed successfully',
      user: createResult.user,
    };
  }

  /**
   * Handle registration initiation command
   * @param {string} phoneNumber
   * @returns {Promise<{success: boolean}>}
   */
  async initiateRegistration(phoneNumber) {
    // Check if already registered
    const userExists = await userService.exists(phoneNumber);
    if (userExists) {
      await whatsappService.sendErrorMessage(
        phoneNumber,
        'You are already registered. Type "help" for available commands.'
      );
      return {
        success: false,
        error: 'Already registered',
      };
    }

    return await this.startRegistration(phoneNumber);
  }

  /**
   * Cancel registration process
   * @param {string} phoneNumber
   * @returns {Promise<{success: boolean}>}
   */
  async cancelRegistration(phoneNumber) {
    const cleared = await stateService.clearState(phoneNumber);
    
    if (cleared.success) {
      await whatsappService.sendMessage(
        phoneNumber,
        'Registration cancelled. Type "register" to start again.'
      );
      return {
        success: true,
        message: 'Registration cancelled',
      };
    }

    return {
      success: false,
      error: 'No active registration to cancel',
    };
  }

  /**
   * Get registration status for a user
   * @param {string} phoneNumber
   * @returns {Promise<{registered: boolean, inProgress: boolean, state?: Object}>}
   */
  async getRegistrationStatus(phoneNumber) {
    const userExists = await userService.exists(phoneNumber);
    const stateResult = await stateService.getState(phoneNumber);

    return {
      registered: userExists,
      inProgress: stateResult.success && stateResult.state.stateType === 'registration',
      state: stateResult.success ? stateResult.state : null,
    };
  }

  /**
   * Check for pending escrows and notify user
   * (To be implemented in Phase 3)
   * @param {string} phoneNumber
   */
  async checkPendingEscrows(phoneNumber) {
    // TODO: Implement in Phase 3
    // Query escrows table for pending escrows sent to this phone number
    // Notify user about available claims
    console.log(`TODO: Check pending escrows for ${phoneNumber}`);
  }
}

// Export singleton instance
export const registrationHandler = new RegistrationHandler();
export default RegistrationHandler;