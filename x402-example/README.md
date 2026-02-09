# Signet x402 Example

Minimal example showing how to interact with Signet's x402-gated spotlight API.

## What is x402?

[x402](https://www.x402.org) is an HTTP-native payment protocol. When a server requires payment, it returns `402 Payment Required` with payment details. The client signs a USDC payment and retries with the signature.

## Flow

```
Client                          Signet Server                    x402 Facilitator
  │                                  │                                │
  │── GET /api/x402/estimate ───────│                                │
  │◄─ { estimatedUSDC: "12.28" } ──│                                │
  │                                  │                                │
  │── POST /api/x402/spotlight ─────│                                │
  │   (no payment header)           │                                │
  │◄─ 402 { accepts: [...] } ──────│                                │
  │                                  │                                │
  │── POST /api/x402/spotlight ─────│                                │
  │   (PAYMENT-SIGNATURE header)    │── verify ─────────────────────│
  │                                  │◄─ valid ✅ ──────────────────│
  │                                  │  [execute spotlight tx]       │
  │                                  │── settle ─────────────────────│
  │◄─ 200 { txHash, ... } ─────────│                                │
```

## Quick Start

```bash
npm install
node estimate.js          # Check current price
node spotlight.js         # Post to spotlight (needs PRIVATE_KEY)
```

## Files

| File | Description |
|------|-------------|
| `estimate.js` | Fetch estimated USDC cost for spotlight |
| `spotlight.js` | Full x402 flow: estimate → pay → post |
