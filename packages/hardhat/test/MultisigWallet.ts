import { ethers } from "hardhat";
import { MultisigWallet } from "../typechain-types";

describe("MultisigWallet", function () {
  // We define a fixture to reuse the same setup in every test.

  let yourContract: MultisigWallet;
  before(async () => {
    const owners = await ethers.getSigners();
    const yourContractFactory = await ethers.getContractFactory("MultisigWallet");
    yourContract = (await yourContractFactory.deploy([
      owners[0].address,
      owners[1].address,
      owners[2].address,
    ])) as MultisigWallet;
    await yourContract.waitForDeployment();
  });
});
