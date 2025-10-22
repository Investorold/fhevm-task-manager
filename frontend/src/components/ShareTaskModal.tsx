import { useState } from 'react';
import { X, Share2, User, AlertCircle } from 'lucide-react';

interface ShareTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskId: number;
  taskTitle: string;
  onShare: (recipientAddress: string) => Promise<void>;
}

export function ShareTaskModal({ isOpen, onClose, taskId, taskTitle, onShare }: ShareTaskModalProps) {
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [error, setError] = useState('');

  const handleShare = async () => {
    if (!recipientAddress.trim()) {
      setError('Please enter a recipient address');
      return;
    }

    // Basic address validation
    if (!recipientAddress.startsWith('0x') || recipientAddress.length !== 42) {
      setError('Please enter a valid Ethereum address (0x...)');
      return;
    }

    setIsSharing(true);
    setError('');

    try {
      await onShare(recipientAddress);
      setRecipientAddress('');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to share task');
    } finally {
      setIsSharing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <Share2 className="w-5 h-5 text-zama-yellow" />
            <h3 className="text-lg font-semibold text-zama-gray-900">Share Task</h3>
          </div>
          <button
            onClick={onClose}
            className="text-zama-gray-400 hover:text-zama-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-zama-gray-600 mb-2">
            Sharing task: <span className="font-medium">{taskTitle}</span>
          </p>
          <p className="text-xs text-zama-gray-500">
            The recipient will be able to decrypt and view this task. Only the specified wallet address can access it.
          </p>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-zama-gray-700 mb-2">
            Recipient Wallet Address
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zama-gray-400" />
            <input
              type="text"
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
              placeholder="0x1234567890123456789012345678901234567890"
              className="w-full pl-10 pr-4 py-3 border border-zama-gray-300 rounded-lg focus:ring-2 focus:ring-zama-yellow focus:border-transparent"
              disabled={isSharing}
            />
          </div>
          {error && (
            <div className="flex items-center space-x-2 mt-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="flex space-x-3">
          <button
            onClick={onClose}
            disabled={isSharing}
            className="flex-1 px-4 py-2 border border-zama-gray-300 text-zama-gray-700 rounded-lg hover:bg-zama-gray-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleShare}
            disabled={isSharing || !recipientAddress.trim()}
            className="flex-1 px-4 py-2 bg-zama-yellow text-zama-black font-semibold rounded-lg hover:bg-zama-yellow-dark transition-colors disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {isSharing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-zama-black"></div>
                <span>Sharing...</span>
              </>
            ) : (
              <>
                <Share2 className="w-4 h-4" />
                <span>Share Task</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
