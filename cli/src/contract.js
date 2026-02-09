import { createPublicClient, http, fallback, formatUnits } from "viem";
import { base } from "viem/chains";

const SIGNET_CONTRACT = "0xd53A6Ff418a5647704032089F64D9f0c5Ac958B0";
const ZAP_CONTRACT = "0x7321e0f77F69C6944C45be683b60265C17bd4a73";
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const BASE_RPC_ENDPOINTS = [
  "https://mainnet.base.org",
  "https://base.llamarpc.com",
  "https://base-rpc.publicnode.com",
];

const SIGNET_ABI = [
  {
    inputs: [],
    name: "getSignatureCount",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "index", type: "uint256" }],
    name: "getSignature",
    outputs: [{
      type: "tuple",
      components: [
        { name: "timestamp", type: "uint48" },
        { name: "blockNumber", type: "uint48" },
        { name: "userWallet", type: "address" },
        { name: "url", type: "string" },
        { name: "huntAmount", type: "uint96" },
        { name: "signetAmount", type: "uint96" },
        { name: "guaranteeHours", type: "uint8" },
      ],
    }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "startIndex", type: "uint256" },
      { name: "endIndex", type: "uint256" },
    ],
    name: "getSignatureList",
    outputs: [{
      type: "tuple[]",
      components: [
        { name: "timestamp", type: "uint48" },
        { name: "blockNumber", type: "uint48" },
        { name: "userWallet", type: "address" },
        { name: "url", type: "string" },
        { name: "huntAmount", type: "uint96" },
        { name: "signetAmount", type: "uint96" },
        { name: "guaranteeHours", type: "uint8" },
      ],
    }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "isSpotlightAvailable",
    outputs: [{ type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getSpotlightRemainingTime",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

const ZAP_ABI = [
  {
    inputs: [
      { name: "inputToken", type: "address" },
      { name: "guaranteeHours", type: "uint8" },
    ],
    name: "estimateSign",
    outputs: [
      { name: "inputAmount", type: "uint256" },
      { name: "huntAmount", type: "uint256" },
    ],
    stateMutability: "view",
    type: "function",
  },
];

function getClient() {
  return createPublicClient({
    chain: base,
    transport: fallback(
      BASE_RPC_ENDPOINTS.map(url => http(url, { timeout: 5000, retryCount: 1 })),
      { rank: false }
    ),
  });
}

export async function getSignatureCount() {
  const client = getClient();
  const count = await client.readContract({
    address: SIGNET_CONTRACT,
    abi: SIGNET_ABI,
    functionName: "getSignatureCount",
  });
  return Number(count);
}

export async function getSignatureList(startIndex, endIndex) {
  const client = getClient();
  // Contract's getSignatureList requires startIndex < endIndex
  const sigs = await client.readContract({
    address: SIGNET_CONTRACT,
    abi: SIGNET_ABI,
    functionName: "getSignatureList",
    args: [BigInt(startIndex), BigInt(endIndex + 1)], // endIndex is exclusive in contract when startIndex < endIndex
  });
  return sigs.map((sig, i) => ({
    signatureIndex: startIndex + i,
    timestamp: Number(sig.timestamp),
    blockNumber: Number(sig.blockNumber),
    userWallet: sig.userWallet,
    url: sig.url,
    huntAmount: sig.huntAmount.toString(),
    signetAmount: sig.signetAmount.toString(),
    guaranteeHours: sig.guaranteeHours,
  }));
}

export async function getSpotlightStatus() {
  const client = getClient();
  const [isAvailable, remainingTime] = await Promise.all([
    client.readContract({
      address: SIGNET_CONTRACT,
      abi: SIGNET_ABI,
      functionName: "isSpotlightAvailable",
    }),
    client.readContract({
      address: SIGNET_CONTRACT,
      abi: SIGNET_ABI,
      functionName: "getSpotlightRemainingTime",
    }),
  ]);
  return {
    spotlightAvailable: Boolean(isAvailable),
    spotlightRemainingSeconds: Number(remainingTime),
  };
}

export async function estimateUSDC(guaranteeHours) {
  const client = getClient();
  const PRICE_BUFFER_BPS = 500n; // 5% buffer matching server config

  const result = await client.simulateContract({
    address: ZAP_CONTRACT,
    abi: ZAP_ABI,
    functionName: "estimateSign",
    args: [USDC_ADDRESS, guaranteeHours],
  });

  const [usdcAmount] = result.result;
  const usdcWithBuffer = (usdcAmount * (10000n + PRICE_BUFFER_BPS)) / 10000n;

  return {
    estimatedUSDC: formatUnits(usdcWithBuffer, 6),
    estimatedUSDCRaw: usdcWithBuffer.toString(),
  };
}
