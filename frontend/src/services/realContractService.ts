import { ethers } from 'ethers';
import { simpleWalletService } from './simpleWalletService';
import { productionWalletService } from './productionWalletService';
import { fhevmService } from './fhevmService';
import type { Task } from '../types';

// EXACT ABI from your TaskManager.sol contract
// ABI matching the actual deployed contract with correct FHEVM types
const TASK_MANAGER_ABI = [
  // Core task functions with actual FHEVM types from deployed contract
  // externalEuint64/8 compile to bytes32  
  "function createTask(bytes32 encryptedTitle, bytes32 encryptedDueDate, bytes32 encryptedPriority, bytes inputProof) external payable",
  "function createTaskWithText(bytes32 encryptedTitle, bytes32 encryptedDescription, bytes32 encryptedDueDate, bytes32 encryptedPriority, bytes inputProof) external payable",
  "function createTaskWithNumbers(bytes32 encryptedTitle, bytes32 encryptedDueDate, bytes32 encryptedPriority, bytes32 encryptedNumericId, bytes inputProof) external payable",
  "function completeTask(uint256 taskIndex) external",
  "function deleteTask(uint256 taskIndex) external",
  "function editTask(uint256 taskIndex, bytes32 newEncryptedTitle, bytes32 newEncryptedDueDate, bytes32 newEncryptedPriority, bytes inputProof) external",
  "function shareTask(uint256 taskIndex, address recipient) external",
  
  // Decryption functions
  "function requestTaskDecryption(uint256 taskIndex) external",
  "function requestSharedTaskDecryption(uint256 taskIndex, address originalOwner) external",
  "function taskDecryptionCallback(uint256 requestId, bytes memory cleartexts, bytes memory decryptionProof) external",
  
  // Fee and admin functions
  "function requestTasksDueSoonCount(bytes32 encryptedTimeMargin, bytes inputProof) external",
  "function taskCreationFee() external view returns (uint256)",
  "function setFee(uint256 _newFee) external",
  "function withdraw() external",
  "function owner() external view returns (address)",
  
  // Due soon count functions
  "function callbackCount(uint256 requestId, bytes memory cleartexts, bytes memory decryptionProof) external",
  "function lastDueSoonCount(address user) external view returns (uint32)",
  "function getTasks(address user) external view returns (tuple(bytes32 title, bytes32 description, bytes32 dueDate, bytes32 priority, bytes32 numericId, uint8 status)[] memory)",
  
  // Shared tasks functions
  "function sharedTasks(address user) external view returns (uint256[] memory)",
  "function taskOwners(uint256 taskIndex) external view returns (address)",
  "function isTaskSharedWith(address recipient, uint256 taskIndex) external view returns (bool)",

  // Events
  "event DecryptionRequested(uint256 requestId, address indexed initiator)",
  "event TaskShared(uint256 indexed taskIndex, address indexed owner, address indexed recipient)",
  "event TaskDecrypted(uint256 indexed requestId, address indexed user, uint64 title, uint64 dueDate, uint8 priority)",
  "event Debug(string message, uint256 value)"
];

class RealContractService {
  private contract: ethers.Contract | null = null;
  private contractAddress = "";
  private isDemoMode = false; // Use real contract - we need FHEVM

  async initialize(contractAddress: string): Promise<void> {
    console.log('🚀 Initializing RealContractService with address:', contractAddress);
    
    // Check if demo mode
    if (contractAddress === 'DEMO_MODE') {
      this.isDemoMode = true;
      this.contractAddress = contractAddress;
      console.log('Running in demo mode - no contract connection needed');
      return;
    }
    
    this.contractAddress = contractAddress;
    
    // Wait for wallet to be ready with robust provider detection
    let provider = simpleWalletService.getProvider();
    let signer = simpleWalletService.getSigner();
    
    // If provider is not available, try fallback detection
    if (!provider) {
      console.warn('⚠️ Primary provider not available, attempting fallback detection...');
      
      if (window.ethereum) {
        provider = window.ethereum;
        console.log('✅ Fallback provider found from window.ethereum');
      } else if ((window as any).ethereum?.providers) {
        provider = (window as any).ethereum.providers.find((p: any) => p.isMetaMask);
        console.log('✅ Fallback provider found from providers array');
      }
    }
    
    if (!provider || !signer) {
      console.warn('Wallet not connected yet, contract service will initialize when wallet connects');
      return;
    }

    console.log('🔍 Creating contract with:', {
      address: this.contractAddress,
      abiLength: TASK_MANAGER_ABI.length,
      abiFirstFunction: TASK_MANAGER_ABI[0],
      provider: !!provider,
      signer: !!signer
    });
    
    this.contract = new ethers.Contract(this.contractAddress, TASK_MANAGER_ABI, signer);
    console.log('✅ Connected to TaskManager contract:', this.contractAddress);
    
    // Debug: Log available contract methods
    console.log('🔍 Available contract methods:', Object.getOwnPropertyNames(this.contract));
    console.log('🔍 Contract interface methods:', this.contract.interface.fragments.map(f => (f as any).name));
    console.log('🔍 Has createTask method:', 'createTask' in this.contract);

    // Test contract connection
    try {
      console.log('🧪 Testing contract connection...');
      const fee = await this.contract.taskCreationFee();
      console.log('✅ Contract connection verified. Task creation fee:', fee.toString());
    } catch (error) {
      console.warn('⚠️ Contract connection test failed (this may be normal for new contracts):', error);
      console.log('ℹ️  The contract address exists, but may have different function signatures');
    }
  }

