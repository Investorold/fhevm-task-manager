import { ethers } from 'ethers';
import { simpleWalletService } from './simpleWalletService';
// import { productionWalletService } from './productionWalletService';
import { fhevmService } from './fhevmService';
import type { Task } from '../types';

// EXACT ABI from your TaskManager.sol contract
const TASK_MANAGER_ABI = [
  // Core task functions
  "function createTask(externalEuint64 encryptedTitle, externalEuint64 encryptedDueDate, externalEuint8 encryptedPriority, bytes calldata inputProof) external payable",
  "function createTaskWithText(externalEuint64 encryptedTitle, externalEuint64 encryptedDescription, externalEuint64 encryptedDueDate, externalEuint8 encryptedPriority, bytes calldata inputProof) external payable",
  "function createTaskWithNumbers(externalEuint64 encryptedTitle, externalEuint64 encryptedDueDate, externalEuint8 encryptedPriority, externalEuint64 encryptedNumericId, bytes calldata inputProof) external payable",
  "function getTasks(address user) external view returns (tuple(euint64 title, euint64 dueDate, euint8 priority, uint8 status)[] memory)",
  "function completeTask(uint256 taskIndex) external",
  "function deleteTask(uint256 taskIndex) external",
  "function editTask(uint256 taskIndex, externalEuint64 newEncryptedTitle, externalEuint64 newEncryptedDueDate, externalEuint8 newEncryptedPriority, bytes calldata inputProof) external",
  "function shareTask(uint256 taskIndex, address recipient) external",
  
  // NEW: Shared task functions
  "function getSharedTasks(address user) external view returns (uint256[] memory)",
  "function getSharedTaskCount(address user) external view returns (uint256)",
  "function getTaskOwner(uint256 taskIndex) external view returns (address)",
  
  // NEW: Decryption functions
  "function requestTaskDecryption(uint256 taskIndex) external",
  "function taskDecryptionCallback(uint256 requestId, bytes memory cleartexts, bytes memory decryptionProof) external",
  
  // Fee and admin functions
  "function taskCreationFee() external view returns (uint256)",
  "function setFee(uint256 _newFee) external",
  "function withdraw() external",
  
  // Due soon count functions
  "function requestTasksDueSoonCount(externalEuint64 encryptedTimeMargin, bytes calldata inputProof) external",
  "function callbackCount(uint256 requestId, bytes memory cleartexts, bytes memory decryptionProof) external",
  "function lastDueSoonCount(address user) external view returns (uint32)",
  
  // Events
  "event DecryptionRequested(uint256 requestId, address indexed initiator)",
  "event TaskDecrypted(uint256 indexed requestId, address indexed user, uint64 title, uint64 description, uint64 dueDate, uint8 priority, uint64 numericId)",
  "event TaskShared(uint256 indexed taskIndex, address indexed owner, address indexed recipient)",
  "event Debug(string message, uint256 value)"
];

class RealContractService {
  private contract: ethers.Contract | null = null;
  private contractAddress = "";
  private isDemoMode = false; // Use real contract - we need FHEVM
  // private eventListeners: Map<string, () => void> = new Map(); // Track active listeners

  async initialize(contractAddress: string): Promise<void> {
    console.log('🚀 Initializing RealContractService with address:', contractAddress);
    console.log('🔍 Wallet connected:', simpleWalletService.isWalletConnected());
    console.log('🔍 Wallet address:', simpleWalletService.getAddress());
    
    // Check if demo mode
    if (contractAddress === 'DEMO_MODE') {
      this.isDemoMode = true;
      this.contractAddress = contractAddress;
      console.log('Running in demo mode - no contract connection needed');
      return;
    }
    
    // Production mode - connect to real contract
    this.contractAddress = contractAddress;
    const provider = simpleWalletService.getProvider();
    const signer = simpleWalletService.getSigner();
    
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
    console.log('✅ Connected to REAL TaskManager contract:', this.contractAddress);
    console.log('🔍 Contract methods after initialization:', Object.keys(this.contract));
    console.log('🔍 Contract interface methods:', this.contract.interface.fragments.map(f => f.type));
    console.log('🔍 ABI length:', TASK_MANAGER_ABI.length);
    console.log('🔍 Provider:', !!provider);
    console.log('🔍 Signer:', !!signer);
    
    // Test if we can call a simple method
    try {
      console.log('🧪 Testing contract connection...');
      const fee = await this.contract.taskCreationFee();
      console.log('✅ Contract test successful! Task creation fee:', fee.toString());
    } catch (error) {
      console.error('❌ Contract test failed:', error);
    }
  }

