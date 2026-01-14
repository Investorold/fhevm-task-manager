import { useState, useEffect } from 'react';
import { Wallet, Shield, Zap, AlertTriangle, ChevronDown, Check, Smartphone } from 'lucide-react';
import { simpleWalletService } from '../services/simpleWalletService';
import EthereumProvider from '@walletconnect/ethereum-provider';

interface WalletProvider {
  name: string;
  provider: any;
  icon: string;
  isInstalled: boolean;
  isWalletConnect?: boolean;
}

// WalletConnect Project ID - Get yours at https://cloud.walletconnect.com
const WALLETCONNECT_PROJECT_ID = 'c4f79cc821944d9680842e34466bfb';

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
    const addedProviders = new Set<any>(); // Track unique providers

    // Helper to identify and add a provider
    const identifyAndAddProvider = (provider: any) => {
      if (!provider || addedProviders.has(provider)) return;

      // Check specific wallet types (order matters - check specific first)
      if (provider.isRabby) {
        wallets.push({
          name: 'Rabby Wallet',
          provider: provider,
          icon: '🐰',
          isInstalled: true
        });
        addedProviders.add(provider);
      } else if (provider.isCoinbaseWallet) {
        wallets.push({
          name: 'Coinbase Wallet',
          provider: provider,
          icon: '🔵',
          isInstalled: true
        });
        addedProviders.add(provider);
      } else if (provider.isTrust) {
        wallets.push({
          name: 'Trust Wallet',
          provider: provider,
          icon: '🔒',
          isInstalled: true
        });
        addedProviders.add(provider);
      } else if (provider.isBraveWallet) {
        wallets.push({
          name: 'Brave Wallet',
          provider: provider,
          icon: '🦁',
          isInstalled: true
        });
        addedProviders.add(provider);
      } else if (provider.isRainbow) {
        wallets.push({
          name: 'Rainbow',
          provider: provider,
          icon: '🌈',
          isInstalled: true
        });
        addedProviders.add(provider);
      } else if (provider.isZerion) {
        wallets.push({
          name: 'Zerion',
          provider: provider,
          icon: '💎',
          isInstalled: true
        });
        addedProviders.add(provider);
      } else if (provider.isFrame) {
        wallets.push({
          name: 'Frame',
          provider: provider,
          icon: '🖼️',
          isInstalled: true
        });
        addedProviders.add(provider);
      } else if (provider.isTokenPocket) {
        wallets.push({
          name: 'TokenPocket',
          provider: provider,
          icon: '🎒',
          isInstalled: true
        });
        addedProviders.add(provider);
      } else if (provider.isBitgetWallet) {
        wallets.push({
          name: 'Bitget Wallet',
          provider: provider,
          icon: '🟡',
          isInstalled: true
        });
        addedProviders.add(provider);
      } else if (provider.isMathWallet) {
        wallets.push({
          name: 'Math Wallet',
          provider: provider,
          icon: '📐',
          isInstalled: true
        });
        addedProviders.add(provider);
      } else if (provider.isSafePal) {
        wallets.push({
          name: 'SafePal',
          provider: provider,
          icon: '🛡️',
          isInstalled: true
        });
        addedProviders.add(provider);
      } else if (provider.isMetaMask) {
        // MetaMask check LAST (many wallets set isMetaMask for compatibility)
        wallets.push({
          name: 'MetaMask',
          provider: provider,
          icon: '🦊',
          isInstalled: true
        });
        addedProviders.add(provider);
      }
    };

    // Check for multiple providers array (EIP-6963 style)
    if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
      console.log('🔍 Multiple providers detected:', window.ethereum.providers.length);
      window.ethereum.providers.forEach((provider: any) => {
        identifyAndAddProvider(provider);
      });
    } else if (window.ethereum) {
      // Single provider
      identifyAndAddProvider(window.ethereum);
    }

    // Check for standalone wallet objects
    if (window.okxwallet && !addedProviders.has(window.okxwallet)) {
      wallets.push({
        name: 'OKX Wallet',
        provider: window.okxwallet,
        icon: '⭕',
        isInstalled: true
      });
      addedProviders.add(window.okxwallet);
    }

    if (window.phantom?.ethereum && !addedProviders.has(window.phantom.ethereum)) {
      wallets.push({
        name: 'Phantom',
        provider: window.phantom.ethereum,
        icon: '👻',
        isInstalled: true
      });
      addedProviders.add(window.phantom.ethereum);
    }

    if (window.zerionWallet && !addedProviders.has(window.zerionWallet)) {
      wallets.push({
        name: 'Zerion',
        provider: window.zerionWallet,
        icon: '💎',
        isInstalled: true
      });
      addedProviders.add(window.zerionWallet);
    }

    if (window.evmAsk && !addedProviders.has(window.evmAsk)) {
      wallets.push({
        name: 'EVM Ask',
        provider: window.evmAsk,
        icon: '❓',
        isInstalled: true
      });
      addedProviders.add(window.evmAsk);
    }

    // Generic fallback if nothing detected
    if (wallets.length === 0 && window.ethereum) {
      wallets.push({
        name: 'Ethereum Wallet',
        provider: window.ethereum,
        icon: '⚡',
        isInstalled: true
      });
    }

    // WalletConnect - ALWAYS available (works with any mobile wallet)
    wallets.push({
      name: 'WalletConnect',
      provider: null, // Will be created on demand
      icon: '📱',
      isInstalled: true,
      isWalletConnect: true
    });

    console.log('🔍 Detected wallets:', wallets.map(w => w.name));
    setAvailableWallets(wallets);
  };

  // Initialize WalletConnect provider
  const initWalletConnect = async (): Promise<any> => {
    try {
      const wcProvider = await EthereumProvider.init({
        projectId: WALLETCONNECT_PROJECT_ID,
        chains: [11155111], // Sepolia
        optionalChains: [1, 137, 56, 42161], // Mainnet, Polygon, BSC, Arbitrum
        showQrModal: true,
        methods: ['eth_sendTransaction', 'personal_sign', 'eth_signTypedData_v4'],
        events: ['chainChanged', 'accountsChanged', 'disconnect'],
        metadata: {
          name: 'FHEVM Task Manager',
          description: 'Secure encrypted task management powered by FHEVM',
          url: window.location.origin,
          icons: ['https://avatars.githubusercontent.com/u/37784886']
        }
      });

      return wcProvider;
    } catch (error) {
      console.error('Failed to initialize WalletConnect:', error);
      throw error;
    }
  };

  const handleWalletSelect = (wallet: WalletProvider) => {
    setSelectedWallet(wallet);
    setIsOpen(false);
  };

  const handleConnectWallet = async () => {
    setIsConnecting(true);

    try {
      console.log('🔧 Connecting wallet...');

      let provider = null;
      let walletName = 'Unknown Wallet';
      const walletToUse = selectedWallet || (availableWallets.length > 0 ? availableWallets[0] : null);

      if (!walletToUse) {
        throw new Error('No wallet available. Please install a wallet or use WalletConnect.');
      }

      // Handle WalletConnect separately
      if (walletToUse.isWalletConnect) {
        console.log('🔗 Initializing WalletConnect...');
        walletName = 'WalletConnect';

        try {
          provider = await initWalletConnect();

          // Connect and show QR modal
          console.log('🔗 Showing WalletConnect QR modal...');
          await provider.connect();

          const accounts = await provider.request({ method: 'eth_accounts' });
          console.log('✅ WalletConnect accounts:', accounts);

          if (!accounts || accounts.length === 0) {
            throw new Error('No accounts found from WalletConnect.');
          }

          // Store provider globally
          (window as any).__selectedProvider = provider;
          (window as any).__stableProvider = provider;
          (window as any).__isWalletConnect = true;

          // Initialize wallet service
          await simpleWalletService.connect();

          (window as any).addNotification?.({
            type: 'success',
            title: 'Wallet Connected',
            message: `Connected via WalletConnect! Address: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
            duration: 4000
          });

          return;
        } catch (wcError: any) {
          console.error('❌ WalletConnect error:', wcError);
          if (wcError.message?.includes('User rejected') || wcError.message?.includes('Connection request reset')) {
            (window as any).addNotification?.({
              type: 'error',
              title: 'Connection Cancelled',
              message: 'WalletConnect connection was cancelled.',
              duration: 4000
            });
          } else {
            (window as any).addNotification?.({
              type: 'error',
              title: 'WalletConnect Failed',
              message: wcError.message || 'Failed to connect via WalletConnect.',
              duration: 5000
            });
          }
          return;
        }
      }

      // Handle browser extension wallets
      console.log('🔧 Using selected wallet:', walletToUse.name);
      provider = walletToUse.provider;
      walletName = walletToUse.name;

      // If provider is still null, use fallback detection
      if (!provider) {
        // Handle multiple providers - find the specific one for selected wallet
        if (window.ethereum?.providers && Array.isArray(window.ethereum.providers)) {
          console.log('🔧 Multiple wallets detected, finding:', walletToUse.name);

          // Find provider matching the selected wallet
          if (walletToUse.name === 'MetaMask') {
            provider = window.ethereum.providers.find((p: any) => p.isMetaMask);
          } else if (walletToUse.name === 'Rabby Wallet') {
            provider = window.ethereum.providers.find((p: any) => p.isRabby);
          } else if (walletToUse.name === 'Coinbase Wallet') {
            provider = window.ethereum.providers.find((p: any) => p.isCoinbaseWallet);
          } else if (walletToUse.name === 'Trust Wallet') {
            provider = window.ethereum.providers.find((p: any) => p.isTrust);
          } else if (walletToUse.name === 'Brave Wallet') {
            provider = window.ethereum.providers.find((p: any) => p.isBraveWallet);
          } else {
            // Default to first provider
            provider = window.ethereum.providers[0];
          }
        } else if (window.ethereum) {
          provider = window.ethereum;
        } else if (window.evmAsk) {
          provider = window.evmAsk;
        }
      }

      if (!provider) {
        throw new Error('Could not find wallet provider. Please try WalletConnect instead.');
      }

      console.log(`🔧 Using provider for: ${walletName}`);

      try {
        // Request account access
        console.log(`🔧 Requesting accounts from ${walletName}...`);

        const accounts = await provider.request({
          method: 'eth_requestAccounts',
        });

        console.log('✅ Accounts received:', accounts);

        if (!accounts || accounts.length === 0) {
          throw new Error('No accounts found. Please unlock your wallet.');
        }

        console.log(`✅ Connected to ${walletName}:`, accounts[0]);

        // Store the provider globally
        (window as any).__selectedProvider = provider;
        (window as any).__stableProvider = provider;
        (window as any).__isWalletConnect = false;

        // Initialize the wallet service
        await simpleWalletService.connect();

        console.log('✅ Wallet service initialized');

        (window as any).addNotification?.({
          type: 'success',
          title: 'Wallet Connected',
          message: `Successfully connected to ${walletName}! Address: ${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`,
          duration: 4000
        });

      } catch (error: any) {
        console.error('❌ Wallet connection error:', error);

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
          (window as any).addNotification?.({
            type: 'error',
            title: 'Connection Failed',
            message: 'Please try refreshing the page or use WalletConnect.',
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
        {/* Always show wallet selector if wallets detected */}
        {availableWallets.length >= 1 && (
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