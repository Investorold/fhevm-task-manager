// Contract Configuration
// Updated for @fhevm/solidity@0.10.0 with new Zama infrastructure addresses

export const CONTRACT_CONFIG = {
  // ✅ VERIFIED DEPLOYMENT - Sepolia Testnet (Chain ID: 11155111)
  // 📍 Contract: 0x0D24D85b455c58cfFFbe8609Ae59894Ae209e4C9
  // 🔗 Etherscan: https://sepolia.etherscan.io/address/0x0D24D85b455c58cfFFbe8609Ae59894Ae209e4C9
  // ✅ Deployed with @fhevm/solidity@0.10.0 (new decryption API)
  TASK_MANAGER_ADDRESS: '0x0D24D85b455c58cfFFbe8609Ae59894Ae209e4C9',

  // Network configuration
  NETWORK: {
    name: 'Sepolia',
    chainId: 11155111,
    rpcUrl: 'https://ethereum-sepolia.publicnode.com',
  },

  // FHEVM Configuration for Sepolia - MUST match @fhevm/solidity@0.10.0 ZamaConfig.sol
  // These are the CURRENT official Zama addresses (updated Jan 2025)
  FHEVM: {
    relayerUrl: 'https://relayer.testnet.zama.org',
    gatewayUrl: 'https://gateway.testnet.zama.org',
    aclContractAddress: '0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D',
    kmsContractAddress: '0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A',
    coprocessorAddress: '0x92C920834Ec8941d2C77D188936E1f7A6f49c127',
    inputVerifierAddress: '0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0',
    decryptionAddress: '0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478',
    inputVerificationAddress: '0x483b9dE06E4E4C7D35CCf5837A1668487406D955',
    gatewayChainId: 10901,
  }
};

// Helper function to get contract address
export const getContractAddress = (): string => {
  return CONTRACT_CONFIG.TASK_MANAGER_ADDRESS;
};

// Helper function to get network config
export const getNetworkConfig = () => {
  return CONTRACT_CONFIG.NETWORK;
};

// Helper function to get FHEVM config
export const getFhevmConfig = () => {
  return CONTRACT_CONFIG.FHEVM;
};