  async createTaskWithText(task: Omit<Task, 'id' | 'createdAt'>): Promise<void> {
    console.log('🚀🚀🚀 createTaskWithText called with:', task);
    console.log('🚀🚀🚀 Current contract address:', this.contractAddress);
    
    if (this.isDemoMode) {
      console.log('Demo mode: Creating text task', task);
      return;
    }

    if (!this.contract) {
      console.error('❌ Contract not initialized');
      throw new Error('Contract not initialized');
    }

    // FHEVM is now properly configured with SepoliaConfig
    if (!fhevmService.isReady()) {
      console.warn('⚠️ FHEVM not ready, initializing...');
      await fhevmService.initialize();
    }

    try {
      console.log('🔒 Preparing text task data for blockchain...');
      
      // Validate task data
      const title = task.title || 'Untitled Task';
      const description = task.description || 'No description';
      const dueDate = task.dueDate || new Date().toISOString().split('T')[0];
      const priority = task.priority ?? 1;
      
      console.log('📝 Text task data to encrypt:', { title, description, dueDate, priority });
      
      // Encrypt using REAL FHEVM
      console.log('🔐 Encrypting text task data with FHEVM...');
      
      const encryptedTitle = await fhevmService.encryptString(title, this.contractAddress);
      const encryptedDescription = await fhevmService.encryptString(description, this.contractAddress);
      const dueDateTimestamp = Math.floor(new Date(dueDate).getTime() / 1000);
      const encryptedDueDate = await fhevmService.encryptNumber(dueDateTimestamp, 'euint64', this.contractAddress);
      const encryptedPriority = await fhevmService.encryptNumber(priority, 'euint8', this.contractAddress);
      
      console.log('✅ All text data encrypted successfully!');

      console.log('💰 Getting task creation fee...');
      const fee = await this.contract.taskCreationFee();
      
      console.log('📤 Sending encrypted text task to blockchain...');
      
      // Use the proper createTaskWithText function
      const tx = await this.contract.createTaskWithText(
        encryptedTitle,         // Encrypted title
        encryptedDescription,    // Encrypted description
        encryptedDueDate,        // Encrypted due date
        encryptedPriority,       // Encrypted priority
        '0x',                    // Proof (FHEVM handles this internally)
        { value: fee }
      );

      console.log('⏳ Waiting for transaction confirmation...');
      const receipt = await tx.wait();
      console.log('✅ Text task created on blockchain!');
      console.log('📋 Transaction hash:', receipt.hash);
      console.log('📋 Block number:', receipt.blockNumber);
      
    } catch (error) {
      console.error('❌ Failed to create text task:', error);
      throw new Error(`Failed to create text task on blockchain: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createTaskWithNumbers(task: Omit<Task, 'id' | 'createdAt'> & { numericId: number }): Promise<void> {
    console.log('🚀🚀🚀 createTaskWithNumbers called with:', task);
    console.log('🚀🚀🚀 Current contract address:', this.contractAddress);
    
    if (this.isDemoMode) {
      console.log('Demo mode: Creating numeric task', task);
      return;
    }

    if (!this.contract) {
      console.error('❌ Contract not initialized');
      throw new Error('Contract not initialized');
    }

    // FHEVM is now properly configured with SepoliaConfig
    if (!fhevmService.isReady()) {
      console.warn('⚠️ FHEVM not ready, initializing...');
      await fhevmService.initialize();
    }

    try {
      console.log('🔒 Preparing numeric task data for blockchain...');
      
      // Validate task data
      const title = task.title || 'Untitled Task';
      const dueDate = task.dueDate || new Date().toISOString().split('T')[0];
      const priority = task.priority ?? 1;
      const numericId = task.numericId ?? 0;
      
      console.log('📝 Numeric task data to encrypt:', { title, dueDate, priority, numericId });
      
      // Encrypt using REAL FHEVM
      console.log('🔐 Encrypting numeric task data with FHEVM...');
      
      const encryptedTitle = await fhevmService.encryptString(title, this.contractAddress);
      const dueDateTimestamp = Math.floor(new Date(dueDate).getTime() / 1000);
      const encryptedDueDate = await fhevmService.encryptNumber(dueDateTimestamp, 'euint64', this.contractAddress);
      const encryptedPriority = await fhevmService.encryptNumber(priority, 'euint8', this.contractAddress);
      const encryptedNumericId = await fhevmService.encryptNumber(numericId, 'euint64', this.contractAddress);
      
      console.log('✅ All numeric data encrypted successfully!');

      console.log('💰 Getting task creation fee...');
      const fee = await this.contract.taskCreationFee();
      
      console.log('📤 Sending encrypted numeric task to blockchain...');
      
      const tx = await this.contract.createTaskWithNumbers(
        encryptedTitle,         // Encrypted title
        encryptedDueDate,       // Encrypted due date
        encryptedPriority,      // Encrypted priority
        encryptedNumericId,    // Encrypted numeric ID
        '0x',                   // Proof (FHEVM handles this internally)
        { value: fee }
      );

      console.log('⏳ Waiting for transaction confirmation...');
      const receipt = await tx.wait();
      console.log('✅ Numeric task created on blockchain!');
      console.log('📋 Transaction hash:', receipt.hash);
      console.log('📋 Block number:', receipt.blockNumber);
      
    } catch (error) {
      console.error('❌ Failed to create numeric task:', error);
      throw new Error(`Failed to create numeric task on blockchain: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<void> {
    console.log('🚀🚀🚀 createTask called with:', task);
    console.log('🚀🚀🚀 Current contract address:', this.contractAddress);
    console.log('🚀🚀🚀 Contract address type:', typeof this.contractAddress);
    console.log('🚀🚀🚀 Contract address length:', this.contractAddress?.length);
    console.log('🚀🚀🚀 Contract address starts with 0x:', this.contractAddress?.startsWith('0x'));
    
      // Ensure we have a valid contract address
      if (!this.contractAddress || this.contractAddress === '' || this.contractAddress === 'DEMO_MODE') {
        this.contractAddress = '0x30182D50035E926e5Ab728561070e1ba2c14B2A1';
        console.log('🔧 Set contract address to:', this.contractAddress);
      }
      
      // Convert to checksummed address for better compatibility
      try {
        this.contractAddress = ethers.getAddress(this.contractAddress);
        console.log('🔧 Checksummed contract address:', this.contractAddress);
      } catch (error) {
        console.error('❌ Invalid contract address:', this.contractAddress);
        throw new Error('Invalid contract address format');
      }
      
      // Validate contract address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(this.contractAddress)) {
        console.error('❌ Invalid contract address format:', this.contractAddress);
        throw new Error('Invalid contract address format');
      }
    console.log('🔍 Contract service state:', {
      isDemoMode: this.isDemoMode,
      contractAddress: this.contractAddress,
      hasContract: !!this.contract,
      contractMethods: this.contract ? Object.keys(this.contract) : 'No contract'
    });
    
    if (this.isDemoMode) {
      console.log('Demo mode: Creating task', task);
      return;
    }

    if (!this.contract) {
      console.error('❌ Contract not initialized');
      throw new Error('Contract not initialized');
    }

    // FHEVM is now properly configured with SepoliaConfig
    if (!fhevmService.isReady()) {
      console.warn('⚠️ FHEVM not ready, initializing...');
      await fhevmService.initialize();
    }

    try {
      console.log('🔒 Preparing task data for blockchain...');
      
      // const signer = simpleWalletService.getSigner();
      // const userAddress = await signer.getAddress();
      
      console.log('📝 Received task object:', task);
      console.log('📝 Task title:', task.title, 'type:', typeof task.title);
      console.log('📝 Task dueDate:', task.dueDate, 'type:', typeof task.dueDate);
      console.log('📝 Task priority:', task.priority, 'type:', typeof task.priority);
      
      // Validate task data
      const title = task.title || 'Untitled Task';
      const dueDate = task.dueDate || new Date().toISOString().split('T')[0];
      const priority = task.priority ?? 1;
      
      console.log('📝 Task data to encrypt:', { title, dueDate, priority });
      
      // Encrypt using REAL FHEVM
      console.log('🔐 Encrypting task data with FHEVM...');
      console.log('📍 Contract address for encryption:', this.contractAddress);
      console.log('📍 Contract address type:', typeof this.contractAddress);
      console.log('📍 Contract address length:', this.contractAddress?.length);
      console.log('📍 Contract address starts with 0x:', this.contractAddress?.startsWith('0x'));
      
      if (!this.contractAddress || this.contractAddress === '0x0000000000000000000000000000000000000000') {
        console.error('❌ Contract address validation failed:', {
          address: this.contractAddress,
          isEmpty: !this.contractAddress,
          isZeroAddress: this.contractAddress === '0x0000000000000000000000000000000000000000'
        });
        throw new Error('Contract address is not set or invalid');
      }
      
      // Use contract address for proper on-chain encryption
      console.log('🔐 Using contract address for on-chain encryption:', this.contractAddress);
      
      const encryptedTitle = await fhevmService.encryptString(title, this.contractAddress);
      const dueDateTimestamp = Math.floor(new Date(dueDate).getTime() / 1000);
      const encryptedDueDate = await fhevmService.encryptNumber(dueDateTimestamp, 'euint64', this.contractAddress);
      const encryptedPriority = await fhevmService.encryptNumber(priority, 'euint8', this.contractAddress);
      
      console.log('✅ All data encrypted successfully!');
      console.log('Encrypted title:', encryptedTitle);
      console.log('Encrypted due date:', encryptedDueDate);
      console.log('Encrypted priority:', encryptedPriority);

      console.log('💰 Getting task creation fee...');
      const fee = await this.contract.taskCreationFee();
      
      console.log('📤 Sending encrypted task to blockchain...');
      console.log('🔍 Available contract methods:', Object.keys(this.contract));
      console.log('🔍 Contract address:', this.contractAddress);
      console.log('🔍 Contract object:', this.contract);
      
      if (!this.contract.createTask) {
        throw new Error(`createTask method not found on contract. Available methods: ${Object.keys(this.contract).join(', ')}`);
      }
      
      const tx = await this.contract.createTask(
        encryptedTitle,         // Encrypted title
        encryptedDueDate,       // Encrypted due date
        encryptedPriority,      // Encrypted priority
        '0x',                   // Proof (FHEVM handles this internally)
        { value: fee }
      );

      console.log('⏳ Waiting for transaction confirmation...');
      const receipt = await tx.wait();
      console.log('✅ Task created on blockchain!');
      console.log('📋 Transaction hash:', receipt.hash);
      console.log('📋 Block number:', receipt.blockNumber);
      
    } catch (error) {
      console.error('❌ Failed to create task:', error);
      throw new Error(`Failed to create task on blockchain: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTasks(): Promise<Task[]> {
    if (this.isDemoMode) {
      // Return demo tasks
      return [
        {
          id: 1,
          title: "Welcome to Production Mode",
          description: "This task is stored on the blockchain with FHEVM encryption",
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 2,
          status: 'Pending',
          createdAt: new Date().toISOString(),
        }
      ];
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    const signer = simpleWalletService.getSigner();
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const userAddress = await signer.getAddress();
      console.log('📋 Fetching tasks for address:', userAddress);
      
      // The contract doesn't expose a getTasks method since tasks are stored in a private mapping
      // For now, we'll return an empty array and let users create tasks
      // In a real implementation, you might need to track task creation events or use a different approach
      console.log('ℹ️ Contract uses private mapping for tasks - no direct access available');
      console.log('ℹ️ Users can create tasks which will be stored on-chain');
      console.log('ℹ️ To view tasks, users need to decrypt them individually using requestTaskDecryption');
      
      return []; // Return empty array since we can't directly access the private mapping
      
    } catch (error) {
      console.error('❌ Failed to get tasks:', error);
      throw new Error(`Failed to retrieve tasks from blockchain: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async completeTask(taskId: number): Promise<void> {
    if (this.isDemoMode) {
      console.log('Demo mode: Completing task', taskId);
      return;
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      console.log('✅ Completing task on blockchain...');
      const tx = await this.contract.completeTask(taskId - 1); // Convert to 0-based index
      await tx.wait();
      console.log('✅ Task completed on blockchain! Hash:', tx.hash);
    } catch (error) {
      console.error('❌ Failed to complete task:', error);
      throw new Error(`Failed to complete task on blockchain: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteTask(taskId: number): Promise<void> {
    if (this.isDemoMode) {
      console.log('Demo mode: Deleting task', taskId);
      return;
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      console.log('🗑️ Deleting task from blockchain...');
      const tx = await this.contract.deleteTask(taskId - 1); // Convert to 0-based index
      await tx.wait();
      console.log('✅ Task deleted from blockchain! Hash:', tx.hash);
    } catch (error) {
      console.error('❌ Failed to delete task:', error);
      throw new Error(`Failed to delete task from blockchain: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async editTask(taskId: number, task: Omit<Task, 'id' | 'createdAt'>): Promise<void> {
    if (this.isDemoMode) {
      console.log('Demo mode: Editing task', taskId, task);
      return;
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    // FHEVM is now properly configured with SepoliaConfig
    if (!fhevmService.isReady()) {
      console.warn('⚠️ FHEVM not ready, initializing...');
      await fhevmService.initialize();
    }

    try {
      console.log('✏️ Encrypting updated task data...');
      
      // Encrypt updated task data using REAL FHEVM
      const encryptedTitle = await fhevmService.encryptString(task.title, this.contractAddress);
      const dueDateTimestamp = Math.floor(new Date(task.dueDate).getTime() / 1000);
      const encryptedDueDate = await fhevmService.encryptNumber(dueDateTimestamp, 'euint64', this.contractAddress);
      const encryptedPriority = await fhevmService.encryptNumber(task.priority, 'euint8', this.contractAddress);

      console.log('📝 Updating task on blockchain...');
      const tx = await this.contract.editTask(
        taskId - 1, // Convert to 0-based index
        encryptedTitle,
        encryptedDueDate,
        encryptedPriority,
        '0x' // Empty proof for now
      );

      await tx.wait();
      console.log('✅ Task edited on blockchain! Hash:', tx.hash);
    } catch (error) {
      console.error('❌ Failed to edit task:', error);
      throw new Error(`Failed to edit task on blockchain: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async shareTask(taskId: number, recipientAddress: string): Promise<void> {
    if (this.isDemoMode) {
      console.log('Demo mode: Sharing task', taskId, 'with', recipientAddress);
      return;
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      console.log('🤝 Sharing task on blockchain...');
      const tx = await this.contract.shareTask(taskId - 1, recipientAddress); // Convert to 0-based index
      await tx.wait();
      console.log('✅ Task shared on blockchain! Hash:', tx.hash);
    } catch (error) {
      console.error('❌ Failed to share task:', error);
      throw new Error(`Failed to share task on blockchain: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getTaskCreationFee(): Promise<string> {
    if (this.isDemoMode) {
      return '0.0001'; // Demo fee
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const fee = await this.contract.taskCreationFee();
      return ethers.formatEther(fee);
    } catch (error) {
      console.error('❌ Failed to get task creation fee:', error);
      throw new Error(`Failed to get task creation fee: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async requestTasksDueSoonCount(timeMarginHours: number = 24): Promise<void> {
    if (this.isDemoMode) {
      console.log('Demo mode: Requesting due soon count');
      return;
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    // FHEVM is now properly configured with SepoliaConfig
    if (!fhevmService.isReady()) {
      console.warn('⚠️ FHEVM not ready, initializing...');
      await fhevmService.initialize();
    }

    try {
      console.log('⏰ Encrypting time margin...');
      
      // Convert hours to seconds
      const timeMarginSeconds = timeMarginHours * 3600;

      // Encrypt the time margin using REAL FHEVM
      const encryptedTimeMargin = await fhevmService.encryptNumber(timeMarginSeconds, 'euint64', this.contractAddress);

      console.log('📊 Requesting due soon count on blockchain...');
      // Call the contract function
      const tx = await this.contract.requestTasksDueSoonCount(
        encryptedTimeMargin,
        '0x' // Empty proof for now
      );

      await tx.wait();
      console.log('✅ Due soon count requested on blockchain! Hash:', tx.hash);
    } catch (error) {
      console.error('❌ Failed to request due soon count:', error);
      throw new Error(`Failed to request due soon count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async initializeWithWallet(contractAddress?: string): Promise<void> {
    console.log('🚀 initializeWithWallet called with address:', contractAddress);
    console.log('🔍 Current wallet state:', {
      isConnected: simpleWalletService.isWalletConnected(),
      address: simpleWalletService.getAddress(),
      provider: !!simpleWalletService.getProvider(),
      signer: !!simpleWalletService.getSigner()
    });
    
    // Use provided address or default
    if (contractAddress) {
      this.contractAddress = contractAddress;
    } else {
      // Set default contract address if not provided
      this.contractAddress = '0x30182D50035E926e5Ab728561070e1ba2c14B2A1';
      console.log('🔧 Using default contract address:', this.contractAddress);
    }
    
    const provider = simpleWalletService.getProvider();
    const signer = simpleWalletService.getSigner();
    
    console.log('🔧 Provider:', provider);
    console.log('🔧 Signer:', signer);
    console.log('🔧 Contract address:', this.contractAddress);
    
    if (!provider || !signer) {
      console.log('❌ Wallet not connected - provider or signer missing');
      throw new Error('Wallet not connected');
    }
    
    this.contract = new ethers.Contract(this.contractAddress, TASK_MANAGER_ABI, signer);
    console.log('✅ Connected to REAL TaskManager contract:', this.contractAddress);
    console.log('🔍 Contract methods after initialization:', Object.keys(this.contract));
    console.log('🔍 ABI length:', TASK_MANAGER_ABI.length);
    console.log('🔍 Provider:', !!provider);
    console.log('🔍 Signer:', !!signer);
  }

  isInitialized(): boolean {
    return this.contract !== null || this.isDemoMode;
  }

  async decryptTask(taskId: number): Promise<{ success: boolean; error?: string; decryptedData?: any }> {
    try {
      if (this.isDemoMode) {
        // Demo mode - simulate decryption
        console.log('Demo: Decrypting task', taskId);
        return { success: true };
      }

      if (!this.contract) {
        throw new Error('Contract not initialized');
      }

      console.log('🔓 Starting real FHEVM decryption for task:', taskId);
      
      // Convert taskId to 0-based index (contract uses 0-based indexing)
      const taskIndex = taskId - 1;
      
      // Call the real contract method to request decryption
      const tx = await this.contract.requestTaskDecryption(taskIndex);
      console.log('📤 Decryption request transaction sent:', tx.hash);
      
      // Wait for transaction confirmation
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed:', receipt);
      
      // Listen for the TaskDecrypted event
      const filter = this.contract.filters.TaskDecrypted(null, null);
      const events = await this.contract.queryFilter(filter, receipt.blockNumber, receipt.blockNumber);
      
      if (events.length > 0) {
        const event = events[0];
        console.log('🎉 Task decrypted successfully:', event);
        
        // Type guard to check if it's an EventLog with args
        if ('args' in event && event.args) {
          // Extract decrypted data from the event
          const decryptedData = {
            title: event.args.title.toString(),
            dueDate: new Date(Number(event.args.dueDate) * 1000).toISOString(),
            priority: Number(event.args.priority)
          };
          
          return { 
            success: true, 
            decryptedData 
          };
        } else {
          throw new Error('Event does not contain expected args property');
        }
      } else {
        throw new Error('Decryption event not found - the relayer may not have processed the request yet');
      }
      
    } catch (error) {
      console.error('❌ Contract decryption failed:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  async getLastDueSoonCount(): Promise<number> {
    if (this.isDemoMode) {
      return 2; // Demo count
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    const signer = simpleWalletService.getSigner();
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const userAddress = await signer.getAddress();
      const count = await this.contract.lastDueSoonCount(userAddress);
      return Number(count);
    } catch (error) {
      console.error('❌ Failed to get due soon count:', error);
      throw new Error(`Failed to get due soon count: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getReceivedTasks(): Promise<Task[]> {
    if (this.isDemoMode) {
      // Return demo received tasks
      return [
        {
          id: 1,
          title: "Shared Task from Alice",
          description: "This task was shared with you",
          dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          priority: 2,
          status: 'Pending',
          createdAt: new Date().toISOString(),
          sharedBy: '0x1234567890123456789012345678901234567890'
        }
      ];
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    const signer = simpleWalletService.getSigner();
    if (!signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const userAddress = await signer.getAddress();
      console.log('📋 Fetching received tasks via event listening for address:', userAddress);
      
      // Try to listen for TaskDecrypted events where this user is the recipient
      // This is a workaround since the contract doesn't have a direct way to get shared tasks
      
      try {
        // Get recent blocks to search for events
        const currentBlock = await this.contract.runner?.provider?.getBlockNumber();
        if (!currentBlock) {
          console.log('⚠️ Could not get current block number');
          return [];
        }
        
        // Search last 1000 blocks for TaskDecrypted events
        const fromBlock = Math.max(0, currentBlock - 1000);
        console.log(`🔍 Searching for TaskDecrypted events from block ${fromBlock} to ${currentBlock}`);
        
        // Listen for TaskDecrypted events where the user is the recipient
        const filter = this.contract.filters.TaskDecrypted(null, userAddress);
        const events = await this.contract.queryFilter(filter, fromBlock, currentBlock);
        
        console.log(`📋 Found ${events.length} TaskDecrypted events for user ${userAddress}`);
        
        // Convert events to Task objects
        const receivedTasks: Task[] = events.map((event) => {
          // Type guard to check if it's an EventLog with args
          if ('args' in event && event.args) {
            return {
              id: Number(event.args.requestId) + 10000, // Offset to avoid conflicts with regular tasks
              title: `Shared Task #${event.args.requestId}`,
              description: `Task shared with you (Request ID: ${event.args.requestId})`,
              dueDate: new Date(Number(event.args.dueDate) * 1000).toISOString(),
              priority: Number(event.args.priority),
              status: 'Pending' as const,
              createdAt: new Date().toISOString(),
              sharedBy: event.address // Contract address (we don't have the original owner)
            } as Task;
          }
          return null;
        }).filter((task): task is Task => task !== null);
        
        console.log(`✅ Converted ${receivedTasks.length} events to received tasks`);
        return receivedTasks;
        
      } catch (eventError) {
        console.warn('⚠️ Event listening failed, falling back to empty array:', eventError);
        return [];
      }
      
    } catch (error) {
      console.error('❌ Failed to get received tasks:', error);
      throw new Error(`Failed to retrieve received tasks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async shareTaskWithUser(taskId: number, recipientAddress: string): Promise<void> {
    if (this.isDemoMode) {
      console.log('Demo mode: Sharing task', taskId, 'with', recipientAddress);
      return;
    }

    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      console.log('🤝 Sharing task on blockchain...');
      const tx = await this.contract.shareTask(taskId - 1, recipientAddress); // Convert to 0-based index
      await tx.wait();
      console.log('✅ Task shared on blockchain! Hash:', tx.hash);
    } catch (error) {
      console.error('❌ Failed to share task:', error);
      throw new Error(`Failed to share task: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  isConnected(): boolean {
    return this.contract !== null || this.isDemoMode;
  }

  getContractAddress(): string {
    return this.contractAddress;
  }

  isInDemoMode(): boolean {
    return this.isDemoMode;
  }

}

export const realContractService = new RealContractService();
