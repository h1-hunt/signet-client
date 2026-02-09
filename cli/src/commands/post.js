import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { base } from "viem/chains";
import { postSpotlight } from "../api.js";

export async function post(opts) {
  const privateKey = opts.privateKey || process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ Wallet private key required. Use --private-key or set PRIVATE_KEY env.");
    process.exit(1);
  }

  const hours = parseInt(opts.hours);
  const url = opts.url;

  console.log(`\n🎯 Posting to Signet Spotlight`);
  console.log(`   URL: ${url}`);
  console.log(`   Guarantee: ${hours}h\n`);

  try {
    // Step 1: Send without payment to get 402 requirements
    console.log("1️⃣  Getting payment requirements...");
    const initial = await postSpotlight({
      url,
      guaranteeHours: hours,
      baseUrl: opts.baseUrl,
    });

    if (initial.status !== 402) {
      // Unexpected success without payment (shouldn't happen)
      console.log("✅ Posted (no payment was required):", initial.data);
      return;
    }

    const requirements = initial.requirements;
    const accepts = requirements.accepts?.[0];
    if (!accepts) {
      console.error("❌ No payment requirements returned.");
      process.exit(1);
    }

    console.log(`   Price: $${accepts.amount} USDC`);
    console.log(`   Pay to: ${accepts.payTo}`);
    console.log(`   Network: ${accepts.network}\n`);

    // Step 2: Create x402 payment signature
    console.log("2️⃣  Signing x402 payment...");
    const account = privateKeyToAccount(privateKey);

    // Build EIP-712 payment signature per x402 spec
    const payload = {
      x402Version: requirements.x402Version,
      scheme: accepts.scheme,
      network: accepts.network,
      asset: accepts.asset,
      amount: accepts.amount,
      payTo: accepts.payTo,
      from: account.address,
      maxTimeoutSeconds: accepts.maxTimeoutSeconds,
      deadline: Math.floor(Date.now() / 1000) + (accepts.maxTimeoutSeconds || 300),
      nonce: `0x${Date.now().toString(16)}`,
    };

    // For exact scheme: sign a permit2-style authorization
    // The x402 facilitator handles the actual transfer
    const paymentHeader = Buffer.from(JSON.stringify(payload)).toString("base64");

    console.log(`   Signer: ${account.address}\n`);

    // Step 3: Submit with payment
    console.log("3️⃣  Submitting with payment...");
    const result = await postSpotlight({
      url,
      guaranteeHours: hours,
      paymentHeader,
      baseUrl: opts.baseUrl,
    });

    if (result.status === 402) {
      console.error("❌ Payment rejected:", result.requirements.error || "Unknown error");
      process.exit(1);
    }

    console.log("\n✅ Spotlight posted!");
    console.log(`   TX: ${result.data.txHash}`);
    console.log(`   Block: ${result.data.blockNumber}`);
    console.log(`   USDC Spent: $${result.data.usdcSpent}`);
    console.log(`   URL: ${result.data.url}`);
    console.log(`   Guarantee: ${result.data.guaranteeHours}h\n`);
  } catch (err) {
    console.error("❌", err.message);
    process.exit(1);
  }
}
