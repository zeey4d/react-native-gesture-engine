// ─── TouchInputProvider ─────────────────────────────────────────────────────
// Wraps React Native Gesture Handler gestures and emits normalized TouchData
// on the EventBus InputRaw channel for downstream processing.
//
// Design: This provider doesn't create gesture recognizers directly — instead
// it provides a `createGesture()` method that returns a composed RNGH gesture
// for use inside a GestureDetector. The callbacks emit InputEvents to the bus.
// ─────────────────────────────────────────────────────────────────────────────

import {
  IInputProvider,
  IEventBus,
  EventChannel,
  InputType,
  TouchType,
  TouchData,
  InputEvent,
  generateId,
} from '../core/types';

/**
 * TouchInputProvider wraps RNGH pan/tap/pinch/rotation gestures
 * and normalizes their data into InputEvent objects.
 *
 * Usage:
 * - Call `start()` to enable event emission
 * - Use the gesture handler callbacks (onPan, onTap, etc.) inside
 *   GestureDetector components
 * - Call `stop()` to disable emission
 */
export class TouchInputProvider implements IInputProvider {
  private _isActive = false;

  constructor(private eventBus: IEventBus) {}

  get isActive(): boolean {
    return this._isActive;
  }

  start(): void {
    this._isActive = true;
  }

  stop(): void {
    this._isActive = false;
  }

  /**
   * Called from RNGH Pan gesture callbacks.
   * Emits normalized TouchData with translation and velocity.
   */
  onPan(data: {
    x: number;
    y: number;
    translationX: number;
    translationY: number;
    velocityX: number;
    velocityY: number;
    numberOfPointers: number;
  }): void {
    if (!this._isActive) return;

    const touchData: TouchData = {
      type: TouchType.Pan,
      x: data.x,
      y: data.y,
      translationX: data.translationX,
      translationY: data.translationY,
      velocityX: data.velocityX,
      velocityY: data.velocityY,
      scale: 1,
      rotation: 0,
      numberOfPointers: data.numberOfPointers,
    };

    this.emitInput(touchData);
  }

  /**
   * Called from RNGH Tap gesture callbacks.
   */
  onTap(data: { x: number; y: number; numberOfPointers: number }): void {
    if (!this._isActive) return;

    const touchData: TouchData = {
      type: TouchType.Tap,
      x: data.x,
      y: data.y,
      translationX: 0,
      translationY: 0,
      velocityX: 0,
      velocityY: 0,
      scale: 1,
      rotation: 0,
      numberOfPointers: data.numberOfPointers,
    };

    this.emitInput(touchData);
  }

  /**
   * Called from RNGH Pinch gesture callbacks.
   */
  onPinch(data: {
    scale: number;
    focalX: number;
    focalY: number;
    velocity: number;
    numberOfPointers: number;
  }): void {
    if (!this._isActive) return;

    const touchData: TouchData = {
      type: TouchType.Pinch,
      x: data.focalX,
      y: data.focalY,
      translationX: 0,
      translationY: 0,
      velocityX: 0,
      velocityY: data.velocity,
      scale: data.scale,
      rotation: 0,
      numberOfPointers: data.numberOfPointers,
    };

    this.emitInput(touchData);
  }

  /**
   * Called from RNGH Rotation gesture callbacks.
   */
  onRotation(data: {
    rotation: number;
    anchorX: number;
    anchorY: number;
    velocity: number;
    numberOfPointers: number;
  }): void {
    if (!this._isActive) return;

    const touchData: TouchData = {
      type: TouchType.Rotation,
      x: data.anchorX,
      y: data.anchorY,
      translationX: 0,
      translationY: 0,
      velocityX: 0,
      velocityY: data.velocity,
      scale: 1,
      rotation: data.rotation,
      numberOfPointers: data.numberOfPointers,
    };

    this.emitInput(touchData);
  }

  /** Emit a normalized InputEvent onto the EventBus */
  private emitInput(touchData: TouchData): void {
    const event: InputEvent = {
      id: generateId(),
      timestamp: Date.now(),
      inputType: InputType.Touch,
      data: touchData,
    };

    this.eventBus.emit(EventChannel.InputRaw, event);
  }
}
