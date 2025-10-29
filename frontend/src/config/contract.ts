// Contract Configuration
// Update this file with your Termius-deployed contract address

export const CONTRACT_CONFIG = {
  // ✅ VERIFIED DEPLOYMENT - Sepolia Testnet (Chain ID: 11155111)
  // 📍 Contract: 0x472e7934eA5279450E44b6ca376580C9f33876aC
  // 🔗 Etherscan: https://sepolia.etherscan.io/address/0x472e7934eA5279450E44b6ca376580C9f33876aC#code
  // ✅ New deployment with getSharedTasks() function
  TASK_MANAGER_ADDRESS: '0x472e7934eA5279450E44b6ca376580C9f33876aC',
  
  // Network configuration
  NETWORK: {
    name: 'Sepolia', // Sepolia testnet
    chainId: 11155111, // Sepolia chain ID
    rpcUrl: 'https://ethereum-sepolia.publicnode.com', // Sepolia RPC URL
  },
  
  // FHEVM Configuration for Sepolia
  FHEVM: {
    relayerUrl: 'https://relayer.testnet.zama.cloud',
    aclContractAddress: '0x687820221192C5B662b25367F70076A37bc79b6c',
    inputVerifierContractAddress: '0xbc91f3daD1A5F19F8390c400196e58073B6a0BC4',
    kmsContractAddress: '0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC',
    verifyingContractAddressDecryption: '0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1',
    verifyingContractAddressInputVerification: '0x7048C39f048125eDa9d678AEbaDfB22F7900a29F',
    gatewayChainId: 55815,
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

