// SPDX-License-Identifier: MIT
// Updated for @fhevm/solidity@0.10.0 - New decryption API
pragma solidity ^0.8.24;

import { FHE, euint32, euint64, euint8, ebool, externalEuint64, externalEuint8 } from "@fhevm/solidity/lib/FHE.sol";
import { ZamaEthereumConfig } from "@fhevm/solidity/config/ZamaConfig.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract TaskManager is ZamaEthereumConfig, Ownable {

    // Enum to track the status of a task
    enum TaskStatus {
        Pending,
        Completed
    }

    // Struct to represent a task.
    struct Task {
        euint64 title;         // Encrypted title (as number)
        euint64 description;   // Encrypted description (as number)
        euint64 dueDate;       // Encrypted due date (Unix timestamp)
        euint8 priority;       // Encrypted priority (1-5)
        euint64 numericId;     // Optional numeric ID for sorting/filtering
        TaskStatus status;
    }

    // Mapping from a user's address to their list of tasks
    mapping(address => Task[]) public tasks;

    // Stable task IDs
    uint256 private _nextTaskId;
    mapping(address => mapping(uint256 => uint256)) public indexToTaskId;
    mapping(address => mapping(uint256 => uint256)) public taskIdToIndex;

    // Track shared tasks
    mapping(address => uint256[]) public sharedTasks;
    mapping(address => mapping(address => mapping(uint256 => bool))) public isTaskSharedWith;

    // Track tasks marked for public decryption
    mapping(address => mapping(uint256 => bool)) public isTaskDecryptionRequested;

    uint256 public taskCreationFee = 0.0001 ether;

    event TaskCreated(address indexed owner, uint256 indexed taskId);
    event TaskShared(uint256 indexed taskId, address indexed owner, address indexed recipient);
    event DecryptionRequested(uint256 indexed taskId, address indexed owner);
    event TaskDecrypted(uint256 indexed taskId, address indexed user, uint64 title, uint64 dueDate, uint8 priority);

    constructor() Ownable(msg.sender) {}

    function setFee(uint256 _newFee) external onlyOwner {
        taskCreationFee = _newFee;
    }

    function withdraw() external onlyOwner {
        // CEI Pattern: Cache balance before external call to prevent reentrancy
        uint256 balance = address(this).balance;
        require(balance > 0, "No balance to withdraw");

        (bool success, ) = owner().call{value: balance}("");
        require(success, "Withdrawal failed");
    }

    /**
     * @dev Creates a new confidential task for the caller.
     */
    function createTask(
        externalEuint64 encryptedTitle,
        externalEuint64 encryptedDueDate,
        externalEuint8 encryptedPriority,
        bytes calldata inputProof
    ) public payable {
        require(msg.value == taskCreationFee, "Incorrect fee sent");

        euint64 title = FHE.fromExternal(encryptedTitle, inputProof);
        euint64 dueDate = FHE.fromExternal(encryptedDueDate, inputProof);
        euint8 priority = FHE.fromExternal(encryptedPriority, inputProof);

        Task memory newTask = Task({
            title: title,
            description: FHE.asEuint64(0),
            dueDate: dueDate,
            priority: priority,
            numericId: FHE.asEuint64(0),
            status: TaskStatus.Pending
        });

        tasks[msg.sender].push(newTask);
        uint256 newId = ++_nextTaskId;
        uint256 newIndex = tasks[msg.sender].length - 1;
        indexToTaskId[msg.sender][newIndex] = newId;
        taskIdToIndex[msg.sender][newId] = newIndex;
        emit TaskCreated(msg.sender, newId);

        Task storage storedTask = tasks[msg.sender][newIndex];
        FHE.allow(storedTask.title, msg.sender);
        FHE.allow(storedTask.dueDate, msg.sender);
        FHE.allow(storedTask.priority, msg.sender);
        FHE.allow(storedTask.description, msg.sender);
        FHE.allowThis(storedTask.title);
        FHE.allowThis(storedTask.dueDate);
        FHE.allowThis(storedTask.priority);
        FHE.allowThis(storedTask.description);
    }

    /**
     * @dev Creates a new confidential task with text title and description.
     */
    function createTaskWithText(
        externalEuint64 encryptedTitle,
        externalEuint64 encryptedDescription,
        externalEuint64 encryptedDueDate,
        externalEuint8 encryptedPriority,
        bytes calldata inputProof
    ) public payable {
        require(msg.value == taskCreationFee, "Incorrect fee sent");

        euint64 title = FHE.fromExternal(encryptedTitle, inputProof);
        euint64 description = FHE.fromExternal(encryptedDescription, inputProof);
        euint64 dueDate = FHE.fromExternal(encryptedDueDate, inputProof);
        euint8 priority = FHE.fromExternal(encryptedPriority, inputProof);

        Task memory newTask = Task({
            title: title,
            description: description,
            dueDate: dueDate,
            priority: priority,
            numericId: FHE.asEuint64(0),
            status: TaskStatus.Pending
        });
        tasks[msg.sender].push(newTask);
        uint256 newId = ++_nextTaskId;
        uint256 newIndex = tasks[msg.sender].length - 1;
        indexToTaskId[msg.sender][newIndex] = newId;
        taskIdToIndex[msg.sender][newId] = newIndex;
        emit TaskCreated(msg.sender, newId);

        Task storage storedTask = tasks[msg.sender][newIndex];
        FHE.allow(storedTask.title, msg.sender);
        FHE.allow(storedTask.description, msg.sender);
        FHE.allow(storedTask.dueDate, msg.sender);
        FHE.allow(storedTask.priority, msg.sender);
        FHE.allowThis(storedTask.title);
        FHE.allowThis(storedTask.description);
        FHE.allowThis(storedTask.dueDate);
        FHE.allowThis(storedTask.priority);
    }

    /**
     * @dev Creates a new confidential task with numeric title and ID.
     */
    function createTaskWithNumbers(
        externalEuint64 encryptedTitle,
        externalEuint64 encryptedDueDate,
        externalEuint8 encryptedPriority,
        externalEuint64 encryptedNumericId,
        bytes calldata inputProof
    ) public payable {
        require(msg.value == taskCreationFee, "Incorrect fee sent");

        euint64 title = FHE.fromExternal(encryptedTitle, inputProof);
        euint64 dueDate = FHE.fromExternal(encryptedDueDate, inputProof);
        euint8 priority = FHE.fromExternal(encryptedPriority, inputProof);
        euint64 numericId = FHE.fromExternal(encryptedNumericId, inputProof);

        Task memory newTask = Task({
            title: title,
            description: FHE.asEuint64(0),
            dueDate: dueDate,
            priority: priority,
            numericId: numericId,
            status: TaskStatus.Pending
        });
        tasks[msg.sender].push(newTask);
        uint256 newId = ++_nextTaskId;
        uint256 newIndex = tasks[msg.sender].length - 1;
        indexToTaskId[msg.sender][newIndex] = newId;
        taskIdToIndex[msg.sender][newId] = newIndex;
        emit TaskCreated(msg.sender, newId);

        Task storage storedTask = tasks[msg.sender][newIndex];
        FHE.allow(storedTask.title, msg.sender);
        FHE.allow(storedTask.dueDate, msg.sender);
        FHE.allow(storedTask.priority, msg.sender);
        FHE.allow(storedTask.numericId, msg.sender);
        FHE.allow(storedTask.description, msg.sender);
        FHE.allowThis(storedTask.title);
        FHE.allowThis(storedTask.dueDate);
        FHE.allowThis(storedTask.priority);
        FHE.allowThis(storedTask.numericId);
        FHE.allowThis(storedTask.description);
    }

    function getTasks(address user) public view returns (Task[] memory) {
        return tasks[user];
    }

    function getTaskId(address owner_, uint256 index) external view returns (uint256) {
        return indexToTaskId[owner_][index];
    }

    function getTaskIndex(address owner_, uint256 taskId) external view returns (uint256) {
        return taskIdToIndex[owner_][taskId];
    }

    function completeTask(uint256 taskIndex) public {
        require(taskIndex < tasks[msg.sender].length, "Task index out of bounds");
        tasks[msg.sender][taskIndex].status = TaskStatus.Completed;
    }

    function deleteTaskById(uint256 taskId) public {
        uint256 idx = taskIdToIndex[msg.sender][taskId];
        require(idx < tasks[msg.sender].length, "Task does not exist");
        uint256 lastIdx = tasks[msg.sender].length - 1;
        if (idx != lastIdx) {
            tasks[msg.sender][idx] = tasks[msg.sender][lastIdx];
            uint256 movedId = indexToTaskId[msg.sender][lastIdx];
            indexToTaskId[msg.sender][idx] = movedId;
            taskIdToIndex[msg.sender][movedId] = idx;
        }
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

        euint64 newTitle = FHE.fromExternal(newEncryptedTitle, inputProof);
        euint64 newDueDate = FHE.fromExternal(newEncryptedDueDate, inputProof);
        euint8 newPriority = FHE.fromExternal(newEncryptedPriority, inputProof);

        tasks[msg.sender][taskIndex].title = newTitle;
        tasks[msg.sender][taskIndex].dueDate = newDueDate;
        tasks[msg.sender][taskIndex].priority = newPriority;

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

        FHE.allow(task.title, recipient);
        FHE.allow(task.description, recipient);
        FHE.allow(task.dueDate, recipient);
        FHE.allow(task.priority, recipient);

        if (!isTaskSharedWith[recipient][msg.sender][taskId]) {
            sharedTasks[recipient].push(taskId);
            isTaskSharedWith[recipient][msg.sender][taskId] = true;
        }

        emit TaskShared(taskId, msg.sender, recipient);
    }

    function getSharedTasks(address recipient) public view returns (uint256[] memory) {
        return sharedTasks[recipient];
    }

    // ============================================
    // NEW DECRYPTION API (fhevm/solidity 0.10.0)
    // ============================================

    /**
     * @dev Marks a task's encrypted fields as publicly decryptable.
     * After calling this, the frontend can use relayer-sdk publicDecrypt()
     * to get the cleartext values off-chain.
     * @param taskId The stable task identifier
     */
    function requestTaskDecryptionById(uint256 taskId) external {
        uint256 taskIndex = taskIdToIndex[msg.sender][taskId];
        require(taskIndex < tasks[msg.sender].length, "Task does not exist");

        Task storage task = tasks[msg.sender][taskIndex];

        // Mark all encrypted fields as publicly decryptable
        FHE.makePubliclyDecryptable(task.title);
        FHE.makePubliclyDecryptable(task.dueDate);
        FHE.makePubliclyDecryptable(task.priority);
        FHE.makePubliclyDecryptable(task.description);

        isTaskDecryptionRequested[msg.sender][taskId] = true;

        emit DecryptionRequested(taskId, msg.sender);
    }

    /**
     * @dev Marks a shared task's encrypted fields as publicly decryptable.
     * @param taskId The stable task identifier
     * @param originalOwner The address of the task's original owner
     */
    function requestSharedTaskDecryptionById(uint256 taskId, address originalOwner) external {
        require(isTaskSharedWith[msg.sender][originalOwner][taskId], "Task is not shared with you");

        uint256 taskIndex = taskIdToIndex[originalOwner][taskId];
        require(taskIndex < tasks[originalOwner].length, "Task does not exist for owner");

        Task storage task = tasks[originalOwner][taskIndex];

        // Mark all encrypted fields as publicly decryptable
        FHE.makePubliclyDecryptable(task.title);
        FHE.makePubliclyDecryptable(task.dueDate);
        FHE.makePubliclyDecryptable(task.priority);
        FHE.makePubliclyDecryptable(task.description);

        emit DecryptionRequested(taskId, originalOwner);
    }

    /**
     * @dev Returns the encrypted handles for a task (for frontend to use with publicDecrypt).
     * @param taskId The stable task identifier
     * @return handles Array of bytes32 handles [title, dueDate, priority, description]
     */
    function getTaskHandles(uint256 taskId) external view returns (bytes32[4] memory handles) {
        uint256 taskIndex = taskIdToIndex[msg.sender][taskId];
        require(taskIndex < tasks[msg.sender].length, "Task does not exist");

        Task storage task = tasks[msg.sender][taskIndex];
        handles[0] = FHE.toBytes32(task.title);
        handles[1] = FHE.toBytes32(task.dueDate);
        handles[2] = FHE.toBytes32(task.priority);
        handles[3] = FHE.toBytes32(task.description);
    }

    /**
     * @dev Returns the encrypted handles for a shared task.
     * @param taskId The stable task identifier
     * @param originalOwner The address of the task's original owner
     * @return handles Array of bytes32 handles [title, dueDate, priority, description]
     */
    function getSharedTaskHandles(uint256 taskId, address originalOwner) external view returns (bytes32[4] memory handles) {
        require(isTaskSharedWith[msg.sender][originalOwner][taskId], "Task is not shared with you");

        uint256 taskIndex = taskIdToIndex[originalOwner][taskId];
        require(taskIndex < tasks[originalOwner].length, "Task does not exist for owner");

        Task storage task = tasks[originalOwner][taskIndex];
        handles[0] = FHE.toBytes32(task.title);
        handles[1] = FHE.toBytes32(task.dueDate);
        handles[2] = FHE.toBytes32(task.priority);
        handles[3] = FHE.toBytes32(task.description);
    }

    /**
     * @dev Verifies and finalizes task decryption with proof from off-chain decryption.
     * Frontend calls this after getting cleartext values from publicDecrypt().
     * @param taskId The stable task identifier
     * @param clearTitle The decrypted title
     * @param clearDueDate The decrypted due date
     * @param clearPriority The decrypted priority
     * @param decryptionProof The proof from relayer-sdk publicDecrypt()
     */
    function finalizeTaskDecryption(
        uint256 taskId,
        uint64 clearTitle,
        uint64 clearDueDate,
        uint8 clearPriority,
        uint64 clearDescription,
        bytes memory decryptionProof
    ) external {
        uint256 taskIndex = taskIdToIndex[msg.sender][taskId];
        require(taskIndex < tasks[msg.sender].length, "Task does not exist");
        require(isTaskDecryptionRequested[msg.sender][taskId], "Decryption not requested");

        Task storage task = tasks[msg.sender][taskIndex];

        // Build handles array in same order as values
        bytes32[] memory handlesList = new bytes32[](4);
        handlesList[0] = FHE.toBytes32(task.title);
        handlesList[1] = FHE.toBytes32(task.dueDate);
        handlesList[2] = FHE.toBytes32(task.priority);
        handlesList[3] = FHE.toBytes32(task.description);

        // ABI encode the cleartext values in same order
        bytes memory abiEncodedCleartexts = abi.encode(clearTitle, clearDueDate, clearPriority, clearDescription);

        // Verify the decryption proof
        FHE.checkSignatures(handlesList, abiEncodedCleartexts, decryptionProof);

        // Emit event with verified decrypted data
        emit TaskDecrypted(taskId, msg.sender, clearTitle, clearDueDate, clearPriority);

        // Clean up
        isTaskDecryptionRequested[msg.sender][taskId] = false;
    }
}
