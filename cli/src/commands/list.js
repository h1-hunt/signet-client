import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { fetchSignatures } from "../api.js";

const SIGNET_CONTRACT = "0xd53A6Ff418a5647704032089F64D9f0c5Ac958B0";
const SIGNET_ABI = [
  {
    inputs: [],
    name: "getSignatureCount",
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

async function getSignatureCount() {
  const client = createPublicClient({
    chain: base,
    transport: http(),
  });
  const count = await client.readContract({
    address: SIGNET_CONTRACT,
    abi: SIGNET_ABI,
    functionName: "getSignatureCount",
  });
  return Number(count);
}

export async function list(opts) {
  const count = parseInt(opts.count);

  try {
    const total = await getSignatureCount();

    if (total === 0) {
      console.log("No signatures found.");
      return;
    }

    // Fetch the most recent signatures (0-indexed)
    const latestIndex = total - 1;
    const startIndex = Math.max(0, latestIndex - count + 1);
    const { signatures } = await fetchSignatures(startIndex, latestIndex, opts.baseUrl);

    if (!signatures?.length) {
      console.log("No signatures found.");
      return;
    }

    // Sort descending (most recent first)
    signatures.sort((a, b) => b.signatureIndex - a.signatureIndex);

    console.log(`\n📋 Recent Signet Signatures (${signatures.length} of ${total})\n`);

    for (const sig of signatures) {
      const date = new Date(sig.timestamp * 1000).toLocaleDateString();
      const hunt = (Number(sig.huntAmount) / 1e18).toFixed(2);
      const title = sig.metadata?.title || "(no title)";

      console.log(`  #${sig.signatureIndex} — ${title}`);
      console.log(`     URL: ${sig.url}`);
      console.log(`     HUNT: ${hunt} | Views: ${sig.viewCount} | Clicks: ${sig.clickCount}`);
      console.log(`     Date: ${date} | Wallet: ${sig.userWallet.slice(0, 8)}...`);
      console.log();
    }
  } catch (err) {
    console.error("❌", err.message);
    process.exit(1);
  }
}
