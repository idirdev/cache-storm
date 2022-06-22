import { EvictionStrategy } from '../types';

/**
 * FIFO (First In, First Out) eviction strategy.
 *
 * The oldest inserted entry is evicted first, regardless of access patterns.
 * Uses a queue (array) to track insertion order. Accessing an entry does NOT
 * change its position in the queue -- only insertion time matters.
 */
export class FIFOStrategy implements EvictionStrategy {
  /** Ordered queue of keys, oldest at index 0. */
  private queue: string[] = [];
  /** Set for O(1) existence checks. */
  private keySet: Set<string> = new Set();

  /**
   * Called when an entry is accessed.
   * FIFO ignores access patterns -- this is a no-op.
   */
  onAccess(_key: string): void {
    // FIFO does not care about access order.
    // The entry stays in its original position.
  }

  /**
   * Called when a new entry is inserted into the cache.
   * Adds the key to the end of the queue.
   * If the key already exists, it is NOT moved (FIFO preserves original insertion order).
   */
  onInsert(key: string): void {
    if (this.keySet.has(key)) {
      // Key already tracked; FIFO keeps original insertion position.
      return;
    }
    this.queue.push(key);
    this.keySet.add(key);
  }

  /**
   * Called when an entry is manually removed from the cache.
   * Removes the key from both the queue and the set.
   */
  onRemove(key: string): void {
    if (!this.keySet.has(key)) {
      return;
    }
    this.keySet.delete(key);
    const index = this.queue.indexOf(key);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
  }

  /**
   * Evict the oldest entry (front of the queue).
   * Skips over keys that have already been removed (stale entries).
   * Returns the key of the evicted entry, or undefined if the queue is empty.
   */
  evict(): string | undefined {
    while (this.queue.length > 0) {
      const key = this.queue.shift()!;
      if (this.keySet.has(key)) {
        this.keySet.delete(key);
        return key;
      }
      // Key was already removed, skip it and try the next one
    }
    return undefined;
  }

  /**
   * Clear all tracking state.
   */
  clear(): void {
    this.queue = [];
    this.keySet.clear();
  }

  /**
   * Returns the number of keys currently tracked.
   */
  size(): number {
    return this.keySet.size;
  }

  /**
   * Returns the queue contents from oldest to newest.
   * Useful for debugging and testing.
   */
  toArray(): string[] {
    return this.queue.filter((key) => this.keySet.has(key));
  }

  /**
   * Peek at the next key that would be evicted without actually removing it.
   */
  peek(): string | undefined {
    for (const key of this.queue) {
      if (this.keySet.has(key)) {
        return key;
      }
    }
    return undefined;
  }
}
