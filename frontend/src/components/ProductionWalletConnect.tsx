import { useState, useEffect } from 'react';
import { Wallet, Shield, Zap, AlertTriangle, ChevronDown, Check } from 'lucide-react';
import { simpleWalletService } from '../services/simpleWalletService';

interface WalletProvider {
  name: string;
  provider: any;
  icon: string;
  isInstalled: boolean;
}

export function ProductionWalletConnect() {
  const [availableWallets, setAvailableWallets] = useState<WalletProvider[]>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    detectWallets();
  }, []);

  const detectWallets = () => {
    const wallets: WalletProvider[] = [];

    // MetaMask (most popular)
    if (window.ethereum?.isMetaMask) {
      wallets.push({
        name: 'MetaMask',
        provider: window.ethereum,
        icon: '🦊',
        isInstalled: true
      });
    }

    // Trust Wallet
    if (window.ethereum?.isTrust) {
      wallets.push({
        name: 'Trust Wallet',
        provider: window.ethereum,
        icon: '🔒',
        isInstalled: true
      });
    }

    // Rabby Wallet
    if (window.ethereum?.isRabby) {
      wallets.push({
        name: 'Rabby Wallet',
        provider: window.ethereum,
        icon: '🐰',
        isInstalled: true
      });
    }

    // Coinbase Wallet
    if (window.ethereum?.isCoinbaseWallet) {
      wallets.push({
        name: 'Coinbase Wallet',
        provider: window.ethereum,
        icon: '🔵',
        isInstalled: true
      });
    }

    // Brave Wallet
    if (window.ethereum?.isBraveWallet) {
      wallets.push({
        name: 'Brave Wallet',
        provider: window.ethereum,
        icon: '🦁',
        isInstalled: true
      });
    }

    // OKX Wallet
    if (window.okxwallet) {
      wallets.push({
        name: 'OKX Wallet',
        provider: window.okxwallet,
        icon: '⭕',
        isInstalled: true
      });
    }

    // Phantom Wallet (EVM support)
    if (window.phantom?.ethereum) {
      wallets.push({
        name: 'Phantom',
        provider: window.phantom.ethereum,
        icon: '👻',
        isInstalled: true
      });
    }

    // Rainbow Wallet
    if (window.ethereum?.isRainbow) {
      wallets.push({
        name: 'Rainbow',
        provider: window.ethereum,
        icon: '🌈',
        isInstalled: true
      });
    }

    // WalletConnect
    if (window.ethereum?.isWalletConnect) {
      wallets.push({
        name: 'WalletConnect',
        provider: window.ethereum,
        icon: '🔗',
        isInstalled: true
      });
    }

    // Frame Wallet
    if (window.ethereum?.isFrame) {
      wallets.push({
        name: 'Frame',
        provider: window.ethereum,
        icon: '🖼️',
        isInstalled: true
      });
    }

    // TokenPocket
    if (window.ethereum?.isTokenPocket) {
      wallets.push({
        name: 'TokenPocket',
        provider: window.ethereum,
        icon: '🎒',
        isInstalled: true
      });
    }

    // Bitget Wallet
    if (window.ethereum?.isBitgetWallet) {
      wallets.push({
        name: 'Bitget Wallet',
        provider: window.ethereum,
        icon: '🟡',
        isInstalled: true
      });
    }

    // Math Wallet
    if (window.ethereum?.isMathWallet) {
      wallets.push({
        name: 'Math Wallet',
        provider: window.ethereum,
        icon: '📐',
        isInstalled: true
      });
    }

    // SafePal Wallet
    if (window.ethereum?.isSafePal) {
      wallets.push({
        name: 'SafePal',
        provider: window.ethereum,
        icon: '🛡️',
        isInstalled: true
      });
    }

    // EVM Ask
    if (window.evmAsk) {
      wallets.push({
        name: 'EVM Ask',
        provider: window.evmAsk,
        icon: '❓',
        isInstalled: true
      });
    }

    // Generic Ethereum provider (fallback)
    if (window.ethereum && wallets.length === 0) {
      wallets.push({
        name: 'Ethereum Wallet',
        provider: window.ethereum,
        icon: '⚡',
        isInstalled: true
      });
    }

    setAvailableWallets(wallets);
  };

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    
    try {
      console.log('🔧 Connecting wallet...');
      
      // Universal wallet detection - works with ANY EVM wallet
      let provider = null;
      let walletName = 'Unknown Wallet';
      
      // Handle provider conflicts by using a stable reference
      const getStableProvider = () => {
        // If we already have a selected provider, use it
        if ((window as any).__selectedProvider) {
          return (window as any).__selectedProvider;
        }
        
        // Check for multiple wallet providers
        if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
          console.log('🔧 Multiple wallets detected:', window.ethereum.providers.length);
          
          // Try to find MetaMask first, but use any available
          const selectedProvider = window.ethereum.providers.find((p: any) => p.isMetaMask) || window.ethereum.providers[0];
          
          // Store it globally to prevent conflicts
          (window as any).__selectedProvider = selectedProvider;
          return selectedProvider;
        } 
        // Single wallet provider
        else if (window.ethereum) {
          console.log('🔧 Single wallet detected');
          
          // Store it globally to prevent conflicts
          (window as any).__selectedProvider = window.ethereum;
          return window.ethereum;
        }
        // Check for specific wallets
        else if (window.evmAsk) {
          console.log('🔧 EVM Ask detected');
          
          // Store it globally to prevent conflicts
          (window as any).__selectedProvider = window.evmAsk;
          return window.evmAsk;
        }
        
        return null;
      };
      
      provider = getStableProvider();
      
      if (!provider) {
        throw new Error('No EVM wallet found! Please install MetaMask, Trust Wallet, Coinbase Wallet, or any EVM-compatible wallet.');
      }
      
      // Determine wallet name
      if (provider.isMetaMask) walletName = 'MetaMask';
      else if (provider.isCoinbaseWallet) walletName = 'Coinbase Wallet';
      else if (provider.isTrust) walletName = 'Trust Wallet';
      else if (provider.isRabby) walletName = 'Rabby';
      else if (provider === window.evmAsk) walletName = 'EVM Ask';
      else walletName = 'EVM Wallet';
      
      console.log(`🔧 Using: ${walletName}`);
      
      try {
        // Request account access - this will trigger the wallet popup
        console.log(`🔧 Requesting accounts from ${walletName}...`);
        const accounts = await provider.request({
          method: 'eth_requestAccounts',
        });
        
        console.log('✅ Accounts received:', accounts);
        
        if (!accounts || accounts.length === 0) {
          throw new Error('No accounts found. Please unlock your wallet.');
        }
        
        console.log(`✅ Connected to ${walletName}:`, accounts[0]);
        
        // Store the provider globally for the service to use
        (window as any).__selectedProvider = provider;
        
        // Initialize the wallet service with the selected provider
        await simpleWalletService.connect();
        
        console.log('✅ Wallet service initialized');
        
        // Silent success - no popup
        
      } catch (error: any) {
        // User rejected the request
        if (error.code === 4001) {
          alert('❌ Connection rejected. Please approve the connection request in your wallet.');
        } else if (error.code === -32002) {
          alert('⏳ Connection request already pending. Please check your wallet extension.');
        } else {
          throw error;
        }
      }
      
    } catch (error: any) {
      console.error('❌ Connection failed:', error);
      alert(`❌ Connection failed: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDemoMode = () => {
    window.dispatchEvent(new CustomEvent('demoMode', {
      detail: { mode: 'demo' }
    }));
  };

  return (
    <div className="card-zama text-center max-w-lg mx-auto bg-white/80 backdrop-blur-sm shadow-xl">
      <div className="flex items-center justify-center w-16 h-16 bg-zama-black rounded-full mx-auto mb-6">
        <Shield className="w-8 h-8 text-zama-yellow" />
      </div>
      
      <h2 className="text-2xl font-bold text-zama-black mb-4">
        Confidential Task Manager
      </h2>
      <p className="text-zama-black text-opacity-80 mb-8">
        Connect your wallet to start managing encrypted tasks
      </p>

      {/* Wallet Selection */}
      <div className="space-y-3 mb-6">
        <button
          onClick={handleConnectWallet}
          disabled={isConnecting}
          className={`bg-zama-black hover:bg-zama-gray-800 text-zama-yellow font-bold py-4 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl w-full flex items-center justify-center space-x-3 text-lg ${
            isConnecting ? 'opacity-50' : ''
          }`}
        >
          <Wallet className="w-6 h-6" />
          <span>{isConnecting ? 'Connecting...' : 'Connect Wallet'}</span>
          {isConnecting && (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-zama-yellow"></div>
          )}
        </button>
      </div>

      {/* Demo Mode */}
      <div className="border-t border-zama-black border-opacity-20 pt-6">
        <button
          onClick={handleDemoMode}
          className="bg-zama-yellow hover:bg-zama-yellow-dark text-zama-black font-bold py-3 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl w-full flex items-center justify-center space-x-3"
        >
          <Zap className="w-5 h-5" />
          <span>Try Demo Mode</span>
        </button>
      </div>
    </div>
  );
}