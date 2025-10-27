// Unified task storage service - uses backend when available, falls back to localStorage
// import { backendService } from './backendService';

class TaskStorageService {
  private useBackend = false;

  constructor() {
    // TEMPORARILY DISABLED: Use localStorage only to prevent blank screen
    // Will enable backend integration later when properly configured
    this.useBackend = false;
    console.log('🔧 TaskStorage using localStorage only (backend disabled for now)');
  }

  async getTasks(): Promise<Record<string, any>> {
    // ALWAYS use localStorage for now
    return this.getTasksFromLocalStorage();
  }

  async saveTask(taskIndex: number, taskData: any): Promise<void> {
    // ALWAYS use localStorage for now
    this.saveTaskToLocalStorage(taskIndex, taskData);
  }

  async updateTask(taskIndex: number, updates: any): Promise<void> {
    // ALWAYS use localStorage for now
    this.updateTaskInLocalStorage(taskIndex, updates);
  }

  async deleteTask(taskIndex: number): Promise<void> {
    // ALWAYS use localStorage for now
    this.deleteTaskFromLocalStorage(taskIndex);
  }

  async getDecryptedTasks(): Promise<number[]> {
    // ALWAYS use localStorage for now
    return this.getDecryptedTasksFromLocalStorage();
  }

  async saveDecryptedTasks(ids: number[]): Promise<void> {
    // ALWAYS use localStorage for now
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

