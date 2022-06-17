import { CacheEntry } from './types';

/**
 * Check whether a cache entry has expired based on its expiresAt timestamp.
 * Returns true if the entry is expired, false otherwise.
 * An entry with expiresAt === 0 never expires.
 */
export function isExpired<T>(entry: CacheEntry<T>): boolean {
  if (entry.expiresAt === 0) {
    return false;
  }
  return Date.now() > entry.expiresAt;
}

/**
 * Generate a composite cache key from a namespace and a raw key.
 * If no namespace is provided, returns the raw key as-is.
 */
export function generateKey(namespace: string | undefined, key: string): string {
  if (!namespace || namespace.length === 0) {
    return key;
  }
  return `${namespace}::${key}`;
}

/**
 * Parse a composite key back into its namespace and raw key parts.
 * Returns [undefined, key] if the key has no namespace prefix.
 */
export function parseKey(compositeKey: string): [string | undefined, string] {
  const separatorIndex = compositeKey.indexOf('::');
  if (separatorIndex === -1) {
    return [undefined, compositeKey];
  }
  const namespace = compositeKey.substring(0, separatorIndex);
  const rawKey = compositeKey.substring(separatorIndex + 2);
  return [namespace, rawKey];
}

/**
 * Calculate the remaining TTL in milliseconds for a cache entry.
 * Returns 0 if the entry has no expiration, or -1 if it has already expired.
 */
export function remainingTTL<T>(entry: CacheEntry<T>): number {
  if (entry.expiresAt === 0) {
    return 0;
  }
  const remaining = entry.expiresAt - Date.now();
  return remaining > 0 ? remaining : -1;
}

/**
 * Create a new CacheEntry with the given value and options.
 */
export function createEntry<T>(value: T, ttl: number, weight: number = 1): CacheEntry<T> {
  const now = Date.now();
  return {
    value,
    createdAt: now,
    lastAccessed: now,
    expiresAt: ttl > 0 ? now + ttl : 0,
    accessCount: 0,
    weight,
  };
}

/**
 * Touch an entry: update lastAccessed timestamp and increment accessCount.
 * If slidingExpiration is true and the entry has a TTL, reset the expiration.
 */
export function touchEntry<T>(
  entry: CacheEntry<T>,
  slidingExpiration: boolean
): CacheEntry<T> {
  const now = Date.now();
  const updated: CacheEntry<T> = {
    ...entry,
    lastAccessed: now,
    accessCount: entry.accessCount + 1,
  };

  if (slidingExpiration && entry.expiresAt > 0) {
    const originalTTL = entry.expiresAt - entry.createdAt;
    updated.expiresAt = now + originalTTL;
  }

  return updated;
}
