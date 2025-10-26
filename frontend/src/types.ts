// Task interface for the Task Manager application
export interface Task {
  id: number;
  title: string;
  description?: string;
  dueDate: string; // ISO string format
  priority: number; // 1-3 (1=high, 2=medium, 3=low)
  status: 'Pending' | 'Completed';
  createdAt: string; // ISO string format
  isEncrypted?: boolean; // Whether task data is encrypted
  isShared?: boolean; // Whether task has been shared (non-repudiation)
  // Blockchain transaction history (immutable audit trail)
  transactionHistory?: {
    created?: {
      transactionHash: string;
      blockNumber: number;
      timestamp: string; // ISO string format
      gasUsed: string;
    };
    completed?: {
      transactionHash: string;
      blockNumber: number;
      timestamp: string; // ISO string format
      gasUsed: string;
    };
    shared?: {
      transactionHash: string;
      blockNumber: number;
      timestamp: string; // ISO string format
      gasUsed: string;
      recipientAddress: string;
    };
    deleted?: {
      transactionHash: string;
      blockNumber: number;
      timestamp: string; // ISO string format
      gasUsed: string;
    };
  };
}

// Wallet state interface
export interface WalletState {
  isConnected: boolean;
  address: string;
  provider: any;
  signer: any;
}
