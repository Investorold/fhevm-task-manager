import { useState } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface CompleteConfirmModalProps {
  isOpen: boolean;
  taskTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CompleteConfirmModal({ isOpen, taskTitle, onConfirm, onCancel }: CompleteConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-zama-gray-900">
              Complete Task
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
            Are you sure you want to mark this task as completed?
          </p>
          <div className="bg-zama-gray-50 rounded-lg p-3">
            <p className="text-sm text-zama-gray-500 mb-1">Task:</p>
            <p className="font-medium text-zama-gray-900">
              ******* ********
            </p>
            <p className="text-xs text-zama-gray-500 mt-1">
              (Encrypted task content)
            </p>
          </div>
          <p className="text-sm text-zama-gray-500 mt-3">
            Once completed, this task cannot be edited or undone.
          </p>
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
            className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium flex items-center justify-center space-x-2"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Complete Task</span>
          </button>
        </div>
      </div>
    </div>
  );
}

