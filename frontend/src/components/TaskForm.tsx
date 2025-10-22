import { useState, useEffect } from 'react';
import { X, Shield, Calendar } from 'lucide-react';
import type { Task } from '../types';

interface TaskFormProps {
  task?: Task | null;
  onSubmit: (taskData: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
  onSubmitText?: (taskData: Omit<Task, 'id' | 'createdAt'>) => Promise<void>;
  onSubmitNumbers?: (taskData: Omit<Task, 'id' | 'createdAt'> & { numericId: number }) => Promise<void>;
  onCancel: () => void;
  title: string;
  submitText: string;
  taskType?: 'text' | 'numbers' | 'auto';
}

export function TaskForm({ task, onSubmit, onSubmitText, onSubmitNumbers, onCancel, title, submitText, taskType = 'auto' }: TaskFormProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 2, // Default to medium priority
    numericId: 0, // For numeric tasks
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description,
        dueDate: new Date(task.dueDate).toISOString().split('T')[0],
        priority: task.priority,
      });
    } else {
      // Set default due date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setFormData(prev => ({
        ...prev,
        dueDate: tomorrow.toISOString().split('T')[0],
      }));
    }
  }, [task]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const taskData: Omit<Task, 'id' | 'createdAt'> = {
        title: formData.title,
        description: formData.description,
        dueDate: new Date(formData.dueDate).toISOString(),
        priority: formData.priority,
        status: task?.status || 'Pending',
      };

      // Choose the appropriate submission method based on taskType
      if (taskType === 'text' && onSubmitText) {
        await onSubmitText(taskData);
      } else if (taskType === 'numbers' && onSubmitNumbers) {
        const numericTaskData = { ...taskData, numericId: formData.numericId };
        await onSubmitNumbers(numericTaskData);
      } else if (taskType === 'auto') {
        // Auto-detect: if description is provided, use text; otherwise use numbers
        if (formData.description && formData.description.trim() !== '') {
          if (onSubmitText) {
            await onSubmitText(taskData);
          } else {
            await onSubmit(taskData);
          }
        } else {
          if (onSubmitNumbers) {
            const numericTaskData = { ...taskData, numericId: formData.numericId };
            await onSubmitNumbers(numericTaskData);
          } else {
            await onSubmit(taskData);
          }
        }
      } else {
        // Default to regular onSubmit
        await onSubmit(taskData);
      }
    } catch (error) {
      console.error('Form submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-zama-gray-200">
          <h2 className="text-xl font-semibold text-zama-gray-900">{title}</h2>
          <button
            onClick={onCancel}
            className="p-2 text-zama-gray-400 hover:text-zama-gray-600 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Task Title */}
          <div>
            <label className="block text-sm font-medium text-zama-gray-700 mb-2">
              Task Title *
            </label>
            <div className="relative">
              <input
                type="text"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                className="input-field pr-10"
                placeholder="Enter task title..."
                required
              />
              <Shield className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zama-yellow" />
            </div>
            <p className="text-xs text-zama-gray-500 mt-1">
              🔒 This will be encrypted and stored securely
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-zama-gray-700 mb-2">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              className="input-field h-24 resize-none"
              placeholder="Add task description..."
            />
            <p className="text-xs text-zama-gray-500 mt-1">
              🔒 Optional encrypted description
            </p>
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-sm font-medium text-zama-gray-700 mb-2">
              Due Date *
            </label>
            <div className="relative">
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => handleChange('dueDate', e.target.value)}
                className="input-field pr-10"
                required
              />
              <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zama-gray-400" />
            </div>
            <p className="text-xs text-zama-gray-500 mt-1">
              🔒 Due date will be encrypted
            </p>
          </div>

          {/* Numeric ID (for numeric tasks) */}
          {taskType === 'numbers' && (
            <div>
              <label className="block text-sm font-medium text-zama-gray-700 mb-2">
                Numeric ID
              </label>
              <input
                type="number"
                value={formData.numericId}
                onChange={(e) => handleChange('numericId', parseInt(e.target.value) || 0)}
                className="input-field"
                placeholder="Enter numeric ID..."
                min="0"
              />
              <p className="text-xs text-zama-gray-500 mt-1">
                🔒 Numeric ID for sorting/filtering
              </p>
            </div>
          )}

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-zama-gray-700 mb-2">
              Priority *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 1, label: 'High', color: 'red', icon: '🔴' },
                { value: 2, label: 'Medium', color: 'yellow', icon: '🟡' },
                { value: 3, label: 'Low', color: 'green', icon: '🟢' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => handleChange('priority', option.value)}
                  className={`p-3 rounded-lg border-2 transition-all ${
                    formData.priority === option.value
                      ? `border-${option.color}-300 bg-${option.color}-50`
                      : 'border-zama-gray-200 hover:border-zama-gray-300'
                  }`}
                >
                  <div className="text-lg mb-1">{option.icon}</div>
                  <div className="text-sm font-medium text-zama-gray-700">
                    {option.label}
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-zama-gray-500 mt-1">
              🔒 Priority level will be encrypted
            </p>
          </div>

          {/* Encryption Preview */}
          <div className="bg-gradient-to-r from-zama-yellow to-zama-yellow-dark rounded-lg p-4 text-zama-black">
            <h4 className="text-sm font-bold mb-3 flex items-center">
              <Shield className="w-4 h-4 mr-2" />
              🔒 Your Data Will Be Encrypted
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-medium">Title:</span>
                <span className="bg-zama-black text-zama-yellow px-2 py-1 rounded text-xs font-mono">
                  ENCRYPTED
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Description:</span>
                <span className="bg-zama-black text-zama-yellow px-2 py-1 rounded text-xs font-mono">
                  ENCRYPTED
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Due Date:</span>
                <span className="bg-zama-black text-zama-yellow px-2 py-1 rounded text-xs font-mono">
                  ENCRYPTED
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Priority:</span>
                <span className="bg-zama-black text-zama-yellow px-2 py-1 rounded text-xs font-mono">
                  ENCRYPTED
                </span>
              </div>
              {taskType === 'numbers' && (
                <div className="flex justify-between items-center">
                  <span className="font-medium">Numeric ID:</span>
                  <span className="bg-zama-black text-zama-yellow px-2 py-1 rounded text-xs font-mono">
                    ENCRYPTED
                  </span>
                </div>
              )}
            </div>
            <div className="mt-3 pt-2 border-t border-zama-black border-opacity-20">
              <p className="text-xs font-medium">
                ✅ All data will be encrypted using FHEVM before storage
              </p>
              {taskType === 'auto' && (
                <p className="text-xs font-medium mt-1">
                  🤖 Auto-detection: Text tasks if description provided, otherwise numeric tasks
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="btn-secondary flex-1"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 flex items-center justify-center space-x-2"
              disabled={isSubmitting || !formData.title.trim()}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-zama-black"></div>
                  <span>Encrypting...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>{submitText}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
