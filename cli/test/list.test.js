import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { list } from "../src/commands/list.js";

describe("list command", () => {
  let originalFetch;
  let output;

  beforeEach(() => {
    originalFetch = global.fetch;
    output = [];
    const origLog = console.log;
    console.log = (...args) => output.push(args.join(" "));
    console._origLog = origLog;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    console.log = console._origLog;
  });

  it("displays signatures", async () => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        signatures: [
          {
            signatureIndex: 42,
            url: "https://example.com",
            huntAmount: "1000000000000000000",
            viewCount: 100,
            clickCount: 10,
            timestamp: 1700000000,
            userWallet: "0x1234567890abcdef1234567890abcdef12345678",
            metadata: { title: "Test Ad" },
          },
        ],
      }),
    });

    await list({ count: "5", baseUrl: "https://signet.sebayaki.com" });

    const text = output.join("\n");
    assert.ok(text.includes("#42"), "should show signature index");
    assert.ok(text.includes("Test Ad"), "should show title");
    assert.ok(text.includes("https://example.com"), "should show URL");
    assert.ok(text.includes("1.00"), "should show HUNT amount");
  });

  it("handles empty list", async () => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({ signatures: [] }),
    });

    await list({ count: "5", baseUrl: "https://signet.sebayaki.com" });

    const text = output.join("\n");
    assert.ok(text.includes("No signatures found"), "should show empty message");
  });
});
