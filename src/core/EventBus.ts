// ─── EventBus ───────────────────────────────────────────────────────────────
// Typed pub/sub system connecting all pipeline layers.
// Provides compile-time safety: each channel maps to a specific payload type.
// ─────────────────────────────────────────────────────────────────────────────

import {
  EventChannel,
  EventChannelMap,
  EventHandler,
  IEventBus,
} from './types';

/**
 * Typed EventBus implementation.
 *
 * Design decisions:
 * - Lives outside the React tree to avoid unnecessary re-renders.
 * - Uses Map<channel, Set<handler>> for O(1) subscribe/unsubscribe.
 * - Generic channel parameter ensures type-safe emit/subscribe at compile time.
 * - `on()` returns an unsubscribe function for easy cleanup in useEffect.
 */
export class EventBus implements IEventBus {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private listeners = new Map<EventChannel, Set<EventHandler<any>>>();

  /**
   * Subscribe to a channel. Returns an unsubscribe function.
   *
   * @example
   * const unsub = bus.on(EventChannel.InputRaw, (event) => { ... });
   * // later:
   * unsub();
   */
  on<C extends EventChannel>(channel: C, handler: EventHandler<C>): () => void {
    if (!this.listeners.has(channel)) {
      this.listeners.set(channel, new Set());
    }
    this.listeners.get(channel)!.add(handler);

    // Return unsubscribe function for convenience (useEffect cleanup)
    return () => this.off(channel, handler);
  }

  /**
   * Emit data on a channel. All registered handlers are called synchronously.
   * The generic parameter ensures the data type matches the channel.
   */
  emit<C extends EventChannel>(channel: C, data: EventChannelMap[C]): void {
    const handlers = this.listeners.get(channel);
    if (!handlers) return;

    // Iterate over a copy to allow handlers to unsubscribe during emit
    for (const handler of Array.from(handlers)) {
      try {
        handler(data);
      } catch (error) {
        // Swallow handler errors to prevent one bad handler from
        // breaking the entire pipeline. In production, these should
        // be reported to an error tracking service.
        if (typeof __DEV__ !== 'undefined' && __DEV__) {
          console.error(`[EventBus] Error in handler for ${channel}:`, error);
        }
      }
    }
  }

  /**
   * Remove a specific handler from a channel.
   */
  off<C extends EventChannel>(channel: C, handler: EventHandler<C>): void {
    const handlers = this.listeners.get(channel);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.listeners.delete(channel);
      }
    }
  }

  /**
   * Remove all handlers from all channels. Called during engine teardown.
   */
  clear(): void {
    this.listeners.clear();
  }
}

// Check if __DEV__ is defined (React Native global)
declare const __DEV__: boolean | undefined;
