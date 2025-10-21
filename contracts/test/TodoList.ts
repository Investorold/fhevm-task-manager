
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { TodoList } from "../types";

describe("TodoList", function () {
  let contract: TodoList;
  let contractAddress: string;
  let owner: HardhatEthersSigner;
  let otherAccount: HardhatEthersSigner;

  before(async function () {
    // Get signers
    [owner, otherAccount] = await ethers.getSigners();

    // Deploy the contract
    const ContractFactory = await ethers.getContractFactory("TodoList");
    contract = await ContractFactory.deploy() as TodoList;
    await contract.waitForDeployment();
    contractAddress = await contract.getAddress();
    console.log(`TodoList contract deployed at: ${contractAddress}`);
  });

  it("Should add a new task", async function () {
    const taskContent = 12345; // Using a number for the task content as per the new contract
    const encryptedInput = await fhevm.createEncryptedInput(contractAddress, owner.address).add32(taskContent).encrypt();

    await contract.connect(owner).addTask(encryptedInput.handles[0], encryptedInput.inputProof);

    const userTasks = await contract.connect(owner).getTasks();
    expect(userTasks.length).to.equal(1);

    const taskCount = await contract.taskCount(owner.address);
    expect(taskCount).to.equal(1);

    // Decrypt and verify the content of the added task
    const decryptedContent = await fhevm.userDecryptEuint(
      FhevmType.euint32,
      userTasks[0].encryptedContent,
      contractAddress,
      owner
    );
    expect(decryptedContent).to.equal(taskContent);
  });

  it("Should mark a task as complete", async function () {
    // Add a task first (this will be task ID 1)
    const taskContent = 54321;
    const encryptedInput = await fhevm.createEncryptedInput(contractAddress, owner.address).add32(taskContent).encrypt();
    await contract.connect(owner).addTask(encryptedInput.handles[0], encryptedInput.inputProof);

    // Mark task as complete
    await contract.connect(owner).completeTask(1);

    // Retrieve tasks and check status
    const userTasks = await contract.connect(owner).getTasks();
    const task = userTasks[1];

    // Decrypt the completion status
    const isCompleted = await fhevm.userDecryptEbool(task.completed, contractAddress, owner);
    expect(isCompleted).to.be.true;
  });

  it("Should not allow a user to see another user's tasks", async function () {
    // otherAccount tries to get tasks, should be empty
    const otherUserTasks = await contract.connect(otherAccount).getTasks();
    expect(otherUserTasks.length).to.equal(0);
  });

  it("Should handle task completion for the correct user", async function () {
    // Owner has 2 tasks, let's check the first one's status (should be false)
    let ownerTasks = await contract.connect(owner).getTasks();
    let firstTask = ownerTasks[0];
    let isCompleted = await fhevm.userDecryptEbool(firstTask.completed, contractAddress, owner);
    expect(isCompleted).to.be.false;

    // Add a task for otherAccount
    const otherTaskContent = 999;
    const otherEncryptedInput = await fhevm.createEncryptedInput(contractAddress, otherAccount.address).add32(otherTaskContent).encrypt();
    await contract.connect(otherAccount).addTask(otherEncryptedInput.handles[0], otherEncryptedInput.inputProof);

    // otherAccount completes their task (ID 0 for them)
    await contract.connect(otherAccount).completeTask(0);

    // Verify otherAccount's task is complete
    const otherUserTasks = await contract.connect(otherAccount).getTasks();
    isCompleted = await fhevm.userDecryptEbool(otherUserTasks[0].completed, contractAddress, otherAccount);
    expect(isCompleted).to.be.true;

    // Verify owner's first task is still not complete
    ownerTasks = await contract.connect(owner).getTasks();
    firstTask = ownerTasks[0];
    isCompleted = await fhevm.userDecryptEbool(firstTask.completed, contractAddress, owner);
    expect(isCompleted).to.be.false;
  });
});
