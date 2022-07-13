import { Cache } from './cache';
import { CacheOptions, CacheStats, SetOptions } from './types';
import { generateKey, parseKey } from './utils';

/**
 * NamespacedCache provides isolated cache partitions on top of a shared Cache instance.
 * Each namespace gets its own key prefix, preventing collisions between different
 * parts of an application using the same cache.
 *
 * Operations scoped to a namespace only affect keys within that namespace.
 */
export class NamespacedCache<V = unknown> {
  private cache: Cache<V>;
  private namespaces: Set<string> = new Set();

  constructor(options: Partial<CacheOptions> = {}) {
    this.cache = new Cache<V>(options);
  }

  /**
   * Get the underlying cache instance (for advanced use cases).
   */
  getUnderlyingCache(): Cache<V> {
    return this.cache;
  }

  /**
   * Create or get a namespace handle for performing scoped operations.
   */
  namespace(name: string): NamespaceHandle<V> {
    this.namespaces.add(name);
    return new NamespaceHandle<V>(this.cache, name);
  }

  /**
   * List all registered namespaces.
   */
  getNamespaces(): string[] {
    return Array.from(this.namespaces);
  }

  /**
   * Clear all entries across all namespaces.
   */
  clearAll(): void {
    this.cache.clear();
  }

  /**
   * Get combined stats across all namespaces.
   */
  getStats(): CacheStats {
    return this.cache.getStats();
  }

  /**
   * Destroy the cache and release resources.
   */
  destroy(): void {
    this.cache.destroy();
    this.namespaces.clear();
  }
}

/**
 * A handle for performing cache operations scoped to a specific namespace.
 * All keys are automatically prefixed with the namespace.
 */
export class NamespaceHandle<V = unknown> {
  private cache: Cache<V>;
  private ns: string;

  constructor(cache: Cache<V>, namespace: string) {
    this.cache = cache;
    this.ns = namespace;
  }

  /**
   * Get the namespace name.
   */
  get name(): string {
    return this.ns;
  }

  /**
   * Get a value by key within this namespace.
   */
  get(key: string): V | undefined {
    return this.cache.get(generateKey(this.ns, key));
  }

  /**
   * Set a value by key within this namespace.
   */
  set(key: string, value: V, options: SetOptions = {}): void {
    this.cache.set(generateKey(this.ns, key), value, options);
  }

  /**
   * Delete a key within this namespace.
   */
  delete(key: string): boolean {
    return this.cache.delete(generateKey(this.ns, key));
  }

  /**
   * Check if a key exists within this namespace.
   */
  has(key: string): boolean {
    return this.cache.has(generateKey(this.ns, key));
  }

  /**
   * Get all keys within this namespace (without the namespace prefix).
   */
  keys(): string[] {
    const allKeys = this.cache.keys();
    const nsKeys: string[] = [];
    const prefix = `${this.ns}::`;

    for (const compositeKey of allKeys) {
      if (compositeKey.startsWith(prefix)) {
        const [, rawKey] = parseKey(compositeKey);
        nsKeys.push(rawKey);
      }
    }

    return nsKeys;
  }

  /**
   * Get all values within this namespace.
   */
  values(): V[] {
    const result: V[] = [];
    const allEntries = this.cache.entries();
    const prefix = `${this.ns}::`;

    for (const [compositeKey, value] of allEntries) {
      if (compositeKey.startsWith(prefix)) {
        result.push(value);
      }
    }

    return result;
  }

  /**
   * Get all entries within this namespace.
   */
  entries(): Array<[string, V]> {
    const result: Array<[string, V]> = [];
    const allEntries = this.cache.entries();
    const prefix = `${this.ns}::`;

    for (const [compositeKey, value] of allEntries) {
      if (compositeKey.startsWith(prefix)) {
        const [, rawKey] = parseKey(compositeKey);
        result.push([rawKey, value]);
      }
    }

    return result;
  }

  /**
   * Clear all entries within this namespace only.
   */
  clear(): void {
    const keysToDelete = this.cache.keys().filter((k) => k.startsWith(`${this.ns}::`));
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Get the count of entries in this namespace.
   */
  get size(): number {
    return this.keys().length;
  }
}
