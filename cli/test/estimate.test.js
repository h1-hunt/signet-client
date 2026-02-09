import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { estimate } from "../src/commands/estimate.js";

describe("estimate command", () => {
  let originalFetch;
  let output;

  beforeEach(() => {
    originalFetch = global.fetch;
    output = [];
    const origLog = console.log;
    console.log = (...args) => output.push(args.join(" "));
    // Store for restore
    console._origLog = origLog;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    console.log = console._origLog;
  });

  it("displays estimate info", async () => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        guaranteeHours: 6,
        estimatedUSDC: "12.28",
        spotlightAvailable: true,
        spotlightRemainingSeconds: 0,
      }),
    });

    await estimate({ hours: "6", baseUrl: "https://signet.sebayaki.com" });

    const text = output.join("\n");
    assert.ok(text.includes("12.28"), "should show USDC cost");
    assert.ok(text.includes("6"), "should show hours");
    assert.ok(text.includes("Yes"), "should show available");
  });

  it("shows remaining time when applicable", async () => {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        guaranteeHours: 0,
        estimatedUSDC: "5.00",
        spotlightAvailable: false,
        spotlightRemainingSeconds: 3600,
      }),
    });

    await estimate({ hours: "0", baseUrl: "https://signet.sebayaki.com" });

    const text = output.join("\n");
    assert.ok(text.includes("60 min"), "should show remaining minutes");
  });
});
