const { expectRevert, expectEvent, BN } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const AlohaNFT = artifacts.require("AlohaNFT");
const AlohaNFTv1 = artifacts.require("AlohaNFTv1");

contract('AlohaNFT', function (accounts) {

  beforeEach(async function () {

    this.alohanftv1 = await AlohaNFTv1.new(
      'AlohaNFT',
      'ANFT',
      'https://aloha.com/nft/',
      { from: accounts[0] }
    );

    this.alohanft = await AlohaNFT.new(
      this.alohanftv1.address,
      { from: accounts[0] }
    );

    await this.alohanft.grantRole(
      "0xf0887ba65ee2024ea881d91b74c2450ef19e1557f03bed3ea9f16b037cbe2dc9",
      accounts[0],
      { from: accounts[0] }
    );

  });

  describe('Supply', function () {

    it('has correct value', async function() {
      this.tokenIdA = await this.alohanft.awardItem.call(
        accounts[1],
        2,
        1,
        1,
        { from: accounts[0] }
      );
      await this.alohanft.awardItem(
        accounts[1],
        2,
        1,
        1,
        { from: accounts[0] }
      );

      assert.equal(
        await this.alohanft.totalSupply(),
        1,
        'AlohaNFT has not a supply of 1 tokens'
      );
    });

  });

  describe('Minting one token', function () {

    it('has correct Id', async function() {
      this.tokenIdA = await this.alohanft.awardItem.call(
        accounts[1],
        1,
        1,
        1,
        { from: accounts[0] }
      );
      await this.alohanft.awardItem(
        accounts[1],
        1,
        1,
        1,
        { from: accounts[0] }
      );

      assert.equal(
        this.tokenIdA,
        1,
        'Token ID is not \'1\''
      );
    });

    it('has correct Rarity', async function() {
      this.tokenIdA = await this.alohanft.awardItem.call(
        accounts[1],
        1,
        1,
        1,
        { from: accounts[0] }
      );
      await this.alohanft.awardItem(
        accounts[1],
        1,
        1,
        1,
        { from: accounts[0] }
      );

      assert.equal(
        await this.alohanft.tokenRarity(this.tokenIdA),
        1,
        'Token rarity is not \'1\''
      );
    });

  });

  describe('Minting a second token', function () {

    it('has correct Id', async function() {
      this.tokenIdOne = await this.alohanft.awardItem.call(
        accounts[1],
        1,
        1,
        1,
        { from: accounts[0] }
      );
      await this.alohanft.awardItem(
        accounts[1],
        1,
        1,
        1,
        { from: accounts[0] }
      );
      this.tokenIdTwo = await this.alohanft.awardItem.call(
        accounts[1],
        1,
        1,
        1,
        { from: accounts[0] }
      );
      await this.alohanft.awardItem(
        accounts[1],
        1,
        1,
        1,
        { from: accounts[0] }
      );

      assert.equal(
        this.tokenIdTwo,
        2,
        'Token ID is not \'2\''
      );
    });

    it('has correct Rarity', async function() {
      this.tokenIdOne = await this.alohanft.awardItem.call(
        accounts[1],
        1,
        1,
        1,
        { from: accounts[0] }
      );
      await this.alohanft.awardItem(
        accounts[1],
        1,
        1,
        1,
        { from: accounts[0] }
      );
      this.tokenIdTwo = await this.alohanft.awardItem.call(
        accounts[1],
        1,
        1,
        1,
        { from: accounts[0] }
      );
      await this.alohanft.awardItem(
        accounts[1],
        1,
        1,
        1,
        { from: accounts[0] }
      );

      assert.equal(
        await this.alohanft.tokenRarity(this.tokenIdTwo),
        1,
        'TokenA rarity is not \'1\''
      );
    });

    it('of diferent rarity', async function() {
      this.tokenIdOne = await this.alohanft.awardItem.call(
        accounts[1],
        1,
        1,
        1,
        { from: accounts[0] }
      );
      await this.alohanft.awardItem(
        accounts[1],
        1,
        1,
        1,
        { from: accounts[0] }
      );
      this.tokenIdTwo = await this.alohanft.awardItem.call(
        accounts[1],
        3,
        1,
        1,
        { from: accounts[0] }
      );
      await this.alohanft.awardItem(
        accounts[1],
        3,
        1,
        1,
        { from: accounts[0] }
      );

      assert.equal(
        this.tokenIdTwo,
        2,
        'TokenA ID is not \'2\''
      );
      assert.equal(
        await this.alohanft.tokenRarity(this.tokenIdTwo),
        3,
        'TokenA rarity is not \'5\''
      );
    });

  });

  describe('Account 1', function () {

    it('should have TokenA', async function() {
      this.tokenA = await this.alohanft.awardItem.call(
        accounts[1],
        2,
        1,
        1,
        { from: accounts[0] }
      );
      await this.alohanft.awardItem(
        accounts[1],
        2,
        1,
        1,
        { from: accounts[0] }
      );

      assert.equal(
        await this.alohanft.ownerOf(this.tokenA),
        accounts[1],
        'Account 1 is not owner of TokenA'
      );
    });

    it('transfers TokenA to Account 2', async function() {
      this.tokenA = await this.alohanft.awardItem.call(
        accounts[1],
        1,
        1,
        1,
        { from: accounts[0] }
      );
      await this.alohanft.awardItem(
        accounts[1],
        1,
        1,
        1,
        { from: accounts[0] }
      );

      await this.alohanft.transferFrom(
        accounts[1],
        accounts[2],
        this.tokenA,
        { from: accounts[1] }
      );
      assert.equal(
        await this.alohanft.ownerOf(this.tokenA),
        accounts[2],
        'Account 2 is not owner of TokenA'
      );
    });

  });

  describe('Account 2', function () {

    it('should can not to tranfer TokenA', async function() {
      this.tokenA = await this.alohanft.awardItem.call(
        accounts[1],
        1,
        1,
        1,
        { from: accounts[0] }
      );
      await this.alohanft.awardItem(
        accounts[1],
        1,
        1,
        1,
        { from: accounts[0] }
      );

      await expectRevert(
        this.alohanft.transferFrom(
          accounts[1],
          accounts[2],
          this.tokenA,
          { from: accounts[2] }
        ),
        'ERC721: transfer caller is not owner nor approved'
      );
    });

  });

  describe('Migrating v1 token', function () {

    it('first time should work', async function() {
      this.tokenA = await this.alohanftv1.awardItem.call(
        accounts[1],
        1,
        1,
        1,
        { from: accounts[0] }
      );
      await this.alohanftv1.awardItem(
        accounts[1],
        1,
        1,
        1,
        { from: accounts[0] }
      );

      await this.alohanftv1.setApprovalForAll(
        this.alohanft.address,
        true,
        { from: accounts[1] }
      );

      this.migratedTokenA = await this.alohanft.migrateToken.call(
        this.tokenA,
        { from: accounts[1] }
      );
      await this.alohanft.migrateToken(
        this.tokenA,
        { from: accounts[1] }
      );

      assert.equal(
        await this.alohanft.tokenRarity(this.migratedTokenA),
        1,
        'Transferred token rarity does not match'
      );
    });

    it('second time should fail', async function() {
      this.tokenA = await this.alohanftv1.awardItem.call(
        accounts[1],
        1,
        1,
        1,
        { from: accounts[0] }
      );
      await this.alohanftv1.awardItem(
        accounts[1],
        1,
        1,
        1,
        { from: accounts[0] }
      );
      
      await this.alohanftv1.setApprovalForAll(
        this.alohanft.address,
        true,
        { from: accounts[1] }
      );

      await this.alohanft.migrateToken(
        this.tokenA,
        { from: accounts[1] }
      );

      await expectRevert(
        this.alohanft.migrateToken(
          this.tokenA,
          { from: accounts[1] }
        ),
        'AlohaNFT: Token already migrated'
      );
    });

  });

  describe('Account 2', function () {

    it('should can not to mint a token', async function() {
      await expectRevert(
        this.alohanft.awardItem(
          accounts[2],
          1,
          1,
          1,
          { from: accounts[2] }
        ),
        'AlohaNFT: Only for role MINTER'
      );
    });

  });

});
