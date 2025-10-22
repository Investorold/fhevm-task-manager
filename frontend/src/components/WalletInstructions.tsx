import { useState } from 'react';
import { Zap, AlertTriangle } from 'lucide-react';

export function WalletInstructions() {
  const [showInstructions, setShowInstructions] = useState(false);

  return (
    <div className="card max-w-2xl mx-auto mb-6">
      <div className="flex items-center space-x-3 mb-4">
        <AlertTriangle className="w-6 h-6 text-yellow-500" />
        <h3 className="text-lg font-semibold text-zama-gray-900">
          Wallet Extension Conflicts Detected
        </h3>
      </div>
      
      <p className="text-zama-gray-600 mb-4">
        You have multiple wallet extensions installed that are conflicting with each other.
      </p>
      
      <button
        onClick={() => setShowInstructions(!showInstructions)}
        className="btn-secondary mb-4"
      >
        {showInstructions ? 'Hide' : 'Show'} Instructions
      </button>
      
      {showInstructions && (
        <div className="bg-zama-gray-50 rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-zama-gray-900">Quick Fix:</h4>
          <ol className="list-decimal list-inside space-y-2 text-sm text-zama-gray-600">
            <li>Go to <code className="bg-zama-gray-200 px-1 rounded">chrome://extensions/</code></li>
            <li>Disable all wallet extensions except MetaMask</li>
            <li>Refresh this page</li>
            <li>Connect with MetaMask</li>
          </ol>
          
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-4">
            <p className="text-sm text-blue-800 mb-3">
              <strong>Alternative:</strong> Use Demo Mode to experience the app without wallet connection!
            </p>
            <button
              onClick={() => {
                window.dispatchEvent(new CustomEvent('demoMode', {
                  detail: { mode: 'demo' }
                }));
              }}
              className="bg-zama-yellow hover:bg-zama-yellow-dark text-zama-black font-bold py-2 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg flex items-center space-x-2"
            >
              <Zap className="w-4 h-4" />
              <span>Start Demo Mode</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
