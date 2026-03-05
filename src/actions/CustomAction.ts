// ─── CustomAction ───────────────────────────────────────────────────────────
// User-defined callback action. The most flexible action type — accepts
// any callback to execute when a gesture is recognized.
// ─────────────────────────────────────────────────────────────────────────────

import { IGestureAction, GestureEvent } from '../core/types';

/**
 * CustomAction wraps a user-defined callback.
 *
 * @example
 * ```typescript
 * const logAction = new CustomAction('log-shake', (event) => {
 *   analytics.track('shake_gesture', { magnitude: event.metadata.magnitude });
 * });
 * ```
 */
export class CustomAction implements IGestureAction {
  readonly actionId: string;
  private callback: (event: GestureEvent) => void;

  constructor(actionId: string, callback: (event: GestureEvent) => void) {
    this.actionId = actionId;
    this.callback = callback;
  }

  execute(event: GestureEvent): void {
    this.callback(event);
  }
}
