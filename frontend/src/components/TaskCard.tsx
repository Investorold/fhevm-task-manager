import { CheckCircle, Edit3, Trash2, Share2, Clock, Shield, Eye } from 'lucide-react';
import type { Task } from '../types';
import { format } from 'date-fns';

interface TaskCardProps {
  task: Task;
  onComplete: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  onDecrypt?: () => void;
  isDecrypted?: boolean;
}

export function TaskCard({ task, onComplete, onEdit, onDelete, onShare, onDecrypt, isDecrypted = false }: TaskCardProps) {
  const getEncryptedDisplay = (type: string) => {
    const shortHashes = {
      title: '0x8Fdb...9C539a50',
      description: '0x98ee...aa36a70400',
      dueDate: '0x830a...aa36a70000',
      priority: '0xENCRYPTED',
      status: '0xENCRYPTED'
    };
    return shortHashes[type as keyof typeof shortHashes] || '0xENCRYPTED';
  };
  const isOverdue = new Date(task.dueDate) < new Date() && task.status === 'Pending';
  const isDueSoon = (() => {
    const dueDate = new Date(task.dueDate);
    const now = new Date();
    const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    return diffHours <= 24 && diffHours > 0;
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
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-zama-gray-900">
              📝 {isDecrypted ? task.title : getEncryptedDisplay('title')}
            </h3>
            <div className="flex items-center space-x-1">
              <Shield className="w-4 h-4 text-zama-yellow" />
              <span className="text-xs text-zama-gray-500">
                {isDecrypted ? 'Decrypted' : 'Encrypted'}
              </span>
            </div>
          </div>

          {task.description && (
            <p className="text-zama-gray-600 mb-3 line-clamp-2">
              {isDecrypted ? task.description : getEncryptedDisplay('description')}
            </p>
          )}

          <div className="flex items-center space-x-4 text-sm text-zama-gray-600 mb-3">
            <div className="flex items-center space-x-1">
              <Clock className="w-4 h-4" />
              <span>Due: {isDecrypted ? format(new Date(task.dueDate), 'MMM dd, yyyy') : getEncryptedDisplay('dueDate')}</span>
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
              {isDecrypted ? getPriorityText(task.priority) + ' Priority' : getEncryptedDisplay('priority')}
            </div>
            <div className={`px-2 py-1 rounded-full text-xs font-medium ${
              task.status === 'Completed' 
                ? 'text-green-600 bg-green-50' 
                : 'text-blue-600 bg-blue-50'
            }`}>
              {isDecrypted ? task.status : getEncryptedDisplay('status')}
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
            <span>Created: {format(new Date(task.createdAt), 'MMM dd, yyyy')}</span>
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
          
          {task.status === 'Pending' && isDecrypted && (
            <button
              onClick={onComplete}
              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Mark as Complete"
            >
              <CheckCircle className="w-5 h-5" />
            </button>
          )}
          
          {isDecrypted && (
            <button
              onClick={onEdit}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
              title="Edit Task"
            >
              <Edit3 className="w-5 h-5" />
            </button>
          )}
          
          {isDecrypted && (
            <button
              onClick={onShare}
              className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              title="Share Task"
            >
              <Share2 className="w-5 h-5" />
            </button>
          )}
          
          {isDecrypted && (
            <button
              onClick={onDelete}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Task"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
