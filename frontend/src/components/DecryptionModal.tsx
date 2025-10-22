import { useState } from 'react';
import { Shield, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface DecryptionModalProps {
  isOpen: boolean;
  taskTitle: string;
  onDecrypt: () => Promise<void>;
  onCancel: () => void;
  isDecrypting?: boolean;
}

export function DecryptionModal({ 
  isOpen, 
  taskTitle, 
  onDecrypt, 
  onCancel, 
  isDecrypting = false 
}: DecryptionModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-zama-yellow rounded-full flex items-center justify-center">
              <Shield className="w-5 h-5 text-zama-black" />
            </div>
            <h3 className="text-lg font-semibold text-zama-gray-900">
              Decrypt Task Data
            </h3>
          </div>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-zama-gray-700 mb-3">
            This task is encrypted on the blockchain. To view the decrypted content, you need to sign a transaction.
          </p>
          
          <div className="bg-zama-gray-50 rounded-lg p-3 border-l-4 border-zama-yellow">
            <p className="text-sm text-zama-gray-600 font-medium">
              "{taskTitle}"
            </p>
          </div>

          <div className="mt-4 space-y-2 text-sm text-zama-gray-600">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Verify ownership with wallet signature</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Pay gas fees for decryption operation</span>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span>Data remains encrypted for others</span>
            </div>
          </div>

          {isDecrypting && (
            <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                <span className="text-sm text-blue-800 font-medium">
                  Signing transaction and decrypting data...
                </span>
              </div>
              <p className="text-xs text-blue-600 mt-1">
                Please confirm the transaction in your wallet
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            disabled={isDecrypting}
            className="flex-1 bg-zama-gray-200 hover:bg-zama-gray-300 text-zama-gray-800 font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onDecrypt}
            disabled={isDecrypting}
            className="flex-1 bg-zama-yellow hover:bg-zama-yellow-dark text-zama-black font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {isDecrypting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Decrypting...</span>
              </>
            ) : (
              <>
                <Shield className="w-4 h-4" />
                <span>Sign & Decrypt</span>
              </>
            )}
          </button>
        </div>

        {/* Gas Fee Info */}
        <div className="mt-4 pt-3 border-t border-zama-gray-200">
          <p className="text-xs text-zama-gray-500 text-center">
            Estimated gas fee: ~0.001 ETH • Transaction will be recorded on-chain
          </p>
        </div>
      </div>
    </div>
  );
}
