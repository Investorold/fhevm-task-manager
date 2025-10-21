const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  const txHash = process.argv[2];
  if (!txHash) throw new Error("Usage: node inspectRequest.js <txHash>");

  const provider = ethers.provider;
  const receipt = await provider.getTransactionReceipt(txHash);
  console.log("receipt:", JSON.stringify(receipt, null, 2));

  // load your compiled contract ABI (the one that emitted the event)
  const abi = JSON.parse(fs.readFileSync("artifacts/contracts/TaskManager.sol/TaskManager.json")).abi;
  const iface = new ethers.utils.Interface(abi);

  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      console.log("Decoded log:", parsed.name, parsed.args);
    } catch (e) {
      // not from this contract ABI
    }
  }
}

main().catch(console.error);