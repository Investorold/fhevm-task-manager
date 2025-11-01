import { Shield, Zap, Wallet, LogOut } from 'lucide-react';
import { simpleWalletService } from '../services/simpleWalletService';
import { useState, useEffect } from 'react';

interface HeaderProps {
  onDisconnect?: () => void;
  encryptedOnly?: boolean;
  onToggleEncryptedOnly?: () => void;
  showEncryptedToggle?: boolean;
  isWalletConnected?: boolean;
}

export function Header({ onDisconnect, encryptedOnly = false, onToggleEncryptedOnly, showEncryptedToggle = false, isWalletConnected }: HeaderProps) {
  const [walletState, setWalletState] = useState({
    isConnected: false,
    walletName: '',
    walletAddress: ''
  });

  useEffect(() => {
    // Cache previous values to avoid unnecessary state updates
    let prevState = { isConnected: false, walletName: '', walletAddress: '' };

    const updateWalletState = () => {
      try {
        const isConnected = simpleWalletService.isWalletConnected();
        const walletName = simpleWalletService.getWalletName();
        const walletAddress = simpleWalletService.getAddress();
        
        // Only update if state actually changed
        const newState = {
          isConnected,
          walletName: walletName || '',
          walletAddress: walletAddress || ''
        };

        if (
          newState.isConnected !== prevState.isConnected ||
          newState.walletName !== prevState.walletName ||
          newState.walletAddress !== prevState.walletAddress
        ) {
          prevState = newState;
          setWalletState(newState);
        }
      } catch (error) {
        console.log('Header: Wallet service not ready yet');
        if (!prevState.isConnected) {
        setWalletState({
          isConnected: false,
          walletName: '',
          walletAddress: ''
        });
        }
      }
    };

    // Update wallet state immediately
    updateWalletState();

    // Set up interval to check for wallet changes (reduced frequency from 1s to 3s)
    const interval = setInterval(updateWalletState, 3000);

    // Listen for wallet events (accountsChanged) for immediate updates
    const handleAccountsChanged = () => {
      updateWalletState();
    };

    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
    }

    // Cleanup on unmount
    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined' && window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      }
    };
  }, []);

  useEffect(() => {
    if (typeof isWalletConnected === 'boolean' && !isWalletConnected) {
      setWalletState(prev => (
        prev.isConnected
          ? { isConnected: false, walletName: '', walletAddress: '' }
          : prev
      ));
    }
  }, [isWalletConnected]);
  const effectiveConnection = typeof isWalletConnected === 'boolean' ? isWalletConnected : walletState.isConnected;

  return (
    <header className="bg-gradient-to-r from-zama-yellow to-zama-yellow-light shadow-lg border-b-4 border-zama-yellow-dark">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center justify-center w-12 h-12 bg-zama-black rounded-xl shadow-lg">
              <Shield className="w-7 h-7 text-zama-yellow" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-zama-black">
                Confidential Task Manager
              </h1>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {effectiveConnection && (
              <div className="flex items-center space-x-3">
                {walletState.walletAddress && (
                  <div className="text-sm text-zama-black font-mono bg-zama-gray-100 px-2 py-1 rounded">
                    {walletState.walletAddress.slice(0, 6)}...{walletState.walletAddress.slice(-4)}
                  </div>
                )}
                {onDisconnect && (
                  <button
                    onClick={onDisconnect}
                    className="flex items-center space-x-2 bg-red-100 text-red-800 hover:bg-red-200 px-3 py-2 rounded-lg transition-colors"
                    title="Disconnect Wallet"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm font-medium">Disconnect</span>
                  </button>
                )}
              </div>
            )}
            
            {showEncryptedToggle && (
              <button
                onClick={onToggleEncryptedOnly}
                className={`flex items-center space-x-2 font-semibold px-3 py-2 rounded-lg transition-colors ${encryptedOnly ? 'bg-zama-black text-zama-yellow hover:bg-zama-gray-800' : 'text-zama-black bg-zama-gray-100 hover:bg-zama-gray-200'}`}
                title="Toggle task filter"
              >
              <Zap className="w-5 h-5" />
                <span>{encryptedOnly ? 'Encrypted' : 'All Tasks'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
