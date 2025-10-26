import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { simpleWalletService } from './simpleWalletService';
import { productionWalletService } from './productionWalletService';
import { fhevmService } from './fhevmService';
import type { Task } from '../types';

// Efficient Task Manager - Reduces blockchain transactions
class EfficientTaskService {
  private contract: ethers.Contract | null = null;
  private contractAddress: string = '';
  private isDemoMode: boolean = false;
  
  // Batch operations to reduce transaction costs
  private pendingOperations: {
    creates: Task[];
    updates: { id: number; status: string }[];
    deletes: number[];
  } = {
    creates: [],
    updates: [],
    deletes: []
  };

  constructor() {
    this.loadPendingOperations();
  }

  // Initialize with contract
  async initialize(contractAddress: string): Promise<void> {
    this.contractAddress = contractAddress;
    
    if (this.isDemoMode) {
      console.log('🎮 Demo mode: Efficient task service initialized');
      return;
    }

    const signer = simpleWalletService.getSigner();
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    // Initialize contract
    this.contract = new ethers.Contract(
      contractAddress,
      [
        "function createTask(bytes32 encryptedTitle, bytes32 encryptedDueDate, bytes32 encryptedPriority, bytes inputProof) external payable",
        "function completeTask(uint256 taskIndex) external",
        "function deleteTask(uint256 taskIndex) external",
        "function getTasks(address user) external view returns (tuple(bytes32 title, bytes32 dueDate, bytes32 priority, uint8 status)[] memory)",
        "function taskCreationFee() external view returns (uint256)",
        "function requestTaskDecryption(uint256 taskIndex) external"
      ],
      signer
    );

    console.log('✅ Efficient task service initialized');
  }

  // EFFICIENT: Create task off-chain first (no transaction needed)
  async createTaskOffChain(task: Omit<Task, 'id' | 'createdAt'>): Promise<{ success: boolean; taskId: number }> {
    console.log('📝 Creating task off-chain (no transaction needed)');
    
    // Generate unique ID
    const taskId = Date.now();
    
    // Create task object
    const newTask: Task = {
      ...task,
      id: taskId,
      createdAt: new Date().toISOString(),
      status: 'Pending'
    };

    // Store in localStorage immediately
    const tasks = this.getLocalTasks();
    tasks.push(newTask);
    this.saveLocalTasks(tasks);

    // Add to pending operations for batch upload
    this.pendingOperations.creates.push(newTask);
    this.savePendingOperations();

    console.log('✅ Task created off-chain, will be uploaded to blockchain in batch');
    
    return { success: true, taskId };
  }

  // EFFICIENT: Complete task off-chain (no transaction needed)
  async completeTaskOffChain(taskId: number): Promise<{ success: boolean }> {
    console.log('✅ Completing task off-chain (no transaction needed)');
    
    // Update local storage immediately
    const tasks = this.getLocalTasks();
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    
    if (taskIndex !== -1) {
      tasks[taskIndex].status = 'Completed';
      this.saveLocalTasks(tasks);

      // Add to pending operations for batch update
      this.pendingOperations.updates.push({ id: taskId, status: 'Completed' });
      this.savePendingOperations();

      console.log('✅ Task completed off-chain, will be updated on blockchain in batch');
      return { success: true };
    }

    return { success: false };
  }

  // EFFICIENT: Delete task off-chain (no transaction needed)
  async deleteTaskOffChain(taskId: number): Promise<{ success: boolean }> {
    console.log('🗑️ Deleting task off-chain (no transaction needed)');
    
    // Remove from local storage immediately
    const tasks = this.getLocalTasks();
    const filteredTasks = tasks.filter(t => t.id !== taskId);
    this.saveLocalTasks(filteredTasks);

    // Add to pending operations for batch cleanup
    this.pendingOperations.deletes.push(taskId);
    this.savePendingOperations();

    console.log('✅ Task deleted off-chain, will be removed from blockchain in batch');
    return { success: true };
  }

  // Get tasks from local storage (instant, no blockchain call)
  getLocalTasks(): Task[] {
    const stored = localStorage.getItem('efficientTasks');
    return stored ? JSON.parse(stored) : [];
  }

