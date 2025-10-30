const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Testing with account:", deployer.address);
  console.log("Account balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)), "ETH");
  
  const contractAddress = "0x2FF65Cf9F062272Fb85B4B1D0bA14ca623a09885";
  const contract = await ethers.getContractAt("TaskManager", contractAddress);
  
  console.log("✅ Contract loaded successfully!");
  console.log("Contract address:", contractAddress);
  
  // Test simple read
  const fee = await contract.taskCreationFee();
  console.log("Task creation fee:", ethers.formatEther(fee), "ETH");
}

main().catch(console.error);
