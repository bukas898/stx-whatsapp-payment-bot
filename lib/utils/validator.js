/**
 * Validator Utility (JavaScript)
 * Validation functions for phone numbers and STX addresses
 */

/**
 * Validate Nigerian phone number format
 * Required format: +234XXXXXXXXXX (exactly 14 characters)
 * @param {string} phone
 * @returns {boolean}
 */
export function validatePhone(phone) {
  if (!phone || typeof phone !== 'string') {
    return false;
  }

  // Strict Nigerian format: +234 followed by exactly 10 digits
  const phoneRegex = /^\+234\d{10}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate Stacks (STX) address format
 * Valid formats:
 * - Mainnet: SP + 39 alphanumeric characters (41 total)
 * - Testnet: ST + 39 alphanumeric characters (41 total)
 * @param {string} address
 * @returns {{valid: boolean, error?: string}}
 */
export function validateStxAddress(address) {
  if (!address || typeof address !== 'string') {
    return {
      valid: false,
      error: 'Address is required',
    };
  }

  // Remove whitespace
  const cleanAddress = address.trim();

  // Check length (must be exactly 41 characters)
  if (cleanAddress.length !== 41) {
    return {
      valid: false,
      error: `Address must be exactly 41 characters (got ${cleanAddress.length})`,
    };
  }

  // Check prefix (must start with SP or ST)
  if (!cleanAddress.startsWith('SP') && !cleanAddress.startsWith('ST')) {
    return {
      valid: false,
      error: 'Address must start with SP (mainnet) or ST (testnet)',
    };
  }

  // Check characters (alphanumeric only after prefix)
  const addressBody = cleanAddress.substring(2);
  const alphanumericRegex = /^[0-9A-Z]+$/;
  
  if (!alphanumericRegex.test(addressBody)) {
    return {
      valid: false,
      error: 'Address contains invalid characters (use only 0-9 and A-Z)',
    };
  }

  // Valid!
  return {
    valid: true,
  };
}

/**
 * Validate STX amount in microSTX
 * @param {number} amount - Amount in microSTX (1 STX = 1,000,000 microSTX)
 * @returns {{valid: boolean, error?: string}}
 */
export function validateAmount(amount) {
  if (typeof amount !== 'number') {
    return {
      valid: false,
      error: 'Amount must be a number',
    };
  }

  if (amount <= 0) {
    return {
      valid: false,
      error: 'Amount must be greater than 0',
    };
  }

  if (!Number.isInteger(amount)) {
    return {
      valid: false,
      error: 'Amount must be an integer (microSTX)',
    };
  }

  // Minimum: 0.000001 STX (1 microSTX)
  if (amount < 1) {
    return {
      valid: false,
      error: 'Amount is too small (minimum: 1 microSTX)',
    };
  }

  // Maximum: 1 billion STX (for safety)
  const maxAmount = 1_000_000_000_000_000; // 1 billion STX in microSTX
  if (amount > maxAmount) {
    return {
      valid: false,
      error: 'Amount is too large',
    };
  }

  return {
    valid: true,
  };
}

/**
 * Validate contact name
 * @param {string} name
 * @returns {{valid: boolean, error?: string}}
 */
export function validateContactName(name) {
  if (!name || typeof name !== 'string') {
    return {
      valid: false,
      error: 'Name is required',
    };
  }

  const cleanName = name.trim();

  if (cleanName.length === 0) {
    return {
      valid: false,
      error: 'Name cannot be empty',
    };
  }

  if (cleanName.length > 100) {
    return {
      valid: false,
      error: 'Name is too long (max 100 characters)',
    };
  }

  // Allow letters, numbers, spaces, and common punctuation
  const nameRegex = /^[a-zA-Z0-9\s\-_.]+$/;
  if (!nameRegex.test(cleanName)) {
    return {
      valid: false,
      error: 'Name contains invalid characters',
    };
  }

  return {
    valid: true,
  };
}

/**
 * Convert STX to microSTX
 * @param {number} stx - Amount in STX
 * @returns {number} Amount in microSTX
 */
export function stxToMicroStx(stx) {
  return Math.round(stx * 1_000_000);
}

/**
 * Convert microSTX to STX
 * @param {number} microStx - Amount in microSTX
 * @returns {number} Amount in STX
 */
export function microStxToStx(microStx) {
  return microStx / 1_000_000;
}

/**
 * Format STX amount for display
 * @param {number} microStx - Amount in microSTX
 * @returns {string} Formatted amount (e.g., "5.000000 STX")
 */
export function formatStxAmount(microStx) {
  const stx = microStxToStx(microStx);
  return `${stx.toFixed(6)} STX`;
}

// Default export
export default {
  validatePhone,
  validateStxAddress,
  validateAmount,
  validateContactName,
  stxToMicroStx,
  microStxToStx,
  formatStxAmount,
};