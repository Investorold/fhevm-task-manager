// Debug script to help troubleshoot wallet connection issues
// Run this in the browser console to diagnose problems

console.log('🔍 Wallet Debug Information');
console.log('========================');

// Check window.ethereum
console.log('window.ethereum:', !!window.ethereum);
if (window.ethereum) {
  console.log('  - isMetaMask:', window.ethereum.isMetaMask);
  console.log('  - isCoinbaseWallet:', window.ethereum.isCoinbaseWallet);
  console.log('  - isTrust:', window.ethereum.isTrust);
  console.log('  - isRabby:', window.ethereum.isRabby);
  console.log('  - selectedAddress:', window.ethereum.selectedAddress);
  console.log('  - chainId:', window.ethereum.chainId);
  console.log('  - providers:', window.ethereum.providers?.length || 'none');
}

// Check other wallet providers
console.log('window.evmAsk:', !!window.evmAsk);
console.log('window.okxwallet:', !!window.okxwallet);
console.log('window.phantom:', !!window.phantom);

// Check cached providers
console.log('Cached providers:');
console.log('  - __selectedProvider:', !!(window as any).__selectedProvider);
console.log('  - __stableProvider:', !!(window as any).__stableProvider);

// Test connection
async function testConnection() {
  try {
    console.log('🧪 Testing wallet connection...');
    
    if (!window.ethereum) {
      throw new Error('No wallet provider found');
    }
    
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    console.log('✅ Connection successful:', accounts);
    return accounts;
  } catch (error) {
    console.error('❌ Connection failed:', error);
    return null;
  }
}

// Make test function available globally
window.testWalletConnection = testConnection;

console.log('💡 Run testWalletConnection() to test wallet connection');
console.log('💡 Check the console for detailed wallet information');

