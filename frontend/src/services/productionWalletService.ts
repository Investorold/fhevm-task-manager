import { ethers } from 'ethers';
import type { WalletState } from '../types';

declare global {
  interface Window {
    ethereum?: any;
    evmAsk?: any;
    coinbaseWalletExtension?: any;
    phantom?: any;
    brave?: any;
    trustwallet?: any;
    okxwallet?: any;
  }
}

interface WalletProvider {
  name: string;
  provider: any;
  icon: string;
  description: string;
}

class ProductionWalletService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  private state: WalletState = {
    isConnected: false,
    address: null,
    chainId: null,
    isFhevmInitialized: false,
    error: null,
  };

  private listeners: ((state: WalletState) => void)[] = [];
  private selectedProvider: WalletProvider | null = null;
  private inactivityTimer: NodeJS.Timeout | null = null;
  private readonly INACTIVITY_TIMEOUT = 5 * 24 * 60 * 60 * 1000; // 5 days in milliseconds

  constructor() {
    this.setupEventListeners();
    this.loadPersistedConnection();
    this.setupInactivityTimer();
  }

  private loadPersistedConnection(): void {
    try {
      const persisted = localStorage.getItem('wallet-connection');
      if (persisted) {
        const { address, chainId, timestamp, providerName } = JSON.parse(persisted);
        
        // Check if connection is still valid (not expired)
        const now = Date.now();
        if (now - timestamp < this.INACTIVITY_TIMEOUT) {
          // Check if the wallet is still available and connected
          if (window.ethereum) {
            // Try to get current accounts without requesting new permissions
            window.ethereum.request({ method: 'eth_accounts' })
              .then((accounts: string[]) => {
                if (accounts && accounts.length > 0 && accounts[0].toLowerCase() === address.toLowerCase()) {
                  // Wallet is still connected with the same account
                  this.provider = new ethers.BrowserProvider(window.ethereum!);
                  this.state = {
                    isConnected: true,
                    address: address,
                    chainId: chainId,
                    isFhevmInitialized: false,
                    error: null,
                  };
                  
                  // Find and set the selected provider
                  const providers = this.getAvailableProviders();
                  const provider = providers.find(p => p.name === providerName);
                  if (provider) {
                    this.selectedProvider = provider;
                  }
                  
                  this.notifyListeners();
                  this.resetInactivityTimer();
                  console.log('Wallet automatically reconnected:', address);
                } else {
                  // Account changed or disconnected, clear persistence
                  localStorage.removeItem('wallet-connection');
                  console.log('Wallet account changed, cleared persistence');
                }
              })
              .catch(() => {
                // Failed to get accounts, clear persistence
                localStorage.removeItem('wallet-connection');
                console.log('Failed to verify wallet connection, cleared persistence');
              });
          } else {
            // Wallet not available, clear persistence
            localStorage.removeItem('wallet-connection');
            console.log('Wallet not available, cleared persistence');
          }
        } else {
          // Connection expired, clear it
          localStorage.removeItem('wallet-connection');
          console.log('Wallet connection expired, cleared from localStorage');
        }
      }
    } catch (error) {
      console.error('Failed to load persisted connection:', error);
      localStorage.removeItem('wallet-connection');
    }
  }

  private saveConnection(address: string, chainId: string, providerName: string): void {
    try {
      const connectionData = {
        address,
        chainId,
        providerName,
        timestamp: Date.now()
      };
      localStorage.setItem('wallet-connection', JSON.stringify(connectionData));
      console.log('Wallet connection saved to localStorage');
    } catch (error) {
      console.error('Failed to save connection:', error);
    }
  }

  private setupInactivityTimer(): void {
    // Clear any existing timer
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
    }

    // Set up new timer for 5 days
    this.inactivityTimer = setTimeout(() => {
      console.log('Wallet disconnected due to inactivity (5 days)');
      this.disconnect();
    }, this.INACTIVITY_TIMEOUT);
  }

  private resetInactivityTimer(): void {
    this.setupInactivityTimer();
  }

  private setupEventListeners(): void {
    if (typeof window !== 'undefined') {
      // Listen for account changes on any provider
      this.setupProviderListeners();
    }
  }

  private setupProviderListeners(): void {
    const providers = this.getAvailableProviders();
    
    providers.forEach(wallet => {
      try {
        if (wallet.provider && wallet.provider.on) {
          wallet.provider.on('accountsChanged', this.handleAccountsChanged.bind(this));
          wallet.provider.on('chainChanged', this.handleChainChanged.bind(this));
          wallet.provider.on('disconnect', this.handleDisconnect.bind(this));
        }
      } catch (error) {
        console.warn(`Could not setup listeners for ${wallet.name}:`, error);
      }
    });
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.state));
  }

  subscribe(listener: (state: WalletState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  getState(): WalletState {
    console.log('🔧 getState called, current state:', this.state);
    return { ...this.state };
  }

  // Check if wallet is already connected (for page refresh)
  async checkExistingConnection(): Promise<boolean> {
    try {
      if (!window.ethereum) return false;
      
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      return accounts && accounts.length > 0;
    } catch (error) {
      console.error('Failed to check existing connection:', error);
      return false;
    }
  }

  // Get all available wallet providers
  getAvailableProviders(): WalletProvider[] {
    const providers: WalletProvider[] = [];
    
    // MetaMask (most popular)
    if (window.ethereum?.isMetaMask) {
      providers.push({
        name: 'MetaMask',
        provider: window.ethereum,
        icon: '🦊',
        description: 'The most popular Ethereum wallet'
      });
    }
    
    // Trust Wallet
    if (window.ethereum?.isTrust) {
      providers.push({
        name: 'Trust Wallet',
        provider: window.ethereum,
        icon: '🔒',
        description: 'Mobile-first crypto wallet'
      });
    }
    
    // Rabby Wallet
    if (window.ethereum?.isRabby) {
      providers.push({
        name: 'Rabby Wallet',
        provider: window.ethereum,
        icon: '🐰',
        description: 'Advanced DeFi wallet'
      });
    }
    
    // Coinbase Wallet
    if (window.ethereum?.isCoinbaseWallet) {
      providers.push({
        name: 'Coinbase Wallet',
        provider: window.ethereum,
        icon: '🔵',
        description: 'Secure wallet by Coinbase'
      });
    }
    
    // Brave Wallet
    if (window.ethereum?.isBraveWallet) {
      providers.push({
        name: 'Brave Wallet',
        provider: window.ethereum,
        icon: '🦁',
        description: 'Built into Brave browser'
      });
    }
    
    // OKX Wallet
    if (window.okxwallet) {
      providers.push({
        name: 'OKX Wallet',
        provider: window.okxwallet,
        icon: '⭕',
        description: 'Multi-chain Web3 wallet'
      });
    }
    
    // Phantom Wallet (EVM support)
    if (window.phantom?.ethereum) {
      providers.push({
        name: 'Phantom',
        provider: window.phantom.ethereum,
        icon: '👻',
        description: 'Multi-chain wallet with EVM support'
      });
    }
    
    // Rainbow Wallet
    if (window.ethereum?.isRainbow) {
      providers.push({
        name: 'Rainbow',
        provider: window.ethereum,
        icon: '🌈',
        description: 'Beautiful, simple, and secure'
      });
    }
    
    // WalletConnect
    if (window.ethereum?.isWalletConnect) {
      providers.push({
        name: 'WalletConnect',
        provider: window.ethereum,
        icon: '🔗',
        description: 'Connect to any wallet'
      });
    }
    
    // Frame Wallet
    if (window.ethereum?.isFrame) {
      providers.push({
        name: 'Frame',
        provider: window.ethereum,
        icon: '🖼️',
        description: 'Desktop Ethereum wallet'
      });
    }
    
    // TokenPocket
    if (window.ethereum?.isTokenPocket) {
      providers.push({
        name: 'TokenPocket',
        provider: window.ethereum,
        icon: '🎒',
        description: 'Multi-chain wallet'
      });
    }
    
    // Bitget Wallet
    if (window.ethereum?.isBitgetWallet) {
      providers.push({
        name: 'Bitget Wallet',
        provider: window.ethereum,
        icon: '🟡',
        description: 'Secure multi-chain wallet'
      });
    }
    
    // Math Wallet
    if (window.ethereum?.isMathWallet) {
      providers.push({
        name: 'Math Wallet',
        provider: window.ethereum,
        icon: '📐',
        description: 'Multi-platform crypto wallet'
      });
    }
    
    // SafePal Wallet
    if (window.ethereum?.isSafePal) {
      providers.push({
        name: 'SafePal',
        provider: window.ethereum,
        icon: '🛡️',
        description: 'Hardware & software wallet'
      });
    }
    
    // EVM Ask
    if (window.evmAsk) {
      providers.push({
        name: 'EVM Ask',
        provider: window.evmAsk,
        icon: '❓',
        description: 'AI-powered wallet assistant'
      });
    }
    
    // Generic Ethereum provider (fallback)
    if (window.ethereum && providers.length === 0) {
      providers.push({
        name: 'Ethereum Wallet',
        provider: window.ethereum,
        icon: '⚡',
        description: 'Generic Ethereum wallet'
      });
    }
    
    return providers;
  }

  // Connect with a specific provider to avoid conflicts
  async connectWithProvider(walletProvider: WalletProvider): Promise<void> {
    try {
      console.log(`Connecting with ${walletProvider.name}...`);
      
      this.selectedProvider = walletProvider;
      
      // Request account access
      const accounts = await walletProvider.provider.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // Create provider and signer using the specific provider
      this.provider = new ethers.BrowserProvider(walletProvider.provider);
      this.signer = await this.provider.getSigner();

      // Get network info
      const network = await this.provider.getNetwork();
      const address = await this.signer.getAddress();

      // Check if we're on Sepolia testnet
      const sepoliaChainId = 11155111;
      if (Number(network.chainId) !== sepoliaChainId) {
        await this.switchToSepolia(walletProvider.provider);
      }

      // Update wallet state
      this.state = {
        isConnected: true,
        address: address,
        chainId: network.chainId.toString(),
        isFhevmInitialized: false,
        error: null,
      };

      // Save connection to localStorage for persistence
      this.saveConnection(address, network.chainId.toString(), walletProvider.name);
      
      // Reset inactivity timer
      this.resetInactivityTimer();

      this.notifyListeners();
      console.log(`Successfully connected with ${walletProvider.name}:`, address);
    } catch (error) {
      console.error(`Failed to connect with ${walletProvider.name}:`, error);
      this.state.error = `Failed to connect with ${walletProvider.name}`;
      this.notifyListeners();
      throw error;
    }
  }

  // Simple connection method that works with any wallet
  async connectSimple(): Promise<void> {
    try {
      console.log('🔧 Simple wallet connection...');
      
      // Use window.ethereum directly (most common)
      if (!window.ethereum) {
        throw new Error('No Ethereum wallet detected. Please install MetaMask or another Web3 wallet.');
      }
      
      console.log('🔧 Requesting account access...');
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      console.log('🔧 Creating provider and signer...');
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      
      const address = await this.signer.getAddress();
      const network = await this.provider.getNetwork();
      
      console.log('✅ Connected to wallet:', address);
      console.log('✅ Network:', network.name, network.chainId);
      
      // Update state
      this.state.isConnected = true;
      this.state.address = address;
      this.state.chainId = network.chainId.toString();
      
      // Save connection
      this.saveConnection(address, network.chainId.toString(), 'Simple');
      
      // Setup inactivity timer
      this.setupInactivityTimer();
      
      this.notifyListeners();
      
    } catch (error) {
      console.error('❌ Simple wallet connection failed:', error);
      throw error;
    }
  }

  private async switchToSepolia(provider: any): Promise<void> {
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // Sepolia chain ID
      });
    } catch (switchError: any) {
      // If the chain doesn't exist, add it
      if (switchError.code === 4902) {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0xaa36a7',
              chainName: 'Sepolia Test Network',
              rpcUrls: ['https://ethereum-sepolia.publicnode.com'],
              nativeCurrency: {
                name: 'Sepolia Ether',
                symbol: 'ETH',
                decimals: 18,
              },
              blockExplorerUrls: ['https://sepolia.etherscan.io/'],
            }],
          });
        } catch (addError) {
          console.error('Failed to add Sepolia network:', addError);
          throw new Error('Please switch to Sepolia testnet manually');
        }
      } else {
        throw switchError;
      }
    }
  }

  private handleAccountsChanged(accounts: string[]): void {
    if (accounts.length === 0) {
      this.disconnect();
    } else {
      this.state.address = accounts[0];
      this.notifyListeners();
    }
  }

  private handleChainChanged(chainId: string): void {
    this.state.chainId = chainId;
    this.notifyListeners();
  }

  private handleDisconnect(): void {
    this.disconnect();
  }

  disconnect(): void {
    this.provider = null;
    this.signer = null;
    this.selectedProvider = null;
    this.state = {
      isConnected: false,
      address: null,
      chainId: null,
      isFhevmInitialized: false,
      error: null,
    };
    
    // Clear persisted connection
    localStorage.removeItem('wallet-connection');
    
    // Clear inactivity timer
    if (this.inactivityTimer) {
      clearTimeout(this.inactivityTimer);
      this.inactivityTimer = null;
    }
    
    this.notifyListeners();
    console.log('Wallet disconnected and persistence cleared');
  }

  getProvider(): ethers.BrowserProvider | null {
    console.log('🔧 getProvider called, provider:', this.provider);
    return this.provider;
  }

  getSigner(): ethers.JsonRpcSigner | null {
    console.log('🔧 getSigner called, signer:', this.signer);
    return this.signer;
  }

  setFhevmInitialized(initialized: boolean): void {
    this.state.isFhevmInitialized = initialized;
    this.notifyListeners();
  }

  getSelectedProvider(): WalletProvider | null {
    return this.selectedProvider;
  }
}

export const productionWalletService = new ProductionWalletService();
