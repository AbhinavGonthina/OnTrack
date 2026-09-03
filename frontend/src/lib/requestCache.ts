// De-dupes identical fetches for a short window so switching between pages that read the
// same data (e.g. the dashboard and the applications list both read the applications list)
// doesn't re-hit the backend on every single page visit - real cost given the per-user rate
// limiter's budget. This is plain in-memory module state, not localStorage/sessionStorage,
// so it never survives a hard reload - only page-to-page client-side navigation.
const TTL_MS = 15_000;

const cache = new Map<string, { promise: Promise<unknown>; expiresAt: number }>();

export function cachedFetch<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.promise as Promise<T>;
  }

  const promise = fetcher().catch((err) => {
    cache.delete(key);
    throw err;
  });
  cache.set(key, { promise, expiresAt: Date.now() + TTL_MS });
  return promise;
}

/** Call after any mutation so the next visit to a cached page fetches fresh data. */
export function invalidateCache(...keys: string[]): void {
  for (const key of keys) {
    cache.delete(key);
  }
}

// Keyed by token (not just data type) so switching accounts never serves another user's
// cached data - a plain string built the same way everywhere avoids a cache/invalidation
// mismatch from a typo'd key.
export const statsCacheKey = (token: string) => `stats:${token}`;
export const applicationsCacheKey = (token: string) => `applications:${token}`;
export const profileCacheKey = (token: string) => `profile:${token}`;
