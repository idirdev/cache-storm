import { EvictionStrategy } from '../types';

/**
 * Node in the doubly-linked list used for O(1) LRU tracking.
 */
interface DLLNode {
  key: string;
  prev: DLLNode | null;
  next: DLLNode | null;
}

/**
 * LRU (Least Recently Used) eviction strategy.
 *
 * Uses a doubly-linked list + hash map to achieve O(1) for all operations.
 * The most recently used item is at the tail; the least recently used is at the head.
 * On eviction, the head node is removed and its key is returned.
 */
export class LRUStrategy implements EvictionStrategy {
  private head: DLLNode | null = null;
  private tail: DLLNode | null = null;
  private map: Map<string, DLLNode> = new Map();

  /**
   * Move a node to the tail (most recently used position).
   * If the node is not in the list, this is a no-op.
   */
  private moveToTail(node: DLLNode): void {
    if (node === this.tail) {
      return; // Already at tail, nothing to do
    }

    // Detach node from its current position
    this.detach(node);

    // Append to tail
    this.appendToTail(node);
  }

  /**
   * Detach a node from the doubly-linked list without removing it from the map.
   */
  private detach(node: DLLNode): void {
    if (node.prev) {
      node.prev.next = node.next;
    } else {
      // Node is the head
      this.head = node.next;
    }

    if (node.next) {
      node.next.prev = node.prev;
    } else {
      // Node is the tail
      this.tail = node.prev;
    }

    node.prev = null;
    node.next = null;
  }

  /**
   * Append a detached node to the tail of the list.
   */
  private appendToTail(node: DLLNode): void {
    node.prev = this.tail;
    node.next = null;

    if (this.tail) {
      this.tail.next = node;
    }
    this.tail = node;

    if (!this.head) {
      this.head = node;
    }
  }

  /**
   * Called when an entry is accessed (cache hit).
   * Moves the corresponding node to the tail (most recently used).
   */
  onAccess(key: string): void {
    const node = this.map.get(key);
    if (node) {
      this.moveToTail(node);
    }
  }

  /**
   * Called when a new entry is inserted into the cache.
   * Creates a new node at the tail of the list.
   * If the key already exists, it is moved to the tail instead.
   */
  onInsert(key: string): void {
    const existing = this.map.get(key);
    if (existing) {
      this.moveToTail(existing);
      return;
    }

    const node: DLLNode = { key, prev: null, next: null };
    this.map.set(key, node);
    this.appendToTail(node);
  }

  /**
   * Called when an entry is manually removed from the cache.
   * Detaches the node and removes it from the map.
   */
  onRemove(key: string): void {
    const node = this.map.get(key);
    if (!node) {
      return;
    }

    this.detach(node);
    this.map.delete(key);
  }

  /**
   * Evict the least recently used entry (the head of the list).
   * Returns the key of the evicted entry, or undefined if the list is empty.
   */
  evict(): string | undefined {
    if (!this.head) {
      return undefined;
    }

    const evictedKey = this.head.key;
    this.detach(this.head);
    this.map.delete(evictedKey);
    return evictedKey;
  }

  /**
   * Clear all tracking state.
   */
  clear(): void {
    this.head = null;
    this.tail = null;
    this.map.clear();
  }

  /**
   * Returns the number of keys currently tracked.
   */
  size(): number {
    return this.map.size;
  }

  /**
   * Returns an ordered array of keys from least recently used to most recently used.
   * Useful for debugging and testing.
   */
  toArray(): string[] {
    const result: string[] = [];
    let current = this.head;
    while (current) {
      result.push(current.key);
      current = current.next;
    }
    return result;
  }
}
