// ─── PanRecognizer ──────────────────────────────────────────────────────────
// Continuous recognizer that emits Changed state with translation data
// once the finger moves beyond a minimum threshold distance.
// ─────────────────────────────────────────────────────────────────────────────

import { ProcessedSample, InputType, TouchType, TouchData, IEventBus, PanRecognizerConfig } from '../../core/types';
import { BaseRecognizer } from '../base/BaseRecognizer';

export class PanRecognizer extends BaseRecognizer {
  private minDistance: number;

  constructor(eventBus: IEventBus, config: PanRecognizerConfig = {}) {
    super('pan', eventBus, {
      priority: config.priority ?? 50,
      isExclusive: config.isExclusive ?? false,
      enabled: config.enabled,
    });
    this.minDistance = config.minDistance ?? 10;
  }

  onProcessedSample(sample: ProcessedSample): void {
    if (!this.enabled) return;

    const { inputEvent } = sample;
    if (inputEvent.inputType !== InputType.Touch) return;

    const touchData = inputEvent.data as TouchData;
    if (touchData.type !== TouchType.Pan) return;

    const translation = {
      x: touchData.translationX,
      y: touchData.translationY,
    };
    const distance = Math.sqrt(
      translation.x * translation.x + translation.y * translation.y,
    );

    const velocity = {
      x: touchData.velocityX,
      y: touchData.velocityY,
    };

    // Check if we've moved enough to start recognizing
    if (this.state === 'idle' || this.state === 'possible') {
      this.transitionToPossible();
      if (distance >= this.minDistance) {
        this.transitionToBegan({ translation, velocity });
      }
      return;
    }

    // Continue emitting Changed events
    if (this.state === 'began' || this.state === 'changed') {
      // Detect end: velocity near zero and a brief pause
      if (
        Math.abs(touchData.velocityX) < 0.001 &&
        Math.abs(touchData.velocityY) < 0.001
      ) {
        this.transitionToEnded({ translation, velocity });
      } else {
        this.transitionToChanged({ translation, velocity });
      }
    }
  }
}
