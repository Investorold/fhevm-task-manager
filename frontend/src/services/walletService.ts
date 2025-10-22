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

class WalletService {
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

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', this.handleAccountsChanged.bind(this));
      window.ethereum.on('chainChanged', this.handleChainChanged.bind(this));
      window.ethereum.on('disconnect', this.handleDisconnect.bind(this));
    }
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
    return { ...this.state };
  }

  async connectWallet(): Promise<void> {
    try {
      // Handle multiple wallet extensions
      if (!window.ethereum) {
        throw new Error('No Ethereum wallet detected. Please install MetaMask.');
      }

      // Check if ethereum is available and not locked
      if (typeof window.ethereum.request !== 'function') {
        throw new Error('Wallet is locked. Please unlock MetaMask.');
      }

      // Request account access with error handling
      let accounts;
      try {
        accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });
      } catch (error: any) {
        if (error.code === 4001) {
          throw new Error('User rejected the connection request');
        }
        throw new Error(`Connection failed: ${error.message}`);
      }

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found. Please create an account in MetaMask.');
      }

      // Wait a moment for wallet conflicts to resolve
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create provider and signer with retry
      let retries = 3;
      while (retries > 0) {
        try {
          this.provider = new ethers.BrowserProvider(window.ethereum);
          this.signer = await this.provider.getSigner();
          break;
        } catch (error) {
          retries--;
          if (retries === 0) throw error;
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Get network info
      const network = await this.provider.getNetwork();
      const address = await this.signer.getAddress();

      // Check if we're on Sepolia testnet
      const sepoliaChainId = 11155111;
      if (Number(network.chainId) !== sepoliaChainId) {
        await this.switchToSepolia();
      }

      this.state = {
        isConnected: true,
        address,
        chainId: Number(network.chainId),
        isFhevmInitialized: false,
        error: null,
      };

      this.notifyListeners();
    } catch (error: any) {
      this.state.error = error.message || 'Failed to connect wallet';
      this.notifyListeners();
      throw error;
    }
  }

  async switchToSepolia(): Promise<void> {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0xaa36a7' }], // Sepolia chain ID
      });
    } catch (error: any) {
      // If the chain doesn't exist, add it
      if (error.code === 4902) {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: '0xaa36a7',
              chainName: 'Sepolia',
              rpcUrls: ['https://sepolia.infura.io/v3/'],
              nativeCurrency: {
                name: 'Sepolia Ether',
                symbol: 'ETH',
                decimals: 18,
              },
              blockExplorerUrls: ['https://sepolia.etherscan.io'],
            },
          ],
        });
      } else {
        throw error;
      }
    }
  }

  async disconnectWallet(): Promise<void> {
    this.provider = null;
    this.signer = null;
    this.state = {
      isConnected: false,
      address: null,
      chainId: null,
      isFhevmInitialized: false,
      error: null,
    };
    this.notifyListeners();
  }

  getProvider(): ethers.BrowserProvider | null {
    return this.provider;
  }

  getSigner(): ethers.JsonRpcSigner | null {
    return this.signer;
  }

  setFhevmInitialized(initialized: boolean): void {
    this.state.isFhevmInitialized = initialized;
    this.notifyListeners();
  }

  private handleAccountsChanged(accounts: string[]): void {
    if (accounts.length === 0) {
      this.disconnectWallet();
    } else {
      this.state.address = accounts[0];
      this.notifyListeners();
    }
  }

  private handleChainChanged(chainId: string): void {
    this.state.chainId = parseInt(chainId, 16);
    this.notifyListeners();
  }

  private handleDisconnect(): void {
    this.disconnectWallet();
  }
}

export const walletService = new WalletService();
