/**
 * Live FX via Frankfurter (ECB reference rates, no API key).
 * https://www.frankfurter.app/docs/
 */

const BASE = "https://api.frankfurter.app";

export async function fetchInrPerUnit(currencyCode, signal) {
  const code = String(currencyCode || "EUR").toUpperCase();
  if (code === "INR") return { inrPerUnit: 1, date: null, source: "frankfurter.app" };

  const url = `${BASE}/latest?from=${encodeURIComponent(code)}&to=INR`;
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `FX request failed (${res.status})`);
  }
  const data = await res.json();
  const rate = data?.rates?.INR;
  if (typeof rate !== "number" || !Number.isFinite(rate)) {
    throw new Error("Unexpected FX response");
  }
  return { inrPerUnit: rate, date: data.date || null, source: "frankfurter.app" };
}

/**
 * Single snapshot: how many INR for 1 EUR and 1 GBP (for dashboard display).
 */
export async function fetchEurGbpInrSpot(signal) {
  const [eurRes, gbpRes] = await Promise.all([
    fetch(`${BASE}/latest?from=EUR&to=INR`, { signal }),
    fetch(`${BASE}/latest?from=GBP&to=INR`, { signal }),
  ]);
  if (!eurRes.ok || !gbpRes.ok) {
    throw new Error("Could not load ECB reference rates.");
  }
  const eurData = await eurRes.json();
  const gbpData = await gbpRes.json();
  const eurInr = eurData?.rates?.INR;
  const gbpInr = gbpData?.rates?.INR;
  if (typeof eurInr !== "number" || typeof gbpInr !== "number") {
    throw new Error("Unexpected FX response shape.");
  }
  const date = eurData.date || gbpData.date || null;
  return {
    eurInr,
    gbpInr,
    date,
    source: "frankfurter.app (ECB)",
  };
}
