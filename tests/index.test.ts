import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { CacheStorm, Cache } from '../src/index';

describe('Cache - basic operations', () => {
  let cache: Cache<string>;

  beforeEach(() => {
    cache = CacheStorm.create<string>({ maxSize: 100 });
  });

  afterEach(() => {
    cache.destroy();
  });

  it('stores and retrieves a value', () => {
    cache.set('key1', 'value1');
    expect(cache.get('key1')).toBe('value1');
  });

  it('returns undefined for a missing key', () => {
    expect(cache.get('missing')).toBeUndefined();
  });

  it('overwrites existing values', () => {
    cache.set('key', 'old');
    cache.set('key', 'new');
    expect(cache.get('key')).toBe('new');
  });

  it('deletes a key and returns true', () => {
    cache.set('key', 'val');
    expect(cache.delete('key')).toBe(true);
    expect(cache.get('key')).toBeUndefined();
  });

  it('delete returns false for missing key', () => {
    expect(cache.delete('nonexistent')).toBe(false);
  });

  it('has returns true for existing key', () => {
    cache.set('key', 'val');
    expect(cache.has('key')).toBe(true);
  });

  it('has returns false for missing key', () => {
    expect(cache.has('missing')).toBe(false);
  });

  it('clear removes all entries', () => {
    cache.set('a', '1');
    cache.set('b', '2');
    cache.clear();
    expect(cache.size).toBe(0);
    expect(cache.get('a')).toBeUndefined();
  });

  it('keys returns all non-expired keys', () => {
    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('c', '3');
    const keys = cache.keys();
    expect(keys.sort()).toEqual(['a', 'b', 'c']);
  });

  it('values returns all non-expired values', () => {
    cache.set('x', 'hello');
    cache.set('y', 'world');
    const vals = cache.values();
    expect(vals.sort()).toEqual(['hello', 'world']);
  });

  it('entries returns key-value pairs', () => {
    cache.set('a', '1');
    cache.set('b', '2');
    const entries = cache.entries();
    expect(entries).toHaveLength(2);
    expect(entries.map(([k]) => k).sort()).toEqual(['a', 'b']);
  });

  it('size reflects current entry count', () => {
    expect(cache.size).toBe(0);
    cache.set('a', '1');
    expect(cache.size).toBe(1);
    cache.set('b', '2');
    expect(cache.size).toBe(2);
    cache.delete('a');
    expect(cache.size).toBe(1);
  });
});

describe('Cache - TTL expiration', () => {
  it('expires entries after TTL', () => {
    vi.useFakeTimers();
    const cache = CacheStorm.create<string>({ maxSize: 10, defaultTTL: 1000 });

    cache.set('key', 'value');
    expect(cache.get('key')).toBe('value');

    // Advance past TTL
    vi.advanceTimersByTime(1500);

    expect(cache.get('key')).toBeUndefined();
    expect(cache.has('key')).toBe(false);

    cache.destroy();
    vi.useRealTimers();
  });

  it('per-entry TTL overrides default TTL', () => {
    vi.useFakeTimers();
    const cache = CacheStorm.create<string>({ maxSize: 10, defaultTTL: 5000 });

    cache.set('short', 'val', { ttl: 500 });
    cache.set('long', 'val', { ttl: 10000 });

    vi.advanceTimersByTime(1000);

    expect(cache.get('short')).toBeUndefined();
    expect(cache.get('long')).toBe('val');

    cache.destroy();
    vi.useRealTimers();
  });

  it('purgeExpired removes stale entries', () => {
    vi.useFakeTimers();
    const cache = CacheStorm.create<string>({ maxSize: 10, defaultTTL: 500 });

    cache.set('a', '1');
    cache.set('b', '2');

    vi.advanceTimersByTime(1000);

    const purged = cache.purgeExpired();
    expect(purged).toBe(2);
    expect(cache.size).toBe(0);

    cache.destroy();
    vi.useRealTimers();
  });
});

describe('Cache - LRU eviction', () => {
  it('evicts least recently used entry when maxSize is reached', () => {
    const cache = CacheStorm.lru<string>(3);

    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('c', '3');

    // Access 'a' so it becomes recently used
    cache.get('a');

    // Adding 'd' should evict 'b' (least recently used)
    cache.set('d', '4');

    expect(cache.get('a')).toBe('1');
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('c')).toBe('3');
    expect(cache.get('d')).toBe('4');

    cache.destroy();
  });
});

describe('Cache - FIFO eviction', () => {
  it('evicts the first inserted entry when maxSize is reached', () => {
    const cache = CacheStorm.fifo<string>(3);

    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('c', '3');

    // FIFO doesn't care about access order
    cache.get('a');

    // Adding 'd' should evict 'a' (first inserted)
    cache.set('d', '4');

    expect(cache.get('a')).toBeUndefined();
    expect(cache.get('b')).toBe('2');
    expect(cache.get('c')).toBe('3');
    expect(cache.get('d')).toBe('4');

    cache.destroy();
  });
});

describe('Cache - LFU eviction', () => {
  it('evicts the least frequently used entry when maxSize is reached', () => {
    const cache = CacheStorm.lfu<string>(3);

    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('c', '3');

    // Access 'a' and 'c' more frequently
    cache.get('a');
    cache.get('a');
    cache.get('c');

    // 'b' has the fewest accesses, so it should be evicted
    cache.set('d', '4');

    expect(cache.get('a')).toBe('1');
    expect(cache.get('b')).toBeUndefined();
    expect(cache.get('c')).toBe('3');
    expect(cache.get('d')).toBe('4');

    cache.destroy();
  });
});

describe('Cache - statistics', () => {
  it('tracks hits and misses', () => {
    const cache = CacheStorm.create<string>({ maxSize: 10 });

    cache.set('a', '1');
    cache.get('a');      // hit
    cache.get('a');      // hit
    cache.get('missing'); // miss

    const stats = cache.getStats();
    expect(stats.hits).toBe(2);
    expect(stats.misses).toBe(1);
    expect(stats.hitRatio).toBeCloseTo(2 / 3);

    cache.destroy();
  });

  it('tracks eviction count', () => {
    const cache = CacheStorm.lru<string>(2);

    cache.set('a', '1');
    cache.set('b', '2');
    cache.set('c', '3'); // evicts 'a'
    cache.set('d', '4'); // evicts 'b'

    const stats = cache.getStats();
    expect(stats.evictions).toBe(2);

    cache.destroy();
  });
});

describe('CacheStorm factory methods', () => {
  it('create produces a working cache', () => {
    const cache = CacheStorm.create<number>({ maxSize: 5 });
    cache.set('num', 42);
    expect(cache.get('num')).toBe(42);
    cache.destroy();
  });

  it('lru creates a cache with LRU strategy', () => {
    const cache = CacheStorm.lru<string>(5);
    cache.set('x', 'y');
    expect(cache.get('x')).toBe('y');
    cache.destroy();
  });

  it('fifo creates a cache with FIFO strategy', () => {
    const cache = CacheStorm.fifo<string>(5);
    cache.set('x', 'y');
    expect(cache.get('x')).toBe('y');
    cache.destroy();
  });

  it('lfu creates a cache with LFU strategy', () => {
    const cache = CacheStorm.lfu<string>(5);
    cache.set('x', 'y');
    expect(cache.get('x')).toBe('y');
    cache.destroy();
  });
});
