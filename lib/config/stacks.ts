/**
 * Stacks Network Configuration
 * Configures network settings for Stacks blockchain interactions
 */

import { StacksTestnet, StacksMainnet, StacksNetwork } from '@stacks/network';

// Get network from environment variable
const networkType = process.env.STACKS_NETWORK || 'testnet';

/**
 * Returns the configured Stacks network
 * @returns StacksNetwork instance (testnet or mainnet)
 */
export function getNetwork(): StacksNetwork {
  if (networkType === 'mainnet') {
    return new StacksMainnet();
  }
  return new StacksTestnet();
}

/**
 * Get the Stacks API URL based on network
 * @returns API URL string
 */
export function getApiUrl(): string {
  return process.env.STACKS_API_URL || 'https://api.testnet.hiro.so';
}

/**
 * Get the escrow contract address
 * @returns Contract address
 */
export function getEscrowContractAddress(): string {
  const address = process.env.ESCROW_CONTRACT_ADDRESS;
  if (!address) {
    throw new Error('ESCROW_CONTRACT_ADDRESS not configured in environment variables');
  }
  return address;
}

/**
 * Get the escrow contract name
 * @returns Contract name
 */
export function getEscrowContractName(): string {
  return process.env.ESCROW_CONTRACT_NAME || 'escrow';
}

/**
 * Get network type string
 * @returns 'mainnet' or 'testnet'
 */
export function getNetworkType(): 'mainnet' | 'testnet' {
  return networkType === 'mainnet' ? 'mainnet' : 'testnet';
}

/**
 * Get Stacks explorer URL
 * @returns Explorer base URL
 */
export function getExplorerUrl(): string {
  return networkType === 'mainnet'
    ? 'https://explorer.hiro.so'
    : 'https://explorer.hiro.so';
}

// Export configuration object
export const stacksConfig = {
  network: getNetwork(),
  apiUrl: getApiUrl(),
  escrowContractAddress: getEscrowContractAddress,
  escrowContractName: getEscrowContractName,
  networkType: getNetworkType(),
  explorerUrl: getExplorerUrl(),
};

export default stacksConfig;
