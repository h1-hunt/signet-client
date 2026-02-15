import { createPublicClient, http, fallback, formatUnits } from "viem";
import { base } from "viem/chains";

const SIGNET_CONTRACT = "0xd53A6Ff418a5647704032089F64D9f0c5Ac958B0";
const ZAP_CONTRACT = "0x7321e0f77F69C6944C45be683b60265C17bd4a73";
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

// Token addresses on Base mainnet
const TOKEN_MAP = {
  eth: "0x0000000000000000000000000000000000000000", // ETH (address(0))
  hunt: "0x37f0c2915CeCC7e977183B8543Fc0864d03E064C", // HUNT
  mt: "0xFf45161474C39cB00699070Dd49582e417b57a7E", // MT
  usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC
};

const TOKEN_DECIMALS = {
  eth: 18,
  hunt: 18,
  mt: 18,
  usdc: 6,
};

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

// SignetZapV2 ABI for the sign command
const ZAP_V2_ABI = [
  {
    inputs: [
      { name: "fromToken", type: "address" },
      { name: "url", type: "string" },
      { name: "maxFromTokenAmount", type: "uint256" },
      { name: "guaranteeHours", type: "uint8" },
    ],
    name: "sign",
    outputs: [{ name: "fromTokenUsed", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { name: "fromToken", type: "address" },
      { name: "guaranteeHours", type: "uint8" },
    ],
    name: "estimateSign",
    outputs: [
      { name: "fromTokenAmount", type: "uint256" },
      { name: "huntRequired", type: "uint256" },
    ],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: true, name: "fromToken", type: "address" },
      { name: "url", type: "string" },
      { name: "fromTokenUsed", type: "uint256" },
      { name: "huntUsed", type: "uint256" },
      { name: "guaranteeHours", type: "uint8" },
    ],
    name: "Signed",
    type: "event",
  },
];

// ERC20 ABI for allowance/approve operations
const ERC20_ABI = [
  { inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], name: "allowance", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], name: "approve", outputs: [{ type: "bool" }], stateMutability: "nonpayable", type: "function" },
  { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  { inputs: [], name: "decimals", outputs: [{ type: "uint8" }], stateMutability: "view", type: "function" },
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

// Export getClient for use in sign.js
export { getClient };

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

// New helper functions for ZapV2 contract

export async function estimateSignZap(fromToken, hours) {
  const client = getClient();
  const tokenAddress = typeof fromToken === "string" ? TOKEN_MAP[fromToken.toLowerCase()] || fromToken : fromToken;
  
  const result = await client.readContract({
    address: ZAP_CONTRACT,
    abi: ZAP_V2_ABI,
    functionName: "estimateSign",
    args: [tokenAddress, hours],
  });

  return {
    fromTokenAmount: result[0],
    huntRequired: result[1],
  };
}

export async function getTokenBalance(token, address) {
  const client = getClient();
  const tokenAddress = typeof token === "string" ? TOKEN_MAP[token.toLowerCase()] || token : token;

  if (tokenAddress === TOKEN_MAP.eth) {
    // ETH balance
    return await client.getBalance({ address });
  } else {
    // ERC20 balance
    return await client.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [address],
    });
  }
}

export async function getTokenAllowance(token, owner, spender) {
  const client = getClient();
  const tokenAddress = typeof token === "string" ? TOKEN_MAP[token.toLowerCase()] || token : token;

  if (tokenAddress === TOKEN_MAP.eth) {
    // ETH doesn't need allowance
    return 2n ** 256n - 1n; // Max value
  } else {
    // ERC20 allowance
    return await client.readContract({
      address: tokenAddress,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [owner, spender],
    });
  }
}

// Export constants for use in other files
export { TOKEN_MAP, TOKEN_DECIMALS, ZAP_V2_ABI, ERC20_ABI, ZAP_CONTRACT };
