import { ethers } from "hardhat";

async function main() {
  console.log("🚀 Deploying TaskManager contract...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying with account:", deployer.address);
  
  // Get balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");

  // Deploy the contract
  console.log("\n⏳ Deploying TaskManager...");
  const TaskManager = await ethers.getContractFactory("TaskManager");
  const taskManager = await TaskManager.deploy();
  await taskManager.waitForDeployment();

  const address = await taskManager.getAddress();
  console.log("✅ TaskManager deployed to:", address);

  // Get deployment information
  const network = await ethers.provider.getNetwork();
  console.log("\n📊 Deployment Details:");
  console.log("   Network:", network.name, `(Chain ID: ${network.chainId})`);
  console.log("   Contract Address:", address);
  console.log("   Deployer:", deployer.address);
  console.log("   Task Creation Fee:", ethers.formatEther(await taskManager.taskCreationFee()), "ETH");

  // Wait a bit to ensure the deployment is confirmed
  console.log("\n⏳ Waiting for deployment confirmation...");
  const deployTx = taskManager.deploymentTransaction();
  if (deployTx) {
    await deployTx.wait();
  }

  console.log("\n🎉 Deployment complete!");
  console.log("\n📋 Next steps:");
  console.log("   1. Update your frontend with the contract address");
  console.log("   2. Test the contract using the deployed address");
  console.log("   3. (Optional) Verify the contract on Etherscan");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
