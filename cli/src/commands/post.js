import { x402Client, x402HTTPClient } from "@x402/core/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";
import { fetchEstimate, postSpotlightRaw } from "../api.js";

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

    if (!est.spotlightAvailable) {
      console.log(`   ⚠️  Spotlight is currently guaranteed. ${Math.ceil(est.spotlightRemainingSeconds / 60)} min remaining.`);
    }

    // Step 1: POST without payment to get 402 response
    console.log("1️⃣  Getting payment requirements...");
    const res402 = await postSpotlightRaw({
      url,
      guaranteeHours: hours,
      baseUrl: opts.baseUrl,
    });

    if (res402.status !== 402) {
      if (res402.ok) {
        console.log("✅ Posted (no payment was required):", await res402.json());
      } else {
        console.error("❌ Unexpected response:", res402.status, await res402.text());
      }
      return;
    }

    // Parse 402 using x402 HTTP client
    const account = privateKeyToAccount(privateKey);
    const client = new x402Client();
    registerExactEvmScheme(client, { signer: account });
    const httpClient = new x402HTTPClient(client);

    const body402 = await res402.json();
    const paymentRequired = httpClient.getPaymentRequiredResponse(
      (name) => res402.headers.get(name),
      body402
    );

    const accepts = paymentRequired.accepts?.[0];
    console.log(`   Price: $${accepts?.amount} USDC`);
    console.log(`   Pay to: ${accepts?.payTo}`);
    console.log(`   Network: ${accepts?.network}\n`);

    // Step 2: Create x402 payment signature
    console.log("2️⃣  Creating x402 payment signature...");
    console.log(`   Signer: ${account.address}`);

    const paymentPayload = await httpClient.createPaymentPayload(paymentRequired);
    const paymentHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload);

    if (simulate) {
      console.log("\n🔍 SIMULATE MODE — payment signed successfully!");
      console.log("   Payment payload created and encoded.");
      console.log("   Would submit with payment headers to execute spotlight placement.");
      console.log("\n✅ Simulation complete. No payment submitted.\n");
      return;
    }

    // Step 3: Submit with payment
    console.log("\n3️⃣  Submitting with payment...");
    const resPost = await postSpotlightRaw({
      url,
      guaranteeHours: hours,
      headers: paymentHeaders,
      baseUrl: opts.baseUrl,
    });

    if (!resPost.ok) {
      const err = await resPost.json().catch(() => ({ error: `HTTP ${resPost.status}` }));
      console.error("❌ Payment rejected:", err.error || JSON.stringify(err));
      process.exit(1);
    }

    const result = await resPost.json();
    console.log("\n✅ Spotlight posted!");
    console.log(`   TX: ${result.txHash}`);
    console.log(`   Block: ${result.blockNumber}`);
    console.log(`   USDC Spent: $${result.usdcSpent}`);
    console.log(`   URL: ${result.url}`);
    console.log(`   Guarantee: ${result.guaranteeHours}h\n`);
  } catch (err) {
    console.error("❌", err.message);
    process.exit(1);
  }
}
