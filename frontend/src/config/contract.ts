// Contract Configuration
// Update this file with your Termius-deployed contract address

export const CONTRACT_CONFIG = {
  // ✅ VERIFIED DEPLOYMENT - Sepolia Testnet (Chain ID: 11155111)
  // 📍 Contract: 0x64E706453cB72Cdef3a0e0367E67E8d0B1be8a2F
  // 🔗 Sourcify: https://repo.sourcify.dev/contracts/partial_match/11155111/0x64E706453cB72Cdef3a0e0367E67E8d0B1be8a2F/
  // 🔗 Etherscan: https://sepolia.etherscan.io/address/0x64E706453cB72Cdef3a0e0367E67E8d0B1be8a2F
  // ✅ Redeployed Jan 2026 with updated FHEVM addresses from docs.zama.org
  TASK_MANAGER_ADDRESS: '0x64E706453cB72Cdef3a0e0367E67E8d0B1be8a2F',

  // Network configuration
  NETWORK: {
    name: 'Sepolia',
    chainId: 11155111,
    rpcUrl: 'https://ethereum-sepolia.publicnode.com',
  },

  // FHEVM Configuration for Sepolia (updated Jan 2026 from docs.zama.org)
  FHEVM: {
    relayerUrl: 'https://relayer.testnet.zama.org',
    aclContractAddress: '0xf0Ffdc93b7E186bC2f8CB3dAA75D86d1930A433D',
    inputVerifierContractAddress: '0xBBC1fFCdc7C316aAAd72E807D9b0272BE8F84DA0',
    kmsContractAddress: '0xbE0E383937d564D7FF0BC3b46c51f0bF8d5C311A',
    verifyingContractAddressDecryption: '0x5D8BD78e2ea6bbE41f26dFe9fdaEAa349e077478',
    verifyingContractAddressInputVerification: '0x483b9dE06E4E4C7D35CCf5837A1668487406D955',
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

