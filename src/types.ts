/**
 * Configuration options for a cache instance.
 */
export interface CacheOptions {
  /** Maximum number of entries the cache can hold. 0 = unlimited. */
  maxSize: number;
  /** Default TTL in milliseconds. 0 = no expiration. */
  defaultTTL: number;
  /** Eviction strategy when cache is full. */
  strategy: EvictionStrategyType;
  /** Whether to reset TTL on access (sliding expiration). */
  slidingExpiration: boolean;
  /** Callback invoked when an entry is evicted. */
  onEvict?: (key: string, value: unknown) => void;
}

/**
 * A single entry stored in the cache.
 */
export interface CacheEntry<T = unknown> {
  /** The stored value. */
  value: T;
  /** Timestamp (ms) when the entry was created. */
  createdAt: number;
  /** Timestamp (ms) when the entry was last accessed. */
  lastAccessed: number;
  /** Timestamp (ms) when the entry expires. 0 = never. */
  expiresAt: number;
  /** Number of times this entry has been accessed. */
  accessCount: number;
  /** Size weight of this entry (defaults to 1). */
  weight: number;
}

/**
 * Supported eviction strategy identifiers.
 */
export type EvictionStrategyType = 'lru' | 'fifo' | 'lfu';

/**
 * Interface that all eviction strategies must implement.
 */
export interface EvictionStrategy {
  /** Called when an entry is accessed (get). */
  onAccess(key: string): void;
  /** Called when a new entry is added (set). */
  onInsert(key: string): void;
  /** Called when an entry is manually removed (delete). */
  onRemove(key: string): void;
  /** Returns the key that should be evicted next. */
  evict(): string | undefined;
  /** Clears all tracking state. */
  clear(): void;
  /** Returns current number of tracked keys. */
  size(): number;
}

/**
 * Options for setting a cache entry.
 */
export interface SetOptions {
  /** TTL in milliseconds for this specific entry. Overrides default. */
  ttl?: number;
  /** Weight/size of this entry for size-based eviction. */
  weight?: number;
}

/**
 * Statistics about the cache.
 */
export interface CacheStats {
  /** Total number of entries. */
  entries: number;
  /** Number of cache hits. */
  hits: number;
  /** Number of cache misses. */
  misses: number;
  /** Hit ratio (0-1). */
  hitRatio: number;
  /** Number of evictions that have occurred. */
  evictions: number;
  /** Total weight of all entries. */
  totalWeight: number;
  /** Maximum allowed entries. */
  maxSize: number;
}
