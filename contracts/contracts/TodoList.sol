// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, externalEuint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract TodoList is SepoliaConfig {
    struct Task {
        euint32 encryptedContent;
        ebool completed;
    }

    mapping(address => Task[]) private tasks;
    mapping(address => uint256) public taskCount;

    event TaskAdded(address indexed owner, uint256 taskId);
    event TaskCompleted(address indexed owner, uint256 taskId);

    /// @notice Adds a new encrypted task for the caller.
    /// @param encryptedTask The encrypted content of the task (as a number).
    /// @param inputProof The ZK proof for the encrypted input.
    function addTask(externalEuint32 encryptedTask, bytes calldata inputProof) external {
        uint256 taskId = tasks[msg.sender].length;
        euint32 taskContent = FHE.fromExternal(encryptedTask, inputProof);

        tasks[msg.sender].push(
            Task({
                encryptedContent: taskContent,
                completed: FHE.asEbool(false)
            })
        );

        FHE.allowThis(tasks[msg.sender][taskId].encryptedContent);
        FHE.allow(tasks[msg.sender][taskId].encryptedContent, msg.sender);
        FHE.allowThis(tasks[msg.sender][taskId].completed);
        FHE.allow(tasks[msg.sender][taskId].completed, msg.sender);

        taskCount[msg.sender]++;
        emit TaskAdded(msg.sender, taskId);
    }

    /// @notice Marks a task as complete for the caller.
    /// @param _taskId The ID of the task to mark as complete.
    function completeTask(uint256 _taskId) external {
        require(_taskId < tasks[msg.sender].length, "Task does not exist");
        tasks[msg.sender][_taskId].completed = FHE.asEbool(true);
        // Re-allow permissions on the modified value
        FHE.allowThis(tasks[msg.sender][_taskId].completed);
        FHE.allow(tasks[msg.sender][_taskId].completed, msg.sender);
        emit TaskCompleted(msg.sender, _taskId);
    }

    /// @notice Retrieves all tasks for the caller.
    /// @return An array of the caller's tasks.
    function getTasks() external view returns (Task[] memory) {
        return tasks[msg.sender];
    }
}
