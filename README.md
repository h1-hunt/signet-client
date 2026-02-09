# Signet Client

Tools for interacting with [Signet](https://signet.sebayaki.com) — onchain advertising on Base (Hunt Town Co-op).

## Packages

| Package | Description |
|---------|-------------|
| [`cli/`](./cli) | `@signet-base/cli` — CLI for listing, estimating, and posting to Signet spotlight |
| [`x402-example/`](./x402-example) | Minimal x402 payment examples |
| [`agent-skill/`](./agent-skill) | OpenClaw agent skill for AI agents |

## Quick Start

```bash
# Estimate spotlight cost
npx @signet-base/cli estimate

# List recent signatures
npx @signet-base/cli list

# Post (simulate)
npx @signet-base/cli post --url https://example.com --hours 0 --simulate

# Post (real — needs USDC + ETH on Base)
PRIVATE_KEY=0x... npx @signet-base/cli post --url https://example.com --hours 0
```

## Agent Skill

Install the Signet skill for your AI agent:

```bash
# ClawHub (OpenClaw agents)
clawhub install signet

# skills.sh (Claude Code, Codex, etc.)
npx skills add h1-hunt/signet-client
```

## First Transaction

An AI agent posted the first x402-powered spotlight ad on Base mainnet:

🔗 [View on BaseScan](https://basescan.org/tx/0x7d5cb81b3f9de246bfbc1e689b74ae244d689380227110dc430d984969e14485)

## Links

- [Signet](https://signet.sebayaki.com) | [Hunt Town](https://docs.hunt.town) | [x402](https://www.x402.org)
