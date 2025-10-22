const { ethers } = require("hardhat");

async function main() {
  // Get the deployed TaskManager contract
  const TaskManager = await ethers.getContractFactory("TaskManager");
  
  // Get deployments
  const deployments = await hre.deployments.all();
  const taskManagerDeployment = deployments.TaskManager;
  
  if (!taskManagerDeployment) {
    console.log("❌ TaskManager not deployed. Run: npx hardhat deploy --network sepolia");
    return;
  }
  
  console.log("✅ TaskManager Contract Address:", taskManagerDeployment.address);
  
  const todoListDeployment = deployments.TodoList;
  if (todoListDeployment) {
    console.log("✅ TodoList Contract Address:", todoListDeployment.address);
  }
  
  console.log("📋 Copy these addresses to your frontend!");
  console.log("");
  console.log("🔗 Network: Sepolia Testnet");
  console.log("🌐 TaskManager Explorer: https://sepolia.etherscan.io/address/" + taskManagerDeployment.address);
  if (todoListDeployment) {
    console.log("🌐 TodoList Explorer: https://sepolia.etherscan.io/address/" + todoListDeployment.address);
  }
  console.log("");
  console.log("📝 Next steps:");
  console.log("1. Copy the TaskManager contract address above");
  console.log("2. Update your frontend with this address");
  console.log("3. Make sure you have Sepolia ETH for gas fees");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
