/**
 * Live FX via Frankfurter (ECB-based reference rates).
 * https://www.frankfurter.app/
 *
 * The legacy host api.frankfurter.app now 301-redirects to api.frankfurter.dev/v1.
 * Browser fetch + third-party CORS proxies often broke on that redirect (empty or
 * non-JSON `contents`). The new API serves JSON with Access-Control-Allow-Origin: *,
 * so we call it directly—no proxy.
 */
const FRANKFURT_BASE = "https://api.frankfurter.dev/v1";

export const FX_LOCALSTORAGE_KEY = "fateh.eurGbpInr.v1";

/** Fired on `window` after rates are saved (same tab + admin refresh). */
export const FX_UPDATED_EVENT = "fateh-fx-rates-updated";

/**
 * Last successful EUR/GBP → INR snapshot (shared across admin + For You).
 * @returns {{ eurInr: number, gbpInr: number, date: string|null, source?: string }|null}
 */
export function readStoredFxSnapshot() {
  try {
    const raw = localStorage.getItem(FX_LOCALSTORAGE_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (typeof o.eurInr !== "number" || typeof o.gbpInr !== "number") return null;
    if (!Number.isFinite(o.eurInr) || !Number.isFinite(o.gbpInr)) return null;
    return {
      eurInr: o.eurInr,
      gbpInr: o.gbpInr,
      date: o.date ?? null,
      source: o.source ?? "cached",
    };
  } catch {
    return null;
  }
}

function persistFxSnapshot(data) {
  try {
    const payload = {
      eurInr: data.eurInr,
      gbpInr: data.gbpInr,
      date: data.date ?? null,
      source: data.source ?? "frankfurter",
    };
    localStorage.setItem(FX_LOCALSTORAGE_KEY, JSON.stringify(payload));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent(FX_UPDATED_EVENT, { detail: payload }));
    }
  } catch (e) {
    console.warn("[exchangeRates] persist failed:", e);
  }
}

function parseFrankfurterBody(data) {
  const rate = data?.rates?.INR;
  if (typeof rate !== "number" || !Number.isFinite(rate)) {
    throw new Error("Unexpected FX response format");
  }
  return { inrPerUnit: rate, date: data.date || null, source: "frankfurter" };
}

export async function fetchInrPerUnit(currencyCode, signal) {
  const code = String(currencyCode || "EUR").toUpperCase();
  if (code === "INR") return { inrPerUnit: 1, date: null, source: "frankfurter" };

  const url = `${FRANKFURT_BASE}/latest?from=${encodeURIComponent(code)}&to=INR`;
  try {
    const res = await fetch(url, { signal });
    if (!res.ok) {
      throw new Error(`FX request failed (${res.status})`);
    }
    const data = await res.json();
    return parseFrankfurterBody(data);
  } catch (e) {
    console.error(`[exchangeRates] fetchInrPerUnit(${code}) failed:`, e);
    throw e;
  }
}

/**
 * Single snapshot: INR per 1 EUR and 1 GBP (For You budget block).
 */
export async function fetchEurGbpInrSpot(signal) {
  try {
    const eurUrl = `${FRANKFURT_BASE}/latest?from=EUR&to=INR`;
    const gbpUrl = `${FRANKFURT_BASE}/latest?from=GBP&to=INR`;

    const [eurRes, gbpRes] = await Promise.all([
      fetch(eurUrl, { signal }),
      fetch(gbpUrl, { signal }),
    ]);

    if (!eurRes.ok || !gbpRes.ok) {
      const eurStatus = eurRes.ok ? "" : `EUR: ${eurRes.status}`;
      const gbpStatus = gbpRes.ok ? "" : `GBP: ${gbpRes.status}`;
      throw new Error(
        `Exchange rate service unavailable. ${[eurStatus, gbpStatus].filter(Boolean).join(", ")}`,
      );
    }

    const [eurData, gbpData] = await Promise.all([eurRes.json(), gbpRes.json()]);

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
    const out = {
      eurInr,
      gbpInr,
      date,
      source: "frankfurter",
    };
    persistFxSnapshot(out);
    return out;
  } catch (e) {
    console.error("[exchangeRates] fetchEurGbpInrSpot failed:", e);
    throw e;
  }
}
