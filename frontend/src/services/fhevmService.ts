// Real FHEVM Service using CDN
// import { initSDK, createInstance, SepoliaConfig } from '@zama-fhe/relayer-sdk/bundle';

class FhevmService {
  private instance: any = null;
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('🔒 Initializing FHEVM SDK from CDN...');
      
      // Wait for wallet to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Get the selected provider from the wallet service
      const selectedProvider = (window as any).__selectedProvider || window.ethereum;
      if (!selectedProvider) {
        throw new Error('No Ethereum provider detected');
      }

      console.log('🔧 Using provider:', selectedProvider);

      // Try CDN first, then fallback to npm package
      let initSDK, createInstance, SepoliaConfig;
      try {
        console.log('🔧 Trying CDN import...');
        const cdnModule = await import('https://cdn.zama.ai/relayer-sdk-js/0.2.0/relayer-sdk-js.js');
        ({ initSDK, createInstance, SepoliaConfig } = cdnModule);
        console.log('✅ CDN import successful');
      } catch (cdnError) {
        console.log('⚠️ CDN import failed, trying npm package...');
        const npmModule = await import('@zama-fhe/relayer-sdk/bundle');
        ({ initSDK, createInstance, SepoliaConfig } = npmModule);
        console.log('✅ NPM package import successful');
      }
      
      // Initialize the FHEVM SDK first
      await initSDK();
      console.log('✅ FHEVM SDK WASM loaded from CDN');

      // Use our specific Sepolia configuration with correct contract addresses
      const config = {
        chainId: 11155111, // Sepolia chain ID
        gatewayChainId: 55815,
        relayerUrl: 'https://relayer.testnet.zama.cloud',
        aclContractAddress: '0x687820221192C5B662b25367F70076A37bc79b6c',
        inputVerifierContractAddress: '0xbc91f3daD1A5F19F8390c400196e58073B6a0BC4',
        kmsContractAddress: '0x1364cBBf2cDF5032C47d8226a6f6FBD2AFCDacAC',
        verifyingContractAddressDecryption: '0xb6E160B1ff80D67Bfe90A85eE06Ce0A2613607D1',
        verifyingContractAddressInputVerification: '0x7048C39f048125eDa9d678AEbaDfB22F7900a29F',
        network: selectedProvider,
      };

      console.log('🔧 Creating FHEVM instance with Sepolia config:', {
        chainId: config.chainId,
        gatewayChainId: config.gatewayChainId,
        relayerUrl: config.relayerUrl,
      });

      console.log('🔧 Creating FHEVM instance with config:', config);
      this.instance = await createInstance(config);
      console.log('✅ FHEVM instance created successfully!');
      console.log('✅ Public key available:', !!this.instance.getPublicKey);
      console.log('✅ Instance type:', typeof this.instance);
      console.log('🔍 Available methods:', Object.getOwnPropertyNames(this.instance));
      console.log('🔍 Instance prototype:', Object.getOwnPropertyNames(Object.getPrototypeOf(this.instance)));
      
