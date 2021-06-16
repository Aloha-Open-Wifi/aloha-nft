pragma solidity 0.6.6;

import "../../node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol";

// This contract is for demo purposes only
contract TokenMock is ERC20 {
    constructor () public ERC20("Token", "TOKN") {
        _mint(msg.sender, 10000000000000000000000000);
    }
}
