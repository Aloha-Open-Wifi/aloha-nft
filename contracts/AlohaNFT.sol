pragma solidity 0.6.6;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "./AlohaNFTv1.sol";

contract AlohaNFT is ERC721, AccessControl {
    using SafeMath for uint256;
    using SafeMath for uint8;
    using Counters for Counters.Counter;
    
    Counters.Counter private _tokenIds;

    bytes32 public constant MINTER = keccak256("MINTER");

    address alohaNFTv1;
    mapping (uint256 => bool) public migratedTokens;

    mapping (uint256 => uint256) private _tokenRarities;
    mapping (uint256 => uint256) private _tokenImages;
    mapping (uint256 => uint256) private _tokenBackgrounds;

    constructor(
        address _alohaNFTv1
    ) public ERC721("ALOHA NFT", "ANFT") {
        _setupRole(DEFAULT_ADMIN_ROLE, msg.sender);

        alohaNFTv1 = _alohaNFTv1;
    }

    /**
    * @dev Mints a new ALOHA NFT for a wallet.
    */
    function awardItem(
        address wallet,
        uint256 rarity,
        uint256 image,
        uint256 background
    )
        public
        returns (uint256)
    {
        require(hasRole(MINTER, msg.sender), 'AlohaNFT: Only for role MINTER');

        _tokenIds.increment();

        uint256 newTokenId = _tokenIds.current();
        _mint(wallet, newTokenId);
        _setTokenImage(newTokenId, image);
        _setTokenRarity(newTokenId, rarity);
        _setTokenBackground(newTokenId, background);

        return newTokenId;
    }

    /**
    * @dev Returns the rarity for token.
    */
    function tokenRarity(uint256 tokenId) public view returns (uint256) {
        require(_exists(tokenId), "AlohaNFT: Query for nonexistent token");
        return _tokenRarities[tokenId];
    }

    /**
    * @dev Returns the image for token.
    */
    function tokenImage(uint256 tokenId) public view returns (uint256) {
        require(_exists(tokenId), "AlohaNFT: Query for nonexistent token");
        return _tokenImages[tokenId];
    }

    /**
    * @dev Returns the background for token.
    */
    function tokenBackground(uint256 tokenId) public view returns (uint256) {
        require(_exists(tokenId), "AlohaNFT: Query for nonexistent token");
        return _tokenBackgrounds[tokenId];
    }

    /**
    * @dev Aloha NFT v1 => Aloha NFT v2.
    */
    function migrateToken(uint256 v1TokenId) public returns (uint256) {
        require(!migratedTokens[v1TokenId], "AlohaNFT: Token already migrated");

        uint256 v1TokenRarity = AlohaNFTv1(alohaNFTv1).tokenRarity(v1TokenId);
        uint256 v1TokenImage = AlohaNFTv1(alohaNFTv1).tokenImage(v1TokenId);
        uint256 v1TokenBackground = AlohaNFTv1(alohaNFTv1).tokenBackground(v1TokenId);
        address v1TokenOwner = AlohaNFTv1(alohaNFTv1).ownerOf(v1TokenId);
        
        _tokenIds.increment();
        uint256 newTokenId = _tokenIds.current();

        migratedTokens[v1TokenId] = true;

        AlohaNFTv1(alohaNFTv1).transferFrom(v1TokenOwner, address(this), v1TokenId);

        _mint(v1TokenOwner, newTokenId);
        _setTokenImage(newTokenId, v1TokenImage);
        _setTokenRarity(newTokenId, v1TokenRarity);
        _setTokenBackground(newTokenId, v1TokenBackground);

        return newTokenId;
    }

    /**
    * @dev Updates the base URI
    */
    function setBaseURI(string memory _baseURI) public {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), 'AlohaNFT: Only for role DEFAULT_ADMIN_ROLE');

        _setBaseURI(_baseURI);
    }

    function _setTokenRarity(uint256 tokenId, uint256 _tokenRarity) internal virtual {
        require(_exists(tokenId), "ERC721Metadata: Rarity set of nonexistent token");
        _tokenRarities[tokenId] = _tokenRarity;
    }

    function _setTokenImage(uint256 tokenId, uint256 _tokenImage) internal virtual {
        require(_exists(tokenId), "AlohaNFT: Image set for nonexistent token");
        _tokenImages[tokenId] = _tokenImage;
    }

    function _setTokenBackground(uint256 tokenId, uint256 _tokenBackground) internal virtual {
        require(_exists(tokenId), "AlohaNFT: Background set for nonexistent token");
        _tokenBackgrounds[tokenId] = _tokenBackground;
    }

}