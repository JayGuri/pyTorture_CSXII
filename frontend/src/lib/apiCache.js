/**
 * In-memory GET cache with TTL and in-flight request deduplication.
 * Used by forYouApi for admin + dashboard endpoints to avoid duplicate network calls
 * when navigating between pages that share the same data.
 */

const store = new Map();
/** @type {Map<string, Promise<unknown>>} */
const inflight = new Map();

/**
 * @param {string} key
 * @param {number} ttlMs
 * @param {() => Promise<unknown>} fetcher
 */
export function withCache(key, ttlMs, fetcher) {
  const now = Date.now();
  const entry = store.get(key);
  if (entry && entry.expiresAt > now) {
    return Promise.resolve(entry.data);
  }

  const pending = inflight.get(key);
  if (pending) return pending;

  const p = fetcher()
    .then((data) => {
      store.set(key, { data, expiresAt: Date.now() + ttlMs });
      inflight.delete(key);
      return data;
    })
    .catch((err) => {
      inflight.delete(key);
      throw err;
    });

  inflight.set(key, p);
  return p;
}

export function deleteCacheKey(key) {
  store.delete(key);
  inflight.delete(key);
}

/** Remove all entries whose key starts with prefix (e.g. "leads:"). */
export function invalidateCachePrefix(prefix) {
  for (const k of [...store.keys()]) {
    if (k.startsWith(prefix)) store.delete(k);
  }
  for (const k of [...inflight.keys()]) {
    if (k.startsWith(prefix)) inflight.delete(k);
  }
}
