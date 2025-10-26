// Simple script to inspect the deployed contract
const { ethers } = require('ethers');

// Sepolia RPC URL
const RPC_URL = 'https://sepolia.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161';

// Contract address
const CONTRACT_ADDRESS = '0x9e5B4b2847c9DacfDA297d8CD67E16Fb06b8e40a';

// Basic ABI with common methods
const BASIC_ABI = [
  "function name() external view returns (string)",
  "function symbol() external view returns (string)",
  "function totalSupply() external view returns (uint256)",
  "function balanceOf(address) external view returns (uint256)",
  "function owner() external view returns (address)",
  "function getTasks(address) external view returns (tuple(euint64 title, euint64 dueDate, euint8 priority, uint8 status)[] memory)",
  "function taskCreationFee() external view returns (uint256)",
  "function lastDueSoonCount(address) external view returns (uint32)"
];

async function inspectContract() {
  try {
    console.log('🔍 Inspecting contract:', CONTRACT_ADDRESS);
    
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, BASIC_ABI, provider);
    
    // Try to call basic methods
    console.log('\n📋 Testing basic methods:');
    
    try {
      const name = await contract.name();
      console.log('✅ name():', name);
    } catch (e) {
      console.log('❌ name():', e.message);
    }
    
    try {
      const owner = await contract.owner();
      console.log('✅ owner():', owner);
    } catch (e) {
      console.log('❌ owner():', e.message);
    }
    
    try {
      const fee = await contract.taskCreationFee();
      console.log('✅ taskCreationFee():', ethers.formatEther(fee), 'ETH');
    } catch (e) {
      console.log('❌ taskCreationFee():', e.message);
    }
    
    try {
      const tasks = await contract.getTasks('0x0000000000000000000000000000000000000000');
      console.log('✅ getTasks():', tasks.length, 'tasks');
    } catch (e) {
      console.log('❌ getTasks():', e.message);
    }
    
    // Check if contract exists
    const code = await provider.getCode(CONTRACT_ADDRESS);
    if (code === '0x') {
      console.log('\n❌ Contract does not exist at this address!');
    } else {
      console.log('\n✅ Contract exists (code length:', code.length, 'bytes)');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

inspectContract();
