pragma solidity 0.6.6;

import { BaseChildTunnel } from "@maticnetwork/pos-portal/contracts/tunnel/BaseChildTunnel.sol";
import "./IAlohaNFT.sol";

contract AlohaChildTunnel is BaseChildTunnel {
    address _alohaNFT;

    function _processMessageFromRoot(bytes memory message) internal override {
        (address owner, uint256 rarity, uint256 image, uint256 background) = abi.decode(message, (address, uint256, uint256, uint256));

        IAlohaNFT(_alohaNFT).awardItem(owner, rarity, image, background);
    }

    function transferNFT(uint256 tokenId) external {
        IAlohaNFT(_alohaNFT).transferFrom(msg.sender, address(this), tokenId);

        uint256 rarity = IAlohaNFT(_alohaNFT).tokenRarity(tokenId);
        uint256 image = IAlohaNFT(_alohaNFT).tokenImage(tokenId);
        uint256 background = IAlohaNFT(_alohaNFT).tokenBackground(tokenId);

        bytes memory bytes_data = abi.encode(msg.sender, rarity, image, background);

        _sendMessageToRoot(bytes_data);
    }

    function setAlohaNFT(address newAlohaNFT)
        external
        only(DEFAULT_ADMIN_ROLE)
    {
        require(newAlohaNFT != address(0x0), "AlohaChildTunnel: INVALID_ADDRESS");
        _alohaNFT = newAlohaNFT;
    }
}