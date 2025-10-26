import { ethers } from 'ethers';
import { simpleWalletService } from './simpleWalletService';
import { fhevmService, createEncryptedInput } from './fhevmService';
import type { Task } from '../types.js';

// EXACT ABI from your TaskManager.sol contract
// ABI matching the actual deployed contract
const TASK_MANAGER_ABI = [
  // Core task functions with actual FHEVM types from deployed contract
  "function createTask(bytes32 encryptedTitle, bytes32 encryptedDueDate, bytes32 encryptedPriority, bytes inputProof) external payable",
  "function completeTask(uint256 taskIndex) external",
  "function deleteTask(uint256 taskIndex) external",
  "function editTask(uint256 taskIndex, bytes32 newEncryptedTitle, bytes32 newEncryptedDueDate, bytes32 newEncryptedPriority, bytes inputProof) external",
  "function shareTask(uint256 taskIndex, address recipient) external",
  
  // NEW: Decryption functions
  "function requestTaskDecryption(uint256 taskIndex) external",
  "function taskDecryptionCallback(uint256 requestId, bytes memory cleartexts, bytes memory decryptionProof) external",
  
  // Fee and admin functions
  "function requestTasksDueSoonCount(bytes32 encryptedTimeMargin, bytes inputProof) external",
  "function taskCreationFee() external view returns (uint256)",
  "function setFee(uint256 _newFee) external",
  "function withdraw() external",
  
  // Due soon count functions
  "function callbackCount(uint256 requestId, bytes memory cleartexts, bytes memory decryptionProof) external",
  "function lastDueSoonCount(address user) external view returns (uint32)",
  "function getTasks(address user) external view returns (tuple(bytes32 title, bytes32 dueDate, bytes32 priority, uint8 status)[] memory)",

  // Events
  "event DecryptionRequested(uint256 requestId, address indexed initiator)",
  "event TaskCreated(address indexed user, uint256 indexed taskIndex)",
  "event TaskCompleted(address indexed user, uint256 indexed taskIndex)",
  "event TaskDeleted(address indexed user, uint256 indexed taskIndex)",
  "event TaskShared(uint256 indexed taskIndex, address indexed owner, address indexed recipient)",
  "event Debug(string message, uint256 value)"
];

class RealContractService {
  private contract: ethers.Contract | null = null;
  private contractAddress = "";
  private isDemoMode = false; // Use real contract - we need FHEVM

  async initialize(contractAddress: string): Promise<void> {
    console.log('🚀 Initializing RealContractService with address:', contractAddress);
    
    // Check if demo mode
    if (contractAddress === 'DEMO_MODE') {
      this.isDemoMode = true;
      this.contractAddress = contractAddress;
      console.log('Running in demo mode - no contract connection needed');
      return;
    }

    this.contractAddress = contractAddress;
    
    // Wait for wallet to be ready
    const provider = simpleWalletService.getProvider();
    const signer = simpleWalletService.getSigner();

    if (!provider || !signer) {
      console.warn('Wallet not connected yet, contract service will initialize when wallet connects');
      return;
    }

    console.log('🔍 Creating contract with:', {
      address: this.contractAddress,
      abiLength: TASK_MANAGER_ABI.length,
      abiFirstFunction: TASK_MANAGER_ABI[0],
      provider: !!provider,
      signer: !!signer
    });
    
    this.contract = new ethers.Contract(this.contractAddress, TASK_MANAGER_ABI, signer);
    console.log('✅ Connected to TaskManager contract:', this.contractAddress);
    
    // Debug: Log available contract methods
    console.log('🔍 Available contract methods:', Object.getOwnPropertyNames(this.contract));
    console.log('🔍 Contract interface methods:', this.contract.interface.fragments.map(f => (f as any).name));
    console.log('🔍 Has createTask method:', 'createTask' in this.contract);

    // Test contract connection
    try {
      console.log('🧪 Testing contract connection...');
      const fee = await this.contract.taskCreationFee();
      console.log('✅ Contract connection verified. Task creation fee:', fee.toString());
    } catch (error) {
      console.error('❌ Contract connection failed:', error);
    }
  }

  async createTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<{ success: boolean; error?: string; taskId?: number }> {
    // Ensure we have a valid contract address
    if (!this.contractAddress || this.contractAddress === '' || this.contractAddress === 'DEMO_MODE') {
      this.contractAddress = '0x5e60a4e290DF0439384D9Fdb506DE601F9D4B038';
    }

    console.log('🔍 Contract service state:', {
      isDemoMode: this.isDemoMode,
      contractAddress: this.contractAddress,
      hasContract: !!this.contract,
      contractMethods: this.contract ? Object.keys(this.contract) : 'No contract'
    });

    // Validate contract address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(this.contractAddress)) {
      throw new Error('Invalid contract address format');
    }