      // Test if we can get the public key
      try {
        const publicKey = this.instance.getPublicKey();
        console.log('✅ Public key retrieved:', typeof publicKey, publicKey);
        if (typeof publicKey === 'string') {
          console.log('✅ Public key (first 20 chars):', publicKey.substring(0, 20) + '...');
        } else if (publicKey && typeof publicKey === 'object') {
          console.log('✅ Public key is object:', publicKey);
        }
      } catch (pkError) {
        console.error('❌ Failed to get public key:', pkError);
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Failed to initialize FHEVM SDK:', error);
      throw new Error(`Failed to initialize FHEVM SDK: ${error.message}`);
    }
  }

  async encryptString(value: string, contractAddress?: string): Promise<any> {
    if (!this.instance) {
      throw new Error('FHEVM instance not initialized. Please ensure FHEVM is properly set up.');
    }

    try {
      console.log('🔍 FHEVM encryptString called with:', {
        value,
        contractAddress,
        contractAddressType: typeof contractAddress,
        contractAddressLength: contractAddress?.length,
        contractAddressStartsWith0x: contractAddress?.startsWith('0x')
      });
      
      // Convert string to number for FHEVM encryption
      const numericValue = this.stringToNumber(value);
      console.log(`🔐 Encrypting string "${value}" as number:`, numericValue);
      
      // Use the appropriate encryption method based on what's available
      let encrypted;
      
      // Try different encryption methods
      if (this.instance.encrypt64) {
        console.log('🔐 Using encrypt64 method');
        encrypted = await this.instance.encrypt64(numericValue);
      } else if (this.instance.encrypt) {
        console.log('🔐 Using encrypt method');
        encrypted = await this.instance.encrypt(numericValue, 'euint64');
      } else if (this.instance.createEncryptedInput && contractAddress) {
        console.log('🔐 Using createEncryptedInput method with contract address:', contractAddress);
        console.log('🔐 Contract address validation:', {
          address: contractAddress,
          type: typeof contractAddress,
          length: contractAddress?.length,
          startsWith0x: contractAddress?.startsWith('0x'),
          isValidFormat: /^0x[a-fA-F0-9]{40}$/.test(contractAddress)
        });
        
        // Validate contract address before using it
        if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
          throw new Error(`Contract address is not a valid address: ${contractAddress}`);
        }
        
        encrypted = await this.instance.createEncryptedInput(numericValue, 'euint64', contractAddress);
      } else {
        throw new Error('No encryption methods available on FHEVM instance');
      }
      
      console.log('✅ String encrypted successfully');
      return encrypted;
    } catch (error) {
      console.error('❌ Encryption failed:', error);
      throw new Error(`Failed to encrypt data: ${error.message}`);
    }
  }

  async encryptNumber(value: number, type: 'euint8' | 'euint32' | 'euint64' = 'euint64', contractAddress?: string): Promise<any> {
    if (!this.instance) {
      throw new Error('FHEVM instance not initialized. Please ensure FHEVM is properly set up.');
    }

    try {
      console.log(`🔐 Encrypting number ${value} as ${type}...`);
      
      // Use the appropriate encryption method based on type and availability
      let encrypted;
      
      if (type === 'euint64' && this.instance.encrypt64) {
        console.log('🔐 Using encrypt64 method');
        encrypted = await this.instance.encrypt64(value);
      } else if (type === 'euint32' && this.instance.encrypt32) {
        console.log('🔐 Using encrypt32 method');
        encrypted = await this.instance.encrypt32(value);
      } else if (type === 'euint8' && this.instance.encrypt8) {
        console.log('🔐 Using encrypt8 method');
        encrypted = await this.instance.encrypt8(value);
      } else if (this.instance.encrypt) {
        console.log('🔐 Using encrypt method');
        encrypted = await this.instance.encrypt(value, type);
      } else if (this.instance.createEncryptedInput && contractAddress) {
        console.log('🔐 Using createEncryptedInput method with contract address:', contractAddress);
        
        // Validate contract address before using it
        if (!contractAddress || !/^0x[a-fA-F0-9]{40}$/.test(contractAddress)) {
          throw new Error(`Contract address is not a valid address: ${contractAddress}`);
        }
        
        encrypted = await this.instance.createEncryptedInput(value, type, contractAddress);
      } else {
        throw new Error('No encryption methods available on FHEVM instance');
      }
      
      console.log('✅ Number encrypted successfully');
      return encrypted;
    } catch (error) {
      console.error('❌ Encryption failed:', error);
      throw new Error(`Failed to encrypt data: ${error.message}`);
    }
  }

  async decrypt(ciphertext: string): Promise<any> {
    if (!this.instance) {
      throw new Error('FHEVM instance not initialized. Please ensure FHEVM is properly set up.');
    }

    try {
      const decrypted = await this.instance.decrypt(ciphertext);
      return decrypted;
    } catch (error) {
      console.error('Decryption failed:', error);
      throw new Error('Failed to decrypt data');
    }
  }

  getPublicKey(): string {
    if (!this.instance) {
      throw new Error('FHEVM instance not initialized. Please ensure FHEVM is properly set up.');
    }
    
    try {
      const publicKey = this.instance.getPublicKey();
      
      // Handle different public key formats
      if (typeof publicKey === 'string') {
        return publicKey;
      } else if (publicKey && typeof publicKey === 'object') {
        // If it's an object, try to extract the key
        if (publicKey.key) {
          return publicKey.key;
        } else if (publicKey.publicKey) {
          return publicKey.publicKey;
        } else if (publicKey.toString) {
          return publicKey.toString();
        }
      }
      
      // Fallback: convert to string
      return String(publicKey);
    } catch (error) {
      console.error('❌ Failed to get public key:', error);
      throw new Error('Failed to retrieve public key from FHEVM instance');
    }
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  getInstance(): any {
    return this.instance;
  }

  // Helper function to convert string to number for encryption
  private stringToNumber(str: string): number {
    if (!str || typeof str !== 'string') {
      console.warn('Invalid input to stringToNumber:', str);
      return 0;
    }
    
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

export const fhevmService = new FhevmService();
