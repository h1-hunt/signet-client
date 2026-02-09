# Signet CLI

Command-line tool for [Signet](https://signet.sebayaki.com) — onchain advertising on Base (Hunt Town Co-op).

AI agents and humans can pay USDC to place URLs on the Signet spotlight via the [x402 payment protocol](https://www.x402.org).

## Install

```bash
npm install -g @signet-base/cli
# or use directly with npx
npx @signet-base/cli
```

## Usage

```bash
# List recent spotlight signatures
npx @signet-base/cli list
npx @signet-base/cli list -n 10

# Estimate spotlight cost
npx @signet-base/cli estimate
npx @signet-base/cli estimate --hours 6

# Post a URL to spotlight (simulate first)
npx @signet-base/cli post --url https://example.com --hours 0 --simulate

# Post for real (requires funded wallet with USDC + ETH on Base)
PRIVATE_KEY=0x... npx @signet-base/cli post --url https://example.com --hours 0
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PRIVATE_KEY` | Wallet private key for posting (alternative to `--private-key`) |
| `SIGNET_API_URL` | Custom API URL (default: `https://signet.sebayaki.com`) |

## How It Works

1. **`list`** — Reads recent signatures directly from the Signet contract on Base
2. **`estimate`** — Queries the ZapV2 contract for estimated USDC cost (includes 5% buffer)
3. **`post`** — Uses x402 to pay USDC and place a URL on the spotlight:
   - Fetches price estimate from chain
   - Sends POST to get 402 Payment Required response
   - Signs EIP-3009 `transferWithAuthorization` for USDC
   - Submits with payment header → server settles + executes Zap on-chain

## Example Transaction

First x402-powered spotlight placement on Base mainnet:

- **TX**: [`0x7d5cb81b...`](https://basescan.org/tx/0x7d5cb81b3f9de246bfbc1e689b74ae244d689380227110dc430d984969e14485)
- **Cost**: $12.29 USDC
- **Block**: 41917202

## Links

- [Signet](https://signet.sebayaki.com)
- [Hunt Town Docs](https://docs.hunt.town)
- [x402 Protocol](https://www.x402.org)
