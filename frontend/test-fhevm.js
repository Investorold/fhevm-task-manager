// Simple test script to verify FHEVM functionality
const { fhevmService } = require('./src/services/fhevmService.ts');

async function testFhevm() {
  try {
    console.log('🧪 Testing FHEVM Service...');
    
    // Test initialization
    console.log('1. Testing initialization...');
    await fhevmService.initialize();
    console.log('✅ FHEVM initialized successfully');
    
    // Test encryption
    console.log('2. Testing encryption...');
    const testString = 'Hello FHEVM';
    const encryptedString = await fhevmService.encryptString(testString);
    console.log('✅ String encrypted:', encryptedString);
    
    const testNumber = 42;
    const encryptedNumber = await fhevmService.encryptNumber(testNumber, 'euint64');
    console.log('✅ Number encrypted:', encryptedNumber);
    
    // Test public key
    console.log('3. Testing public key...');
    const publicKey = fhevmService.getPublicKey();
    console.log('✅ Public key retrieved:', publicKey.substring(0, 20) + '...');
    
    console.log('🎉 All FHEVM tests passed!');
    
  } catch (error) {
    console.error('❌ FHEVM test failed:', error.message);
  }
}

testFhevm();

