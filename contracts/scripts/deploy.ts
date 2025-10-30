import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying TaskManager contract to Sepolia...");
  
  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy TaskManager
  const TaskManager = await ethers.getContractFactory("TaskManager");
  const taskManager = await TaskManager.deploy();
  
  await taskManager.waitForDeployment();
  const address = await taskManager.getAddress();
  
  console.log("✅ TaskManager deployed to:", address);
  console.log(`🔗 Explorer: https://sepolia.etherscan.io/address/${address}`);
  
  // Verify the contract has the expected functions
  console.log("🔍 Verifying contract functions...");
  try {
    const fee = await taskManager.taskCreationFee();
    console.log("✅ taskCreationFee function works:", fee.toString());
    
    // Check if createTaskWithText exists
    if (typeof taskManager.createTaskWithText === 'function') {
      console.log("✅ createTaskWithText function exists");
    } else {
      console.log("❌ createTaskWithText function missing");
    }
    
    if (typeof taskManager.createTaskWithNumbers === 'function') {
      console.log("✅ createTaskWithNumbers function exists");
    } else {
      console.log("❌ createTaskWithNumbers function missing");
    }
    
    if (typeof taskManager.requestTaskDecryption === 'function') {
      console.log("✅ requestTaskDecryption function exists");
    } else {
      console.log("❌ requestTaskDecryption function missing");
    }
    
  } catch (error) {
    console.error("❌ Error verifying contract:", error);
  }
  
  console.log("\n📋 Next Steps:");
  console.log("1. Update frontend contract address to:", address);
  console.log("2. Test the createTaskWithText functionality");
  console.log("3. Verify all functions work correctly");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
