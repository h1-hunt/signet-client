#!/usr/bin/env node
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { program } from "commander";
import { list } from "../src/commands/list.js";
import { post } from "../src/commands/post.js";
import { estimate } from "../src/commands/estimate.js";
import { sign } from "../src/commands/sign.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "../package.json"), "utf-8"));

program
  .name("signet")
  .description("Signet — onchain advertising CLI")
  .version(pkg.version);

program
  .command("list")
  .description("List recent spotlight signatures")
  .option("-n, --count <number>", "Number of signatures to show", "5")
  .option("--base-url <url>", "Signet API base URL", "https://signet.sebayaki.com")
  .action(list);

program
  .command("estimate")
  .description("Estimate token cost for spotlight placement")
  .option("-h, --hours <number>", "Guarantee hours (0-24)", "0")
  .option("-t, --token <token>", "Token to use (eth|usdc|mt|hunt)", "hunt")
  .option("--simulate", "Simulate mode (same as normal for estimate)")
  .option("--base-url <url>", "Signet API base URL", "https://signet.sebayaki.com")
  .action(estimate);

program
  .command("sign")
  .description("Sign on Signet by paying directly on-chain (bypassing x402)")
  .requiredOption("-u, --url <url>", "URL to advertise")
  .requiredOption("-h, --hours <number>", "Guarantee hours (1-24)")
  .option("-t, --token <token>", "Token to use (eth|usdc|mt|hunt|auto)", "auto")
  .option("-k, --private-key <key>", "Wallet private key (or set PRIVATE_KEY env)")
  .option("--slippage <percent>", "Slippage tolerance percentage", "5")
  .action(sign);

program
  .command("post")
  .description("Place a URL on the Signet spotlight via x402 payment")
  .requiredOption("-u, --url <url>", "URL to advertise")
  .option("-h, --hours <number>", "Guarantee hours (0-24)", "0")
  .option("-k, --private-key <key>", "Wallet private key (or set PRIVATE_KEY env)")
  .option("--simulate", "Simulate: show estimate and payment requirements without posting")
  .option("--base-url <url>", "Signet API base URL", "https://signet.sebayaki.com")
  .action(post);

program.parse();
