---
name: signet
description: Interact with Signet onchain advertising on Hunt Town. Use when the user wants to check spotlight ad prices, list current ads/signatures, or post a URL to the Signet spotlight. Supports x402 payment protocol for programmatic ad placement by AI agents.
---

# Signet

Signet is an onchain advertising protocol on Base (Hunt Town Co-op). URLs compete for the spotlight slot, backed by HUNT tokens.

## API

Base URL: `https://signet.sebayaki.com`

### Estimate Cost

```bash
curl "https://signet.sebayaki.com/api/x402/estimate?guaranteeHours=0"
```

Response:
```json
{
  "guaranteeHours": 0,
  "estimatedUSDC": "12.28",
  "estimatedUSDCRaw": "12280000",
  "spotlightAvailable": true,
  "spotlightRemainingSeconds": 0
}
```

`guaranteeHours` (0-24): hours the spotlight is guaranteed. 0 = can be overtaken immediately.

### List Signatures

```bash
curl "https://signet.sebayaki.com/api/signature/list?startIndex=0&endIndex=5"
```

Returns `{ signatures: [{ signatureIndex, url, huntAmount, viewCount, clickCount, metadata, timestamp, userWallet }] }`.

### Post Spotlight (x402)

```bash
# Step 1: POST without payment → 402 with requirements
curl -X POST https://signet.sebayaki.com/api/x402/spotlight \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","guaranteeHours":0}'

# Step 2: POST with PAYMENT-SIGNATURE header → 200
curl -X POST https://signet.sebayaki.com/api/x402/spotlight \
  -H "Content-Type: application/json" \
  -H "PAYMENT-SIGNATURE: <base64-encoded-payment>" \
  -d '{"url":"https://example.com","guaranteeHours":0}'
```

The x402 payment flow:
1. Server returns 402 with `accepts` array (USDC amount, payTo address, network)
2. Client signs a USDC payment (Permit2 on Base)
3. Client retries with `PAYMENT-SIGNATURE` header
4. Server verifies via facilitator, executes onchain tx, settles payment

## Scripts

Use `scripts/signet.sh` for quick access:

```bash
# Estimate cost
scripts/signet.sh estimate 6

# List recent signatures
scripts/signet.sh list 5
```
