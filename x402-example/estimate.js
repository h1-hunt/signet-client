/**
 * Signet x402 Example — Estimate spotlight cost
 *
 * Usage: node estimate.js [guaranteeHours]
 */

const SIGNET_API = "https://signet.sebayaki.com";
const hours = parseInt(process.argv[2] || "0");

const res = await fetch(`${SIGNET_API}/api/x402/estimate?guaranteeHours=${hours}`);
const data = await res.json();

console.log("Signet Spotlight Estimate:");
console.log(`  Hours:     ${data.guaranteeHours}`);
console.log(`  Cost:      $${data.estimatedUSDC} USDC`);
console.log(`  Available: ${data.spotlightAvailable}`);
if (data.spotlightRemainingSeconds > 0) {
  console.log(`  Remaining: ${Math.ceil(data.spotlightRemainingSeconds / 60)} min`);
}
