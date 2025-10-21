
import { task } from "hardhat/config";
import { HardhatRuntimeEnvironment } from "hardhat/types";

task("get-abi", "Prints the ABI of a contract")
  .addParam("contract", "The name of the contract")
  .setAction(async (taskArgs, hre: HardhatRuntimeEnvironment) => {
    const artifact = await hre.artifacts.readArtifact(taskArgs.contract);
    console.log(JSON.stringify(artifact.abi, null, 2));
  });
