/**
 * Formatter Utility
 * Formats data for display in WhatsApp messages
 */

/**
 * Formats STX amount for display
 * @param amount - Amount in STX (number)
 * @returns Formatted string
 */
export function formatSTXAmount(amount: number): string {
  // Format with up to 6 decimal places, removing trailing zeros
  return `${amount.toFixed(6).replace(/\.?0+$/, '')} STX`;
}

/**
 * Formats phone number for display (keeps +234 format)
 * @param phone - Phone number in +234XXXXXXXXXX format
 * @returns Formatted string for display
 */
export function formatPhoneNumber(phone: string): string {
  // Keep original format but could add spacing for readability if needed
  // For now, return as-is since we want to maintain strict format
  return phone;
}

/**
 * Abbreviates STX address for display
 * @param address - Full STX address
 * @returns Abbreviated address (e.g., SP3X...ABC)
 */
export function abbreviateAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.substring(0, 4)}...${address.substring(address.length - 3)}`;
}

/**
 * Creates a Stacks explorer link for a transaction
 * @param txId - Transaction ID
 * @param network - Network type ('testnet' or 'mainnet')
 * @returns Explorer URL
 */
export function formatTransactionLink(txId: string, network: 'testnet' | 'mainnet' = 'testnet'): string {
  const baseUrl = network === 'mainnet' 
    ? 'https://explorer.hiro.so/txid'
    : 'https://explorer.hiro.so/txid';
  
  return `${baseUrl}/${txId}?chain=${network}`;
}

/**
 * Returns welcome message for new users
 * @returns Welcome message string
 */
export function getWelcomeMessage(): string {
  return `👋 Welcome to STX WhatsApp Payments!

To get started, please paste your Stacks (STX) wallet address.

Your address should look like:
• SP1234... (mainnet)
• ST1234... (testnet)

You can find this in:
• Hiro Wallet
• Xverse Wallet
• Leather Wallet

Paste your address to continue! 🚀`;
}

/**
 * Returns registration success message
 * @param address - The registered STX address
 * @returns Success message string
 */
export function getRegistrationSuccess(address: string): string {
  return `✅ Registration successful!

Your wallet is now linked:
${abbreviateAddress(address)}

You can now:
• Send STX to contacts
• Receive payments
• View contacts

Try: *send 10 to Bob* 💸`;
}

/**
 * Returns help/commands message
 * @returns Help message string
 */
export function getHelpMessage(): string {
  return `📱 *Available Commands*

*SENDING MONEY*
• send <amount> to <name>
  Example: _send 10 to Bob_

*CONTACTS*
• contacts - View your saved contacts

*CLAIMS*
• claim - Check for pending payments

*REGISTRATION*
• Paste your STX address to register

Need help? Reply with your question! 💬`;
}

/**
 * Formats a contact list for display
 * @param contacts - Array of contact objects
 * @returns Formatted contact list string
 */
export function formatContactList(contacts: Array<{ name: string; phone: string }>): string {
  if (contacts.length === 0) {
    return `📇 *Your Contacts*

You don't have any contacts yet.

Add a contact by sending them money:
_send 10 to Alice_

The bot will ask for their phone number! 📱`;
  }

  let message = `📇 *Your Contacts* (${contacts.length})\n\n`;
  
  contacts.forEach((contact, index) => {
    message += `${index + 1}. *${contact.name}*\n   ${formatPhoneNumber(contact.phone)}\n\n`;
  });

  message += `To send money: _send <amount> to <name>_`;

  return message;
}

/**
 * Formats a transaction confirmation message
 * @param amount - Transaction amount
 * @param recipientName - Recipient's name
 * @param txId - Transaction ID (optional, for confirmed transactions)
 * @returns Formatted confirmation message
 */
export function formatTransactionConfirmation(
  amount: number,
  recipientName: string,
  txId?: string
): string {
  let message = `✅ *Transaction Sent!*

Amount: ${formatSTXAmount(amount)}
To: *${recipientName}*

Status: Processing... ⏳`;

  if (txId) {
    message += `\n\nTransaction ID:\n${abbreviateAddress(txId)}`;
  }

  message += `\n\nYou'll receive a confirmation once it's complete! 🎉`;

  return message;
}

/**
 * Formats an escrow creation message
 * @param amount - Escrowed amount
 * @param recipientName - Recipient's name
 * @param claimLink - Link to claim page
 * @returns Formatted escrow message
 */
export function formatEscrowMessage(
  amount: number,
  recipientName: string,
  claimLink: string
): string {
  return `✅ *Payment Secured!*

Amount: ${formatSTXAmount(amount)}
To: *${recipientName}* (not registered yet)

Your payment is held in escrow until ${recipientName} registers.

Claim link sent to ${recipientName}! 📬

They can claim anytime by:
1. Registering with their STX address
2. Or visiting: ${claimLink}

You'll be notified when claimed! 🔔`;
}

/**
 * Formats amount in microSTX (for blockchain transactions)
 * @param stxAmount - Amount in STX
 * @returns Amount in microSTX (integer)
 */
export function stxToMicroStx(stxAmount: number): number {
  return Math.floor(stxAmount * 1_000_000);
}

/**
 * Formats amount from microSTX to STX
 * @param microStxAmount - Amount in microSTX
 * @returns Amount in STX
 */
export function microStxToStx(microStxAmount: number): number {
  return microStxAmount / 1_000_000;
}
