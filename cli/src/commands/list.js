import { getSignatureCount, getSignatureList } from "../contract.js";

export async function list(opts) {
  const count = parseInt(opts.count);

  try {
    const total = await getSignatureCount();

    if (total === 0) {
      console.log("No signatures found.");
      return;
    }

    const latestIndex = total - 1;
    const startIndex = Math.max(0, latestIndex - count + 1);
    const signatures = await getSignatureList(startIndex, latestIndex);

    // Sort descending (most recent first)
    signatures.sort((a, b) => b.signatureIndex - a.signatureIndex);

    console.log(`\n📋 Recent Signet Signatures (${signatures.length} of ${total})\n`);

    for (const sig of signatures) {
      const date = new Date(sig.timestamp * 1000).toLocaleDateString();
      const hunt = (Number(sig.huntAmount) / 1e18).toFixed(2);

      console.log(`  #${sig.signatureIndex} — ${sig.url}`);
      console.log(`     HUNT: ${hunt} | Guarantee: ${sig.guaranteeHours}h`);
      console.log(`     Date: ${date} | Wallet: ${sig.userWallet.slice(0, 8)}...`);
      console.log();
    }
  } catch (err) {
    console.error("❌", err.message);
    process.exit(1);
  }
}
