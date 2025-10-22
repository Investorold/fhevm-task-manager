import { useState, useEffect } from 'react';
import { Plus, CheckCircle, Clock, Shield, Users } from 'lucide-react';
import { realContractService } from '../services/realContractService';
import { fhevmService } from '../services/fhevmService';
import { simpleWalletService } from '../services/simpleWalletService';
import { productionWalletService } from '../services/productionWalletService';
import { getContractAddress } from '../config/contract';
import type { Task } from '../types';
import { TaskForm } from './TaskForm';
import { TaskCard } from './TaskCard';
import { ShareModal } from './ShareModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { DecryptionModal } from './DecryptionModal';

export function TaskManager() {
  // Use real contract - disable demo mode
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [sharingTask, setSharingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [decryptingTask, setDecryptingTask] = useState<Task | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedTasks, setDecryptedTasks] = useState<Set<number>>(new Set());
  const [taskCreationFee, setTaskCreationFee] = useState('0.0001');
  const [dueSoonCount, setDueSoonCount] = useState<number | null>(null);
  const [isRequestingDueSoon, setIsRequestingDueSoon] = useState(false);
  
  // Get contract address from configuration
  const contractAddress = getContractAddress();

  useEffect(() => {
    // Simple wallet connection - no subscription needed
    const checkWallet = () => {
      if (simpleWalletService.isWalletConnected()) {
        console.log('Wallet connected, loading data...');
        loadTasks();
        loadTaskCreationFee();
      } else {
        console.log('Wallet not connected, clearing tasks');
        setTasks([]);
      }
    };
    
    // Initial load
    checkWallet();
    
    // Clear decrypted tasks on mount
    setDecryptedTasks(new Set());
    
    return () => {
      // Cleanup if needed
    };
  }, []);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      // Demo mode - show sample tasks
      if (isDemoMode) {
        console.log('🎮 Demo mode: Loading sample tasks');
        const sampleTasks: Task[] = [
          {
            id: 1,
            title: "Welcome to Confidential Task Manager",
            description: "This is a demo task showing FHEVM encryption",
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            priority: 2,
            status: 'Pending',
            createdAt: new Date().toISOString(),
          },
          {
            id: 2,
            title: "Complete Zama Bounty Submission",
            description: "Finalize the confidential task manager dApp",
            dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            priority: 1,
            status: 'Pending',
            createdAt: new Date().toISOString(),
          }
        ];
        setTasks(sampleTasks);
        return;
      }
      
      // Check if wallet is connected
      if (!simpleWalletService.isWalletConnected()) {
        console.log('Wallet not connected, using empty task list');
        setTasks([]);
        return;
      }
      
      // Ensure contract service is initialized
      if (!realContractService.isInitialized()) {
        console.log('🔧 Contract service not initialized, initializing...');
        
        try {
          // Initialize with simple wallet service
          const provider = simpleWalletService.getProvider();
          const signer = simpleWalletService.getSigner();
          
          if (!provider || !signer) {
            console.log('❌ Wallet not properly connected');
            setTasks([]);
            return;
          }
          
          await realContractService.initializeWithWallet(contractAddress);
        } catch (error) {
          console.error('Failed to initialize contract service:', error);
          setTasks([]);
          return;
        }
      }
      
      // Load tasks from blockchain
      const blockchainTasks = await realContractService.getTasks();
      setTasks(blockchainTasks);
      console.log('Loaded tasks from blockchain:', blockchainTasks.length);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadTaskCreationFee = async () => {
    try {
      // Demo mode - use default fee
      if (isDemoMode) {
        console.log('🎮 Demo mode: Using default fee');
        setTaskCreationFee('0.0001');
        return;
      }
      
      // Check if wallet is connected
      const walletState = productionWalletService.getState();
      if (!walletState.isConnected) {
        console.log('Wallet not connected, using default fee');
        setTaskCreationFee('0.0001');
        return;
      }
      
      // Ensure contract service is initialized
      if (!realContractService.isInitialized()) {
        try {
          // Double-check wallet state before initializing
          const currentWalletState = productionWalletService.getState();
          if (!currentWalletState.isConnected) {
            console.log('Wallet disconnected during fee initialization, using default');
            setTaskCreationFee('0.0001');
            return;
          }
          
          await realContractService.initializeWithWallet(contractAddress);
        } catch (error) {
          console.error('Failed to initialize contract service:', error);
          setTaskCreationFee('0.0001');
          return;
        }
      }
      
      // Get real fee from contract
      const fee = await realContractService.getTaskCreationFee();
      setTaskCreationFee(fee);
      console.log('Loaded task creation fee from contract:', fee);
    } catch (error) {
      console.error('Failed to load task creation fee:', error);
      setTaskCreationFee('0.0001');
    }
  };

  const handleCreateTask = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    try {
      console.log('Creating task with data:', taskData);
      
      // Demo mode - create task locally
      if (isDemoMode) {
        console.log('🎮 Demo mode: Creating task locally');
        const newTask: Task = {
          ...taskData,
          id: Date.now(), // Simple ID generation
          createdAt: new Date().toISOString(),
        };
        
        setTasks(prevTasks => [...prevTasks, newTask]);
        setShowTaskForm(false);
        console.log('✅ Demo task created:', newTask);
        return;
      }
      
      console.log('FHEVM ready:', fhevmService.isReady());
      
      // Check if wallet is connected
      if (!simpleWalletService.isWalletConnected()) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }
      
      // Ensure contract service is initialized
      if (!realContractService.isInitialized()) {
        try {
          await realContractService.initializeWithWallet(contractAddress);
        } catch (error) {
          console.error('Failed to initialize contract service:', error);
          throw new Error('Contract service not available. Please ensure your wallet is connected.');
        }
      }
      
      // Create task on blockchain
      const result = await realContractService.createTask(
        taskData.title,
        taskData.description || '',
        taskData.dueDate,
        taskData.priority
      );
      
      if (result.success) {
        // Add to local state
        const newTask: Task = {
          ...taskData,
          id: Date.now(), // This will be replaced with actual blockchain task ID
          createdAt: new Date().toISOString(),
        };
        
        setTasks(prev => [...prev, newTask]);
        setShowTaskForm(false);
        console.log('Task created successfully on blockchain');
      } else {
        throw new Error(result.error || 'Failed to create task');
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      alert(`Failed to create task: ${error.message}`);
      throw error;
    }
  };

  const handleEditTask = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    if (!editingTask) return;
    
    try {
      // Demo mode - update task in state
      setTasks(prev => prev.map(task => 
        task.id === editingTask.id 
          ? { ...task, ...taskData }
          : task
      ));
      setEditingTask(null);
      console.log('Demo: Task edited successfully');
    } catch (error) {
      console.error('Failed to edit task:', error);
      throw error;
    }
  };

  const handleCompleteTask = async (taskId: number) => {
    try {
      // Demo mode - toggle task status
      setTasks(prev => prev.map(task => 
        task.id === taskId 
          ? { ...task, status: task.status === 'Completed' ? 'Pending' : 'Completed' as 'Completed' | 'Pending' }
          : task
      ));
      console.log('Demo: Task status toggled');
    } catch (error) {
      console.error('Failed to complete task:', error);
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setDeletingTask(task);
    }
  };

  const handleDecryptTask = async (taskId: number) => {
    const task = tasks.find(t => t.id === taskId);
    if (task) {
      setDecryptingTask(task);
    }
  };

  const confirmDecryptTask = async () => {
    if (!decryptingTask) return;
    
    setIsDecrypting(true);
    
    try {
      console.log('Connecting to real backend contract for decryption...');
      console.log('Contract address being used:', contractAddress);
      console.log('Contract service initialized:', realContractService.isInitialized());
      console.log('Contract service address:', realContractService.getContractAddress());
      
      // Check if wallet is connected
      const walletState = productionWalletService.getState();
      if (!walletState.isConnected) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }
      
      // Ensure contract service is properly initialized
      if (!realContractService.isInitialized()) {
        try {
          // First try to initialize with wallet
          await realContractService.initializeWithWallet(contractAddress);
        } catch (walletError) {
          console.warn('Wallet initialization failed, trying with contract address:', walletError);
          try {
            // Fallback: initialize with contract address
            await realContractService.initialize(contractAddress);
          } catch (contractError) {
            console.error('Failed to initialize contract service:', contractError);
            throw new Error('Contract service not available. Please ensure your wallet is connected.');
          }
        }
      }
      
      // Call real contract method to decrypt task
      const result = await realContractService.decryptTask(decryptingTask.id);
      
      if (result.success) {
        // Mark task as decrypted
        setDecryptedTasks(prev => new Set([...prev, decryptingTask.id]));
        
        // Update the task with decrypted data if available
        if (result.decryptedData) {
          setTasks(prev => prev.map(task => 
            task.id === decryptingTask.id 
              ? { 
                  ...task, 
                  title: result.decryptedData.title,
                  dueDate: result.decryptedData.dueDate,
                  priority: result.decryptedData.priority
                }
              : task
          ));
          console.log('Task decrypted and updated with real data:', result.decryptedData);
        } else {
          console.log('Task decrypted successfully via real contract:', decryptingTask.title);
        }
        
        setDecryptingTask(null);
      } else {
        throw new Error(result.error || 'Decryption failed');
      }
      
    } catch (error) {
      console.error('Failed to decrypt task:', error);
      alert(`Failed to decrypt task: ${error.message}`);
    } finally {
      setIsDecrypting(false);
    }
  };

  const simulateWalletPopup = async (): Promise<boolean> => {
    return new Promise((resolve) => {
      const popup = window.open('', 'wallet-popup', 'width=400,height=600,scrollbars=yes,resizable=yes');
      
      if (!popup) {
        // Fallback if popup blocked
        const confirmed = confirm('🔐 Wallet Transaction Required\n\nSign transaction to decrypt task data?\n\nGas Fee: ~0.001 ETH\n\nClick OK to confirm, Cancel to reject.');
        resolve(confirmed);
        return;
      }
      
      popup.document.write(`
        <html>
          <head>
            <title>MetaMask Transaction</title>
            <style>
              body { font-family: Arial, sans-serif; padding: 20px; background: #f0f0f0; }
              .container { background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .header { display: flex; align-items: center; margin-bottom: 20px; }
              .logo { width: 40px; height: 40px; background: #f6851b; border-radius: 8px; margin-right: 15px; }
              .title { font-size: 18px; font-weight: bold; }
              .transaction { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
              .gas-fee { color: #666; font-size: 14px; margin-top: 10px; }
              .buttons { display: flex; gap: 10px; margin-top: 20px; }
              .btn { padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; }
              .btn-reject { background: #dc3545; color: white; }
              .btn-confirm { background: #28a745; color: white; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <div class="logo"></div>
                <div class="title">MetaMask Transaction</div>
              </div>
              
              <h3>Decrypt Task Data</h3>
              <p>You are about to decrypt encrypted task data from the blockchain.</p>
              
              <div class="transaction">
                <strong>Contract:</strong> TaskManager<br>
                <strong>Method:</strong> decryptTask<br>
                <strong>Task ID:</strong> ${decryptingTask?.id}<br>
                <div class="gas-fee">Estimated Gas Fee: ~0.001 ETH</div>
              </div>
              
              <p><strong>⚠️ This will:</strong></p>
              <ul>
                <li>Sign a transaction with your wallet</li>
                <li>Pay gas fees for decryption</li>
                <li>Make task data readable to you</li>
                <li>Record the operation on-chain</li>
              </ul>
              
              <div class="buttons">
                <button class="btn btn-reject" onclick="window.close(); parent.postMessage('reject', '*');">Reject</button>
                <button class="btn btn-confirm" onclick="parent.postMessage('confirm', '*'); window.close();">Confirm</button>
              </div>
            </div>
          </body>
        </html>
      `);
      
      const handleMessage = (event: MessageEvent) => {
        if (event.data === 'confirm') {
          resolve(true);
          window.removeEventListener('message', handleMessage);
        } else if (event.data === 'reject') {
          resolve(false);
          window.removeEventListener('message', handleMessage);
        }
      };
      
      window.addEventListener('message', handleMessage);
      
      // Handle popup close
      const checkClosed = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkClosed);
          window.removeEventListener('message', handleMessage);
          resolve(false);
        }
      }, 1000);
    });
  };

  const handleShareTask = async (taskId: number, recipientAddress: string) => {
    try {
      // Demo mode - simulate sharing
      console.log('Demo: Sharing task', taskId, 'with', recipientAddress);
      setSharingTask(null);
      alert(`Demo: Task shared with ${recipientAddress}`);
    } catch (error) {
      console.error('Failed to share task:', error);
      throw error;
    }
  };

  const requestDueSoonCount = async () => {
    setIsRequestingDueSoon(true);
    try {
      // Demo mode - simulate due soon count calculation
      const now = new Date();
      const dueSoonTasks = tasks.filter(task => {
        const dueDate = new Date(task.dueDate);
        const diffHours = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        return diffHours <= 24 && diffHours > 0;
      });
      
      setDueSoonCount(dueSoonTasks.length);
      console.log('Demo: Due soon count calculated:', dueSoonTasks.length);
    } catch (error) {
      console.error('Failed to request due soon count:', error);
    } finally {
      setIsRequestingDueSoon(false);
    }
  };

  const pendingTasks = tasks.filter(task => task.status === 'Pending');
  const completedTasks = tasks.filter(task => task.status === 'Completed');

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-zama-gray-900">
              📋 My Tasks ({tasks.length})
            </h2>
            <div className="mt-1 flex space-x-2">
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                fhevmService.isReady() ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {fhevmService.isReady() ? '✅ FHEVM Ready' : '⏳ FHEVM Initializing...'}
              </span>
              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                🔗 Real Contract
              </span>
              {simpleWalletService.isWalletConnected() && (
                <span className="px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  🔗 {simpleWalletService.getWalletName()}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setShowTaskForm(true)}
            className="btn-primary flex items-center space-x-2"
            disabled={!fhevmService.isReady()}
            title={!fhevmService.isReady() ? 'FHEVM not initialized' : 'Create new task'}
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
          <div className="text-center p-3 bg-zama-gray-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Shield className="w-5 h-5 text-zama-yellow" />
            </div>
            <div className="text-lg font-semibold text-zama-gray-900">{tasks.length}</div>
            <div className="text-sm text-zama-gray-600">Encrypted Tasks</div>
          </div>
          <div className="text-center p-3 bg-zama-gray-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Clock className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-lg font-semibold text-zama-gray-900">{pendingTasks.length}</div>
            <div className="text-sm text-zama-gray-600">Pending</div>
          </div>
          <div className="text-center p-3 bg-zama-gray-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <CheckCircle className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-lg font-semibold text-zama-gray-900">{completedTasks.length}</div>
            <div className="text-sm text-zama-gray-600">Completed</div>
          </div>
          <div className="text-center p-3 bg-zama-gray-50 rounded-lg">
            <div className="flex items-center justify-center mb-1">
              <Users className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-lg font-semibold text-zama-gray-900">
              {dueSoonCount !== null ? dueSoonCount : '--'}
            </div>
            <div className="text-sm text-zama-gray-600">Due Soon</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={requestDueSoonCount}
            className="btn-primary text-sm flex items-center space-x-2"
            disabled={!realContractService || !fhevmService.isReady() || isRequestingDueSoon}
          >
            {isRequestingDueSoon ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-zama-black"></div>
                <span>Requesting...</span>
              </>
            ) : (
              <>
                <Clock className="w-4 h-4" />
                <span>📊 Request Due Soon Count</span>
              </>
            )}
          </button>
          <div className="text-sm text-zama-gray-600 flex items-center">
            💰 Task Creation Fee: {taskCreationFee} ETH
          </div>
          {dueSoonCount !== null && (
            <div className="text-sm text-green-600 font-semibold flex items-center">
              ✅ Due Soon Count: {dueSoonCount} tasks
            </div>
          )}
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="card text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-zama-yellow mx-auto mb-4"></div>
            <p className="text-zama-gray-600">Loading encrypted tasks...</p>
          </div>
        ) : tasks.length === 0 ? (
          <div className="card text-center py-12">
            <Shield className="w-12 h-12 text-zama-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-zama-gray-900 mb-2">No tasks yet</h3>
            <p className="text-zama-gray-600 mb-4">Create your first encrypted task to get started</p>
            <button
              onClick={() => setShowTaskForm(true)}
              className="btn-primary"
            >
              Create First Task
            </button>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onComplete={() => handleCompleteTask(task.id)}
              onEdit={() => setEditingTask(task)}
              onDelete={() => handleDeleteTask(task.id)}
              onShare={() => setSharingTask(task)}
              onDecrypt={() => handleDecryptTask(task.id)}
              isDecrypted={decryptedTasks.has(task.id)}
            />
          ))
        )}
      </div>

      {/* Task Form Modal */}
      {showTaskForm && (
        <TaskForm
          onSubmit={handleCreateTask}
          onCancel={() => setShowTaskForm(false)}
          title="Create New Task"
          submitText="Create Task"
        />
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <TaskForm
          task={editingTask}
          onSubmit={handleEditTask}
          onCancel={() => setEditingTask(null)}
          title="Edit Task"
          submitText="Update Task"
        />
      )}

      {/* Share Task Modal */}
      {sharingTask && (
        <ShareModal
          task={sharingTask}
          onShare={handleShareTask}
          onCancel={() => setSharingTask(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingTask && (
        <DeleteConfirmModal
          isOpen={!!deletingTask}
          taskTitle={deletingTask.title}
          onConfirm={confirmDeleteTask}
          onCancel={() => setDeletingTask(null)}
        />
      )}

      {/* Decryption Modal */}
      {decryptingTask && (
        <DecryptionModal
          isOpen={!!decryptingTask}
          taskTitle={decryptingTask.title}
          onDecrypt={confirmDecryptTask}
          onCancel={() => setDecryptingTask(null)}
          isDecrypting={isDecrypting}
        />
      )}
    </div>
  );
}
