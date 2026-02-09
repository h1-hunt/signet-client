import { x402Client, x402HTTPClient } from "@x402/core/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";
import { fetchEstimate, postSpotlight } from "../api.js";

export async function post(opts) {
  const privateKey = opts.privateKey || process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error("❌ Wallet private key required. Use --private-key or set PRIVATE_KEY env.");
    process.exit(1);
  }

  const hours = parseInt(opts.hours);
  const url = opts.url;
  const simulate = opts.simulate || false;

  console.log(`\n🎯 Posting to Signet Spotlight${simulate ? " (SIMULATE)" : ""}`);
  console.log(`   URL: ${url}`);
  console.log(`   Guarantee: ${hours}h\n`);

  try {
    // Step 0: Get estimate
    console.log("0️⃣  Fetching estimate...");
    const est = await fetchEstimate(hours, opts.baseUrl);
    console.log(`   Estimated Cost: $${est.estimatedUSDC} USDC`);
    console.log(`   Available: ${est.spotlightAvailable ? "Yes" : "No"}\n`);

    // Step 1: POST without payment to get 402 requirements
    console.log("1️⃣  Getting payment requirements...");
    const initial = await postSpotlight({
      url,
      guaranteeHours: hours,
      baseUrl: opts.baseUrl,
    });

    if (initial.status !== 402) {
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

    // Step 2: Create x402 payment via proper client
    console.log("2️⃣  Creating x402 payment...");
    const account = privateKeyToAccount(privateKey);
    console.log(`   Signer: ${account.address}`);

    const client = new x402Client();
    registerExactEvmScheme(client, { signer: account });
    const httpClient = new x402HTTPClient(client);

    // Reconstruct payment required response from our parsed data
    const paymentRequired = httpClient.getPaymentRequiredResponse(
      (name) => {
        if (name.toLowerCase() === "x-402-version") return String(requirements.x402Version);
        return null;
      },
      requirements
    );

    const paymentPayload = await httpClient.createPaymentPayload(paymentRequired);
    const headers = httpClient.encodePaymentSignatureHeader(paymentPayload);

    if (simulate) {
      console.log("\n🔍 SIMULATE MODE — would send with these headers:");
      for (const [k, v] of Object.entries(headers)) {
        console.log(`   ${k}: ${v.slice(0, 80)}...`);
      }
      console.log("\n✅ Simulation complete. No payment submitted.\n");
      return;
    }

    // Step 3: Submit with payment
    console.log("\n3️⃣  Submitting with payment...");
    const result = await postSpotlight({
      url,
      guaranteeHours: hours,
      paymentHeader: headers["X-402"] || headers["PAYMENT-SIGNATURE"] || Object.values(headers)[0],
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
