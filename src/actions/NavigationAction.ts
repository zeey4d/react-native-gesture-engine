// ─── NavigationAction ───────────────────────────────────────────────────────
// Triggers navigation actions (go back, push screen, etc.)
// ─────────────────────────────────────────────────────────────────────────────

import { IGestureAction, GestureEvent } from '../core/types';

/**
 * NavigationAction triggers navigation when a gesture is recognized.
 * Accepts a callback that receives the gesture event and can perform
 * any navigation logic (e.g., navigation.goBack()).
 */
export class NavigationAction implements IGestureAction {
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
