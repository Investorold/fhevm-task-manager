import { ethers } from 'ethers';
import { walletService } from './walletService';
import { fhevmService } from './fhevmService';
import type { Task } from '../types';

// Production TaskManager ABI - Full contract interface
const TASK_MANAGER_ABI = [
  // Core task functions
  "function createTask(bytes memory encryptedTitle, bytes memory encryptedDescription, bytes memory encryptedDueDate, bytes memory encryptedPriority) external payable",
  "function getTasks(address user) external view returns (tuple(uint256 id, bytes encryptedTitle, bytes encryptedDescription, bytes encryptedDueDate, bytes encryptedPriority, uint8 status, uint256 createdAt)[] memory)",
  "function completeTask(uint256 taskId) external",
  "function deleteTask(uint256 taskId) external",
  "function editTask(uint256 taskId, bytes memory encryptedTitle, bytes memory encryptedDescription, bytes memory encryptedDueDate, bytes memory encryptedPriority) external",
  "function shareTask(uint256 taskId, address recipient) external",
  
  // Fee and admin functions
  "function taskCreationFee() external view returns (uint256)",
  "function setFee(uint256 newFee) external",
  "function withdraw() external",
  
  // Due soon count functions
  "function requestTasksDueSoonCount(bytes memory encryptedTimeMargin, bytes memory proof) external",
  "function callbackCount(uint256 requestId, bytes memory cleartexts, bytes memory decryptionProof) external",
  "function lastDueSoonCount(address user) external view returns (uint256)",
  
  // Events
  "event TaskCreated(uint256 indexed taskId, address indexed user, uint256 createdAt)",
  "event TaskCompleted(uint256 indexed taskId, address indexed user)",
  "event TaskDeleted(uint256 indexed taskId, address indexed user)",
  "event TaskShared(uint256 indexed taskId, address indexed from, address indexed to)",
  "event TaskEdited(uint256 indexed taskId, address indexed user)",
  "event DueSoonCountRequested(uint256 indexed requestId, address indexed user)",
  "event DueSoonCountReceived(uint256 indexed requestId, address indexed user, uint256 count)"
];

class ProductionContractService {
  private contract: ethers.Contract | null = null;
  private contractAddress = "";
  private isDemoMode = false;

  async initialize(contractAddress: string): Promise<void> {
    this.contractAddress = contractAddress;
    
    // Check if demo mode
    if (contractAddress === 'DEMO_MODE') {
      this.isDemoMode = true;
      console.log('Running in demo mode - no contract connection needed');
      return;
    }
    
    // Production mode - connect to real contract
    const provider = walletService.getProvider();
    const signer = walletService.getSigner();
    
    if (!provider || !signer) {
      throw new Error('Wallet not connected');
    }

    this.contract = new ethers.Contract(this.contractAddress, TASK_MANAGER_ABI, signer);
    console.log('Connected to production contract:', this.contractAddress);
  }

