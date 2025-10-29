/**
 * Validator Utility
 * Handles validation for phone numbers, STX addresses, and amounts
 */

/**
 * Validates Nigerian phone numbers in strict +234XXXXXXXXXX format
 * @param phone - The phone number to validate
 * @returns true if valid, false otherwise
 */
export function isValidPhoneNumber(phone: string): boolean {
  // Strict validation: Must be exactly +234 followed by 10 digits
  const phoneRegex = /^\+234\d{10}$/;
  return phoneRegex.test(phone);
}

/**
 * Returns an example of a valid phone number
 * @returns Example phone number string
 */
export function getPhoneExample(): string {
  return '+2348012345678';
}

/**
 * Returns detailed instructions for phone number format
 * @returns Instruction string
 */
export function getPhoneInstructions(): string {
  return `📋 Phone number must be in format: +234XXXXXXXXXX

Examples:
✅ +2348012345678 (Correct)
✅ +2347012345678 (Correct)
❌ +234 801 234 5678 (No spaces)
❌ 08012345678 (Missing +234)
❌ 2348012345678 (Missing +)

Please provide the number in the correct format.`;
}

/**
 * Returns a contextual error message for invalid phone numbers
 * @param phone - The invalid phone number
 * @returns Error message string
 */
export function getPhoneErrorMessage(phone: string): string {
  if (!phone || phone.trim() === '') {
    return '❌ Phone number cannot be empty.\n\n' + getPhoneInstructions();
  }

  if (!phone.startsWith('+234')) {
    return `❌ Phone number must start with +234\n\nYou entered: ${phone}\n\n` + getPhoneInstructions();
  }

  if (phone.includes(' ') || phone.includes('-')) {
    return `❌ Phone number cannot contain spaces or dashes\n\nYou entered: ${phone}\n\n` + getPhoneInstructions();
  }

  if (phone.length !== 14) {
    return `❌ Phone number must be exactly 14 characters\n\nYou entered: ${phone} (${phone.length} characters)\nExpected: +234XXXXXXXXXX (14 characters)\n\n` + getPhoneInstructions();
  }

  return `❌ Invalid phone number format\n\nYou entered: ${phone}\n\n` + getPhoneInstructions();
}

/**
 * Validates Stacks (STX) address
 * @param address - The STX address to validate
 * @returns true if valid, false otherwise
 */
export function isValidSTXAddress(address: string): boolean {
  // Stacks addresses start with SP (mainnet) or ST (testnet)
  // Followed by 38-40 alphanumeric characters
  const stxRegex = /^(SP|ST)[0-9A-Z]{38,40}$/;
  return stxRegex.test(address);
}

/**
 * Returns error message for invalid STX address
 * @param address - The invalid STX address
 * @returns Error message string
 */
export function getSTXAddressErrorMessage(address: string): string {
  if (!address || address.trim() === '') {
    return '❌ STX address cannot be empty.\n\nPlease paste your Stacks wallet address (starts with SP or ST).';
  }

  if (!address.startsWith('SP') && !address.startsWith('ST')) {
    return `❌ Invalid STX address format\n\nYou entered: ${address}\n\nStacks addresses must start with:\n• SP (mainnet)\n• ST (testnet)\n\nPlease check your wallet and try again.`;
  }

  if (address.length < 39 || address.length > 42) {
    return `❌ Invalid STX address length\n\nYou entered: ${address} (${address.length} characters)\n\nStacks addresses are typically 40-42 characters long.\n\nPlease check your wallet and try again.`;
  }

  return `❌ Invalid STX address format\n\nYou entered: ${address}\n\nPlease make sure you copied your complete wallet address from:\n• Hiro Wallet\n• Xverse Wallet\n• Leather Wallet`;
}

/**
 * Validates transaction amount
 * @param amount - The amount to validate (in STX)
 * @returns true if valid, false otherwise
 */
export function isValidAmount(amount: number): boolean {
  // Amount must be positive and have at most 6 decimal places (microSTX precision)
  if (amount <= 0) return false;
  if (!Number.isFinite(amount)) return false;
  
  // Check decimal places (STX has 6 decimal precision)
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  return decimalPlaces <= 6;
}

/**
 * Returns error message for invalid amount
 * @param amount - The invalid amount
 * @returns Error message string
 */
export function getAmountErrorMessage(amount: string | number): string {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;

  if (isNaN(numAmount)) {
    return `❌ Invalid amount: "${amount}"\n\nPlease enter a valid number.\n\nExample: send 10 to Bob`;
  }

  if (numAmount <= 0) {
    return `❌ Amount must be greater than 0\n\nYou entered: ${amount} STX\n\nPlease enter a positive amount.`;
  }

  const decimalPlaces = (numAmount.toString().split('.')[1] || '').length;
  if (decimalPlaces > 6) {
    return `❌ Amount has too many decimal places\n\nYou entered: ${amount} STX\nMaximum: 6 decimal places\n\nExample: 10.123456 STX`;
  }

  return `❌ Invalid amount: ${amount}\n\nPlease enter a valid STX amount.`;
}
