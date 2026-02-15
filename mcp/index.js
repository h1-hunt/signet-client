#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createWalletClient, http } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";

const SIGNET_BASE_URL =
  process.env.SIGNET_BASE_URL || "https://signet.sebayaki.com";
const SIGNET_RPC_URL =
  process.env.SIGNET_RPC_URL || "https://mainnet.base.org";
const USDC_ADDRESS = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";

const DEFAULT_USDC_DOMAIN = {
  name: "USD Coin",
  version: "2",
  chainId: 8453,
  verifyingContract: USDC_ADDRESS,
};

const TRANSFER_AUTH_TYPES = {
  TransferWithAuthorization: [
    { name: "from", type: "address" },
    { name: "to", type: "address" },
    { name: "value", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validBefore", type: "uint256" },
    { name: "nonce", type: "bytes32" },
  ],
};

function randomNonce() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return (
    "0x" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  );
}

function getPrivateKey() {
  const key =
    process.env.SIGNET_PRIVATE_KEY ||
    process.env.BASE_PRIVATE_KEY ||
    process.env.EVM_PRIVATE_KEY;
  if (!key) return null;
  return key.startsWith("0x") ? key : `0x${key}`;
}

function formatUSDC(amount) {
  const whole = amount / 1_000_000n;
  const frac = (amount % 1_000_000n).toString().padStart(6, "0").slice(0, 2);
  return `${whole}.${frac}`;
}

// --- Create MCP Server ---

function createServer() {
  const srv = new McpServer({
    name: "signet",
    version: "0.1.0",
  });

  registerTools(srv);
  return srv;
}

// Export for Smithery sandbox scanning
export function createSandboxServer() {
  return createServer();
}

function registerTools(server) {

server.tool(
  "signet_estimate",
  "Estimate the cost to place a spotlight ad on Signet (Base) in various tokens. Returns price and availability.",
  {
    guaranteeHours: z
      .number()
      .int()
      .min(0)
      .max(24)
      .default(0)
      .describe("Hours of guaranteed spotlight placement (0-24)"),
    token: z
      .enum(["eth", "usdc", "mt", "hunt"])
      .default("hunt")
      .describe("Token to estimate cost in (eth|usdc|mt|hunt)"),
  },
  async ({ guaranteeHours, token }) => {
    // For backward compatibility, still support USDC via API
    if (token === "usdc") {
      const url = `${SIGNET_BASE_URL}/api/x402/estimate?guaranteeHours=${guaranteeHours}`;
      const res = await fetch(url);

      if (!res.ok) {
        return {
          content: [
            {
              type: "text",
              text: `Error: Signet API returned ${res.status}: ${await res.text()}`,
            },
          ],
        };
      }

      const data = await res.json();
      const availability = data.spotlightAvailable
        ? "Available now"
        : `Occupied (${Math.ceil(data.spotlightRemainingSeconds / 60)}min remaining)`;

      return {
        content: [
          {
            type: "text",
            text: [
              `Signet Spotlight Estimate`,
              `• Cost: $${data.estimatedUSDC} USDC`,
              `• Guarantee: ${guaranteeHours}h`,
              `• Spotlight: ${availability}`,
              ``,
              `To post an ad, use signet_post (x402) or signet_sign (direct on-chain).`,
            ].join("\n"),
          },
        ],
      };
    }

    // For other tokens, use the CLI estimate command
    try {
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);

      const result = await execAsync(
        `cd /tmp && npx @signet-base/cli estimate --hours ${guaranteeHours} --token ${token}`,
        { timeout: 30000 }
      );

      return {
        content: [
          {
            type: "text",
            text: [
              `Signet Spotlight Estimate`,
              result.stdout.trim(),
              ``,
              `To post an ad, use signet_sign with the same token.`,
            ].join("\n"),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error running estimate: ${error.message}`,
          },
        ],
      };
    }
  }
);

// --- Tool: sign ---

server.tool(
  "signet_sign",
  "Sign on Signet by paying directly on-chain with ETH, USDC, HUNT, or MT tokens. Bypasses x402 protocol for direct blockchain interaction.",
  {
    url: z.string().url().describe("URL to promote on the spotlight"),
    hours: z
      .number()
      .int()
      .min(1)
      .max(24)
      .describe("Hours of guaranteed spotlight placement (1-24)"),
    token: z
      .enum(["eth", "usdc", "mt", "hunt", "auto"])
      .default("auto")
      .describe("Token to pay with. 'auto' selects best available token."),
    privateKey: z
      .string()
      .optional()
      .describe("Private key (without 0x prefix). If not provided, uses environment variables."),
    slippage: z
      .number()
      .min(0)
      .max(50)
      .default(5)
      .describe("Slippage tolerance percentage (0-50)"),
  },
  async ({ url: targetUrl, hours, token, privateKey, slippage }) => {
    const finalPrivateKey = privateKey || getPrivateKey();
    
    if (!finalPrivateKey) {
      return {
        content: [
          {
            type: "text",
            text: "Error: No private key provided. Set SIGNET_PRIVATE_KEY, BASE_PRIVATE_KEY, or EVM_PRIVATE_KEY environment variable, or provide privateKey parameter.",
          },
        ],
      };
    }

    try {
      const { exec } = await import("child_process");
      const { promisify } = await import("util");
      const execAsync = promisify(exec);

      const cmd = [
        "npx @signet-base/cli sign",
        `--url "${targetUrl}"`,
        `--hours ${hours}`,
        `--token ${token}`,
        `--private-key ${finalPrivateKey}`,
        `--slippage ${slippage}`,
      ].join(" ");

      const result = await execAsync(cmd, { 
        timeout: 120000, // 2 minute timeout for blockchain operations
        cwd: "/tmp"
      });

      return {
        content: [
          {
            type: "text",
            text: [
              `Signet Sign Result:`,
              result.stdout.trim(),
            ].join("\n"),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message || error.stderr || String(error)}`,
          },
        ],
      };
    }
  }
);

