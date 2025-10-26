import { useState } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  taskTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteConfirmModal({ isOpen, taskTitle, onConfirm, onCancel }: DeleteConfirmModalProps) {
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
              Delete Task
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
          <p className="text-zama-gray-700 mb-3">
            Are you sure you want to <strong>REMOVE</strong> this task from your list?
          </p>
          <div className="bg-zama-gray-50 rounded-lg p-3 border-l-4 border-red-500">
            <p className="text-sm text-zama-gray-600 font-medium">
              "******* ********"
            </p>
            <p className="text-xs text-zama-gray-500 mt-1">
              (Encrypted task content)
            </p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
            <p className="text-sm text-yellow-800 font-semibold mb-2">
              ⚠️ IMPORTANT: BLOCKCHAIN DATA PERSISTENCE ⚠️
            </p>
            <ul className="text-xs text-yellow-700 space-y-1">
              <li>• Task will be <strong>REMOVED from your list</strong></li>
              <li>• <strong>Data remains in blockchain history</strong> (immutable)</li>
              <li>• Task cannot be <strong>recovered to your list</strong></li>
              <li>• This action <strong>cannot be undone</strong> for your view</li>
            </ul>
          </div>
        </div>

        {/* Actions */}
        <div className="flex space-x-3">
          <button
            onClick={onCancel}
            className="flex-1 bg-zama-gray-200 hover:bg-zama-gray-300 text-zama-gray-800 font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>REMOVE FROM LIST</span>
          </button>
        </div>
      </div>
    </div>
  );
}
