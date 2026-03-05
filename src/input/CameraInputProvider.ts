// ─── CameraInputProvider ────────────────────────────────────────────────────
// Future-ready no-op stub implementing IInputProvider.
// Placeholder for computer-vision-based gesture input (e.g., hand tracking).
// ─────────────────────────────────────────────────────────────────────────────

import { IInputProvider, IEventBus } from '../core/types';

/**
 * CameraInputProvider is a future-ready stub for camera-based gesture input.
 *
 * When implemented, this would:
 * - Subscribe to a camera frame processing pipeline
 * - Run hand/pose detection models
 * - Emit InputEvents with detected gesture landmarks
 *
 * Currently a no-op — calling start()/stop() has no effect.
 */
export class CameraInputProvider implements IInputProvider {
  private _isActive = false;

  // EventBus stored for future use when camera input is implemented
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(private eventBus: IEventBus) {}

  get isActive(): boolean {
    return this._isActive;
  }

  start(): void {
    this._isActive = true;
    // Future: subscribe to camera frame pipeline
  }

  stop(): void {
    this._isActive = false;
    // Future: unsubscribe from camera frames
  }
}
