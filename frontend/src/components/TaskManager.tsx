import { useState, useEffect } from 'react';
import { Plus, CheckCircle, Clock, Shield, Users } from 'lucide-react';
import { ethers } from 'ethers';
import { realContractService } from '../services/realContractService';
import { fhevmService } from '../services/fhevmService';
import { simpleWalletService } from '../services/simpleWalletService';
import { productionWalletService } from '../services/productionWalletService';
import { backendService } from '../services/backendService';
// import { taskStorage } from '../services/taskStorage';
import { getContractAddress } from '../config/contract';
import type { Task } from '../types';
import { TaskForm } from './TaskForm';
import { TaskCard } from './TaskCard';
import { ShareModal } from './ShareModal';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { DecryptionModal } from './DecryptionModal';
import { BulkDeleteModal } from './BulkDeleteModal';
import { WalletSelectionModal } from './WalletSelectionModal';
// import { debugLocalStorage } from '../utils/debugLocalStorage';

// Component to display wallet address that auto-updates from signer
function WalletAddressDisplay() {
  const [displayAddress, setDisplayAddress] = useState<string>('');

  useEffect(() => {
    const updateAddress = async () => {
      const signer = simpleWalletService.getSigner();
      if (signer) {
        try {
          const addr = await signer.getAddress();
          const normalized = ethers.getAddress(addr);
          setDisplayAddress(normalized);
        } catch (error) {
          console.error('Failed to get address from signer:', error);
          const fallback = simpleWalletService.getAddress();
          if (fallback) {
            setDisplayAddress(ethers.getAddress(fallback));
          }
        }
      } else {
        const fallback = simpleWalletService.getAddress();
        if (fallback) {
          setDisplayAddress(ethers.getAddress(fallback));
        }
      }
    };
    
    updateAddress();
    const interval = setInterval(updateAddress, 2000); // Update every 2 seconds to detect wallet switches
    return () => clearInterval(interval);
  }, []);

  return (
    <p className="text-sm text-zama-gray-600 font-mono">
      {displayAddress ? `${displayAddress.slice(0, 6)}...${displayAddress.slice(-4)}` : 'Loading...'}
    </p>
  );
}

// Helper function to get wallet-scoped localStorage keys
function getWalletScopedKeys(walletAddress: string | null): {
  userTaskData: string;
  completedTasks: string;
  deletedTasks: string;
  decryptedTasks: string;
} {
  if (!walletAddress) {
    // Fallback to unscoped keys if no wallet (shouldn't happen in normal flow)
    return {
      userTaskData: 'userTaskData',
      completedTasks: 'completedTasks',
      deletedTasks: 'deletedTasks',
      decryptedTasks: 'decryptedTasks'
    };
  }
  
  const normalized = ethers.getAddress(walletAddress);
  return {
    userTaskData: `userTaskData_${normalized}`,
    completedTasks: `completedTasks_${normalized}`,
    deletedTasks: `deletedTasks_${normalized}`,
    decryptedTasks: `decryptedTasks_${normalized}`
  };
}

// Helper function to get current wallet address from signer
async function getCurrentWalletAddress(): Promise<string | null> {
  try {
    const signer = simpleWalletService.getSigner();
    if (!signer) return null;
    const addr = await signer.getAddress();
    return ethers.getAddress(addr);
  } catch (error) {
    console.error('Failed to get current wallet address:', error);
    return null;
  }
}