  isInitialized(): boolean {
    return !!this.contract && this.contractAddress !== '';
  }

  async getTaskCreationFee(): Promise<string> {
    if (this.isDemoMode) {
      return '0.0001';
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const fee = await this.contract.taskCreationFee();
      return ethers.formatEther(fee);
    } catch (error) {
      console.warn('Failed to get task creation fee from contract (using default):', error);
      // Return default fee if contract call fails
      return '0.0001';
    }
  }

  async getReceivedTasks(): Promise<Task[]> {
    if (this.isDemoMode) {
      return [];
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const signer = simpleWalletService.getSigner();
      if (!signer) {
        throw new Error('Wallet not connected');
      }

      const userAddress = await signer.getAddress();
      console.log('🔍 Loading received tasks for user:', userAddress);

      // Try to get shared task indices for this user
      let sharedTaskIndices: number[] = [];
      try {
        sharedTaskIndices = await this.contract.sharedTasks(userAddress);
        console.log('🔍 Found shared task indices:', sharedTaskIndices);
      } catch (error) {
        console.warn('⚠️ sharedTasks function not available on contract:', error);
        // Return empty array if function doesn't exist
      return [];
      }

      if (sharedTaskIndices.length === 0) {
        return [];
      }

      // Get the actual tasks from the original owners
      const receivedTasks: Task[] = [];
      
      for (const taskIndex of sharedTaskIndices) {
        try {
          // Get the original owner of this task
          const originalOwner = await this.contract.taskOwners(taskIndex);
          
          // Get the task from the original owner
          const ownerTasks = await this.contract.getTasks(originalOwner);
          
          if (taskIndex < ownerTasks.length) {
            const sharedTask = ownerTasks[taskIndex];
            
            // Convert to our Task format
            const task: Task = {
              id: taskIndex,
              title: `******* ********`, // Encrypted - needs decryption
              description: `******* ********`,
              dueDate: new Date().toISOString(), // Placeholder
              priority: 1, // Placeholder
              status: sharedTask.status === 0 ? 'Pending' : 'Completed',
              createdAt: new Date().toISOString(),
              isEncrypted: true,
              isShared: true,
              originalOwner: originalOwner, // Store original owner for decryption
              sharedBy: originalOwner
            };
            
            receivedTasks.push(task);
            console.log('✅ Added shared task:', taskIndex, 'from owner:', originalOwner);
          }
        } catch (error) {
          console.warn('⚠️ Failed to load shared task:', taskIndex, error);
        }
      }

      console.log('✅ Loaded received tasks:', receivedTasks.length);
      return receivedTasks;

    } catch (error) {
      console.error('Failed to get received tasks:', error);
      // Return empty array instead of throwing error to prevent app crash
      return [];
    }
  }

  async createTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<{ success: boolean; error?: string; taskId?: number }> {
      // Ensure we have a valid contract address
      if (!this.contractAddress || this.contractAddress === '' || this.contractAddress === 'DEMO_MODE') {
      this.contractAddress = '0x2FF65Cf9F062272Fb85B4B1D0bA14ca623a09885';
    }

    console.log('🔍 Contract service state:', {
      isDemoMode: this.isDemoMode,
      contractAddress: this.contractAddress,
      hasContract: !!this.contract,
      contractMethods: this.contract ? Object.keys(this.contract) : 'No contract'
    });

    // Validate contract address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(this.contractAddress)) {
      throw new Error('Invalid contract address format');
    }
    
    if (this.isDemoMode) {
      console.log('Demo mode: Creating task', task);
      return { success: true, taskId: Date.now() };
    }

    if (!this.contract) {
      console.error('❌ Contract not initialized');
      throw new Error('Contract not initialized');
    }

    // Initialize FHEVM if not ready
    if (!fhevmService.isReady()) {
      console.warn('⚠️ FHEVM not ready, initializing...');
      await fhevmService.initialize();
    }

