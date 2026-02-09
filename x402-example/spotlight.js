/**
 * Signet x402 Example — Post URL to spotlight with x402 payment
 *
 * Usage:
 *   PRIVATE_KEY=0x... node spotlight.js <url> [guaranteeHours]
 *
 * Example:
 *   PRIVATE_KEY=0xabc... node spotlight.js https://example.com 6
 */

import { privateKeyToAccount } from "viem/accounts";

const SIGNET_API = "https://signet.sebayaki.com";

const privateKey = process.env.PRIVATE_KEY;
if (!privateKey) {
  console.error("Set PRIVATE_KEY environment variable");
  process.exit(1);
}

const targetUrl = process.argv[2];
if (!targetUrl) {
  console.error("Usage: PRIVATE_KEY=0x... node spotlight.js <url> [hours]");
  process.exit(1);
}

const guaranteeHours = parseInt(process.argv[3] || "0");
const account = privateKeyToAccount(privateKey);

console.log(`Wallet:  ${account.address}`);
console.log(`URL:     ${targetUrl}`);
console.log(`Hours:   ${guaranteeHours}\n`);

// Step 1: Get estimate
console.log("→ Fetching estimate...");
const estRes = await fetch(`${SIGNET_API}/api/x402/estimate?guaranteeHours=${guaranteeHours}`);
const estimate = await estRes.json();
console.log(`  Cost: $${estimate.estimatedUSDC} USDC`);
console.log(`  Available: ${estimate.spotlightAvailable}\n`);

if (!estimate.spotlightAvailable) {
  console.error(`Spotlight not available. ${Math.ceil(estimate.spotlightRemainingSeconds / 60)} min remaining.`);
  process.exit(1);
}

// Step 2: Request without payment to get 402 requirements
console.log("→ Getting payment requirements...");
const reqRes = await fetch(`${SIGNET_API}/api/x402/spotlight`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ url: targetUrl, guaranteeHours }),
});

if (reqRes.status !== 402) {
  console.log("Unexpected status:", reqRes.status, await reqRes.text());
  process.exit(1);
}

const paymentRequired = await reqRes.json();
const accepts = paymentRequired.accepts[0];
console.log(`  Amount: $${accepts.amount} USDC`);
console.log(`  Pay to: ${accepts.payTo}\n`);

// Step 3: Create payment signature
// NOTE: In production, use @x402/evm to create a proper Permit2 signature.
// This example shows the protocol flow. A real implementation needs:
//   1. USDC balance on Base
//   2. Permit2 approval
//   3. EIP-712 typed signature
console.log("→ Creating payment signature...");
const payload = {
  x402Version: paymentRequired.x402Version,
  scheme: accepts.scheme,
  network: accepts.network,
  asset: accepts.asset,
  amount: accepts.amount,
  payTo: accepts.payTo,
  from: account.address,
  maxTimeoutSeconds: accepts.maxTimeoutSeconds,
  deadline: Math.floor(Date.now() / 1000) + 300,
  nonce: `0x${Date.now().toString(16)}`,
};

const paymentHeader = Buffer.from(JSON.stringify(payload)).toString("base64");

// Step 4: Submit with payment
console.log("→ Submitting spotlight placement...\n");
const postRes = await fetch(`${SIGNET_API}/api/x402/spotlight`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "PAYMENT-SIGNATURE": paymentHeader,
  },
  body: JSON.stringify({ url: targetUrl, guaranteeHours }),
});

if (!postRes.ok) {
  const err = await postRes.json();
  console.error("❌ Failed:", err.error || err);
  process.exit(1);
}

const result = await postRes.json();
console.log("✅ Spotlight posted!");
console.log(`  TX:     ${result.txHash}`);
console.log(`  Block:  ${result.blockNumber}`);
console.log(`  USDC:   $${result.usdcSpent}`);
console.log(`  URL:    ${result.url}`);
console.log(`  Hours:  ${result.guaranteeHours}`);
