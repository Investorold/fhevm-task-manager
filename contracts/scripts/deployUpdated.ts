const { deployments, ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying updated TaskManager with decryption functionality...");
  
  const { deploy } = deployments;
  const [deployer] = await ethers.getSigners();
  
  console.log("Deploying contracts with the account:", deployer.address);
  console.log("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  // Deploy updated TaskManager
  const deployedTaskManager = await deploy("TaskManager", {
    from: deployer.address,
    log: true,
  });

  console.log(`✅ TaskManager deployed to: ${deployedTaskManager.address}`);
  console.log(`🔗 Explorer: https://sepolia.etherscan.io/address/${deployedTaskManager.address}`);
  
  // Verify the contract (optional)
  try {
    console.log("🔍 Verifying contract...");
    await hre.run("verify:verify", {
      address: deployedTaskManager.address,
      constructorArguments: [],
    });
    console.log("✅ Contract verified successfully!");
  } catch (error) {
    console.log("⚠️ Contract verification failed:", error.message);
  }

  console.log("\n📋 Next Steps:");
  console.log("1. Update your frontend with the new contract address");
  console.log("2. Test the decryption functionality");
  console.log("3. Submit to Zama bounty program!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
