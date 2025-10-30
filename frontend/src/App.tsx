import { useState, useEffect } from 'react';
import { ProductionWalletConnect } from './components/ProductionWalletConnect';
import { TaskManager } from './components/TaskManager';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { NotificationContainer } from './components/NotificationContainer';
import { realContractService } from './services/realContractService';
import { simpleWalletService } from './services/simpleWalletService';
import { fhevmService } from './services/fhevmService';
import { getContractAddress } from './config/contract';

function App() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState('');
  const [isInitializing] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  // UI filter: All Tasks vs Encrypted Only
  const [encryptedOnly, setEncryptedOnly] = useState(false);
  // Real deployed contract address from config
  const contractAddress = getContractAddress();

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

  // Check for demo mode on page load
  useEffect(() => {
    const demoMode = localStorage.getItem('demoMode');
    if (demoMode === 'true') {
      console.log('🎮 Demo mode detected from localStorage');
      setIsDemoMode(true);
      // Clear the demo mode flag so it doesn't persist
      localStorage.removeItem('demoMode');
    }
  }, []);

  // Initialize contract service and FHEVM when wallet connects
  useEffect(() => {
    console.log('🔍 useEffect triggered - walletConnected:', walletConnected);
    if (walletConnected) {
      console.log('✅ Wallet connected, initializing services...');
      console.log('🔍 Wallet address:', walletAddress);
      console.log('🔍 Contract address:', contractAddress);
      
      // Add a small delay to ensure wallet is fully ready (reduced for faster UX)
      setTimeout(() => {
        if (!isDemoMode) {
          console.log('🚀 Initializing contract service after delay...');
          realContractService.initialize(contractAddress);
        } else {
          console.log('🎮 Demo mode: Skipping wallet service initialization');
        }
      }, 500); // Reduced from 1000ms to 500ms
      
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

  const handleToggleEncryptedOnly = () => {
    setEncryptedOnly(prev => !prev);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-gray-100 flex flex-col">
      <Header onDisconnect={handleDisconnect} encryptedOnly={encryptedOnly} onToggleEncryptedOnly={handleToggleEncryptedOnly} showEncryptedToggle={walletConnected && !isDemoMode} />
      
      <main className="container mx-auto px-4 py-8 flex-1">
        {!walletConnected && !isDemoMode ? (
          <ProductionWalletConnect />
        ) : (
          <div className="space-y-8">

            {/* Main Task Manager - No extra text needed */}

            {/* Task Manager */}
            {(walletConnected || isDemoMode) && (
              <TaskManager externalDemoMode={isDemoMode} encryptedOnly={encryptedOnly} />
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
      
      <Footer />
      <NotificationContainer />
    </div>
  );
}

export default App;
