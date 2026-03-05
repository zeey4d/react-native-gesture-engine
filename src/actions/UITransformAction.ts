// ─── UITransformAction ──────────────────────────────────────────────────────
// Applies Reanimated shared value transformations (scale, translate, rotate)
// in response to gesture events.
// ─────────────────────────────────────────────────────────────────────────────

import { IGestureAction, GestureEvent } from '../core/types';

/**
 * UITransformAction applies Reanimated transformations when a gesture fires.
 *
 * Accepts a callback where you can update shared values:
 * ```typescript
 * new UITransformAction('scale-on-pinch', (event) => {
 *   scale.value = withSpring(event.metadata.scale ?? 1);
 * });
 * ```
 */
export class UITransformAction implements IGestureAction {
  readonly actionId: string;
  private transform: (event: GestureEvent) => void;

  constructor(actionId: string, transform: (event: GestureEvent) => void) {
    this.actionId = actionId;
    this.transform = transform;
  }

  execute(event: GestureEvent): void {
    this.transform(event);
  }
}
