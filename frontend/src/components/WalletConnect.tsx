import { useState } from 'react';
import { Wallet, Shield, Zap } from 'lucide-react';
import { walletService } from '../services/walletService';

export function WalletConnect() {
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await walletService.connectWallet();
    } catch (error) {
      console.error('Wallet connection failed:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="card-zama text-center">
      <div className="flex items-center justify-center w-20 h-20 bg-zama-black rounded-full mx-auto mb-6 shadow-lg">
        <Shield className="w-10 h-10 text-zama-yellow" />
      </div>
      
      <h2 className="text-3xl font-bold text-zama-black mb-3">
        FHEVM Task Manager
      </h2>
      <p className="text-zama-black text-opacity-80 mb-8 text-lg">
        Secure your tasks with FHEVM encryption. Your data stays private while being stored on-chain.
      </p>

      <div className="space-y-6">
        <button
          onClick={handleConnect}
          disabled={isConnecting}
          className="bg-zama-black hover:bg-zama-gray-800 text-zama-yellow font-bold py-4 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl w-full flex items-center justify-center space-x-3"
        >
          {isConnecting ? (
            <>
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-zama-yellow"></div>
              <span>Connecting...</span>
            </>
          ) : (
            <>
              <Wallet className="w-6 h-6" />
              <span>Connect MetaMask</span>
            </>
          )}
        </button>

        <div className="flex items-center justify-center space-x-6 text-zama-black font-semibold">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5" />
            <span>Encrypted Storage</span>
          </div>
          <div className="flex items-center space-x-2">
            <Zap className="w-5 h-5" />
            <span>FHEVM Powered</span>
          </div>
        </div>
      </div>

      <div className="mt-8 p-6 bg-zama-black bg-opacity-10 rounded-xl">
        <h3 className="font-bold text-zama-black mb-3 text-lg">What you'll get:</h3>
        <ul className="text-zama-black text-opacity-80 space-y-2">
          <li>• 🔒 Fully encrypted task storage</li>
          <li>• 👥 Share tasks with team members</li>
          <li>• 📊 Track due dates and priorities</li>
          <li>• 🛡️ Complete privacy protection</li>
        </ul>
      </div>
    </div>
  );
}
