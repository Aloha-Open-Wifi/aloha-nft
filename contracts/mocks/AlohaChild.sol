pragma solidity 0.6.6;

import "../../node_modules/@openzeppelin/contracts/math/SafeMath.sol";
import "./Aloha.sol";

contract AlohaChild is Aloha {
    using SafeMath for uint256;
    address public childChainManagerProxy;
    address deployer;

    constructor () public Aloha() {
        childChainManagerProxy = 0xA6FA4fB5f76172d178d61B04b0ecd319C5d1C0aa;
        deployer = msg.sender;
    }

    function updateChildChainManager(address newChildChainManagerProxy) external {
        require(newChildChainManagerProxy != address(0), "Bad ChildChainManagerProxy address");
        require(msg.sender == deployer, "You're not allowed");

        childChainManagerProxy = newChildChainManagerProxy;
    }

    function deposit(address user, bytes calldata depositData) external {
        require(msg.sender == childChainManagerProxy, "You're not allowed to deposit");

        uint256 amount = abi.decode(depositData, (uint256));
        _mint(user, amount);
    }

    function withdraw(uint256 amount) external {
        _burn(_msgSender(), amount);
    }
}
