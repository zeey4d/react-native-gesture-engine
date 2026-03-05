// ─── BaseRecognizer ─────────────────────────────────────────────────────────
// Abstract base class for all gesture recognizers with built-in state machine.
// Implements IRecognizer and provides transition logic, EventBus integration,
// and common lifecycle methods (reset, dispose).
//
// State transitions:
//   Idle → Possible → Began → Changed → Ended
//                            ↘ Failed / Cancelled
// ─────────────────────────────────────────────────────────────────────────────

import {
  IRecognizer,
  IEventBus,
  RecognizerState,
  ProcessedSample,
  GestureEvent,
  GestureMetadata,
  EventChannel,
  generateId,
} from '../../core/types';

/**
 * Abstract base class for all gesture recognizers.
 *
 * Subclasses must implement:
 * - `onProcessedSample(sample)`: evaluate the sample and call transition methods
 *
 * The base class provides:
 * - State machine with validated transitions
 * - Automatic GestureEvent emission on state changes
 * - EventBus integration
 * - reset() and dispose() lifecycle methods
 */
export abstract class BaseRecognizer implements IRecognizer {
  readonly id: string;
  readonly name: string;
  readonly priority: number;
  readonly isExclusive: boolean;
  enabled: boolean;

  private _state: RecognizerState = RecognizerState.Idle;
  protected eventBus: IEventBus;

  constructor(
    name: string,
    eventBus: IEventBus,
    options: {
      priority?: number;
      isExclusive?: boolean;
      enabled?: boolean;
    } = {},
  ) {
    this.id = generateId();
    this.name = name;
    this.eventBus = eventBus;
    this.priority = options.priority ?? 100;
    this.isExclusive = options.isExclusive ?? false;
    this.enabled = options.enabled ?? true;
  }

  get state(): RecognizerState {
    return this._state;
  }

  /**
   * Must be implemented by subclasses.
   * Evaluate the incoming processed sample and trigger state transitions.
   */
  abstract onProcessedSample(sample: ProcessedSample): void;

  /**
   * Reset the recognizer to Idle state.
   */
  reset(): void {
    this._state = RecognizerState.Idle;
  }

  /**
   * Clean up resources. Override in subclasses for custom cleanup.
   */
  dispose(): void {
    this.reset();
  }

  // ─── Protected: state transition helpers ────────────────────────────

  /**
   * Transition to Possible state (gesture might be starting).
   */
  protected transitionToPossible(): void {
    if (this._state === RecognizerState.Idle) {
      this._state = RecognizerState.Possible;
    }
  }

  /**
   * Transition to Began state and emit gesture event.
   * Only valid from Possible state.
   */
  protected transitionToBegan(metadata: GestureMetadata = {}): void {
    if (this._state === RecognizerState.Possible) {
      this._state = RecognizerState.Began;
      this.emitGestureEvent(metadata);
    }
  }

  /**
   * Transition to Changed state and emit gesture event.
   * Only valid from Began or Changed state (continuous gestures).
   */
  protected transitionToChanged(metadata: GestureMetadata = {}): void {
    if (
      this._state === RecognizerState.Began ||
      this._state === RecognizerState.Changed
    ) {
      this._state = RecognizerState.Changed;
      this.emitGestureEvent(metadata);
    }
  }

  /**
   * Transition to Ended state and emit gesture event.
   * Valid from Began, Changed, or Possible states.
   */
  protected transitionToEnded(metadata: GestureMetadata = {}): void {
    if (
      this._state === RecognizerState.Began ||
      this._state === RecognizerState.Changed ||
      this._state === RecognizerState.Possible
    ) {
      this._state = RecognizerState.Ended;
      this.emitGestureEvent(metadata);
      // Auto-reset to Idle after Ended
      this._state = RecognizerState.Idle;
    }
  }

  /**
   * Transition to Failed state (gesture didn't match criteria).
   * Auto-resets to Idle.
   */
  protected transitionToFailed(): void {
    if (
      this._state === RecognizerState.Possible ||
      this._state === RecognizerState.Began
    ) {
      this._state = RecognizerState.Failed;
      // Auto-reset to Idle
      this._state = RecognizerState.Idle;
    }
  }

  /**
   * Transition to Cancelled state (gesture was interrupted).
   * Auto-resets to Idle.
   */
  protected transitionToCancelled(): void {
    if (
      this._state === RecognizerState.Began ||
      this._state === RecognizerState.Changed
    ) {
      this._state = RecognizerState.Cancelled;
      this.emitGestureEvent({});
      this._state = RecognizerState.Idle;
    }
  }

  /**
   * Emit a GestureEvent on the RecognitionGesture channel.
   */
  private emitGestureEvent(metadata: GestureMetadata): void {
    const event: GestureEvent = {
      id: generateId(),
      name: this.name,
      state: this._state,
      priority: this.priority,
      isExclusive: this.isExclusive,
      timestamp: Date.now(),
      metadata,
    };

    this.eventBus.emit(EventChannel.RecognitionGesture, event);
  }
}
