// ─── ActionDispatcher ───────────────────────────────────────────────────────
// Maps gesture names to arrays of IGestureAction instances.
// Dispatches resolved gesture events to all registered actions.
// ─────────────────────────────────────────────────────────────────────────────

import {
  IEventBus,
  EventChannel,
  GestureEvent,
  IGestureAction,
} from '../core/types';

/**
 * ActionDispatcher receives resolved gesture events and dispatches them
 * to registered action handlers.
 *
 * Actions are registered by gesture name. Multiple actions can be registered
 * for a single gesture (they all execute in registration order).
 */
export class ActionDispatcher {
  private actionMap = new Map<string, IGestureAction[]>();
  private eventBus: IEventBus;
  private unsubscribe: (() => void) | null = null;

  constructor(eventBus: IEventBus) {
    this.eventBus = eventBus;
  }

  /**
   * Start listening for resolved gesture events.
   */
  start(): void {
    this.unsubscribe = this.eventBus.on(
      EventChannel.ConflictResolved,
      (event: GestureEvent) => {
        this.dispatch(event);
      },
    );
  }

  /**
   * Stop listening.
   */
  stop(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  /**
   * Register an action for a gesture name.
   */
  registerAction(gestureName: string, action: IGestureAction): void {
    if (!this.actionMap.has(gestureName)) {
      this.actionMap.set(gestureName, []);
    }
    this.actionMap.get(gestureName)!.push(action);
  }

  /**
   * Unregister a specific action from a gesture.
   */
  unregisterAction(gestureName: string, actionId: string): void {
    const actions = this.actionMap.get(gestureName);
    if (actions) {
      const filtered = actions.filter((a) => a.actionId !== actionId);
      if (filtered.length > 0) {
        this.actionMap.set(gestureName, filtered);
      } else {
        this.actionMap.delete(gestureName);
      }
    }
  }

  /**
   * Clear all registered actions.
   */
  clearActions(): void {
    this.actionMap.clear();
  }

  /**
   * Dispatch a gesture event to all matching registered actions.
   */
  private dispatch(event: GestureEvent): void {
    const actions = this.actionMap.get(event.name);
    if (!actions || actions.length === 0) return;

    for (const action of actions) {
      try {
        action.execute(event);
      } catch (error) {
        console.warn(
          `[ActionDispatcher] Error executing action ${action.actionId} for gesture ${event.name}:`,
          error,
        );
      }
    }

    // Emit on ActionDispatched channel for feedback layer
    this.eventBus.emit(EventChannel.ActionDispatched, event);
  }
}
