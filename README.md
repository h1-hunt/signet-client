# Signet Client

Tools and examples for interacting with [Signet](https://signet.sebayaki.com) — onchain advertising on [Hunt Town](https://hunt.town).

## What's Inside

| Directory | Description |
|-----------|-------------|
| [`cli/`](./cli) | CLI tool — `npx signet list` and `npx signet post` |
| [`x402-example/`](./x402-example) | x402 payment protocol integration example |
| [`agent-skill/`](./agent-skill) | AI agent skill for OpenClaw / ClawHub |

## What is Signet?

Signet is an onchain advertising protocol on Base. Anyone can place a URL on the spotlight by paying HUNT tokens (or USDC/ETH via zap). The spotlight slot can be guaranteed for up to 24 hours.

- **Advertise on-chain** — URLs are stored onchain with bonding curve economics
- **HUNT-backed** — All ad spend flows through HUNT token via Mint Club bonding curves
- **AI-native** — x402 payment protocol enables AI agents to buy ad slots programmatically

## API Endpoints

Base URL: `https://signet.sebayaki.com`

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/x402/estimate?guaranteeHours=N` | GET | Estimate USDC cost for spotlight placement |
| `/api/x402/spotlight` | POST | Place a URL on spotlight (x402 payment required) |
| `/api/signature/list?startIndex=N&endIndex=N` | GET | List signatures |

## Links

- [Signet App](https://signet.sebayaki.com)
- [Hunt Town Docs](https://docs.hunt.town)
- [x402 Protocol](https://www.x402.org)
- [Hunt Town Co-op](https://hunt.town)