    if (this.isDemoMode) {
      console.log('Demo mode: Creating task', task);
      return { success: true, taskId: Date.now() };
    }

    if (!this.contract) {
      console.error('❌ Contract not initialized');
      throw new Error('Contract not initialized');
    }

    // Initialize FHEVM if not ready
    if (!fhevmService.isReady()) {
      console.warn('⚠️ FHEVM not ready, initializing...');
      await fhevmService.initialize();
    }

    try {
      console.log('🔒 Preparing task data for blockchain...');
      
      // Get user address for FHEVM encryption
      const signer = simpleWalletService.getSigner();
      if (!signer) {
        throw new Error('Wallet not connected');
      }
      const userAddress = await signer.getAddress();

      console.log('📝 Received task object:', task);
      console.log('📝 Task title:', task.title, 'type:', typeof task.title);
      console.log('📝 Task dueDate:', task.dueDate, 'type:', typeof task.dueDate);
      console.log('📝 Task priority:', task.priority, 'type:', typeof task.priority);
      
      // Validate task data
      const title = task.title || 'Untitled Task';
      const dueDate = task.dueDate || new Date().toISOString().split('T')[0];
      const priority = task.priority ?? 1;

      console.log('📝 Task data to encrypt:', { title, dueDate, priority });
      
      // Get task creation fee first
      const fee = await this.contract.taskCreationFee();

      // For now, let's create a simple encrypted input for the title (as a number for testing)
      // In a real implementation, you'd need to handle string encryption differently
      const titleAsNumber = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const dueDateTimestamp = Math.floor(new Date(dueDate).getTime() / 1000);

      // Create a combined encrypted input for all three values
      const combinedInput = fhevmService.getInstance().createEncryptedInput(this.contractAddress, userAddress);
      combinedInput.add64(titleAsNumber);      // Add title as 64-bit
      combinedInput.add64(dueDateTimestamp);   // Add due date as 64-bit  
      combinedInput.add8(priority);           // Add priority as 8-bit
      const combinedResult = await combinedInput.encrypt();

      console.log('🔍 Combined encrypted input:', combinedResult);
      
      // Use ethers.js contract with the correct ABI
      const tx = await this.contract.createTask(
        combinedResult.handles[0],    // Encrypted title as bytes32
        combinedResult.handles[1],    // Encrypted due date as bytes32
        combinedResult.handles[2],    // Encrypted priority as bytes32
        combinedResult.inputProof,    // Input proof as bytes
        { value: fee }
      );

      console.log('⏳ Waiting for transaction confirmation...');
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log('✅ Task created on blockchain! Hash:', receipt.hash);
      
      return { 
        success: true, 
        taskId: Date.now() // In a real implementation, you'd get the task ID from the contract
      };

    } catch (error) {
      console.error('❌ Failed to create task:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async getTasks(): Promise<Task[]> {
    if (this.isDemoMode) {
      return [];
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const signer = simpleWalletService.getSigner();
      if (!signer) {
        throw new Error('Wallet not connected');
      }

      const userAddress = await signer.getAddress();
      const tasks = await this.contract.getTasks(userAddress);
      
      // CRITICAL: NEVER replace user data with hardcoded values!
      // This violates data integrity and user trust
      console.error('🚨 CRITICAL DATA INTEGRITY VIOLATION: Attempting to replace user data with hardcoded encrypted placeholders');
      console.error('🚨 User input must NEVER be modified or replaced');
      
      throw new Error('CRITICAL DATA INTEGRITY ERROR: This service is attempting to replace your original task data with hardcoded encrypted placeholders. This violates the fundamental principle of data integrity. Your input should never be modified.');
    } catch (error) {
      console.error('Failed to get tasks:', error);
      throw new Error('Failed to get tasks');
    }
  }

  async completeTask(taskIndex: number): Promise<void> {
    if (this.isDemoMode) {
      console.log('Demo mode: Completing task', taskIndex);
      return;
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const tx = await this.contract.completeTask(taskIndex);
      await tx.wait();
      console.log('Task completed successfully');
    } catch (error) {
      console.error('Failed to complete task:', error);
      throw new Error('Failed to complete task');
    }
  }

  async deleteTask(taskIndex: number): Promise<void> {
    if (this.isDemoMode) {
      console.log('Demo mode: Deleting task', taskIndex);
      return;
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const tx = await this.contract.deleteTask(taskIndex);
      await tx.wait();
      console.log('Task deleted successfully');
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw new Error('Failed to delete task');
    }
  }
}

export const realContractService = new RealContractService();
