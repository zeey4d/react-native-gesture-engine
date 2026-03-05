// ─── TapRecognizer ──────────────────────────────────────────────────────────
// Detects single-tap gestures. A tap must:
// 1. Start and end within maxDuration ms
// 2. Not move more than maxDistance px from the start point
// ─────────────────────────────────────────────────────────────────────────────

import { ProcessedSample, InputType, TouchType, TouchData, IEventBus, TapRecognizerConfig } from '../../core/types';
import { BaseRecognizer } from '../base/BaseRecognizer';

export class TapRecognizer extends BaseRecognizer {
  private maxDuration: number;
  private maxDistance: number;
  private startTime: number | null = null;
  private startX: number | null = null;
  private startY: number | null = null;

  constructor(eventBus: IEventBus, config: TapRecognizerConfig = {}) {
    super('tap', eventBus, {
      priority: config.priority ?? 10,
      isExclusive: config.isExclusive ?? false,
      enabled: config.enabled,
    });
    this.maxDuration = config.maxDuration ?? 300;
    this.maxDistance = config.maxDistance ?? 10;
  }

  onProcessedSample(sample: ProcessedSample): void {
    if (!this.enabled) return;

    const { inputEvent } = sample;
    if (inputEvent.inputType !== InputType.Touch) return;

    const touchData = inputEvent.data as TouchData;
    if (touchData.type !== TouchType.Tap && touchData.type !== TouchType.Pan) return;

    // Handle tap type directly — RNGH fires onEnd for taps
    if (touchData.type === TouchType.Tap) {
      this.transitionToPossible();
      this.transitionToBegan({
        translation: { x: touchData.x, y: touchData.y },
      });
      this.transitionToEnded({
        translation: { x: touchData.x, y: touchData.y },
      });
      return;
    }

    // For pan-based tap detection: track motion to verify it's a tap
    if (this.startTime === null) {
      this.startTime = inputEvent.timestamp;
      this.startX = touchData.x;
      this.startY = touchData.y;
      this.transitionToPossible();
      return;
    }

    const elapsed = inputEvent.timestamp - this.startTime;
    const dx = touchData.x - (this.startX ?? 0);
    const dy = touchData.y - (this.startY ?? 0);
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Too much movement — not a tap
    if (distance > this.maxDistance) {
      this.transitionToFailed();
      this.resetState();
      return;
    }

    // Duration exceeded — not a tap
    if (elapsed > this.maxDuration) {
      this.transitionToFailed();
      this.resetState();
      return;
    }

    // Velocity drops to near zero (finger lifted) — recognize as tap
    if (
      Math.abs(touchData.velocityX) < 0.01 &&
      Math.abs(touchData.velocityY) < 0.01 &&
      elapsed > 20
    ) {
      this.transitionToBegan({
        translation: { x: this.startX ?? 0, y: this.startY ?? 0 },
      });
      this.transitionToEnded({
        translation: { x: touchData.x, y: touchData.y },
      });
      this.resetState();
    }
  }

  override reset(): void {
    super.reset();
    this.resetState();
  }

  private resetState(): void {
    this.startTime = null;
    this.startX = null;
    this.startY = null;
  }
}
