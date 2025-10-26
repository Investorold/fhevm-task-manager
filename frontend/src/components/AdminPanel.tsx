import { useState, useEffect } from 'react';
import { Settings, DollarSign, Wallet, Crown } from 'lucide-react';
import { realContractService } from '../services/realContractService';

interface AdminPanelProps {
  onClose: () => void;
}

export function AdminPanel({ onClose }: AdminPanelProps) {
  const [isOwner, setIsOwner] = useState(false);
  const [contractBalance, setContractBalance] = useState('0');
  const [currentFee, setCurrentFee] = useState('0.0001');
  const [newFee, setNewFee] = useState('0.0001');
  const [isLoading, setIsLoading] = useState(false);
  const [ownerAddress, setOwnerAddress] = useState('');

  useEffect(() => {
    checkOwnership();
    loadContractData();
  }, []);

  const checkOwnership = async () => {
    try {
      const owner = await realContractService.isOwner();
      setIsOwner(owner);
      
      if (owner) {
        const ownerAddr = await realContractService.getOwner();
        setOwnerAddress(ownerAddr);
      }
    } catch (error) {
      console.error('Failed to check ownership:', error);
    }
  };

  const loadContractData = async () => {
    try {
      const balance = await realContractService.getContractBalance();
      setContractBalance(balance);
      
      const fee = await realContractService.getTaskCreationFee();
      setCurrentFee(fee);
      setNewFee(fee);
    } catch (error) {
      console.error('Failed to load contract data:', error);
    }
  };

  const handleSetFee = async () => {
    if (!isOwner) return;
    
    setIsLoading(true);
    try {
      await realContractService.setFee(newFee);
      setCurrentFee(newFee);
      alert('Fee updated successfully!');
    } catch (error) {
      console.error('Failed to set fee:', error);
      alert('❌ Failed to set fee: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (!isOwner) return;
    
    const confirmed = confirm(`Are you sure you want to withdraw ${contractBalance} ETH from the contract?`);
    if (!confirmed) return;
    
    setIsLoading(true);
    try {
      await realContractService.withdraw();
      await loadContractData(); // Refresh balance
      alert('Funds withdrawn successfully!');
    } catch (error) {
      console.error('Failed to withdraw:', error);
      alert('❌ Failed to withdraw funds: ' + (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOwner) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Admin Panel</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="text-center py-8">
            <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">
              Only the contract owner can access admin functions.
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Owner: {ownerAddress ? `${ownerAddress.slice(0, 6)}...${ownerAddress.slice(-4)}` : 'Loading...'}
            </p>
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="btn-secondary"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
            <Settings className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Admin Panel</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* Owner Status */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <Crown className="w-5 h-5 text-green-600" />
            <span className="text-green-800 font-medium">Contract Owner</span>
          </div>
          <p className="text-green-700 text-sm mt-1">
            {ownerAddress ? `${ownerAddress.slice(0, 6)}...${ownerAddress.slice(-4)}` : 'Loading...'}
          </p>
        </div>

        {/* Contract Balance */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-blue-600" />
            <span className="text-blue-800 font-medium">Contract Balance</span>
          </div>
          <p className="text-blue-700 text-lg font-semibold mt-1">
            {parseFloat(contractBalance).toFixed(4)} ETH
          </p>
        </div>

        {/* Fee Management */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-gray-900">Fee Management</h3>
          
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-2">
              <DollarSign className="w-5 h-5 text-gray-600" />
              <span className="text-gray-800 font-medium">Current Fee</span>
            </div>
            <p className="text-gray-700 text-lg font-semibold">
              {parseFloat(currentFee).toFixed(4)} ETH
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New Fee (ETH)
            </label>
            <input
              type="number"
              step="0.0001"
              min="0"
              value={newFee}
              onChange={(e) => setNewFee(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.0001"
            />
          </div>

          <button
            onClick={handleSetFee}
            disabled={isLoading || newFee === currentFee}
            className="w-full btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Updating...' : 'Update Fee'}
          </button>
        </div>

        {/* Withdraw Funds */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Withdraw Funds</h3>
          
          <button
            onClick={handleWithdraw}
            disabled={isLoading || parseFloat(contractBalance) === 0}
            className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {isLoading ? 'Withdrawing...' : `Withdraw ${parseFloat(contractBalance).toFixed(4)} ETH`}
          </button>
          
          {parseFloat(contractBalance) === 0 && (
            <p className="text-gray-500 text-sm mt-2 text-center">
              No funds to withdraw
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={loadContractData}
            className="btn-secondary"
          >
            Refresh
          </button>
          <button
            onClick={onClose}
            className="btn-primary"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

