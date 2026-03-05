// ─── SequenceRecognizer ─────────────────────────────────────────────────────
// Composes N recognizers in order with inter-step timeouts.
//
// Algorithm:
// 1. Listen for GestureEvent objects on the RecognitionGesture channel
// 2. When the next expected gesture name is detected (in Ended state),
//    advance the sequence index
// 3. If the inter-step timeout (default 800ms) is exceeded, reset
// 4. When all steps are matched, emit a 'sequence:{joined-names}' event
//
// Example: sequence: ['tap', 'tap', 'edge-swipe-right']
//   → emits 'sequence:tap>tap>edge-swipe-right' on completion
// ─────────────────────────────────────────────────────────────────────────────

import {
  IEventBus,
  EventChannel,
  GestureEvent,
  RecognizerState,
  ProcessedSample,
  SequenceRecognizerConfig,
  generateId,
} from '../../core/types';
import { BaseRecognizer } from '../base/BaseRecognizer';

export class SequenceRecognizer extends BaseRecognizer {
  private sequence: string[];
  private timeoutMs: number;
  private currentIndex = 0;
  private lastStepTime = 0;
  private unsubscribe: (() => void) | null = null;

  constructor(eventBus: IEventBus, config: SequenceRecognizerConfig) {
    const sequenceName = `sequence:${config.sequence.join('>')}`;
    super(sequenceName, eventBus, {
      priority: config.priority ?? 1,
      isExclusive: config.isExclusive ?? false,
      enabled: config.enabled,
    });
    this.sequence = config.sequence;
    this.timeoutMs = config.timeoutMs ?? 800;

    // Subscribe to gesture events to track the sequence
    this.subscribeToGestures();
  }

  /**
   * SequenceRecognizer doesn't use ProcessedSample — it listens
   * to GestureEvent objects on the EventBus instead.
   */
  onProcessedSample(_sample: ProcessedSample): void {
    // No-op — sequence recognition is event-driven, not sample-driven
  }

  override reset(): void {
    super.reset();
    this.currentIndex = 0;
    this.lastStepTime = 0;
  }

  override dispose(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    super.dispose();
  }

  /**
   * Subscribe to the RecognitionGesture channel to listen for
   * completed gestures and advance the sequence.
   */
  private subscribeToGestures(): void {
    this.unsubscribe = this.eventBus.on(
      EventChannel.RecognitionGesture,
      (event: GestureEvent) => {
        if (!this.enabled) return;

        // Only process ended gestures (completed gesture activations)
        if (event.state !== RecognizerState.Ended) return;

        // Don't match our own events to prevent infinite loops
        if (event.name.startsWith('sequence:')) return;

        const now = Date.now();

        // Check for timeout (reset if too much time between steps)
        if (this.currentIndex > 0 && now - this.lastStepTime > this.timeoutMs) {
          this.reset();
        }

        // Check if this event matches the expected next step
        const expectedName = this.sequence[this.currentIndex];
        if (event.name === expectedName) {
          this.currentIndex++;
          this.lastStepTime = now;

          // Check if sequence is complete
          if (this.currentIndex >= this.sequence.length) {
            // Sequence completed!
            this.transitionToPossible();
            this.transitionToBegan({});
            this.transitionToEnded({});
            this.currentIndex = 0;
            this.lastStepTime = 0;
          }
        }
      },
    );
  }
}
