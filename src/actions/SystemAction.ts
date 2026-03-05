// ─── SystemAction ───────────────────────────────────────────────────────────
// System-level effects (e.g., toggle fullscreen, change orientation).
// ─────────────────────────────────────────────────────────────────────────────

import { IGestureAction, GestureEvent } from '../core/types';

/**
 * SystemAction performs system-level operations when a gesture fires.
 */
export class SystemAction implements IGestureAction {
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
