import { useState } from 'react';
import { X, Share2, Shield, Users, Copy, Check } from 'lucide-react';
import type { Task } from '../types';

interface ShareModalProps {
  task: Task;
  onShare: (taskId: number, recipientAddress: string | string[]) => Promise<void>;
  onCancel: () => void;
}

export function ShareModal({ task, onShare, onCancel }: ShareModalProps) {
  const [recipientAddress, setRecipientAddress] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleShare = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    if (!recipientAddress.trim()) return;

    const addresses = parseAddresses(recipientAddress);
    if (addresses.length === 0) return;

    setIsSharing(true);
    try {
      if (addresses.length === 1) {
        await onShare(task.id, addresses[0]);
      } else {
        await onShare(task.id, addresses);
      }
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
    return /^0x[a-fA-F0-9]{40}$/.test(address.trim());
  };

  const parseAddresses = (input: string): string[] => {
    return input.split(',')
      .map(addr => addr.trim())
      .filter(addr => addr.length > 0);
  };

  const getInvalidAddresses = (input: string): string[] => {
    const addresses = parseAddresses(input);
    return addresses.filter(addr => !isValidAddress(addr));
  };

  const isValidInput = (input: string): boolean => {
    const addresses = parseAddresses(input);
    return addresses.length > 0 && getInvalidAddresses(input).length === 0;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-zama-gray-200 flex-shrink-0">
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

        <div className="p-6 space-y-4 overflow-y-auto flex-1 min-h-0">
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
            </div>
          </div>

          <form onSubmit={handleShare} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zama-gray-700 mb-2">
                Recipient Address(es) *
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className={`input-field pr-10 ${
                    recipientAddress && !isValidInput(recipientAddress)
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500'
                      : ''
                  }`}
                  placeholder="0x..., 0x..."
                  required
                />
                <Users className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zama-gray-400" />
              </div>
              {recipientAddress && !isValidInput(recipientAddress) && (
                <div className="text-xs text-red-600 mt-1">
                  {getInvalidAddresses(recipientAddress).length > 0 ? (
                    <div>
                      Invalid address(es): {getInvalidAddresses(recipientAddress).join(', ')}
                    </div>
                  ) : (
                    <div>Please enter valid Ethereum address(es)</div>
                  )}
                </div>
              )}
              <p className="text-xs text-zama-gray-500 mt-1">
                Separate multiple addresses with commas. Recipients will be able to decrypt and view this task.
              </p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start">
                <div className="text-yellow-600 mr-2">⚠️</div>
                <div className="text-sm text-yellow-800">
                  <strong>Important:</strong> Once shared, the recipient will have permanent access to decrypt this task. 
                  Make sure you trust the recipient with this information.
                </div>
              </div>
            </div>
          </form>
        </div>

        <div className="border-t border-zama-gray-200 p-6 flex-shrink-0 bg-white">
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary flex-1"
              disabled={isSharing}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="btn-primary flex-1 flex items-center justify-center space-x-2"
              disabled={isSharing || !isValidInput(recipientAddress)}
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
    </div>
  );
}
