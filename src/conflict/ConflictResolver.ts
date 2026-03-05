// ─── ConflictResolver ───────────────────────────────────────────────────────
// Receives all GestureEvent objects from the RecognitionGesture channel,
// applies priority ordering and exclusive/simultaneous rules, and emits
// resolved events on the ConflictResolved channel.
// ─────────────────────────────────────────────────────────────────────────────

import {
  IEventBus,
  EventChannel,
  GestureEvent,
  RecognizerState,
} from '../core/types';
import { GesturePriorityQueue } from './GesturePriorityQueue';
import { LockManager } from './LockManager';

/**
 * ConflictResolver processes gesture events through priority ordering
 * and exclusive locking to determine which gestures should be dispatched.
 *
 * Rules:
 * 1. Events are queued and processed in priority order (lower = first)
 * 2. If an exclusive gesture fires (Began state), it acquires a lock
 * 3. Locked gestures of equal or lower priority are blocked
 * 4. When an exclusive gesture ends, its lock is released
 * 5. Non-exclusive gestures pass through if not blocked
 */
export class ConflictResolver {
  private priorityQueue: GesturePriorityQueue;
  private lockManager: LockManager;
  private eventBus: IEventBus;
  private unsubscribe: (() => void) | null = null;

  // Buffer for batching events within a single tick
  private pendingEvents: GestureEvent[] = [];
  private processingScheduled = false;

  constructor(eventBus: IEventBus) {
    this.eventBus = eventBus;
    this.priorityQueue = new GesturePriorityQueue();
    this.lockManager = new LockManager();
  }

  /**
   * Start listening for gesture events and resolving conflicts.
   */
  start(): void {
    this.unsubscribe = this.eventBus.on(
      EventChannel.RecognitionGesture,
      (event: GestureEvent) => {
        this.pendingEvents.push(event);
        this.scheduleProcessing();
      },
    );
  }

  /**
   * Stop listening and clear all state.
   */
  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.priorityQueue.clear();
    this.lockManager.clearAll();
    this.pendingEvents = [];
  }

  /**
   * Schedule conflict resolution for the next microtask.
   * This batches events that arrive in the same tick.
   */
  private scheduleProcessing(): void {
    if (this.processingScheduled) return;
    this.processingScheduled = true;

    // Use queueMicrotask for batching events within a single frame
    Promise.resolve().then(() => {
      this.processingScheduled = false;
      this.processEvents();
    });
  }

  /**
   * Process all pending events through priority queue and lock rules.
   */
  private processEvents(): void {
    // Step 1: Insert all pending events into the priority queue
    for (const event of this.pendingEvents) {
      this.priorityQueue.insert(event);
    }
    this.pendingEvents = [];

    // Step 2: Drain the queue in priority order and apply conflict rules
    const sortedEvents = this.priorityQueue.drainAll();

    for (const event of sortedEvents) {
      // Handle lock lifecycle for exclusive gestures
      if (event.isExclusive) {
        if (event.state === RecognizerState.Began) {
          this.lockManager.acquireLock(event.name, event.priority);
        } else if (
          event.state === RecognizerState.Ended ||
          event.state === RecognizerState.Cancelled ||
          event.state === RecognizerState.Failed
        ) {
          this.lockManager.releaseLock(event.name);
        }
      }

      // Check if this gesture is blocked by a higher-priority exclusive lock
      if (this.lockManager.isLocked(event.name, event.priority)) {
        // Blocked — skip this event
        continue;
      }

      // Event passes conflict resolution → emit on ConflictResolved channel
      this.eventBus.emit(EventChannel.ConflictResolved, event);
    }
  }

  /** Expose lock manager for testing */
  getLockManager(): LockManager {
    return this.lockManager;
  }
}
