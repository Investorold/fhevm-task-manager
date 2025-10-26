import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteAllConfirmModalProps {
  isOpen: boolean;
  taskCount: number;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteAllConfirmModal({ isOpen, taskCount, onConfirm, onCancel }: DeleteAllConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-zama-gray-900">
              Delete All Tasks
            </h3>
          </div>
          <button
            onClick={onCancel}
            className="text-zama-gray-400 hover:text-zama-gray-600 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-zama-gray-600 mb-3">
            Are you sure you want to delete <strong>all {taskCount} tasks</strong>?
          </p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-sm text-red-700 font-medium mb-1">⚠️ Warning</p>
            <p className="text-sm text-red-600">
              This action cannot be undone. All tasks will be removed from your view and marked as deleted on the blockchain.
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-zama-gray-600 bg-zama-gray-100 hover:bg-zama-gray-200 rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center space-x-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete All Tasks</span>
          </button>
        </div>
      </div>
    </div>
  );
}
