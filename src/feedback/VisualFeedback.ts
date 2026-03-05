// ─── VisualFeedback ─────────────────────────────────────────────────────────
// Triggers visual feedback via callbacks when gestures are recognized.
// Designed to work with Reanimated shared value animations.
// ─────────────────────────────────────────────────────────────────────────────

import { IFeedbackProvider, GestureEvent } from '../core/types';

/**
 * VisualFeedback invokes registered callbacks to trigger visual animations
 * when gestures are recognized.
 *
 * Typical usage: update Reanimated shared values in the callback.
 *
 * @example
 * ```typescript
 * const visual = new VisualFeedback((event) => {
 *   opacity.value = withTiming(0.5, { duration: 100 });
 *   scale.value = withSpring(0.95);
 * });
 * ```
 */
export class VisualFeedback implements IFeedbackProvider {
  private _isSupported = true;
  private callback: ((event: GestureEvent) => void) | null;

  constructor(callback?: (event: GestureEvent) => void) {
    this.callback = callback ?? null;
  }

  get isSupported(): boolean {
    return this._isSupported;
  }

  trigger(event: GestureEvent): void {
    if (!this._isSupported || !this.callback) return;
    this.callback(event);
  }

  /**
   * Update the visual feedback callback at runtime.
   */
  setCallback(callback: (event: GestureEvent) => void): void {
    this.callback = callback;
  }
}
