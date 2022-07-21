/**
 * Cache Storm - Basic Usage Examples
 *
 * Run with: npx ts-node examples/basic.ts
 */

import { CacheStorm } from '../src/index';

// ============================================================
// Example 1: Simple LRU cache with TTL
// ============================================================
console.log('=== Example 1: LRU Cache with TTL ===\n');

const lruCache = CacheStorm.create<string>({
  maxSize: 5,
  defaultTTL: 5000, // 5 seconds
  strategy: 'lru',
});

lruCache.set('user:1', 'Alice');
lruCache.set('user:2', 'Bob');
lruCache.set('user:3', 'Charlie');
lruCache.set('user:4', 'Diana');
lruCache.set('user:5', 'Eve');

console.log('Cache size:', lruCache.size);
console.log('Get user:1:', lruCache.get('user:1')); // 'Alice'
console.log('Has user:3:', lruCache.has('user:3')); // true

// Adding a 6th entry evicts the least recently used (user:2 since user:1 was just accessed)
lruCache.set('user:6', 'Frank');
console.log('After adding user:6 (size=5):');
console.log('  user:2 (should be evicted):', lruCache.get('user:2')); // undefined
console.log('  user:6:', lruCache.get('user:6')); // 'Frank'
console.log('  Stats:', lruCache.getStats());

// ============================================================
// Example 2: LFU cache
// ============================================================
console.log('\n=== Example 2: LFU Cache ===\n');

const lfuCache = CacheStorm.lfu<number>(3);

lfuCache.set('a', 1);
lfuCache.set('b', 2);
lfuCache.set('c', 3);

// Access 'a' and 'b' multiple times to increase their frequency
lfuCache.get('a');
lfuCache.get('a');
lfuCache.get('a');
lfuCache.get('b');
lfuCache.get('b');

// 'c' has the lowest frequency, so it will be evicted
lfuCache.set('d', 4);
console.log('a (freq=4):', lfuCache.get('a')); // 1
console.log('b (freq=3):', lfuCache.get('b')); // 2
console.log('c (evicted):', lfuCache.get('c')); // undefined
console.log('d (new):', lfuCache.get('d'));     // 4

// ============================================================
// Example 3: Namespaced cache
// ============================================================
console.log('\n=== Example 3: Namespaced Cache ===\n');

const nsCache = CacheStorm.createNamespaced<string>({
  maxSize: 100,
  defaultTTL: 60_000,
  strategy: 'lru',
});

const users = nsCache.namespace('users');
const sessions = nsCache.namespace('sessions');
const config = nsCache.namespace('config');

users.set('1', 'Alice');
users.set('2', 'Bob');
sessions.set('sess_abc', 'user:1');
sessions.set('sess_def', 'user:2');
config.set('theme', 'dark');

console.log('Users namespace keys:', users.keys());
console.log('Sessions namespace keys:', sessions.keys());
console.log('Config namespace keys:', config.keys());
console.log('All namespaces:', nsCache.getNamespaces());
console.log('Users size:', users.size);
console.log('Sessions size:', sessions.size);

// Clear only the sessions namespace
sessions.clear();
console.log('After clearing sessions:');
console.log('  Sessions size:', sessions.size);
console.log('  Users size:', users.size);   // Still 2
console.log('  Config size:', config.size); // Still 1

// ============================================================
// Example 4: Sliding expiration
// ============================================================
console.log('\n=== Example 4: Sliding Expiration ===\n');

const slidingCache = CacheStorm.create<string>({
  maxSize: 10,
  defaultTTL: 2000, // 2 seconds
  strategy: 'lru',
  slidingExpiration: true,
});

slidingCache.set('token', 'abc123');
console.log('Token set with 2s TTL (sliding)');
console.log('Token:', slidingCache.get('token')); // Resets the 2s TTL

// ============================================================
// Example 5: Per-entry TTL and custom weight
// ============================================================
console.log('\n=== Example 5: Per-entry TTL & Weight ===\n');

const flexCache = CacheStorm.create<object>({
  maxSize: 100,
  defaultTTL: 30_000, // 30 seconds default
  strategy: 'lru',
});

flexCache.set('small', { id: 1 }, { weight: 1 });
flexCache.set('large', { id: 2, data: 'x'.repeat(1000) }, { weight: 10, ttl: 5000 });
flexCache.set('permanent', { id: 3, role: 'admin' }, { ttl: 0 }); // Never expires

console.log('Stats:', flexCache.getStats());
console.log('Keys:', flexCache.keys());

// Cleanup
lruCache.destroy();
lfuCache.destroy();
nsCache.destroy();
slidingCache.destroy();
flexCache.destroy();

console.log('\nAll examples completed. Caches destroyed.');
