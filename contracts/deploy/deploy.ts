import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const deployedTaskManager = await deploy("TaskManager", {
    from: deployer,
    log: true,
  });

  console.log(`TaskManager contract: `, deployedTaskManager.address);

  const deployedTodoList = await deploy("TodoList", {
    from: deployer,
    log: true,
  });

  console.log(`TodoList contract: `, deployedTodoList.address);
};
export default func;
func.id = "deploy_taskManager_and_todoList"; // id required to prevent reexecution
func.tags = ["TaskManager", "TodoList"];