// --- Tool: post ---

server.tool(
  "signet_post",
  "Post a URL to the Signet spotlight by paying USDC on Base via x402. Requires SIGNET_PRIVATE_KEY env var.",
  {
    url: z.string().url().describe("URL to promote on the spotlight"),
    guaranteeHours: z
      .number()
      .int()
      .min(0)
      .max(24)
      .default(0)
      .describe("Hours of guaranteed spotlight placement (0-24)"),
  },
  async ({ url: targetUrl, guaranteeHours }) => {
    const privateKey = getPrivateKey();
    if (!privateKey) {
      return {
        content: [
          {
            type: "text",
            text: "Error: No private key configured. Set SIGNET_PRIVATE_KEY, BASE_PRIVATE_KEY, or EVM_PRIVATE_KEY environment variable.",
          },
        ],
      };
    }

    try {
      const account = privateKeyToAccount(privateKey);
      const walletClient = createWalletClient({
        account,
        chain: base,
        transport: http(SIGNET_RPC_URL),
      });

      // Step 1: Get payment requirements
      const spotlightUrl = `${SIGNET_BASE_URL}/api/x402/spotlight`;
      const body = JSON.stringify({ url: targetUrl, guaranteeHours });

      const initialRes = await fetch(spotlightUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });

      if (initialRes.ok) {
        const result = await initialRes.json();
        return {
          content: [
            { type: "text", text: `Spotlight posted! TX: ${result.txHash}` },
          ],
        };
      }

      if (initialRes.status !== 402) {
        const errText = await initialRes.text();
        return {
          content: [
            {
              type: "text",
              text: `Error: Expected 402, got ${initialRes.status}: ${errText}`,
            },
          ],
        };
      }

      // Step 2: Parse payment requirements
      const paymentData = await initialRes.json();
      const req = Array.isArray(paymentData) ? paymentData[0] : paymentData;

      if (!req?.network || !req?.amount || !req?.payTo) {
        return {
          content: [
            {
              type: "text",
              text: "Error: Invalid payment requirements from Signet",
            },
          ],
        };
      }

      // Step 3: Sign EIP-3009 transferWithAuthorization
      const amount = BigInt(req.amount);
      const validAfter = 0n;
      const validBefore = BigInt(Math.floor(Date.now() / 1000) + 3600);
      const nonce = randomNonce();
      const domain = req.extra?.eip712Domain || DEFAULT_USDC_DOMAIN;

      const signature = await walletClient.signTypedData({
        domain: {
          name: domain.name,
          version: domain.version,
          chainId: BigInt(domain.chainId),
          verifyingContract: domain.verifyingContract,
        },
        types: TRANSFER_AUTH_TYPES,
        primaryType: "TransferWithAuthorization",
        message: {
          from: account.address,
          to: req.payTo,
          value: amount,
          validAfter,
          validBefore,
          nonce,
        },
      });

      // Step 4: Send with payment
      const paymentPayload = {
        x402Version: req.x402Version || 2,
        scheme: req.scheme || "exact",
        network: req.network,
        payload: {
          signature,
          authorization: {
            from: account.address,
            to: req.payTo,
            value: amount.toString(),
            validAfter: validAfter.toString(),
            validBefore: validBefore.toString(),
            nonce,
          },
        },
      };

      const paymentHeader = Buffer.from(
        JSON.stringify(paymentPayload),
        "utf8"
      ).toString("base64");

      const paidRes = await fetch(spotlightUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-PAYMENT": paymentHeader,
        },
        body,
      });

      if (!paidRes.ok) {
        const errBody = await paidRes.text();
        return {
          content: [
            {
              type: "text",
              text: `Error: Payment failed (${paidRes.status}): ${errBody}`,
            },
          ],
        };
      }

      const result = await paidRes.json();
      const costUSDC = formatUSDC(amount);

      return {
        content: [
          {
            type: "text",
            text: [
              `Spotlight Ad Posted on Signet!`,
              `• URL: ${targetUrl}`,
              `• Cost: $${costUSDC} USDC`,
              `• Guarantee: ${guaranteeHours}h`,
              `• TX: ${result.txHash}`,
              `• View: https://signet.sebayaki.com/signature/${result.signatureIndex}`,
            ].join("\n"),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${error.message || String(error)}`,
          },
        ],
      };
    }
  }
);

// --- Tool: list ---

server.tool(
  "signet_list",
  "List recent spotlight ads on Signet with view/click stats.",
  {
    count: z
      .number()
      .int()
      .min(1)
      .max(10)
      .default(5)
      .describe("Number of recent ads to show (1-10)"),
  },
  async ({ count }) => {
    // Signet API uses startIndex/endIndex, latest is highest index
    // First get the latest by estimating from known data (126+)
    const estimateRes = await fetch(
      `${SIGNET_BASE_URL}/api/x402/estimate?guaranteeHours=0`
    );
    if (!estimateRes.ok) {
      return {
        content: [{ type: "text", text: "Error: Could not reach Signet API" }],
      };
    }

    // Fetch recent signatures
    const listRes = await fetch(
      `${SIGNET_BASE_URL}/api/signature/list?startIndex=0&endIndex=${count}&sort=latest`
    );

    if (!listRes.ok) {
      // Fallback: try with high index range
      const fallbackRes = await fetch(
        `${SIGNET_BASE_URL}/api/signature/list?startIndex=120&endIndex=${120 + count}`
      );
      if (!fallbackRes.ok) {
        return {
          content: [
            { type: "text", text: `Error: ${await fallbackRes.text()}` },
          ],
        };
      }
      const data = await fallbackRes.json();
      return formatSignatureList(data.signatures || []);
    }

    const data = await listRes.json();
    return formatSignatureList(data.signatures || []);
  }
);

function formatSignatureList(signatures) {
  if (signatures.length === 0) {
    return { content: [{ type: "text", text: "No spotlight ads found." }] };
  }

  const lines = signatures.map((sig, i) => {
    const title = sig.metadata?.title || sig.url;
    const date = new Date(sig.timestamp * 1000).toISOString().split("T")[0];
    return `${i + 1}. #${sig.signatureIndex} | ${title}\n   ${sig.url}\n   Views: ${sig.viewCount} | Clicks: ${sig.clickCount} | ${date}`;
  });

  return {
    content: [
      {
        type: "text",
        text: `Recent Signet Spotlight Ads:\n\n${lines.join("\n\n")}`,
      },
    ],
  };
}

} // end registerTools

// --- Start server ---

async function main() {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
