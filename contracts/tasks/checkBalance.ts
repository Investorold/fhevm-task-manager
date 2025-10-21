import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

task("check-balance", "Prints the ETH balance of a given address on a specified network")
  .addOptionalParam("address", "The address to check the balance of (defaults to deployer)")
  .setAction(async (taskArgs: { address?: string }, hre: HardhatRuntimeEnvironment) => {
    const { ethers, getNamedAccounts } = hre;
    const { deployer } = await getNamedAccounts();

    const addressToCheck = taskArgs.address || deployer;

    console.log(`Checking balance for address: ${addressToCheck} on network: ${hre.network.name}`);

    try {
      const balance = await ethers.provider.getBalance(addressToCheck);
      console.log(`Balance: ${ethers.formatEther(balance)} ETH`);
    } catch (error) {
      console.error("Error fetching balance:", error);
    }
  });
