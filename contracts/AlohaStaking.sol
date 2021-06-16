pragma solidity 0.6.6;
pragma experimental ABIEncoderV2;

import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";
import "../node_modules/@openzeppelin/contracts/math/SafeMath.sol";
import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../node_modules/@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./IAlohaNFT.sol";

contract AlohaStaking is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    using SafeMath for uint8;

    /* Events */
    event SettedPool(
        uint256 indexed alohaAmount,
        uint256 indexed erc20Amount,
        uint256 duration,
        uint256 rarity,
        uint256 date
    );
    event Staked(
        address indexed wallet,
        address indexed erc20Address,
        uint256 rarity,
        uint256 endDate,
        uint256 tokenImage,
        uint256 tokenBackground,
        uint256 alohaAmount,
        uint256 erc20Amount,
        uint256 date
    );
    event Withdrawal(
        address indexed wallet,
        address indexed erc20Address,
        uint256 rarity,
        uint256 originalAlohaAmount,
        uint256 originalErc20Amount,
        uint256 receivedAlohaAmount,
        uint256 receivedErc20Amount,
        uint256 erc721Id,
        uint256 date
    );
    event Transfered(
        address indexed wallet,
        address indexed erc20Address,
        uint256 amount,
        uint256 date
    );

    /* Vars */
    uint256 public fee;
    address public alohaERC20;
    address public alohaERC721;
    uint256 public backgrounds;
    address[] public feesDestinators;
    uint256[] public feesPercentages;

    struct Pool {
        uint256 alohaAmount;
        uint256 erc20Amount; // 0 when is not a PairPool
        uint256 duration;
        uint256 rarity;
    }
    struct Stake {
        uint256 endDate;
        uint256 tokenImage;
        uint256 tokenBackground;
        uint256 alohaAmount;
        uint256 erc20Amount;  // 0 when is not a PairPool
    }

    // image => rarity
    mapping (uint256 => uint256) public rewardsMap;
    // rarity => [image]
    mapping (uint256 => uint256[]) public rarityByImages;
    // rarity => totalImages
    mapping (uint256 => uint256) public rarityByImagesTotal;
    // image => rarity => limit
    mapping (uint256 => mapping(uint256 => uint256)) public limitByRarityAndImage;
    // image => rarity => totalTokens
    mapping (uint256 => mapping(uint256 => uint256)) public totalTokensByRarityAndImage;
    // erc20Address => rarity => Pool
    mapping (address => mapping(uint256 => Pool)) public poolsMap;
    // userAddress => erc20Address => rarity => Stake 
    mapping (address => mapping(address => mapping(uint256 => Stake))) public stakingsMap;
    // erc20Address => totalStaked 
    mapping (address => uint256) public totalStaked;

    /* Modifiers */
    modifier imageNotExists(uint256 _image) {
        require(
            !_existsReward(_image),
            "AlohaStaking: Image for reward already exists"
        );
        _;
    }
    modifier validRarity(uint256 _rarity) {
        require(
            _rarity >= 1 && _rarity <= 3,
            "AlohaStaking: Rarity must be 1, 2 or 3"
        );
        _;
    }
    modifier poolExists(address _erc20, uint256 _rarity) {
        require(
            _existsPool(_erc20, _rarity),
            "AlohaStaking: Pool for ERC20 Token and rarity not exists"
        );
        _;
    }
    modifier rarityAvailable(uint256 _rarity) {
        require(
            !(rarityByImagesTotal[_rarity] == 0),
            "AlohaStaking: Rarity not available"
        );
        _;
    }
    modifier addressNotInStake(address _userAddress, address _erc20, uint256 _rarity) {
        require(
            (stakingsMap[msg.sender][_erc20][_rarity].endDate == 0),
            "AlohaStaking: Address already stakes in this pool"
        );
        _;
    }
    modifier addressInStake(address _userAddress, address _erc20, uint256 _rarity) {
        require(
            !(stakingsMap[msg.sender][_erc20][_rarity].endDate == 0),
            "AlohaStaking: Address not stakes in this pool"
        );
        _;
    }
    modifier stakeEnded(address _userAddress, address _erc20, uint256 _rarity) {
        require(
            (_getTime() > stakingsMap[msg.sender][_erc20][_rarity].endDate),
            "AlohaStaking: Stake duration has not ended yet"
        );
        _;
    }

    /* Public Functions */
    constructor(
        address _alohaERC20,
        address _alohaERC721,
        uint256 _backgrounds,
        uint256 _fee
    ) public {
        require(address(_alohaERC20) != address(0)); 
        require(address(_alohaERC721) != address(0));

        alohaERC20 = _alohaERC20;
        alohaERC721 = _alohaERC721;
        backgrounds = _backgrounds;
        fee = _fee;
    }

    /**
    * @dev Stake ALOHA to get a random token of the selected rarity
    */
    function simpleStake(
        uint256 _tokenRarity
    )
        public
    {
        pairStake(alohaERC20, _tokenRarity);
    }

    /**
    * @dev Stake ALOHA/TOKEN to get a random token of the selected rarity
    */
    function pairStake(
        address _erc20Token,
        uint256 _tokenRarity
    )
        public
        rarityAvailable(_tokenRarity)
        poolExists(_erc20Token, _tokenRarity)
        addressNotInStake(msg.sender, _erc20Token, _tokenRarity)
    {
        uint256 randomImage = _getRandomImage(_tokenRarity);
        uint256 _endDate = _getTime() + poolsMap[_erc20Token][_tokenRarity].duration;
        uint256 randomBackground = _randomB(backgrounds);

        uint256 alohaAmount = poolsMap[_erc20Token][_tokenRarity].alohaAmount;
        uint256 erc20Amount = poolsMap[_erc20Token][_tokenRarity].erc20Amount;

        _transferStake(msg.sender, alohaERC20, alohaAmount);
        totalStaked[alohaERC20] += alohaAmount;
        
        if (_erc20Token != alohaERC20) {
            _transferStake(msg.sender, _erc20Token, erc20Amount);
            totalStaked[_erc20Token] += erc20Amount;
        }

        stakingsMap[msg.sender][_erc20Token][_tokenRarity] = Stake({
            endDate: _endDate,
            tokenImage: randomImage,
            tokenBackground: randomBackground,
            alohaAmount: alohaAmount,
            erc20Amount: erc20Amount
        });

        emit Staked(
            msg.sender,
            _erc20Token,
            _tokenRarity,
            _endDate,
            randomImage,
            randomBackground,
            alohaAmount,
            erc20Amount,
            _getTime()
        );
    }

    /**
    * @dev Withdraw ALOHA and claim your random NFT for the selected rarity
    */
    function simpleWithdraw(
        uint256 _tokenRarity
    )
        public
    {
        pairWithdraw(alohaERC20, _tokenRarity);
    }

    /**
    * @dev Withdraw ALOHA/TOKEN and claim your random NFT for the selected rarity
    */
    function pairWithdraw(
        address _erc20Token,
        uint256 _tokenRarity
    )
        public
        nonReentrant()
        addressInStake(msg.sender, _erc20Token, _tokenRarity)
        stakeEnded(msg.sender, _erc20Token, _tokenRarity)
    {
        _withdraw(_erc20Token, _tokenRarity, true);
    }

    /**
    * @dev Withdra ALOHA without generating your NFT. This can be done before release time is reached.
    */
    function forceSimpleWithdraw(
        uint256 _tokenRarity
    )
        public
    {
        forcePairWithdraw(alohaERC20, _tokenRarity);
    }

    /**
    * @dev Withdraw ALOHA/TOKEN without generating your NFT. This can be done before release time is reached.
    */
    function forcePairWithdraw(
        address _erc20Token,
        uint256 _tokenRarity
    )
        public
        nonReentrant()
        addressInStake(msg.sender, _erc20Token, _tokenRarity)
    {
        _withdraw(_erc20Token, _tokenRarity, false);
    }

    /**
    * @dev Returns how many fees we collected from withdraws of one token.
    */
    function getAcumulatedFees(address _erc20Token) public view returns (uint256) {
        uint256 balance = IERC20(_erc20Token).balanceOf(address(this));

        if (balance > 0) {
            return balance.sub(totalStaked[_erc20Token]);
        }

        return 0; 
    } 

    /**
    * @dev Send all the acumulated fees for one token to the fee destinators.
    */
    function withdrawAcumulatedFees(address _erc20Token) public {
        uint256 total = getAcumulatedFees(_erc20Token);
        
        for (uint8 i = 0; i < feesDestinators.length; i++) {
            IERC20(_erc20Token).transfer(
                feesDestinators[i],
                total.mul(feesPercentages[i]).div(100)
            );
        }
    }

    /* Governance Functions */

    /**
    * @dev Sets the fee for every withdraw.
    */
    function setFee(uint256 _fee) public onlyOwner() {
        fee = _fee;
    }

    /**
    * @dev Adds a new NFT to the pools, so users can stake for it.
    */
    function createReward(
        uint256 _tokenImage,
        uint256 _tokenRarity,
        uint256 _limit
    )
        public
        onlyOwner()
        imageNotExists(_tokenImage)
        validRarity(_tokenRarity)
    {
        rewardsMap[_tokenImage] = _tokenRarity;
        rarityByImages[_tokenRarity].push(_tokenImage);
        rarityByImagesTotal[_tokenRarity] += 1;
        limitByRarityAndImage[_tokenImage][_tokenRarity] = _limit;
    }

    /**
    * @dev Configure staking time and amount in ALOHA pool for one rarity.
    */
    function setSimplePool(
        uint256 _alohaAmount,
        uint256 _duration,
        uint256 _tokenRarity
    )
        public
        onlyOwner()
        rarityAvailable(_tokenRarity)
    {
        poolsMap[alohaERC20][_tokenRarity] = Pool({
            alohaAmount: _alohaAmount,
            erc20Amount: 0,
            duration: _duration,
            rarity: _tokenRarity
        });

        emit SettedPool(
            _alohaAmount,
            0,
            _duration,
            _tokenRarity,
            _getTime()
        );
    }

    /**
    * @dev Configure staking time and amount in ALOHA/TOKEN pool for one rarity.
    */
    function setPairPool(
        uint256 _alohaAmount,
        address _erc20Address,
        uint256 _erc20Amount,
        uint256 _duration,
        uint256 _tokenRarity
    )
        public
        onlyOwner()
        rarityAvailable(_tokenRarity)
    {
        require(address(_erc20Address) != address(0));

        poolsMap[_erc20Address][_tokenRarity] = Pool({
            alohaAmount: _alohaAmount,
            erc20Amount: _erc20Amount,
            duration: _duration,
            rarity: _tokenRarity
        });

        emit SettedPool(
            _alohaAmount,
            _erc20Amount,
            _duration,
            _tokenRarity,
            _getTime()
        );
    }

    /**
    * @dev Creates a new background for NFTs. New stakers could get this background.
    */
    function addBackground(uint8 increase)
        public
        onlyOwner()
    {
        backgrounds += increase;
    }

    /**
    * @dev Configure how to distribute the fees for user's withdraws.
    */
    function setFeesDestinatorsWithPercentages(
        address[] memory _destinators,
        uint256[] memory _percentages
    )
        public
        onlyOwner()
    {
        require(_destinators.length <= 3, "AlohaStaking: Destinators lenght more then 3");
        require(_percentages.length <= 3, "AlohaStaking: Percentages lenght more then 3");
        require(_destinators.length == _percentages.length, "AlohaStaking: Destinators and percentageslenght are not equals");

        uint256 total = 0;
        for (uint8 i = 0; i < _percentages.length; i++) {
            total += _percentages[i];
        }
        require(total == 100, "AlohaStaking: Percentages sum must be 100");

        feesDestinators = _destinators;
        feesPercentages = _percentages;
    }

    /* Internal functions */
    function _existsReward(uint256 _tokenImage) internal view returns (bool) {
        return rewardsMap[_tokenImage] != 0;
    }

    function _existsPool(address _erc20Token, uint256 _rarity) internal view returns (bool) {
        return poolsMap[_erc20Token][_rarity].duration != 0;
    }

    function _getTime() internal view returns (uint256) {
        return block.timestamp;
    }

    /**
    * @dev Apply withdraw fees to the amounts.
    */
    function _applyStakeFees(
        address _erc20Token,
        uint256 _tokenRarity
    ) internal view returns (
        uint256 _alohaAmountAfterFees,
        uint256 _erc20AmountAfterFees
    ) {
        uint256 alohaAmount = poolsMap[_erc20Token][_tokenRarity].alohaAmount;
        uint256 alohaAmountAfterFees = alohaAmount.sub(alohaAmount.mul(fee).div(10000));
        uint256 erc20AmountAfterFees = 0;

        if (_erc20Token != alohaERC20) {
            uint256 erc20Amount = poolsMap[_erc20Token][_tokenRarity].erc20Amount;
            erc20AmountAfterFees = erc20Amount.sub(erc20Amount.mul(fee).div(10000));
        }

        return (alohaAmountAfterFees, erc20AmountAfterFees);
    }

    /**
    * @dev Transfers erc20 tokens to this contract.
    */
    function _transferStake(
        address _wallet,
        address _erc20,
        uint256 _amount
    ) internal {
        require(IERC20(_erc20).transferFrom(_wallet, address(this), _amount), "Must approve the ERC20 first");

        emit Transfered(_wallet, _erc20, _amount, _getTime());
    }

    /**
    * @dev Transfers erc20 tokens from this contract to the wallet.
    */
    function _transferWithdrawRewards(
        address _wallet,
        address _erc20,
        uint256 _amount
    ) internal {
        require(IERC20(_erc20).transfer(_wallet, _amount), "Must approve the ERC20 first");

        emit Transfered(_wallet, _erc20, _amount, _getTime());
    }

    /**
    * @dev Clear the stake state for a wallet and a rarity.
    */
    function _clearStake(address wallet, address _erc20Token, uint256 _tokenRarity) internal {
        stakingsMap[wallet][_erc20Token][_tokenRarity].endDate = 0;
        stakingsMap[wallet][_erc20Token][_tokenRarity].tokenImage = 0;
        stakingsMap[wallet][_erc20Token][_tokenRarity].tokenBackground = 0;
        stakingsMap[wallet][_erc20Token][_tokenRarity].alohaAmount = 0;
        stakingsMap[wallet][_erc20Token][_tokenRarity].erc20Amount = 0;
    }

    /**
    * @dev Withdraw tokens and mints the NFT if claimed.
    */
    function _withdraw(address _erc20Token, uint256 _tokenRarity, bool claimReward) internal {
        uint256 alohaAmount = poolsMap[_erc20Token][_tokenRarity].alohaAmount;
        uint256 erc20Amount = poolsMap[_erc20Token][_tokenRarity].erc20Amount;
        uint256 alohaAmountAfterFees;
        uint256 erc20AmountAfterFees;
    
        if (!claimReward) {
            alohaAmountAfterFees = alohaAmount;
            erc20AmountAfterFees = erc20Amount;
        } else {
            (alohaAmountAfterFees, erc20AmountAfterFees) = _applyStakeFees(_erc20Token, _tokenRarity);
        }

        _transferWithdrawRewards(msg.sender, alohaERC20, alohaAmountAfterFees);
        totalStaked[alohaERC20] -= alohaAmount;

        if (_erc20Token != alohaERC20) {
            _transferWithdrawRewards(msg.sender, _erc20Token, erc20AmountAfterFees);
            totalStaked[_erc20Token] -= erc20Amount;
        }

        uint256 tokenId = 0;
        uint256 image = stakingsMap[msg.sender][_erc20Token][_tokenRarity].tokenImage;
        if (claimReward) {
            uint256 background = stakingsMap[msg.sender][_erc20Token][_tokenRarity].tokenBackground;

            tokenId = IAlohaNFT(alohaERC721).awardItem(msg.sender, _tokenRarity, image, background);
        } else {
            totalTokensByRarityAndImage[image][_tokenRarity] -= 1;
        }

        emit Withdrawal(
            msg.sender,
            _erc20Token,
            _tokenRarity,
            alohaAmount,
            erc20Amount,
            alohaAmountAfterFees,
            erc20AmountAfterFees,
            tokenId,
            _getTime()
        );

        _clearStake(msg.sender, _erc20Token, _tokenRarity);
    }

    function _getRandomImage(uint256 _rarity) internal returns (uint256) {
        uint256 selectedImage = rarityByImages[_rarity][_randomA(rarityByImagesTotal[_rarity]) - 1];

        if (limitByRarityAndImage[selectedImage][_rarity] == 0 || 
            totalTokensByRarityAndImage[selectedImage][_rarity] < limitByRarityAndImage[selectedImage][_rarity]
        ) {
            totalTokensByRarityAndImage[selectedImage][_rarity] += 1;
            return selectedImage;
        }

        for (uint256 index = 1; index <= rarityByImagesTotal[_rarity]; index++) {
            selectedImage = rarityByImages[_rarity][index - 1];
            if (limitByRarityAndImage[selectedImage][_rarity] == 0 ||
                totalTokensByRarityAndImage[selectedImage][_rarity] < limitByRarityAndImage[selectedImage][_rarity]
            ) {
                totalTokensByRarityAndImage[selectedImage][_rarity] += 1;
                return selectedImage;
            }
        }

        revert("AlohaStaking: All images has reached the limit");
    }

    /**
    * @dev Generates a "random" number using the numbers of backgrounds that we have.
    */
    function _randomA(uint256 _limit) internal view returns (uint8) {
        uint256 _gasleft = gasleft();
        bytes32 _blockhash = blockhash(block.number-1);
        bytes32 _structHash = keccak256(
            abi.encode(
                _blockhash,
                backgrounds,
                _gasleft,
                _limit
            )
        );
        uint256 _randomNumber  = uint256(_structHash);
        assembly {_randomNumber := add(mod(_randomNumber, _limit),1)}
        return uint8(_randomNumber);
    }

    /**
    * @dev Generates a "random" number using the current block timestamp.
    */
    function _randomB(uint256 _limit) internal view returns (uint256) {
        uint256 _gasleft = gasleft();
        bytes32 _blockhash = blockhash(block.number-1);
        bytes32 _structHash = keccak256(
            abi.encode(
                _blockhash,
                _getTime(),
                _gasleft,
                _limit
            )
        );
        uint256 _randomNumber  = uint256(_structHash);
        assembly {_randomNumber := add(mod(_randomNumber, _limit),1)}
        return uint8(_randomNumber);
    }

}
