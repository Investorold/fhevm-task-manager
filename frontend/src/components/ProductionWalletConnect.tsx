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
  const [selectedWallet, setSelectedWallet] = useState<WalletProvider | null>(null);

  useEffect(() => {
    detectWallets();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isOpen && !(event.target as Element).closest('.relative')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

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

    // Zerion Wallet
    if (window.ethereum?.isZerion) {
      wallets.push({
        name: 'Zerion',
        provider: window.ethereum,
        icon: '💎',
        isInstalled: true
      });
    } else if (window.zerionWallet) {
      wallets.push({
        name: 'Zerion',
        provider: window.zerionWallet,
        icon: '💎',
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

  const handleWalletSelect = (wallet: WalletProvider) => {
    setSelectedWallet(wallet);
    setIsOpen(false);
  };

  const handleConnectWallet = async () => {
    setIsConnecting(true);
    
    try {
      console.log('🔧 Connecting wallet...');
      
      // Use selected wallet if available, otherwise use universal detection
      let provider = null;
      let walletName = 'Unknown Wallet';
      
      // If a wallet is selected, use it
      if (selectedWallet) {
        console.log('🔧 Using selected wallet:', selectedWallet.name);
        provider = selectedWallet.provider;
        walletName = selectedWallet.name;
      } else if (availableWallets.length > 0) {
        // Use the first available wallet if none selected
        console.log('🔧 Using first available wallet:', availableWallets[0].name);
        provider = availableWallets[0].provider;
        walletName = availableWallets[0].name;
      } else {
        // Fallback to universal detection - Handle provider conflicts by using a stable reference
      const getStableProvider = () => {
        console.log('🔧 Detecting wallet providers...');
        console.log('🔧 window.ethereum:', !!window.ethereum);
        console.log('🔧 window.ethereum.providers:', window.ethereum?.providers?.length || 'none');
        console.log('🔧 window.evmAsk:', !!window.evmAsk);
        
        // If we already have a selected provider, use it
        if ((window as any).__selectedProvider) {
          console.log('🔧 Using cached provider');
          return (window as any).__selectedProvider;
        }
        
        // Check for multiple wallet providers
        if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
          console.log('🔧 Multiple wallets detected:', window.ethereum.providers.length);
          
          // Try to find MetaMask first, but use any available
          const selectedProvider = window.ethereum.providers.find((p: any) => p.isMetaMask) || window.ethereum.providers[0];
          
          console.log('🔧 Selected provider from array:', selectedProvider?.isMetaMask ? 'MetaMask' : 'Other');
          
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
        
        console.log('🔧 No wallet provider found');
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
      }
      
      try {
        // Request account access - this will trigger the wallet popup
        console.log(`🔧 Requesting accounts from ${walletName}...`);
        console.log(`🔧 Provider details:`, {
          isMetaMask: provider.isMetaMask,
          isCoinbaseWallet: provider.isCoinbaseWallet,
          isTrust: provider.isTrust,
          isRabby: provider.isRabby,
          selectedAddress: provider.selectedAddress
        });
        
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
        (window as any).__stableProvider = provider;
        
        // Initialize the wallet service with the selected provider
        await simpleWalletService.connect();
        
        console.log('✅ Wallet service initialized');
        
        // Show success message
        (window as any).addNotification?.({
          type: 'success',
          title: 'Wallet Connected',
          message: `Successfully connected to ${walletName}! Address: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
          duration: 4000
        });
        
      } catch (error: any) {
        console.error('❌ Wallet connection error:', error);
        
        // User rejected the request
        if (error.code === 4001) {
          (window as any).addNotification?.({
            type: 'error',
            title: 'Connection Rejected',
            message: 'Please approve the connection request in your wallet popup.',
            duration: 5000
          });
        } else if (error.code === -32002) {
          (window as any).addNotification?.({
            type: 'warning',
            title: 'Connection Pending',
            message: 'Please check your wallet extension and approve the request.',
            duration: 5000
          });
        } else if (error.message?.includes('User rejected')) {
          (window as any).addNotification?.({
            type: 'error',
            title: 'Connection Rejected',
            message: 'Please try again and approve the connection.',
            duration: 5000
          });
        } else {
          console.error('❌ Unexpected error:', error);
          (window as any).addNotification?.({
            type: 'error',
            title: 'Connection Failed',
            message: 'Please try refreshing the page or checking if your wallet is unlocked.',
            duration: 6000
          });
        }
      }
      
    } catch (error: any) {
      console.error('❌ Connection failed:', error);
      (window as any).addNotification?.({
        type: 'error',
        title: 'Connection Failed',
        message: error.message || 'Please try refreshing the page.',
        duration: 5000
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDemoMode = () => {
    // Set demo mode in localStorage and trigger app to enter demo mode
    localStorage.setItem('demoMode', 'true');
    window.location.reload(); // Reload to trigger demo mode
  };

  return (
    <div className="card-zama text-center max-w-lg mx-auto bg-white/80 backdrop-blur-sm shadow-xl">
      <div className="flex items-center justify-center w-16 h-16 bg-zama-black rounded-full mx-auto mb-6">
        <Shield className="w-8 h-8 text-zama-yellow" />
      </div>
      
      <h2 className="text-2xl font-bold text-zama-black mb-4">
        FHEVM Task Manager
      </h2>
      <p className="text-zama-black text-opacity-80 mb-8">
        Connect your wallet to start managing encrypted tasks
      </p>

      {/* Wallet Selection */}
      <div className="space-y-3 mb-6">
        {/* Show wallet selector if multiple wallets detected */}
        {availableWallets.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="bg-zama-gray-100 hover:bg-zama-gray-200 text-zama-black font-medium py-3 px-4 rounded-xl transition-all duration-200 w-full flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                {selectedWallet ? (
                  <>
                    <span className="text-xl">{selectedWallet.icon}</span>
                    <span>{selectedWallet.name}</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-5 h-5" />
                    <span>Select Wallet ({availableWallets.length})</span>
                  </>
                )}
              </div>
              <ChevronDown className={`w-5 h-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-zama-gray-300 rounded-xl shadow-xl z-50 max-h-64 overflow-y-auto">
                <div className="p-2">
                  <div className="text-xs text-zama-gray-500 font-medium mb-2 px-3">
                    Available Wallets ({availableWallets.length})
                  </div>
                  {availableWallets.map((wallet, index) => (
                    <button
                      key={index}
                      onClick={() => handleWalletSelect(wallet)}
                      className={`w-full flex items-center space-x-3 px-3 py-2.5 text-left hover:bg-zama-gray-50 rounded-lg transition-colors ${
                        selectedWallet?.name === wallet.name ? 'bg-zama-yellow/20' : ''
                      }`}
                    >
                      <span className="text-2xl">{wallet.icon}</span>
                      <span className="flex-1 font-medium text-zama-black">{wallet.name}</span>
                      {selectedWallet?.name === wallet.name && (
                        <Check className="w-5 h-5 text-zama-black" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Single wallet or connect button */}
        {availableWallets.length > 0 && (
        <button
          onClick={handleConnectWallet}
          disabled={isConnecting}
          className={`bg-zama-black hover:bg-zama-gray-800 text-zama-yellow font-bold py-4 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl w-full flex items-center justify-center space-x-3 text-lg ${
              isConnecting ? 'opacity-50 cursor-not-allowed' : ''
          }`}
        >
            {selectedWallet ? (
              <span className="text-2xl">{selectedWallet.icon}</span>
            ) : (
          <Wallet className="w-6 h-6" />
            )}
            <span>
              {isConnecting
                ? 'Connecting...'
                : selectedWallet
                ? `Connect ${selectedWallet.name}`
                : availableWallets.length === 1
                ? `Connect ${availableWallets[0].name}`
                : 'Connect Wallet'}
            </span>
          {isConnecting && (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-zama-yellow"></div>
          )}
        </button>
        )}

        {/* No wallets detected message */}
        {availableWallets.length === 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
            <div className="flex items-center space-x-2 text-yellow-800 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <span className="font-medium">No Wallet Detected</span>
            </div>
            <p className="text-yellow-700 text-sm">
              Please install a compatible wallet like{' '}
              <a
                href="https://metamask.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-yellow-900"
              >
                MetaMask
              </a>
              ,{' '}
              <a
                href="https://zerion.io/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-yellow-900"
              >
                Zerion
              </a>
              , or{' '}
              <a
                href="https://trustwallet.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-yellow-900"
              >
                Trust Wallet
              </a>
              .
            </p>
          </div>
        )}
        
        {/* Refresh Button */}
        <button
          onClick={() => {
            console.log('🔄 Refreshing wallet detection...');
            // Clear cached providers
            delete (window as any).__selectedProvider;
            delete (window as any).__stableProvider;
            setSelectedWallet(null);
            detectWallets();
            (window as any).addNotification?.({
              type: 'info',
              title: 'Connection Refreshed',
              message: 'Wallet detection refreshed! Try connecting again.',
              duration: 3000
            });
          }}
          className="bg-zama-gray-200 hover:bg-zama-gray-300 text-zama-black font-medium py-2 px-4 rounded-lg transition-all duration-200 w-full text-sm"
        >
          🔄 Refresh Connection
        </button>
      </div>

      {/* Demo Mode - Try Before Connecting */}
      <div className="border-t border-zama-black border-opacity-20 pt-6">
        <div className="text-center mb-4">
          <p className="text-zama-black text-opacity-70 text-sm mb-2">
            Want to try it first? Experience the full app without connecting your wallet
          </p>
        </div>
        <button
          onClick={handleDemoMode}
          className="bg-zama-yellow hover:bg-zama-yellow-dark text-zama-black font-bold py-3 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl w-full flex items-center justify-center space-x-3 mb-3"
        >
          <Zap className="w-5 h-5" />
          <span>Try Demo Mode</span>
        </button>
        <p className="text-zama-black text-opacity-50 text-xs">
          Demo tasks are temporary and will disappear when you refresh
        </p>
      </div>
    </div>
  );
}