import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { TaskManager } from "../types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("TaskManagerTrace", function () {
  it("should create a new task with tracing", async function () {
    const signers = await ethers.getSigners();
    const factory = await ethers.getContractFactory("TaskManager");
    const contract = await factory.connect(signers[0]).deploy() as TaskManager;
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();

    const title = 12345;
    const dueDate = new Date().getTime();
    const priority = 2;

    const encryptedData = await fhevm.createEncryptedInput(contractAddress, signers[0].address);
    encryptedData.add64(BigInt(dueDate));
    encryptedData.add64(BigInt(title));
    encryptedData.add8(priority);
    const {handles, inputProof} = await encryptedData.encrypt();

    const fee = await contract.taskCreationFee();
    
    await contract.createTask(handles[1], handles[0], handles[2], inputProof, { value: fee });

    const userTasks = await contract.getTasks(signers[0].address);
    expect(userTasks.length).to.equal(1);
  });
});
