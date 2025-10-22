import { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import { ProductionWalletConnect } from './components/ProductionWalletConnect';
import { TaskManager } from './components/TaskManager';
import { Header } from './components/Header';
import { realContractService } from './services/realContractService';
import { simpleWalletService } from './services/simpleWalletService';
import { fhevmService } from './services/fhevmService';
import type { WalletState } from './types';

function App() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  // Real deployed contract address from Termius
  const [contractAddress, setContractAddress] = useState('0x30182D50035E926e5Ab728561070e1ba2c14B2A1');

  useEffect(() => {
    // Try to restore persisted wallet connection on page load
    const restoreConnection = async () => {
      console.log('🔄 Checking for persisted wallet connection...');
      const restored = await simpleWalletService.loadPersistedConnection();
      
      if (restored) {
        console.log('✅ Wallet connection restored from localStorage');
        setWalletConnected(true);
        setWalletAddress(simpleWalletService.getAddress());
      } else {
        console.log('ℹ️ No persisted connection found');
      }
    };

    restoreConnection();

    // Check wallet connection status periodically
    const checkWalletConnection = () => {
      const connected = simpleWalletService.isWalletConnected();
      const address = simpleWalletService.getAddress();
      
      console.log('🔍 Wallet check:', { connected, address });
      console.log('🔍 Window.ethereum available:', !!window.ethereum);
      console.log('🔍 SimpleWalletService state:', {
        isConnected: simpleWalletService.isWalletConnected(),
        address: simpleWalletService.getAddress(),
        provider: !!simpleWalletService.getProvider(),
        signer: !!simpleWalletService.getSigner()
      });
      
      setWalletConnected(connected);
      setWalletAddress(address);
      
      if (connected) {
        console.log('✅ Wallet is connected:', address);
      }
    };

    // Check every 2 seconds
    const interval = setInterval(checkWalletConnection, 2000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  // Initialize contract service and FHEVM when wallet connects
  useEffect(() => {
    console.log('🔍 useEffect triggered - walletConnected:', walletConnected);
    if (walletConnected) {
      console.log('✅ Wallet connected, initializing services...');
      console.log('🔍 Wallet address:', walletAddress);
      console.log('🔍 Contract address:', contractAddress);
      
      // Add a small delay to ensure wallet is fully ready
      setTimeout(() => {
        console.log('🚀 Initializing contract service after delay...');
        realContractService.initialize(contractAddress);
      }, 1000);
      
      // Initialize FHEVM in background
      const initFHEVM = async () => {
        try {
          console.log('🔒 Starting FHEVM initialization...');
          await fhevmService.initialize();
          console.log('✅ FHEVM initialized successfully!');
        } catch (error) {
          console.error('❌ FHEVM initialization failed:', error);
          console.log('⚠️ App will continue without FHEVM encryption');
        }
      };
      
      initFHEVM();
    }
  }, [walletConnected, contractAddress]);

  const handleDisconnect = () => {
    simpleWalletService.disconnect();
    setWalletConnected(false);
    setWalletAddress('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {!walletConnected ? (
          <ProductionWalletConnect />
        ) : (
          <div className="space-y-8">
            {/* Wallet Status */}
            <div className="card max-w-2xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-zama-gray-900">Wallet Connected</h2>
                  <p className="text-sm text-zama-gray-600">
                    {walletAddress?.slice(0, 6)}...{walletAddress?.slice(-4)}
                  </p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-sm text-zama-gray-600">
                      Ready
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      simpleWalletService.disconnect();
                      setWalletConnected(false);
                      setWalletAddress('');
                    }}
                    className="btn-secondary text-sm"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            </div>

            {/* User-Friendly Connection Status */}
            <div className="card max-w-2xl mx-auto text-center">
              <div className="flex items-center justify-center space-x-2 mb-4">
                <Shield className="w-6 h-6 text-zama-yellow" />
                <h3 className="text-lg font-semibold text-zama-gray-900">
                  🔒 Connected to Secure Task Manager
                </h3>
              </div>
              <p className="text-zama-gray-600 mb-4">
                Experience the power of confidential task management with FHEVM encryption.
                This demo shows how your tasks would be encrypted and stored securely!
              </p>
              <div className="bg-zama-gray-50 rounded-lg p-3">
                <p className="text-sm text-zama-gray-500">
                  🧪 Demo Mode: Simulated encrypted storage
                </p>
                <p className="text-sm text-zama-gray-500">
                  ✅ Encryption: FHEVM mock protection
                </p>
                <p className="text-sm text-zama-gray-500">
                  ✅ Privacy: Your data stays confidential
                </p>
              </div>
            </div>

            {/* Task Manager */}
            {walletConnected && (
              <TaskManager />
            )}

            {/* Loading State */}
            {isInitializing && (
              <div className="card max-w-2xl mx-auto text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zama-yellow mx-auto mb-4"></div>
                <p className="text-zama-gray-600">Initializing FHEVM...</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