  async createTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<void> {
    if (this.isDemoMode) {
      console.log('Demo mode: Creating task', task);
      return;
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    if (!fhevmService.isReady()) {
      throw new Error('FHEVM not initialized');
    }

    try {
      // Encrypt task data using real FHEVM
      const encryptedTitle = await fhevmService.encryptString(task.title);
      const encryptedDescription = await fhevmService.encryptString(task.description);
      const encryptedDueDate = await fhevmService.encryptNumber(new Date(task.dueDate).getTime());
      const encryptedPriority = await fhevmService.encryptNumber(task.priority, 'euint8');

      // Get task creation fee
      const fee = await this.contract.taskCreationFee();

      // Create the task on blockchain
      const tx = await this.contract.createTask(
        encryptedTitle,
        encryptedDescription,
        encryptedDueDate,
        encryptedPriority,
        { value: fee }
      );

      await tx.wait();
      console.log('Task created on blockchain:', tx.hash);
    } catch (error) {
      console.error('Failed to create task:', error);
      throw new Error('Failed to create task on blockchain');
    }
  }

  async getTasks(): Promise<Task[]> {
    if (this.isDemoMode) {
      // Return demo tasks
      return [
        {
          id: 1,
          title: "Welcome to Production Mode",
          description: "This task is stored on the blockchain with FHEVM encryption",
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 2,
          status: 'Pending',
          createdAt: new Date().toISOString(),
        }
      ];
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    const signer = walletService.getSigner();
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const userAddress = await signer.getAddress();
      const encryptedTasks = await this.contract.getTasks(userAddress);
      
      // Decrypt tasks using FHEVM
      const decryptedTasks: Task[] = [];
      
      for (let i = 0; i < encryptedTasks.length; i++) {
        const encryptedTask = encryptedTasks[i];
        
        try {
          // Decrypt each field
          const title = await fhevmService.decrypt(encryptedTask.encryptedTitle);
          const description = await fhevmService.decrypt(encryptedTask.encryptedDescription);
          const dueDateTimestamp = await fhevmService.decrypt(encryptedTask.encryptedDueDate);
          const priority = await fhevmService.decrypt(encryptedTask.encryptedPriority);
          
          decryptedTasks.push({
            id: Number(encryptedTask.id),
            title: String(title),
            description: String(description),
            dueDate: new Date(Number(dueDateTimestamp)).toISOString(),
            priority: Number(priority),
            status: encryptedTask.status === 0 ? 'Pending' : 'Completed',
            createdAt: new Date(Number(encryptedTask.createdAt) * 1000).toISOString(),
          });
        } catch (decryptError) {
          console.error('Failed to decrypt task:', decryptError);
          // Skip this task if decryption fails
        }
      }
      
      return decryptedTasks;
    } catch (error) {
      console.error('Failed to get tasks:', error);
      throw new Error('Failed to retrieve tasks from blockchain');
    }
  }

  async completeTask(taskId: number): Promise<void> {
    if (this.isDemoMode) {
      console.log('Demo mode: Completing task', taskId);
      return;
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const tx = await this.contract.completeTask(taskId);
      await tx.wait();
      console.log('Task completed on blockchain:', tx.hash);
    } catch (error) {
      console.error('Failed to complete task:', error);
      throw new Error('Failed to complete task on blockchain');
    }
  }

  async deleteTask(taskId: number): Promise<void> {
    if (this.isDemoMode) {
      console.log('Demo mode: Deleting task', taskId);
      return;
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const tx = await this.contract.deleteTask(taskId);
      await tx.wait();
      console.log('Task deleted from blockchain:', tx.hash);
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw new Error('Failed to delete task from blockchain');
    }
  }

  async editTask(taskId: number, task: Omit<Task, 'id' | 'createdAt'>): Promise<void> {
    if (this.isDemoMode) {
      console.log('Demo mode: Editing task', taskId, task);
      return;
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    if (!fhevmService.isReady()) {
      throw new Error('FHEVM not initialized');
    }

    try {
      // Encrypt updated task data
      const encryptedTitle = await fhevmService.encryptString(task.title);
      const encryptedDescription = await fhevmService.encryptString(task.description);
      const encryptedDueDate = await fhevmService.encryptNumber(new Date(task.dueDate).getTime());
      const encryptedPriority = await fhevmService.encryptNumber(task.priority, 'euint8');

      const tx = await this.contract.editTask(
        taskId,
        encryptedTitle,
        encryptedDescription,
        encryptedDueDate,
        encryptedPriority
      );

      await tx.wait();
      console.log('Task edited on blockchain:', tx.hash);
    } catch (error) {
      console.error('Failed to edit task:', error);
      throw new Error('Failed to edit task on blockchain');
    }
  }

  async shareTask(taskId: number, recipientAddress: string): Promise<void> {
    if (this.isDemoMode) {
      console.log('Demo mode: Sharing task', taskId, 'with', recipientAddress);
      return;
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const tx = await this.contract.shareTask(taskId, recipientAddress);
      await tx.wait();
      console.log('Task shared on blockchain:', tx.hash);
    } catch (error) {
      console.error('Failed to share task:', error);
      throw new Error('Failed to share task on blockchain');
    }
  }

  async getTaskCreationFee(): Promise<string> {
    if (this.isDemoMode) {
      return '0.0001'; // Demo fee
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const fee = await this.contract.taskCreationFee();
      return ethers.formatEther(fee);
    } catch (error) {
      console.error('Failed to get task creation fee:', error);
      throw new Error('Failed to get task creation fee');
    }
  }

  async requestTasksDueSoonCount(timeMarginHours: number = 24): Promise<void> {
    if (this.isDemoMode) {
      console.log('Demo mode: Requesting due soon count');
      return;
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    if (!fhevmService.isReady()) {
      throw new Error('FHEVM not initialized');
    }

    try {
      // Convert hours to seconds
      const timeMarginSeconds = timeMarginHours * 3600;

      // Encrypt the time margin
      const encryptedTimeMargin = await fhevmService.encryptNumber(timeMarginSeconds);

      // Call the contract function
      const tx = await this.contract.requestTasksDueSoonCount(
        encryptedTimeMargin,
        '0x' // Empty proof for now
      );

      await tx.wait();
      console.log('Due soon count requested on blockchain:', tx.hash);
    } catch (error) {
      console.error('Failed to request due soon count:', error);
      throw new Error('Failed to request due soon count');
    }
  }

  async getLastDueSoonCount(): Promise<number> {
    if (this.isDemoMode) {
      return 2; // Demo count
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    const signer = walletService.getSigner();
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const userAddress = await signer.getAddress();
      const count = await this.contract.lastDueSoonCount(userAddress);
      return Number(count);
    } catch (error) {
      console.error('Failed to get due soon count:', error);
      throw new Error('Failed to get due soon count');
    }
  }

  isConnected(): boolean {
    return this.contract !== null || this.isDemoMode;
  }

  getContractAddress(): string {
    return this.contractAddress;
  }

  isInDemoMode(): boolean {
    return this.isDemoMode;
  }
}

export const productionContractService = new ProductionContractService();