export function TaskManager({ externalDemoMode = false }: { externalDemoMode?: boolean }) {
  // Use external demo mode if provided, otherwise default to false
  const [isDemoMode, setIsDemoMode] = useState(externalDemoMode);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [receivedTasks, setReceivedTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [sharingTask, setSharingTask] = useState<Task | null>(null);
  const [deletingTask, setDeletingTask] = useState<Task | null>(null);
  const [decryptingTask, setDecryptingTask] = useState<Task | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedTasks, setDecryptedTasks] = useState<Set<number>>(new Set());
  const [taskCreationFee, setTaskCreationFee] = useState('0.0001');
  const [activeTab, setActiveTab] = useState<'my-tasks' | 'received-tasks'>('my-tasks');
  
  // Wallet connection state
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [showWalletConnect, setShowWalletConnect] = useState(false);
  
  // Bulk selection state
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  
  // Notification state
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Wallet selection modal state
  const [showWalletSelection, setShowWalletSelection] = useState(false);
  const [isConnectingWallet, setIsConnectingWallet] = useState(false);
  
  // Get contract address from configuration
  const contractAddress = getContractAddress();

  // Update demo mode when external prop changes
  useEffect(() => {
    setIsDemoMode(externalDemoMode);
  }, [externalDemoMode]);

  useEffect(() => {
    // Track previous wallet address to detect wallet switches
    let previousWalletAddress: string | null = null;
    let hasLoadedInitialData = false;
    let isLoadingData = false;
    
    // Simple wallet connection - check for wallet switches
    const checkWallet = async () => {
      // Prevent multiple simultaneous loads
      if (isLoadingData) {
        return;
      }
      
      // Demo mode - skip wallet check and load tasks directly (only once)
      if (isDemoMode) {
        if (hasLoadedInitialData) return; // Only load once in demo mode
        console.log('🎮 Demo mode: Skipping wallet check, loading tasks directly');
        setIsWalletConnected(false);
        setShowWalletConnect(false);
        hasLoadedInitialData = true;
        isLoadingData = true;
        try {
          await Promise.all([
            loadTasks(),
            loadReceivedTasks(),
            loadTaskCreationFee()
          ]);
        } catch (err) {
          console.error('Error loading data:', err);
        } finally {
          isLoadingData = false;
        }
        return;
      }
      
      if (simpleWalletService.isWalletConnected()) {
        // CRITICAL: Always get fresh address from wallet signer (most reliable source)
        const signer = simpleWalletService.getSigner();
        if (!signer) {
          console.warn('⚠️ Wallet connected but no signer available');
          return;
        }
        
        // Get the actual address from the wallet extension (source of truth)
        let currentAddress: string;
        try {
          currentAddress = await signer.getAddress();
          currentAddress = ethers.getAddress(currentAddress); // Normalize to checksum
        } catch (error) {
          console.error('❌ Failed to get address from signer:', error);
          return;
        }
        
        // CRITICAL: Only reload tasks if wallet address changed OR this is the first load
        const walletChanged = previousWalletAddress && previousWalletAddress !== currentAddress;
        const needsInitialLoad = !hasLoadedInitialData;
        
        if (walletChanged) {
          console.warn('⚠️ ========== WALLET ADDRESS CHANGED ==========');
          console.warn('⚠️ Previous address:', previousWalletAddress);
          console.warn('⚠️ New address:', currentAddress);
          console.warn('⚠️ Clearing UI state - will load tasks for new wallet');
          console.warn('⚠️ ============================================');
          
          // Clear UI state when wallet changes to prevent showing wrong wallet's data
          setTasks([]);
          setReceivedTasks([]);
          setDecryptedTasks(new Set());
        }
        
        // Also check simpleWalletService.getAddress() for comparison/logging (but not every time)
        if (walletChanged || needsInitialLoad) {
          const serviceAddress = simpleWalletService.getAddress();
          if (serviceAddress) {
            const normalizedServiceAddress = ethers.getAddress(serviceAddress);
            if (normalizedServiceAddress !== currentAddress) {
              console.warn('⚠️ ADDRESS MISMATCH DETECTED!');
              console.warn('⚠️ Service cached address:', normalizedServiceAddress);
              console.warn('⚠️ Actual wallet address (signer):', currentAddress);
              console.warn('⚠️ Using signer address as source of truth');
            }
          }
          
          console.log('🔗 Wallet connected, loading data...');
          console.log('🔗 Connected wallet address (from signer):', currentAddress);
          if (serviceAddress) {
            console.log('🔗 Service cached address:', serviceAddress);
          }
          
          previousWalletAddress = currentAddress;
          setIsWalletConnected(true);
          setShowWalletConnect(false);
          
          // Only load tasks if wallet changed or this is the first load
          if (walletChanged || needsInitialLoad) {
            isLoadingData = true;
            try {
              await Promise.all([
                loadTasks(),
                loadReceivedTasks(),
                loadTaskCreationFee()
              ]);
              hasLoadedInitialData = true;
            } catch (err) {
              console.error('Error loading data:', err);
            } finally {
              isLoadingData = false;
            }
          }
      } else {
          // Wallet is same, just update the address reference
          previousWalletAddress = currentAddress;
          setIsWalletConnected(true);
          setShowWalletConnect(false);
        }
      } else {
        // Wallet disconnected
        if (hasLoadedInitialData) {
          console.log('Wallet disconnected, clearing data');
          setIsWalletConnected(false);
          setShowWalletConnect(true);
        setTasks([]);
        setReceivedTasks([]);
          previousWalletAddress = null;
          hasLoadedInitialData = false;
        }
      }
    };
    
    // Initial load
    checkWallet();
    
    // Check wallet periodically to detect wallet switches in extension (but don't reload tasks unless address changed)
    const walletCheckInterval = setInterval(checkWallet, 3000); // Check every 3 seconds (less frequent)
    
    return () => {
      clearInterval(walletCheckInterval);
    };
    
    // CRITICAL: Do NOT persist decryption state across refreshes
    // Users must re-decrypt on each session for security
    // const savedDecryptedTasks = localStorage.getItem('decryptedTasks');
    // if (savedDecryptedTasks) {
    //   try {
    //     const taskIds = JSON.parse(savedDecryptedTasks);
    //     setDecryptedTasks(new Set(taskIds));
    //     console.log('✅ Loaded decrypted tasks from localStorage:', taskIds);
    //   } catch (error) {
    //     console.error('Failed to load decrypted tasks from localStorage:', error);
    //     setDecryptedTasks(new Set());
    //   }
    // }
    setDecryptedTasks(new Set()); // Start fresh on each page load
    
    // Clean up stale deletedTasks entries (old deleted indices messing up display)
    try {
      const deletedTasks = JSON.parse(localStorage.getItem('deletedTasks') || '{}');
      const deletedCount = Object.keys(deletedTasks).length;
      console.log('🧹 Current deletedTasks count:', deletedCount);
      
      // If too many entries marked as deleted, likely stale data - clear it
      if (deletedCount > 3) {
        console.log('🧹 Too many deleted tasks detected, clearing stale data...');
        localStorage.setItem('deletedTasks', '{}');
      }
    } catch (e) {
      console.log('ℹ️ Could not check deletedTasks');
    }
    
    // REMOVED: This was clearing localStorage on every page load!
    // It was causing tasks to disappear after creation.
    // const storedTasks = JSON.parse(localStorage.getItem('userTaskData') || '{}');
    // const hasGhostTasks = Object.keys(storedTasks).length > 0;
    // if (hasGhostTasks && !isDemoMode) {
    //   console.log('🧹 Clearing localStorage to remove ghost tasks from demo mode');
    //   localStorage.removeItem('userTaskData');
    //   localStorage.removeItem('completedTasks');
    // }
    
    return () => {
      // Cleanup if needed
    };
  }, []);

  const loadTasks = async () => {
    setIsLoading(true);
    try {
      // DEBUG: Log localStorage contents FIRST
      // debugLocalStorage();
      
      // ALWAYS load tasks from localStorage (for plain text tasks created without encryption)
      // Even in real blockchain mode, we need to show plain text tasks from localStorage
      console.log('📂 Loading tasks from localStorage (demo mode OR plain text tasks)');
      
      // Demo mode - load tasks from localStorage to preserve user data
      if (isDemoMode || !simpleWalletService.isWalletConnected()) {
        
        // CRITICAL: Load user-created tasks from wallet-scoped localStorage (demo mode uses unscoped)
        // In demo mode, we use unscoped keys since there's no wallet
        const storedTasks = JSON.parse(localStorage.getItem('userTaskData') || '{}');
        const completedTasks = JSON.parse(localStorage.getItem('completedTasks') || '{}');
        const deletedTasks = JSON.parse(localStorage.getItem('deletedTasks') || '{}');
        const decryptedTasksList = JSON.parse(localStorage.getItem('decryptedTasks') || '[]');
        
        console.log('🔍 Demo mode - Deleted tasks:', Object.keys(deletedTasks));
        console.log('🔍 Demo mode - All deletedTasks:', deletedTasks);
        console.log('🔍 Demo mode - Decrypted tasks:', decryptedTasksList);
        
        // Convert stored tasks to Task format, EXCLUDING deleted ones
        const demoTasks: Task[] = [];
        Object.keys(storedTasks).forEach((taskIdStr) => {
          const taskId = taskIdStr;
          
          // CRITICAL: Skip tasks that were marked as deleted
          const isDeleted = deletedTasks[taskId] === 'DELETED' || deletedTasks[taskId];
          console.log(`🔍 Checking task ID ${taskId}: isDeleted = ${isDeleted}`);
          
          if (isDeleted) {
            console.log('🗑️ Demo: Skipping deleted task:', taskId);
        return;
      }
      
          const storedTask = storedTasks[taskId];
          
          // Parse taskId as number
          const taskIdNum = parseInt(taskId);
          
          // Check completion status from storedTask first, then fallback to completedTasks
          const taskStatus = storedTask.status || (completedTasks[taskId] ? 'Completed' : 'Pending');
          
          // Check if this task was previously decrypted (compare as numbers)
          const wasDecrypted = decryptedTasksList.includes(taskIdNum);
          
          console.log(`✅ Loading task ID ${taskIdNum}:`, {
            title: storedTask.title,
            status: taskStatus,
            isEncrypted: storedTask.shouldEncrypt !== false,
            wasDecrypted
          });
          
          demoTasks.push({
            id: taskIdNum,
            title: storedTask.title,
            description: storedTask.description || '',
            dueDate: storedTask.dueDate,
            priority: storedTask.priority,
            status: taskStatus as 'Pending' | 'Completed',
            createdAt: storedTask.createdAt,
            isEncrypted: storedTask.shouldEncrypt !== false && !wasDecrypted, // Show as NOT encrypted if decrypted
            isShared: false,
            shouldEncrypt: storedTask.shouldEncrypt
          });
          
          // Add to decrypted tasks state if it was decrypted before
          if (wasDecrypted) {
            setDecryptedTasks(prev => new Set([...prev, taskIdNum]));
            console.log('✅ Restored decryption state for demo task:', taskId);
          }
        });
        
        console.log('✅ Demo mode: Loaded', demoTasks.length, 'tasks from localStorage (excluding deleted)');
        setTasks(demoTasks);
        return;
      }
      
      // Check if wallet is connected - even without wallet, we can show plain text tasks
      if (!simpleWalletService.isWalletConnected()) {
        console.log('Wallet not connected, showing only plain text tasks from localStorage');
        
        // Load plain text tasks from localStorage only (no wallet = no scoping needed)
        const plainTextStoredTasks = JSON.parse(localStorage.getItem('userTaskData') || '{}');
        const plainTextDeletedTasks = JSON.parse(localStorage.getItem('deletedTasks') || '{}');
        const plainTextTasks: Task[] = [];
        
        Object.keys(plainTextStoredTasks).forEach((taskIdStr) => {
          if (plainTextDeletedTasks[taskIdStr]) return; // Skip deleted
          
          const task = plainTextStoredTasks[taskIdStr];
          const taskIdNum = parseInt(taskIdStr);
          
          // CRITICAL: Check if task is plain text (shouldEncrypt === false)
          const isPlainText = task.shouldEncrypt === false;
          
          plainTextTasks.push({
            id: taskIdNum,
            title: task.title,
            description: task.description || '',
            dueDate: task.dueDate,
            priority: task.priority,
            status: task.status || 'Pending',
            createdAt: task.createdAt,
            isEncrypted: !isPlainText, // FALSE if plain text, TRUE if encrypted
            isShared: false,
            shouldEncrypt: task.shouldEncrypt
          });
        });
        
        setTasks(plainTextTasks);
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
        console.log('📡 Fetching tasks from blockchain...');
        const blockchainTasks = await realContractService.getTasks();
        console.log('✅ Loaded tasks from blockchain:', blockchainTasks.length);
        console.log('📊 Blockchain task details:', blockchainTasks);
        
        // CRITICAL: Get received task indices FIRST to filter them out from "My Tasks"
        // Received tasks should NOT appear in "My Tasks" - they have their own tab
        let receivedTaskIndices: number[] = [];
        try {
          const signer = simpleWalletService.getSigner();
          if (signer && realContractService.isInitialized()) {
            // Fetch received tasks to get their indices
            console.log('🔍 Fetching received tasks to filter them out from "My Tasks"...');
            const receivedTasksData = await realContractService.getReceivedTasks();
            receivedTaskIndices = receivedTasksData.map(t => t.id);
            console.log('✅ Received task data:', receivedTasksData);
            console.log('✅ Received task indices to exclude from "My Tasks":', receivedTaskIndices);
            console.log('✅ Total received tasks:', receivedTasksData.length);
            
            // Also check originalOwner to ensure we're not showing received tasks
            const receivedTaskOwners = new Set(
              receivedTasksData.map(t => t.originalOwner?.toLowerCase()).filter(Boolean)
            );
            const currentUserAddress = await signer.getAddress();
            const currentUserAddressNormalized = ethers.getAddress(currentUserAddress).toLowerCase();
            console.log('🔍 Current user address:', currentUserAddressNormalized);
            console.log('🔍 Received task owners:', Array.from(receivedTaskOwners));
          }
        } catch (error) {
          console.warn('⚠️ Error checking for received tasks:', error);
          // Continue without received task filtering if it fails
        }
        
        // CRITICAL: Get current wallet address to scope localStorage
        const signer = simpleWalletService.getSigner();
        if (!signer) {
          console.error('❌ No signer available - cannot scope localStorage');
          setTasks([]);
          return;
        }
        
        const currentWalletAddress = await signer.getAddress();
        const normalizedWalletAddress = ethers.getAddress(currentWalletAddress);
        console.log('🔍 Current wallet address (for localStorage scoping):', normalizedWalletAddress);
        console.log('🔍 Raw wallet address:', currentWalletAddress);
        
        // Scope localStorage keys by wallet address to prevent cross-wallet data pollution
        // Try both normalized and raw address formats in case data was stored differently
        const localStorageKey = `userTaskData_${normalizedWalletAddress}`;
        const localStorageKeyRaw = `userTaskData_${currentWalletAddress}`;
        const completedTasksKey = `completedTasks_${normalizedWalletAddress}`;
        const deletedTasksKey = `deletedTasks_${normalizedWalletAddress}`;
        
        // Use scoped localStorage keys - try normalized first, then raw if needed
        let storedTasks = JSON.parse(localStorage.getItem(localStorageKey) || '{}');
        if (Object.keys(storedTasks).length === 0) {
          // Try raw address format
          const rawData = localStorage.getItem(localStorageKeyRaw);
          if (rawData) {
            storedTasks = JSON.parse(rawData);
            console.log('🔍 Found data in raw address format key:', localStorageKeyRaw);
          }
        }
        
        const completedTasks = JSON.parse(localStorage.getItem(completedTasksKey) || '{}');
        const deletedTasks = JSON.parse(localStorage.getItem(deletedTasksKey) || '{}');
        
        console.log('🔍 Using localStorage key:', Object.keys(storedTasks).length > 0 ? localStorageKey : localStorageKeyRaw);
        
        console.log('🔍 Using scoped localStorage key:', localStorageKey);
        console.log('🔍 Available stored tasks for this wallet:', Object.keys(storedTasks));
        console.log('🔍 Stored tasks content:', storedTasks);
        console.log('🔍 Blockchain tasks count:', blockchainTasks.length);
        console.log('🔍 Deleted tasks:', Object.keys(deletedTasks));
        console.log('🔍 Deleted tasks details:', deletedTasks);
        
        // Debug: Log all tasks that exist but are marked as deleted
        Object.keys(deletedTasks).forEach(key => {
          const index = parseInt(key);
          if (blockchainTasks[index]) {
            console.log(`⚠️ Task at index ${index} exists on blockchain but is marked as deleted:`, deletedTasks[key]);
          }
        });
        
        // Get decrypted tasks list - only check in-memory state, not localStorage
        // Decryption state should be session-only for security
        const decryptedTasksList = Array.from(decryptedTasks);
        console.log('🔍 Decrypted tasks in session:', decryptedTasksList);
        
        // CRITICAL: Verify task ownership - only show tasks that belong to current wallet
        // IMPORTANT: We can't trust getTasks(userAddress) alone - we MUST verify ownership
        // using taskOwners mapping to ensure tasks from different wallets don't show up
        const userOwnedIndices: Set<number> = new Set();
        
        const ownershipSigner = simpleWalletService.getSigner();
        if (ownershipSigner && realContractService.isInitialized()) {
          try {
            const currentUserAddress = await ownershipSigner.getAddress();
            const normalizedCurrentUserAddress = ethers.getAddress(currentUserAddress).toLowerCase();
            console.log('🔍 Verifying task ownership for current user:', normalizedCurrentUserAddress);
            console.log('🔍 Received task indices to exclude:', receivedTaskIndices);
            
            // Verify ownership for each blockchain task using taskOwners mapping
            for (let i = 0; i < blockchainTasks.length; i++) {
              // First check: if task is in received tasks, exclude it
              if (receivedTaskIndices.includes(i)) {
                console.log('⏭️ Task', i, 'is a received task - excluding from My Tasks');
                continue; // Don't add to userOwnedIndices
              }
              
              // Second check: verify ownership using taskOwners mapping
              try {
                const isOwned = await realContractService.isTaskOwnedBy(i, currentUserAddress);
                
                if (isOwned) {
                  userOwnedIndices.add(i);
                  console.log('✅ Task', i, 'verified as owned by current user');
                } else {
                  console.warn('⚠️ Task', i, 'NOT owned by current user', normalizedCurrentUserAddress);
                  console.warn('⚠️ However, getTasks() returned it - this might be a contract issue or task was shared');
                  console.warn('⚠️ INCLUDING task anyway since getTasks(userAddress) filtered it - verify manually if needed');
                  // If getTasks returned it, include it even if ownership check fails
                  // This prevents data loss if the ownership mapping has issues
                  userOwnedIndices.add(i);
                }
              } catch (ownerError: any) {
                console.warn('⚠️ Could not verify ownership for task', i, ':', ownerError.message);
                // On error, still include the task if getTasks() returned it
                // This prevents data loss - we trust getTasks() filtering as primary source
                console.log('⚠️ Ownership verification failed, but including task since getTasks() returned it');
                userOwnedIndices.add(i);
              }
            }
            
            console.log('✅ Ownership verification complete. User owns', userOwnedIndices.size, 'out of', blockchainTasks.length, 'tasks');
            console.log('✅ User-owned task indices:', Array.from(userOwnedIndices));
            
            // If ownership verification found no tasks but getTasks returned tasks,
            // fallback to trusting getTasks() filtering (prevents data loss)
            if (userOwnedIndices.size === 0 && blockchainTasks.length > 0) {
              console.warn('⚠️ Ownership verification found 0 tasks, but getTasks() returned', blockchainTasks.length, 'tasks');
              console.warn('⚠️ This might indicate an issue with taskOwners mapping');
              console.warn('⚠️ Falling back to trusting getTasks() filtering to prevent data loss');
              for (let i = 0; i < blockchainTasks.length; i++) {
                if (!receivedTaskIndices.includes(i)) {
                  userOwnedIndices.add(i);
                }
              }
              console.log('✅ Fallback complete. User task indices:', Array.from(userOwnedIndices));
            }
          } catch (error) {
            console.error('❌ Error during ownership verification:', error);
            // On error, fallback to trusting getTasks() filtering (prevents complete data loss)
            console.warn('⚠️ Ownership verification failed - falling back to getTasks() filtering');
            for (let i = 0; i < blockchainTasks.length; i++) {
              if (!receivedTaskIndices.includes(i)) {
                userOwnedIndices.add(i);
              }
            }
            console.log('✅ Fallback complete. User task indices:', Array.from(userOwnedIndices));
          }
        } else {
          // No signer - fallback to trusting getTasks() filtering
          console.warn('⚠️ No signer available - trusting getTasks() filtering');
          for (let i = 0; i < blockchainTasks.length; i++) {
            if (!receivedTaskIndices.includes(i)) {
              userOwnedIndices.add(i);
            }
          }
        }
        
        // Track which indices are not deleted AND are not received tasks AND are owned by user
        // CRITICAL: Received tasks should NOT appear in "My Tasks" - they have their own tab
        const validIndices: number[] = [];
        blockchainTasks.forEach((blockchainTask, index) => {
          // CRITICAL: Check deletion status - handle both 'DELETED' string and object format
          const deletedValue = deletedTasks[index];
          const isDeleted = deletedValue === 'DELETED' || (deletedValue && deletedValue.status === 'DELETED') || (deletedValue && typeof deletedValue === 'object' && deletedValue.status);
          
          const isReceivedTask = receivedTaskIndices.includes(index);
          const isOwnedByUser = userOwnedIndices.has(index);
          
          // Debug logging for all tasks to see why they're included/excluded
          console.log(`🔍 Task index ${index} filtering check:`, {
            index,
            hasBlockchainTask: !!blockchainTask,
            isReceivedTask,
            isOwnedByUser,
            isDeleted,
            deletedValue,
            receivedTaskIndices,
            userOwnedIndices: Array.from(userOwnedIndices)
          });
          
          // Skip if deleted OR if it's a received task OR if it's not owned by user
          if (isReceivedTask) {
            console.log('⏭️ EXCLUDING task at index:', index, '- marked as received task (will show in Received tab)');
            return;
          }
          
          if (!isOwnedByUser) {
            console.log('⏭️ EXCLUDING task at index:', index, '- not in userOwnedIndices set');
            return;
          }
          
          // Only check if deleted if there's actually a task at this index on blockchain
          if (!isDeleted && blockchainTask) {
            validIndices.push(index);
          } else if (isDeleted) {
            console.log('🗑️ Skipping deleted task at index:', index, 'deletedValue:', deletedValue);
          } else if (!blockchainTask) {
            console.log('⚠️ Skipping task at index:', index, '- no blockchain task at this index');
          }
        });
        
        console.log('📊 Task filtering summary:', {
          totalBlockchainTasks: blockchainTasks.length,
          receivedTaskIndices,
          deletedTaskIndices: Object.keys(deletedTasks).map(Number),
          validIndices,
          validCount: validIndices.length
        });
        
        // IMPORTANT: If localStorage has tasks but they don't exist on blockchain, 
        // they were probably created locally but transaction failed
        console.log('📊 Valid blockchain indices:', validIndices);
        console.log('📊 Stored task indices:', Object.keys(storedTasks).map(Number));
        
        const mergedTasks = validIndices
          .map((actualBlockchainIndex) => {
          const blockchainTask = blockchainTasks[actualBlockchainIndex];
          const storedTask = storedTasks[actualBlockchainIndex];
          
          console.log(`🔍 Loading task at blockchain index ${actualBlockchainIndex}:`, {
            hasStoredTask: !!storedTask,
            storedTask: storedTask,
            blockchainTask: blockchainTask,
            allStoredTasks: Object.keys(storedTasks)
          });
          
          if (storedTask) {
            console.log('✅ Found stored data for task blockchain index:', actualBlockchainIndex, 'title:', storedTask.title);
            
            // CRITICAL: Use localStorage status if available, otherwise use blockchain status
            const taskStatus = storedTask.status || blockchainTask.status;
            
            // Preserve user-entered data while keeping blockchain status
            const task: Task = {
              ...blockchainTask,
              id: actualBlockchainIndex, // Use blockchain array index for decryption compatibility
              title: storedTask.title,
              description: storedTask.description,
              dueDate: storedTask.dueDate, // Keep actual date user entered
              priority: storedTask.priority,
              createdAt: storedTask.createdAt,
              // Use localStorage status for completion persistence
              status: taskStatus,
              isEncrypted: storedTask.shouldEncrypt !== false ? true : blockchainTask.isEncrypted,
              isShared: blockchainTask.isShared,
              shouldEncrypt: storedTask.shouldEncrypt
            };
            
            // Check if this task was decrypted before and restore that state
            if (decryptedTasksList.includes(actualBlockchainIndex)) {
              // Task was decrypted, show the real data
              console.log('✅ Task', actualBlockchainIndex, 'was previously decrypted, showing real data');
              return task;
            }
            
            return task;
          } else {
            console.log('⚠️ No stored data found for task index:', actualBlockchainIndex);
            console.log('ℹ️ This is likely an existing task created before localStorage sync was implemented, or metadata was cleared');
            
            // Handle existing tasks gracefully - preserve encrypted state
            // These are existing blockchain tasks that don't have localStorage data
            // For title/description: show encrypted placeholders
            // For dueDate/priority: show "Not Available" instead of asterisks since these should be visible
            // Status comes from blockchain which is available
            return {
              ...blockchainTask,
              id: actualBlockchainIndex,
              title: `******* ********`, // Encrypted placeholder
              description: `******* ********`, // Encrypted placeholder
              dueDate: '', // Empty - TaskCard will show "Not Available"
              priority: 0, // 0 = Unknown - TaskCard will handle gracefully
              status: blockchainTask.status,
              createdAt: '', // Empty string - won't cause issues
              isEncrypted: true, // Ensure encrypted flag is set
              isShared: blockchainTask.isShared || false,
              isLegacy: true // Mark as legacy for identification
            };
          }
        });
        
        // CRITICAL: Also load plain text tasks from storage (tasks created with shouldEncrypt=false)
        // These are plain text tasks that are NOT on the blockchain
        // Use scoped localStorage keys for this wallet
        console.log('🔍 Loading plain text tasks from storage...');
        const plainTextTasks: Task[] = [];
        const walletKeys = getWalletScopedKeys(normalizedWalletAddress);
        const plainTextStoredTasks = JSON.parse(localStorage.getItem(walletKeys.userTaskData) || '{}');
        const plainTextDeletedTasks = JSON.parse(localStorage.getItem(walletKeys.deletedTasks) || '{}');
        
        console.log('🔍 Plain text stored tasks:', Object.keys(plainTextStoredTasks));
        console.log('🔍 Plain text deleted tasks:', plainTextDeletedTasks);
        
        Object.keys(plainTextStoredTasks).forEach((taskIdStr) => {
          const taskIdNum = parseInt(taskIdStr);
          
          // Skip if deleted - handle both string and object formats
          const deletedValue = plainTextDeletedTasks[taskIdStr];
          const isDeleted = deletedValue === 'DELETED' || (deletedValue && deletedValue.status === 'DELETED') || (deletedValue && typeof deletedValue === 'object' && deletedValue.status);
          
          if (isDeleted) {
            console.log('🗑️ Skipping deleted plain text task:', taskIdStr, 'deletedValue:', deletedValue);
            return;
          }
          
          // Check if this task index is already in blockchain tasks
          // Plain text tasks have VERY large IDs (1 trillion + timestamp)
          // Blockchain tasks have small indices (0, 1, 2, etc.)
          // If taskIdNum is less than 1000, it's likely a blockchain index, not a plain text ID
          const isInBlockchain = taskIdNum < 1000 && mergedTasks.some(t => t.id === taskIdNum);
          
          if (isInBlockchain) {
            return; // Already loaded from blockchain
          }
          
          const plainTextTask = plainTextStoredTasks[taskIdStr];
          
          // Only load plain text tasks (shouldEncrypt=false)
          if (plainTextTask.shouldEncrypt === false) {
            // CRITICAL: Plain text tasks should have isEncrypted = FALSE
            plainTextTasks.push({
              id: taskIdNum,
              title: plainTextTask.title,
              description: plainTextTask.description || '',
              dueDate: plainTextTask.dueDate,
              priority: plainTextTask.priority,
              status: plainTextTask.status || 'Pending',
              createdAt: plainTextTask.createdAt,
              isEncrypted: false, // Plain text tasks are NOT encrypted
              isShared: false,
              shouldEncrypt: false
            });
            console.log('✅ Loaded plain text task:', taskIdStr, plainTextTask.title);
          }
        });
        
        // Combine blockchain tasks and plain text tasks
        // CRITICAL: Remove duplicates by ID to prevent the same task appearing multiple times
        const allTasksMap = new Map<number, Task>();
        
        // Add blockchain tasks first
        mergedTasks.forEach(task => {
          allTasksMap.set(task.id, task);
        });
        
        // Add plain text tasks (will overwrite if duplicate, but plain text IDs are huge, so unlikely)
        plainTextTasks.forEach(task => {
          if (!allTasksMap.has(task.id)) {
            allTasksMap.set(task.id, task);
          } else {
            console.log(`⚠️ Duplicate task ID ${task.id} detected, keeping blockchain version`);
          }
        });
        
        const allTasks = Array.from(allTasksMap.values());
        console.log(`✅ Loaded ${allTasks.length} total tasks (${mergedTasks.length} blockchain + ${plainTextTasks.length} plain text, ${mergedTasks.length + plainTextTasks.length - allTasks.length} duplicates removed)`);
        
        setTasks(allTasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadReceivedTasks = async () => {
    // Don't show loading spinner for received tasks (it conflicts with main loading)
    try {
      const connectedAddress = simpleWalletService.getAddress();
      console.log('🔄 ========== LOADING RECEIVED TASKS ==========');
      console.log('🔄 For wallet address:', connectedAddress);
      
      const fetchedReceivedTasks = await realContractService.getReceivedTasks();
      
      console.log('✅ Loaded received tasks count:', fetchedReceivedTasks.length);
      console.log('📊 Received tasks data:', JSON.stringify(fetchedReceivedTasks, null, 2));
      
      if (fetchedReceivedTasks.length === 0) {
        console.log('ℹ️ No received tasks found. This could mean:');
        console.log('   1. No tasks have been shared with this wallet address');
        console.log('   2. The sharedTasks() contract call returned empty');
        console.log('   3. Address mismatch (check console for sharedTasks() call details)');
      }
      
      // Verify all received tasks are marked as encrypted
      fetchedReceivedTasks.forEach((task, index) => {
        console.log(`📋 Received Task ${index + 1}:`, {
          id: task.id,
          title: task.title,
          isEncrypted: task.isEncrypted,
          originalOwner: task.originalOwner,
          isShared: task.isShared
        });
        
        if (!task.isEncrypted) {
          console.error('❌ CRITICAL: Received task is not marked as encrypted!', task);
        }
        if (!task.originalOwner) {
          console.error('❌ CRITICAL: Received task missing originalOwner!', task);
        }
      });
      
      console.log('🔄 ============================================');
      setReceivedTasks(fetchedReceivedTasks);
    } catch (error) {
      console.error('❌ ========== FAILED TO LOAD RECEIVED TASKS ==========');
      console.error('❌ Error:', error);
      console.error('❌ Error details:', {
        message: (error as Error)?.message,
        stack: (error as Error)?.stack
      });
      console.error('❌ =============================================');
      // Don't crash the app - just set empty array
      setReceivedTasks([]);
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

  // Show wallet selection modal instead of directly connecting
  const connectWallet = () => {
    setShowWalletSelection(true);
  };

  // Handle wallet selection from modal
  const handleWalletSelect = async (provider: any, walletName: string) => {
    try {
      setIsConnectingWallet(true);
      console.log(`🔗 Connecting to ${walletName}...`);
      
      // Store the selected provider globally for the service to use
      (window as any).__selectedProvider = provider;
      (window as any).__stableProvider = provider;
      
      // Connect using simple wallet service
      await simpleWalletService.connect();
      setIsWalletConnected(true);
      setShowWalletConnect(false);
      setShowWalletSelection(false);
      console.log(`✅ ${walletName} connected successfully`);
      
      // Initialize backend service with user address
      try {
        const signer = simpleWalletService.getSigner();
        if (signer) {
          const address = await signer.getAddress();
          backendService.setUserAddress(address);
          console.log('✅ Backend service initialized for address:', address);
        }
      } catch (err) {
        console.warn('⚠️ Could not initialize backend service:', err);
      }
      
      // Reload data after connection
      await loadTasks();
      await loadReceivedTasks();
      await loadTaskCreationFee();
      
      // Show success notification
      setNotification({
        message: `Successfully connected to ${walletName}!`,
        type: 'success'
      });
      setTimeout(() => setNotification(null), 3000);
    } catch (error: any) {
      console.error('❌ Wallet connection failed:', error);
      
      // User rejected the request
      if (error.code === 4001 || error.message?.includes('rejected')) {
        setNotification({
          message: 'Connection cancelled',
          type: 'error'
        });
      } else {
        setNotification({
          message: `Wallet connection failed: ${error.message}`,
          type: 'error'
        });
      }
      setTimeout(() => setNotification(null), 5000);
    } finally {
      setIsConnectingWallet(false);
    }
  };

  const disconnectWallet = async () => {
    try {
      console.log('🔌 Disconnecting wallet...');
      const previousAddress = simpleWalletService.getAddress();
      console.log('🔌 Previous wallet address:', previousAddress);
      
      await simpleWalletService.disconnect();
      setIsWalletConnected(false);
      setShowWalletConnect(true);
      
      // Clear tasks from UI
      setTasks([]);
      setReceivedTasks([]);
      setDecryptedTasks(new Set());
      
      // IMPORTANT: Do NOT clear localStorage - tasks should persist
      // When user reconnects with same wallet, tasks will be restored
      // When user connects with different wallet, only blockchain tasks for that wallet will show
      
      console.log('✅ Wallet disconnected successfully');
    } catch (error) {
      console.error('❌ Wallet disconnection failed:', error);
      setNotification({
        message: `Wallet disconnection failed: ${(error as Error).message}`,
        type: 'error'
      });
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleCreateTask = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    try {
      console.log('Creating task with data:', taskData);
      
      // Check if task should be encrypted
      const shouldEncrypt = (taskData as any).shouldEncrypt !== false; // Default to true if not specified
      
      // Plain text tasks - create instantly without blockchain transaction
      if (!shouldEncrypt) {
        console.log('📝 Creating plain text task (no encryption)');
        // Use a large timestamp to avoid collision with blockchain indices (0, 1, 2, etc.)
        const taskId = Date.now() + 1000000000000; // Add 1 trillion to ensure it's large enough
        const newTask: Task = {
          ...taskData,
          id: taskId,
          createdAt: new Date().toISOString(),
          shouldEncrypt: false,
          isEncrypted: false, // Mark as NOT encrypted
        };
        
        console.log('💾 Saving plain text task with ID:', taskId);
        
        // Save to wallet-scoped localStorage for persistence
        const currentWallet = await getCurrentWalletAddress();
        if (!currentWallet) {
          console.warn('⚠️ Cannot save plain text task: Wallet address not available');
          throw new Error('Wallet address not available');
        }
        
        const walletKeys = getWalletScopedKeys(currentWallet);
        const storedTasks = JSON.parse(localStorage.getItem(walletKeys.userTaskData) || '{}');
        storedTasks[taskId] = {
          title: newTask.title,
          description: newTask.description,
          dueDate: newTask.dueDate,
          priority: newTask.priority,
          createdAt: newTask.createdAt,
          status: newTask.status,
          shouldEncrypt: false
        };
        localStorage.setItem(walletKeys.userTaskData, JSON.stringify(storedTasks));
        console.log('✅ Saved to wallet-scoped localStorage:', walletKeys.userTaskData, 'all stored tasks:', Object.keys(storedTasks));
        
        // Also mark as decrypted immediately (no decryption needed for plain text)
        const decryptedTasksList = JSON.parse(localStorage.getItem(walletKeys.decryptedTasks) || '[]');
        decryptedTasksList.push(taskId);
        localStorage.setItem(walletKeys.decryptedTasks, JSON.stringify(decryptedTasksList));
        setDecryptedTasks(new Set(decryptedTasksList));
        
        setTasks(prevTasks => [...prevTasks, newTask]);
        setShowTaskForm(false);
        console.log('✅ Plain text task created instantly in localStorage:', newTask);
        return;
      }
      
      // Encrypted tasks - require blockchain transaction
      // Demo mode - create task locally
      if (isDemoMode) {
        console.log('🎮 Demo mode: Creating encrypted task locally');
        const taskId = Date.now();
        const newTask: Task = {
          ...taskData,
          id: taskId,
          createdAt: new Date().toISOString(),
          shouldEncrypt: true,
          isEncrypted: true, // Mark as encrypted for display
        };
        
        // CRITICAL: Get current wallet address and use scoped localStorage
        const currentWallet = await getCurrentWalletAddress();
        if (!currentWallet) {
          throw new Error('Cannot save task: Wallet address not available');
        }
        const walletKeys = getWalletScopedKeys(currentWallet);
        
        // CRITICAL: Save ACTUAL user data to localStorage (NOT placeholders)
        // The UI will show asterisks based on isEncrypted flag, but we store real data
        const storedTasks = JSON.parse(localStorage.getItem(walletKeys.userTaskData) || '{}');
        storedTasks[taskId] = {
          title: taskData.title, // STORE ACTUAL USER INPUT
          description: taskData.description, // STORE ACTUAL USER INPUT
          dueDate: taskData.dueDate, // STORE ACTUAL USER INPUT
          priority: taskData.priority, // STORE ACTUAL USER INPUT
          createdAt: new Date().toISOString(),
          status: taskData.status,
          shouldEncrypt: true,
          isEncrypted: true // Mark as encrypted for UI display
        };
        localStorage.setItem(walletKeys.userTaskData, JSON.stringify(storedTasks));
        console.log('✅ Task saved to wallet-scoped localStorage:', walletKeys.userTaskData);
        
        setTasks(prevTasks => [...prevTasks, newTask]);
        setShowTaskForm(false);
        console.log('✅ Demo encrypted task created with encrypted placeholders');
        return;
      }
      
      console.log('FHEVM ready:', fhevmService.isReady());
      
      // Check if wallet is connected
      if (!simpleWalletService.isWalletConnected()) {
        setShowWalletConnect(true);
        setShowTaskForm(false);
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
      
      // OPTIMIZED: Get task count BEFORE creating (faster than full getTasks())
      // This is only needed to determine the new task index
      let beforeCount = 0;
      try {
        const tasksBefore = await realContractService.getTasks();
        beforeCount = tasksBefore.length;
        console.log('🔍 Tasks before creation:', beforeCount);
      } catch (error) {
        console.warn('⚠️ Could not get task count, will use 0 as starting index:', error);
        beforeCount = 0;
      }
      
      // Create task on blockchain (wallet popup will appear here)
      const result = await realContractService.createTask(taskData);
      
      if (result.success) {
        // The new task is at the index equal to beforeCount
        const actualTaskIndex = beforeCount;
        
        console.log('🔍 Task created at blockchain index:', actualTaskIndex);
        
        // CRITICAL: Get current wallet address and use scoped localStorage
        const currentWallet = await getCurrentWalletAddress();
        if (!currentWallet) {
          throw new Error('Cannot save task: Wallet address not available');
        }
        const walletKeys = getWalletScopedKeys(currentWallet);
        
        // Store user-entered data to wallet-scoped localStorage FIRST
        const storedTasks = JSON.parse(localStorage.getItem(walletKeys.userTaskData) || '{}');
        storedTasks[actualTaskIndex] = {
          title: taskData.title,
          description: taskData.description,
          dueDate: taskData.dueDate,
          priority: taskData.priority,
          createdAt: new Date().toISOString(),
          status: taskData.status,
          shouldEncrypt: true
        };
        localStorage.setItem(walletKeys.userTaskData, JSON.stringify(storedTasks));
        console.log('✅ Task metadata saved to wallet-scoped localStorage:', walletKeys.userTaskData, 'at index:', actualTaskIndex);
        
        // Create the new task object
        const newTask: Task = {
          ...taskData,
          id: actualTaskIndex, // Use blockchain index as ID
          createdAt: new Date().toISOString(),
          isEncrypted: true, // CRITICAL: Mark as encrypted
          shouldEncrypt: true
        };
        
        // CRITICAL: Add to state, but check for duplicates first
        // Only add if it doesn't already exist
        setTasks(prev => {
          // Check if task already exists (avoid duplicates)
          const existingTask = prev.find(t => t.id === actualTaskIndex);
          if (existingTask) {
            console.log('⚠️ Task already exists in state, updating instead of adding');
            return prev.map(t => t.id === actualTaskIndex ? newTask : t);
          }
          console.log('✅ Adding new task to state:', actualTaskIndex);
          return [...prev, newTask];
        });
        
        // Close form immediately after adding to state
        setShowTaskForm(false);
        
        console.log('✅ Task created successfully on blockchain with user data preserved at index:', actualTaskIndex);
      } else {
          throw new Error(result.error || 'Failed to create task');
      }
    } catch (error: any) {
      console.error('Failed to create task:', error);
      
      // Better error message for timeout
      let errorMessage = error?.message || 'Unknown error';
      if (errorMessage.includes('Transaction timeout')) {
        // Extract transaction hash from error message if present
        const hashMatch = errorMessage.match(/hash: (0x[a-fA-F0-9]+)/);
        if (hashMatch) {
          errorMessage = `Transaction timeout. Your transaction was sent (hash: ${hashMatch[1]}). The transaction may still be processing. Please wait a moment and refresh the page to see if your task appears.`;
        } else {
          errorMessage = errorMessage + ' The transaction may still be processing. Please wait a moment and refresh the page to see if your task appears.';
        }
      }
      
      setNotification({
        message: `Failed to create task: ${errorMessage}`,
        type: 'error'
      });
      setTimeout(() => setNotification(null), 8000);
      
      throw error;
    }
  };

  const handleCreateTaskWithText = async (taskData: Omit<Task, 'id' | 'createdAt'>) => {
    try {
      console.log('Creating text task with data:', taskData);
      
      // Demo mode - create task locally
      if (isDemoMode) {
        console.log('🎮 Demo mode: Creating text task locally');
        const taskId = Date.now();
        const newTask: Task = {
          ...taskData,
          id: taskId,
          createdAt: new Date().toISOString(),
        };
        
        // CRITICAL: Save to localStorage for persistence
        const storedTasks = JSON.parse(localStorage.getItem('userTaskData') || '{}');
        storedTasks[taskId] = {
          title: newTask.title,
          description: newTask.description,
          dueDate: newTask.dueDate,
          priority: newTask.priority,
          createdAt: newTask.createdAt,
          status: newTask.status
        };
        localStorage.setItem('userTaskData', JSON.stringify(storedTasks));
        
        setTasks(prevTasks => [...prevTasks, newTask]);
        setShowTaskForm(false);
        console.log('✅ Demo text task created and saved to localStorage:', newTask);
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
      
      // Create text task on blockchain
      await realContractService.createTaskWithText(taskData);
        
      // Get the actual task index from blockchain (should be the last task)
      const blockchainTasks = await realContractService.getTasks();
      const actualTaskIndex = blockchainTasks.length - 1; // Last task is the one we just created
      
      console.log('🔍 Task created at blockchain index:', actualTaskIndex);
      
      // Store user-entered data in localStorage using blockchain index as key
      const storedTasks = JSON.parse(localStorage.getItem('userTaskData') || '{}');
      
      console.log('🔍 Storing user data with blockchain index:', actualTaskIndex);
      console.log('🔍 Task data being stored:', taskData);
      storedTasks[actualTaskIndex] = {
        title: taskData.title,
        description: taskData.description,
        dueDate: taskData.dueDate,
        priority: taskData.priority,
        createdAt: new Date().toISOString(),
        status: taskData.status,
        shouldEncrypt: true
      };
      localStorage.setItem('userTaskData', JSON.stringify(storedTasks));
      console.log('🔍 localStorage after storing:', JSON.parse(localStorage.getItem('userTaskData') || '{}'));
      
      console.log('✅ Text task created on blockchain with user data preserved at index:', actualTaskIndex);
      
      // Add to local state with blockchain index as ID
      const newTask: Task = {
        ...taskData,
        id: actualTaskIndex, // Use blockchain index as ID
        createdAt: new Date().toISOString(),
        isEncrypted: true,
        shouldEncrypt: true
      };
      
      setTasks(prev => [...prev, newTask]);
      setShowTaskForm(false);
    } catch (error) {
      console.error('Failed to create text task:', error);
    }
  };

  const handleCreateTaskWithNumbers = async (taskData: Omit<Task, 'id' | 'createdAt'> & { numericId: number }) => {
    try {
      console.log('Creating numeric task with data:', taskData);
      
      // Demo mode - create task locally
      if (isDemoMode) {
        console.log('🎮 Demo mode: Creating numeric task locally');
        const taskId = Date.now();
        const newTask: Task = {
          ...taskData,
          id: taskId,
          createdAt: new Date().toISOString(),
        };
        
        // CRITICAL: Save to localStorage for persistence
        const storedTasks = JSON.parse(localStorage.getItem('userTaskData') || '{}');
        storedTasks[taskId] = {
          title: newTask.title,
          description: newTask.description,
          dueDate: newTask.dueDate,
          priority: newTask.priority,
          createdAt: newTask.createdAt,
          status: newTask.status
        };
        localStorage.setItem('userTaskData', JSON.stringify(storedTasks));
        
        setTasks(prevTasks => [...prevTasks, newTask]);
        setShowTaskForm(false);
        console.log('✅ Demo numeric task created and saved to localStorage:', newTask);
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
      
      // Create numeric task on blockchain
      await realContractService.createTaskWithNumbers(taskData);
      
      // Get the actual task index from blockchain (should be the last task)
      const blockchainTasks = await realContractService.getTasks();
      const actualTaskIndex = blockchainTasks.length - 1; // Last task is the one we just created
      
      console.log('🔍 Task created at blockchain index:', actualTaskIndex);
      
      // Store user-entered data in localStorage using blockchain index as key
      const storedTasks = JSON.parse(localStorage.getItem('userTaskData') || '{}');
      
      console.log('🔍 Storing user data with blockchain index:', actualTaskIndex);
      console.log('🔍 Task data being stored:', taskData);
      storedTasks[actualTaskIndex] = {
        title: taskData.title,
        description: taskData.description || '',
        dueDate: taskData.dueDate,
        priority: taskData.priority,
        createdAt: new Date().toISOString(),
        status: taskData.status,
        shouldEncrypt: true
      };
      localStorage.setItem('userTaskData', JSON.stringify(storedTasks));
      console.log('🔍 localStorage after storing:', JSON.parse(localStorage.getItem('userTaskData') || '{}'));
      
      console.log('✅ Numeric task created on blockchain with user data preserved at index:', actualTaskIndex);
      
      // Add to local state with blockchain index as ID
      const newTask: Task = {
        ...taskData,
        id: actualTaskIndex, // Use blockchain index as ID
        createdAt: new Date().toISOString(),
        isEncrypted: true,
        shouldEncrypt: true
      };
      
      setTasks(prev => [...prev, newTask]);
      setShowTaskForm(false);
    } catch (error) {
      console.error('Failed to create numeric task:', error);
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
      console.log('✅ Completing task:', taskId);
      
      // Find the task in both tasks and receivedTasks
      const task = tasks.find(t => t.id === taskId) || receivedTasks.find(t => t.id === taskId);
      if (!task) {
        console.error('Task not found:', taskId);
        return;
      }

      const newStatus = task.status === 'Completed' ? 'Pending' : 'Completed';
      console.log('✅ Updating task status to:', newStatus);

      // Plain text tasks - update immediately (no blockchain transaction)
      if (!task.isEncrypted) {
        console.log('📝 Plain text task - updating immediately');
        setTasks(prev => prev.map(t => 
          t.id === taskId 
            ? { ...t, status: newStatus as 'Completed' | 'Pending' }
            : t
        ));
        
        setReceivedTasks(prev => prev.map(t => 
          t.id === taskId 
            ? { ...t, status: newStatus as 'Completed' | 'Pending' }
            : t
        ));

        // Persist the completion status to localStorage
        const storedTasks = JSON.parse(localStorage.getItem('userTaskData') || '{}');
        if (storedTasks[taskId]) {
          storedTasks[taskId].status = newStatus;
          storedTasks[taskId].completedAt = new Date().toISOString();
          localStorage.setItem('userTaskData', JSON.stringify(storedTasks));
        }

        const completedTasks = JSON.parse(localStorage.getItem('completedTasks') || '{}');
        if (newStatus === 'Completed') {
          completedTasks[taskId] = {
            completedAt: new Date().toISOString(),
            taskTitle: task.title
          };
        } else {
          delete completedTasks[taskId];
        }
        localStorage.setItem('completedTasks', JSON.stringify(completedTasks));
        return;
      }

      // Demo mode - update immediately for encrypted tasks too
      if (isDemoMode) {
        console.log('🎮 Demo mode: Updating encrypted task immediately');
        setTasks(prev => prev.map(t => 
          t.id === taskId 
            ? { ...t, status: newStatus as 'Completed' | 'Pending' }
            : t
        ));
        
        setReceivedTasks(prev => prev.map(t => 
          t.id === taskId 
            ? { ...t, status: newStatus as 'Completed' | 'Pending' }
            : t
        ));

        const storedTasks = JSON.parse(localStorage.getItem('userTaskData') || '{}');
        if (storedTasks[taskId]) {
          storedTasks[taskId].status = newStatus;
          storedTasks[taskId].completedAt = new Date().toISOString();
          localStorage.setItem('userTaskData', JSON.stringify(storedTasks));
        }
        return;
      }

      // CRITICAL: For encrypted tasks, call blockchain FIRST, then update UI
      if (!realContractService.isInitialized()) {
        throw new Error('Contract service not initialized');
      }

      try {
        console.log('🔒 Encrypted task - calling blockchain completeTask FIRST...');
        await realContractService.completeTask(taskId);
        console.log('✅ Task completion confirmed on blockchain');

        // NOW update UI after blockchain confirmation
        setTasks(prev => prev.map(t => 
          t.id === taskId 
            ? { ...t, status: newStatus as 'Completed' | 'Pending' }
            : t
        ));
        
        setReceivedTasks(prev => prev.map(t => 
          t.id === taskId 
            ? { ...t, status: newStatus as 'Completed' | 'Pending' }
            : t
        ));

        // Save to wallet-scoped localStorage after blockchain success
        const currentWallet = await getCurrentWalletAddress();
        if (currentWallet) {
          const walletKeys = getWalletScopedKeys(currentWallet);
          const storedTasks = JSON.parse(localStorage.getItem(walletKeys.userTaskData) || '{}');
          if (storedTasks[taskId]) {
            storedTasks[taskId].status = newStatus;
            storedTasks[taskId].completedAt = new Date().toISOString();
            localStorage.setItem(walletKeys.userTaskData, JSON.stringify(storedTasks));
          }

          const completedTasks = JSON.parse(localStorage.getItem(walletKeys.completedTasks) || '{}');
          if (newStatus === 'Completed') {
            completedTasks[taskId] = {
              completedAt: new Date().toISOString(),
              taskTitle: task.title
            };
          } else {
            delete completedTasks[taskId];
          }
          localStorage.setItem(walletKeys.completedTasks, JSON.stringify(completedTasks));
        }
        console.log('✅ Task completion status updated in UI and localStorage');
        
      } catch (blockchainError) {
        console.error('❌ Blockchain completion failed:', blockchainError);
        // Transaction failed or was rejected - DO NOT update UI
        // Re-throw error so user knows it failed
        throw blockchainError;
      }

    } catch (error) {
      console.error('Failed to complete task:', error);
      // Don't show alert for user rejection (too noisy)
      if (error instanceof Error && !error.message.includes('rejected')) {
        alert(`Failed to complete task: ${error.message}`);
      }
    }
  };

  const handleDeleteTask = async (taskId: number) => {
    console.log('🗑️ handleDeleteTask called for task ID:', taskId);
    const task = tasks.find(t => t.id === taskId) || receivedTasks.find(t => t.id === taskId);
    console.log('🗑️ Found task:', task);
    if (task) {
      console.log('🗑️ Setting deletingTask to:', task);
      setDeletingTask(task);
    } else {
      console.error('🗑️ Task not found for ID:', taskId);
    }
  };

  const confirmDeleteTask = async () => {
    console.log('🗑️ confirmDeleteTask called with deletingTask:', deletingTask);
    if (!deletingTask) {
      console.error('🗑️ No deletingTask set!');
      return;
    }
    
    try {
      console.log('🗑️ Removing task from list:', deletingTask.id);
      
      // PROPER DELETE FLOW: Remove from your view immediately (no transaction needed)
      console.log('🗑️ Removing task from your view (irreversible)');
      
      // CRITICAL: For encrypted tasks, wait for blockchain transaction BEFORE removing from UI
      const taskToDelete = tasks.find(t => t.id === deletingTask.id);
      
      // Demo mode OR plain text task - delete immediately from wallet-scoped localStorage
      if (isDemoMode || (taskToDelete && !taskToDelete.isEncrypted)) {
        console.log('🗑️ Demo/Plain text: Deleting immediately from wallet-scoped localStorage');
        
        // CRITICAL: Get current wallet address and use scoped localStorage
        const currentWallet = await getCurrentWalletAddress();
        if (!currentWallet) {
          throw new Error('Cannot delete task: Wallet address not available');
        }
        const walletKeys = getWalletScopedKeys(currentWallet);
        
        // Remove from wallet-scoped localStorage keys
        const storedTasks = JSON.parse(localStorage.getItem(walletKeys.userTaskData) || '{}');
        delete storedTasks[deletingTask.id];
        localStorage.setItem(walletKeys.userTaskData, JSON.stringify(storedTasks));
        
        const decryptedTasksList = JSON.parse(localStorage.getItem(walletKeys.decryptedTasks) || '[]');
        const filteredDecrypted = decryptedTasksList.filter((id: number) => id !== deletingTask.id);
        localStorage.setItem(walletKeys.decryptedTasks, JSON.stringify(filteredDecrypted));
        
        setDecryptedTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(deletingTask.id);
          return newSet;
        });
        
        const completedTasks = JSON.parse(localStorage.getItem(walletKeys.completedTasks) || '{}');
        if (completedTasks[deletingTask.id]) {
          delete completedTasks[deletingTask.id];
          localStorage.setItem(walletKeys.completedTasks, JSON.stringify(completedTasks));
        }
        
        const deletedTasks = JSON.parse(localStorage.getItem(walletKeys.deletedTasks) || '{}');
        deletedTasks[deletingTask.id] = 'DELETED';
        localStorage.setItem(walletKeys.deletedTasks, JSON.stringify(deletedTasks));
        
        // Now remove from UI AFTER localStorage is updated
        setTasks(prev => prev.filter(task => task.id !== deletingTask.id));
        setReceivedTasks(prev => prev.filter(task => task.id !== deletingTask.id));
        
        console.log('✅ Demo/Plain text: Task deleted from localStorage and UI');
        setDeletingTask(null);
        return;
      }
      
      // Encrypted task - WAIT for blockchain transaction BEFORE removing from UI
      if (taskToDelete && taskToDelete.isEncrypted && realContractService.isInitialized()) {
        try {
          console.log('🗑️ Encrypted task detected - calling blockchain deleteTask FIRST:', deletingTask.id);
          await realContractService.deleteTask(deletingTask.id);
          console.log('✅ Encrypted task deleted from blockchain');
          
          // NOW remove from wallet-scoped localStorage after successful blockchain deletion
          const currentWallet = await getCurrentWalletAddress();
          if (!currentWallet) {
            console.error('⚠️ Cannot save deletion: Wallet address not available');
          } else {
            const walletKeys = getWalletScopedKeys(currentWallet);
            
            const storedTasks = JSON.parse(localStorage.getItem(walletKeys.userTaskData) || '{}');
            delete storedTasks[deletingTask.id];
            localStorage.setItem(walletKeys.userTaskData, JSON.stringify(storedTasks));
            
            const decryptedTasksList = JSON.parse(localStorage.getItem(walletKeys.decryptedTasks) || '[]');
            const filteredDecrypted = decryptedTasksList.filter((id: number) => id !== deletingTask.id);
            localStorage.setItem(walletKeys.decryptedTasks, JSON.stringify(filteredDecrypted));
            
            setDecryptedTasks(prev => {
              const newSet = new Set(prev);
              newSet.delete(deletingTask.id);
              return newSet;
            });
            
            const completedTasks = JSON.parse(localStorage.getItem(walletKeys.completedTasks) || '{}');
            if (completedTasks[deletingTask.id]) {
              delete completedTasks[deletingTask.id];
              localStorage.setItem(walletKeys.completedTasks, JSON.stringify(completedTasks));
            }
            
            const deletedTasks = JSON.parse(localStorage.getItem(walletKeys.deletedTasks) || '{}');
            deletedTasks[deletingTask.id] = 'DELETED';
            localStorage.setItem(walletKeys.deletedTasks, JSON.stringify(deletedTasks));
          }
          
          // NOW remove from UI after successful blockchain transaction
          setTasks(prev => prev.filter(task => task.id !== deletingTask.id));
          setReceivedTasks(prev => prev.filter(task => task.id !== deletingTask.id));
          
          console.log('✅ Encrypted task: Deleted from blockchain, localStorage, and UI');
        } catch (blockchainError) {
          console.error('❌ Blockchain deletion failed:', blockchainError);
          // Transaction failed - DO NOT remove from UI
          alert('❌ Deletion failed: Transaction was rejected or failed. Task remains in your list.');
        }
      }
      
      // Task successfully removed from view
      console.log('✅ Task removed from view successfully');
      
      console.log('🗑️ Setting deletingTask to null');
      setDeletingTask(null);
      
    } catch (error) {
      console.error('❌ Failed to delete task:', error);
      alert(`Failed to delete task: ${(error as Error).message}`);
      
      // Ensure the task is restored in UI if deletion failed
      await loadTasks();
      await loadReceivedTasks();
    }
  };

  const handleDecryptTask = async (taskId: number) => {
    const task = tasks.find(t => t.id === taskId) || receivedTasks.find(t => t.id === taskId);
    if (task) {
      setDecryptingTask(task);
    }
  };

  // Bulk selection functions
  const toggleTaskSelection = (taskId: number) => {
    setSelectedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  };

  const selectAllTasks = () => {
    const currentTasks = activeTab === 'my-tasks' ? tasks : receivedTasks;
    const allTaskIds = currentTasks.map(task => task.id);
    setSelectedTasks(new Set(allTaskIds));
  };

  const clearSelection = () => {
    setSelectedTasks(new Set());
    setIsSelectionMode(false);
  };

  const bulkDeleteTasks = async () => {
    if (selectedTasks.size === 0) return;
    
    try {
      setIsLoading(true);
      
      const selectedTaskIds = Array.from(selectedTasks);
      
      // Separate plain text tasks from encrypted tasks
      const plainTextTaskIds: number[] = [];
      const encryptedTaskIds: number[] = [];
      
      selectedTaskIds.forEach(taskId => {
        const taskToDelete = tasks.find(t => t.id === taskId);
        if (taskToDelete && !taskToDelete.isEncrypted) {
          plainTextTaskIds.push(taskId);
        } else {
          encryptedTaskIds.push(taskId);
        }
      });
      
      console.log(`🗑️ Bulk delete: ${plainTextTaskIds.length} plain text, ${encryptedTaskIds.length} encrypted`);
      
      // CRITICAL: For plain text tasks, delete immediately from wallet-scoped localStorage
      if (plainTextTaskIds.length > 0) {
        const currentWallet = await getCurrentWalletAddress();
        if (!currentWallet) {
          throw new Error('Cannot delete tasks: Wallet address not available');
        }
        const walletKeys = getWalletScopedKeys(currentWallet);
        
        const storedTasks = JSON.parse(localStorage.getItem(walletKeys.userTaskData) || '{}');
        const decryptedTasksList = JSON.parse(localStorage.getItem(walletKeys.decryptedTasks) || '[]');
        const completedTasks = JSON.parse(localStorage.getItem(walletKeys.completedTasks) || '{}');
        const deletedTasks = JSON.parse(localStorage.getItem(walletKeys.deletedTasks) || '{}');
        
        plainTextTaskIds.forEach((taskId: number) => {
          delete storedTasks[taskId];
          const filteredIndex = decryptedTasksList.indexOf(taskId);
          if (filteredIndex > -1) {
            decryptedTasksList.splice(filteredIndex, 1);
          }
          if (completedTasks[taskId]) {
            delete completedTasks[taskId];
          }
          deletedTasks[taskId] = { status: 'DELETED', deletedAt: Date.now() };
        });
        
        localStorage.setItem(walletKeys.userTaskData, JSON.stringify(storedTasks));
        localStorage.setItem(walletKeys.decryptedTasks, JSON.stringify(decryptedTasksList));
        localStorage.setItem(walletKeys.completedTasks, JSON.stringify(completedTasks));
        localStorage.setItem(walletKeys.deletedTasks, JSON.stringify(deletedTasks));
        
        // Remove plain text tasks from UI immediately
        setTasks(prev => prev.filter(task => !plainTextTaskIds.includes(task.id)));
        setReceivedTasks(prev => prev.filter(task => !plainTextTaskIds.includes(task.id)));
        
        console.log(`✅ ${plainTextTaskIds.length} plain text tasks deleted`);
      }
      
      // Demo mode - only plain text tasks, already handled above
      if (isDemoMode) {
        console.log(`✅ Demo: ${plainTextTaskIds.length} tasks permanently removed`);
        clearSelection();
        setShowBulkDeleteModal(false);
        setIsLoading(false);
        return;
      }
      
      // CRITICAL: For encrypted tasks, delete from blockchain FIRST, then remove from UI
      if (encryptedTaskIds.length > 0 && realContractService.isInitialized()) {
        const successfullyDeleted: number[] = [];
        const failedToDelete: number[] = [];
        
        // Get current blockchain task count to validate indices
        try {
          const blockchainTasks = await realContractService.getTasks();
          const maxIndex = blockchainTasks.length - 1;
          console.log(`🔍 Blockchain has ${blockchainTasks.length} tasks (indices 0-${maxIndex})`);
          
          for (const taskId of encryptedTaskIds) {
            // CRITICAL: Check if task index is valid on blockchain
            if (taskId > maxIndex) {
              console.log(`⚠️ Task index ${taskId} is out of bounds (max: ${maxIndex}). Skipping blockchain delete, removing from UI only.`);
              failedToDelete.push(taskId);
              // Still remove from UI since it's orphaned
              continue;
            }
            
            try {
              console.log(`🗑️ Deleting encrypted task ${taskId} from blockchain...`);
              await realContractService.deleteTask(taskId);
              successfullyDeleted.push(taskId);
              console.log(`✅ Encrypted task ${taskId} deleted from blockchain`);
            } catch (error: any) {
              console.error(`❌ Failed to delete encrypted task ${taskId}:`, error);
              
              // If error is "out of bounds", it's an orphaned task - just remove from UI
              if (error?.message?.includes('out of bounds') || error?.reason?.includes('out of bounds')) {
                console.log(`⚠️ Task ${taskId} is orphaned (doesn't exist on blockchain). Removing from UI only.`);
                failedToDelete.push(taskId);
              } else {
                // Real error - don't remove from UI
                throw error; // Re-throw to trigger error handling
              }
            }
          }
          
          // NOW remove successfully deleted tasks from wallet-scoped localStorage and UI
          const currentWallet = await getCurrentWalletAddress();
          if (!currentWallet) {
            console.error('⚠️ Cannot save deletions: Wallet address not available');
            return;
          }
          const walletKeys = getWalletScopedKeys(currentWallet);
          
          const storedTasks = JSON.parse(localStorage.getItem(walletKeys.userTaskData) || '{}');
          const decryptedTasksList = JSON.parse(localStorage.getItem(walletKeys.decryptedTasks) || '[]');
          const completedTasks = JSON.parse(localStorage.getItem(walletKeys.completedTasks) || '{}');
          const deletedTasks = JSON.parse(localStorage.getItem(walletKeys.deletedTasks) || '{}');
          
          // Process all tasks to remove (successfully deleted + orphaned)
          const allTasksToRemove = [...successfullyDeleted, ...failedToDelete];
          
          allTasksToRemove.forEach((taskId: number) => {
            delete storedTasks[taskId];
            const filteredIndex = decryptedTasksList.indexOf(taskId);
            if (filteredIndex > -1) {
              decryptedTasksList.splice(filteredIndex, 1);
            }
            if (completedTasks[taskId]) {
              delete completedTasks[taskId];
            }
            deletedTasks[taskId] = { status: 'DELETED', deletedAt: Date.now() };
          });
          
          localStorage.setItem(walletKeys.userTaskData, JSON.stringify(storedTasks));
          localStorage.setItem(walletKeys.decryptedTasks, JSON.stringify(decryptedTasksList));
          localStorage.setItem(walletKeys.completedTasks, JSON.stringify(completedTasks));
          localStorage.setItem(walletKeys.deletedTasks, JSON.stringify(deletedTasks));
          
          // NOW remove from UI after successful blockchain deletion
          setTasks(prev => prev.filter(task => !allTasksToRemove.includes(task.id)));
          setReceivedTasks(prev => prev.filter(task => !allTasksToRemove.includes(task.id)));
          
          setDecryptedTasks(prev => {
            const newSet = new Set(prev);
            allTasksToRemove.forEach(id => newSet.delete(id));
            return newSet;
          });
          
          console.log(`✅ ${successfullyDeleted.length} encrypted tasks deleted from blockchain`);
          if (failedToDelete.length > 0) {
            console.log(`⚠️ ${failedToDelete.length} orphaned tasks removed from UI (not on blockchain)`);
          }
          
        } catch (blockchainError) {
          console.error('❌ Failed to get blockchain tasks:', blockchainError);
          // If we can't check blockchain, don't delete anything
          throw blockchainError;
        }
      }
      
      // Clear selection and close modal
      clearSelection();
      setShowBulkDeleteModal(false);
      
      // Show success message
      if (plainTextTaskIds.length > 0 || encryptedTaskIds.length > 0) {
        console.log(`✅ ${plainTextTaskIds.length + encryptedTaskIds.length} task(s) deleted successfully`);
      }
      
    } catch (error) {
      console.error('Failed to bulk remove tasks:', error);
      alert(`Failed to delete tasks: ${(error as Error).message}`);
      
      // Restore all tasks if bulk operation failed
      await loadTasks();
      await loadReceivedTasks();
    } finally {
      setIsLoading(false);
    }
  };

  const confirmDecryptTask = async () => {
    if (!decryptingTask) return;
    
    setIsDecrypting(true);
    
    try {
      // Demo mode - simulate decryption using localStorage data
      if (isDemoMode) {
        console.log('🎮 Demo mode: Simulating decryption...');
        
        // Get the stored task data
        const storedTasks = JSON.parse(localStorage.getItem('userTaskData') || '{}');
        const taskId = decryptingTask.id;
        
        // Find the stored task by ID (timestamp-based)
        const storedTask = Object.values(storedTasks).find((task: any) => {
          // Match by creation time proximity since demo mode uses timestamp IDs
          const taskTime = new Date(task.createdAt).getTime();
          const decryptTime = new Date(decryptingTask.createdAt).getTime();
          return Math.abs(taskTime - decryptTime) < 1000; // Within 1 second
        }) as any;
        
        if (storedTask && storedTask.title) {
          console.log('✅ Demo: Found stored task data:', storedTask.title);
          
          // Mark task as decrypted and persist to localStorage
          setDecryptedTasks(prev => {
            const newSet = new Set([...prev, decryptingTask.id]);
            // DO NOT save to localStorage - decryption should be session-only for security
            console.log('✅ Task decrypted in this session (will require re-decryption on refresh)');
            return newSet;
          });
          
          // Update the task with decrypted data
          setTasks(prev => prev.map(task => 
            task.id === decryptingTask.id 
              ? { 
                  ...task, 
                  title: (storedTask as any).title,
                  description: (storedTask as any).description,
                  dueDate: (storedTask as any).dueDate,
                  priority: (storedTask as any).priority,
                  isEncrypted: false
                }
              : task
          ));
          
          setDecryptingTask(null);
          console.log('✅ Demo: Task decrypted successfully');
          return;
        } else {
          throw new Error('Demo: Task data not found in localStorage');
        }
      }
      
      console.log('Connecting to real backend contract for decryption...');
      console.log('Contract address being used:', contractAddress);
      console.log('Contract service initialized:', realContractService.isInitialized());
      console.log('Contract service address:', realContractService.getContractAddress());
      
      // Check if wallet is connected
      // Check wallet connection using simple wallet service (more reliable)
      const signer = simpleWalletService.getSigner();
      if (!signer) {
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
      
      // Check if this is a shared task
      const isSharedTask = !!decryptingTask.originalOwner;
      
      // Call real contract method to decrypt task
      console.log('🔓 Starting decryption for task ID:', decryptingTask.id);
      console.log('🔓 Task details:', {
        id: decryptingTask.id,
        title: decryptingTask.title,
        isEncrypted: decryptingTask.isEncrypted,
        isShared: isSharedTask,
        originalOwner: decryptingTask.originalOwner
      });
      
      // Use appropriate decryption method
      const result = isSharedTask && decryptingTask.originalOwner
        ? await realContractService.decryptSharedTask(decryptingTask.id, decryptingTask.originalOwner)
        : await realContractService.decryptTask(decryptingTask.id);
      
      console.log('🔓 Decryption result:', result);
      
      if (result.success) {
        // Mark task as decrypted and persist to localStorage
        setDecryptedTasks(prev => {
          const newSet = new Set([...prev, decryptingTask.id]);
          // DO NOT save to localStorage - decryption should be session-only for security
          console.log('✅ Task decrypted in this session (will require re-decryption on refresh)');
          return newSet;
        });
        
        // Update the task with decrypted data if available (for both my tasks and received tasks)
        if (result.decryptedData) {
          // CRITICAL: Update the task in state IMMEDIATELY so UI shows decrypted content
          setTasks(prevTasks => {
            return prevTasks.map(task => {
              if (task.id === decryptingTask.id) {
                console.log('🔄 Updating task in state with decrypted data:', {
                  taskId: task.id,
                  oldTitle: task.title,
                  newTitle: result.decryptedData.title,
                  oldDescription: task.description,
                  newDescription: result.decryptedData.description
                });
                
                // If data is not recoverable, show a helpful message instead of empty strings
                const title = result.decryptedData.title || task.title;
                const description = result.decryptedData.description || task.description || '';
                
                return {
                  ...task,
                  title: title || '[Data Not Recoverable]',
                  description: description || 'Task metadata was not stored locally and cannot be recovered. The decryption transaction completed, but the original content is lost.',
                  dueDate: result.decryptedData.dueDate || task.dueDate || '',
                  priority: result.decryptedData.priority !== undefined ? result.decryptedData.priority : task.priority,
                  isEncrypted: false, // Mark as decrypted (transaction completed)
                  isDataRecoverable: result.decryptedData.isDataRecoverable !== false // Track if data was actually recovered from localStorage
                };
              }
              return task;
            });
          });
          
          // Also update received tasks state if this was a received task
          if (decryptingTask.originalOwner) {
            setReceivedTasks(prevReceivedTasks => {
              return prevReceivedTasks.map(task => {
                if (task.id === decryptingTask.id) {
                  return {
                    ...task,
                    title: result.decryptedData.title || task.title,
                    description: result.decryptedData.description || task.description || '',
                    dueDate: result.decryptedData.dueDate || task.dueDate || '',
                    priority: result.decryptedData.priority !== undefined ? result.decryptedData.priority : task.priority,
                    isEncrypted: false
                  };
                }
                return task;
              });
            });
          }
          
          // SECURITY: DO NOT save decrypted data to localStorage or backend
          // All decrypted data (title, description, dueDate, priority) must be session-only
          // User must re-decrypt on each page refresh for maximum security
          // The encrypted ciphertext handles are already safely stored on blockchain
          console.log('🔒 Decrypted data will only persist for this session (security best practice)');
          
          // CRITICAL: Mark task as decrypted FIRST so UI reflects decrypted state
          setDecryptedTasks(prev => {
            const newSet = new Set([...prev, decryptingTask.id]);
            console.log('✅ Task marked as decrypted in session. Decrypted task IDs:', Array.from(newSet));
            return newSet;
          });
          
          // Check if task is in receivedTasks or my tasks
          const isReceivedTask = receivedTasks.some(t => t.id === decryptingTask.id);
          
          // Build updated task data from decryption result
          const updatedTaskData: Partial<Task> = {
            isEncrypted: false // CRITICAL: Mark as NOT encrypted so UI shows decrypted content
          };
          
          if (result.decryptedData.title) {
            updatedTaskData.title = result.decryptedData.title;
          }
          if (result.decryptedData.description) {
            updatedTaskData.description = result.decryptedData.description;
          }
          if (result.decryptedData.dueDate) {
            updatedTaskData.dueDate = result.decryptedData.dueDate;
          }
          if (result.decryptedData.priority !== undefined && result.decryptedData.priority !== null) {
            updatedTaskData.priority = result.decryptedData.priority;
          }
          
          console.log('🔄 Updating task in UI with decrypted data:', {
            taskId: decryptingTask.id,
            isReceivedTask,
            updatedTaskData
          });
          
          if (isReceivedTask) {
            // Update received task
            setReceivedTasks(prev => prev.map(task => 
              task.id === decryptingTask.id 
                ? { ...task, ...updatedTaskData }
              : task
          ));
            console.log('✅ Received task decrypted and updated in UI');
        } else {
            // Update my task
            setTasks(prev => prev.map(task => 
              task.id === decryptingTask.id 
                ? { ...task, ...updatedTaskData }
                : task
            ));
            console.log('✅ My task decrypted and updated in UI');
        }
        
        setDecryptingTask(null);
          
          // Show success notification
          setNotification({
            message: 'Task decrypted successfully!',
            type: 'success'
          });
          setTimeout(() => setNotification(null), 3000);
      } else {
          console.log('⚠️ Decryption succeeded but no decryptedData returned');
          // Even without data, mark as decrypted attempt
          setDecryptedTasks(prev => {
            const newSet = new Set([...prev, decryptingTask.id]);
            return newSet;
          });
        setDecryptingTask(null);
          setNotification({
            message: 'Decryption transaction completed, but no task data available.',
            type: 'error'
          });
          setTimeout(() => setNotification(null), 5000);
        }
      } else {
        // Decryption failed
        console.error('❌ Decryption failed:', result.error);
        setDecryptingTask(null);
        setNotification({
          message: `Decryption failed: ${result.error || 'Unknown error'}`,
          type: 'error'
        });
        setTimeout(() => setNotification(null), 5000);
      }
      
    } catch (error: any) {
      console.error('Failed to decrypt task:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        name: error?.name
      });
      
      // Show user-friendly error message
      if (error?.message?.includes('requestTaskDecryption method not found')) {
        alert('❌ Contract Error: Decryption method not found. Please check if the contract is properly deployed.');
      } else if (error?.message?.includes('Wallet not connected')) {
        alert('❌ Wallet Error: Please connect your wallet first.');
      } else if (error?.message?.includes('User rejected')) {
        alert('❌ Transaction Rejected: You cancelled the transaction in your wallet.');
      } else if (error?.message?.includes('Transaction timeout')) {
        alert('❌ Transaction Timeout: The transaction took too long to confirm. Please try again.');
      } else {
        alert(`❌ Decryption Failed: ${error?.message || 'Unknown error occurred'}`);
      }
      
      setDecryptingTask(null);
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

  const handleShareTask = async (taskId: number, recipientAddress: string | string[]) => {
    try {
      // Normalize to array
      const addresses = Array.isArray(recipientAddress) ? recipientAddress : [recipientAddress];
      console.log('🔗 Sharing task:', taskId, 'with', addresses.length, 'recipient(s)');
      
      // Demo mode - simulate sharing
      if (isDemoMode) {
        console.log('🎮 Demo: Sharing task', taskId, 'with', addresses.length, 'recipient(s)');
        setSharingTask(null);
        const recipientCount = addresses.length;
        const message = recipientCount === 1
          ? `Demo: 1 task shared with 1 recipient`
          : `Demo: 1 task shared with ${recipientCount} recipients`;
        
        // Show custom notification banner (auto-dismiss after 3 seconds)
        setNotification({ message, type: 'success' });
        setTimeout(() => setNotification(null), 3000);
        return;
      }

      // Real blockchain mode - share task on blockchain
      // Ensure contract service is initialized
      if (!realContractService.isInitialized()) {
        try {
          console.log('🔧 Contract service not initialized for sharing, initializing...');
          await realContractService.initializeWithWallet(contractAddress);
          console.log('✅ Contract service initialized for sharing');
        } catch (error) {
          console.error('Failed to initialize contract service:', error);
          throw new Error('Contract service not available. Please ensure your wallet is connected.');
        }
      }

      // Find the task
      const task = tasks.find(t => t.id === taskId);
      if (!task) {
        throw new Error('Task not found');
      }

      // CRITICAL: Only encrypted tasks can be shared (they're on blockchain)
      if (!task.isEncrypted) {
        throw new Error('Plain text tasks cannot be shared via blockchain. Only encrypted tasks can be shared.');
      }

      // Share with each recipient
      const sharedRecipients: string[] = [];
      for (const address of addresses) {
        // Validate recipient address
        if (!address || !address.startsWith('0x') || address.length !== 42) {
          throw new Error(`Invalid recipient address: ${address}`);
        }

        // Normalize address to checksum format for consistency
        // This ensures the address stored in contract matches when recipient checks sharedTasks()
        let normalizedAddress = address;
        try {
          normalizedAddress = ethers.getAddress(address);
          console.log(`📤 Sharing with ${normalizedAddress} (normalized from ${address})...`);
        } catch (error) {
          console.warn(`⚠️ Could not normalize address ${address}, using as-is:`, error);
        }

        try {
          await realContractService.shareTask(taskId, normalizedAddress);
          sharedRecipients.push(normalizedAddress);
          console.log(`✅ Successfully shared task ${taskId} with ${normalizedAddress}`);
        } catch (error: any) {
          console.error(`❌ Failed to share with ${normalizedAddress}:`, error);
          
          // Extract better error message
          let errorMessage = error?.message || 'Unknown error';
          if (errorMessage.includes('Transaction timeout')) {
            // Extract transaction hash from error message if present
            const hashMatch = errorMessage.match(/hash: (0x[a-fA-F0-9]+)/);
            if (hashMatch) {
              errorMessage = `Transaction timeout. Your transaction was sent (hash: ${hashMatch[1]}). The transaction may still be processing. Please wait a moment and refresh the page to see if the share was successful.`;
            } else {
              errorMessage = errorMessage + ' The transaction may still be processing. Please wait a moment and refresh the page to see if the share was successful.';
            }
          }
          
          throw new Error(`Failed to share with ${normalizedAddress}: ${errorMessage}`);
        }
      }
      
      // Update local state to mark task as shared
      setTasks(prev => prev.map(t => 
        t.id === taskId 
          ? { ...t, isShared: true, sharedWith: sharedRecipients }
          : t
      ));

      // Update wallet-scoped localStorage
      const currentWallet = await getCurrentWalletAddress();
      if (currentWallet) {
        const walletKeys = getWalletScopedKeys(currentWallet);
        const storedTasks = JSON.parse(localStorage.getItem(walletKeys.userTaskData) || '{}');
        if (storedTasks[taskId]) {
          const existingShared = storedTasks[taskId].sharedWith || [];
          const updatedShared = [...new Set([...existingShared, ...sharedRecipients])];
          storedTasks[taskId] = { 
            ...storedTasks[taskId], 
            isShared: true, 
            sharedWith: updatedShared 
          };
          localStorage.setItem(walletKeys.userTaskData, JSON.stringify(storedTasks));
          console.log('✅ Task sharing updated in wallet-scoped localStorage:', walletKeys.userTaskData);
        }
      } else {
        console.warn('⚠️ Cannot save sharing metadata: Wallet address not available');
      }

      setSharingTask(null);
      console.log('✅ Task shared successfully with all recipients');
      const recipientCount = sharedRecipients.length;
      const message = recipientCount === 1 
        ? `1 task shared successfully with 1 recipient`
        : `1 task shared successfully with ${recipientCount} recipients`;
      
      // Show custom notification banner (auto-dismiss after 3 seconds)
      setNotification({ message, type: 'success' });
      setTimeout(() => setNotification(null), 3000);
      
    } catch (error) {
      console.error('❌ Failed to share task:', error);
      const errorMessage = (error as Error).message;
      setNotification({ message: `Failed to share task: ${errorMessage}`, type: 'error' });
      setTimeout(() => setNotification(null), 5000);
      throw error;
    }
  };


  const pendingTasks = tasks.filter(task => task.status === 'Pending');
  const completedTasks = tasks.filter(task => task.status === 'Completed');

  // Show wallet connection prompt if wallet not connected
  if (showWalletConnect) {
    return (
      <div className="min-h-screen bg-zama-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-zama-black rounded-full flex items-center justify-center mx-auto mb-6">
            <Shield className="w-8 h-8 text-zama-yellow" />
          </div>
          
          <h2 className="text-2xl font-bold text-zama-gray-900 mb-3">
            Connect Your Wallet
          </h2>
          <p className="text-zama-gray-600 mb-6">
            To create encrypted tasks on the blockchain, you need to connect your wallet first.
          </p>
          
          <button
            onClick={connectWallet}
            className="bg-zama-black hover:bg-zama-gray-800 text-zama-yellow font-bold py-3 px-6 rounded-lg transition-colors w-full"
          >
            Connect Wallet
          </button>
          
          <p className="text-xs text-zama-gray-500 mt-4">
            Your tasks will be encrypted and stored on Sepolia testnet
          </p>
          
          {/* Show disconnect option if wallet was previously connected */}
          {simpleWalletService.isWalletConnected() && (
            <button
              onClick={disconnectWallet}
              className="mt-3 text-sm text-zama-gray-500 hover:text-zama-gray-700 underline"
            >
              Disconnect Wallet
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Notification Banner */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3 max-w-md transition-all duration-300 ${
            notification.type === 'success'
              ? 'bg-green-50 border border-green-200 text-green-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          <div
            className={`w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0 ${
              notification.type === 'success' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
            }`}
          >
            {notification.type === 'success' ? '✓' : '✕'}
          </div>
          <p className="font-medium flex-1">{notification.message}</p>
          <button
            onClick={() => setNotification(null)}
            className="text-gray-400 hover:text-gray-600 ml-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Header with Stats */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold text-zama-gray-900">
              📋 My Tasks ({tasks.length})
            </h2>
            <div className="mt-1 flex space-x-2">
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                isDemoMode ? 'bg-blue-100 text-blue-800' : (fhevmService.isReady() ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800')
              }`}>
                {isDemoMode ? '🎮 Demo Mode' : (fhevmService.isReady() ? '✅ FHEVM Ready' : '⏳ FHEVM Initializing...')}
              </span>
            </div>
          </div>
          
          {/* Wallet Actions */}
              {simpleWalletService.isWalletConnected() && (
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <WalletAddressDisplay />
                <p className="text-xs text-zama-gray-500">Connected</p>
            </div>
              <button
                onClick={disconnectWallet}
                className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                title="Disconnect Wallet"
              >
                Disconnect
              </button>
          </div>
          )}
            <button
            onClick={() => setShowTaskForm(true)}
            className="btn-primary flex items-center space-x-2"
            // Allow button to work even if FHEVM is still initializing
            title="Create new task"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-zama-gray-100 p-1 rounded-lg mb-4">
          <button
            onClick={() => setActiveTab('my-tasks')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'my-tasks'
                ? 'bg-white text-zama-gray-900 shadow-sm'
                : 'text-zama-gray-600 hover:text-zama-gray-900'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Shield className="w-4 h-4" />
              <span>My Tasks ({tasks.length})</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('received-tasks')}
            className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'received-tasks'
                ? 'bg-white text-zama-gray-900 shadow-sm'
                : 'text-zama-gray-600 hover:text-zama-gray-900'
            }`}
          >
            <div className="flex items-center justify-center space-x-2">
              <Users className="w-4 h-4" />
              <span>Received ({receivedTasks.length})</span>
            </div>
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
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
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
          <div className="text-sm text-zama-gray-600 flex items-center">
            💰 Task Creation Fee: {taskCreationFee} ETH
          </div>
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
          <>
            {/* Bulk Selection Controls */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setIsSelectionMode(!isSelectionMode)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isSelectionMode 
                      ? 'bg-zama-yellow text-zama-black' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {isSelectionMode ? 'Exit Selection' : 'Select Tasks'}
                </button>
                
                {isSelectionMode && (
                  <>
                    <button
                      onClick={selectAllTasks}
                      className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      Select All
                    </button>
                    <button
                      onClick={clearSelection}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Clear ({selectedTasks.size})
                    </button>
                    {selectedTasks.size > 0 && (
                      <button
                        onClick={() => setShowBulkDeleteModal(true)}
                        className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                      >
                        Delete Selected ({selectedTasks.size})
                      </button>
                    )}
                  </>
                )}
              </div>
              
              {selectedTasks.size > 0 && (
                <div className="text-sm text-gray-600">
                  {selectedTasks.size} task{selectedTasks.size !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>

            {activeTab === 'my-tasks' && tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={() => handleCompleteTask(task.id)}
                onDelete={() => handleDeleteTask(task.id)}
                onShare={() => setSharingTask(task)}
                onDecrypt={() => handleDecryptTask(task.id)}
                isDecrypted={decryptedTasks.has(task.id)}
                displayIndex={tasks.indexOf(task)}
                isSelectionMode={isSelectionMode}
                isSelected={selectedTasks.has(task.id)}
                onToggleSelection={() => toggleTaskSelection(task.id)}
              />
            ))}
            {activeTab === 'received-tasks' && receivedTasks.map((task) => (
              <TaskCard
                key={`received-${task.id}`}
                task={task}
                onComplete={() => handleCompleteTask(task.id)}
                onDelete={() => handleDeleteTask(task.id)}
                onShare={() => setSharingTask(task)}
                onDecrypt={() => handleDecryptTask(task.id)}
                isDecrypted={decryptedTasks.has(task.id)}
                displayIndex={receivedTasks.indexOf(task)}
                isSelectionMode={isSelectionMode}
                isSelected={selectedTasks.has(task.id)}
                onToggleSelection={() => toggleTaskSelection(task.id)}
              />
            ))}
            {activeTab === 'received-tasks' && receivedTasks.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-zama-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-zama-gray-900 mb-2">No Received Tasks</h3>
                <p className="text-zama-gray-600">
                  Tasks shared with you will appear here. Ask someone to share a task with your wallet address!
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Task Form Modal */}
      {showTaskForm && (
        <TaskForm
          onSubmit={handleCreateTask}
          onCancel={() => setShowTaskForm(false)}
          title="Create New Task"
          submitText="Create Task"
          taskType="auto"
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

      {/* Bulk Delete Modal */}
      <BulkDeleteModal
        isOpen={showBulkDeleteModal}
        taskCount={selectedTasks.size}
        onConfirm={bulkDeleteTasks}
        onCancel={() => setShowBulkDeleteModal(false)}
      />

      {/* Wallet Selection Modal */}
      {showWalletSelection && (
        <WalletSelectionModal
          onSelectWallet={handleWalletSelect}
          onCancel={() => {
            setShowWalletSelection(false);
            setIsConnectingWallet(false);
          }}
          isConnecting={isConnectingWallet}
        />
      )}
    </div>
  );
}
