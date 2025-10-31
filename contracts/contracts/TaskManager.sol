// SPDX-License-Identifier: MIT
// AI ASSISTANT PROOF - MODIFIED AT 15:35 UTC
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
    // The title and description will be encrypted as text.
    struct Task {
        euint64 title;         // Encrypted title (as number)
        euint64 description;   // Encrypted description (as number)
        euint64 dueDate;       // Encrypted due date (Unix timestamp)
        euint8 priority;       // Encrypted priority (1-5)
        euint64 numericId;     // Optional numeric ID for sorting/filtering
        TaskStatus status;
    }

    // Mapping from a user's address to their list of tasks (array kept for storage)
    mapping(address => Task[]) public tasks;
    // Stable task IDs
    uint256 private _nextTaskId;
    // owner => index => taskId
    mapping(address => mapping(uint256 => uint256)) public indexToTaskId;
    // owner => taskId => index
    mapping(address => mapping(uint256 => uint256)) public taskIdToIndex;

    mapping(address => uint32) public lastDueSoonCount;
    mapping(uint256 => address) public requestInitiator;

    // NEW: Track shared tasks
    mapping(address => uint256[]) public sharedTasks; // recipient => task indices (index-only list; owner must be specified separately)
    // Owner-aware sharing guard: recipient => owner => taskIndex => is shared
    mapping(address => mapping(address => mapping(uint256 => bool))) public isTaskSharedWith;

    uint256 public taskCreationFee = 0.0001 ether;

        event DecryptionRequested(uint256 requestId, address indexed initiator);
        event TaskCreated(address indexed owner, uint256 indexed taskId);
        event TaskShared(uint256 indexed taskId, address indexed owner, address indexed recipient);
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
                description: FHE.asEuint64(0), // Empty description for backward compatibility
                dueDate: dueDate,
                priority: priority,
                numericId: FHE.asEuint64(0), // No numeric ID for backward compatibility
                status: TaskStatus.Pending
            });

            tasks[msg.sender].push(newTask);
            uint256 newId = ++_nextTaskId;
            uint256 newIndex = tasks[msg.sender].length - 1;
            indexToTaskId[msg.sender][newIndex] = newId;
            taskIdToIndex[msg.sender][newId] = newIndex;
            emit TaskCreated(msg.sender, newId);

            emit Debug("Task pushed", 5);

    

            // 3. Grant permissions for the user to decrypt their own task details (use stored task handles)
            Task storage storedTaskCreate = tasks[msg.sender][tasks[msg.sender].length - 1];

            FHE.allow(storedTaskCreate.title, msg.sender);
            FHE.allow(storedTaskCreate.dueDate, msg.sender);
            FHE.allow(storedTaskCreate.priority, msg.sender);
            FHE.allow(storedTaskCreate.description, msg.sender);

            // 4. Grant contract permission to read the values for future operations
            FHE.allowThis(storedTaskCreate.title);
            FHE.allowThis(storedTaskCreate.dueDate);
            FHE.allowThis(storedTaskCreate.priority);
            FHE.allowThis(storedTaskCreate.description);

            emit Debug("Permissions granted", 6);

        }

    /**
     * @dev Creates a new confidential task with text title and description.
     * @param encryptedTitle The encrypted title of the task (as number).
     * @param encryptedDescription The encrypted description of the task (as number).
     * @param encryptedDueDate The encrypted due date of the task.
     * @param encryptedPriority The encrypted priority of the task (1-5).
     * @param inputProof The ZK proof for the encrypted inputs.
     */
    function createTaskWithText(
        externalEuint64 encryptedTitle,
        externalEuint64 encryptedDescription,
        externalEuint64 encryptedDueDate,
        externalEuint8 encryptedPriority,
        bytes calldata inputProof
    ) public payable {
        emit Debug("createTaskWithText started", 0);
        require(msg.value == taskCreationFee, "Incorrect fee sent");
        emit Debug("Fee checked", 1);

        // Validate inputs
        euint64 title = FHE.fromExternal(encryptedTitle, inputProof);
        emit Debug("fromExternal title done", 2);
        euint64 description = FHE.fromExternal(encryptedDescription, inputProof);
        emit Debug("fromExternal description done", 3);
        euint64 dueDate = FHE.fromExternal(encryptedDueDate, inputProof);
        emit Debug("fromExternal dueDate done", 4);
        euint8 priority = FHE.fromExternal(encryptedPriority, inputProof);
        emit Debug("fromExternal priority done", 5);

        // Create task with text
        Task memory newTask = Task({
            title: title,
            description: description,
            dueDate: dueDate,
            priority: priority,
            numericId: FHE.asEuint64(0), // No numeric ID for text tasks
            status: TaskStatus.Pending
        });
        tasks[msg.sender].push(newTask);
        {
            uint256 newId = ++_nextTaskId;
            uint256 newIndex = tasks[msg.sender].length - 1;
            indexToTaskId[msg.sender][newIndex] = newId;
            taskIdToIndex[msg.sender][newId] = newIndex;
            emit TaskCreated(msg.sender, newId);
        }
        emit Debug("Task pushed", 6);

        // CRITICAL: Grant permissions AFTER storing the task
        // Use the stored task reference to ensure correct handles
        Task storage storedTask = tasks[msg.sender][tasks[msg.sender].length - 1];
        
        // Grant user decryption permissions
        FHE.allow(storedTask.title, msg.sender);
        FHE.allow(storedTask.description, msg.sender);
        FHE.allow(storedTask.dueDate, msg.sender);
        FHE.allow(storedTask.priority, msg.sender);
        
        // Grant contract permissions for operations
        FHE.allowThis(storedTask.title);
        FHE.allowThis(storedTask.description);
        FHE.allowThis(storedTask.dueDate);
        FHE.allowThis(storedTask.priority);
        emit Debug("Permissions granted", 7);
    }

    /**
     * @dev Creates a new confidential task with numeric title and ID.
     * @param encryptedTitle The encrypted title of the task (as number).
     * @param encryptedDueDate The encrypted due date of the task.
     * @param encryptedPriority The encrypted priority of the task (1-5).
     * @param encryptedNumericId The encrypted numeric ID for the task.
     * @param inputProof The ZK proof for the encrypted inputs.
     */
    function createTaskWithNumbers(
        externalEuint64 encryptedTitle,
        externalEuint64 encryptedDueDate,
        externalEuint8 encryptedPriority,
        externalEuint64 encryptedNumericId,
        bytes calldata inputProof
    ) public payable {
        emit Debug("createTaskWithNumbers started", 0);
        require(msg.value == taskCreationFee, "Incorrect fee sent");
        emit Debug("Fee checked", 1);

        // Validate inputs
        euint64 title = FHE.fromExternal(encryptedTitle, inputProof);
        emit Debug("fromExternal title done", 2);
        euint64 dueDate = FHE.fromExternal(encryptedDueDate, inputProof);
        emit Debug("fromExternal dueDate done", 3);
        euint8 priority = FHE.fromExternal(encryptedPriority, inputProof);
        emit Debug("fromExternal priority done", 4);
        euint64 numericId = FHE.fromExternal(encryptedNumericId, inputProof);
        emit Debug("fromExternal numericId done", 5);

        // Create task with numbers
        Task memory newTask = Task({
            title: title,
            description: FHE.asEuint64(0), // Empty description for numeric tasks
            dueDate: dueDate,
            priority: priority,
            numericId: numericId,
            status: TaskStatus.Pending
        });
        tasks[msg.sender].push(newTask);
        {
            uint256 newId = ++_nextTaskId;
            uint256 newIndex = tasks[msg.sender].length - 1;
            indexToTaskId[msg.sender][newIndex] = newId;
            taskIdToIndex[msg.sender][newId] = newIndex;
            emit TaskCreated(msg.sender, newId);
        }
        emit Debug("Task pushed", 6);

        // Grant permissions using stored task handles
        Task storage storedTaskNumbers = tasks[msg.sender][tasks[msg.sender].length - 1];
        FHE.allow(storedTaskNumbers.title, msg.sender);
        FHE.allow(storedTaskNumbers.dueDate, msg.sender);
        FHE.allow(storedTaskNumbers.priority, msg.sender);
        FHE.allow(storedTaskNumbers.numericId, msg.sender);
        FHE.allow(storedTaskNumbers.description, msg.sender);
        FHE.allowThis(storedTaskNumbers.title);
        FHE.allowThis(storedTaskNumbers.dueDate);
        FHE.allowThis(storedTaskNumbers.priority);
        FHE.allowThis(storedTaskNumbers.numericId);
        FHE.allowThis(storedTaskNumbers.description);
        emit Debug("Permissions granted", 7);
    }

    function getTasks(address user) public view returns (Task[] memory) {
        return tasks[user];
    }

    // Helper: get taskId by owner + index
    function getTaskId(address owner_, uint256 index) external view returns (uint256) {
        return indexToTaskId[owner_][index];
    }

    // Helper: get current index for a given owner + taskId
    function getTaskIndex(address owner_, uint256 taskId) external view returns (uint256) {
        return taskIdToIndex[owner_][taskId];
    }

    function completeTask(uint256 taskIndex) public {
        require(taskIndex < tasks[msg.sender].length, "Task index out of bounds");
        tasks[msg.sender][taskIndex].status = TaskStatus.Completed;
    }

    // New: delete by stable taskId (updates index mappings to avoid broken references)
    function deleteTaskById(uint256 taskId) public {
        uint256 idx = taskIdToIndex[msg.sender][taskId];
        require(idx < tasks[msg.sender].length, "Task does not exist");
        uint256 lastIdx = tasks[msg.sender].length - 1;
        if (idx != lastIdx) {
            // Move last to idx
            tasks[msg.sender][idx] = tasks[msg.sender][lastIdx];
            uint256 movedId = indexToTaskId[msg.sender][lastIdx];
            indexToTaskId[msg.sender][idx] = movedId;
            taskIdToIndex[msg.sender][movedId] = idx;
        }
        // Clean last
        tasks[msg.sender].pop();
        delete indexToTaskId[msg.sender][lastIdx];
        delete taskIdToIndex[msg.sender][taskId];
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

    function shareTaskById(uint256 taskId, address recipient) public {
        uint256 taskIndex = taskIdToIndex[msg.sender][taskId];
        require(taskIndex < tasks[msg.sender].length, "Task does not exist");

        Task storage task = tasks[msg.sender][taskIndex];
        require(task.status == TaskStatus.Pending, "Task already completed");

        // Grant decryption permission to the recipient for the core fields
        FHE.allow(task.title, recipient);
        FHE.allow(task.description, recipient);
        FHE.allow(task.dueDate, recipient);
        FHE.allow(task.priority, recipient);
        
        // Track the shared task
        if (!isTaskSharedWith[recipient][msg.sender][taskId]) {
            sharedTasks[recipient].push(taskId);
            isTaskSharedWith[recipient][msg.sender][taskId] = true;
        }
        
        // Emit event for frontend to listen
        emit TaskShared(taskId, msg.sender, recipient);
    }

    // Function to get all shared task IDs for a recipient
    function getSharedTasks(address recipient) public view returns (uint256[] memory) {
        return sharedTasks[recipient];
    }

    // Backward-compat: share by index (maps to stable taskId)
    function shareTask(uint256 taskIndex, address recipient) public {
        require(taskIndex < tasks[msg.sender].length, "Task index out of bounds");
        uint256 taskId = indexToTaskId[msg.sender][taskIndex];
        shareTaskById(taskId, recipient);
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
        cts[0] = FHE.toBytes32(dueSoonCount);
        uint256 requestId = FHE.requestDecryption(cts, this.callbackCount.selector);
        console.log("FHE.requestDecryption called, requestId: ", requestId);
        requestInitiator[requestId] = msg.sender;
        emit DecryptionRequested(requestId, msg.sender);
    }

    function callbackCount(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory decryptionProof
    ) external {
        // Verify signatures from KMS relayer
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);

        address initiator = requestInitiator[requestId];
        require(initiator != address(0), "Request ID not found or already processed");

        (uint32 count) = abi.decode(cleartexts, (uint32));
        lastDueSoonCount[initiator] = count;
        delete requestInitiator[requestId];
    }

    /**
     * @dev Requests decryption of a specific task for the caller (by stable taskId).
     * This function initiates the decryption process for FHEVM encrypted data.
     * @param taskId The stable task identifier
     */
    function requestTaskDecryptionById(uint256 taskId) external {
        uint256 taskIndex = taskIdToIndex[msg.sender][taskId];
        require(taskIndex < tasks[msg.sender].length, "Task does not exist");
        
        // Get the task
        Task storage task = tasks[msg.sender][taskIndex];
        
        // Create array of ciphertexts to decrypt (include description as 4th item)
        bytes32[] memory ciphertexts = new bytes32[](4);
        ciphertexts[0] = FHE.toBytes32(task.title);
        ciphertexts[1] = FHE.toBytes32(task.dueDate);
        ciphertexts[2] = FHE.toBytes32(task.priority);
        ciphertexts[3] = FHE.toBytes32(task.description);
        
        // Request decryption
        uint256 requestId = FHE.requestDecryption(ciphertexts, this.taskDecryptionCallback.selector);
        
        // Store the request initiator
        requestInitiator[requestId] = msg.sender;
        
        emit DecryptionRequested(requestId, msg.sender);
    }

    // Backward-compat: request decrypt by legacy index
    function requestTaskDecryption(uint256 taskIndex) external {
        require(taskIndex < tasks[msg.sender].length, "Task does not exist");
        uint256 taskId = indexToTaskId[msg.sender][taskIndex];
        this.requestTaskDecryptionById(taskId);
    }

    /**
     * @dev Requests decryption of a shared task (for recipients) using stable taskId.
     * This allows users to decrypt tasks that were shared with them.
     * @param taskId The stable task identifier
     * @param originalOwner The address of the task's original owner
     */
    function requestSharedTaskDecryptionById(uint256 taskId, address originalOwner) external {
        // Check if this task was shared with the caller
        require(isTaskSharedWith[msg.sender][originalOwner][taskId], "Task is not shared with you");
        
        // Resolve owner's index
        uint256 taskIndex = taskIdToIndex[originalOwner][taskId];
        require(taskIndex < tasks[originalOwner].length, "Task does not exist for owner");
        
        // Get the task from the original owner
        Task storage task = tasks[originalOwner][taskIndex];
        
        // Create array of ciphertexts to decrypt (include description as 4th item)
        bytes32[] memory ciphertexts = new bytes32[](4);
        ciphertexts[0] = FHE.toBytes32(task.title);
        ciphertexts[1] = FHE.toBytes32(task.dueDate);
        ciphertexts[2] = FHE.toBytes32(task.priority);
        ciphertexts[3] = FHE.toBytes32(task.description);
        
        // Request decryption
        uint256 requestId = FHE.requestDecryption(ciphertexts, this.taskDecryptionCallback.selector);
        
        // Store the request initiator
        requestInitiator[requestId] = msg.sender;
        
        emit DecryptionRequested(requestId, msg.sender);
    }

    // Backward-compat: shared decrypt by legacy index
    function requestSharedTaskDecryption(uint256 taskIndex, address originalOwner) external {
        require(taskIndex < tasks[originalOwner].length, "Task does not exist for owner");
        uint256 taskId = indexToTaskId[originalOwner][taskIndex];
        this.requestSharedTaskDecryptionById(taskId, originalOwner);
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
        // Verify the decryption proof
        FHE.checkSignatures(requestId, cleartexts, decryptionProof);
        
        address initiator = requestInitiator[requestId];
        require(initiator != address(0), "Request ID not found or already processed");

        // Decode the decrypted data (now includes description as 4th item)
        (uint64 decryptedTitle, uint64 decryptedDueDate, uint8 decryptedPriority, uint64 _decryptedDescription) = 
            abi.decode(cleartexts, (uint64, uint64, uint8, uint64));
        
        // Emit event with decrypted data (for frontend to listen)
        emit TaskDecrypted(requestId, initiator, decryptedTitle, decryptedDueDate, decryptedPriority);
        
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