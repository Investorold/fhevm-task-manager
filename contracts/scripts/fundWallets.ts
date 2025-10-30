import { ethers } from "hardhat";

async function main() {
  console.log("💰 Funding wallets from main account...");
  
  // Get all signers
  const signers = await ethers.getSigners();
  const mainWallet = signers[0]; // Main wallet with 2 ETH
  const otherWallets = signers.slice(1, 5); // Fund first 4 other wallets
  
  console.log("Main wallet:", mainWallet.address);
  console.log("Main wallet balance:", ethers.formatEther(await mainWallet.provider.getBalance(mainWallet.address)), "ETH");
  
  // Fund each wallet with 0.05 ETH
  const fundingAmount = ethers.parseEther("0.05");
  
  for (let i = 0; i < otherWallets.length; i++) {
    const wallet = otherWallets[i];
    const balanceBefore = await wallet.provider.getBalance(wallet.address);
    
    console.log(`\nFunding wallet ${i + 1}: ${wallet.address}`);
    console.log("Balance before:", ethers.formatEther(balanceBefore), "ETH");
    
    try {
      const tx = await mainWallet.sendTransaction({
        to: wallet.address,
        value: fundingAmount
      });
      
      await tx.wait();
      
      const balanceAfter = await wallet.provider.getBalance(wallet.address);
      console.log("Balance after:", ethers.formatEther(balanceAfter), "ETH");
      console.log("✅ Funded successfully!");
      
    } catch (error) {
      console.error("❌ Failed to fund wallet:", error);
    }
  }
  
  console.log("\n🎉 Funding complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