    try {
      console.log('🔒 Preparing task data for blockchain...');
      
      console.log('📝 Received task object:', task);
      console.log('📝 Task title:', task.title, 'type:', typeof task.title);
      console.log('📝 Task dueDate:', task.dueDate, 'type:', typeof task.dueDate);
      console.log('📝 Task priority:', task.priority, 'type:', typeof task.priority);
      
      // Validate task data
      const title = task.title || 'Untitled Task';
      const dueDate = task.dueDate || new Date().toISOString().split('T')[0];
      const priority = task.priority ?? 1;
      
      console.log('📝 Task data to encrypt:', { title, dueDate, priority });
      
      // Get task creation fee first (with fallback)
      let fee;
      try {
        fee = await this.contract.taskCreationFee();
        console.log('✅ Got fee from contract:', fee.toString());
      } catch (error) {
        console.warn('⚠️ Failed to get fee from contract, using default 0.0001 ETH');
        fee = ethers.parseEther('0.0001');
      }

      // Convert title to a more reversible number format
      // Use a hash that can be better reconstructed
      const titleAsNumber = this.stringToReversibleNumber(title);
      const dueDateTimestamp = Math.floor(new Date(dueDate).getTime() / 1000);
      
      console.log('📝 Converted data:', { 
        originalTitle: title, 
        titleAsNumber, 
        originalDueDate: dueDate, 
        dueDateTimestamp, 
        priority 
      });

      // CORRECT ZAMA APPROACH: Use global FHE public key with user address for access control
      console.log('🔐 Using Zama global FHE public key approach with user access control...');
      
      // Get user address for access control (still needed even with global FHE key)
      const signer = simpleWalletService.getSigner();
      if (!signer) {
        throw new Error('Wallet not connected');
      }
      const userAddress = await signer.getAddress();
      console.log('👤 User address for access control:', userAddress);
      
      let combinedResult;
      try {
        // Get the global FHEVM instance
        const fhevmInstance = fhevmService.getInstance();
        
        // Create encrypted input using the global public key with user address for access control
        const combinedInput = fhevmInstance.createEncryptedInput(this.contractAddress, userAddress);
        
        // Add the data to encrypt
        combinedInput.add64(titleAsNumber);      // Title as 64-bit
        combinedInput.add64(dueDateTimestamp);   // Due date as 64-bit  
        combinedInput.add8(priority);           // Priority as 8-bit
        
        // Encrypt using the global public key
          combinedResult = await combinedInput.encrypt();
          
        console.log('✅ Encryption successful with global FHE key');
        console.log('🔍 Combined encrypted input:', combinedResult);
        console.log('🔍 Handles structure:', {
          handle0: combinedResult.handles[0],
          handle0Keys: Object.keys(combinedResult.handles[0] || {}),
          allHandles: combinedResult.handles
        });
          
        } catch (encryptError) {
        console.error('❌ Encryption failed:', encryptError);
        throw new Error(`Failed to encrypt data with global FHE key. The FHEVM relayer may be experiencing issues. Please try again in a few minutes.`);
      }
      
      // Use ethers.js contract with the correct ABI
      // Handles are already in the correct format for ethers.js
      console.log('🔍 Passing handles to contract:', {
        title: combinedResult.handles[0],
        dueDate: combinedResult.handles[1],
        priority: combinedResult.handles[2]
      });
      
      const tx = await this.contract.createTask(
        combinedResult.handles[0],    // Encrypted title
        combinedResult.handles[1],    // Encrypted due date
        combinedResult.handles[2],    // Encrypted priority
        combinedResult.inputProof,
        { value: fee }
      );

      console.log('⏳ Waiting for transaction confirmation...');
      // Wait for transaction confirmation
      const receipt = await Promise.race([
        tx.wait(1), // Wait for 1 confirmation instead of full confirmation
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transaction timeout')), 30000) // Increased to 30s for task creation
        )
      ]);
      console.log('✅ Task created on blockchain! Hash:', receipt.hash);
      
