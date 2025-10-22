import { useState } from 'react';
import { X, Share2, Shield, Users, Copy, Check } from 'lucide-react';
import type { Task } from '../types';

interface ShareModalProps {
  task: Task;
  onShare: (taskId: number, recipientAddress: string) => Promise<void>;
  onCancel: () => void;
}

export function ShareModal({ task, onShare, onCancel }: ShareModalProps) {
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipientAddress.trim()) return;

    setIsSharing(true);
    try {
      await onShare(task.id, recipientAddress.trim());
    } catch (error) {
      console.error('Failed to share task:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const isValidAddress = (address: string) => {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b border-zama-gray-200">
          <h2 className="text-xl font-semibold text-zama-gray-900 flex items-center">
            <Share2 className="w-5 h-5 text-purple-600 mr-2" />
            Share Task
          </h2>
          <button
            onClick={onCancel}
            className="p-2 text-zama-gray-400 hover:text-zama-gray-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Task Info */}
          <div className="bg-zama-gray-50 rounded-lg p-4">
            <h3 className="font-medium text-zama-gray-900 mb-2">Task Details</h3>
            <div className="space-y-1 text-sm text-zama-gray-600">
              <div className="flex items-center justify-between">
                <span>Title:</span>
                <span className="font-medium">{task.title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Priority:</span>
                <span className="font-medium">
                  {task.priority === 1 ? 'High' : task.priority === 2 ? 'Medium' : 'Low'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Due Date:</span>
                <span className="font-medium">
                  {new Date(task.dueDate).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Status:</span>
                <span className="font-medium">{task.status}</span>
              </div>
            </div>
          </div>

          {/* Encryption Info */}
          <div className="bg-blue-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2 flex items-center">
              <Shield className="w-4 h-4 text-blue-600 mr-2" />
              Encryption Status
            </h4>
            <div className="space-y-1 text-xs text-blue-700">
              <div className="flex items-center justify-between">
                <span>Title:</span>
                <span className="font-mono">🔒 Encrypted</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Description:</span>
                <span className="font-mono">🔒 Encrypted</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Due Date:</span>
                <span className="font-mono">🔒 Encrypted</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Priority:</span>
                <span className="font-mono">🔒 Encrypted</span>
              </div>
            </div>
          </div>

          {/* Share Form */}
          <form onSubmit={handleShare} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zama-gray-700 mb-2">
                Recipient Address *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className={`input-field pr-10 ${
                    recipientAddress && !isValidAddress(recipientAddress)
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : ''
                  }`}
                  placeholder="0x..."
                  required
                />
                <Users className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zama-gray-400" />
              </div>
              {recipientAddress && !isValidAddress(recipientAddress) && (
                <p className="text-xs text-red-600 mt-1">
                  Please enter a valid Ethereum address
                </p>
              )}
              <p className="text-xs text-zama-gray-500 mt-1">
                The recipient will be able to decrypt and view this task
              </p>
            </div>

            {/* Warning */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start">
                <div className="text-yellow-600 mr-2">⚠️</div>
                <div className="text-sm text-yellow-800">
                  <strong>Important:</strong> Once shared, the recipient will have permanent access to decrypt this task. 
                  Make sure you trust the recipient with this information.
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4">
              <button
                type="button"
                onClick={onCancel}
                className="btn-secondary flex-1"
                disabled={isSharing}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary flex-1 flex items-center justify-center space-x-2"
                disabled={isSharing || !isValidAddress(recipientAddress)}
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
          </form>

          {/* Copy Address Helper */}
          <div className="border-t border-zama-gray-200 pt-4">
            <p className="text-sm text-zama-gray-600 mb-2">Need to find an address?</p>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={() => copyToClipboard('0x0000000000000000000000000000000000000000')}
                className="btn-secondary text-xs flex items-center space-x-1"
              >
                <Copy className="w-3 h-3" />
                <span>Copy Example</span>
              </button>
              {copied && (
                <div className="flex items-center text-green-600 text-xs">
                  <Check className="w-3 h-3 mr-1" />
                  Copied!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
