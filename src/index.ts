/**
 * Cache Storm - TypeScript caching abstraction layer
 * with TTL, LRU/FIFO/LFU eviction, and namespace support.
 *
 * @example
 * ```ts
 * import { CacheStorm } from 'cache-storm';
 *
 * const cache = CacheStorm.create<string>({
 *   maxSize: 100,
 *   defaultTTL: 60_000,
 *   strategy: 'lru',
 * });
 *
 * cache.set('user:1', 'Alice');
 * console.log(cache.get('user:1')); // 'Alice'
 * ```
 */

import { Cache } from './cache';
import { NamespacedCache, NamespaceHandle } from './namespace';
import { CacheOptions, CacheStats, SetOptions, EvictionStrategyType } from './types';

/**
 * CacheStorm is the main entry point for creating cache instances.
 * Provides factory methods for simple caches and namespaced caches.
 */
export class CacheStorm {
  /**
   * Create a new typed cache instance.
   *
   * @param options - Cache configuration: maxSize, defaultTTL, strategy, slidingExpiration
   * @returns A new Cache instance
   *
   * @example
   * ```ts
   * const cache = CacheStorm.create<number>({ maxSize: 500, strategy: 'lfu' });
   * cache.set('counter', 42);
   * ```
   */
  static create<V = unknown>(options: Partial<CacheOptions> = {}): Cache<V> {
    return new Cache<V>(options);
  }

  /**
   * Create a namespaced cache that supports isolated partitions.
   *
   * @param options - Shared cache configuration
   * @returns A new NamespacedCache instance
   *
   * @example
   * ```ts
   * const nsCache = CacheStorm.createNamespaced<string>();
   * const users = nsCache.namespace('users');
   * const sessions = nsCache.namespace('sessions');
   *
   * users.set('1', 'Alice');
   * sessions.set('abc', 'token-xyz');
   * ```
   */
  static createNamespaced<V = unknown>(
    options: Partial<CacheOptions> = {}
  ): NamespacedCache<V> {
    return new NamespacedCache<V>(options);
  }

  /**
   * Create a cache with LRU eviction and the specified max size.
   * Convenience shortcut for the most common use case.
   */
  static lru<V = unknown>(maxSize: number, defaultTTL: number = 0): Cache<V> {
    return new Cache<V>({ maxSize, defaultTTL, strategy: 'lru' });
  }

  /**
   * Create a cache with FIFO eviction and the specified max size.
   */
  static fifo<V = unknown>(maxSize: number, defaultTTL: number = 0): Cache<V> {
    return new Cache<V>({ maxSize, defaultTTL, strategy: 'fifo' });
  }

  /**
   * Create a cache with LFU eviction and the specified max size.
   */
  static lfu<V = unknown>(maxSize: number, defaultTTL: number = 0): Cache<V> {
    return new Cache<V>({ maxSize, defaultTTL, strategy: 'lfu' });
  }
}

// Re-export everything for direct imports
export { Cache } from './cache';
export { NamespacedCache, NamespaceHandle } from './namespace';
export { LRUStrategy } from './strategies/lru';
export { FIFOStrategy } from './strategies/fifo';
export { LFUStrategy } from './strategies/lfu';
export { serialize, deserialize, deepClone, isSerializable, SerializationError } from './serializer';
export { isExpired, generateKey, parseKey, remainingTTL, createEntry, touchEntry } from './utils';
export type {
  CacheOptions,
  CacheEntry,
  CacheStats,
  EvictionStrategy,
  EvictionStrategyType,
  SetOptions,
} from './types';
