import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { Wallet } from "ethers";

task("check-mnemonic", "Checks the mnemonic used by Hardhat and prints the derived address")
  .setAction(async (taskArgs: {}, hre: HardhatRuntimeEnvironment) => {
    const { ethers } = hre;
    const networkConfig = hre.network.config;

    if (!("accounts" in networkConfig) || !("mnemonic" in networkConfig.accounts)) {
      console.error("Mnemonic not found in network configuration.");
      return;
    }

    const mnemonic = networkConfig.accounts.mnemonic;
    const wallet = Wallet.fromPhrase(mnemonic);

    console.log(`Mnemonic being used: ${mnemonic}`);
    console.log(`Derived address: ${wallet.address}`);
  });
