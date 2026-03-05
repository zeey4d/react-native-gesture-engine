// ─── DoubleTapRecognizer ────────────────────────────────────────────────────
// Detects double-tap gestures. Two taps must occur within maxInterval ms
// and within maxDistance px of each other.
// ─────────────────────────────────────────────────────────────────────────────

import { ProcessedSample, InputType, TouchType, TouchData, IEventBus, DoubleTapRecognizerConfig } from '../../core/types';
import { BaseRecognizer } from '../base/BaseRecognizer';

export class DoubleTapRecognizer extends BaseRecognizer {
  private maxInterval: number;
  private maxDistance: number;
  private firstTapTime: number | null = null;
  private firstTapX: number | null = null;
  private firstTapY: number | null = null;
  private tapCount = 0;

  constructor(eventBus: IEventBus, config: DoubleTapRecognizerConfig = {}) {
    super('double-tap', eventBus, {
      priority: config.priority ?? 5,
      isExclusive: config.isExclusive ?? false,
      enabled: config.enabled,
    });
    this.maxInterval = config.maxInterval ?? 300;
    this.maxDistance = config.maxDistance ?? 30;
  }

  onProcessedSample(sample: ProcessedSample): void {
    if (!this.enabled) return;

    const { inputEvent } = sample;
    if (inputEvent.inputType !== InputType.Touch) return;

    const touchData = inputEvent.data as TouchData;
    if (touchData.type !== TouchType.Tap) return;

    const now = inputEvent.timestamp;

    if (this.tapCount === 0) {
      // First tap
      this.firstTapTime = now;
      this.firstTapX = touchData.x;
      this.firstTapY = touchData.y;
      this.tapCount = 1;
      this.transitionToPossible();
      return;
    }

    if (this.tapCount === 1) {
      const elapsed = now - (this.firstTapTime ?? 0);
      const dx = touchData.x - (this.firstTapX ?? 0);
      const dy = touchData.y - (this.firstTapY ?? 0);
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (elapsed <= this.maxInterval && distance <= this.maxDistance) {
        // Second tap within bounds — double tap recognized
        this.transitionToBegan({
          translation: { x: touchData.x, y: touchData.y },
        });
        this.transitionToEnded({
          translation: { x: touchData.x, y: touchData.y },
        });
        this.resetState();
      } else {
        // Timed out or too far — treat this as a new first tap
        this.transitionToFailed();
        this.firstTapTime = now;
        this.firstTapX = touchData.x;
        this.firstTapY = touchData.y;
        this.tapCount = 1;
        this.transitionToPossible();
      }
    }
  }

  override reset(): void {
    super.reset();
    this.resetState();
  }

  private resetState(): void {
    this.firstTapTime = null;
    this.firstTapX = null;
    this.firstTapY = null;
    this.tapCount = 0;
  }
}
