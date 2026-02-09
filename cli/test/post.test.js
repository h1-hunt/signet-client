import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { fetchEstimate, postSpotlight } from "../src/api.js";

describe("post command simulate flow", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("simulate flow: estimate → 402 → payment requirements extracted", async () => {
    let fetchCalls = [];

    const paymentRequirements = {
      x402Version: 2,
      accepts: [
        {
          scheme: "exact",
          network: "eip155:8453",
          asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
          amount: "12.28",
          payTo: "0x78981Ca2f04F97975EaA5b2d69Bc1db50459bDe5",
          maxTimeoutSeconds: 300,
          extra: {},
        },
      ],
      resource: {
        url: "/api/x402/spotlight",
        description: "Place URL on Signet spotlight",
        mimeType: "application/json",
      },
    };

    global.fetch = async (url, init) => {
      fetchCalls.push({ url, method: init?.method || "GET" });

      if (url.includes("/api/x402/estimate")) {
        return {
          ok: true,
          json: async () => ({
            guaranteeHours: 0,
            estimatedUSDC: "12.28",
            spotlightAvailable: true,
            spotlightRemainingSeconds: 0,
          }),
        };
      }

      if (url.includes("/api/x402/spotlight")) {
        return {
          ok: false,
          status: 402,
          json: async () => paymentRequirements,
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    };

    // Step 1: Estimate
    const est = await fetchEstimate(0);
    assert.strictEqual(est.estimatedUSDC, "12.28");
    assert.strictEqual(est.spotlightAvailable, true);

    // Step 2: Post without payment → 402
    const result = await postSpotlight({ url: "https://example.com", guaranteeHours: 0 });
    assert.strictEqual(result.status, 402);

    const reqs = result.requirements;
    assert.strictEqual(reqs.x402Version, 2);
    assert.strictEqual(reqs.accepts.length, 1);
    assert.strictEqual(reqs.accepts[0].scheme, "exact");
    assert.strictEqual(reqs.accepts[0].network, "eip155:8453");
    assert.strictEqual(reqs.accepts[0].amount, "12.28");
    assert.strictEqual(reqs.accepts[0].payTo, "0x78981Ca2f04F97975EaA5b2d69Bc1db50459bDe5");
    assert.strictEqual(reqs.accepts[0].asset, "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913");

    // In simulate mode, we would stop here (no 3rd fetch)
    assert.strictEqual(fetchCalls.length, 2);
    assert.strictEqual(fetchCalls[0].method, "GET");
    assert.strictEqual(fetchCalls[1].method, "POST");
  });

  it("full flow: estimate → 402 → payment → success", async () => {
    let fetchCalls = [];

    global.fetch = async (url, init) => {
      fetchCalls.push({ url, method: init?.method || "GET", hasPayment: !!init?.headers?.["PAYMENT-SIGNATURE"] });

      if (url.includes("/api/x402/estimate")) {
        return {
          ok: true,
          json: async () => ({
            guaranteeHours: 0,
            estimatedUSDC: "12.28",
            spotlightAvailable: true,
            spotlightRemainingSeconds: 0,
          }),
        };
      }

      if (url.includes("/api/x402/spotlight") && !init?.headers?.["PAYMENT-SIGNATURE"]) {
        return {
          ok: false,
          status: 402,
          json: async () => ({
            x402Version: 2,
            accepts: [{ scheme: "exact", network: "eip155:8453", amount: "12.28", payTo: "0x78981Ca2f04F97975EaA5b2d69Bc1db50459bDe5", asset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", maxTimeoutSeconds: 300, extra: {} }],
          }),
        };
      }

      if (url.includes("/api/x402/spotlight") && init?.headers?.["PAYMENT-SIGNATURE"]) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            txHash: "0xabc123",
            blockNumber: 12345,
            usdcSpent: "12.28",
            url: "https://example.com",
            guaranteeHours: 0,
          }),
        };
      }

      throw new Error(`Unexpected fetch: ${url}`);
    };

    const est = await fetchEstimate(0);
    const initial = await postSpotlight({ url: "https://example.com", guaranteeHours: 0 });
    assert.strictEqual(initial.status, 402);

    // Simulate creating a payment header
    const paymentHeader = Buffer.from("test-payment").toString("base64");

    const result = await postSpotlight({
      url: "https://example.com",
      guaranteeHours: 0,
      paymentHeader,
    });

    assert.strictEqual(result.status, 200);
    assert.strictEqual(result.data.txHash, "0xabc123");
    assert.strictEqual(fetchCalls.length, 3);
    assert.strictEqual(fetchCalls[2].hasPayment, true);
  });
});
