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

export async function postSpotlight({ url, guaranteeHours, paymentHeader, baseUrl = DEFAULT_BASE_URL }) {
  const res = await fetch(`${baseUrl}/api/x402/spotlight`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(paymentHeader ? { "PAYMENT-SIGNATURE": paymentHeader } : {}),
    },
    body: JSON.stringify({ url, guaranteeHours }),
  });

  // 402 = payment required, return the requirements
  if (res.status === 402) {
    const body = await res.json();
    return { status: 402, requirements: body };
  }

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spotlight failed: ${res.status} ${body}`);
  }

  return { status: 200, data: await res.json() };
}
