/**
 * Signet API client — only for x402 spotlight endpoint (requires HTTP for payment headers)
 */

const DEFAULT_BASE_URL = "https://signet.sebayaki.com";

/**
 * POST to spotlight endpoint. Returns the raw Response for x402 header handling.
 */
export async function postSpotlightRaw({ url, guaranteeHours, headers = {}, baseUrl = DEFAULT_BASE_URL }) {
  return fetch(`${baseUrl}/api/x402/spotlight`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
    body: JSON.stringify({ url, guaranteeHours }),
  });
}
