pragma solidity ^0.6.6;

interface IAlohaNFT {
    function awardItem(
        address wallet,
        uint256 tokenImage,
        uint256 tokenRarity,
        uint256 tokenBackground
    ) external returns (uint256);

    function transferFrom(address from, address to, uint256 tokenId) external;
    function tokenRarity(uint256 tokenId) external returns (uint256);
    function tokenImage(uint256 tokenId) external returns (uint256);
    function tokenBackground(uint256 tokenId) external returns (uint256);
}
