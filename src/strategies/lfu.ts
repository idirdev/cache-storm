import { EvictionStrategy } from '../types';

/**
 * LFU (Least Frequently Used) eviction strategy with frequency counter.
 *
 * Tracks access frequency for each key. On eviction, the key with the
 * lowest frequency is removed. Ties are broken by insertion order (oldest first).
 *
 * Uses a frequency map and a min-frequency tracker for efficient O(1) eviction.
 */
export class LFUStrategy implements EvictionStrategy {
  /** Maps key -> current access frequency. */
  private keyFrequency: Map<string, number> = new Map();

  /** Maps frequency -> ordered set of keys with that frequency (insertion order). */
  private frequencyBuckets: Map<number, Set<string>> = new Map();

  /** The current minimum frequency across all tracked keys. */
  private minFrequency: number = 0;

  /**
   * Get or create a frequency bucket for the given frequency.
   */
  private getBucket(freq: number): Set<string> {
    let bucket = this.frequencyBuckets.get(freq);
    if (!bucket) {
      bucket = new Set();
      this.frequencyBuckets.set(freq, bucket);
    }
    return bucket;
  }

  /**
   * Increment the frequency of a key, moving it from its current bucket
   * to the next higher frequency bucket.
   */
  private incrementFrequency(key: string): void {
    const currentFreq = this.keyFrequency.get(key);
    if (currentFreq === undefined) {
      return;
    }

    const newFreq = currentFreq + 1;
    this.keyFrequency.set(key, newFreq);

    // Remove from current frequency bucket
    const currentBucket = this.frequencyBuckets.get(currentFreq);
    if (currentBucket) {
      currentBucket.delete(key);
      // If the current bucket is now empty and it was the min frequency,
      // increment minFrequency
      if (currentBucket.size === 0) {
        this.frequencyBuckets.delete(currentFreq);
        if (this.minFrequency === currentFreq) {
          this.minFrequency = newFreq;
        }
      }
    }

    // Add to new frequency bucket
    const newBucket = this.getBucket(newFreq);
    newBucket.add(key);
  }

  /**
   * Called when an entry is accessed (cache hit).
   * Increments the frequency counter for this key.
   */
  onAccess(key: string): void {
    if (!this.keyFrequency.has(key)) {
      return;
    }
    this.incrementFrequency(key);
  }

  /**
   * Called when a new entry is inserted into the cache.
   * Initializes frequency to 1. If the key already exists, increments instead.
   */
  onInsert(key: string): void {
    if (this.keyFrequency.has(key)) {
      // Key already exists, treat as an access
      this.incrementFrequency(key);
      return;
    }

    // New key starts with frequency 1
    this.keyFrequency.set(key, 1);
    const bucket = this.getBucket(1);
    bucket.add(key);
    this.minFrequency = 1;
  }

  /**
   * Called when an entry is manually removed from the cache.
   * Removes it from frequency tracking entirely.
   */
  onRemove(key: string): void {
    const freq = this.keyFrequency.get(key);
    if (freq === undefined) {
      return;
    }

    this.keyFrequency.delete(key);
    const bucket = this.frequencyBuckets.get(freq);
    if (bucket) {
      bucket.delete(key);
      if (bucket.size === 0) {
        this.frequencyBuckets.delete(freq);
      }
    }

    // Recalculate minFrequency if needed
    if (this.keyFrequency.size === 0) {
      this.minFrequency = 0;
    } else if (freq === this.minFrequency && (!bucket || bucket.size === 0)) {
      // Find the new minimum frequency
      for (let f = this.minFrequency; f <= this.getMaxFrequency(); f++) {
        const b = this.frequencyBuckets.get(f);
        if (b && b.size > 0) {
          this.minFrequency = f;
          break;
        }
      }
    }
  }

  /**
   * Get the maximum tracked frequency (for iteration bounds).
   */
  private getMaxFrequency(): number {
    let max = 0;
    for (const freq of this.frequencyBuckets.keys()) {
      if (freq > max) max = freq;
    }
    return max;
  }

  /**
   * Evict the least frequently used key.
   * Among keys with the same minimum frequency, the oldest (first inserted) is chosen.
   * Returns the evicted key, or undefined if nothing is tracked.
   */
  evict(): string | undefined {
    const bucket = this.frequencyBuckets.get(this.minFrequency);
    if (!bucket || bucket.size === 0) {
      return undefined;
    }

    // Get the first key in the set (oldest with minimum frequency)
    const evictedKey = bucket.values().next().value as string;
    bucket.delete(evictedKey);
    this.keyFrequency.delete(evictedKey);

    if (bucket.size === 0) {
      this.frequencyBuckets.delete(this.minFrequency);
    }

    return evictedKey;
  }

  /**
   * Clear all tracking state.
   */
  clear(): void {
    this.keyFrequency.clear();
    this.frequencyBuckets.clear();
    this.minFrequency = 0;
  }

  /**
   * Returns the number of keys currently tracked.
   */
  size(): number {
    return this.keyFrequency.size;
  }

  /**
   * Get the frequency of a specific key. Returns 0 if not tracked.
   */
  getFrequency(key: string): number {
    return this.keyFrequency.get(key) ?? 0;
  }
}
