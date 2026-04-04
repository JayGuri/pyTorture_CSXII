/**
 * Live FX via Frankfurter (ECB-based, no API key).
 * https://www.frankfurter.app/docs/
 */

const BASE = "https://api.frankfurter.app";

export async function fetchInrPerUnit(currencyCode, signal) {
  const code = String(currencyCode || "EUR").toUpperCase();
  if (code === "INR") return { inrPerUnit: 1, date: null, source: "identity" };

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
