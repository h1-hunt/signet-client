import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { fetchEstimate, fetchSignatures, postSpotlight } from "../src/api.js";

describe("api", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = global.fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("fetchEstimate", () => {
    it("returns estimate data", async () => {
      const mockData = {
        guaranteeHours: 6,
        estimatedUSDC: "12.28",
        spotlightAvailable: true,
        spotlightRemainingSeconds: 0,
      };
      global.fetch = async (url) => {
        assert.ok(url.includes("/api/x402/estimate?guaranteeHours=6"));
        return { ok: true, json: async () => mockData };
      };
      const result = await fetchEstimate(6);
      assert.deepStrictEqual(result, mockData);
    });

    it("throws on non-ok response", async () => {
      global.fetch = async () => ({
        ok: false,
        status: 500,
        text: async () => "Server Error",
      });
      await assert.rejects(() => fetchEstimate(0), /Estimate failed: 500/);
    });
  });

  describe("fetchSignatures", () => {
    it("returns signatures", async () => {
      const mockData = { signatures: [{ signatureIndex: 1 }] };
      global.fetch = async (url) => {
        assert.ok(url.includes("startIndex=0&endIndex=5"));
        return { ok: true, json: async () => mockData };
      };
      const result = await fetchSignatures(0, 5);
      assert.deepStrictEqual(result, mockData);
    });

    it("throws on error", async () => {
      global.fetch = async () => ({
        ok: false,
        status: 404,
        text: async () => "Not Found",
      });
      await assert.rejects(() => fetchSignatures(), /List failed: 404/);
    });
  });

  describe("postSpotlight", () => {
    it("returns 402 requirements", async () => {
      const requirements = { x402Version: 2, accepts: [{ amount: "12.28" }] };
      global.fetch = async () => ({
        ok: false,
        status: 402,
        json: async () => requirements,
      });
      const result = await postSpotlight({ url: "https://example.com", guaranteeHours: 0 });
      assert.strictEqual(result.status, 402);
      assert.deepStrictEqual(result.requirements, requirements);
    });

    it("returns 200 on success", async () => {
      const data = { txHash: "0xabc", url: "https://example.com" };
      global.fetch = async () => ({
        ok: true,
        status: 200,
        json: async () => data,
      });
      const result = await postSpotlight({ url: "https://example.com", guaranteeHours: 0 });
      assert.strictEqual(result.status, 200);
      assert.deepStrictEqual(result.data, data);
    });

    it("includes payment header when provided", async () => {
      global.fetch = async (url, init) => {
        assert.strictEqual(init.headers["PAYMENT-SIGNATURE"], "test-header");
        return { ok: true, status: 200, json: async () => ({}) };
      };
      await postSpotlight({ url: "https://example.com", guaranteeHours: 0, paymentHeader: "test-header" });
    });
  });
});
