import { ethers } from 'ethers';
import { walletService } from './walletService';
import { fhevmService } from './fhevmService';
import type { Task } from '../types';

// TaskManager contract ABI - simplified version for the main functions
const TASK_MANAGER_ABI = [
  "function createTask(tuple(bytes32,bytes32) encryptedTitle, tuple(bytes32,bytes32) encryptedDueDate, tuple(bytes32,bytes32) encryptedPriority, bytes inputProof) external payable",
  "function getTasks(address user) external view returns (tuple(tuple(bytes32,bytes32) title, tuple(bytes32,bytes32) dueDate, uint8 priority, uint8 status)[] memory)",
  "function completeTask(uint256 taskIndex) external",
  "function deleteTask(uint256 taskIndex) external",
  "function editTask(uint256 taskIndex, tuple(bytes32,bytes32) newEncryptedTitle, tuple(bytes32,bytes32) newEncryptedDueDate, tuple(bytes32,bytes32) newEncryptedPriority, bytes inputProof) external",
  "function shareTask(uint256 taskIndex, address recipient) external",
  "function taskCreationFee() external view returns (uint256)",
  "function lastDueSoonCount(address user) external view returns (uint32)",
  "function requestTasksDueSoonCount(tuple(bytes32,bytes32) encryptedTimeMargin, bytes inputProof) external",
  "event TaskCreated(address indexed user, uint256 indexed taskId)",
  "event TaskCompleted(address indexed user, uint256 indexed taskId)",
  "event TaskDeleted(address indexed user, uint256 indexed taskId)",
  "event DecryptionRequested(uint256 requestId, address indexed initiator)"
];

class ContractService {
  private contract: ethers.Contract | null = null;
  private contractAddress = "0x0000000000000000000000000000000000000000"; // Will be updated with deployed address

  async initialize(contractAddress: string): Promise<void> {
    this.contractAddress = contractAddress;
    
    // Skip initialization in demo mode
    if (contractAddress === 'DEMO_MODE') {
      console.log('Running in demo mode - no contract connection needed');
      return;
    }
    
    const provider = walletService.getProvider();
    const signer = walletService.getSigner();
    
    if (!provider || !signer) {
      throw new Error('Wallet not connected');
    }

    this.contract = new ethers.Contract(this.contractAddress, TASK_MANAGER_ABI, signer);
  }

  async createTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<void> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    if (!fhevmService.isReady()) {
      throw new Error('FHEVM not initialized');
    }

    try {
      // Encrypt task data
      const encryptedTitle = await fhevmService.encryptString(task.title);
      const encryptedDueDate = await fhevmService.encryptNumber(new Date(task.dueDate).getTime());
      const encryptedPriority = await fhevmService.encryptNumber(task.priority, 'euint8');

      // Get task creation fee
      const fee = await this.contract.taskCreationFee();

      // Create the task
      const tx = await this.contract.createTask(
        encryptedTitle,
        encryptedDueDate,
        encryptedPriority,
        '0x', // Empty proof for now - in production this would be generated
        { value: fee }
      );

      await tx.wait();
      console.log('Task created successfully');
    } catch (error) {
      console.error('Failed to create task:', error);
      throw new Error('Failed to create task');
    }
  }

  async getTasks(): Promise<Task[]> {
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

      // Decrypt tasks
      const tasks: Task[] = [];
      for (let i = 0; i < encryptedTasks.length; i++) {
        const encryptedTask = encryptedTasks[i];
        
        try {
          // Decrypt task data
          const title = await fhevmService.decrypt(encryptedTask.title);
          const dueDate = await fhevmService.decrypt(encryptedTask.dueDate);
          const priority = await fhevmService.decrypt(encryptedTask.priority);

          tasks.push({
            id: i,
            title: this.numberToString(title),
            description: '', // Not stored in contract
            dueDate: new Date(Number(dueDate)).toISOString(),
            priority: Number(priority),
            status: encryptedTask.status === 0 ? 'Pending' : 'Completed',
            createdAt: new Date().toISOString(), // Not stored in contract
          });
        } catch (decryptError) {
          console.warn(`Failed to decrypt task ${i}:`, decryptError);
          // Add encrypted task placeholder
          tasks.push({
            id: i,
            title: 'Encrypted Task',
            description: 'This task is encrypted and cannot be decrypted',
            dueDate: new Date().toISOString(),
            priority: 1,
            status: encryptedTask.status === 0 ? 'Pending' : 'Completed',
            createdAt: new Date().toISOString(),
          });
        }
      }

      return tasks;
    } catch (error) {
      console.error('Failed to get tasks:', error);
      throw new Error('Failed to get tasks');
    }
  }

  async completeTask(taskIndex: number): Promise<void> {
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

  async editTask(taskIndex: number, task: Omit<Task, 'id' | 'createdAt'>): Promise<void> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    if (!fhevmService.isReady()) {
      throw new Error('FHEVM not initialized');
    }

    try {
      // Encrypt updated task data
      const encryptedTitle = await fhevmService.encryptString(task.title);
      const encryptedDueDate = await fhevmService.encryptNumber(new Date(task.dueDate).getTime());
      const encryptedPriority = await fhevmService.encryptNumber(task.priority, 'euint8');

      const tx = await this.contract.editTask(
        taskIndex,
        encryptedTitle,
        encryptedDueDate,
        encryptedPriority,
        '0x' // Empty proof for now
      );

      await tx.wait();
      console.log('Task edited successfully');
    } catch (error) {
      console.error('Failed to edit task:', error);
      throw new Error('Failed to edit task');
    }
  }

  async shareTask(taskIndex: number, recipientAddress: string): Promise<void> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const tx = await this.contract.shareTask(taskIndex, recipientAddress);
      await tx.wait();
      console.log('Task shared successfully');
    } catch (error) {
      console.error('Failed to share task:', error);
      throw new Error('Failed to share task');
    }
  }

  async getTaskCreationFee(): Promise<string> {
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
      console.log('Due soon count requested successfully');
    } catch (error) {
      console.error('Failed to request due soon count:', error);
      throw new Error('Failed to request due soon count');
    }
  }

  async getLastDueSoonCount(): Promise<number> {
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

  // Helper function to convert number back to string
  private numberToString(num: number): string {
    // This is a simplified approach - in production you'd want a more robust method
    return `Task_${num}`;
  }
}

export const contractService = new ContractService();
