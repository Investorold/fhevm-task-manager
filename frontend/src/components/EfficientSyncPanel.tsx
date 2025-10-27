import { useState, useEffect } from 'react';
import { RefreshCw, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { efficientTaskService } from '../services/efficientTaskService';

interface EfficientSyncPanelProps {
  onSyncComplete?: () => void;
}

export function EfficientSyncPanel({ onSyncComplete }: EfficientSyncPanelProps) {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);

  useEffect(() => {
    // Check pending operations count
    const checkPending = () => {
      const count = efficientTaskService.getPendingOperationsCount();
      setPendingCount(count);
    };

    checkPending();
    const interval = setInterval(checkPending, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleSync = async () => {
    setIsSyncing(true);
    
    try {
      const result = await efficientTaskService.syncToBlockchain();
      
      if (result.success) {
        setLastSync(new Date().toLocaleTimeString());
        setPendingCount(0);
        onSyncComplete?.();
      } else {
        alert(`Sync failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Sync error:', error);
      alert(`Sync error: ${(error as Error).message}`);
    } finally {
      setIsSyncing(false);
    }
  };

  if (pendingCount === 0 && !lastSync) {
    return null; // Don't show panel if no pending operations
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {pendingCount > 0 ? (
            <>
              <AlertCircle className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-800">
                  {pendingCount} operation{pendingCount !== 1 ? 's' : ''} pending sync
                </p>
                <p className="text-xs text-blue-600">
                  Changes are saved locally. Sync to blockchain when ready.
                </p>
              </div>
            </>
          ) : (
            <>
              <CheckCircle className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-green-800">
                  All changes synced to blockchain
                </p>
                {lastSync && (
                  <p className="text-xs text-green-600">
                    Last sync: {lastSync}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {pendingCount > 0 && (
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              isSyncing
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            {isSyncing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>{isSyncing ? 'Syncing...' : 'Sync to Blockchain'}</span>
          </button>
        )}
      </div>

      {/* Benefits explanation */}
      <div className="mt-3 pt-3 border-t border-blue-200">
        <div className="flex items-center space-x-4 text-xs text-blue-600">
          <div className="flex items-center space-x-1">
            <CheckCircle className="w-3 h-3" />
            <span>Instant operations</span>
          </div>
          <div className="flex items-center space-x-1">
            <CheckCircle className="w-3 h-3" />
            <span>Lower gas fees</span>
          </div>
          <div className="flex items-center space-x-1">
            <CheckCircle className="w-3 h-3" />
            <span>Batch sync</span>
          </div>
        </div>
      </div>
    </div>
  );
}


