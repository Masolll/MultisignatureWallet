"use client";

import { useState } from "react";
import type { NextPage } from "next";
import { useAccount } from "wagmi";
import MultisigWallet from "~~/../hardhat/deployments/localhost/MultisigWallet.json";
import { useScaffoldReadContract, useScaffoldWriteContract } from "~~/hooks/scaffold-eth";

const Home: NextPage = () => {
  const [proposalRecipient, setProposalRecipient] = useState("");
  const [proposalAmount, setProposalAmount] = useState("");

  const { address } = useAccount();

  const { writeContractAsync } = useScaffoldWriteContract("MultisigWallet");

  const { data: balance, isLoading: isLoadingBalance } = useScaffoldReadContract({
    contractName: "MultisigWallet",
    functionName: "getBalance",
  });
  const { data: owners, isLoading: isLoadingOwners } = useScaffoldReadContract({
    contractName: "MultisigWallet",
    functionName: "getOwners",
  });

  const { data: proposals, isLoading: isLoadingProposals } = useScaffoldReadContract({
    contractName: "MultisigWallet",
    functionName: "getProposals",
  });

  const orederedProposals = proposals?.toReversed();
  const contractAddress = MultisigWallet.address;

  const createProposal = async (recipient: string, amount: string) => {
    if (!recipient || !amount) {
      alert("Заполните оба поля");
      return;
    }
    try {
      const amountBigInt = BigInt(amount);
      await writeContractAsync({
        functionName: "createProposal",
        args: [recipient, amountBigInt],
      });
    } catch (error) {
      console.error("Transaction failed:", error);
    }
  };

  type contractFunctionName = "approveProposal" | "cancelProposal" | "createProposal" | "executeProposal";
  const editProposal = (functionName: contractFunctionName, proposalId: bigint) => {
    try {
      writeContractAsync({
        functionName: functionName,
        args: [proposalId],
      });
    } catch (error) {
      console.log("Transaction failed:", error);
    }
  };

  const approveProposal = async (proposalId: bigint) => editProposal("approveProposal", proposalId);

  const executeProposal = async (proposalId: bigint) => editProposal("executeProposal", proposalId);

  const cancelProposal = async (proposalId: bigint) => editProposal("cancelProposal", proposalId);

  const proposalStatus: Record<number, string> = {
    0: "Pending",
    1: "Ready",
    2: "Executed",
    3: "Cancelled",
  };

  return isLoadingOwners || !owners || isLoadingBalance || isLoadingProposals ? (
    <div>Загрузка...</div>
  ) : (
    <div className="flex justify-center mt-10">
      <div className="w-full max-w-md border border-base-300 rounded-2xl p-6 bg-base-100 shadow">
        <h1 className="text-center text-lg font-bold mb-6">Multisignature wallet</h1>

        <div className="border border-base-300 rounded-xl p-4 mb-6">
          <h2 className="font-semibold mb-2 font-bold text-center">Wallet info</h2>
          <p className="text-sm">
            Contract address:
            <span className="font-mono"> {contractAddress}</span>
          </p>
          <p className="text-sm">
            Balance:
            <span className="font-mono"> {balance} WEI</span>
          </p>
          <p className="text-sm">
            Owners:
            {owners!.map((owner, index) => (
              <li key={index} className="font-mono">
                {owner}
              </li>
            ))}
          </p>
        </div>

        <div className="border border-base-300 rounded-xl p-4 mb-6">
          <h2 className="font-semibold mb-3 text-center">Create proposal</h2>

          <input
            type="text"
            placeholder="To: 0x..."
            className="input input-bordered w-full mb-3"
            value={proposalRecipient}
            onChange={e => setProposalRecipient(e.target.value)}
          />

          <input
            type="text"
            placeholder="Amount: 50 wei"
            className="input input-bordered w-full mb-4"
            value={proposalAmount}
            onChange={e => setProposalAmount(e.target.value)}
          />

          <button className="btn btn-outline w-full" onClick={() => createProposal(proposalRecipient, proposalAmount)}>
            Create
          </button>
        </div>

        <div className="border border-base-300 rounded-xl p-4 mb-6">
          <h2 className="font-semibold mb-4 text-center">Actual proposals</h2>

          {orederedProposals
            ?.filter(
              element => proposalStatus[element.status] == "Pending" || proposalStatus[element.status] == "Ready",
            )
            .map((element, index) => (
              <div className="border border-base-300 rounded-lg p-3 mb-4" key={index}>
                <p className="text-sm">
                  To: <span className="font-mono">{element.recipient}</span>
                </p>
                <p className="text-sm">Amount: {element.amount} wei</p>
                <p className="text-sm">
                  Confirmations: {element.approvers.length} / {Math.trunc(owners.length / 2) + 1}
                </p>
                <p className="text-sm">Status: {proposalStatus[element.status]}</p>
                <p className="text-sm mb-3">
                  Approvers:
                  {element.approvers.map((approver, index) => (
                    <li key={index} className="font-mono">
                      {approver}
                    </li>
                  ))}
                </p>

                {proposalStatus[element.status] == "Pending" ? (
                  <button
                    className="btn btn-sm btn-outline w-full mb-4"
                    onClick={() => approveProposal(BigInt(element.id))}
                  >
                    Approve
                  </button>
                ) : (
                  <button
                    className="btn btn-sm btn-outline w-full mb-4"
                    onClick={() => executeProposal(BigInt(element.id))}
                  >
                    Execute
                  </button>
                )}
                {element.owner == address && (
                  <button className="btn btn-sm btn-outline w-full" onClick={() => cancelProposal(BigInt(element.id))}>
                    Cancel
                  </button>
                )}
              </div>
            ))}
        </div>

        <div className="border border-base-300 rounded-xl p-4 mb-6">
          <h2 className="font-semibold mb-4 text-center">History proposals</h2>

          {orederedProposals
            ?.filter(
              element => proposalStatus[element.status] == "Cancelled" || proposalStatus[element.status] == "Executed",
            )
            .map((element, index) => (
              <div className="border border-base-300 rounded-lg p-3 mb-4" key={index}>
                <p className="text-sm">
                  To: <span className="font-mono">{element.recipient}</span>
                </p>
                <p className="text-sm">Amount: {element.amount} wei</p>
                <p className="text-sm">
                  Confirmations: {element.approvers.length} / {Math.trunc(owners.length / 2) + 1}
                </p>
                <p className="text-sm">Status: {proposalStatus[element.status]}</p>
                <p className="text-sm mb-3">
                  Approvers:
                  {element.approvers.map((approver, index) => (
                    <li key={index} className="font-mono">
                      {approver}
                    </li>
                  ))}
                </p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default Home;
