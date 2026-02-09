# Signet CLI

Command-line tool for [Signet](https://signet.sebayaki.com) onchain advertising.

## Usage

```bash
# List recent spotlight signatures
npx signet-cli list
npx signet-cli list -n 10

# Estimate spotlight cost
npx signet-cli estimate
npx signet-cli estimate --hours 6

# Post a URL to spotlight (requires wallet)
npx signet-cli post --url https://example.com --hours 0
npx signet-cli post --url https://example.com --private-key 0x...
```

## Environment Variables

| Variable | Description |
|----------|-------------|
| `PRIVATE_KEY` | Wallet private key for posting (alternative to `--private-key`) |

## How It Works

1. **`list`** — Fetches recent signatures from the Signet API
2. **`estimate`** — Queries the estimated USDC cost for a spotlight placement
3. **`post`** — Uses the [x402 payment protocol](https://www.x402.org) to pay USDC and place a URL on the spotlight
