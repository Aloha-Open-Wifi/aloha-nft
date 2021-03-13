const { expectRevert, expectEvent, BN } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

const AlohaNFT = artifacts.require("AlohaNFT");

contract('AlohaNFT', function (accounts) {

  // Account 0: Owner
  // Account 1: Token A
  // Account 2: Token B

  beforeEach(async function () {
    this.alohanft = await AlohaNFT.new(
      'AlohaNFT',
      'ANFT',
      'https://aloha.com/nft/',
      { from: accounts[0] }
    );

    this.tokenIdA = await this.alohanft.awardItem.call(
      accounts[1],
      1,
      2,
      3,
      { from: accounts[0] }
    );
    await this.alohanft.awardItem(
      accounts[1],
      1,
      2,
      3,
      { from: accounts[0] }
    );

    this.tokenIdB = await this.alohanft.awardItem.call(
      accounts[2],
      9,
      8,
      7,
      { from: accounts[0] }
    );
    await this.alohanft.awardItem(
      accounts[2],
      9,
      8,
      7,
      { from: accounts[0] }
    );
    
  });

  describe('AlohaNFT', function () {

    it('has a supply of 2 tokens', async function() {
      assert.equal(
        await this.alohanft.totalSupply(),
        2,
        'AlohaNFT has not a supply of 2 tokens'
      );
    });

  });

  describe('TokenA', function () {

    it('has image \'1\'', async function() {
      assert.equal(
        await this.alohanft.tokenImage(this.tokenIdA),
        1,
        'TokenA image is not \'1\''
      );
    });

    it('has rarity \'2\'', async function() {
      assert.equal(
        await this.alohanft.tokenRarity(this.tokenIdA),
        2,
        'TokenA rarity is not \'2\''
      );
    });

    it('has background \'3\'', async function() {
      assert.equal(
        await this.alohanft.tokenBackground(this.tokenIdA),
        3,
        'TokenA background is not \'3\''
      );
    });

  });

  describe('TokenB', function () {

    it('has image \'9\'', async function() {
      assert.equal(
        await this.alohanft.tokenImage(this.tokenIdB),
        9,
        'TokenA image is not \'9\''
      );
    });

    it('has rarity \'8\'', async function() {
      assert.equal(
        await this.alohanft.tokenRarity(this.tokenIdB),
        8,
        'TokenA rarity is not \'8\''
      );
    });

    it('has background \'7\'', async function() {
      assert.equal(
        await this.alohanft.tokenBackground(this.tokenIdB),
        7,
        'TokenA background is not \'7\''
      );
    });

  });

  describe('Account 1', function () {

    it('should have TokenA', async function() {
      assert.equal(
        await this.alohanft.ownerOf(this.tokenIdA),
        accounts[1],
        'Account 1 is not owner of TokenA'
      );
    });

    it('transfers TokenA to Account 2', async function() {
      await this.alohanft.transferFrom(
        accounts[1],
        accounts[2],
        this.tokenIdA,
        { from: accounts[1] }
      );
      assert.equal(
        await this.alohanft.ownerOf(this.tokenIdA),
        accounts[2],
        'Account 2 is not owner of TokenA'
      );
    });

  });

  describe('Account 2', function () {

    it('should have TokenB', async function() {
      assert.equal(
        await this.alohanft.ownerOf(this.tokenIdB),
        accounts[2],
        'Account 2 is not owner of TokenA'
      );
    });

    it('should can not to tranfer TokenA', async function() {
      await expectRevert(
        this.alohanft.transferFrom(
          accounts[1],
          accounts[2],
          this.tokenIdA,
          { from: accounts[2] }
        ),
        'ERC721: transfer caller is not owner nor approved'
      );
    });

  });

  describe('Account 2', function () {

    it('should can not to mint a token', async function() {
      await expectRevert(
        this.alohanft.awardItem(
          accounts[2],
          30,
          40,
          50,
          { from: accounts[2] }
        ),
        'Ownable: caller is not the owner'
      );
    });

  });

});
