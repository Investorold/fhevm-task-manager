export interface Task {
  id: number;
  title: string;
  description: string;
  dueDate: string;
  priority: number;
  status: 'Pending' | 'Completed';
  createdAt: string;
  sharedBy?: string; // Address of the user who shared this task
  blockchainIndex?: number; // Blockchain array index for decryption
  frontendId?: number; // Frontend timestamp ID for reference
  isEncrypted?: boolean; // Whether task is encrypted
  isShared?: boolean; // Whether task is shared
  isLegacy?: boolean; // Whether task is legacy (created before localStorage sync)
  shouldEncrypt?: boolean; // Whether task should be encrypted (plain text if false)
}

export interface EncryptedTask {
  title: string;
  dueDate: string;
  priority: string;
  status: 'Pending' | 'Completed';
}

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId?: string | number | null;
  isFhevmInitialized?: boolean;
  error?: string | null;
}

export interface ContractConfig {
  taskManagerAddress: string;
  network: string;
  chainId: number;
}

export interface FhevmInstance {
  encrypt: (value: any, type: string) => Promise<any>;
  decrypt: (ciphertext: string) => Promise<any>;
  generatePublicKey: () => Promise<string>;
  getPublicKey: () => string;
}
