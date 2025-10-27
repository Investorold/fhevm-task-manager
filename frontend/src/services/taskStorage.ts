// Unified task storage service - uses backend when available, falls back to localStorage
import { backendService } from './backendService';

class TaskStorageService {
  private useBackend = false;

  constructor() {
    // TEMPORARILY DISABLED: Use localStorage only to prevent blank screen
    // Will enable backend integration later when properly configured
    this.useBackend = false;
    console.log('🔧 TaskStorage using localStorage only (backend disabled for now)');
  }

  async getTasks(): Promise<Record<string, any>> {
    if (this.useBackend) {
      try {
        return await backendService.getTasks();
      } catch (error) {
        console.warn('Backend unavailable, falling back to localStorage:', error);
        return this.getTasksFromLocalStorage();
      }
    }
    return this.getTasksFromLocalStorage();
  }

  async saveTask(taskIndex: number, taskData: any): Promise<void> {
    if (this.useBackend) {
      try {
        await backendService.saveTask(taskData, taskIndex);
        return;
      } catch (error) {
        console.warn('Backend save failed, using localStorage:', error);
      }
    }
    this.saveTaskToLocalStorage(taskIndex, taskData);
  }

  async updateTask(taskIndex: number, updates: any): Promise<void> {
    if (this.useBackend) {
      try {
        await backendService.updateTask(taskIndex, updates);
        return;
      } catch (error) {
        console.warn('Backend update failed, using localStorage:', error);
      }
    }
    this.updateTaskInLocalStorage(taskIndex, updates);
  }

  async deleteTask(taskIndex: number): Promise<void> {
    if (this.useBackend) {
      try {
        await backendService.deleteTask(taskIndex);
        return;
      } catch (error) {
        console.warn('Backend delete failed, using localStorage:', error);
      }
    }
    this.deleteTaskFromLocalStorage(taskIndex);
  }

  async getDecryptedTasks(): Promise<number[]> {
    if (this.useBackend) {
      try {
        return await backendService.getDecryptedTasks();
      } catch (error) {
        console.warn('Backend unavailable, using localStorage:', error);
        return this.getDecryptedTasksFromLocalStorage();
      }
    }
    return this.getDecryptedTasksFromLocalStorage();
  }

  async saveDecryptedTasks(ids: number[]): Promise<void> {
    if (this.useBackend) {
      try {
        await backendService.saveDecryptedTasks(ids);
        return;
      } catch (error) {
        console.warn('Backend save failed, using localStorage:', error);
      }
    }
    this.saveDecryptedTasksToLocalStorage(ids);
  }

  // LocalStorage methods (fallback)
  private getTasksFromLocalStorage(): Record<string, any> {
    return JSON.parse(localStorage.getItem('userTaskData') || '{}');
  }

  private saveTaskToLocalStorage(taskIndex: number, taskData: any): void {
    const storedTasks = JSON.parse(localStorage.getItem('userTaskData') || '{}');
    storedTasks[taskIndex] = taskData;
    localStorage.setItem('userTaskData', JSON.stringify(storedTasks));
  }

  private updateTaskInLocalStorage(taskIndex: number, updates: any): void {
    const storedTasks = JSON.parse(localStorage.getItem('userTaskData') || '{}');
    if (storedTasks[taskIndex]) {
      storedTasks[taskIndex] = { ...storedTasks[taskIndex], ...updates };
      localStorage.setItem('userTaskData', JSON.stringify(storedTasks));
    }
  }

  private deleteTaskFromLocalStorage(taskIndex: number): void {
    const storedTasks = JSON.parse(localStorage.getItem('userTaskData') || '{}');
    delete storedTasks[taskIndex];
    localStorage.setItem('userTaskData', JSON.stringify(storedTasks));
  }

  private getDecryptedTasksFromLocalStorage(): number[] {
    return JSON.parse(localStorage.getItem('decryptedTasks') || '[]');
  }

  private saveDecryptedTasksToLocalStorage(ids: number[]): void {
    localStorage.setItem('decryptedTasks', JSON.stringify(ids));
  }
}

export const taskStorage = new TaskStorageService();

