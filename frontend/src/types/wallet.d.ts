// Comprehensive wallet extension declarations
declare global {
  interface Window {
    ethereum?: {
      // MetaMask
      isMetaMask?: boolean;
      // Trust Wallet
      isTrust?: boolean;
      // Rabby Wallet
      isRabby?: boolean;
      // Coinbase Wallet
      isCoinbaseWallet?: boolean;
      // Brave Wallet
      isBraveWallet?: boolean;
      // Rainbow Wallet
      isRainbow?: boolean;
      // WalletConnect
      isWalletConnect?: boolean;
      // Frame Wallet
      isFrame?: boolean;
      // TokenPocket
      isTokenPocket?: boolean;
      // Bitget Wallet
      isBitgetWallet?: boolean;
      // Math Wallet
      isMathWallet?: boolean;
      // SafePal Wallet
      isSafePal?: boolean;
      // Zerion Wallet
      isZerion?: boolean;
      
      // Common methods
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
    };
    
    // OKX Wallet
    okxwallet?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
    };
    
    // Phantom Wallet (EVM support)
    phantom?: {
      ethereum?: {
        request: (args: { method: string; params?: any[] }) => Promise<any>;
      };
    };
    
    // EVM Ask
    evmAsk?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
    };
    
    // Legacy Coinbase Wallet Extension
    coinbaseWalletExtension?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
    };
    
    // Legacy Brave Wallet
    brave?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
    };
    
    // Legacy Trust Wallet
    trustwallet?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
    };
    
    // Zerion Wallet
    zerionWallet?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
    };
  }
}

export {};
