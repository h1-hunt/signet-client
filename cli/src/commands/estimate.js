import { fetchEstimate } from "../api.js";

export async function estimate(opts) {
  const hours = parseInt(opts.hours);

  try {
    const data = await fetchEstimate(hours, opts.baseUrl);

    console.log(`\n💰 Signet Spotlight Estimate\n`);
    console.log(`  Guarantee Hours: ${data.guaranteeHours}`);
    console.log(`  Estimated Cost:  $${data.estimatedUSDC} USDC`);
    console.log(`  Spotlight Available: ${data.spotlightAvailable ? "✅ Yes" : "❌ No"}`);

    if (data.spotlightRemainingSeconds > 0) {
      const mins = Math.ceil(data.spotlightRemainingSeconds / 60);
      console.log(`  Current Guarantee Remaining: ${mins} min`);
    }

    console.log();
  } catch (err) {
    console.error("❌", err.message);
    process.exit(1);
  }
}
