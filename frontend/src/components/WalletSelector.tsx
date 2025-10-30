import React, { useState, useEffect } from 'react';
import { Wallet, ChevronDown, Check } from 'lucide-react';

interface WalletInfo {
  name: string;
  icon: string;
  provider: any;
  isInstalled: boolean;
}

interface WalletSelectorProps {
  onWalletSelect: (wallet: WalletInfo) => void;
  isConnecting: boolean;
}

export function WalletSelector({ onWalletSelect, isConnecting }: WalletSelectorProps) {
  const [availableWallets, setAvailableWallets] = useState<WalletInfo[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    detectWallets();
  }, []);

  const detectWallets = () => {
    const wallets: WalletInfo[] = [];

    // MetaMask
    if (window.ethereum?.isMetaMask) {
      wallets.push({
        name: 'MetaMask',
        icon: '🦊',
        provider: window.ethereum,
        isInstalled: true
      });
    }

    // Trust Wallet
    if (window.ethereum?.isTrust) {
      wallets.push({
        name: 'Trust Wallet',
        icon: '🔒',
        provider: window.ethereum,
        isInstalled: true
      });
    }

    // Rabby Wallet
    if (window.ethereum?.isRabby) {
      wallets.push({
        name: 'Rabby Wallet',
        icon: '🐰',
        provider: window.ethereum,
        isInstalled: true
      });
    }

    // Nightly Wallet
    // @ts-ignore - nightly wallet type not defined
    if ((window as any).nightly) {
      wallets.push({
        name: 'Nightly Wallet',
        icon: '🌙',
        // @ts-ignore - nightly wallet type not defined
        provider: (window as any).nightly,
        isInstalled: true
      });
    }

    // Coinbase Wallet
    if (window.ethereum?.isCoinbaseWallet) {
      wallets.push({
        name: 'Coinbase Wallet',
        icon: '🔵',
        provider: window.ethereum,
        isInstalled: true
      });
    }

    // EVM Ask
    if (window.ethereum?.isEVMAsk) {
      wallets.push({
        name: 'EVM Ask',
        icon: '❓',
        provider: window.ethereum,
        isInstalled: true
      });
    }

    // Generic Ethereum provider
    if (window.ethereum && wallets.length === 0) {
      wallets.push({
        name: 'Ethereum Wallet',
        icon: '⚡',
        provider: window.ethereum,
        isInstalled: true
      });
    }

    setAvailableWallets(wallets);
  };

  const handleWalletSelect = (wallet: WalletInfo) => {
    onWalletSelect(wallet);
    setIsOpen(false);
  };

  if (availableWallets.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center space-x-2 text-red-800">
          <Wallet className="w-5 h-5" />
          <span className="font-medium">No Wallet Detected</span>
        </div>
        <p className="text-red-600 text-sm mt-2">
          Please install a compatible wallet like MetaMask, Trust Wallet, or Rabby.
        </p>
      </div>
    );
  }

  if (availableWallets.length === 1) {
    return (
      <button
        onClick={() => handleWalletSelect(availableWallets[0])}
        disabled={isConnecting}
        className="btn-primary w-full flex items-center justify-center space-x-2"
      >
        {isConnecting ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-zama-black"></div>
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <span className="text-lg">{availableWallets[0].icon}</span>
            <span>Connect {availableWallets[0].name}</span>
          </>
        )}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isConnecting}
        className="btn-primary w-full flex items-center justify-between"
      >
        <div className="flex items-center space-x-2">
          <Wallet className="w-5 h-5" />
          <span>{isConnecting ? 'Connecting...' : 'Choose Wallet'}</span>
        </div>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-zama-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-2">
            <div className="text-xs text-zama-gray-500 font-medium mb-2 px-2">
              Available Wallets
            </div>
            {availableWallets.map((wallet, index) => (
              <button
                key={index}
                onClick={() => handleWalletSelect(wallet)}
                className="w-full flex items-center space-x-3 px-3 py-2 text-left hover:bg-zama-gray-50 rounded-md transition-colors"
              >
                <span className="text-lg">{wallet.icon}</span>
                <span className="flex-1 font-medium text-zama-black">{wallet.name}</span>
                <Check className="w-4 h-4 text-zama-yellow" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}