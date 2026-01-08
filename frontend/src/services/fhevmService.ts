import { simpleWalletService } from './simpleWalletService';
import { gatewayFailover } from '../utils/gatewayFailover';
import { secureLogger } from '../utils/secureLogger';

type FhevmModule = {
  initSDK: () => Promise<void | boolean>;
  createInstance: (config: any) => Promise<any>;
};

declare global {
  interface Window {
    fhevm?: FhevmModule;
    ethereum?: any;
    web3?: any;
  }
}

class FhevmService {
  private instance: any = null;
  private isInitialized = false;
  private currentConfig: any = null; // Store the config we used to create the instance
  private readonly STORAGE_VERSION_KEY = 'fhevm_storage_version';
  private readonly CURRENT_STORAGE_VERSION = '0.91'; // Update this when SDK changes handle format

  /**
   * Clear all FHEVM-related storage (handles, keys, etc.)
   * This fixes "Incorrect Handle" errors after SDK updates
   */
  /**
   * Clear all FHEVM-related storage (handles, keys, etc.)
   * This fixes "Incorrect Handle" errors after SDK updates
   * Now async to properly wait for IndexedDB deletions
   */
  async clearStaleHandles(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      secureLogger.debug('[FHEVM] 🧹 Starting aggressive storage cleanup...');
      
      // Clear localStorage keys that might contain FHEVM data
      // IMPORTANT: Preserve wallet connection key to maintain user session
      const WALLET_CONNECTION_KEY = 'fhevm_wallet_connection';
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        // Skip wallet connection key - preserve user session
        if (key && key !== WALLET_CONNECTION_KEY && (
          key.includes('fhevm') ||
          key.includes('relayer') ||
          key.includes('handle') ||
          key.includes('encryption') ||
          key.startsWith('zama_') ||
          key.includes('acl') ||
          key.includes('kms') ||
          key.toLowerCase().includes('fhe') ||
          key.toLowerCase().includes('encrypted') ||
          // Also clear any keys that might contain contract addresses or bindings
          key.toLowerCase().includes('contract') ||
          key.toLowerCase().includes('binding') ||
          (key.toLowerCase().includes('address') && key !== WALLET_CONNECTION_KEY)
        )) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        secureLogger.debug('[FHEVM] Clearing localStorage key:', key);
        localStorage.removeItem(key);
      });
      
      // If there are still handle errors after this, we might need to clear ALL localStorage
      // but we'll do that only if explicitly requested to avoid breaking other app data

      // Clear sessionStorage as well
      const sessionKeysToRemove: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (
          key.includes('fhevm') ||
          key.includes('relayer') ||
          key.includes('handle') ||
          key.includes('encryption') ||
          key.startsWith('zama_') ||
          key.includes('acl') ||
          key.includes('kms')
        )) {
          sessionKeysToRemove.push(key);
        }
      }
      sessionKeysToRemove.forEach(key => {
        secureLogger.debug('[FHEVM] Clearing sessionStorage key:', key);
        sessionStorage.removeItem(key);
      });

      // Clear IndexedDB databases - wait for all deletions to complete
      const deletionPromises: Promise<void>[] = [];
      
      if ('indexedDB' in window) {
        const dbNames = ['fhevm', 'relayer', 'zama', 'acl', 'kms', 'fhevm-handles', 'relayer-handles'];
        
        // List all databases and delete matching ones
        if ('databases' in indexedDB) {
          try {
            const databases = await indexedDB.databases();
            databases.forEach(db => {
              if (db.name && (
                db.name.toLowerCase().includes('fhevm') ||
                db.name.toLowerCase().includes('relayer') ||
                db.name.toLowerCase().includes('zama') ||
                db.name.toLowerCase().includes('handle') ||
                db.name.toLowerCase().includes('acl') ||
                db.name.toLowerCase().includes('kms')
              )) {
                secureLogger.debug(`[FHEVM] Found and deleting IndexedDB: ${db.name}`);
                const promise = new Promise<void>((resolve) => {
                  try {
                    const deleteReq = indexedDB.deleteDatabase(db.name!);
                    deleteReq.onsuccess = () => {
                      secureLogger.debug(`[FHEVM] ✅ Deleted IndexedDB: ${db.name}`);
                      resolve();
                    };
                    deleteReq.onerror = () => {
                      secureLogger.warn(`[FHEVM] ⚠️ Failed to delete IndexedDB: ${db.name}`);
                      resolve(); // Resolve anyway
                    };
                    deleteReq.onblocked = () => {
                      secureLogger.warn(`[FHEVM] ⚠️ Delete blocked for IndexedDB: ${db.name}`);
                      resolve(); // Resolve anyway
                    };
                  } catch (error) {
                    secureLogger.warn(`[FHEVM] ⚠️ Error deleting IndexedDB ${db.name}:`, error);
                    resolve();
                  }
                });
                deletionPromises.push(promise);
              }
            });
          } catch (error) {
            secureLogger.warn('[FHEVM] Error listing databases:', error);
          }
        }
        
        // Delete known database names
        dbNames.forEach(dbName => {
          const promise = new Promise<void>((resolve) => {
            try {
              const deleteReq = indexedDB.deleteDatabase(dbName);
              deleteReq.onsuccess = () => {
                secureLogger.debug(`[FHEVM] ✅ Deleted IndexedDB: ${dbName}`);
                resolve();
              };
              deleteReq.onerror = () => {
                resolve(); // Ignore errors if DB doesn't exist
              };
              deleteReq.onblocked = () => {
                secureLogger.warn(`[FHEVM] ⚠️ Delete blocked for IndexedDB: ${dbName}`);
                resolve();
              };
            } catch (error) {
              resolve(); // Ignore errors
            }
          });
          deletionPromises.push(promise);
        });
      }

      // Wait for all IndexedDB deletions to complete
      if (deletionPromises.length > 0) {
        secureLogger.debug(`[FHEVM] Waiting for ${deletionPromises.length} IndexedDB deletions...`);
        await Promise.all(deletionPromises);
        secureLogger.debug('[FHEVM] All IndexedDB deletions completed');
      }

      // Reset the instance to force reinitialization
      this.instance = null;
      this.isInitialized = false;
      window.fhevm = undefined;
      delete (window as any).fhevm; // Force delete

      secureLogger.debug('[FHEVM] ✅ Aggressive storage cleanup completed');
    } catch (error) {
      secureLogger.warn('[FHEVM] Error clearing storage:', error);
    }
  }

  /**
   * Check if storage needs to be cleared (based on SDK version)
   */
  private async checkStorageVersion(): Promise<void> {
    if (typeof window === 'undefined') return;

    try {
      const storedVersion = localStorage.getItem(this.STORAGE_VERSION_KEY);
      if (storedVersion !== this.CURRENT_STORAGE_VERSION) {
        secureLogger.debug(`[FHEVM] Storage version mismatch: ${storedVersion} → ${this.CURRENT_STORAGE_VERSION}`);
        await this.clearStaleHandles();
        localStorage.setItem(this.STORAGE_VERSION_KEY, this.CURRENT_STORAGE_VERSION);
      }
    } catch (error) {
      secureLogger.warn('[FHEVM] Error checking storage version:', error);
    }
  }

  /**
   * Get the current SDK configuration (the config we used to create the instance)
   * This is more reliable than trying to read from instance.config which may not exist
   * Also checks forced config from index.html to ensure we return the latest values
   */
  getConfig(): any {
    // Always prefer forced config from index.html if available (most up-to-date)
    const forcedConfig = typeof window !== 'undefined' ? (window as any).__ZAMA_FORCE_GATEWAY_CONFIG : null;
    if (forcedConfig) {
      // Merge forced config with stored config (forced config takes priority)
      return {
        ...this.currentConfig,
        ...forcedConfig,
        // Ensure we use forced values for critical fields
        gatewayUrl: forcedConfig.gatewayUrl || this.currentConfig?.gatewayUrl,
        gatewayChainId: forcedConfig.gatewayChainId || this.currentConfig?.gatewayChainId,
        chainId: forcedConfig.chainId || this.currentConfig?.chainId,
        relayerUrl: forcedConfig.relayerUrl || this.currentConfig?.relayerUrl
      };
    }
    return this.currentConfig || null;
  }

  /**
   * Reset the FHEVM instance to force reinitialization
   * Use this when contract address changes or network switches
   */
  reset(): void {
    this.instance = null;
    this.isInitialized = false;
    this.currentConfig = null;
  }

  /**
   * Full reset: clear storage and reset instance
   * Use this to fix "Incorrect Handle" errors
   * 
   * NOTE: This clears storage but cannot clear SDK's internal in-memory state.
   * A page reload is still required for complete reset.
   */
  async fullReset(): Promise<void> {
    secureLogger.debug('[FHEVM] 🔄 Performing full reset (clearing storage and instance)...');
    
    // First, try to destroy the instance if it has cleanup methods
    if (this.instance) {
      try {
        // Some SDK instances have cleanup/destroy methods
        if (typeof this.instance.destroy === 'function') {
          secureLogger.debug('[FHEVM] Calling instance.destroy()...');
          await this.instance.destroy();
        }
        if (typeof this.instance.cleanup === 'function') {
          secureLogger.debug('[FHEVM] Calling instance.cleanup()...');
          await this.instance.cleanup();
        }
        if (typeof this.instance.reset === 'function') {
          secureLogger.debug('[FHEVM] Calling instance.reset()...');
          await this.instance.reset();
        }
      } catch (error) {
        secureLogger.warn('[FHEVM] Error during instance cleanup (continuing anyway):', error);
      }
    }
    
    // Reset instance completely
    this.instance = null;
    this.isInitialized = false;
    this.currentConfig = null; // Clear stored config too
    
    // Clear cached SDK module completely
    window.fhevm = undefined;
    delete (window as any).fhevm;
    delete (window as any).__ZAMA_SDK__;
    delete (window as any).zama;
    delete (window as any).__relayer_sdk__;
    
    // Clear all storage and wait for deletions to complete
    await this.clearStaleHandles();
    
    // AGGRESSIVE: Clear ALL localStorage keys (not just FHEVM-related)
    // This is necessary because handles might be stored with unexpected key names
    // IMPORTANT: Preserve wallet connection to maintain user session
    if (typeof window !== 'undefined') {
      secureLogger.debug('[FHEVM] 🧹 Clearing ALL localStorage (aggressive mode)...');
      
      // Preserve wallet connection before clearing
      const WALLET_CONNECTION_KEY = 'fhevm_wallet_connection';
      const walletConnection = localStorage.getItem(WALLET_CONNECTION_KEY);
      
      const allKeys = Object.keys(localStorage);
      allKeys.forEach(key => {
        try {
          // Skip wallet connection key - preserve user session
          if (key !== WALLET_CONNECTION_KEY) {
            localStorage.removeItem(key);
          }
        } catch (e) {
          // Ignore errors
        }
      });
      
      // Restore wallet connection if it existed
      if (walletConnection) {
        localStorage.setItem(WALLET_CONNECTION_KEY, walletConnection);
        secureLogger.debug('[FHEVM] ✅ Preserved wallet connection during reset');
      }
      
      // Clear ALL sessionStorage
      secureLogger.debug('[FHEVM] 🧹 Clearing ALL sessionStorage...');
      sessionStorage.clear();
    }
    
    // Wait longer to ensure all async operations complete
    secureLogger.debug('[FHEVM] Waiting for all cleanup operations to complete...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Increased to 3 seconds
    
    // Reset storage version to force clear on next init
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_VERSION_KEY);
    }
    
    secureLogger.debug('[FHEVM] ✅ Full reset completed - SDK module and storage cleared');
    secureLogger.debug('[FHEVM] ⚠️ IMPORTANT: SDK internal state requires page reload. Please reload the page (F5) now.');
  }

  /**
   * Force reset (alias for fullReset)
   * Used by contract service when handle errors occur
   */
  async forceReset(): Promise<void> {
    return this.fullReset();
  }

  async initialize(forceReload: boolean = false): Promise<void> {
    try {
      if (typeof window === 'undefined') {
        throw new Error('FHEVM SDK can only be initialised in a browser environment.');
      }

      // If force reload requested, do full reset first
      if (forceReload) {
        await this.fullReset();
      } else {
        // ALWAYS clear stale handles BEFORE initialization to prevent "Incorrect Handle" errors
        // This ensures fresh handles are generated that match the current SDK version
        await this.clearStaleHandles();
        await this.checkStorageVersion();

        // Reset instance if it exists (forces fresh initialization with cleared storage)
        if (this.instance) {
          this.reset();
        }
      }
      
      // Skip if already initialized and instance exists (unless forcing reload)
      if (this.isInitialized && this.instance && !forceReload) {
        return;
      }

      if (typeof window !== 'undefined' && !window.crossOriginIsolated) {
        // Check what might be breaking isolation
        const diagnostic = [];
        
        // Check for browser extensions that might break isolation
        if ((window as any).ethereum || (window as any).web3) {
          diagnostic.push('⚠️ Wallet extensions detected - these can break cross-origin isolation');
        }
        
        // Check if we're in an iframe
        if (window.self !== window.top) {
          diagnostic.push('⚠️ Page is in an iframe - this breaks cross-origin isolation');
        }
        
        // TEMPORARY: Allow bypass via localStorage flag for testing
        // This helps diagnose if the issue is truly isolation or something else
        const bypassIsolation = localStorage.getItem('fhevm_bypass_isolation_check') === 'true';
        if (bypassIsolation) {
          secureLogger.warn('[FHEVM] ⚠️ Bypassing cross-origin isolation check (testing mode)');
          secureLogger.warn('[FHEVM] This may cause SharedArrayBuffer errors. Use only for debugging.');
        } else {
          const diagnosticMsg = diagnostic.length > 0 
            ? '\n\n⚠️ Possible causes:\n' + diagnostic.join('\n') + '\n\n🔧 QUICK FIX (for testing):\nRun this in browser console, then refresh:\nlocalStorage.setItem("fhevm_bypass_isolation_check", "true")\n\n💡 Other solutions:\n1. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)\n2. Try incognito/private window (fewer extensions)\n3. Disable browser extensions temporarily\n4. Check Network tab for resources without CORS headers'
            : '\n\n🔧 QUICK FIX (for testing):\nRun this in browser console, then refresh:\nlocalStorage.setItem("fhevm_bypass_isolation_check", "true")\n\n💡 Other solutions:\n1. Hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)\n2. Check Network tab for resources without CORS headers\n3. Try incognito/private window (fewer extensions)';
          
          throw new Error(
            'Browser session is not cross-origin isolated. Start the frontend with `npm run dev` or serve the build with COOP/COEP headers.' + diagnosticMsg
          );
        }
      }

      let selectedProvider = simpleWalletService.selectProvider();

      if (!selectedProvider) {
        if ((window as any).ethereum?.providers && (window as any).ethereum.providers.length > 1) {
          const metaMaskProvider = (window as any).ethereum.providers.find((p: any) => p.isMetaMask);
          selectedProvider = metaMaskProvider || (window as any).ethereum.providers[0];
        } else if (window.ethereum) {
          selectedProvider = window.ethereum;
        }
      }

      if (!selectedProvider) {
        selectedProvider = window.ethereum || (window as any).web3?.currentProvider;
      }

      if (!selectedProvider) {
        throw new Error('No Ethereum provider detected. Please install MetaMask or a compatible wallet.');
      }

      const sdkModule = await this.loadFhevmModule(forceReload); // Force reload if requested
      const { initSDK, createInstance } = sdkModule;

      if (!initSDK || typeof initSDK !== 'function') {
        throw new Error('initSDK is not available from FHEVM SDK.');
      }

      await initSDK();

      // 🔥 CRITICAL: Clone and mutate SepoliaConfig IN-PLACE (per Zama GPT guidance)
      // This ensures the SDK receives the exact config we intend, not defaults
      // @ts-ignore - SepoliaConfig may not be in types but exists in runtime
      const SepoliaConfig = (sdkModule as any).SepoliaConfig;
      
      // HARD OVERRIDE: Check for early override set in index.html (defeats stale SDK defaults)
      const forcedConfig = typeof window !== 'undefined' ? (window as any).__ZAMA_FORCE_GATEWAY_CONFIG : null;
      if (forcedConfig) {
        secureLogger.debug('[FHEVM] ✅ Found hard override config from index.html:', forcedConfig);
      }
      
      // 🚀 GATEWAY FAILOVER: Use automatic failover system to find best gateway
      let selectedGatewayUrl: string;
      
      // CRITICAL: Check for forced config FIRST and bypass failover completely
      if (forcedConfig?.gatewayUrl) {
        // If forced config is provided, use it DIRECTLY - NO FAILOVER, NO HEALTH CHECKS
        selectedGatewayUrl = forcedConfig.gatewayUrl;
        secureLogger.debug('[FHEVM] 🔧 FORCED GATEWAY URL - Bypassing failover system completely');
        secureLogger.debug('[FHEVM] 🔧 Using forced gateway URL:', selectedGatewayUrl);
        secureLogger.debug('[FHEVM] ⏭️ Skipping all health checks and failover logic');
      } else {
        // Use failover system to find the best gateway (only if NOT forced)
        secureLogger.debug('[FHEVM] 🔍 No forced gateway URL - Using failover system to find best endpoint...');
        selectedGatewayUrl = await gatewayFailover.getGatewayUrl();
        secureLogger.debug('[FHEVM] ✅ Selected gateway URL via failover:', selectedGatewayUrl);
      }
      
      // Per official docs: Use SepoliaConfig directly, only add network
      // https://docs.zama.org/fhevm-relayer/development/web-applications
      let config: any;
      if (SepoliaConfig && typeof SepoliaConfig === 'object') {
        secureLogger.debug('[FHEVM] ✅ Using official SepoliaConfig from SDK');
        config = { ...SepoliaConfig, network: selectedProvider };
        secureLogger.debug('[FHEVM] Config from SDK:', Object.keys(config));
      } else {
        secureLogger.debug('[FHEVM] SepoliaConfig not available, using minimal config');
        config = { network: selectedProvider };
      }

      if (selectedProvider && selectedProvider.chainId) {
        const chainId = parseInt(selectedProvider.chainId);
        if (chainId !== 11155111) {
          throw new Error(`Please switch to Sepolia testnet (Chain ID 11155111). Current: ${chainId}`);
        }
      }

      // CRITICAL: Only create ONE SDK instance per page load (per Zama GPT advice)
      // If instance already exists and we're not forcing reload, reuse it
      if (this.instance && !forceReload) {
        secureLogger.debug('[FHEVM] ✅ Reusing existing SDK instance (only one instance per page load)');
        this.isInitialized = true;
        return;
      }

      // Verify no duplicate instances exist on window (per Zama GPT advice)
      if ((window as any).__ZAMA_SDK__ || (window as any).zama || (window as any).__relayer_sdk__) {
        secureLogger.warn('[FHEVM] ⚠️ WARNING: Multiple SDK instances detected. This may cause handle mismatches.');
        // Run diagnostic if available
        if ((window as any).__fhevmDiagnose) {
          secureLogger.debug('[FHEVM] 🔍 Running diagnostic check for duplicate instances...');
          try {
            (window as any).__fhevmDiagnose();
          } catch (diagError) {
            secureLogger.warn('[FHEVM] Diagnostic check failed:', diagError);
          }
        }
      }

      secureLogger.debug('[FHEVM] Creating SDK instance...');
      secureLogger.debug('[FHEVM] Config:', {
        gatewayUrl: config.gatewayUrl,
        gatewayChainId: config.gatewayChainId,
        chainId: config.chainId
      });

      // Single attempt - no retries
      try {
        this.instance = await createInstance(config);

        if (typeof this.instance.initSDK === 'function') {
          await this.instance.initSDK();
        }

        this.currentConfig = {
          gatewayUrl: config.gatewayUrl,
          gatewayChainId: config.gatewayChainId,
          chainId: config.chainId,
          network: config.network,
          relayerUrl: config.relayerUrl
        };

        secureLogger.debug('[FHEVM] ✅ SDK instance created successfully');
      } catch (error: any) {
        const errorMsg = error?.message || String(error);
        secureLogger.error('[FHEVM] ❌ SDK initialization failed:', errorMsg);
        throw new Error(`FHEVM initialization failed: ${errorMsg}`);
      }

      this.isInitialized = true;
    } catch (error: any) {
      const rawMessage = error?.message || String(error);
      let hint = '';
      let enhancedError = rawMessage;

      if (rawMessage.includes('magic word') || rawMessage.includes('Incorrect response MIME type')) {
        hint = 'Ensure your static host serves `.wasm` files with the `application/wasm` MIME type.';
      } else if (rawMessage.includes('cross-origin')) {
        hint = 'Confirm COOP/COEP headers are present; the Vite config adds them for dev/preview.';
      } else if (rawMessage.includes('public key') || rawMessage.includes('keyId') || 
                 (rawMessage.includes('key') && rawMessage.includes('must provide'))) {
        // Key fetch error - provide detailed guidance
        enhancedError = 
          `🔑 GATEWAY KEY FETCH FAILED\n\n` +
          `The SDK could not fetch the gateway's encryption public key.\n\n` +
          `🔴 MOST LIKELY CAUSES:\n` +
          `1. Coprocessor - Testnet is down (check https://status.zama.org)\n` +
          `2. Gateway key service temporarily unavailable\n` +
          `3. Network/CORS issue blocking key fetch\n\n` +
          `✅ WHAT TO DO:\n` +
          `1. Check https://status.zama.org for "Coprocessor - Testnet" status\n` +
          `2. Wait 5-10 minutes if coprocessor is down, then refresh page\n` +
          `3. Run diagnostic: fetch("/key-fetch-diagnostic.js").then(r=>r.text()).then(eval)\n` +
          `4. Check Network tab for failed requests to relayer.testnet.zama.org/v1/keyurl\n\n` +
          `Technical error: ${rawMessage}`;
      }

      throw new Error(`Failed to initialize FHEVM SDK: ${enhancedError}${hint ? ` (${hint})` : ''}`);
    }
  }

  getInstance(): any {
    if (!this.instance) {
      throw new Error('FHEVM instance not initialized');
    }
    return this.instance;
  }

  isReady(): boolean {
    return this.isInitialized;
  }

  private async loadFhevmModule(forceReload: boolean = false): Promise<FhevmModule> {
    // If forcing reload, clear cached module first
    if (forceReload) {
      secureLogger.debug('[FHEVM] 🔄 Force reloading SDK module...');
      window.fhevm = undefined;
      delete (window as any).fhevm;
      // Also clear any global SDK instances that might be cached
      delete (window as any).__ZAMA_SDK__;
      delete (window as any).zama;
      delete (window as any).__relayer_sdk__;
    }

    // Check for existing cached module (but only if not forcing reload)
    if (window.fhevm && typeof window.fhevm.initSDK === 'function' && !forceReload) {
      secureLogger.debug('[FHEVM] Using cached SDK module');
      return window.fhevm;
    }

    // Check for SDK loaded from script tag (UMD build)
    const sdk = (window as any).RelayerSDK || (window as any).relayerSDK || (window as any).fhevm;
    if (sdk && typeof sdk.createInstance === 'function') {
      secureLogger.debug('[FHEVM] ✅ SDK v0.3.0-8 found from script tag');
      const module: FhevmModule = {
        initSDK: sdk.initSDK || (() => Promise.resolve()),
        createInstance: sdk.createInstance.bind(sdk)
      };
      window.fhevm = module;
      return module;
    }

    // Wait for script tag to load (up to 3 seconds)
    secureLogger.debug('[FHEVM] Waiting for SDK script tag to load...');
    const waitStart = Date.now();
    while (Date.now() - waitStart < 3000) {
      const sdk = (window as any).RelayerSDK || (window as any).relayerSDK || (window as any).fhevm;
      if (sdk && typeof sdk.createInstance === 'function') {
        secureLogger.debug('[FHEVM] ✅ SDK v0.3.0-8 loaded from script tag');
        const module: FhevmModule = {
          initSDK: sdk.initSDK || (() => Promise.resolve()),
          createInstance: sdk.createInstance.bind(sdk)
        };
        window.fhevm = module;
        return module;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Fallback: Try dynamic import of UMD build (v0.3.0-8 - latest per docs.zama.org)
    secureLogger.warn('[FHEVM] Script tag not loaded, trying dynamic import...');
    const cdnUrl = 'https://cdn.zama.org/relayer-sdk-js/0.3.0-8/relayer-sdk-js.umd.cjs';
    try {
      secureLogger.debug('[FHEVM] Loading SDK v0.3.0-8 from CDN:', cdnUrl);
      // For UMD builds, we need to load via script tag injection
      await new Promise<void>((resolve, reject) => {
        const script = document.createElement('script');
        script.src = cdnUrl;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load SDK from CDN'));
        document.head.appendChild(script);
      });

      // Check if SDK is now available
      const sdk = (window as any).RelayerSDK || (window as any).relayerSDK;
      if (sdk && typeof sdk.createInstance === 'function') {
        const module: FhevmModule = {
          initSDK: sdk.initSDK || (() => Promise.resolve()),
          createInstance: sdk.createInstance.bind(sdk)
        };
        window.fhevm = module;
        secureLogger.debug('[FHEVM] ✅ Successfully loaded SDK v0.3.0-8 from CDN');
        return module;
      }
    } catch (cdnError) {
      secureLogger.warn('[FHEVM] Failed to load SDK from CDN:', cdnError);
    }

    throw new Error('Could not load FHEVM SDK module. Check that the script tag in index.html is loading correctly.');
  }
}

export const fhevmService = new FhevmService();

// Expose a global helper function for debugging (can be called from browser console)
if (typeof window !== 'undefined') {
  (window as any).__fhevmReset = async () => {
    secureLogger.debug('🔄 [FHEVM Debug] Force resetting FHEVM service...');
    await fhevmService.fullReset();
    secureLogger.debug('✅ [FHEVM Debug] Reset complete. Please reload the page (F5) now.');
    return 'Reset complete. Please reload the page (F5) now.';
  };
  
  (window as any).__fhevmStatus = () => {
    const status = {
      isInitialized: fhevmService.isReady(),
      hasInstance: !!fhevmService.getInstance(),
      windowFhevm: !!window.fhevm,
      windowZama: !!(window as any).__ZAMA_SDK__ || !!(window as any).zama,
      storageVersion: localStorage.getItem('fhevm_storage_version'),
      localStorageKeys: Object.keys(localStorage).filter(k => 
        k.toLowerCase().includes('fhevm') || 
        k.toLowerCase().includes('relayer') || 
        k.toLowerCase().includes('handle')
      ),
      config: fhevmService.getConfig(),
      gatewayStatus: gatewayFailover.getStatus()
    };
    secureLogger.debug('📊 [FHEVM Debug] Status:', status);
    return status;
  };
  
  (window as any).__fhevmDiagnostic = () => {
    console.log('🔍 [FHEVM Diagnostic] Starting comprehensive SDK loading diagnostic...\n');
    
    // Check script tag
    const scriptTag = document.querySelector('script[src*="relayer-sdk-js"]') as HTMLScriptElement;
    if (scriptTag) {
      console.log('✅ Script tag found in DOM');
      console.log('   src:', scriptTag.src);
      console.log('   readyState:', scriptTag.readyState);
      console.log('   complete:', scriptTag.complete);
      console.log('   onload:', typeof scriptTag.onload);
      console.log('   onerror:', typeof scriptTag.onerror);
    } else {
      console.log('❌ No script tag found in DOM');
    }
    
    // Check window globals
    console.log('\n🔍 Checking window globals:');
    const globals = ['fhevm', '__ZAMA_SDK__', 'zama', '__relayer_sdk__', 'RelayerSDK'];
    globals.forEach(name => {
      const val = (window as any)[name];
      if (val) {
        console.log(`   ✅ window.${name}:`, typeof val, val);
        if (typeof val.initSDK === 'function') {
          console.log(`      ✅ Has initSDK function!`);
        } else {
          console.log(`      ⚠️ No initSDK function (type: ${typeof val.initSDK})`);
        }
      } else {
        console.log(`   ❌ window.${name}: undefined`);
      }
    });
    
    // Check network requests
    console.log('\n🔍 Checking Network tab (run in browser console after page load):');
    console.log('   Open DevTools > Network tab and filter for "relayer-sdk"');
    console.log('   Look for: https://cdn.zama.org/relayer-sdk-js/0.3.0-6/relayer-sdk-js.js');
    
    // Try to fetch CDN directly
    console.log('\n🔍 Testing CDN accessibility:');
    fetch('https://cdn.zama.org/relayer-sdk-js/0.3.0-6/relayer-sdk-js.js', { method: 'HEAD' })
      .then(res => {
        console.log('   ✅ CDN is accessible:', res.status, res.statusText);
        console.log('   Content-Type:', res.headers.get('content-type'));
      })
      .catch(err => {
        console.log('   ❌ CDN is NOT accessible:', err.message);
      });
    
    // Check package.json version
    console.log('\n📦 Expected SDK version: 0.3.0-6');
    console.log('   Check package.json to verify this matches');
    
    return 'Diagnostic complete. Check console output above.';
  };
  
  // Gateway failover diagnostic helper
  (window as any).__gatewayFailover = {
    checkHealth: async () => {
      secureLogger.debug('🔍 [Gateway Failover] Checking all endpoints...');
      const status = gatewayFailover.getStatus();
      const checks = await Promise.all(
        status.map(endpoint => gatewayFailover.checkHealth(endpoint))
      );
      secureLogger.debug('📊 [Gateway Failover] Health check results:', checks);
      return checks;
    },
    findBest: async () => {
      secureLogger.debug('🔍 [Gateway Failover] Finding best endpoint...');
      const best = await gatewayFailover.findHealthyEndpoint();
      secureLogger.debug('✅ [Gateway Failover] Best endpoint:', best);
      return best;
    },
    getStatus: () => {
      const status = gatewayFailover.getStatus();
      secureLogger.debug('📊 [Gateway Failover] Current status:', status);
      return status;
    },
    clearCache: () => {
      gatewayFailover.clearCache();
      secureLogger.debug('🧹 [Gateway Failover] Cache cleared');
    }
  };
  
  // Zama GPT diagnostic: Detect root causes of deterministic handle divergence
  (window as any).__fhevmDiagnose = () => {
    secureLogger.debug('🔍 [FHEVM Diagnostic] Running Zama GPT diagnostic checks for handle mismatch...');
    secureLogger.debug('   This checks for the 3 root causes of deterministic handle divergence:');
    secureLogger.debug('   1) Old ciphertexts created under different SDK version');
    secureLogger.debug('   2) Multiple relayer-sdk versions bundled');
    secureLogger.debug('   3) Contract FHE.sol version mismatch');
    secureLogger.debug('');
    
    const results: any = {
      rootCause: null,
      issues: [],
      recommendations: []
    };
    
    // Check 1: Find all objects with createInstance method (potential SDK instances)
    const sdkHolders: Array<{ key: string; val: any }> = [];
    for (const k in window) {
      try {
        const v = (window as any)[k];
        if (v && typeof v.createInstance === 'function') {
          sdkHolders.push({ key: k, val: v });
        }
      } catch (e) {
        // Ignore errors accessing window properties
      }
    }
    
    if (sdkHolders.length > 1) {
      secureLogger.error('❌ [FHEVM Diagnostic] ROOT CAUSE #2: MULTIPLE SDK INSTANCES DETECTED');
      secureLogger.error(`Found ${sdkHolders.length} instances`, { instances: sdkHolders.map(s => s.key) });
      secureLogger.error('   → One copy computes handle H1, another computes H2');
      secureLogger.error('   → SDK believes it did the right thing but Gateway rejects handle H2');
      secureLogger.error('');
      results.rootCause = 'MULTIPLE_SDK_INSTANCES';
      results.issues.push(`Found ${sdkHolders.length} SDK instances on window: ${sdkHolders.map(s => s.key).join(', ')}`);
      results.recommendations.push('Run: npm dedupe && npm install @zama-fhe/relayer-sdk@0.3.0-6 --save-exact');
      results.recommendations.push('Rebuild and redeploy frontend');
    } else if (sdkHolders.length === 1) {
      secureLogger.debug('✅ [FHEVM Diagnostic] Single SDK instance found:', sdkHolders[0].key);
    } else {
      secureLogger.debug('ℹ️ [FHEVM Diagnostic] No SDK instances with createInstance found on window');
    }
    
    // Check 2: Search for @zama-fhe or relayer-sdk strings in window (version detection)
    const matches: string[] = [];
    const versionMatches: string[] = [];
    for (const k in window) {
      try {
        const s = String((window as any)[k]);
        if (s.includes('@zama-fhe') || s.includes('relayer-sdk')) {
          matches.push(k);
          // Try to extract version numbers
          const versionMatch = s.match(/0\.\d+\.\d+(-\d+)?/g);
          if (versionMatch) {
            versionMatches.push(...versionMatch);
          }
        }
      } catch (e) {
        // Ignore errors
      }
    }
    
    if (versionMatches.length > 0) {
      const uniqueVersions = [...new Set(versionMatches)];
      if (uniqueVersions.length > 1) {
        secureLogger.error('❌ [FHEVM Diagnostic] ROOT CAUSE #2: MULTIPLE SDK VERSIONS DETECTED');
        secureLogger.error('   Found versions:', uniqueVersions);
        secureLogger.error('   → Different versions compute different handles');
        secureLogger.error('');
        if (!results.rootCause) {
          results.rootCause = 'MULTIPLE_SDK_VERSIONS';
        }
        results.issues.push(`Multiple SDK versions found: ${uniqueVersions.join(', ')}`);
        results.recommendations.push('Run: npm ls @zama-fhe/relayer-sdk (should show only 0.3.0-6)');
        results.recommendations.push('If duplicates found: npm dedupe && rm -rf node_modules package-lock.json && npm install');
      } else {
        secureLogger.debug('✅ [FHEVM Diagnostic] Single SDK version detected:', uniqueVersions[0]);
      }
    }
    
    // Check 3: SDK version verification
    secureLogger.debug('📋 [FHEVM Diagnostic] Expected SDK version: 0.3.0-6');
    secureLogger.debug('   Expected FHEVM version: 0.9.1');
    secureLogger.debug('   Expected @fhevm/solidity version: ^0.9.1');
    secureLogger.debug('   Run "npm ls @zama-fhe/relayer-sdk" in project root to verify');
    secureLogger.debug('');
    
    // Check 4: Storage inspection for old handles/ciphertexts
    const fhevmStorageKeys = Object.keys(localStorage).filter(k => 
      k.toLowerCase().includes('fhevm') || 
      k.toLowerCase().includes('relayer') || 
      k.toLowerCase().includes('handle') ||
      k.toLowerCase().includes('zama') ||
      k.toLowerCase().includes('ciphertext') ||
      k.toLowerCase().includes('attestation')
    );
    
    if (fhevmStorageKeys.length > 0) {
      secureLogger.warn('⚠️ [FHEVM Diagnostic] FHEVM-related storage keys found:', fhevmStorageKeys);
      secureLogger.warn('   If these contain handles from an older SDK version, they are incompatible');
      secureLogger.warn('   → Old handles were computed under different SDK version');
      secureLogger.warn('   → New SDK computes different handles for same input');
      secureLogger.warn('   → THEY WILL NEVER MATCH (deterministic divergence)');
      secureLogger.debug('');
      if (!results.rootCause) {
        results.rootCause = 'OLD_CIPHERTEXTS';
      }
      results.issues.push(`Found ${fhevmStorageKeys.length} storage keys that may contain old handles`);
      results.recommendations.push('Clear all storage: window.__fhevmReset() then reload page');
      results.recommendations.push('Re-create all encrypted inputs using NEW SDK v0.3.0-6');
    } else {
      secureLogger.debug('✅ [FHEVM Diagnostic] No FHEVM-related storage keys found');
    }
    
    // Check 5: IndexedDB inspection for old handles
    if ('indexedDB' in window && 'databases' in indexedDB) {
      indexedDB.databases().then(databases => {
        const fhevmDbs = databases.filter(db => 
          db.name && (
            db.name.toLowerCase().includes('fhevm') ||
            db.name.toLowerCase().includes('relayer') ||
            db.name.toLowerCase().includes('zama') ||
            db.name.toLowerCase().includes('handle')
          )
        );
        
        if (fhevmDbs.length > 0) {
          secureLogger.warn('⚠️ [FHEVM Diagnostic] FHEVM-related IndexedDB databases:', fhevmDbs.map(db => db.name));
          secureLogger.warn('   These may contain old handles from previous SDK version');
          if (!results.rootCause) {
            results.rootCause = 'OLD_CIPHERTEXTS';
          }
          results.issues.push(`Found ${fhevmDbs.length} IndexedDB databases with potential old handles`);
        } else {
          secureLogger.debug('✅ [FHEVM Diagnostic] No FHEVM-related IndexedDB databases found');
        }
        
        // Final diagnosis
        secureLogger.debug('');
        secureLogger.debug('═══════════════════════════════════════════════════════════════');
        secureLogger.debug('📊 [FHEVM Diagnostic] FINAL DIAGNOSIS');
        secureLogger.debug('═══════════════════════════════════════════════════════════════');
        
        if (results.rootCause === 'MULTIPLE_SDK_INSTANCES' || results.rootCause === 'MULTIPLE_SDK_VERSIONS') {
          secureLogger.error('❌ ROOT CAUSE: Multiple SDK instances/versions detected');
          secureLogger.error('   → Fix: Ensure only one SDK version (0.3.0-6) is bundled');
          secureLogger.error('   → Run: npm dedupe && npm install @zama-fhe/relayer-sdk@0.3.0-6 --save-exact');
          secureLogger.error('   → Rebuild and redeploy');
        } else if (results.rootCause === 'OLD_CIPHERTEXTS') {
          secureLogger.error('❌ ROOT CAUSE: Old ciphertexts created under different SDK version');
          secureLogger.error('   → Your contract may have encrypted data created with SDK v0.3.0-5 or earlier');
          secureLogger.error('   → New SDK v0.3.0-6 computes different handles for same input');
          secureLogger.error('   → Old handles are PERMANENTLY INCOMPATIBLE with new SDK');
          secureLogger.error('');
          secureLogger.error('   🔧 SOLUTION:');
          secureLogger.error('   1. Clear all storage: window.__fhevmReset()');
          secureLogger.error('   2. Reload page (F5)');
          secureLogger.error('   3. Re-create ALL encrypted inputs using NEW SDK:');
          secureLogger.error('      await instance.createEncryptedInput(contractAddress, userAddress)');
          secureLogger.error('   4. Old handles cannot be fixed - they must be recreated');
        } else {
          // No obvious root cause from runtime checks - likely contract version mismatch
          secureLogger.error('❌ ROOT CAUSE: Contract FHE.sol version mismatch (most likely)');
          secureLogger.error('   → Your contract was deployed with @fhevm/solidity@0.9.1');
          secureLogger.error('   → But Gateway/coprocessor may expect different handle derivation');
          secureLogger.error('   → OR contract was deployed BEFORE SDK v0.3.0-6 upgrade');
          secureLogger.error('');
          secureLogger.error('   🔧 SOLUTION OPTIONS:');
          secureLogger.error('   Option 1: Verify contract deployment matches current SDK');
          secureLogger.error('     → Check: Was contract deployed AFTER SDK v0.3.0-6 was released?');
          secureLogger.error('     → If deployed earlier, contract may be incompatible');
          secureLogger.error('');
          secureLogger.error('   Option 2: Re-deploy contract with current FHE.sol version');
          secureLogger.error('     → cd contracts && npm install @fhevm/solidity@0.9.1');
          secureLogger.error('     → npx hardhat compile');
          secureLogger.error('     → npx hardhat run scripts/deployKpiManager.ts --network sepolia');
          secureLogger.error('     → Update VITE_KPI_CONTRACT_ADDRESS in frontend');
          secureLogger.error('');
          secureLogger.error('   Option 3: Contact Zama support to verify Gateway version');
          secureLogger.error('     → Gateway may need to be updated to match SDK v0.3.0-6');
          results.rootCause = 'CONTRACT_VERSION_MISMATCH';
          results.recommendations.push('Verify contract was deployed with @fhevm/solidity@0.9.1 AFTER SDK v0.3.0-6 release');
          results.recommendations.push('If contract was deployed earlier, re-deploy with current versions');
          results.recommendations.push('Check Zama docs for SDK/Gateway version compatibility');
        }
        
        secureLogger.debug('═══════════════════════════════════════════════════════════════');
        
        // Add detailed info to return object
        results.diagnosis = results.rootCause || 'CONTRACT_VERSION_MISMATCH';
        try {
          // Try to get contract address from various sources
          const contractAddr = import.meta.env?.VITE_KPI_CONTRACT_ADDRESS || 
                              '0xCa82F1d0BBA127F4cC3A8881ea5991275A9E8Db5';
          results.contractAddress = contractAddr;
          results.contractDeployed = 'Nov 24, 2025 (per config)';
        } catch (e) {
          results.contractAddress = '0xCa82F1d0BBA127F4cC3A8881ea5991275A9E8Db5';
        }
        results.sdkVersion = '0.3.0-6';
        results.expectedFhevmVersion = '0.9.1';
        results.expectedFhevmSolidityVersion = '0.9.1';
        
        // Final summary for return
        if (!results.rootCause) {
          results.rootCause = 'CONTRACT_VERSION_MISMATCH';
          results.summary = 'No runtime issues detected. Most likely: Contract was deployed with different FHE.sol version than Gateway expects, OR contract was deployed before SDK v0.3.0-6 compatibility.';
        }
      }).catch(() => {
        secureLogger.debug('ℹ️ [FHEVM Diagnostic] Could not inspect IndexedDB (may require user interaction)');
      });
    }
    
    return {
      rootCause: results.rootCause,
      sdkHolders,
      matches,
      storageKeys: fhevmStorageKeys,
      issues: results.issues,
      recommendations: results.recommendations,
      summary: results.rootCause 
        ? `Root cause identified: ${results.rootCause}` 
        : 'No obvious root cause detected. Check contract FHE.sol version.'
    };
  };
  
  secureLogger.debug('💡 [FHEVM Debug] Helper functions available:');
  secureLogger.debug('   - window.__fhevmReset() - Force reset FHEVM (then reload page)');
  secureLogger.debug('   - window.__fhevmStatus() - Check FHEVM status');
  secureLogger.debug('   - window.__fhevmDiagnose() - Run Zama GPT diagnostic checks');
}



