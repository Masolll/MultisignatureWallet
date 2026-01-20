import { expect } from "chai";
import { ethers } from "hardhat";
import { MultisigWallet } from "../typechain-types";

describe("MultisigWallet", function () {
  let multisig: MultisigWallet;
  let owner1: any;
  let owner2: any;
  let owner3: any;
  let nonOwner: any;

  beforeEach(async function () {
    [owner1, owner2, owner3, nonOwner] = await ethers.getSigners();

    const MultisigWalletFactory = await ethers.getContractFactory("MultisigWallet");
    multisig = (await MultisigWalletFactory.deploy([owner1.address, owner2.address, owner3.address], {
      value: ethers.parseEther("1"),
    })) as MultisigWallet;

    await multisig.waitForDeployment();
  });

  it("should deploy correctly", async function () {
    expect(await multisig.getOwners()).to.deep.equal([owner1.address, owner2.address, owner3.address]);
    expect(await multisig.getBalance()).to.equal(ethers.parseEther("1"));
  });

  it("should revert if called by non-owner", async function () {
    const recipient = nonOwner.address;
    const amount = 1000;
    await expect(multisig.connect(nonOwner).createProposal(recipient, amount)).to.be.revertedWithCustomError(
      multisig,
      "OnlyOwners",
    );
  });

  it("correct creation of a new proposal", async function () {
    const recipient = nonOwner.address;
    const amountWei = 1000;
    await multisig.connect(owner1).createProposal(recipient, amountWei);
    const proposals = await multisig.getProposals();
    expect(proposals.length).to.equal(1);

    const firstProposal = proposals[0];
    expect(firstProposal.recipient).to.equal(recipient);
    expect(firstProposal.amount).to.equal(amountWei);
    expect(firstProposal.owner).to.equal(owner1);
    expect(firstProposal.approvers).to.deep.equal([owner1.address]);
    expect(firstProposal.status).to.equal(0); //Status 0 - Pending
  });

  it("correct approve of proposal", async function () {
    const recipient = nonOwner.address;
    const amountWei = 1000;
    await multisig.connect(owner1).createProposal(recipient, amountWei);

    await expect(multisig.connect(owner1).approveProposal(0)).to.be.revertedWithCustomError(
      multisig,
      "SenderAlreadyApprove",
    );

    await multisig.connect(owner2).approveProposal(0);
    const proposals = await multisig.getProposals();
    const approvedProposal = proposals[0];
    expect(approvedProposal.approvers).to.deep.equal([owner1.address, owner2.address]);
    expect(approvedProposal.status).to.equal(1); //Status 1 - Ready

    await expect(multisig.connect(owner3).approveProposal(0)).to.be.revertedWithCustomError(
      multisig,
      "ConfirmationsComplete",
    );
  });

  it("correct execute of ready proposal", async function () {
    const recipient = nonOwner.address;
    const amountWei = ethers.parseEther("1");
    const recipientBalanceBefore = await ethers.provider.getBalance(recipient);
    await multisig.connect(owner1).createProposal(recipient, amountWei);

    await expect(multisig.connect(owner1).executeProposal(0)).to.be.revertedWithCustomError(
      multisig,
      "ProposalNotReady",
    );

    await multisig.connect(owner2).approveProposal(0);
    await multisig.connect(owner1).executeProposal(0);
    const recipientBalanceAfter = await ethers.provider.getBalance(recipient);
    const proposals = await multisig.getProposals();
    const executedProposal = proposals[0];

    expect(await multisig.getBalance()).to.equal(0);
    expect(recipientBalanceAfter - recipientBalanceBefore).to.equal(ethers.parseEther("1"));
    expect(executedProposal.status).to.equal(2); //Status 2 - Executed
    await expect(multisig.connect(owner1).executeProposal(0)).to.be.revertedWithCustomError(
      multisig,
      "ProposalNotReady",
    );
  });

  it("correct canceled proposal", async function () {
    const recipient = nonOwner.address;
    const amountWei = ethers.parseEther("1");
    await multisig.connect(owner1).createProposal(recipient, amountWei);

    await expect(multisig.connect(owner2).cancelProposal(0)).to.be.revertedWithCustomError(
      multisig,
      "OnlyProposalOwnerCanCancel",
    );

    await multisig.connect(owner1).cancelProposal(0);

    const proposals = await multisig.connect(owner1).getProposals();
    const proposal = proposals[0];

    expect(proposal.status).to.equal(3); //Status 3 - Cancelled
    await expect(multisig.connect(owner1).approveProposal(0)).to.be.revertedWithCustomError(
      multisig,
      "ConfirmationsComplete",
    );
    await expect(multisig.connect(owner1).executeProposal(0)).to.be.revertedWithCustomError(
      multisig,
      "ProposalNotReady",
    );
    await expect(multisig.connect(owner1).cancelProposal(0)).to.be.revertedWithCustomError(
      multisig,
      "ProposalAlreadyFinalized",
    );
  });
});