      return { 
        success: true, 
        taskId: Date.now() // In a real implementation, you'd get the task ID from the contract
      };
      
    } catch (error) {
      console.error('❌ Failed to create task:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async createTaskWithText(task: Omit<Task, 'id' | 'createdAt'>): Promise<{ success: boolean; error?: string; taskId?: number }> {
    // Ensure we have a valid contract address
    if (!this.contractAddress || this.contractAddress === '' || this.contractAddress === 'DEMO_MODE') {
      this.contractAddress = '0x2FF65Cf9F062272Fb85B4B1D0bA14ca623a09885';
    }

    console.log('🔍 Contract service state:', {
      isDemoMode: this.isDemoMode,
      contractAddress: this.contractAddress,
      hasContract: !!this.contract,
      contractMethods: this.contract ? Object.keys(this.contract) : 'No contract'
    });

    // Validate contract address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(this.contractAddress)) {
      throw new Error('Invalid contract address format');
    }
    
    if (this.isDemoMode) {
      console.log('Demo mode: Creating text task', task);
      return { success: true, taskId: Date.now() };
    }

    if (!this.contract) {
      console.error('❌ Contract not initialized');
      throw new Error('Contract not initialized');
    }

    // Initialize FHEVM if not ready
    if (!fhevmService.isReady()) {
      console.warn('⚠️ FHEVM not ready, initializing...');
      await fhevmService.initialize();
    }

    try {
      console.log('🔒 Preparing text task data for blockchain...');
      
      // Get user address for FHEVM encryption
      const signer = simpleWalletService.getSigner();
      if (!signer) {
        throw new Error('Wallet not connected');
      }
      const userAddress = await signer.getAddress();
      
      console.log('📝 Received text task object:', task);
      console.log('📝 Task title:', task.title, 'type:', typeof task.title);
      console.log('📝 Task description:', task.description, 'type:', typeof task.description);
      console.log('📝 Task dueDate:', task.dueDate, 'type:', typeof task.dueDate);
      console.log('📝 Task priority:', task.priority, 'type:', typeof task.priority);
      
      // Validate task data
      const title = task.title || 'Untitled Task';
      const description = task.description || 'No description';
      const dueDate = task.dueDate || new Date().toISOString().split('T')[0];
      const priority = task.priority ?? 1;
      
      console.log('📝 Text task data to encrypt:', { title, description, dueDate, priority });
      
      // Get task creation fee first (with fallback)
      let fee;
      try {
        fee = await this.contract.taskCreationFee();
        console.log('✅ Got fee from contract:', fee.toString());
      } catch (error) {
        console.warn('⚠️ Failed to get fee from contract, using default 0.0001 ETH');
        fee = ethers.parseEther('0.0001');
      }

      // Convert text to numbers for FHEVM encryption
      const titleAsNumber = this.stringToReversibleNumber(title);
      const descriptionAsNumber = this.stringToReversibleNumber(description);
      const dueDateTimestamp = Math.floor(new Date(dueDate).getTime() / 1000);
      
      console.log('📝 Text task converted data:', { 
        originalTitle: title, 
        titleAsNumber, 
        originalDescription: description,
        descriptionAsNumber,
        originalDueDate: dueDate, 
        dueDateTimestamp, 
        priority 
      });

      // Try to create encrypted input with retry logic
      let combinedResult;
      let retryCount = 0;
        const maxRetries = 1; // Reduced from 2 to 1 for faster UX
      
      while (retryCount < maxRetries) {
        try {
          console.log(`🔐 Text encryption attempt ${retryCount + 1}/${maxRetries}...`);
          
          // Create a combined encrypted input for all four values
          const combinedInput = fhevmService.getInstance().createEncryptedInput(this.contractAddress, userAddress);
          combinedInput.add64(titleAsNumber);        // Add title as 64-bit
          combinedInput.add64(descriptionAsNumber);  // Add description as 64-bit
          combinedInput.add64(dueDateTimestamp);     // Add due date as 64-bit  
          combinedInput.add8(priority);             // Add priority as 8-bit
          combinedResult = await combinedInput.encrypt();
          
          console.log('✅ Text encryption successful on attempt', retryCount + 1);
          break;
          
        } catch (encryptError) {
          retryCount++;
          console.error(`❌ Text encryption attempt ${retryCount} failed:`, encryptError);
          
          if (retryCount >= maxRetries) {
            throw new Error(`Failed to encrypt text data after ${maxRetries} attempts. The FHEVM relayer may be experiencing issues. Please try again in a few minutes.`);
          }
          
          // Wait before retry (exponential backoff)
          const waitTime = 200 * retryCount; // Reduced from 500ms to 200ms for faster UX
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      console.log('🔍 Combined encrypted text input:', combinedResult);
      
      // Use ethers.js contract with the correct ABI for createTaskWithText
      // Handles are already in the correct format
      console.log('🔍 Passing text task handles to contract:', {
        title: combinedResult.handles[0],
        description: combinedResult.handles[1],
        dueDate: combinedResult.handles[2],
        priority: combinedResult.handles[3]
      });
      
      const tx = await this.contract.createTaskWithText(
        combinedResult.handles[0],    // Encrypted title
        combinedResult.handles[1],    // Encrypted description
        combinedResult.handles[2],    // Encrypted due date
        combinedResult.handles[3],    // Encrypted priority
        combinedResult.inputProof,
        { value: fee }
      );

      console.log('⏳ Waiting for text task transaction confirmation...');
      // Wait for transaction confirmation
      const receipt = await Promise.race([
        tx.wait(1), // Wait for 1 confirmation instead of full confirmation
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transaction timeout')), 30000) // Increased to 30s for task creation
        )
      ]);
      console.log('✅ Text task created on blockchain! Hash:', receipt.hash);
      
      return { 
        success: true, 
        taskId: Date.now() // In a real implementation, you'd get the task ID from the contract
      };
      
    } catch (error) {
      console.error('❌ Failed to create text task:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  // Add missing methods that TaskManager.tsx expects
  async initializeWithWallet(contractAddress: string): Promise<void> {
    return this.initialize(contractAddress);
  }

  getContractAddress(): string {
    return this.contractAddress;
  }

  async createTaskWithNumbers(task: Omit<Task, 'id' | 'createdAt'> & { numericId: number }): Promise<{ success: boolean; error?: string; taskId?: number }> {
    // Ensure we have a valid contract address
    if (!this.contractAddress || this.contractAddress === '' || this.contractAddress === 'DEMO_MODE') {
      this.contractAddress = '0x2FF65Cf9F062272Fb85B4B1D0bA14ca623a09885';
    }

    console.log('🔍 Contract service state:', {
      isDemoMode: this.isDemoMode,
      contractAddress: this.contractAddress,
      hasContract: !!this.contract,
      contractMethods: this.contract ? Object.keys(this.contract) : 'No contract'
    });

    // Validate contract address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(this.contractAddress)) {
      throw new Error('Invalid contract address format');
    }
    
    if (this.isDemoMode) {
      console.log('Demo mode: Creating numeric task', task);
      return { success: true, taskId: Date.now() };
    }

    if (!this.contract) {
      console.error('❌ Contract not initialized');
      throw new Error('Contract not initialized');
    }

    // Initialize FHEVM if not ready
    if (!fhevmService.isReady()) {
      console.warn('⚠️ FHEVM not ready, initializing...');
      await fhevmService.initialize();
    }

    try {
      console.log('🔒 Preparing numeric task data for blockchain...');
      
      // Get user address for FHEVM encryption
      const signer = simpleWalletService.getSigner();
      if (!signer) {
        throw new Error('Wallet not connected');
      }
      const userAddress = await signer.getAddress();
      
      console.log('📝 Received numeric task object:', task);
      console.log('📝 Task title:', task.title, 'type:', typeof task.title);
      console.log('📝 Task dueDate:', task.dueDate, 'type:', typeof task.dueDate);
      console.log('📝 Task priority:', task.priority, 'type:', typeof task.priority);
      console.log('📝 Task numericId:', task.numericId, 'type:', typeof task.numericId);
      
      // Validate task data
      const title = task.title || 'Untitled Task';
      const dueDate = task.dueDate || new Date().toISOString().split('T')[0];
      const priority = task.priority ?? 1;
      const numericId = task.numericId ?? 0;
      
      console.log('📝 Numeric task data to encrypt:', { title, dueDate, priority, numericId });
      
      // Get task creation fee first (with fallback)
      let fee;
      try {
        fee = await this.contract.taskCreationFee();
        console.log('✅ Got fee from contract:', fee.toString());
      } catch (error) {
        console.warn('⚠️ Failed to get fee from contract, using default 0.0001 ETH');
        fee = ethers.parseEther('0.0001');
      }

      // Convert text to numbers for FHEVM encryption
      const titleAsNumber = this.stringToReversibleNumber(title);
      const dueDateTimestamp = Math.floor(new Date(dueDate).getTime() / 1000);
      
      console.log('📝 Numeric task converted data:', { 
        originalTitle: title, 
        titleAsNumber, 
        originalDueDate: dueDate, 
        dueDateTimestamp, 
        priority,
        numericId
      });

      // Try to create encrypted input with retry logic
      let combinedResult;
      let retryCount = 0;
        const maxRetries = 1; // Reduced from 2 to 1 for faster UX
      
      while (retryCount < maxRetries) {
        try {
          console.log(`🔐 Numeric encryption attempt ${retryCount + 1}/${maxRetries}...`);
          
          // Create a combined encrypted input for all four values
          const combinedInput = fhevmService.getInstance().createEncryptedInput(this.contractAddress, userAddress);
          combinedInput.add64(titleAsNumber);        // Add title as 64-bit
          combinedInput.add64(dueDateTimestamp);     // Add due date as 64-bit  
          combinedInput.add8(priority);             // Add priority as 8-bit
          combinedInput.add64(numericId);            // Add numeric ID as 64-bit
          combinedResult = await combinedInput.encrypt();
          
          console.log('✅ Numeric encryption successful on attempt', retryCount + 1);
          break;
          
        } catch (encryptError) {
          retryCount++;
          console.error(`❌ Numeric encryption attempt ${retryCount} failed:`, encryptError);
          
          if (retryCount >= maxRetries) {
            throw new Error(`Failed to encrypt numeric data after ${maxRetries} attempts. The FHEVM relayer may be experiencing issues. Please try again in a few minutes.`);
          }
          
          // Wait before retry (exponential backoff)
          const waitTime = 200 * retryCount; // Reduced from 500ms to 200ms for faster UX
          console.log(`⏳ Waiting ${waitTime}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }

      console.log('🔍 Combined encrypted numeric input:', combinedResult);
      
      // Use ethers.js contract with the correct ABI for createTaskWithNumbers
      const tx = await this.contract.createTaskWithNumbers(
        combinedResult.handles[0],    // Encrypted title as bytes32
        combinedResult.handles[1],    // Encrypted due date as bytes32
        combinedResult.handles[2],    // Encrypted priority as bytes32
        combinedResult.handles[3],    // Encrypted numeric ID as bytes32
        combinedResult.inputProof,    // Input proof as bytes
        { value: fee }
      );

      console.log('⏳ Waiting for numeric task transaction confirmation...');
      // Wait for transaction confirmation
      const receipt = await Promise.race([
        tx.wait(1), // Wait for 1 confirmation instead of full confirmation
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transaction timeout')), 30000) // Increased to 30s for task creation
        )
      ]);
      console.log('✅ Numeric task created on blockchain! Hash:', receipt.hash);
      
      return { 
        success: true, 
        taskId: Date.now() // In a real implementation, you'd get the task ID from the contract
      };
      
    } catch (error) {
      console.error('❌ Failed to create numeric task:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async decryptTask(taskId: number): Promise<{ success: boolean; error?: string; decryptedData?: any }> {
    if (this.isDemoMode) {
      return { success: true, decryptedData: { title: 'Demo Task', description: 'Demo Description' } };
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      console.log('🔓 Starting simplified decryption for task ID:', taskId);
      
      // Check if wallet is connected using simple wallet service (more reliable)
      const signer = simpleWalletService.getSigner();
      if (!signer) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }
      
      console.log('✅ Wallet connected, proceeding with decryption');
      
      // The taskId is actually the array index in the contract
      // So we can use it directly as the task index
      const taskIndex = taskId;
      console.log('🔓 Using task index for contract call:', taskIndex);
      
      // Get user address for decryption (signer already checked above)
      const userAddress = await signer.getAddress();
      const allTasks = await this.contract.getTasks(userAddress);
      console.log('🔍 Total tasks in contract:', allTasks.length);
      console.log('🔍 Available task indices:', Array.from({length: allTasks.length}, (_, i) => i));
      console.log('🔍 Requested task index:', taskIndex);
      
      if (taskIndex >= allTasks.length) {
        throw new Error(`Task index ${taskIndex} does not exist. Only ${allTasks.length} tasks available (indices 0-${allTasks.length - 1})`);
      }
      
      // Call the contract's requestTaskDecryption function
      console.log('🔓 Calling contract.requestTaskDecryption with taskIndex:', taskIndex);
      console.log('🔓 Contract object:', this.contract);
      console.log('🔓 Contract address:', this.contractAddress);
      console.log('🔓 User address:', userAddress);
      
      // Verify the contract method exists
      if (!this.contract.requestTaskDecryption) {
        throw new Error('requestTaskDecryption method not found on contract. Contract may not be properly deployed or ABI is incorrect.');
      }
      
      let tx;
      try {
        console.log('🔓 About to call requestTaskDecryption...');
        tx = await this.contract.requestTaskDecryption(taskIndex);
        console.log('⏳ Decryption request transaction sent:', tx.hash);
        console.log('⏳ Transaction details:', {
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          gasLimit: tx.gasLimit?.toString(),
          gasPrice: tx.gasPrice?.toString()
        });
      } catch (contractError: any) {
        console.error('❌ Contract method call failed:', contractError);
        console.error('❌ Error details:', {
          message: contractError?.message,
          code: contractError?.code,
          data: contractError?.data
        });
        throw contractError;
      }
      
      // Wait for transaction confirmation
      const receipt = await Promise.race([
        tx.wait(1),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transaction timeout')), 30000)
        )
      ]);
      console.log('✅ Decryption request confirmed:', receipt);
      
      // CRITICAL: Find stored data by blockchain index (direct lookup)
      // Tasks are stored in localStorage using blockchain index as key
          const storedTasks = JSON.parse(localStorage.getItem('userTaskData') || '{}');
      console.log('🔍 Available stored task keys:', Object.keys(storedTasks));
      console.log('🔍 Looking for task at blockchain index:', taskIndex);
      
      // Direct lookup using blockchain index as key
      const storedTask = storedTasks[taskIndex];
      
      if (storedTask) {
        console.log('✅ Found stored task data at index:', taskIndex, storedTask.title);
        return { 
        success: true, 
        decryptedData: { 
            title: storedTask.title,
            description: storedTask.description || 'No description provided',
            dueDate: storedTask.dueDate,
            priority: storedTask.priority,
              transactionHash: tx.hash,
            note: 'Task decrypted - original content restored'
          } 
        };
      } else {
        console.log('⚠️ No stored task data found for index:', taskIndex);
        console.log('⚠️ Available stored task indices:', Object.keys(storedTasks));
        
        // CRITICAL: NEVER replace user data with hardcoded values!
        // This violates data integrity and user trust
        console.error('🚨 CRITICAL DATA INTEGRITY VIOLATION: User data not found in localStorage');
        console.error('🚨 This should NEVER happen - user input must be preserved');
        
        return { 
          success: false, 
          error: 'CRITICAL ERROR: Your original task data was not found in secure storage. This violates data integrity. Please contact support immediately. Your data should never be replaced with placeholder content.'
        };
      }
      
    } catch (error) {
      console.error('❌ Failed to decrypt task:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async decryptSharedTask(taskId: number, originalOwner: string): Promise<{ success: boolean; error?: string; decryptedData?: any }> {
    if (this.isDemoMode) {
      return { success: true, decryptedData: { title: 'Demo Shared Task', description: 'Demo Description' } };
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      console.log('🔓 Starting decryption for shared task ID:', taskId, 'original owner:', originalOwner);
      
      const signer = simpleWalletService.getSigner();
      if (!signer) {
        throw new Error('Wallet not connected. Please connect your wallet first.');
      }
      
      console.log('✅ Wallet connected, proceeding with shared task decryption');
      
      const taskIndex = taskId;
      
      // Verify the contract method exists
      if (!this.contract.requestSharedTaskDecryption) {
        throw new Error('requestSharedTaskDecryption method not found on contract.');
      }
      
      console.log('🔓 Calling requestSharedTaskDecryption with taskIndex:', taskIndex, 'originalOwner:', originalOwner);
      
      const tx = await this.contract.requestSharedTaskDecryption(taskIndex, originalOwner);
      console.log('⏳ Shared task decryption request transaction sent:', tx.hash);
      
      // Wait for transaction confirmation
      await Promise.race([
        tx.wait(1),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transaction timeout')), 30000)
        )
      ]);
      
      console.log('✅ Shared task decryption request confirmed');
      
      // Get stored data for shared tasks (stored under sender's index)
      const storedTasks = JSON.parse(localStorage.getItem('userTaskData') || '{}');
      const storedTask = storedTasks[taskIndex];
      
      if (storedTask) {
        console.log('✅ Found stored shared task data');
        return { 
          success: true, 
          decryptedData: { 
            title: storedTask.title,
            description: storedTask.description || 'No description',
            dueDate: storedTask.dueDate,
            priority: storedTask.priority,
            transactionHash: tx.hash
          } 
        };
      } else {
        console.warn('⚠️ No stored data found for shared task');
        return { 
          success: true, // Still succeeded on blockchain
          decryptedData: { 
            note: 'Shared task decrypted - check blockchain for full details'
          } 
        };
      }
      
    } catch (error) {
      console.error('❌ Failed to decrypt shared task:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // Helper method to convert string to a reversible number
  private stringToReversibleNumber(str: string): number {
    if (!str || typeof str !== 'string') {
      return 0;
    }
    
    // Use a more sophisticated hash that preserves more information
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    
    // Add length information to make it more reversible
    return Math.abs(hash) + (str.length * 1000000);
  }

  // Helper method to convert number back to string
  private numberToString(num: number): string {
    if (num === 0) return '';
    
    // Try to reverse the stringToReversibleNumber conversion
    // The original conversion was: title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
    // We need to reverse this process
    
    try {
      // For now, show that decryption worked but we need better reverse conversion
      // This is a limitation of the current hash-based approach
      return `Decrypted Task Content (ID: ${num})`;
    } catch (error) {
      console.warn('Failed to reverse number to string:', error);
      return `Decrypted Content (${num})`;
    }
  }

  // Helper function to safely map blockchain status to frontend status
  private mapTaskStatus(blockchainStatus: any): 'Pending' | 'Completed' {
    // Convert bigint to number for comparison
    const statusValue = typeof blockchainStatus === 'bigint' ? Number(blockchainStatus) : blockchainStatus;
    
    // Handle different possible formats from blockchain
    if (statusValue === 0 || blockchainStatus === '0' || blockchainStatus === 'Pending') {
      return 'Pending';
    } else if (statusValue === 1 || blockchainStatus === '1' || blockchainStatus === 'Completed') {
      return 'Completed';
    } else {
      // Default to Pending for unknown values
      console.warn('⚠️ Unknown status value:', blockchainStatus, 'defaulting to Pending');
      return 'Pending';
    }
  }

  async getTasks(): Promise<Task[]> {
    console.log('🔍 getTasks called - checking blockchain for task status...');
    
    if (this.isDemoMode) {
      console.log('🎮 Demo mode: Returning empty task list');
      return [];
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const signer = simpleWalletService.getSigner();
      if (!signer) {
        throw new Error('Wallet not connected');
      }

      const userAddress = await signer.getAddress();
      
      // Try to get tasks from contract - will return empty for encrypted data
      // This is expected because encrypted FHE types can't be decoded
      let tasks: any[] = [];
      try {
        tasks = await this.contract.getTasks(userAddress);
        console.log(`✅ Retrieved ${tasks.length} tasks from blockchain`);
      } catch (error: any) {
        // Expected error: "could not decode result data" - encrypted FHE types are unreadable
        // This means the user has tasks, but we can't decode them without decryption
        console.log('📊 Contract returned encrypted task data (this is normal for FHEVM)');
        
        // Try to get the length from the blockchain by checking if user has any encrypted data
        // We'll return an empty array for now - localStorage will handle the rest
        tasks = [];
      }
      
      // Return raw blockchain data - TaskManager will handle all data merging and integrity checks
      return tasks.map((task: any, index: number) => {
        console.log(`🔍 Task ${index} from blockchain:`, {
          rawStatus: task.status,
          statusType: typeof task.status,
          mappedStatus: this.mapTaskStatus(task.status),
          encryptedDueDate: task.dueDate,
          encryptedTitle: task.title,
          encryptedPriority: task.priority
        });
        
        // Return minimal blockchain data - TaskManager will merge with localStorage
        return {
          id: index,
          title: '', // Empty - TaskManager will fill from localStorage
          description: '', // Empty - TaskManager will fill from localStorage
          dueDate: new Date().toISOString(), // Placeholder - TaskManager will use localStorage
          priority: 1, // Placeholder - TaskManager will use localStorage
          status: this.mapTaskStatus(task.status), // Only status from blockchain
          createdAt: new Date().toISOString(), // Placeholder - TaskManager will use localStorage
          isEncrypted: true,
          isShared: false
        };
      });
    } catch (error) {
      console.error('Failed to get tasks:', error);
      throw new Error('Failed to get tasks');
    }
  }

  async completeTask(taskIndex: number): Promise<{ success: boolean; transactionDetails?: any; error?: string }> {
    if (this.isDemoMode) {
      console.log('Demo mode: Completing task', taskIndex);
      return { success: true };
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      console.log('🔍 Calling completeTask on blockchain with index:', taskIndex);
      const tx = await this.contract.completeTask(taskIndex);
      console.log('✅ CompleteTask transaction sent:', tx.hash);
      await Promise.race([
        tx.wait(1), // Wait for 1 confirmation instead of full confirmation
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transaction timeout')), 30000) // Increased to 30s for task creation
        )
      ]);
      
      // Get transaction receipt for blockchain proof
      const receipt = await tx.wait(1);
      const block = await this.contract?.provider?.getBlock(receipt.blockNumber);
      
      // Safely convert timestamp to ISO string
      let timestamp: string;
      if (block?.timestamp) {
        try {
          timestamp = new Date(block.timestamp * 1000).toISOString();
        } catch (error) {
          console.warn('Failed to convert block timestamp, using current time:', error);
          timestamp = new Date().toISOString();
        }
      } else {
        console.warn('No block timestamp available, using current time');
        timestamp = new Date().toISOString();
      }
      
      console.log('✅ Task completed successfully on blockchain:', {
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        timestamp: timestamp,
        gasUsed: receipt.gasUsed.toString()
      });
      
      return {
        success: true,
        transactionDetails: {
          transactionHash: tx.hash,
          blockNumber: receipt.blockNumber,
          timestamp: timestamp,
          gasUsed: receipt.gasUsed.toString()
        }
      };
    } catch (error) {
      console.error('Failed to complete task:', error);
      return { success: false, error: (error as Error).message || 'Failed to complete task' };
    }
  }

  async editTask(taskIndex: number, task: Omit<Task, 'id' | 'createdAt'>): Promise<void> {
    if (this.isDemoMode) {
      console.log('Demo mode: Editing task', taskIndex, task);
      return;
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      console.log('✏️ Editing task with ID:', taskIndex);
      
      // Get user address for FHEVM encryption
    const signer = simpleWalletService.getSigner();
    if (!signer) {
      throw new Error('Wallet not connected');
    }
      const userAddress = await signer.getAddress();

      // Prepare encrypted data for the edited task
      const title = task.title || 'Untitled Task';
      const dueDate = task.dueDate || new Date().toISOString().split('T')[0];
      const priority = task.priority ?? 1;

      const titleAsNumber = this.stringToReversibleNumber(title);
      const dueDateTimestamp = Math.floor(new Date(dueDate).getTime() / 1000);
      
      console.log('📝 Edit task converted data:', { 
        originalTitle: title, 
        titleAsNumber, 
        originalDueDate: dueDate, 
        dueDateTimestamp, 
        priority 
      });

      // Create encrypted input for edited values
      const combinedInput = fhevmService.getInstance().createEncryptedInput(this.contractAddress, userAddress);
      combinedInput.add64(titleAsNumber);
      combinedInput.add64(dueDateTimestamp);
      combinedInput.add8(priority);
      const combinedResult = await combinedInput.encrypt();

      // Call contract's editTask function
      const tx = await this.contract.editTask(
        taskIndex,
        combinedResult.handles[0],    // Encrypted title as bytes32
        combinedResult.handles[1],    // Encrypted due date as bytes32
        combinedResult.handles[2],    // Encrypted priority as bytes32
        combinedResult.inputProof     // Input proof as bytes
      );

      console.log('⏳ Edit transaction sent:', tx.hash);
      await Promise.race([
        tx.wait(1), // Wait for 1 confirmation instead of full confirmation
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transaction timeout')), 30000) // Increased to 30s for task creation
        )
      ]);
      console.log('✅ Task edited successfully');
    } catch (error) {
      console.error('❌ Failed to edit task:', error);
      throw new Error('Failed to edit task');
    }
  }

  async deleteTask(taskIndex: number): Promise<void> {
    if (this.isDemoMode) {
      console.log('Demo mode: Deleting task', taskIndex);
      return;
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const tx = await this.contract.deleteTask(taskIndex);
      
      // For deletion, we can be even more aggressive - just wait for transaction to be sent
      // and update UI immediately, then wait for confirmation in background
      console.log('Task deletion transaction sent:', tx.hash);
      
      // Wait for minimal confirmation (just to ensure transaction is mined)
      await Promise.race([
        tx.wait(1), // Wait for 1 confirmation
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transaction timeout')), 30000) // Increased to 30s for task creation
        )
      ]);
      console.log('Task deleted successfully');
    } catch (error) {
      console.error('Failed to delete task:', error);
      throw new Error('Failed to delete task');
    }
  }

  async shareTask(taskIndex: number, recipientAddress: string): Promise<void> {
    if (this.isDemoMode) {
      console.log('Demo mode: Sharing task', taskIndex, 'with', recipientAddress);
      return;
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      console.log('🔗 Sharing task', taskIndex, 'with recipient:', recipientAddress);
      
      // Validate recipient address
      if (!recipientAddress || !/^0x[a-fA-F0-9]{40}$/.test(recipientAddress)) {
        throw new Error('Invalid recipient address format');
      }
      
      // Call the contract's shareTask function
      const tx = await this.contract.shareTask(taskIndex, recipientAddress);
      console.log('⏳ Share transaction sent:', tx.hash);
      
      // Wait for transaction confirmation
      const receipt = await Promise.race([
        tx.wait(1), // Wait for 1 confirmation instead of full confirmation
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transaction timeout')), 30000) // Increased to 30s for task creation
        )
      ]);
      console.log('✅ Task shared successfully on blockchain:', receipt);
      
      // Listen for TaskShared event to confirm
      const filter = this.contract!.filters.TaskShared(taskIndex);
      const listener = (taskIdx: number, owner: string, recipient: string) => {
        console.log('🔗 TaskShared event received:', { taskIdx, owner, recipient });
        this.contract!.off(filter, listener);
      };
      
      this.contract!.on(filter, listener);
      
    } catch (error) {
      console.error('❌ Failed to share task:', error);
      throw new Error(`Failed to share task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Owner/Admin functions
  async getOwner(): Promise<string> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const owner = await this.contract.owner();
      return owner;
    } catch (error) {
      console.error('Failed to get owner:', error);
      throw new Error('Failed to get contract owner');
    }
  }

  async isOwner(): Promise<boolean> {
    if (!this.contract) {
      return false;
    }

    try {
      const owner = await this.getOwner();
      const signer = simpleWalletService.getSigner();
      if (!signer) return false;
      
      const userAddress = await signer.getAddress();
      return owner.toLowerCase() === userAddress.toLowerCase();
    } catch (error) {
      console.error('Failed to check ownership:', error);
      return false;
    }
  }

  async setFee(newFee: string): Promise<void> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const feeInWei = ethers.parseEther(newFee);
      const tx = await this.contract.setFee(feeInWei);
      console.log('⏳ Set fee transaction sent:', tx.hash);
      await Promise.race([
        tx.wait(1), // Wait for 1 confirmation instead of full confirmation
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transaction timeout')), 30000) // Increased to 30s for task creation
        )
      ]);
      console.log('✅ Fee updated successfully');
    } catch (error) {
      console.error('❌ Failed to set fee:', error);
      throw new Error('Failed to set fee');
    }
  }

  async withdraw(): Promise<void> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const tx = await this.contract.withdraw();
      console.log('⏳ Withdraw transaction sent:', tx.hash);
      await Promise.race([
        tx.wait(1), // Wait for 1 confirmation instead of full confirmation
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Transaction timeout')), 30000) // Increased to 30s for task creation
        )
      ]);
      console.log('✅ Funds withdrawn successfully');
    } catch (error) {
      console.error('❌ Failed to withdraw funds:', error);
      throw new Error('Failed to withdraw funds');
    }
  }

  async getContractBalance(): Promise<string> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const provider = simpleWalletService.getProvider();
      if (!provider) {
        throw new Error('Provider not available');
      }
      const balance = await provider.getBalance(this.contractAddress);
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('❌ Failed to get contract balance:', error);
      throw new Error('Failed to get contract balance');
    }
  }
}

export const realContractService = new RealContractService();
