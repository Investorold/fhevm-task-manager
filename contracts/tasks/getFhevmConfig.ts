import { task } from "hardhat/config";

task("get-fhevm-config", "Prints the FHEVM core contract addresses", async (_taskArgs, hre) => {
  const { fhevm } = hre;

  await fhevm.initializeCLIApi();

  const config = fhevm.getFhevmConfig(); // Assuming such a method exists or can be inferred

  console.log("FHEVM Configuration:");
  console.log(`  KMS Contract Address: ${config.kmsContractAddress}`);
  console.log(`  ACL Contract Address: ${config.aclContractAddress}`);
  console.log(`  Input Verifier Contract Address: ${config.inputVerifierContractAddress}`);
  console.log(`  Verifying Contract Address Decryption: ${config.verifyingContractAddressDecryption}`);
  console.log(`  Verifying Contract Address Input Verification: ${config.inputVerifierContractAddress}`);
  console.log(`  Gateway Chain ID: ${config.gatewayChainId}`);
});
