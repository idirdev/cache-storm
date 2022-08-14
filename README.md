# ⚡ Cache Storm

> Experimental project — exploring caching strategies, thundering herd protection, and invalidation patterns.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18-green.svg)](https://nodejs.org/)

A powerful TypeScript caching abstraction layer with TTL support, multiple eviction strategies (LRU, FIFO, LFU), namespace isolation, and full type safety.

## Features

- **TTL Support** — Per-entry and default time-to-live with optional sliding expiration
- **LRU Eviction** — Doubly-linked list implementation for O(1) operations
- **FIFO Eviction** — First-in-first-out eviction for predictable behavior
- **LFU Eviction** — Least frequently used with frequency counters and tie-breaking
- **Namespaces** — Isolated cache partitions sharing the same underlying store
- **Type-Safe** — Full TypeScript generics for values, options, and entries
- **Statistics** — Hit/miss ratios, eviction counts, and weight tracking
- **Serialization** — JSON serializer with Date, Map, Set, and circular reference handling
- **Zero Dependencies** — No external runtime dependencies

## Installation

```bash
npm install cache-storm
```

## Quick Start

```typescript
import { CacheStorm } from 'cache-storm';

// Create an LRU cache with max 100 entries and 60s TTL
const cache = CacheStorm.create<string>({
  maxSize: 100,
  defaultTTL: 60_000,
  strategy: 'lru',
});

cache.set('user:1', 'Alice');
cache.set('user:2', 'Bob', { ttl: 30_000 }); // Custom TTL

console.log(cache.get('user:1')); // 'Alice'
console.log(cache.size);          // 2
console.log(cache.getStats());    // { entries: 2, hits: 1, ... }
```

## API Reference

### `CacheStorm` (Factory)

| Method | Description |
|--------|-------------|
| `CacheStorm.create<V>(options?)` | Create a new cache instance |
| `CacheStorm.createNamespaced<V>(options?)` | Create a namespaced cache |
| `CacheStorm.lru<V>(maxSize, ttl?)` | Shortcut for LRU cache |
| `CacheStorm.fifo<V>(maxSize, ttl?)` | Shortcut for FIFO cache |
| `CacheStorm.lfu<V>(maxSize, ttl?)` | Shortcut for LFU cache |

### `Cache<V>`

| Method | Description |
|--------|-------------|
| `get(key)` | Retrieve a value (returns `undefined` if expired/missing) |
| `set(key, value, options?)` | Store a value with optional TTL and weight |
| `delete(key)` | Remove an entry |
| `has(key)` | Check if a non-expired entry exists |
| `clear()` | Remove all entries |
| `keys()` | Get all non-expired keys |
| `values()` | Get all non-expired values |
| `entries()` | Get all non-expired key-value pairs |
| `size` | Count of non-expired entries |
| `getStats()` | Get hit/miss/eviction statistics |
| `purgeExpired()` | Manually remove all expired entries |
| `destroy()` | Clear cache and stop cleanup timer |

### `CacheOptions`

```typescript
{
  maxSize: number;            // Max entries (0 = unlimited)
  defaultTTL: number;         // Default TTL in ms (0 = no expiration)
  strategy: 'lru' | 'fifo' | 'lfu';
  slidingExpiration: boolean;  // Reset TTL on access
  onEvict?: (key, value) => void;
}
```

## Namespaces

```typescript
const nsCache = CacheStorm.createNamespaced<string>();

const users = nsCache.namespace('users');
const sessions = nsCache.namespace('sessions');

users.set('1', 'Alice');
sessions.set('abc', 'token-xyz');

users.keys();    // ['1']
sessions.keys(); // ['abc']

sessions.clear(); // Only clears session entries
```

## Eviction Strategies

### LRU (Least Recently Used)
Evicts the entry that has not been accessed for the longest time. Uses a doubly-linked list for O(1) operations.

### FIFO (First In, First Out)
Evicts the oldest inserted entry regardless of access patterns. Predictable and simple.

### LFU (Least Frequently Used)
Evicts the entry with the fewest accesses. Ties are broken by insertion order (oldest first).

## Examples

See the `examples/` directory for complete usage examples:

```bash
npx ts-node examples/basic.ts
```

## License

MIT

---

## 🇫🇷 Documentation en français

### Description
Cache Storm est une couche d'abstraction de cache TypeScript avec support du TTL, plusieurs stratégies d'éviction (LRU, FIFO, LFU), isolation par espaces de noms et typage complet. Ce projet expérimental explore la protection contre les "thundering herd" et les patterns d'invalidation de cache.

### Installation
```bash
npm install cache-storm
```

### Utilisation
```typescript
import { CacheStorm } from 'cache-storm';

// Créer un cache LRU avec 100 entrées max et TTL de 60s
const cache = CacheStorm.create<string>({
  maxSize: 100,
  defaultTTL: 60_000,
  strategy: 'lru',
});

cache.set('utilisateur:1', 'Alice');
console.log(cache.get('utilisateur:1')); // 'Alice'
console.log(cache.getStats()); // Statistiques hits/misses
```

Consultez la section **API Reference** ci-dessus pour les méthodes disponibles, les stratégies d'éviction et les exemples d'utilisation des espaces de noms.
