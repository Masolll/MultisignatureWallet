// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract MultisigWallet {
    address[] public owners;
    Proposal[] public proposals;

    constructor(address[] memory _owners) payable {
        owners = _owners;
    }

    receive() external payable {}

    fallback() external payable {}

    struct Proposal {
        uint id;
        address owner;
        address payable recipient;
        uint amount;
        address[] approvers;
        ProposalStatus status;
    }

    enum ProposalStatus {
        Pending,
        Ready,
        Executed,
        Cancelled
    }

    error OnlyOwners();
    error ProposalNotExist();
    error SenderAlreadyApprove();
    error ConfirmationsComplete();
    error OnlyProposalOwnerCanCancel();
    error ProposalAlreadyFinalized();
    error ProposalNotReady();
    error InsufficientBalance();

    modifier onlyOwners() {
        bool isOwner;
        for(uint i = 0; i < owners.length; i++) {
            if (owners[i] == msg.sender) {
                isOwner = true;
            }
        }
        require(isOwner, OnlyOwners());
        _;
    }

    function getOwners() public view returns(address[] memory) {
        return owners;
    }

    function getBalance() public view returns(uint) {
        return address(this).balance;
    }

    function getProposals() public view returns(Proposal[] memory) {
        return proposals;
    }

    function createProposal(address payable recipient, uint amount) public onlyOwners{
        proposals.push();
        Proposal storage newProposal = proposals[proposals.length - 1];
        newProposal.id = proposals.length - 1;
        newProposal.owner = msg.sender;
        newProposal.recipient = recipient;
        newProposal.amount = amount;
        newProposal.approvers.push(msg.sender);
        newProposal.status = owners.length == 1 ? ProposalStatus.Ready : ProposalStatus.Pending;
    }

    function approveProposal(uint proposalId) public onlyOwners {
        require(proposalId < proposals.length, ProposalNotExist());
        Proposal storage proposal = proposals[proposalId];
        require(proposal.status == ProposalStatus.Pending, ConfirmationsComplete());

        for(uint i = 0; i < proposal.approvers.length; i++) {
            if(msg.sender == proposal.approvers[i]) {
                revert SenderAlreadyApprove();
            }
        }
        proposal.approvers.push(msg.sender);

        if (proposal.approvers.length > (owners.length / 2)) {
            proposal.status = ProposalStatus.Ready;
        }
    }

    function executeProposal(uint proposalId) public onlyOwners {
        require(proposalId < proposals.length, ProposalNotExist());
        Proposal storage proposal = proposals[proposalId];
        require(proposal.status == ProposalStatus.Ready, ProposalNotReady());
        require(getBalance() >= proposal.amount, InsufficientBalance());

        proposal.recipient.transfer(proposal.amount);
        proposal.status = ProposalStatus.Executed;
    }

    function cancelProposal(uint proposalId) public {
        require(proposalId < proposals.length, ProposalNotExist());
        require(proposals[proposalId].owner == msg.sender, OnlyProposalOwnerCanCancel());
        require(proposals[proposalId].status == ProposalStatus.Pending || proposals[proposalId].status == ProposalStatus.Ready, ProposalAlreadyFinalized());
        proposals[proposalId].status = ProposalStatus.Cancelled;
    } 
}