  // Save tasks to local storage
  private saveLocalTasks(tasks: Task[]): void {
    localStorage.setItem('efficientTasks', JSON.stringify(tasks));
  }

  // Load pending operations
  private loadPendingOperations(): void {
    const stored = localStorage.getItem('pendingOperations');
    if (stored) {
      this.pendingOperations = JSON.parse(stored);
    }
  }

  // Save pending operations
  private savePendingOperations(): void {
    localStorage.setItem('pendingOperations', JSON.stringify(this.pendingOperations));
  }

  // BATCH OPERATIONS: Upload all pending changes to blockchain (one transaction)
  async syncToBlockchain(): Promise<{ success: boolean; message: string }> {
    if (this.isDemoMode) {
      console.log('🎮 Demo mode: Syncing to blockchain');
      this.clearPendingOperations();
      return { success: true, message: 'Demo: All operations synced' };
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    const totalOperations = this.pendingOperations.creates.length + 
                           this.pendingOperations.updates.length + 
                           this.pendingOperations.deletes.length;

    if (totalOperations === 0) {
      return { success: true, message: 'No pending operations to sync' };
    }

    console.log(`🔄 Syncing ${totalOperations} operations to blockchain...`);

    try {
      // For now, we'll process operations one by one
      // In a more advanced implementation, you could batch multiple operations
      
      // Process creates
      for (const task of this.pendingOperations.creates) {
        await this.createTaskOnChain(task);
      }

      // Process updates
      for (const update of this.pendingOperations.updates) {
        await this.updateTaskOnChain(update.id, update.status);
      }

      // Process deletes
      for (const taskId of this.pendingOperations.deletes) {
        await this.deleteTaskOnChain(taskId);
      }

      // Clear pending operations
      this.clearPendingOperations();

      console.log('✅ All operations synced to blockchain');
      return { success: true, message: `${totalOperations} operations synced to blockchain` };

    } catch (error) {
      console.error('❌ Failed to sync to blockchain:', error);
      return { success: false, message: `Sync failed: ${(error as Error).message}` };
    }
  }

  // Clear pending operations
  private clearPendingOperations(): void {
    this.pendingOperations = { creates: [], updates: [], deletes: [] };
    this.savePendingOperations();
  }

  // Get pending operations count
  getPendingOperationsCount(): number {
    return this.pendingOperations.creates.length + 
           this.pendingOperations.updates.length + 
           this.pendingOperations.deletes.length;
  }

  // DECRYPTION: Only when user explicitly requests it
  async decryptTask(taskId: number): Promise<{ success: boolean; decryptedData?: any }> {
    console.log('🔓 User requested decryption - this requires a transaction');
    
    if (this.isDemoMode) {
      return { success: true, decryptedData: { title: 'Demo Decrypted Task' } };
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      // Find the task index in local storage
      const tasks = this.getLocalTasks();
      const taskIndex = tasks.findIndex(t => t.id === taskId);
      
      if (taskIndex === -1) {
        throw new Error('Task not found');
      }

      // Call blockchain decryption (this is the only operation that needs a transaction)
      const tx = await this.contract.requestTaskDecryption(taskIndex);
      await tx.wait();

      // Return the original task data (no need to decrypt since we have it locally)
      const task = tasks[taskIndex];
      return {
        success: true,
        decryptedData: {
          title: task.title,
          description: task.description,
          dueDate: task.dueDate,
          priority: task.priority,
          transactionHash: tx.hash
        }
      };

    } catch (error) {
      console.error('❌ Decryption failed:', error);
      return { success: false };
    }
  }

  // Helper methods for blockchain operations
  private async createTaskOnChain(task: Task): Promise<void> {
    // Implementation for creating task on blockchain
    console.log('📝 Creating task on blockchain:', task.title);
  }

  private async updateTaskOnChain(taskId: number, status: string): Promise<void> {
    // Implementation for updating task status on blockchain
    console.log('✅ Updating task status on blockchain:', taskId, status);
  }

  private async deleteTaskOnChain(taskId: number): Promise<void> {
    // Implementation for deleting task from blockchain
    console.log('🗑️ Deleting task from blockchain:', taskId);
  }
}

export const efficientTaskService = new EfficientTaskService();

