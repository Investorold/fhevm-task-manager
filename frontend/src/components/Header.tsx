import { Shield, Zap, Wallet, LogOut } from 'lucide-react';
import { simpleWalletService } from '../services/simpleWalletService';
import { useState, useEffect } from 'react';

interface HeaderProps {
  onDisconnect?: () => void;
}

export function Header({ onDisconnect }: HeaderProps) {
  const [walletState, setWalletState] = useState({
    isConnected: false,
    walletName: '',
    walletAddress: ''
  });

  useEffect(() => {
    const updateWalletState = () => {
      try {
        const isConnected = simpleWalletService.isWalletConnected();
        const walletName = simpleWalletService.getWalletName();
        const walletAddress = simpleWalletService.getWalletAddress();
        
        setWalletState({
          isConnected,
          walletName: walletName || '',
          walletAddress: walletAddress || ''
        });
      } catch (error) {
        console.log('Header: Wallet service not ready yet');
        setWalletState({
          isConnected: false,
          walletName: '',
          walletAddress: ''
        });
      }
    };

    // Update wallet state immediately
    updateWalletState();

    // Set up interval to check for wallet changes
    const interval = setInterval(updateWalletState, 1000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, []);
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
              <p className="text-zama-black text-opacity-80 font-medium">
                Powered by Zama FHEVM
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {walletState.isConnected && (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-3 py-2 rounded-lg">
                  <Wallet className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {walletState.walletName} Connected
                  </span>
                </div>
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
            
            <div className="flex items-center space-x-3 text-zama-black font-semibold">
              <Zap className="w-5 h-5" />
              <span>Encrypted Tasks</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
