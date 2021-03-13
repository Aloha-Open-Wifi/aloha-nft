const { expectRevert, expectEvent, BN } = require('@openzeppelin/test-helpers');
const truffleAssert = require('truffle-assertions');
const { expect } = require('chai');

const AlohaStaking = artifacts.require("AlohaStaking");
const AlohaMock = artifacts.require("AlohaMock");
const AlohaNFTMock = artifacts.require("AlohaNFT");
const TokenMock = artifacts.require("TokenMock");

contract('AlohaStaking', function (accounts) {

  beforeEach(async function () {
    this.alohaMock = await AlohaMock.new({ from: accounts[0] });
    this.alohaNFTMock = await AlohaNFTMock.new('Aloha NFT', 'ANFT', 'https://aloha.com/nft/', { from: accounts[0] });
    this.tokenMock = await TokenMock.new({ from: accounts[0] });
    this.tokenMockZ = await TokenMock.new({ from: accounts[0] });
    this.fee = 1000; // 10%

    this.alohastaking = await AlohaStaking.new(
      this.alohaMock.address,
      this.alohaNFTMock.address,
      3,
      this.fee,
      { from: accounts[0] }
    );

    await this.alohaNFTMock.transferOwnership(
      this.alohastaking.address,
      { from: accounts[0] }
    );

    const alohaAmount = '2000000000000000000';
    const tokenAmount = '5000000000000000000';
    const tokenZAmount = '9000000000000000000';
    
    this.alohaMock.transfer(
      accounts[1],
      alohaAmount,
      { from: accounts[0] }
    );
    this.tokenMock.transfer(
      accounts[1],
      tokenAmount,
      { from: accounts[0] }
    );
    this.tokenMockZ.transfer(
      accounts[1],
      tokenZAmount,
      { from: accounts[0] }
    );

    await this.alohaMock.approve(
      this.alohastaking.address,
      alohaAmount,
      { from: accounts[1] }
    );
    await this.tokenMock.approve(
      this.alohastaking.address,
      tokenAmount,
      { from: accounts[1] }
    );
    await this.tokenMockZ.approve(
      this.alohastaking.address,
      tokenZAmount,
      { from: accounts[1] }
    );

  }); 

  describe('alohaERC20', function () {

    it('has correct value', async function() {
      assert.equal(
        await this.alohastaking.alohaERC20.call().valueOf(),
        this.alohaMock.address,
        'AlohaStaking instance has not correct alohaERC20 value'
      );
    });

  });

  describe('alohaERC721', function () {

    it('has correct value', async function() {
      assert.equal(
        await this.alohastaking.alohaERC721.call().valueOf(),
        this.alohaNFTMock.address,
        'AlohaStaking instance has not correct alohaERC721 value'
      );
    });

  });

  describe('backgrounds', function () {

    it('has correct value', async function() {
      assert.equal(
        await this.alohastaking.backgrounds.call().valueOf(),
        3,
        'AlohaStaking instance has not correct backgrounds value'
      );
    });

    it('increments on addBackground() calls', async function() {
      await this.alohastaking.addBackground(1, { from: accounts[0] });
      assert.equal(
        await this.alohastaking.backgrounds.call().valueOf(),
        4,
        'AlohaStaking backgrounds value not increments' 
      );
    });

  });

  describe('createReward', function () {

    it('with image 1 and rarity 2', async function() {
      const image = 1;
      const rarity = 2;
      await this.alohastaking.createReward(image, rarity, { from: accounts[0] });

      assert.equal(
        await this.alohastaking.rewardsMap.call(image),
        rarity,
        'Created reward is not in rewardsMap'
      );

      assert.equal(
        await this.alohastaking.rarityByImages.call(rarity, 0).valueOf(),
        image,
        'Created reward is not in rarityByImages'
      );

      assert.equal(
        await this.alohastaking.rarityByImagesTotal.call(rarity),
        1,
        'Created reward is not in rarityByImagesTotal'
      );
    });

    it('with image 2 and rarity 3', async function() {
      await this.alohastaking.createReward(2, 3, { from: accounts[0] });
    });

    it('with image 4 and rarity 4 must fails', async function() {
      await expectRevert(
        this.alohastaking.createReward(4, 4, { from: accounts[0] }),
        'AlohaStaking: Rarity must be 1, 2 or 3'
      );
    });

    it('with repeated image 2 must fails', async function() {
      await this.alohastaking.createReward(2, 2, { from: accounts[0] });
      await expectRevert(
        this.alohastaking.createReward(2, 1, { from: accounts[0] }),
        'AlohaStaking: Image for reward already exists'
      );
    });

  });

  describe('setSimplePool', function () {

    it('with not existing rarity must fails', async function() {
      await expectRevert(
        this.alohastaking.setSimplePool(
          new BN("100000000000000000000"),  // 100^18
          86400,  // 1 day
          1,      // Rarity 1
          { from: accounts[0] }
        ),
        'AlohaStaking: Rarity not available'
      );
    });

    it('and update values', async function() {
      let image = 1;
      let rarity = 2;
      let alohaAmount = 1000;
      let duration = 86400;   // 1 day

      await this.alohastaking.createReward(image, rarity, { from: accounts[0] });
      await this.alohastaking.setSimplePool(
        alohaAmount,
        duration,
        rarity,
        { from: accounts[0] }
      );

      // Checking original values
      let pool = await this.alohastaking.poolsMap.call(this.alohaMock.address, rarity).valueOf();
      assert.equal(
        pool.alohaAmount,
        alohaAmount,
        'Created simple pool has not right alohaAmount value'
      );
      assert.equal(
        pool.erc20Amount,
        0,
        'Created simple pool has not right erc20Amount value'
      );
      assert.equal(
        pool.duration,
        duration,
        'Created simple pool has not right duration value'
      );
      assert.equal(
        pool.rarity,
        rarity,
        'Created simple pool has not right rarity value'
      );

      // Updating values
      image = 2;
      rarity = 2;
      alohaAmount = 5000;
      duration = 86400*2; // 2 days

      await this.alohastaking.createReward(image, rarity, { from: accounts[0] });

      await this.alohastaking.setSimplePool(
        alohaAmount,
        duration,  
        rarity,
        { from: accounts[0] }
      );

      // Checking updated values
      pool = await this.alohastaking.poolsMap.call(this.alohaMock.address, rarity).valueOf();
      assert.equal(
        pool.alohaAmount,
        alohaAmount,
        'Created simple pool has not right alohaAmount value'
      );
      assert.equal(
        pool.erc20Amount,
        0,
        'Created simple pool has not right erc20Amount value'
      );
      assert.equal(
        pool.duration,
        duration,
        'Created simple pool has not right duration value'
      );
      assert.equal(
        pool.rarity,
        rarity,
        'Created simple pool has not right rarity value'
      );

    });

    it('with existing rarity', async function() {
      await this.alohastaking.createReward(1, 1, { from: accounts[0] });
      await this.alohastaking.setSimplePool(
        new BN("100000000000000000000"),  // 100^18
        86400,  // 1 day
        1,      // Rarity 1
        { from: accounts[0] }
      );
    });

  });

  describe('setPairPool', function () {

    it('with not existing rarity must fails', async function() {
      await expectRevert(
        this.alohastaking.setPairPool(
          new BN("100000000000000000000"),  // 100^18
          this.tokenMock.address,
          new BN("100000000000000000000"),  // 100^18
          86400,  // 1 day
          1,      // Rarity 1
          { from: accounts[0] }
        ),
        'AlohaStaking: Rarity not available'
      );
    });

    it('with not owner address must fails', async function() {
      await expectRevert(
        this.alohastaking.setPairPool(
          new BN("100000000000000000000"),  // 100^18
          this.tokenMock.address,
          new BN("100000000000000000000"),  // 100^18
          86400,  // 1 day
          1,      // Rarity 1
          { from: accounts[1] }
        ),
        'Ownable: caller is not the owner'
      );
    });

    it('and update values', async function() {
      let image = 1;
      let rarity = 2;
      let alohaAmount = 1000;
      let erc20Amount = 2000;
      let duration = 86400;   // 1 day

      await this.alohastaking.createReward(image, rarity, { from: accounts[0] });
      await this.alohastaking.setPairPool(
        alohaAmount,
        this.tokenMock.address,
        erc20Amount,
        duration,
        rarity,
        { from: accounts[0] }
      );

      // Checking original values
      let pool = await this.alohastaking.poolsMap.call(this.tokenMock.address, rarity).valueOf();
      assert.equal(
        pool.alohaAmount,
        alohaAmount,
        'Created pair pool has not right alohaAmount value'
      );
      assert.equal(
        pool.erc20Amount,
        erc20Amount,
        'Created pair pool has not right erc20Amount value'
      );
      assert.equal(
        pool.duration,
        duration,
        'Created pair pool has not right duration value'
      );
      assert.equal(
        pool.rarity,
        rarity,
        'Created pair pool has not right rarity value'
      );

      // Updating values
      image = 2;
      rarity = 2;
      alohaAmount = 4000;
      erc20Amount = 5000;
      duration = 86400*2;   // 2 day

      await this.alohastaking.createReward(image, rarity, { from: accounts[0] });
      await this.alohastaking.setPairPool(
        alohaAmount,
        this.tokenMock.address,
        erc20Amount,
        duration,
        rarity,
        { from: accounts[0] }
      );

      // Checking updated values
      pool = await this.alohastaking.poolsMap.call(this.tokenMock.address, rarity).valueOf();
      assert.equal(
        pool.alohaAmount,
        alohaAmount,
        'Created pair pool has not right alohaAmount value'
      );
      assert.equal(
        pool.erc20Amount,
        erc20Amount,
        'Created pair pool has not right erc20Amount value'
      );
      assert.equal(
        pool.duration,
        duration,
        'Created pair pool has not right duration value'
      );
      assert.equal(
        pool.rarity,
        rarity,
        'Created pair pool has not right rarity value'
      );

    });

    it('with existing rarity works', async function() {
      await this.alohastaking.createReward(1, 1, { from: accounts[0] });
      await this.alohastaking.setPairPool(
        new BN("100000000000000000000"),  // 100^18
        this.tokenMock.address,
        new BN("100000000000000000000"),  // 100^18
        86400,  // 1 day
        1,      // Rarity 1
        { from: accounts[0] }
      );
    });

  });

  describe('simpleStake', function () {

    it('with not existing rarity must fails', async function() {
      let rarity = 1;

      await expectRevert(
        this.alohastaking.simpleStake(
          rarity,
          { from: accounts[1] }
        ),
        'AlohaStaking: Rarity not available'
      );
    });

    it('when not existing pool must fails', async function() {
      let image = 1;
      let rarity = 2;

      await this.alohastaking.createReward(image, rarity, { from: accounts[0] });

      await expectRevert(
        this.alohastaking.simpleStake(
          rarity,
          { from: accounts[1] }
        ),
        'AlohaStaking: Pool for ERC20 Token and rarity not exists'
      );
    });

    it('with existing pool works', async function() {
      let image = 1;
      let rarity = 2;
      let alohaAmount = 1000;
      let duration = 86400;   // 1 day

      await this.alohastaking.createReward(image, rarity, { from: accounts[0] });
      await this.alohastaking.setSimplePool(
        alohaAmount,
        duration,
        rarity,
        { from: accounts[0] }
      );

      await this.alohastaking.simpleStake(
        rarity,
        { from: accounts[1] }
      );
    });

    it('when already in must fails', async function() {
      let image = 1;
      let rarity = 2;
      let alohaAmount = 1000;
      let duration = 86400;   // 1 day

      await this.alohastaking.createReward(image, rarity, { from: accounts[0] });
      await this.alohastaking.setSimplePool(
        alohaAmount,
        duration,
        rarity,
        { from: accounts[0] }
      );

      await this.alohastaking.simpleStake(
        rarity,
        { from: accounts[1] }
      );

      await expectRevert(
        this.alohastaking.simpleStake(
          rarity,
          { from: accounts[1] }
        ),
        'AlohaStaking: Address already stakes in this pool'
      );
    });

  });

  describe('pairStake', function () {

    it('with not existing rarity must fails', async function() {
      let rarity = 1;

      await expectRevert(
        this.alohastaking.pairStake(
          this.tokenMock.address,
          rarity,
          { from: accounts[1] }
        ),
        'AlohaStaking: Rarity not available'
      );
    });

    it('with not existing pool must fails', async function() {
      let image = 1;
      let rarity = 2;

      await this.alohastaking.createReward(image, rarity, { from: accounts[0] });

      await expectRevert(
        this.alohastaking.pairStake(
          this.tokenMockZ.address,
          rarity,
          { from: accounts[1] }
        ),
        'AlohaStaking: Pool for ERC20 Token and rarity not exists'
      );
    });

    it('with existing pool works', async function() {
      let image = 1;
      let rarity = 2;
      let alohaAmount = 1000;
      let erc20Amount = 2000;
      let duration = 86400;   // 1 day

      await this.alohastaking.createReward(image, rarity, { from: accounts[0] });
      await this.alohastaking.setPairPool(
        alohaAmount,
        this.tokenMock.address,
        erc20Amount,
        duration,
        rarity,
        { from: accounts[0] }
      );

      await this.alohastaking.pairStake(
        this.tokenMock.address,
        rarity,
        { from: accounts[1] }
      );
    });

  });

  describe('simpleWithdraw', function () {

    it('with not address in stake must fails', async function() {
      let rarity = 1;

      await expectRevert(
        this.alohastaking.simpleWithdraw(
          rarity,
          { from: accounts[1] }
        ),
        'AlohaStaking: Address not stakes in this pool'
      );
    });

    it('with not ended stake must fails', async function() {
      let image = 1;
      let rarity = 2;
      let alohaAmount = 1000;
      let duration = 86400;   // 1 day

      await this.alohastaking.createReward(image, rarity, { from: accounts[0] });
      await this.alohastaking.setSimplePool(
        alohaAmount,
        duration,
        rarity,
        { from: accounts[0] }
      );

      await this.alohastaking.simpleStake(
        rarity,
        { from: accounts[1] }
      );

      await expectRevert(
        this.alohastaking.simpleWithdraw(
          rarity,
          { from: accounts[1] }
        ),
        'AlohaStaking: Stake duration has not ended yet'
      );
    });

    it('emits event Withdrawal', async function() {
      let image = 1;
      let rarity = 2;
      let alohaAmount = 1000;
      let duration = 1;

      await this.alohastaking.createReward(image, rarity, { from: accounts[0] });
      await this.alohastaking.setSimplePool(
        alohaAmount,
        duration,
        rarity,
        { from: accounts[0] }
      );

      await this.alohastaking.simpleStake(
        rarity,
        { from: accounts[1] }
      );

      async function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }

      await timeout(2000);

      const result = await this.alohastaking.simpleWithdraw(
        rarity,
        { from: accounts[1] }
      );

      truffleAssert.eventEmitted(result, 'Withdrawal');
    });

    it('token balances changes', async function() {
      let image = 1;
      let rarity = 2;
      let alohaAmount = 1000;
      let duration = 1;

      await this.alohastaking.createReward(image, rarity, { from: accounts[0] });
      await this.alohastaking.setSimplePool(
        alohaAmount,
        duration,
        rarity,
        { from: accounts[0] }
      );

      const alohaBalanceBeforeWithdrawal = await this.alohaMock.balanceOf(accounts[1]);

      await this.alohastaking.simpleStake(
        rarity,
        { from: accounts[1] }
      );

      async function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }
      await timeout(2000);

      const alohaBalanceWhileStaking = await this.alohaMock.balanceOf(accounts[1]);

      assert.equal(
        alohaBalanceWhileStaking.toString(),
        (alohaBalanceBeforeWithdrawal - alohaAmount).toString(),
        'Stake balance has not been transferred'
      );

      await this.alohastaking.simpleWithdraw(
        rarity,
        { from: accounts[1] }
      );

      const alohaBalanceAfterWithdrawal = await this.alohaMock.balanceOf(accounts[1]);

      assert.equal(
        alohaBalanceAfterWithdrawal.toString(),
        sumStrings(alohaBalanceWhileStaking, alohaAmount - (alohaAmount * (this.fee /10000))),
        'Withdrawal balance has not been transferred'
      );
    });

    it('token NFT received', async function() {
      let image = 1;
      let rarity = 2;
      let alohaAmount = 1000;
      let duration = 1;

      await this.alohastaking.createReward(image, rarity, { from: accounts[0] });
      await this.alohastaking.setSimplePool(
        alohaAmount,
        duration,
        rarity,
        { from: accounts[0] }
      );

      await this.alohastaking.simpleStake(
        rarity,
        { from: accounts[1] }
      );

      async function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }
      await timeout(2000);

      await this.alohastaking.simpleWithdraw(
        rarity,
        { from: accounts[1] }
      );

      const alohaNFT = await this.alohaNFTMock.balanceOf(accounts[1]);

      assert.equal(
        alohaNFT.toString(),
        1,
        'AlohaNFT has not been transferred'
      );
    });

    it('applies fees', async function() {
      let image = 1;
      let rarity = 2;
      let alohaAmount = 1000;
      let duration = 1;

      await this.alohastaking.createReward(image, rarity, { from: accounts[0] });
      await this.alohastaking.setSimplePool(
        alohaAmount,
        duration,
        rarity,
        { from: accounts[0] }
      );

      await this.alohastaking.simpleStake(
        rarity,
        { from: accounts[1] }
      );

      async function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }

      await timeout(2000);

      const result = await this.alohastaking.simpleWithdraw(
        rarity,
        { from: accounts[1] }
      );

      truffleAssert.eventEmitted(result, 'Withdrawal', (event) => {
        return event.originalAlohaAmount.valueOf() == alohaAmount
            && event.receivedAlohaAmount.valueOf() == alohaAmount - (alohaAmount * (this.fee /10000));
      });
    });

    it('stake cleared', async function() {
      let image = 1;
      let rarity = 2;
      let alohaAmount = 1000;
      let duration = 1;

      await this.alohastaking.createReward(image, rarity, { from: accounts[0] });
      await this.alohastaking.setSimplePool(
        alohaAmount,
        duration,
        rarity,
        { from: accounts[0] }
      );

      await this.alohastaking.simpleStake(
        rarity,
        { from: accounts[1] }
      );

      async function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }

      await timeout(2000);

      await this.alohastaking.simpleWithdraw(
        rarity,
        { from: accounts[1] }
      );

      let pool = await this.alohastaking.stakingsMap.call(accounts[1], this.alohaMock.address, rarity).valueOf();
      assert.equal(
        pool.endDate,
        0,
        'satakingMap endDate not cleared'
      );
      assert.equal(
        pool.tokenImage,
        0,
        'satakingMap tokenImage not cleared'
      );
      assert.equal(
        pool.tokenBackground,
        0,
        'satakingMap tokenBackground not cleared'
      );
      assert.equal(
        pool.alohaAmount,
        0,
        'satakingMap alohaAmount not cleared'
      );
      assert.equal(
        pool.erc20Amount,
        0,
        'satakingMap erc20Amount not cleared'
      );
    });

  });

    describe('pairWithdraw', function () {

      it('with not address in stake must fails', async function() {
        let rarity = 1;

        await expectRevert(
          this.alohastaking.pairWithdraw(
            this.tokenMockZ.address,
            rarity,
            { from: accounts[1] }
          ),
          'AlohaStaking: Address not stakes in this pool'
        );
      });

      it('with not ended stake must fails', async function() {
        let image = 1;
        let rarity = 2;
        let alohaAmount = 3000;
        let erc20Amount = 4000;
        let duration = 86400;   // 1 day

        await this.alohastaking.createReward(image, rarity, { from: accounts[0] });
        await this.alohastaking.setPairPool(
          alohaAmount,
          this.tokenMockZ.address,
          erc20Amount,
          duration,
          rarity,
          { from: accounts[0] }
        );

        await this.alohastaking.pairStake(
          this.tokenMockZ.address,
          rarity,
          { from: accounts[1] }
        );

        await expectRevert(
          this.alohastaking.pairWithdraw(
            this.tokenMockZ.address,
            rarity,
            { from: accounts[1] }
          ),
          'AlohaStaking: Stake duration has not ended yet'
        );
      });

      it('emits event Withdrawal', async function() {
        let image = 1;
        let rarity = 2;
        let alohaAmount = 3000;
        let erc20Amount = 4000;
        let duration = 1;

        await this.alohastaking.createReward(image, rarity, { from: accounts[0] });
        await this.alohastaking.setPairPool(
          alohaAmount,
          this.tokenMockZ.address,
          erc20Amount,
          duration,
          rarity,
          { from: accounts[0] }
        );

        await this.alohastaking.pairStake(
          this.tokenMockZ.address,
          rarity,
          { from: accounts[1] }
        );

        async function timeout(ms) {
          return new Promise(resolve => setTimeout(resolve, ms));
        }

        await timeout(2000);

        const result = await this.alohastaking.pairWithdraw(
          this.tokenMockZ.address,
          rarity,
          { from: accounts[1] }
        );

        truffleAssert.eventEmitted(result, 'Withdrawal');
      });

      it('token balances changes', async function() {
        let image = 1;
        let rarity = 2;
        let alohaAmount = 3000;
        let erc20Amount = 4000;
        let duration = 1;

        await this.alohastaking.createReward(image, rarity, { from: accounts[0] });
        await this.alohastaking.setPairPool(
          alohaAmount,
          this.tokenMockZ.address,
          erc20Amount,
          duration,
          rarity,
          { from: accounts[0] }
        );

        const alohaBalanceBeforeWithdrawal = await this.alohaMock.balanceOf(accounts[1]);
        const erc20BalanceBeforeWithdrawal = await this.tokenMockZ.balanceOf(accounts[1]);

        await this.alohastaking.pairStake(
          this.tokenMockZ.address,
          rarity,
          { from: accounts[1] }
        );

        async function timeout(ms) {
          return new Promise(resolve => setTimeout(resolve, ms));
        }
        await timeout(2000);

        const alohaBalanceWhileStaking = await this.alohaMock.balanceOf(accounts[1]);
        const erc20BalanceWhileStaking = await this.tokenMockZ.balanceOf(accounts[1]);

        assert.equal(
          alohaBalanceWhileStaking.toString(),
          (alohaBalanceBeforeWithdrawal - alohaAmount).toString(),
          'Stake Aloha balance has not been transferred'
        );

        assert.equal(
          erc20BalanceWhileStaking.toString(),
          (erc20BalanceBeforeWithdrawal - erc20Amount).toString(),
          'Stake ERC20 balance has not been transferred'
        );

        await this.alohastaking.pairWithdraw(
          this.tokenMockZ.address,
          rarity,
          { from: accounts[1] }
        );

        const alohaBalanceAfterWithdrawal = await this.alohaMock.balanceOf(accounts[1]);
        const erc20BalanceAfterWithdrawal = await this.tokenMockZ.balanceOf(accounts[1]);

        assert.equal(
          alohaBalanceAfterWithdrawal.toString(),
          sumStrings(alohaBalanceWhileStaking, alohaAmount - (alohaAmount * (this.fee /10000))),
          'Withdrawal Aloha balance has not been transfefred'
        );
        assert.equal(
          erc20BalanceAfterWithdrawal.toString(),
          sumStrings(erc20BalanceWhileStaking, erc20Amount - (erc20Amount * (this.fee /10000))),
          'Withdrawal ERC20 balance has not been transfefred'
        );
      });

      it('token NFT received', async function() {
        let image = 1;
        let rarity = 2;
        let alohaAmount = 3000;
        let erc20Amount = 4000;
        let duration = 1;

        await this.alohastaking.createReward(image, rarity, { from: accounts[0] });
        await this.alohastaking.setPairPool(
          alohaAmount,
          this.tokenMockZ.address,
          erc20Amount,
          duration,
          rarity,
          { from: accounts[0] }
        );

        await this.alohastaking.pairStake(
          this.tokenMockZ.address,
          rarity,
          { from: accounts[1] }
        );

        async function timeout(ms) {
          return new Promise(resolve => setTimeout(resolve, ms));
        }
        await timeout(2000);

        await this.alohastaking.pairWithdraw(
          this.tokenMockZ.address,
          rarity,
          { from: accounts[1] }
        );

        const alohaNFT = await this.alohaNFTMock.balanceOf(accounts[1]);

        assert.equal(
          alohaNFT.toString(),
          1,
          'AlohaNFT has not been transferred'
        );
      });

      it('applies fees', async function() {
        let image = 1;
        let rarity = 2;
        let alohaAmount = 3000;
        let erc20Amount = 4000;
        let duration = 1;

        await this.alohastaking.createReward(image, rarity, { from: accounts[0] });
        await this.alohastaking.setPairPool(
          alohaAmount,
          this.tokenMockZ.address,
          erc20Amount,
          duration,
          rarity,
          { from: accounts[0] }
        );

        await this.alohastaking.pairStake(
          this.tokenMockZ.address,
          rarity,
          { from: accounts[1] }
        );

        async function timeout(ms) {
          return new Promise(resolve => setTimeout(resolve, ms));
        }

        await timeout(2000);

        const result = await this.alohastaking.pairWithdraw(
          this.tokenMockZ.address,
          rarity,
          { from: accounts[1] }
        );

        truffleAssert.eventEmitted(result, 'Withdrawal', (event) => {
          return event.originalAlohaAmount.valueOf() == alohaAmount
              && event.receivedAlohaAmount.valueOf() == alohaAmount - (alohaAmount * (this.fee /10000))
              && event.originalErc20Amount.valueOf() == erc20Amount
              && event.receivedErc20Amount.valueOf() == erc20Amount - (erc20Amount * (this.fee /10000));
        });
      });

      it('stake cleared', async function() {
        let image = 1;
        let rarity = 2;
        let alohaAmount = 3000;
        let erc20Amount = 4000;
        let duration = 1;

        await this.alohastaking.createReward(image, rarity, { from: accounts[0] });
        await this.alohastaking.setPairPool(
          alohaAmount,
          this.tokenMockZ.address,
          erc20Amount,
          duration,
          rarity,
          { from: accounts[0] }
        );

        await this.alohastaking.pairStake(
          this.tokenMockZ.address,
          rarity,
          { from: accounts[1] }
        );

        async function timeout(ms) {
          return new Promise(resolve => setTimeout(resolve, ms));
        }

        await timeout(2000);

        await this.alohastaking.pairWithdraw(
          this.tokenMockZ.address,
          rarity,
          { from: accounts[1] }
        );

        let pool = await this.alohastaking.stakingsMap.call(
          accounts[1],
          this.tokenMockZ.address,
          rarity
        ).valueOf();

        assert.equal(
          pool.endDate,
          0,
          'satakingMap endDate not cleared'
        );
        assert.equal(
          pool.tokenImage,
          0,
          'satakingMap tokenImage not cleared'
        );
        assert.equal(
          pool.tokenBackground,
          0,
          'satakingMap tokenBackground not cleared'
        );
        assert.equal(
          pool.alohaAmount,
          0,
          'satakingMap alohaAmount not cleared'
        );
        assert.equal(
          pool.erc20Amount,
          0,
          'satakingMap erc20Amount not cleared'
        );
      });

    });

  describe('forceSimpleWithdraw', function () {

    it('with not address in stake must fails', async function() {
      let rarity = 1;

      await expectRevert(
        this.alohastaking.forceSimpleWithdraw(
          rarity,
          { from: accounts[1] }
        ),
        'AlohaStaking: Address not stakes in this pool'
      );
    });

    it('with not ended stake must works', async function() {
      let image = 1;
      let rarity = 2;
      let alohaAmount = 1000;
      let duration = 86400;   // 1 day

      await this.alohastaking.createReward(image, rarity, { from: accounts[0] });
      await this.alohastaking.setSimplePool(
        alohaAmount,
        duration,
        rarity,
        { from: accounts[0] }
      );

      await this.alohastaking.simpleStake(
        rarity,
        { from: accounts[1] }
      );

      const result = await this.alohastaking.forceSimpleWithdraw(
        rarity,
        { from: accounts[1] }
      );

      truffleAssert.eventEmitted(result, 'Withdrawal');
    });

    it('emits event', async function() {
      let image = 1;
      let rarity = 2;
      let alohaAmount = 1000;
      let duration = 1;

      await this.alohastaking.createReward(image, rarity, { from: accounts[0] });
      await this.alohastaking.setSimplePool(
        alohaAmount,
        duration,
        rarity,
        { from: accounts[0] }
      );

      await this.alohastaking.simpleStake(
        rarity,
        { from: accounts[1] }
      );

      async function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }

      await timeout(2000);

      const result = await this.alohastaking.forceSimpleWithdraw(
        rarity,
        { from: accounts[1] }
      );

      truffleAssert.eventEmitted(result, 'Withdrawal');
    });

    it('dont applies fees', async function() {
      let image = 1;
      let rarity = 2;
      let alohaAmount = 1000;
      let duration = 1;

      await this.alohastaking.createReward(image, rarity, { from: accounts[0] });
      await this.alohastaking.setSimplePool(
        alohaAmount,
        duration,
        rarity,
        { from: accounts[0] }
      );

      await this.alohastaking.simpleStake(
        rarity,
        { from: accounts[1] }
      );

      async function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }

      await timeout(2000);

      const result = await this.alohastaking.forceSimpleWithdraw(
        rarity,
        { from: accounts[1] }
      );

      truffleAssert.eventEmitted(result, 'Withdrawal', (event) => {
        return event.originalAlohaAmount.valueOf() == alohaAmount
            && event.receivedAlohaAmount.valueOf() == alohaAmount;
      });
    });

    it('token NFT not received', async function() {
      let image = 1;
      let rarity = 2;
      let alohaAmount = 1000;
      let duration = 1;

      await this.alohastaking.createReward(image, rarity, { from: accounts[0] });
      await this.alohastaking.setSimplePool(
        alohaAmount,
        duration,
        rarity,
        { from: accounts[0] }
      );

      await this.alohastaking.simpleStake(
        rarity,
        { from: accounts[1] }
      );

      async function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }

      await timeout(2000);

      const result = await this.alohastaking.forceSimpleWithdraw(
        rarity,
        { from: accounts[1] }
      );

      const alohaNFT = await this.alohaNFTMock.balanceOf(accounts[1]);

      assert.equal(
        alohaNFT.toString(),
        0,
        'AlohaNFT has been transferred'
      );
    });

    it('stake cleared', async function() {
      let image = 1;
      let rarity = 2;
      let alohaAmount = 1000;
      let duration = 1;

      await this.alohastaking.createReward(image, rarity, { from: accounts[0] });
      await this.alohastaking.setSimplePool(
        alohaAmount,
        duration,
        rarity,
        { from: accounts[0] }
      );

      await this.alohastaking.simpleStake(
        rarity,
        { from: accounts[1] }
      );

      async function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }

      await timeout(2000);

      await this.alohastaking.forceSimpleWithdraw(
        rarity,
        { from: accounts[1] }
      );

      let pool = await this.alohastaking.stakingsMap.call(accounts[1], this.alohaMock.address, rarity).valueOf();
      assert.equal(
        pool.endDate,
        0,
        'satakingMap endDate not cleared'
      );
      assert.equal(
        pool.tokenImage,
        0,
        'satakingMap tokenImage not cleared'
      );
      assert.equal(
        pool.tokenBackground,
        0,
        'satakingMap tokenBackground not cleared'
      );
      assert.equal(
        pool.alohaAmount,
        0,
        'satakingMap alohaAmount not cleared'
      );
      assert.equal(
        pool.erc20Amount,
        0,
        'satakingMap erc20Amount not cleared'
      );
    });
  });

  describe('feesDestinators and feePercentages', function () {

    it('are empty by default', async function() {
      assert.equal(
        await this.alohastaking.feesDestinators.length,
        0,
        'AlohaStaking instance has not correct feesDestinators value'
      );

      assert.equal(
        await this.alohastaking.feesPercentages.length,
        0,
        'AlohaStaking instance has not correct feePercentages value'
      );
    });

    it('trying to setFeesDestinatorsWithPercentages() by not owner', async function() {
      await expectRevert(
        this.alohastaking.setFeesDestinatorsWithPercentages(
          [this.alohaMock.address],
          [100],
          { from: accounts[1] }
        ),
        'Ownable: caller is not the owner'
      );
    });

    it('trying to setFeesDestinatorsWithPercentages() without 100%', async function() {
      await expectRevert(
        this.alohastaking.setFeesDestinatorsWithPercentages(
          [this.alohaMock.address],
          [99],
          { from: accounts[0] }
        ),
        'AlohaStaking: Percentages sum must be 100'
      );
    });

    it('setted after setFeesDestinatorsWithPercentages() calls with 1 address', async function() {
      await this.alohastaking.setFeesDestinatorsWithPercentages(
        [this.alohaMock.address],
        [100],
        { from: accounts[0] }
      );

      assert.equal(
        await this.alohastaking.feesDestinators.call(0).valueOf(),
        this.alohaMock.address,
        'feesDestinators has not been setted correctly' 
      );
      assert.equal(
        await this.alohastaking.feesPercentages.call(0).valueOf(),
        100,
        'feesPercentages has not been setted correctly' 
      );
    });

    it('setted after setFeesDestinatorsWithPercentages() calls with 3 address', async function() {
      await this.alohastaking.setFeesDestinatorsWithPercentages(
        [this.alohaMock.address, this.alohaNFTMock.address, this.tokenMockZ.address],
        [50, 25, 25],
        { from: accounts[0] }
      );

      assert.equal(
        await this.alohastaking.feesDestinators.call(0).valueOf(),
        this.alohaMock.address,
        'feesDestinators has not been setted correctly' 
      );
      assert.equal(
        await this.alohastaking.feesDestinators.call(1).valueOf(),
        this.alohaNFTMock.address,
        'feesDestinators has not been setted correctly' 
      );
      assert.equal(
        await this.alohastaking.feesDestinators.call(2).valueOf(),
        this.tokenMockZ.address,
        'feesDestinators has not been setted correctly' 
      );
      assert.equal(
        await this.alohastaking.feesPercentages.call(0).valueOf(),
        50,
        'feesPercentages has not been setted correctly' 
      );
      assert.equal(
        await this.alohastaking.feesPercentages.call(1).valueOf(),
        25,
        'feesPercentages has not been setted correctly' 
      );
      assert.equal(
        await this.alohastaking.feesPercentages.call(2).valueOf(),
        25,
        'feesPercentages has not been setted correctly' 
      );
    });

    it('getAcumulatedFees() when no fees', async function() {
      let image = 1;
      let rarity = 2;
      let alohaAmount = 1000;
      let duration = 1;

      await this.alohastaking.createReward(image, rarity, { from: accounts[0] });
      await this.alohastaking.setSimplePool(
        alohaAmount,
        duration,
        rarity,
        { from: accounts[0] }
      );

      await this.alohastaking.simpleStake(
        rarity,
        { from: accounts[1] }
      );

      await this.alohastaking.forceSimpleWithdraw(
        rarity,
        { from: accounts[1] }
      );

      const acumulatedFees = await this.alohastaking.getAcumulatedFees.call(this.alohaMock.address).valueOf();
      assert.equal(
        acumulatedFees.toString(),
        '0',
        'getAcumulatedFees() value after Withdrawal doesnt match' 
      );
    });

    it('getAcumulatedFees() works', async function() {
      let image = 1;
      let rarity = 2;
      let alohaAmount = 1000;
      let duration = 1;

      await this.alohastaking.createReward(image, rarity, { from: accounts[0] });
      await this.alohastaking.setSimplePool(
        alohaAmount,
        duration,
        rarity,
        { from: accounts[0] }
      );

      await this.alohastaking.simpleStake(
        rarity,
        { from: accounts[1] }
      );

      async function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }

      assert.equal(
        (await this.alohastaking.getAcumulatedFees.call(this.alohaMock.address).valueOf()).toString(),
        '0',
        'getAcumulatedFees() value before Withdrawal doesnt match' 
      );

      await timeout(2000);

      await this.alohastaking.simpleWithdraw(
        rarity,
        { from: accounts[1] }
      );

      const acumulatedFees = await this.alohastaking.getAcumulatedFees.call(this.alohaMock.address).valueOf();
      assert.equal(
        acumulatedFees.toString(),
        alohaAmount * (this.fee / 10000),
        'getAcumulatedFees() value after Withdrawal doesnt match' 
      );
    });

    it('withdrawAcumulatedFees() works', async function() {
      let image = 1;
      let rarity = 2;
      let alohaAmount = 1000;
      let duration = 1;

      let percentage1 = 50;
      let percentage2 = 25;
      let percentage3 = 25;

      await this.alohastaking.createReward(image, rarity, { from: accounts[0] });
      await this.alohastaking.setSimplePool(
        alohaAmount,
        duration,
        rarity,
        { from: accounts[0] }
      );
      await this.alohastaking.setFeesDestinatorsWithPercentages(
        [accounts[3], accounts[4], accounts[5]],
        [percentage1, percentage2, percentage3],
        { from: accounts[0] }
      );
      await this.alohastaking.setFee(
        1000,
        { from: accounts[0] }
      );

      await this.alohastaking.simpleStake(
        rarity,
        { from: accounts[1] }
      );

      async function timeout(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
      }

      await timeout(2000);

      await this.alohastaking.simpleWithdraw(
        rarity,
        { from: accounts[1] }
      );

      assert.equal(
        (await this.alohaMock.balanceOf(accounts[3])).toString(),
        '0',
        'Account 3 has balance before withdrawAcumulatedFees()' 
      );
      assert.equal(
        (await this.alohaMock.balanceOf(accounts[4])).toString(),
        '0',
        'Account 4 has balance before withdrawAcumulatedFees()' 
      );
      assert.equal(
        (await this.alohaMock.balanceOf(accounts[5])).toString(),
        '0',
        'Account 5 has balance before withdrawAcumulatedFees()' 
      );

      await this.alohastaking.withdrawAcumulatedFees(
        this.alohaMock.address,
        { from: accounts[0] }
      );

      let alohaAmountFee = alohaAmount * (this.fee /10000);

      assert.equal(
        (await this.alohaMock.balanceOf(accounts[3])).toString(),
        (alohaAmountFee * percentage1 / 100).toString(),
        'Account 3 has wrong balance after withdrawAcumulatedFees()' 
      );
      assert.equal(
        (await this.alohaMock.balanceOf(accounts[4])).toString(),
        (alohaAmountFee * percentage2 / 100).toString(),
        'Account 4 has wrong balance after withdrawAcumulatedFees(' 
      );
      assert.equal(
        (await this.alohaMock.balanceOf(accounts[5])).toString(),
        (alohaAmountFee * percentage3 / 100).toString(),
        'Account 5 has wrong balance after withdrawAcumulatedFees(' 
      );
    });

  });

});


function sumStrings(a,b) { 
  return ((BigInt(a)) + BigInt(b)).toString();
}