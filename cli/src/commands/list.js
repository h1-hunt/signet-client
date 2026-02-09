import { fetchSignatures } from "../api.js";

export async function list(opts) {
  const count = parseInt(opts.count);

  try {
    // Find the latest signature index by probing
    let high = 100;
    let latestIndex = -1;

    // Quick probe to find approximate range
    for (const probe of [1000, 500, 100, 50, 20, 10]) {
      const { signatures } = await fetchSignatures(Math.max(0, probe - 1), probe, opts.baseUrl);
      if (signatures?.length > 0) {
        latestIndex = Math.max(latestIndex, ...signatures.map(s => s.signatureIndex));
        break;
      }
    }

    // If no high index found, try from 0
    if (latestIndex < 0) {
      const { signatures } = await fetchSignatures(0, 9, opts.baseUrl);
      if (!signatures?.length) {
        console.log("No signatures found.");
        return;
      }
      latestIndex = Math.max(...signatures.map(s => s.signatureIndex));
    }

    // Fetch the most recent signatures
    const startIndex = Math.max(0, latestIndex - count + 1);
    const { signatures } = await fetchSignatures(startIndex, latestIndex, opts.baseUrl);

    if (!signatures?.length) {
      console.log("No signatures found.");
      return;
    }

    // Sort descending (most recent first)
    signatures.sort((a, b) => b.signatureIndex - a.signatureIndex);
    const display = signatures.slice(0, count);

    console.log(`\n📋 Recent Signet Signatures (${display.length})\n`);

    for (const sig of display) {
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
