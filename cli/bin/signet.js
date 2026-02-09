#!/usr/bin/env node
import { program } from "commander";
import { list } from "../src/commands/list.js";
import { post } from "../src/commands/post.js";
import { estimate } from "../src/commands/estimate.js";

program
  .name("signet")
  .description("Signet — onchain advertising CLI")
  .version("0.1.0");

program
  .command("list")
  .description("List recent spotlight signatures")
  .option("-n, --count <number>", "Number of signatures to show", "5")
  .option("--base-url <url>", "Signet API base URL", "https://signet.sebayaki.com")
  .action(list);

program
  .command("estimate")
  .description("Estimate USDC cost for spotlight placement")
  .option("-h, --hours <number>", "Guarantee hours (0-24)", "0")
  .option("--base-url <url>", "Signet API base URL", "https://signet.sebayaki.com")
  .action(estimate);

program
  .command("post")
  .description("Place a URL on the Signet spotlight via x402 payment")
  .requiredOption("-u, --url <url>", "URL to advertise")
  .option("-h, --hours <number>", "Guarantee hours (0-24)", "0")
  .option("-k, --private-key <key>", "Wallet private key (or set PRIVATE_KEY env)")
  .option("--base-url <url>", "Signet API base URL", "https://signet.sebayaki.com")
  .action(post);

program.parse();
