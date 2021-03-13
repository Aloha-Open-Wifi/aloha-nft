pragma solidity ^0.6.0;

interface IAlohaNFT {
    function awardItem(
        address wallet,
        uint256 tokenImage,
        uint256 tokenRarity,
        uint256 tokenBackground
    ) external returns (uint256);
}
