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

  // FHEVM Configuration for Sepolia - MUST match @fhevm/solidity ZamaConfig.sol
  // These addresses are from the deployed contract's library (v0.8.0)
  FHEVM: {
    relayerUrl: 'https://relayer.testnet.zama.org',
    aclContractAddress: '0x687820221192C5B662b25367F70076A37bc79b6c',
    kmsContractAddress: '0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC',
    coprocessorAddress: '0x848B0066793BcC60346Da1F49049357399B8D595',
    decryptionOracleAddress: '0xa02Cda4Ca3a71D7C46997716F4283aa851C28812',
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

