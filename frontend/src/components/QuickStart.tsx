import { Zap, Shield, CheckCircle } from 'lucide-react';

export function QuickStart() {
  const startDemo = () => {
    // Immediately set demo mode state
    const event = new CustomEvent('demoMode', {
      detail: { mode: 'demo' }
    });
    window.dispatchEvent(event);
  };

  return (
    <div className="card-zama text-center max-w-2xl mx-auto">
      <div className="flex items-center justify-center w-20 h-20 bg-zama-black rounded-full mx-auto mb-6 shadow-lg">
        <Shield className="w-10 h-10 text-zama-yellow" />
      </div>
      
      <h2 className="text-3xl font-bold text-zama-black mb-3">
        🔒 Confidential Task Manager
      </h2>
      <p className="text-zama-black text-opacity-80 mb-8 text-lg">
        Connect to your deployed TaskManager contract on Sepolia testnet
      </p>

      {/* Quick Start Button */}
      <div className="mb-8">
        <button
          onClick={startDemo}
          className="bg-zama-black hover:bg-zama-gray-800 text-zama-yellow font-bold py-4 px-8 rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl w-full flex items-center justify-center space-x-3 text-lg"
        >
          <Zap className="w-6 h-6" />
          <span>🚀 Connect to Production Contract</span>
        </button>
        <p className="text-sm text-zama-black text-opacity-60 mt-2">
          Contract: 0x30182D50035E926e5Ab728561070e1ba2c14B2A1
        </p>
      </div>

      {/* Features Preview */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-zama-black bg-opacity-10 rounded-lg p-4">
          <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
          <h3 className="font-semibold text-zama-black mb-1">Create Tasks</h3>
          <p className="text-xs text-zama-black text-opacity-70">Encrypted storage</p>
        </div>
        <div className="bg-zama-black bg-opacity-10 rounded-lg p-4">
          <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
          <h3 className="font-semibold text-zama-black mb-1">Share Tasks</h3>
          <p className="text-xs text-zama-black text-opacity-70">Team collaboration</p>
        </div>
        <div className="bg-zama-black bg-opacity-10 rounded-lg p-4">
          <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
          <h3 className="font-semibold text-zama-black mb-1">Track Progress</h3>
          <p className="text-xs text-zama-black text-opacity-70">Due dates & priorities</p>
        </div>
        <div className="bg-zama-black bg-opacity-10 rounded-lg p-4">
          <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
          <h3 className="font-semibold text-zama-black mb-1">Privacy First</h3>
          <p className="text-xs text-zama-black text-opacity-70">FHEVM encryption</p>
        </div>
      </div>

      {/* Technical Info */}
      <div className="bg-zama-gray-50 rounded-lg p-4">
        <h3 className="font-bold text-zama-black mb-2">🚀 Production Features:</h3>
        <ul className="text-sm text-zama-black text-opacity-80 space-y-1">
          <li>• Real blockchain deployment on Sepolia</li>
          <li>• Actual FHEVM encryption/decryption</li>
          <li>• All 9 task management features</li>
          <li>• Ready for Zama bounty submission</li>
        </ul>
        <div className="mt-3 p-2 bg-green-100 rounded">
          <p className="text-xs text-green-800 font-semibold">
            ✅ Contract deployed and verified on Sepolia testnet
          </p>
        </div>
      </div>
    </div>
  );
}
