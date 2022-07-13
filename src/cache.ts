import {
  CacheOptions,
  CacheEntry,
  CacheStats,
  EvictionStrategy,
  EvictionStrategyType,
  SetOptions,
} from './types';
import { isExpired, createEntry, touchEntry } from './utils';
import { LRUStrategy } from './strategies/lru';
import { FIFOStrategy } from './strategies/fifo';
import { LFUStrategy } from './strategies/lfu';

/**
 * Default cache configuration values.
 */
const DEFAULTS: CacheOptions = {
  maxSize: 1000,
  defaultTTL: 0,
  strategy: 'lru',
  slidingExpiration: false,
};

/**
 * Core Cache class providing get, set, delete, has, clear, keys, and size operations
 * with TTL support, configurable eviction strategies, and hit/miss statistics.
 */
export class Cache<V = unknown> {
  private store: Map<string, CacheEntry<V>> = new Map();
  private strategy: EvictionStrategy;
  private options: CacheOptions;

  // Statistics
  private hitCount: number = 0;
  private missCount: number = 0;
  private evictionCount: number = 0;

  // Periodic cleanup interval handle
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(options: Partial<CacheOptions> = {}) {
    this.options = { ...DEFAULTS, ...options };
    this.strategy = this.createStrategy(this.options.strategy);

    // Start periodic cleanup of expired entries every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.purgeExpired();
    }, 30_000);

    // Allow the process to exit even if the interval is still running
    if (this.cleanupInterval && typeof this.cleanupInterval === 'object' && 'unref' in this.cleanupInterval) {
      this.cleanupInterval.unref();
    }
  }

  /**
   * Instantiate the correct eviction strategy based on the type.
   */
  private createStrategy(type: EvictionStrategyType): EvictionStrategy {
    switch (type) {
      case 'lru':
        return new LRUStrategy();
      case 'fifo':
        return new FIFOStrategy();
      case 'lfu':
        return new LFUStrategy();
      default:
        throw new Error(`Unknown eviction strategy: ${type}`);
    }
  }

  /**
   * Retrieve a value from the cache by key.
   * Returns undefined if the key does not exist or has expired.
   */
  get(key: string): V | undefined {
    const entry = this.store.get(key);

    if (!entry) {
      this.missCount++;
      return undefined;
    }

    // Check expiration
    if (isExpired(entry)) {
      this.delete(key);
      this.missCount++;
      return undefined;
    }

    // Update access tracking
    this.hitCount++;
    const touched = touchEntry(entry, this.options.slidingExpiration);
    this.store.set(key, touched);
    this.strategy.onAccess(key);

    return touched.value;
  }

  /**
   * Store a value in the cache with an optional per-entry TTL and weight.
   * If the cache is full, triggers eviction before inserting.
   */
  set(key: string, value: V, options: SetOptions = {}): void {
    const ttl = options.ttl ?? this.options.defaultTTL;
    const weight = options.weight ?? 1;

    // If key already exists, update in place
    if (this.store.has(key)) {
      this.strategy.onRemove(key);
    } else if (this.options.maxSize > 0 && this.store.size >= this.options.maxSize) {
      // Evict to make room
      this.evictOne();
    }

    const entry = createEntry<V>(value, ttl, weight);
    this.store.set(key, entry);
    this.strategy.onInsert(key);
  }

  /**
   * Remove an entry from the cache. Returns true if the key existed.
   */
  delete(key: string): boolean {
    const existed = this.store.has(key);
    if (existed) {
      const entry = this.store.get(key);
      this.store.delete(key);
      this.strategy.onRemove(key);
      if (entry && this.options.onEvict) {
        this.options.onEvict(key, entry.value);
      }
    }
    return existed;
  }

  /**
   * Check if a key exists in the cache and has not expired.
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (isExpired(entry)) {
      this.delete(key);
      return false;
    }
    return true;
  }

  /**
   * Remove all entries from the cache and reset statistics.
   */
  clear(): void {
    this.store.clear();
    this.strategy.clear();
    this.hitCount = 0;
    this.missCount = 0;
    this.evictionCount = 0;
  }

  /**
   * Return all non-expired keys in the cache.
   */
  keys(): string[] {
    const result: string[] = [];
    for (const [key, entry] of this.store) {
      if (!isExpired(entry)) {
        result.push(key);
      }
    }
    return result;
  }

  /**
   * Return the number of non-expired entries in the cache.
   */
  get size(): number {
    // Lazy cleanup: count only non-expired entries
    let count = 0;
    for (const entry of this.store.values()) {
      if (!isExpired(entry)) {
        count++;
      }
    }
    return count;
  }

  /**
   * Return all non-expired values in the cache.
   */
  values(): V[] {
    const result: V[] = [];
    for (const entry of this.store.values()) {
      if (!isExpired(entry)) {
        result.push(entry.value);
      }
    }
    return result;
  }

  /**
   * Return all non-expired key-value pairs.
   */
  entries(): Array<[string, V]> {
    const result: Array<[string, V]> = [];
    for (const [key, entry] of this.store) {
      if (!isExpired(entry)) {
        result.push([key, entry.value]);
      }
    }
    return result;
  }

  /**
   * Get cache statistics: entries, hits, misses, ratio, evictions.
   */
  getStats(): CacheStats {
    const totalRequests = this.hitCount + this.missCount;
    let totalWeight = 0;
    for (const entry of this.store.values()) {
      if (!isExpired(entry)) {
        totalWeight += entry.weight;
      }
    }

    return {
      entries: this.size,
      hits: this.hitCount,
      misses: this.missCount,
      hitRatio: totalRequests > 0 ? this.hitCount / totalRequests : 0,
      evictions: this.evictionCount,
      totalWeight,
      maxSize: this.options.maxSize,
    };
  }

  /**
   * Evict a single entry using the configured strategy.
   */
  private evictOne(): void {
    const keyToEvict = this.strategy.evict();
    if (keyToEvict !== undefined) {
      const entry = this.store.get(keyToEvict);
      this.store.delete(keyToEvict);
      this.evictionCount++;
      if (entry && this.options.onEvict) {
        this.options.onEvict(keyToEvict, entry.value);
      }
    }
  }

  /**
   * Purge all expired entries from the cache.
   * Called periodically and can also be called manually.
   */
  purgeExpired(): number {
    let purged = 0;
    for (const [key, entry] of this.store) {
      if (isExpired(entry)) {
        this.store.delete(key);
        this.strategy.onRemove(key);
        purged++;
      }
    }
    return purged;
  }

  /**
   * Stop the automatic cleanup interval. Call this when the cache is no longer needed.
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}
