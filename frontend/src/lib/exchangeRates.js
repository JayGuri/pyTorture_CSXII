/**
 * Live FX via Frankfurter through allorigins CORS proxy (free, no auth needed).
 * https://www.frankfurter.app/
 */

const FRANKFURT_BASE = "https://api.frankfurter.app";
const CORS_PROXY = "https://api.allorigins.win/get";

export async function fetchInrPerUnit(currencyCode, signal) {
  const code = String(currencyCode || "EUR").toUpperCase();
  if (code === "INR") return { inrPerUnit: 1, date: null, source: "frankfurter" };

  const frankfurterUrl = `${FRANKFURT_BASE}/latest?from=${encodeURIComponent(code)}&to=INR`;
  const url = `${CORS_PROXY}?url=${encodeURIComponent(frankfurterUrl)}`;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) {
      throw new Error(`FX request failed (${res.status})`);
    }
    const data = await res.json();
    const parsedData = JSON.parse(data.contents);
    const rate = parsedData?.rates?.INR;
    if (typeof rate !== "number" || !Number.isFinite(rate)) {
      throw new Error("Unexpected FX response format");
    }
    return { inrPerUnit: rate, date: parsedData.date || null, source: "frankfurter" };
  } catch (e) {
    console.error(`[exchangeRates] fetchInrPerUnit(${code}) failed:`, e);
    throw e;
  }
}

/**
 * Single snapshot: how many INR for 1 EUR and 1 GBP (for dashboard display).
 * Uses CORS proxy to access Frankfurter without needing a backend.
 */
export async function fetchEurGbpInrSpot(signal) {
  try {
    const eurFrankfurterUrl = `${FRANKFURT_BASE}/latest?from=EUR&to=INR`;
    const gbpFrankfurterUrl = `${FRANKFURT_BASE}/latest?from=GBP&to=INR`;

    const [eurRes, gbpRes] = await Promise.all([
      fetch(`${CORS_PROXY}?url=${encodeURIComponent(eurFrankfurterUrl)}`, { signal }),
      fetch(`${CORS_PROXY}?url=${encodeURIComponent(gbpFrankfurterUrl)}`, { signal }),
    ]);

    if (!eurRes.ok || !gbpRes.ok) {
      const eurStatus = eurRes.ok ? "" : `EUR: ${eurRes.status}`;
      const gbpStatus = gbpRes.ok ? "" : `GBP: ${gbpRes.status}`;
      throw new Error(`Exchange rate service unavailable. ${[eurStatus, gbpStatus].filter(Boolean).join(", ")}`);
    }

    const eurProxyRes = await eurRes.json();
    const gbpProxyRes = await gbpRes.json();

    const eurData = JSON.parse(eurProxyRes.contents);
    const gbpData = JSON.parse(gbpProxyRes.contents);

    const eurInr = eurData?.rates?.INR;
    const gbpInr = gbpData?.rates?.INR;

    if (typeof eurInr !== "number" || typeof gbpInr !== "number") {
      console.error("[exchangeRates] Invalid response format. EUR:", eurData, "GBP:", gbpData);
      throw new Error("Unexpected exchange rate response format");
    }
    if (!Number.isFinite(eurInr) || !Number.isFinite(gbpInr)) {
      throw new Error("Invalid exchange rates received (NaN or Infinity)");
    }

    const date = eurData.date || gbpData.date || null;
    return {
      eurInr,
      gbpInr,
      date,
      source: "frankfurter",
    };
  } catch (e) {
    console.error("[exchangeRates] fetchEurGbpInrSpot failed:", e);
    throw e;
  }
}
