// Backend API service for persistent task storage
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001';

class BackendService {
  private userAddress: string | null = null;

  setUserAddress(address: string) {
    this.userAddress = address;
  }

  getUserAddress(): string {
    if (!this.userAddress) {
      throw new Error('User address not set');
    }
    return this.userAddress;
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

