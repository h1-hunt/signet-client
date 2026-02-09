import { fetchSignatures } from "../api.js";

export async function list(opts) {
  const count = parseInt(opts.count);
  const endIndex = count;

  try {
    const { signatures } = await fetchSignatures(0, endIndex, opts.baseUrl);

    if (!signatures?.length) {
      console.log("No signatures found.");
      return;
    }

    console.log(`\n📋 Recent Signet Signatures (${signatures.length})\n`);

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
