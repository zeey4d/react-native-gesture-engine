// ─── StreamBuffer ───────────────────────────────────────────────────────────
// Time-windowed ring buffer retaining ProcessedSample objects from the last
// 300–500ms. Provides O(1) insertion and automatic eviction of stale entries.
// ─────────────────────────────────────────────────────────────────────────────

import { ProcessedSample } from '../core/types';

/**
 * Fixed-size ring buffer with time-based eviction.
 *
 * Design decisions:
 * - Uses a pre-allocated array with head/tail pointers for O(1) push.
 * - Evicts entries older than windowMs on each push (amortized O(1)).
 * - Capacity is generously sized (default 64) to handle burst input at 60Hz.
 * - getAll() returns samples in chronological order.
 */
export class StreamBuffer {
  private buffer: (ProcessedSample | null)[];
  private head = 0;
  private count = 0;
  private capacity: number;
  private windowMs: number;

  /**
   * @param windowMs - Time window in ms. Samples older than this are evicted. Default 400.
   * @param capacity - Maximum buffer size. Default 64 (~1 sec at 60Hz).
   */
  constructor(windowMs = 400, capacity = 64) {
    this.windowMs = windowMs;
    this.capacity = capacity;
    this.buffer = new Array(capacity).fill(null);
  }

  /**
   * Push a new sample. Automatically evicts stale samples.
   * O(1) amortized.
   */
  push(sample: ProcessedSample): void {
    // Write to current head position
    const writeIndex = (this.head + this.count) % this.capacity;

    if (this.count === this.capacity) {
      // Buffer full — overwrite oldest (advance head)
      this.buffer[this.head] = sample;
      this.head = (this.head + 1) % this.capacity;
    } else {
      this.buffer[writeIndex] = sample;
      this.count++;
    }

    // Evict stale samples from the head
    this.evictStale(sample.timestamp);
  }

  /**
   * Get all non-stale samples in chronological order.
   */
  getAll(): ProcessedSample[] {
    const result: ProcessedSample[] = [];
    for (let i = 0; i < this.count; i++) {
      const index = (this.head + i) % this.capacity;
      const sample = this.buffer[index];
      if (sample) {
        result.push(sample);
      }
    }
    return result;
  }

  /**
   * Get the most recent sample, or null if buffer is empty.
   */
  latest(): ProcessedSample | null {
    if (this.count === 0) return null;
    const index = (this.head + this.count - 1) % this.capacity;
    return this.buffer[index];
  }

  /**
   * Get the number of samples currently in the buffer.
   */
  size(): number {
    return this.count;
  }

  /**
   * Clear the buffer.
   */
  clear(): void {
    this.buffer.fill(null);
    this.head = 0;
    this.count = 0;
  }

  /**
   * Remove samples older than windowMs from the head.
   */
  private evictStale(currentTimestamp: number): void {
    const cutoff = currentTimestamp - this.windowMs;

    while (this.count > 0) {
      const sample = this.buffer[this.head];
      if (sample && sample.timestamp < cutoff) {
        this.buffer[this.head] = null;
        this.head = (this.head + 1) % this.capacity;
        this.count--;
      } else {
        break;
      }
    }
  }
}
