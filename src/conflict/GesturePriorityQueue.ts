// ─── GesturePriorityQueue ───────────────────────────────────────────────────
// Min-heap sorted by priority value (lower = higher priority).
// Used by ConflictResolver to process gestures in priority order.
// ─────────────────────────────────────────────────────────────────────────────

import { GestureEvent } from '../core/types';

/**
 * Min-heap priority queue for GestureEvents.
 * Lower priority number = higher priority = processed first.
 *
 * Operations:
 * - insert: O(log n)
 * - extractMin: O(log n)
 * - peek: O(1)
 */
export class GesturePriorityQueue {
  private heap: GestureEvent[] = [];

  get size(): number {
    return this.heap.length;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  /** Insert a gesture event into the queue. O(log n). */
  insert(event: GestureEvent): void {
    this.heap.push(event);
    this.bubbleUp(this.heap.length - 1);
  }

  /** Extract and return the highest-priority (lowest priority number) event. O(log n). */
  extractMin(): GestureEvent | null {
    if (this.heap.length === 0) return null;
    if (this.heap.length === 1) return this.heap.pop()!;

    const min = this.heap[0];
    this.heap[0] = this.heap.pop()!;
    this.bubbleDown(0);
    return min;
  }

  /** Peek at the highest-priority event without removing it. O(1). */
  peek(): GestureEvent | null {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  /** Remove all events from the queue. */
  clear(): void {
    this.heap = [];
  }

  /** Drain the queue, returning all events in priority order. */
  drainAll(): GestureEvent[] {
    const result: GestureEvent[] = [];
    while (!this.isEmpty()) {
      result.push(this.extractMin()!);
    }
    return result;
  }

  private bubbleUp(index: number): void {
    while (index > 0) {
      const parentIndex = Math.floor((index - 1) / 2);
      if (this.heap[parentIndex].priority <= this.heap[index].priority) break;
      [this.heap[parentIndex], this.heap[index]] = [this.heap[index], this.heap[parentIndex]];
      index = parentIndex;
    }
  }

  private bubbleDown(index: number): void {
    const length = this.heap.length;
    while (true) {
      let smallest = index;
      const left = 2 * index + 1;
      const right = 2 * index + 2;

      if (left < length && this.heap[left].priority < this.heap[smallest].priority) {
        smallest = left;
      }
      if (right < length && this.heap[right].priority < this.heap[smallest].priority) {
        smallest = right;
      }

      if (smallest === index) break;
      [this.heap[smallest], this.heap[index]] = [this.heap[index], this.heap[smallest]];
      index = smallest;
    }
  }
}
