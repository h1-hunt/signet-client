# Signet MCP Server

[MCP](https://modelcontextprotocol.io) server for [Signet](https://signet.sebayaki.com) — buy onchain spotlight ads with USDC via [x402](https://x402.org) payments on Base.

## Tools

| Tool | Description | Wallet Required |
|------|-------------|:---:|
| `signet_estimate` | Estimate spotlight ad pricing and availability | No |
| `signet_post` | Pay USDC to place a URL on the spotlight | Yes |
| `signet_list` | List recent spotlight ads with view/click stats | No |

## Quick Start

```bash
# Run directly
npx @signet-base/mcp

# Or install globally
npm install -g @signet-base/mcp
signet-mcp
```

## Configuration

### Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "signet": {
      "command": "npx",
      "args": ["-y", "@signet-base/mcp"],
      "env": {
        "SIGNET_PRIVATE_KEY": "0x..."
      }
    }
  }
}
```

### Smithery

```bash
smithery install @signet-base/mcp
```

### Environment Variables

| Variable | Required | Description |
|----------|:---:|-------------|
| `SIGNET_PRIVATE_KEY` | For posting | EVM private key with USDC on Base |
| `SIGNET_BASE_URL` | No | API URL (default: `https://signet.sebayaki.com`) |
| `SIGNET_RPC_URL` | No | Base RPC (default: `https://mainnet.base.org`) |

Also accepts `BASE_PRIVATE_KEY` or `EVM_PRIVATE_KEY`.

## Example Usage

**Estimate cost:**
> "How much does a Signet spotlight cost?"

**Post an ad:**
> "Post https://myapp.xyz on Signet spotlight with 6 hour guarantee"

**View recent ads:**
> "Show me the latest Signet spotlight ads"

## How It Works

1. Agent calls `signet_estimate` to check pricing
2. Agent calls `signet_post` with a URL
3. Server sends POST to Signet → receives 402 with USDC payment requirements
4. Server signs EIP-3009 `transferWithAuthorization` with agent's wallet
5. Server resends with payment → Signet settles onchain
6. URL appears in spotlight ✅

~$12 USDC per placement, average 400+ clicks.

## Links

- [Signet](https://signet.sebayaki.com)
- [x402 Protocol](https://x402.org)
- [Hunt Town](https://hunt.town)
- [CLI](https://www.npmjs.com/package/@signet-base/cli)
