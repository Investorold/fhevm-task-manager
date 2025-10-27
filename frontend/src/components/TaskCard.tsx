import { CheckCircle, Trash2, Share2, Clock, Shield, Eye } from 'lucide-react';
import type { Task } from '../types';
import { format } from 'date-fns';

interface TaskCardProps {
  task: Task;
  onComplete: () => void;
  onDelete: () => void;
  onShare: () => void;
  onDecrypt?: () => void;
  // onViewHistory?: () => void;
  isDecrypted?: boolean;
  displayIndex?: number; // Add display index prop
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelection?: () => void;
}

export function TaskCard({ 
  task, 
  onComplete, 
  onDelete, 
  onShare, 
  onDecrypt, 
  /* onViewHistory, */ 
  isDecrypted = false, 
  displayIndex,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelection
}: TaskCardProps) {
  const getEncryptedDisplay = (type: string) => {
    const shortHashes = {
      title: '******* ********',
      description: '******* ********',
      dueDate: '*******',
      priority: '*******',
      status: '*******'
    };

    return shortHashes[type as keyof typeof shortHashes] || '*******';
  };
  const isOverdue = (() => {
    try {
      const dueDate = new Date(task.dueDate);
      return !isNaN(dueDate.getTime()) && dueDate < new Date() && task.status === 'Pending';
    } catch {
      return false;
    }
  })();
  
  const isDueSoon = (() => {
    try {
      const dueDate = new Date(task.dueDate);
      if (isNaN(dueDate.getTime())) return false;
      const now = new Date();
      const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
      return diffHours <= 24 && diffHours > 0;
    } catch {
      return false;
    }
  })();

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1: return 'text-red-600 bg-red-50';
      case 2: return 'text-yellow-600 bg-yellow-50';
      case 3: return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getPriorityText = (priority: number) => {
    switch (priority) {
      case 1: return 'High';
      case 2: return 'Medium';
      case 3: return 'Low';
      default: return 'Unknown';
    }
  };

  return (
    <div className={`card transition-all duration-200 hover:shadow-md ${
      isOverdue ? 'border-red-200 bg-red-50' : 
      isDueSoon ? 'border-yellow-200 bg-yellow-50' : 
      'border-zama-gray-200'
    } ${isSelected ? 'ring-2 ring-zama-yellow bg-yellow-50' : ''}`}>
      <div className="flex items-start justify-between">
        {/* Selection Checkbox */}
        {isSelectionMode && (
          <div className="flex items-center mr-4 mt-1">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={onToggleSelection}
              className="w-4 h-4 text-zama-yellow bg-gray-100 border-gray-300 rounded focus:ring-zama-yellow focus:ring-2"
            />
          </div>
        )}
        
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <div className="flex items-center space-x-2">
            <span className="text-sm font-bold text-zama-yellow bg-zama-black px-2 py-1 rounded">
              #{displayIndex !== undefined ? displayIndex + 1 : task.id + 1}
            </span>
              <h3 className="text-lg font-semibold text-zama-gray-900">
                {(task.isEncrypted && !isDecrypted) ? getEncryptedDisplay('title') : task.title}
              </h3>
            </div>
            <div className="flex items-center space-x-1">
              <Shield className="w-4 h-4 text-zama-yellow" />
              <span className="text-xs text-zama-gray-500">
                {task.isEncrypted ? (isDecrypted ? 'Decrypted' : 'Encrypted') : 'Decrypted'}
              </span>
            </div>
          </div>

          {task.description && (
            <p className="text-zama-gray-600 mb-3 line-clamp-2">
              {(task.isEncrypted && !isDecrypted) ? getEncryptedDisplay('description') : task.description}
            </p>
          )}

          <div className="flex items-center space-x-4 text-sm text-zama-gray-600 mb-3">
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>
                {(() => {
                  // Check if this is an encrypted placeholder
                  if (task.isEncrypted && !isDecrypted && (task.dueDate === '******* ********' || task.dueDate?.includes('*******'))) {
                    return 'Encrypted';
                  }
                  try {
                    const date = new Date(task.dueDate);
                    return isNaN(date.getTime()) ? 'Invalid Date' : format(date, 'MMM dd, yyyy');
                  } catch (error) {
                    return 'Invalid Date';
                  }
                })()}
              </span>
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
              {getPriorityText(task.priority)} Priority
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              task.status === 'Completed' 
                ? 'text-green-600 bg-green-50' 
                : 'text-blue-600 bg-blue-50'
            }`}>
              {isDecrypted ? task.status : '*******'}
            </div>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center space-x-4 text-xs text-zama-gray-500">
            {isOverdue && (
              <span className="text-red-600 font-medium">⚠️ Overdue</span>
            )}
            {isDueSoon && !isOverdue && (
              <span className="text-yellow-600 font-medium">⏰ Due Soon</span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2 ml-4">
          {!isDecrypted && onDecrypt && (
            <button
              onClick={onDecrypt}
              className="p-2 text-zama-yellow hover:bg-zama-yellow hover:bg-opacity-20 rounded-lg transition-colors"
              title="Decrypt Task Data"
            >
              <Eye className="w-5 h-5" />
            </button>
          )}
          
          {isDecrypted && task.status === 'Pending' && (
            <button
              onClick={onComplete}
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Mark as Complete"
            >
              <CheckCircle className="w-5 h-5" />
            </button>
          )}
          
          {/* Edit functionality removed for privacy - tasks are immutable after creation */}
          
          {isDecrypted && task.status !== 'Completed' && !task.isShared && (
            <button
              onClick={onShare}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Share Task with Another User"
            >
              <Share2 className="w-5 h-5" />
            </button>
          )}
          
          {/* Delete button - now visible for all non-shared tasks */}
          {!task.isShared && (
            <button
              onClick={onDelete}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Remove Task from List"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
          
          {/* Blockchain Transaction History */}
          {/* {task.transactionHistory && Object.keys(task.transactionHistory).length > 0 && onViewHistory && (
            <button
              onClick={onViewHistory}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="View Blockchain Transaction History"
            >
              <History className="w-5 h-5" />
            </button>
          )} */}
          
          {/* Show non-editable indicators */}
          {task.isShared && (
            <div className="flex items-center space-x-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
              <Share2 className="w-3 h-3" />
              <span>Shared</span>
            </div>
          )}
          
          {task.status === 'Completed' && (
            <div className="flex items-center space-x-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
              <CheckCircle className="w-3 h-3" />
              <span>Completed</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
