import { ethers } from 'ethers';

// Simple wallet connection that works with ANY wallet
export class SimpleWalletService {
  private provider: any = null;
  private signer: any = null;
  private isConnected = false;
  private address = '';
  private walletName = '';
  
  private readonly STORAGE_KEY = 'fhevm_wallet_connection';
  private readonly INACTIVITY_TIMEOUT = 5 * 24 * 60 * 60 * 1000; // 5 days

  // Provider conflict resolution
  private resolveProviderConflicts() {
    try {
      // If we already have a stable provider, use it
      if ((window as any).__stableProvider) {
        console.log('🔧 Using existing stable provider');
        return (window as any).__stableProvider;
      }

      let selectedProvider = null;

      // Handle multiple providers scenario
      if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
        console.log('🔧 Multiple providers detected:', window.ethereum.providers.length);
        
        // Prefer MetaMask, but use any available
        selectedProvider = window.ethereum.providers.find((p: any) => p.isMetaMask) || window.ethereum.providers[0];
        
        console.log('🔧 Selected provider from array:', selectedProvider?.isMetaMask ? 'MetaMask' : 'Other');
      } 
      // Single provider scenario
      else if (window.ethereum) {
        console.log('🔧 Single provider detected');
        selectedProvider = window.ethereum;
      }
      // Check for specific wallets
      else if (window.evmAsk) {
        console.log('🔧 EVM Ask detected');
        selectedProvider = window.evmAsk;
      }

      if (selectedProvider) {
        // Store the stable provider to prevent conflicts
        (window as any).__stableProvider = selectedProvider;
        console.log('🔧 Provider stored as stable reference');
        return selectedProvider;
      }

      return null;
    } catch (error) {
      console.error('❌ Provider conflict resolution failed:', error);
      return null;
    }
  }

  // Detect all available wallets
  private detectWallets() {
    const wallets = [];
    
    // MetaMask
    if (window.ethereum?.isMetaMask) {
      wallets.push({ name: 'MetaMask', provider: window.ethereum });
    }
    
    // Trust Wallet
    if (window.ethereum?.isTrust) {
      wallets.push({ name: 'Trust Wallet', provider: window.ethereum });
    }
    
    // Coinbase Wallet
    if (window.ethereum?.isCoinbaseWallet) {
      wallets.push({ name: 'Coinbase Wallet', provider: window.ethereum });
    }
    
    // Brave Wallet
    if (window.ethereum?.isBraveWallet) {
      wallets.push({ name: 'Brave Wallet', provider: window.ethereum });
    }
    
    // OKX Wallet
    if (window.okxwallet) {
      wallets.push({ name: 'OKX Wallet', provider: window.okxwallet });
    }
    
    // Phantom (Ethereum)
    if (window.phantom?.ethereum) {
      wallets.push({ name: 'Phantom', provider: window.phantom.ethereum });
    }
    
    // Rainbow Wallet
    if (window.ethereum?.isRainbow) {
      wallets.push({ name: 'Rainbow Wallet', provider: window.ethereum });
    }
    
    // WalletConnect
    if (window.ethereum?.isWalletConnect) {
      wallets.push({ name: 'WalletConnect', provider: window.ethereum });
    }
    
    // Frame
    if (window.ethereum?.isFrame) {
      wallets.push({ name: 'Frame', provider: window.ethereum });
    }
    
    // TokenPocket
    if (window.ethereum?.isTokenPocket) {
      wallets.push({ name: 'TokenPocket', provider: window.ethereum });
    }
    
    // Bitget Wallet
    if (window.ethereum?.isBitgetWallet) {
      wallets.push({ name: 'Bitget Wallet', provider: window.ethereum });
    }
    
    // Math Wallet
    if (window.ethereum?.isMathWallet) {
      wallets.push({ name: 'Math Wallet', provider: window.ethereum });
    }
    
    // SafePal
    if (window.ethereum?.isSafePal) {
      wallets.push({ name: 'SafePal', provider: window.ethereum });
    }
    
    // EVM Ask
    if (window.evmAsk) {
      wallets.push({ name: 'EVM Ask', provider: window.evmAsk });
    }
    
    // Generic Ethereum (fallback)
    if (window.ethereum && wallets.length === 0) {
      wallets.push({ name: 'Ethereum Wallet', provider: window.ethereum });
    }
    
    return wallets;
  }

  async loadPersistedConnection(): Promise<boolean> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return false;

      const { address, timestamp } = JSON.parse(stored);
      
      // Check if connection expired (5 days of inactivity)
      if (Date.now() - timestamp > this.INACTIVITY_TIMEOUT) {
        console.log('⏰ Wallet connection expired (5 days inactivity)');
        localStorage.removeItem(this.STORAGE_KEY);
        return false;
      }

      // Try to reconnect
      const selectedProvider = (window as any).__selectedProvider || window.ethereum;
      if (!selectedProvider) return false;

      console.log('🔄 Restoring wallet connection...');
      
      this.provider = new ethers.BrowserProvider(selectedProvider);
      
      // Check if wallet is still connected
      const accounts = await selectedProvider.request({ method: 'eth_accounts' });
      if (!accounts || accounts.length === 0 || accounts[0].toLowerCase() !== address.toLowerCase()) {
        console.log('⚠️ Wallet no longer connected');
        localStorage.removeItem(this.STORAGE_KEY);
        return false;
      }

      this.signer = await this.provider.getSigner();
      this.address = address;
      this.isConnected = true;
      this.walletName = 'Connected Wallet';

      console.log('✅ Wallet connection restored:', address);
      
      // Update timestamp
      this.saveConnection();
      
      return true;
    } catch (error) {
      console.log('⚠️ Failed to restore wallet connection:', error);
      localStorage.removeItem(this.STORAGE_KEY);
      return false;
    }
  }

  private saveConnection() {
    if (this.address) {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        address: this.address,
        timestamp: Date.now()
      }));
    }
  }

  async connect(): Promise<void> {
    try {
      console.log('🔧 Initializing wallet service...');
      
      // Resolve provider conflicts first
      const selectedProvider = this.resolveProviderConflicts();
      
      if (!selectedProvider) {
        throw new Error('No wallet provider available.');
      }
      
      console.log('🔧 Using resolved provider:', selectedProvider);
      console.log('🔧 Provider type:', typeof selectedProvider);
      console.log('🔧 Provider methods:', Object.getOwnPropertyNames(selectedProvider));
      
      console.log('🔧 Creating ethers provider and signer...');
      
      // Create provider and signer
      this.provider = new ethers.BrowserProvider(selectedProvider);
      this.signer = await this.provider.getSigner();
      
      const address = await this.signer.getAddress();
      const network = await this.provider.getNetwork();
      
      console.log('✅ Wallet service connected:', address);
      console.log('✅ Network:', network.name, network.chainId);
      
      this.isConnected = true;
      this.address = address;
      this.walletName = 'Connected Wallet';
      
      // Save connection to localStorage
      this.saveConnection();
      
      // Switch to Sepolia if needed
      if (network.chainId !== 11155111n) {
        console.log('🔧 Switching to Sepolia testnet...');
        try {
          await selectedProvider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }], // Sepolia chain ID
          });
          console.log('✅ Switched to Sepolia');
        } catch (error: any) {
          if (error.code === 4902) {
            console.log('⚠️ Sepolia not found in wallet, trying to add it...');
            // Network not added, try to add it
            try {
              await selectedProvider.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0xaa36a7',
                  chainName: 'Sepolia Testnet',
                  nativeCurrency: {
                    name: 'Sepolia ETH',
                    symbol: 'ETH',
                    decimals: 18
                  },
                  rpcUrls: ['https://rpc.sepolia.org'],
                  blockExplorerUrls: ['https://sepolia.etherscan.io']
                }]
              });
              console.log('✅ Sepolia added to wallet');
            } catch (addError) {
              console.log('⚠️ Could not add Sepolia:', addError);
            }
          } else {
            console.log('⚠️ Could not switch to Sepolia:', error);
          }
        }
      }
      
    } catch (error) {
      console.error('❌ Wallet service initialization failed:', error);
      throw error;
    }
  }

  getProvider() {
    return this.provider;
  }

  getSigner() {
    return this.signer;
  }

  getAddress() {
    return this.address;
  }

  getWalletName() {
    return this.walletName;
  }

  isWalletConnected() {
    return this.isConnected;
  }

  disconnect() {
    this.provider = null;
    this.signer = null;
    this.isConnected = false;
    this.address = '';
    this.walletName = '';
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('🔌 Wallet disconnected and localStorage cleared');
  }
}

// Create singleton instance
export const simpleWalletService = new SimpleWalletService();
