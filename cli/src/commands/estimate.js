import { formatUnits } from "viem";
import { estimateUSDC, estimateSignZap, getSpotlightStatus, TOKEN_MAP, TOKEN_DECIMALS } from "../contract.js";

export async function estimate(opts) {
  const hours = parseInt(opts.hours);
  const token = (opts.token || "hunt").toLowerCase();

  if (!TOKEN_MAP[token]) {
    console.error(`❌ Unknown token: ${opts.token}. Use: eth, usdc, mt, hunt`);
    process.exit(1);
  }

  try {
    const tokenAddress = TOKEN_MAP[token];
    const tokenDecimals = TOKEN_DECIMALS[token];

    const [zapEstimate, spotlight] = await Promise.all([
      estimateSignZap(tokenAddress, hours),
      getSpotlightStatus(),
    ]);

    console.log(`\n💰 Signet Spotlight Estimate\n`);
    console.log(`  Guarantee Hours: ${hours}`);
    console.log(`  Estimated Cost:  ${formatUnits(zapEstimate.fromTokenAmount, tokenDecimals)} ${token.toUpperCase()}`);
    console.log(`  HUNT Required:   ${formatUnits(zapEstimate.huntRequired, 18)} HUNT`);
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
