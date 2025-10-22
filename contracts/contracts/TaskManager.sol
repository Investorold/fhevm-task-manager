// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, euint64, euint8, ebool, externalEuint64, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import "hardhat/console.sol";

contract TaskManager is SepoliaConfig, Ownable {

    // Enum to track the status of a task
    enum TaskStatus {
        Pending,
        Completed
    }

    // Struct to represent a task.
    // The title and due date will be encrypted.
    struct Task {
        euint64 title;
        euint64 dueDate;
        euint8 priority;
        TaskStatus status;
    }

    // Mapping from a user's address to their list of tasks
    mapping(address => Task[]) public tasks;

    mapping(address => uint32) public lastDueSoonCount;
    mapping(uint256 => address) public requestInitiator;

    uint256 public taskCreationFee = 0.0001 ether;

        event DecryptionRequested(uint256 requestId, address indexed initiator);

        event Debug(string message, uint256 value);

    

        constructor() Ownable(msg.sender) {}

    

        /**

         * @dev Sets a new fee for task creation. Only callable by the owner.

         * @param _newFee The new fee in wei.

         */

        function setFee(uint256 _newFee) external onlyOwner {

            taskCreationFee = _newFee;

        }

    

        /**

         * @dev Withdraws the entire contract balance to the owner's address.

         */

        function withdraw() external onlyOwner {

            (bool success, ) = owner().call{value: address(this).balance}("");

            require(success, "Withdrawal failed");

        }

    

        /**

         * @dev Creates a new confidential task for the caller.

         * @param encryptedTitle The encrypted title of the task.

         * @param encryptedDueDate The encrypted due date of the task.

         * @param encryptedPriority The encrypted priority of the task (e.g., 1-5).

         * @param inputProof The ZK proof for the encrypted inputs.

         */

        function createTask(

            externalEuint64 encryptedTitle,

            externalEuint64 encryptedDueDate,

            externalEuint8 encryptedPriority,

            bytes calldata inputProof

        ) public payable {

            emit Debug("createTask started", 0);

            require(msg.value == taskCreationFee, "Incorrect fee sent");

            emit Debug("Fee checked", 1);

    

            // 1. Validate inputs

            euint64 title = FHE.fromExternal(encryptedTitle, inputProof);

            emit Debug("fromExternal title done", 2);

            euint64 dueDate = FHE.fromExternal(encryptedDueDate, inputProof);

            emit Debug("fromExternal dueDate done", 3);

            euint8 priority = FHE.fromExternal(encryptedPriority, inputProof);

            emit Debug("fromExternal priority done", 4);

    

            // 2. Create and store the new task

            Task memory newTask = Task({

                title: title,

                dueDate: dueDate,

                priority: priority,

                status: TaskStatus.Pending

            });

            tasks[msg.sender].push(newTask);

            emit Debug("Task pushed", 5);

    

            // 3. Grant permissions for the user to decrypt their own task details

            FHE.allow(title, msg.sender);

            FHE.allow(dueDate, msg.sender);

            FHE.allow(priority, msg.sender);

            

            // 4. Grant contract permission to read the values for future operations

            FHE.allowThis(title);

            FHE.allowThis(dueDate);

            FHE.allowThis(priority);

            emit Debug("Permissions granted", 6);

        }

    function getTasks(address user) public view returns (Task[] memory) {
        return tasks[user];
    }

    function completeTask(uint256 taskIndex) public {
        require(taskIndex < tasks[msg.sender].length, "Task index out of bounds");
        tasks[msg.sender][taskIndex].status = TaskStatus.Completed;
    }

    function deleteTask(uint256 taskIndex) public {
        require(taskIndex < tasks[msg.sender].length, "Task index out of bounds");
        tasks[msg.sender][taskIndex] = tasks[msg.sender][tasks[msg.sender].length - 1];
        tasks[msg.sender].pop();
    }

    function editTask(
        uint256 taskIndex,
        externalEuint64 newEncryptedTitle,
        externalEuint64 newEncryptedDueDate,
        externalEuint8 newEncryptedPriority,
        bytes calldata inputProof
    ) public {
        require(taskIndex < tasks[msg.sender].length, "Task index out of bounds");

        // 1. Validate new inputs
        euint64 newTitle = FHE.fromExternal(newEncryptedTitle, inputProof);
        euint64 newDueDate = FHE.fromExternal(newEncryptedDueDate, inputProof);
        euint8 newPriority = FHE.fromExternal(newEncryptedPriority, inputProof);

        // 2. Update the task
        tasks[msg.sender][taskIndex].title = newTitle;
        tasks[msg.sender][taskIndex].dueDate = newDueDate;
        tasks[msg.sender][taskIndex].priority = newPriority;

        // 3. Re-grant permissions for the new encrypted values
        FHE.allow(newTitle, msg.sender);
        FHE.allow(newDueDate, msg.sender);
        FHE.allow(newPriority, msg.sender);
        FHE.allowThis(newTitle);
        FHE.allowThis(newDueDate);
        FHE.allowThis(newPriority);
    }

    function shareTask(uint256 taskIndex, address recipient) public {
        require(taskIndex < tasks[msg.sender].length, "Task index out of bounds");

        Task storage task = tasks[msg.sender][taskIndex];

        // Grant decryption permission to the recipient
        FHE.allow(task.title, recipient);
        FHE.allow(task.dueDate, recipient);
        FHE.allow(task.priority, recipient);
    }

    function requestTasksDueSoonCount(externalEuint64 encryptedTimeMargin, bytes calldata inputProof) public {
        euint64 timeMargin = FHE.fromExternal(encryptedTimeMargin, inputProof);
        euint64 threshold = FHE.add(FHE.asEuint64(uint64(block.timestamp)), timeMargin);

        euint32 dueSoonCount = FHE.asEuint32(0);
        uint256 loopBound = tasks[msg.sender].length < 20 ? tasks[msg.sender].length : 20;

        for (uint256 i = 0; i < loopBound; i++) {
            Task memory task = tasks[msg.sender][i];
            ebool isDueSoon = FHE.le(task.dueDate, threshold);
            dueSoonCount = FHE.add(dueSoonCount, FHE.select(isDueSoon, FHE.asEuint32(1), FHE.asEuint32(0)));
        }

        bytes32[] memory cts = new bytes32[](1);
            FHE.allow(dueSoonCount, 0xa02Cda4Ca3a71D7C46997716F4283aa851C28812);
            cts[0] = FHE.toBytes32(dueSoonCount);    uint256 requestId = FHE.requestDecryption(cts, this.callbackCount.selector);
        console.log("FHE.requestDecryption called, requestId: ", requestId);
        requestInitiator[requestId] = msg.sender;
        emit DecryptionRequested(requestId, msg.sender);
    }

    function callbackCount(uint256 requestId, bytes memory cleartexts, bytes memory decryptionProof) public {
        // Only perform signature check on live networks, not on local hardhat test network (chainId 31337)
        if (block.chainid != 31337) {
            FHE.checkSignatures(requestId, cleartexts, decryptionProof);
        }

        address initiator = requestInitiator[requestId];
        require(initiator != address(0), "Request ID not found or already processed");

        (uint32 count) = abi.decode(cleartexts, (uint32));
        lastDueSoonCount[initiator] = count;

        delete requestInitiator[requestId];
    }

    /**
     * @dev Requests decryption of a specific task for the caller.
     * This function initiates the decryption process for FHEVM encrypted data.
     * @param taskIndex The index of the task to decrypt
     */
    function requestTaskDecryption(uint256 taskIndex) external {
        require(taskIndex < tasks[msg.sender].length, "Task does not exist");
        
        // Get the task
        Task storage task = tasks[msg.sender][taskIndex];
        
        // Create array of ciphertexts to decrypt
        bytes32[] memory ciphertexts = new bytes32[](3);
        ciphertexts[0] = FHE.toBytes32(task.title);
        ciphertexts[1] = FHE.toBytes32(task.dueDate);
        ciphertexts[2] = FHE.toBytes32(task.priority);
        
        // Request decryption
        uint256 requestId = FHE.requestDecryption(ciphertexts, this.taskDecryptionCallback.selector);
        
        // Store the request initiator
        requestInitiator[requestId] = msg.sender;
        
        emit DecryptionRequested(requestId, msg.sender);
    }

    /**
     * @dev Callback function called by the relayer after decryption.
     * This function receives the decrypted data and can process it.
     * @param requestId The ID of the decryption request
     * @param cleartexts The decrypted data
     * @param decryptionProof The proof of decryption
     */
    function taskDecryptionCallback(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external {
        // Verify the request was initiated by the caller
        require(requestInitiator[requestId] == msg.sender, "Unauthorized decryption request");
        
        // Verify the decryption proof
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);
        
        // Decode the decrypted data
        (uint64 decryptedTitle, uint64 decryptedDueDate, uint8 decryptedPriority) = 
            abi.decode(cleartexts, (uint64, uint64, uint8));
        
        // Emit event with decrypted data (for frontend to listen)
        emit TaskDecrypted(requestId, msg.sender, decryptedTitle, decryptedDueDate, decryptedPriority);
        
        // Clean up the request
        delete requestInitiator[requestId];
    }

    /**
     * @dev Event emitted when a task is successfully decrypted
     */
    event TaskDecrypted(
        uint256 indexed requestId,
        address indexed user,
        uint64 title,
        uint64 dueDate,
        uint8 priority
    );
}