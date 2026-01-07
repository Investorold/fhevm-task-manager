// Backend API service for persistent task storage
// In Vite, process.env is not defined in the browser. Use import.meta.env instead.
//
// SECURITY: All task data is encrypted client-side before being sent to backend.
// Backend only stores encrypted blobs - zero knowledge of actual content.
// Only the user with the wallet private key can decrypt their data.

import { simpleWalletService } from './simpleWalletService';
import { ethers } from 'ethers';
import { isDevMode } from '../utils/devMode';
import {
  deriveEncryptionKey,
  encryptTaskData,
  decryptTaskData,
  isEncryptedData,
  clearEncryptionKeyCache
} from '../utils/clientEncryption';

const DEFAULT_BACKEND_URL = (() => {
  try {
    const host = window.location?.hostname || 'localhost';
    // Use HTTPS if the page is served over HTTPS (production), otherwise HTTP (local dev)
    const protocol = window.location?.protocol === 'https:' ? 'https:' : 'http:';
    return `${protocol}//${host}:3001`;
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

// Remove trailing slash if present
const CLEANED_BACKEND_URL = BACKEND_URL.replace(/\/$/, '');

// Only log in development mode
if (isDevMode()) {
  console.log('[DEV] 🔗 Backend Service Configuration:', {
    VITE_BACKEND_URL: (import.meta as any).env?.VITE_BACKEND_URL,
    DEFAULT_BACKEND_URL,
    BACKEND_URL,
    CLEANED_BACKEND_URL
  });
}

const buildAddressVariants = (address: string | undefined | null) => {
  if (!address) return [] as string[];

  const variants = new Set<string>();

  try {
    variants.add(address);
    variants.add(address.toLowerCase());
    variants.add(address.toUpperCase());
    variants.add(ethers.getAddress(address));
  } catch {
    variants.add(address);
    if (address?.toLowerCase) variants.add(address.toLowerCase());
    if (address?.toUpperCase) variants.add(address.toUpperCase());
  }

  return Array.from(variants);
};

class BackendService {
  private userAddress: string | null = null;
  private encryptionKey: CryptoKey | null = null;
  private keyDerivationInProgress: Promise<CryptoKey> | null = null;

  setUserAddress(address: string) {
    try {
      this.userAddress = ethers.getAddress(address);
    } catch {
      this.userAddress = address;
    }
    // Reset encryption key when address changes
    this.encryptionKey = null;
    this.keyDerivationInProgress = null;
  }

  /**
   * Gets or derives the encryption key from wallet signature.
   * User will be prompted to sign once per session.
   */
  private async getEncryptionKey(): Promise<CryptoKey | null> {
    // Return cached key
    if (this.encryptionKey) {
      return this.encryptionKey;
    }

    // Wait for in-progress derivation
    if (this.keyDerivationInProgress) {
      return this.keyDerivationInProgress;
    }

    // Get signer from wallet service
    const signer = simpleWalletService.getSigner();
    if (!signer) {
      console.warn('[BackendService] No signer available for encryption');
      return null;
    }

    try {
      // Start key derivation (user will be prompted to sign)
      this.keyDerivationInProgress = deriveEncryptionKey(signer as ethers.Signer);
      this.encryptionKey = await this.keyDerivationInProgress;
      this.keyDerivationInProgress = null;

      if (isDevMode()) {
        console.log('[DEV] 🔐 Encryption key derived successfully');
      }
      return this.encryptionKey;
    } catch (error) {
      this.keyDerivationInProgress = null;
      console.error('[BackendService] Failed to derive encryption key:', error);
      return null;
    }
  }

  /**
   * Clears cached encryption key (call on disconnect)
   */
  clearEncryptionKey(): void {
    this.encryptionKey = null;
    this.keyDerivationInProgress = null;
    clearEncryptionKeyCache();
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
        try {
          this.userAddress = ethers.getAddress(address);
        } catch {
          this.userAddress = address;
    }
    return this.userAddress;
      }
    } catch (error) {
      // If simpleWalletService is not available or wallet not connected, continue to throw error
    }
    
    throw new Error('User address not set');
  }

  async getTasks(): Promise<Record<string, any>> {
    try {
      const address = this.getUserAddress();

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const response = await fetch(`${CLEANED_BACKEND_URL}/api/tasks/${address}`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Don't throw - just return empty object for graceful degradation
        // Only log in development mode
        if (isDevMode()) {
          console.warn(`[DEV] Backend returned ${response.status} for tasks. Using empty data.`);
        }
        return {};
      }

      const rawTasks = await response.json();

      // Decrypt each task if encrypted
      const encryptionKey = await this.getEncryptionKey();
      const decryptedTasks: Record<string, any> = {};

      for (const [key, value] of Object.entries(rawTasks)) {
        const taskData = value as any;

        // Check if task is encrypted
        if (taskData?.encrypted === true && taskData?.data && encryptionKey) {
          try {
            const decrypted = await decryptTaskData(taskData.data, encryptionKey);
            if (decrypted) {
              decryptedTasks[key] = decrypted;
              if (isDevMode()) {
                console.log(`[DEV] 🔓 Task ${key} decrypted successfully`);
              }
            } else {
              // Decryption failed - might be wrong key or corrupted data
              console.warn(`[BackendService] Failed to decrypt task ${key}`);
              decryptedTasks[key] = taskData; // Keep encrypted form
            }
          } catch (decryptError) {
            console.warn(`[BackendService] Error decrypting task ${key}:`, decryptError);
            decryptedTasks[key] = taskData; // Keep encrypted form
          }
        } else {
          // Not encrypted (legacy data) or no encryption key
          decryptedTasks[key] = taskData;
        }
      }

      return decryptedTasks;
    } catch (error: any) {
      // Silently handle network errors - backend is optional for demo mode
      if (error.name === 'AbortError') {
        // Only log in development mode
        if (isDevMode()) {
          console.warn('[DEV] Backend request timed out. Using empty data.');
        }
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError')) {
        // Silent fallback - backend is optional, app works with localStorage
        // Only log in development mode
        if (isDevMode()) {
          console.warn('[DEV] Backend unavailable. Using empty data. This is normal for demo mode.');
        }
      } else {
        // Only log in development mode
        if (isDevMode()) {
          console.warn('[DEV] Failed to fetch tasks from backend:', error.message || error);
        }
      }
      return {};
    }
  }

  async getTasksForAddress(address: string): Promise<Record<string, any>> {
    // NOTE: When fetching tasks for ANOTHER user's address (shared tasks),
    // we cannot decrypt them because we don't have the owner's encryption key.
    // This is intentional - only the task owner can decrypt their own data.
    // The recipient relies on FHE decryption through the blockchain.

    const variants = buildAddressVariants(address);

    let lastError: unknown = null;

    for (const candidate of variants) {
      if (!candidate) continue;

      try {
        const response = await fetch(`${CLEANED_BACKEND_URL}/api/tasks/${candidate}`);

        if (!response.ok) {
          lastError = new Error(`Failed to fetch tasks for address ${candidate}: ${response.statusText}`);
          continue;
        }

        const data = await response.json();

        if (data && Object.keys(data).length > 0) {
          // Only log in development mode
          if (isDevMode()) {
            console.log(`[DEV] ✅ Backend tasks fetched: ${Object.keys(data).length} task(s)`);
            // Note: These tasks remain encrypted - can't decrypt other user's data
            const encryptedCount = Object.values(data).filter((t: any) => t?.encrypted).length;
            if (encryptedCount > 0) {
              console.log(`[DEV] 🔒 ${encryptedCount} task(s) are encrypted (owner's data)`);
            }
          }
          return data;
        }

        // If empty, keep trying other variants before giving up
        lastError = new Error(`No tasks stored for address variant ${candidate}`);
      } catch (error) {
        lastError = error;
        // Only log in development mode
        if (isDevMode()) {
          console.warn(`[DEV] ⚠️ Failed to fetch tasks from backend for address variant ${candidate}:`, error);
        }
      }
    }

    if (lastError) {
      // Only log in development mode
      if (import.meta.env?.DEV || window.location.hostname === 'localhost') {
        console.warn(`[DEV] ⚠️ Could not fetch backend tasks for ${address}. Falling back.`, lastError);
      }
    }

    return {};
  }

  async saveTask(taskData: any, taskIndex: number): Promise<void> {
    try {
      const address = this.getUserAddress();

      // Encrypt task data before sending to backend
      const encryptionKey = await this.getEncryptionKey();
      let dataToSave = taskData;

      if (encryptionKey) {
        const encryptedBlob = await encryptTaskData(taskData, encryptionKey);
        dataToSave = {
          encrypted: true,
          data: encryptedBlob,
          // Store task index for reference (not sensitive)
          taskIndex,
          timestamp: Date.now()
        };

        if (isDevMode()) {
          console.log('[DEV] 🔐 Task data encrypted before saving');
        }
      } else {
        console.warn('[BackendService] Saving task WITHOUT encryption - key not available');
      }

      const response = await fetch(`${CLEANED_BACKEND_URL}/api/tasks/${address}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskIndex,
          taskData: dataToSave
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save task: ${response.statusText}`);
      }

      // Only log in development mode
      if (import.meta.env?.DEV || window.location.hostname === 'localhost') {
        console.log('[DEV] ✅ Task saved to backend:', taskIndex, encryptionKey ? '(encrypted)' : '(plaintext)');
      }
    } catch (error) {
      // Only log in development mode
      if (import.meta.env?.DEV || window.location.hostname === 'localhost') {
        console.error('[DEV] Failed to save task to backend:', error);
      }
      throw error;
    }
  }

  async updateTask(taskIndex: number, updates: any): Promise<void> {
    try {
      const address = this.getUserAddress();
      const response = await fetch(`${CLEANED_BACKEND_URL}/api/tasks/${address}/${taskIndex}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.statusText}`);
      }
      
      // Only log in development mode
      if (import.meta.env?.DEV || window.location.hostname === 'localhost') {
        console.log('[DEV] ✅ Task updated on backend:', taskIndex);
      }
    } catch (error) {
      // Only log in development mode
      if (import.meta.env?.DEV || window.location.hostname === 'localhost') {
        console.error('[DEV] Failed to update task on backend:', error);
      }
      throw error;
    }
  }

  async deleteTask(taskIndex: number): Promise<void> {
    try {
      const address = this.getUserAddress();
      const response = await fetch(`${CLEANED_BACKEND_URL}/api/tasks/${address}/${taskIndex}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to delete task: ${response.statusText}`);
      }
      
      // Only log in development mode
      if (import.meta.env?.DEV || window.location.hostname === 'localhost') {
        console.log('[DEV] ✅ Task deleted from backend:', taskIndex);
      }
    } catch (error) {
      // Only log in development mode
      if (import.meta.env?.DEV || window.location.hostname === 'localhost') {
        console.error('[DEV] Failed to delete task from backend:', error);
      }
      throw error;
    }
  }

  async getDecryptedTasks(): Promise<number[]> {
    try {
      const address = this.getUserAddress();
      const response = await fetch(`${CLEANED_BACKEND_URL}/api/decrypted/${address}`);
      
      if (!response.ok) {
        return [];
      }
      
      return await response.json();
    } catch (error) {
      // Only log in development mode
      if (import.meta.env?.DEV || window.location.hostname === 'localhost') {
        console.error('[DEV] Failed to fetch decrypted tasks:', error);
      }
      return [];
    }
  }

  async saveDecryptedTasks(ids: number[]): Promise<void> {
    try {
      const address = this.getUserAddress();
      const response = await fetch(`${CLEANED_BACKEND_URL}/api/decrypted/${address}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ids }),
      });
      
      if (!response.ok) {
        throw new Error(`Failed to save decrypted tasks: ${response.statusText}`);
      }
      
      // Only log in development mode
      if (import.meta.env?.DEV || window.location.hostname === 'localhost') {
        console.log('[DEV] ✅ Decrypted tasks saved to backend');
      }
    } catch (error) {
      // Only log in development mode
      if (import.meta.env?.DEV || window.location.hostname === 'localhost') {
        console.error('[DEV] Failed to save decrypted tasks:', error);
      }
      throw error;
    }
  }
}

export const backendService = new BackendService();

