// Backend API service for persistent task storage
// In Vite, process.env is not defined in the browser. Use import.meta.env instead.
import { simpleWalletService } from './simpleWalletService';

const DEFAULT_BACKEND_URL = (() => {
  try {
    const host = window.location?.hostname || 'localhost';
    return `http://${host}:3001`;
  } catch {
    return 'http://localhost:3001';
  }
})();

// Prefer Vite env var if provided, otherwise fall back to same-host :3001
// Define VITE_BACKEND_URL in a .env file if you want a custom URL
// Example: VITE_BACKEND_URL=https://api.example.com
const BACKEND_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_BACKEND_URL) ||
  DEFAULT_BACKEND_URL;

console.log('🔗 Backend Service Configuration:', {
  VITE_BACKEND_URL: (import.meta as any).env?.VITE_BACKEND_URL,
  DEFAULT_BACKEND_URL,
  BACKEND_URL
});

class BackendService {
  private userAddress: string | null = null;

  setUserAddress(address: string) {
    this.userAddress = address;
  }

  getUserAddress(): string {
    // If address is already set, use it
    if (this.userAddress) {
      return this.userAddress;
    }
    
    // Otherwise, try to get it from simpleWalletService
    try {
      const address = simpleWalletService.getAddress();
      if (address) {
        this.userAddress = address;
        return address;
      }
    } catch (error) {
      // If simpleWalletService is not available or wallet not connected, continue to throw error
    }
    
    throw new Error('User address not set');
  }

  async getTasks(): Promise<Record<string, any>> {
    try {
      const address = this.getUserAddress();
      const response = await fetch(`${BACKEND_URL}/api/tasks/${address}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch tasks from backend:', error);
      return {};
    }
  }

  async getTasksForAddress(address: string): Promise<Record<string, any>> {
    try {
      const response = await fetch(`${BACKEND_URL}/api/tasks/${address}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch tasks for address: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch tasks from backend for address ${address}:`, error);
      return {};
    }
  }

  async saveTask(taskData: any, taskIndex: number): Promise<void> {
    try {
      const address = this.getUserAddress();
      const response = await fetch(`${BACKEND_URL}/api/tasks/${address}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...taskData,
          taskIndex
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save task: ${response.statusText}`);
      }
      
      console.log('✅ Task saved to backend:', taskIndex);
    } catch (error) {
      console.error('Failed to save task to backend:', error);
      throw error;
    }
  }

  async updateTask(taskIndex: number, updates: any): Promise<void> {
    try {
      const address = this.getUserAddress();
      const response = await fetch(`${BACKEND_URL}/api/tasks/${address}/${taskIndex}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.statusText}`);
      }
      
      console.log('✅ Task updated on backend:', taskIndex);
    } catch (error) {
      console.error('Failed to update task on backend:', error);
      throw error;
    }
  }

  async deleteTask(taskIndex: number): Promise<void> {
    try {
      const address = this.getUserAddress();
      const response = await fetch(`${BACKEND_URL}/api/tasks/${address}/${taskIndex}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete task: ${response.statusText}`);
      }
      
      console.log('✅ Task deleted from backend:', taskIndex);
    } catch (error) {
      console.error('Failed to delete task from backend:', error);
      throw error;
    }
  }

  async getDecryptedTasks(): Promise<number[]> {
    try {
      const address = this.getUserAddress();
      const response = await fetch(`${BACKEND_URL}/api/decrypted/${address}`);
      
      if (!response.ok) {
        return [];
      }
      
      return await response.json();
    } catch (error) {
      console.error('Failed to fetch decrypted tasks:', error);
      return [];
    }
  }

  async saveDecryptedTasks(ids: number[]): Promise<void> {
    try {
      const address = this.getUserAddress();
      const response = await fetch(`${BACKEND_URL}/api/decrypted/${address}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save decrypted tasks: ${response.statusText}`);
      }
      
      console.log('✅ Decrypted tasks saved to backend');
    } catch (error) {
      console.error('Failed to save decrypted tasks:', error);
      throw error;
    }
  }
}

export const backendService = new BackendService();

