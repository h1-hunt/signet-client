/**
 * Signet API client
 */

const DEFAULT_BASE_URL = "https://signet.sebayaki.com";

export async function fetchEstimate(guaranteeHours = 0, baseUrl = DEFAULT_BASE_URL) {
  const res = await fetch(`${baseUrl}/api/x402/estimate?guaranteeHours=${guaranteeHours}`);
  if (!res.ok) throw new Error(`Estimate failed: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function fetchSignatures(startIndex = 0, endIndex = 5, baseUrl = DEFAULT_BASE_URL) {
  const res = await fetch(
    `${baseUrl}/api/signature/list?startIndex=${startIndex}&endIndex=${endIndex}`
  );
  if (!res.ok) throw new Error(`List failed: ${res.status} ${await res.text()}`);
  return res.json();
}

/**
 * POST to spotlight endpoint. Returns the raw Response for 402 handling.
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
