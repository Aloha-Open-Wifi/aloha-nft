const AlohaNFT = artifacts.require("AlohaNFT");
const AlohaStaking = artifacts.require("AlohaStaking");
const AlohaMock = artifacts.require("AlohaMock");
const TokenMock = artifacts.require("TokenMock");

async function deployTestnet(deployer, accounts) {
  const userAddress = accounts[0];

  await deployer.deploy(AlohaMock);
  await deployer.deploy(TokenMock);

  await deployer.deploy(AlohaNFT, 'Aloha NFT', 'ANFT', 'https://aloha.com/nft/');
  await deployer.deploy(AlohaStaking, AlohaMock.address, AlohaNFT.address, 3, 100);
 
  const alohaNFT = await AlohaNFT.at(AlohaNFT.address);
  await alohaNFT.transferOwnership(
    AlohaStaking.address
  );
}

module.exports = async (deployer, network, accounts) => {
  await deployTestnet(deployer, accounts);
};
