import { estimateUSDC, getSpotlightStatus } from "../contract.js";

export async function estimate(opts) {
  const hours = parseInt(opts.hours);

  try {
    const [priceData, spotlight] = await Promise.all([
      estimateUSDC(hours),
      getSpotlightStatus(),
    ]);

    console.log(`\n💰 Signet Spotlight Estimate\n`);
    console.log(`  Guarantee Hours: ${hours}`);
    console.log(`  Estimated Cost:  $${priceData.estimatedUSDC} USDC`);
    console.log(`  Spotlight Available: ${spotlight.spotlightAvailable ? "✅ Yes" : "❌ No"}`);

    if (spotlight.spotlightRemainingSeconds > 0) {
      const mins = Math.ceil(spotlight.spotlightRemainingSeconds / 60);
      console.log(`  Current Guarantee Remaining: ${mins} min`);
    }

    console.log();
  } catch (err) {
    console.error("❌", err.message);
    process.exit(1);
  }
}
